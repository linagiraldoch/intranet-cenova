/*
 * Intranet Cenova — conexión del panel con el servidor (Cloudflare Worker).
 *
 * El panel se escribió con la interfaz `window.claude.use(...)`; aquí se implementa
 * esa misma interfaz sobre la API propia de la intranet:
 *   db        → documentos en Cloudflare D1, sincronizados cada pocos segundos
 *   user      → persona con sesión
 *   mcp       → correo de "Solicitar apoyo" (/api/correo)
 *   sample    → lectura de documentos con IA (/api/leer)
 *   downloads → descarga de archivos
 */
(function(){
  'use strict';
  var html = document.documentElement;
  var PESTANA = null;
  try{ PESTANA = sessionStorage.getItem('cenova.pestana'); }catch(e){}
  // Ventana o pestaña nueva: no trae su clave de pestaña, así que debe ingresar de nuevo.
  if(!PESTANA){ location.replace('/login?motivo=pestana'); return; }

  var ultimaInteraccion = Date.now();
  var yo = null, readyResolve, ready = new Promise(function(r){ readyResolve = r; });

  function salir(motivo){
    try{ sessionStorage.removeItem('cenova.pestana'); }catch(e){}
    fetch('/api/logout', {method:'POST', headers:{'x-cenova':'1'}, credentials:'same-origin'}).catch(function(){}).finally(function(){
      location.replace('/login?motivo=' + motivo);
    });
  }
  function api(metodo, ruta, datos){
    var h = {'x-cenova':'1', 'x-pestana': PESTANA};
    if(Date.now() - ultimaInteraccion < 60000) h['x-actividad'] = '1';
    if(datos !== undefined) h['content-type'] = 'application/json';
    return fetch(ruta, {method: metodo, headers: h, credentials:'same-origin', body: datos !== undefined ? JSON.stringify(datos) : undefined})
      .then(function(r){
        return r.json().catch(function(){ return {}; }).then(function(d){
          if(r.status === 401){ salir('vencida'); throw {code:'not_granted', message: d.mensaje}; }
          if(r.status === 403 && d.error === 'cambio_clave'){ location.replace('/login?cambiar=1'); throw {code:'not_granted'}; }
          if(!r.ok) throw {code: d.error || 'tool_error', status: r.status, message: d.mensaje || ('Error ' + r.status)};
          return d;
        });
      });
  }

  /* =================== Base de datos con sincronización =================== */
  var store = {};          // col -> Map(id -> {data, act})
  var listeners = {};      // col -> [fn]
  var desde = 0, sincronizando = false, primeraCarga = null;
  function col(c){ if(!store[c]) store[c] = new Map(); return store[c]; }
  function snapshot(c){
    var docs = [];
    col(c).forEach(function(v, id){ docs.push({id: id, data: function(){ return JSON.parse(JSON.stringify(v.data)); }, exists: true}); });
    return {docs: docs, size: docs.length, empty: !docs.length};
  }
  function avisar(c){ (listeners[c] || []).forEach(function(l){ try{ l.fn(snapshot(c)); }catch(e){ console.error(e); } }); }
  function sincronizar(){
    if(sincronizando) return primeraCarga || Promise.resolve();
    sincronizando = true;
    var p = api('GET', '/api/sync?desde=' + desde).then(function(d){
      var tocadas = {};
      (d.docs || []).forEach(function(x){
        var m = col(x.col), cur = m.get(x.id);
        if(!cur || cur.act !== x.act){ m.set(x.id, {data: x.data, act: x.act}); tocadas[x.col] = 1; }
      });
      (d.borrados || []).forEach(function(x){ if(col(x.col).delete(x.id)) tocadas[x.col] = 1; });
      desde = d.ahora;
      Object.keys(tocadas).forEach(avisar);
      marcarSync(true);
    }).catch(function(e){ if(e && e.code !== 'not_granted') marcarSync(false); })
      .finally(function(){ sincronizando = false; });
    return p;
  }
  function marcarSync(ok){
    var dot = document.getElementById('syncDot'), lbl = document.getElementById('syncLabel');
    if(dot) dot.classList.toggle('off', !ok);
    if(lbl) lbl.textContent = ok ? 'Sincronizado' : 'Sin conexión — reintentando…';
  }
  function localSet(c, id, data, act){ col(c).set(id, {data: data, act: act || Date.now()}); avisar(c); }

  function docRef(c, id){
    return {
      id: id,
      get: function(){ var v = col(c).get(id); return Promise.resolve({id: id, exists: !!v, data: function(){ return v ? JSON.parse(JSON.stringify(v.data)) : undefined; }}); },
      set: function(data){
        var limpio = JSON.parse(JSON.stringify(data));
        localSet(c, id, limpio);
        return api('PUT', '/api/docs/' + c + '/' + encodeURIComponent(id), {data: limpio}).then(function(r){ var v = col(c).get(id); if(v) v.act = r.act; })
          .catch(function(e){ sincronizar(); throw e; });
      },
      update: function(patch){
        var limpio = JSON.parse(JSON.stringify(patch));
        var cur = col(c).get(id); if(cur) localSet(c, id, Object.assign({}, cur.data, limpio));
        return api('PATCH', '/api/docs/' + c + '/' + encodeURIComponent(id), {data: limpio}).then(function(r){ var v = col(c).get(id); if(v) v.act = r.act; })
          .catch(function(e){ sincronizar(); throw e; });
      },
      delete: function(){
        var had = col(c).delete(id); if(had) avisar(c);
        return api('DELETE', '/api/docs/' + c + '/' + encodeURIComponent(id)).catch(function(e){ sincronizar(); throw e; });
      }
    };
  }
  var db = {
    collection: function(c){
      return {
        doc: function(id){ return docRef(c, id); },
        add: function(data){
          var limpio = JSON.parse(JSON.stringify(data));
          return api('POST', '/api/docs/' + c, {data: limpio}).then(function(r){ localSet(c, r.id, limpio, r.act); return docRef(c, r.id); });
        },
        onSnapshot: function(fn, onErr){
          var l = {fn: fn}; (listeners[c] = listeners[c] || []).push(l);
          (primeraCarga || Promise.resolve()).then(function(){ fn(snapshot(c)); });
          return function(){ listeners[c] = (listeners[c]||[]).filter(function(x){ return x !== l; }); };
        },
        get: function(){ return Promise.resolve(snapshot(c)); }
      };
    },
    doc: function(ruta){ var p = String(ruta).split('/'); return docRef(p[0], p[1]); }
  };

  /* =================== Otras capacidades =================== */
  function descargar(o){
    return new Promise(function(resolve){
      var blob = o.data instanceof Blob ? o.data : new Blob([o.data], {type: /\.html?$/i.test(o.filename||'') ? 'text/html;charset=utf-8' : 'application/octet-stream'});
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = o.filename || 'archivo';
      document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1500); resolve();
    });
  }
  function aBase64(file){
    return new Promise(function(res, rej){ var r = new FileReader(); r.onload = function(){ var s = String(r.result); res({mediaType: file.type || 'image/jpeg', data: s.slice(s.indexOf(',')+1)}); }; r.onerror = rej; r.readAsDataURL(file); });
  }
  var sample = function(input, opts){ return sample.json(input, opts).then(function(d){ return {text: JSON.stringify(d), truncated:false}; }); };
  sample.limits = function(){ return Promise.resolve({images:{maxCount:4, mediaTypes:['image/jpeg','image/png','image/webp','image/gif']}}); };
  sample.json = function(input, opts){
    var imgs = opts && opts.images ? Array.prototype.slice.call(opts.images instanceof Blob ? [opts.images] : opts.images) : [];
    return Promise.all(imgs.map(aBase64)).then(function(images){ return api('POST', '/api/leer', {prompt: String(input), images: images}); })
      .then(function(d){ return d.resultado; })
      .catch(function(e){ throw {code: e.code === 'no_configurado' ? 'unavailable' : (e.code === 'rate_limited' ? 'rate_limited' : (e.code || 'tool_error')), message: e.message}; });
  };
  var mcp = { callTool: function(server, tool, args){
    if(tool !== 'send_message') return Promise.reject({code:'tool_error', message:'No disponible'});
    return api('POST', '/api/correo', args).then(function(d){ return {content:[], payload:d}; })
      .catch(function(e){ throw {code: e.code === 'no_configurado' ? 'unavailable' : (e.status === 502 ? 'server_unavailable' : 'tool_error'), message: e.message}; });
  }};
  var userCap = {
    id: function(){ return Promise.resolve(yo && yo.id); },
    isOwner: function(){ return Promise.resolve(!!(yo && yo.admin)); },
    canEdit: function(){ return Promise.resolve(true); },
    me: function(){ return Promise.resolve({id: yo && yo.id, name: yo && yo.nombre, email: yo && yo.email}); }
  };
  window.claude = { use: function(nombre){
    return ready.then(function(){
      if(nombre === 'db') return db;
      if(nombre === 'user') return userCap;
      if(nombre === 'mcp') return mcp;
      if(nombre === 'sample') return sample;
      if(nombre === 'downloads') return {save: descargar};
      return null;
    });
  }};
  window.cenovaGuardarTema = function(t){ api('POST', '/api/tema', {tema: t}).catch(function(){}); };

  /* =================== Sesión, tarjeta y respaldo =================== */
  function pintarSesion(){
    var slot = document.getElementById('cenovaSession'); if(!slot || !yo) return;
    var ini = yo.nombre.split(' ').map(function(x){ return x[0]; }).join('').slice(0,2).toUpperCase();
    slot.innerHTML = '<div class="ses-row"><div class="avatar" style="background:var(--accent)">'+ini+'</div><div><strong></strong><span></span></div></div>'+
      '<div class="ses-actions"><button type="button" class="btn sm" id="sesClave">Cambiar contraseña</button><button type="button" class="btn sm" id="sesSalir">Cerrar sesión</button></div>'+
      (yo.admin ? '<button type="button" class="btn sm ghost" id="sesImportar" style="width:100%; justify-content:center;">Importar respaldo de datos</button><input type="file" id="sesImportarFile" accept=".json" hidden>' : '');
    slot.querySelector('.ses-row strong').textContent = yo.nombre;
    slot.querySelector('.ses-row span').textContent = '@' + yo.id;
    document.getElementById('sesClave').addEventListener('click', function(){ location.href = '/login?cambiar=1'; });
    document.getElementById('sesSalir').addEventListener('click', function(){ salir('salida'); });
    if(yo.admin){
      var f = document.getElementById('sesImportarFile');
      document.getElementById('sesImportar').addEventListener('click', function(){ f.click(); });
      f.addEventListener('change', function(){
        var file = f.files && f.files[0]; f.value = ''; if(!file) return;
        file.text().then(function(t){
          var data = JSON.parse(t), n = 0;
          ['cotizaciones','proyectos','eventos','cotizacionesProveedor','clientes','ordenesCompra','prefacturas'].forEach(function(c){ n += Object.keys(data[c]||{}).length; });
          if(!n) throw new Error('El archivo no trae datos de la intranet.');
          if(!window.confirm('Se importarán ' + n + ' registros de "' + file.name + '". Los que tengan el mismo identificador se reemplazan. ¿Continuar?')) return;
          return api('POST', '/api/importar', data).then(function(r){ return sincronizar().then(function(){ window.alert('Respaldo importado: ' + r.total + ' registros.'); }); });
        }).catch(function(e){ window.alert('No se pudo importar: ' + (e && e.message || e)); });
      });
    }
  }

  /* =================== Inactividad =================== */
  function vigilarInactividad(){
    var limite = (yo.inactividadMin || 15) * 60000, aviso = null;
    var marcar = function(){ ultimaInteraccion = Date.now(); if(aviso){ aviso.remove(); aviso = null; } };
    ['mousemove','mousedown','keydown','scroll','touchstart','wheel'].forEach(function(e){ document.addEventListener(e, marcar, {passive:true, capture:true}); });
    setInterval(function(){
      var quieto = Date.now() - ultimaInteraccion;
      if(quieto >= limite){ salir('inactividad'); return; }
      if(quieto >= limite - 60000 && !aviso){
        aviso = document.createElement('div'); aviso.id = 'cenovaAviso';
        aviso.textContent = 'Tu sesión se cerrará en 1 minuto por inactividad. Mueve el mouse o presiona una tecla para continuar.';
        document.body.appendChild(aviso);
      }
    }, 5000);
    // Mantiene viva la sesión en el servidor mientras la persona trabaja (aunque no guarde nada).
    setInterval(function(){ if(Date.now() - ultimaInteraccion < 60000) api('GET', '/api/me').catch(function(){}); }, 120000);
  }

  /* =================== Arranque =================== */
  api('GET', '/api/me').then(function(me){
    if(me.debeCambiar){ location.replace('/login?cambiar=1'); return; }
    yo = me;
    html.setAttribute('data-theme', ['light','dark','lavanda'].indexOf(me.tema) === -1 ? 'light' : me.tema);
    try{ localStorage.setItem('cenova.theme', html.getAttribute('data-theme')); }catch(e){}
    primeraCarga = sincronizar();
    return primeraCarga;
  }).then(function(){
    if(!yo) return;
    var go = function(){
      document.querySelectorAll('#themeBtns .theme-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.themeSet === html.getAttribute('data-theme')); });
      pintarSesion(); vigilarInactividad();
      html.classList.remove('cenova-locked');
      readyResolve();
      setInterval(sincronizar, 8000);
      document.addEventListener('visibilitychange', function(){ if(!document.hidden) sincronizar(); });
    };
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }).catch(function(){ /* api() ya redirige al ingreso si hace falta */ });
})();
