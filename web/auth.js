/*
 * Intranet Cenova — ingreso, sesión y conexión con Firebase.
 *
 * El panel (index.html) se escribió para trabajar con `window.claude.use(...)`.
 * Este archivo ofrece esa misma interfaz, pero conectada a Firebase:
 *   db        → Cloud Firestore (con reglas: solo el equipo lee y escribe)
 *   user      → usuario que inició sesión
 *   mcp       → envío de correo (función "enviarCorreo" en el servidor)
 *   sample    → lectura de documentos con IA (función "leerDocumento" en el servidor)
 *   downloads → descarga de archivos en el navegador
 * Nada de lo anterior queda disponible hasta que la persona inicia sesión.
 */
(function(){
  'use strict';
  var CFG = window.CENOVA_CONFIG || {};
  var html = document.documentElement;
  html.classList.add('cenova-locked');

  if(!window.firebase || !CFG.firebase || String(CFG.firebase.apiKey||'').indexOf('PEGAR') === 0){
    document.addEventListener('DOMContentLoaded', function(){ showLogin(); setLoginError('Falta configurar Firebase en config.js (ver README).'); disableLogin(); });
    window.claude = { use: function(){ return new Promise(function(){}); } };
    return;
  }

  firebase.initializeApp(CFG.firebase);
  var auth = firebase.auth();
  var fs = firebase.firestore();
  fs.settings({ ignoreUndefinedProperties: true, merge: true });
  var fns = firebase.app().functions(CFG.region || 'us-central1');
  if(CFG.emulador){
    auth.useEmulator('http://' + CFG.emulador.host + ':' + CFG.emulador.auth);
    fs.useEmulator(CFG.emulador.host, CFG.emulador.firestore);
    fns.useEmulator(CFG.emulador.host, CFG.emulador.functions);
  }

  /* La sesión vive solo mientras la pestaña esté abierta. */
  var persistencia = auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);

  var USUARIOS = {};
  Object.keys(CFG.usuarios || {}).forEach(function(k){ USUARIOS[k.toLowerCase()] = Object.assign({usuario: k.toLowerCase()}, CFG.usuarios[k]); });
  function perfilPorEmail(email){
    email = String(email||'').toLowerCase();
    for(var k in USUARIOS){ if(USUARIOS[k].email.toLowerCase() === email) return USUARIOS[k]; }
    return null;
  }

  var readyResolve; var ready = new Promise(function(r){ readyResolve = r; });
  var sesion = { uid: null, perfil: null, clave: null };

  /* ---------------- Interfaz que usa el panel ---------------- */
  function descargar(opts){
    return new Promise(function(resolve, reject){
      try{
        var data = opts.data;
        var blob = data instanceof Blob ? data : new Blob([data], {type: /\.html?$/i.test(opts.filename||'') ? 'text/html;charset=utf-8' : 'application/octet-stream'});
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = opts.filename || 'archivo';
        document.body.appendChild(a); a.click();
        setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        resolve();
      } catch(e){ reject({code:'failed', message: String(e && e.message || e)}); }
    });
  }
  function errorServidor(e){
    var c = e && e.code ? String(e.code).replace('functions/','') : '';
    var map = {'unauthenticated':'not_granted', 'permission-denied':'not_granted', 'resource-exhausted':'rate_limited', 'failed-precondition':'unavailable', 'unavailable':'server_unavailable', 'deadline-exceeded':'server_unavailable'};
    return {code: map[c] || 'tool_error', message: (e && e.message) || 'Error del servidor'};
  }
  function fileToBase64(file){
    return new Promise(function(resolve, reject){
      var r = new FileReader();
      r.onload = function(){ var s = String(r.result); resolve({mediaType: file.type || 'image/jpeg', data: s.slice(s.indexOf(',')+1)}); };
      r.onerror = reject; r.readAsDataURL(file);
    });
  }
  var sample = function(input, opts){ return sample.json(input, opts).then(function(d){ return {text: JSON.stringify(d), truncated:false}; }); };
  sample.limits = function(){ return Promise.resolve({images:{maxCount:4, mediaTypes:['image/jpeg','image/png','image/webp','image/gif']}}); };
  sample.json = function(input, opts){
    opts = opts || {};
    var imgs = opts.images ? Array.prototype.slice.call(opts.images instanceof Blob ? [opts.images] : opts.images) : [];
    return Promise.all(imgs.map(fileToBase64)).then(function(images){
      return fns.httpsCallable('leerDocumento', {timeout: 120000})({prompt: String(input), images: images});
    }).then(function(r){ return r.data && r.data.resultado; }).catch(function(e){ throw (e && e.code && String(e.code).indexOf('functions/') === 0) ? errorServidor(e) : e; });
  };
  var mcp = {
    callTool: function(server, tool, args){
      if(tool !== 'send_message') return Promise.reject({code:'tool_error', message:'Herramienta no disponible'});
      return fns.httpsCallable('enviarCorreo', {timeout: 60000})(args).then(function(r){ return {content:[], payload:r.data}; }).catch(function(e){ throw errorServidor(e); });
    }
  };
  var userCap = {
    id: function(){ return Promise.resolve(sesion.uid); },
    isOwner: function(){ return Promise.resolve(!!(sesion.perfil && sesion.perfil.admin)); },
    canEdit: function(){ return Promise.resolve(true); },
    me: function(){ return Promise.resolve({id: sesion.uid, name: sesion.perfil && sesion.perfil.nombre || '', email: auth.currentUser && auth.currentUser.email}); }
  };
  window.claude = {
    use: function(name){
      return ready.then(function(){
        if(name === 'db') return fs;
        if(name === 'user') return userCap;
        if(name === 'mcp') return mcp;
        if(name === 'sample') return sample;
        if(name === 'downloads') return {save: descargar};
        return null;
      });
    }
  };

  /* ---------------- Tema por usuario ---------------- */
  window.cenovaGuardarTema = function(t){
    if(!sesion.uid) return;
    fs.collection('usuarios').doc(sesion.uid).set({tema: t}, {merge: true}).catch(function(){});
  };
  function aplicarTema(t){
    if(['light','dark','lavanda'].indexOf(t) === -1) t = 'light';
    html.setAttribute('data-theme', t);
    try{ localStorage.setItem('cenova.theme', t); }catch(e){}
    document.querySelectorAll('#themeBtns .theme-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.themeSet === t); });
  }

  /* ---------------- Pantalla de ingreso ---------------- */
  var LOGIN_HTML =
    '<div class="lg-card" role="dialog" aria-labelledby="lgTitle">'+
      '<div class="lg-logo"><img id="lgLogo" alt="Cenova"></div>'+
      '<h1 id="lgTitle">Intranet Cenova</h1>'+
      '<p class="lg-sub">Seguimiento gerencial · acceso solo para el equipo</p>'+
      '<form id="lgForm" autocomplete="on" novalidate>'+
        '<label>Usuario<input id="lgUser" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>'+
        '<label>Contraseña<span class="lg-pass"><input id="lgPass" type="password" name="password" autocomplete="current-password" required><button type="button" id="lgShow" aria-label="Mostrar contraseña">👁</button></span></label>'+
        '<div class="lg-error" id="lgError" role="alert"></div>'+
        '<button type="submit" class="lg-btn" id="lgSubmit">Ingresar</button>'+
      '</form>'+
      '<form id="pwForm" novalidate hidden>'+
        '<div class="lg-note" id="pwNote">Por seguridad, cambia tu contraseña antes de continuar.</div>'+
        '<label id="pwActualWrap">Contraseña actual<input id="pwActual" type="password" autocomplete="current-password"></label>'+
        '<label>Nueva contraseña<input id="pwNueva" type="password" autocomplete="new-password" minlength="10"></label>'+
        '<label>Repite la nueva contraseña<input id="pwNueva2" type="password" autocomplete="new-password"></label>'+
        '<div class="lg-hint">Mínimo 10 caracteres, con letras y números, distinta de tu usuario.</div>'+
        '<div class="lg-error" id="pwError" role="alert"></div>'+
        '<button type="submit" class="lg-btn" id="pwSubmit">Guardar contraseña</button>'+
        '<button type="button" class="lg-link" id="pwCancel" hidden>Cancelar</button>'+
      '</form>'+
      '<div class="lg-foot">🔒 Conexión cifrada · la sesión se cierra al cerrar la ventana o tras '+(CFG.inactividadMin||15)+' min sin actividad</div>'+
    '</div>';

  function el(id){ return document.getElementById(id); }
  function showLogin(){
    var box = el('cenovaLogin');
    if(!box){
      box = document.createElement('div'); box.id = 'cenovaLogin'; box.innerHTML = LOGIN_HTML;
      document.body.appendChild(box);
      var brand = document.querySelector('.brand-mark img'); if(brand) el('lgLogo').src = brand.src;
      el('lgForm').addEventListener('submit', onLogin);
      el('pwForm').addEventListener('submit', onChangePassword);
      el('lgShow').addEventListener('click', function(){ var p = el('lgPass'); p.type = p.type === 'password' ? 'text' : 'password'; });
      el('pwCancel').addEventListener('click', function(){ el('pwForm').hidden = true; box.classList.remove('open'); });
    }
    box.classList.add('open');
    var q = new URLSearchParams(location.search);
    if(q.get('motivo') === 'inactividad') setLoginError('Tu sesión se cerró por '+(CFG.inactividadMin||15)+' minutos de inactividad. Ingresa de nuevo.', true);
    if(q.get('motivo') === 'salida') setLoginError('Cerraste sesión.', true);
    setTimeout(function(){ var u = el('lgUser'); if(u && !el('lgForm').hidden) u.focus(); }, 50);
  }
  function setLoginError(msg, info){ var e = el('lgError'); if(e){ e.textContent = msg || ''; e.classList.toggle('info', !!info); } }
  function disableLogin(){ var b = el('lgSubmit'); if(b) b.disabled = true; }
  function busy(btn, on, txt){ btn.disabled = on; if(txt) btn.textContent = txt; }

  function onLogin(ev){
    ev.preventDefault();
    var u = el('lgUser').value.trim().toLowerCase(), p = el('lgPass').value;
    if(!u || !p){ setLoginError('Escribe tu usuario y contraseña.'); return; }
    var perfil = USUARIOS[u] || perfilPorEmail(u);
    /* Mismo mensaje si el usuario no existe o la clave falla: no revelamos cuál de los dos. */
    if(!perfil){ setLoginError('Usuario o contraseña incorrectos.'); return; }
    busy(el('lgSubmit'), true, 'Verificando…'); setLoginError('');
    sesion.clave = p;
    persistencia.then(function(){ return auth.signInWithEmailAndPassword(perfil.email, p); }).catch(function(e){
      sesion.clave = null;
      var c = e && e.code;
      setLoginError(c === 'auth/too-many-requests' ? 'Demasiados intentos. Por seguridad la cuenta quedó bloqueada unos minutos.'
        : c === 'auth/network-request-failed' ? 'Sin conexión a internet.'
        : 'Usuario o contraseña incorrectos.');
      busy(el('lgSubmit'), false, 'Ingresar');
    });
  }

  function claveValida(nueva, usuario){
    if(nueva.length < 10) return 'La contraseña debe tener al menos 10 caracteres.';
    if(!/[a-zA-Z]/.test(nueva) || !/[0-9]/.test(nueva)) return 'Usa letras y números.';
    if(usuario && nueva.toLowerCase().indexOf(usuario.toLowerCase()) !== -1) return 'La contraseña no puede contener tu usuario.';
    return '';
  }
  function abrirCambioClave(obligatorio){
    showLogin();
    var box = el('cenovaLogin');
    el('lgForm').hidden = true; el('pwForm').hidden = false;
    el('pwActualWrap').hidden = obligatorio && !!sesion.clave;
    el('pwCancel').hidden = obligatorio;
    el('pwNote').textContent = obligatorio ? 'Hola '+((sesion.perfil && sesion.perfil.nombre.split(' ')[0]) || '')+'. Es tu primer ingreso: por seguridad, crea tu propia contraseña antes de continuar.' : 'Cambia tu contraseña.';
    el('pwError').textContent = '';
    ['pwActual','pwNueva','pwNueva2'].forEach(function(i){ el(i).value = ''; });
    box.classList.add('open');
    setTimeout(function(){ (el('pwActualWrap').hidden ? el('pwNueva') : el('pwActual')).focus(); }, 50);
  }
  window.cenovaCambiarClave = function(){ abrirCambioClave(false); };

  function onChangePassword(ev){
    ev.preventDefault();
    var actual = el('pwActualWrap').hidden ? sesion.clave : el('pwActual').value;
    var n1 = el('pwNueva').value, n2 = el('pwNueva2').value;
    var err = claveValida(n1, sesion.perfil && sesion.perfil.usuario);
    if(!err && n1 !== n2) err = 'Las contraseñas nuevas no coinciden.';
    if(!err && n1 === actual) err = 'La nueva contraseña debe ser distinta de la actual.';
    if(!actual) err = err || 'Escribe tu contraseña actual.';
    if(err){ el('pwError').textContent = err; return; }
    var user = auth.currentUser; if(!user) return;
    busy(el('pwSubmit'), true, 'Guardando…');
    var cred = firebase.auth.EmailAuthProvider.credential(user.email, actual);
    user.reauthenticateWithCredential(cred).then(function(){ return user.updatePassword(n1); }).then(function(){
      return fs.collection('usuarios').doc(user.uid).set({debeCambiarClave: false, claveCambiadaEn: new Date().toISOString()}, {merge: true});
    }).then(function(){
      sesion.clave = null;
      busy(el('pwSubmit'), false, 'Guardar contraseña');
      el('pwForm').hidden = true; el('lgForm').hidden = false;
      desbloquear();
      if(window.cenovaToast) window.cenovaToast('Contraseña actualizada.');
    }).catch(function(e){
      var c = e && e.code;
      el('pwError').textContent = c === 'auth/wrong-password' || c === 'auth/invalid-credential' ? 'La contraseña actual no es correcta.'
        : c === 'auth/weak-password' ? 'Esa contraseña es muy débil.' : c === 'auth/too-many-requests' ? 'Demasiados intentos, espera unos minutos.' : 'No se pudo cambiar la contraseña. Intenta de nuevo.';
      busy(el('pwSubmit'), false, 'Guardar contraseña');
    });
  }

  function desbloquear(){
    yaDesbloqueado = true;
    var box = el('cenovaLogin'); if(box) box.classList.remove('open');
    html.classList.remove('cenova-locked');
    pintarSesion();
    iniciarInactividad();
    readyResolve();
  }

  function pintarSesion(){
    var slot = el('cenovaSession'); if(!slot) return;
    var p = sesion.perfil || {};
    var ini = (p.nombre||'?').split(' ').map(function(x){ return x[0]; }).join('').slice(0,2).toUpperCase();
    slot.innerHTML = '<div class="ses-row"><div class="avatar" style="background:var(--accent)">'+ini+'</div><div><strong>'+(p.nombre||'')+'</strong><span>@'+(p.usuario||'')+'</span></div></div>'+
      '<div class="ses-actions"><button type="button" class="btn sm" id="sesClave">Cambiar contraseña</button><button type="button" class="btn sm" id="sesSalir">Cerrar sesión</button></div>'+
      (p.admin ? '<button type="button" class="btn sm ghost" id="sesImportar" style="width:100%; justify-content:center;">Importar respaldo de datos</button><input type="file" id="sesImportarFile" accept=".json" hidden>' : '');
    el('sesClave').addEventListener('click', window.cenovaCambiarClave);
    el('sesSalir').addEventListener('click', function(){ cerrarSesion('salida'); });
    if(p.admin){
      el('sesImportar').addEventListener('click', function(){ el('sesImportarFile').click(); });
      el('sesImportarFile').addEventListener('change', importarRespaldo);
    }
  }

  function cerrarSesion(motivo){
    auth.signOut().finally(function(){ location.replace(location.pathname + '?motivo=' + motivo); });
  }

  /* ---------------- Inactividad ---------------- */
  var ultimoMovimiento = Date.now(), avisoMostrado = false, timerInact = null;
  function iniciarInactividad(){
    var limite = (CFG.inactividadMin || 15) * 60000;
    var reset = function(){ ultimoMovimiento = Date.now(); if(avisoMostrado){ avisoMostrado = false; var a = el('cenovaAviso'); if(a) a.remove(); } };
    ['mousemove','mousedown','keydown','scroll','touchstart','wheel'].forEach(function(evt){ document.addEventListener(evt, reset, {passive:true, capture:true}); });
    clearInterval(timerInact);
    timerInact = setInterval(function(){
      var quieto = Date.now() - ultimoMovimiento;
      if(quieto >= limite){ clearInterval(timerInact); cerrarSesion('inactividad'); return; }
      if(quieto >= limite - 60000 && !avisoMostrado){
        avisoMostrado = true;
        var a = document.createElement('div'); a.id = 'cenovaAviso';
        a.textContent = 'Tu sesión se cerrará en 1 minuto por inactividad. Mueve el mouse o presiona una tecla para continuar.';
        document.body.appendChild(a);
      }
    }, 5000);
  }

  /* ---------------- Importar respaldo (solo administración) ---------------- */
  var COLECCIONES = ['cotizaciones','proyectos','eventos','cotizacionesProveedor','clientes','ordenesCompra'];
  function importarRespaldo(ev){
    var file = ev.target.files && ev.target.files[0]; ev.target.value = '';
    if(!file) return;
    file.text().then(function(txt){
      var data = JSON.parse(txt);
      var total = 0; COLECCIONES.forEach(function(c){ total += Object.keys(data[c]||{}).length; });
      if(!total) throw new Error('El archivo no trae datos de la intranet.');
      if(!window.confirm('Se importarán '+total+' registros del respaldo "'+file.name+'". Los que tengan el mismo identificador se reemplazan. ¿Continuar?')) return;
      var ops = [];
      COLECCIONES.forEach(function(c){ Object.keys(data[c]||{}).forEach(function(id){ ops.push([c, id, data[c][id]]); }); });
      var lotes = [];
      for(var i=0;i<ops.length;i+=400) lotes.push(ops.slice(i,i+400));
      return lotes.reduce(function(p, lote){
        return p.then(function(){ var b = fs.batch(); lote.forEach(function(o){ b.set(fs.collection(o[0]).doc(o[1]), o[2]); }); return b.commit(); });
      }, Promise.resolve()).then(function(){ window.alert('Respaldo importado: '+ops.length+' registros.'); });
    }).catch(function(e){ window.alert('No se pudo importar: '+(e && e.message || e)); });
  }

  /* ---------------- Estado de la sesión ---------------- */
  var yaDesbloqueado = false;
  auth.onAuthStateChanged(function(user){
    if(!user){
      if(yaDesbloqueado){ location.replace(location.pathname + '?motivo=salida'); return; }
      if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showLogin); else showLogin();
      return;
    }
    var perfil = perfilPorEmail(user.email);
    if(!perfil){ auth.signOut(); setLoginError('Este usuario no tiene acceso a la intranet.'); return; }
    sesion.uid = user.uid; sesion.perfil = perfil;
    var ref = fs.collection('usuarios').doc(user.uid);
    ref.get().then(function(snap){
      var d = snap.exists ? snap.data() : null;
      if(!d){
        d = {usuario: perfil.usuario, nombre: perfil.nombre, email: user.email, tema: 'light', debeCambiarClave: true, creadoEn: new Date().toISOString()};
        return ref.set(d).then(function(){ return d; });
      }
      return d;
    }).then(function(d){
      aplicarTema(d.tema || 'light');
      ref.set({ultimoIngreso: new Date().toISOString()}, {merge: true}).catch(function(){});
      var go = function(){
        if(d.debeCambiarClave){ abrirCambioClave(true); if(!sesion.clave){ el('pwActualWrap').hidden = false; } }
        else { yaDesbloqueado = true; desbloquear(); }
      };
      if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
    }).catch(function(e){
      auth.signOut();
      showLogin(); setLoginError('No se pudo cargar tu perfil ('+(e && e.code || 'error')+').');
      var b = el('lgSubmit'); if(b){ b.disabled = false; b.textContent = 'Ingresar'; }
    });
  });
})();
