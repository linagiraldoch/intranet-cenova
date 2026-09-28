/* Intranet Cenova — pantalla de ingreso y cambio de contraseña. */
(function(){
  'use strict';
  var $ = function(id){ return document.getElementById(id); };
  var claveIngresada = null;

  function api(ruta, datos, conPestana){
    var h = {'content-type':'application/json', 'x-cenova':'1'};
    if(conPestana){ try{ h['x-pestana'] = sessionStorage.getItem('cenova.pestana') || ''; }catch(e){} h['x-actividad'] = '1'; }
    return fetch(ruta, {method:'POST', headers:h, credentials:'same-origin', body: JSON.stringify(datos||{})})
      .then(function(r){ return r.json().catch(function(){ return {mensaje: 'El servidor tuvo un problema (código ' + r.status + '). No se guardó nada; intenta de nuevo en un momento.'}; }).then(function(d){ d._status = r.status; return d; }); });
  }
  function msg(id, texto, info){ var e = $(id); e.textContent = texto || ''; e.classList.toggle('info', !!info); }
  function ocupado(btn, on, txt){ btn.disabled = on; btn.textContent = txt; }
  function tema(t){
    if(['light','dark','lavanda'].indexOf(t) === -1) t = 'light';
    document.documentElement.setAttribute('data-theme', t);
    try{ localStorage.setItem('cenova.theme', t); }catch(e){}
  }

  var q = new URLSearchParams(location.search);
  var motivos = {inactividad:'Tu sesión se cerró por inactividad. Ingresa de nuevo.', salida:'Cerraste sesión.', vencida:'Tu sesión venció. Ingresa de nuevo.', pestana:'Por seguridad, cada ventana nueva pide ingresar.'};
  if(motivos[q.get('motivo')]) msg('lgError', motivos[q.get('motivo')], true);
  if(q.get('cambiar') === '1'){ mostrarCambio(false); }
  history.replaceState(null, '', '/login');

  $('lgShow').addEventListener('click', function(){ var p = $('lgPass'); p.type = p.type === 'password' ? 'text' : 'password'; });

  $('lgForm').addEventListener('submit', function(ev){
    ev.preventDefault();
    var u = $('lgUser').value.trim(), c = $('lgPass').value;
    if(!u || !c){ msg('lgError', 'Escribe tu usuario y contraseña.'); return; }
    ocupado($('lgSubmit'), true, 'Verificando…'); msg('lgError', '');
    api('/api/login', {usuario:u, clave:c}).then(function(d){
      if(!d.ok){ msg('lgError', d.mensaje || 'No se pudo ingresar.'); ocupado($('lgSubmit'), false, 'Ingresar'); return; }
      try{ sessionStorage.setItem('cenova.pestana', d.pestana); }catch(e){}
      tema(d.tema);
      if(d.debeCambiar){ claveIngresada = c; mostrarCambio(true, d.nombre); ocupado($('lgSubmit'), false, 'Ingresar'); return; }
      location.replace('/');
    }).catch(function(){ msg('lgError', 'Sin conexión con el servidor.'); ocupado($('lgSubmit'), false, 'Ingresar'); });
  });

  function mostrarCambio(obligatorio, nombre){
    $('lgForm').hidden = true; $('pwForm').hidden = false;
    $('pwActualWrap').hidden = obligatorio && !!claveIngresada;
    $('pwNote').textContent = obligatorio
      ? 'Hola ' + String(nombre||'').split(' ')[0] + '. Es tu primer ingreso: por seguridad, crea tu propia contraseña antes de continuar.'
      : 'Cambia tu contraseña. Al guardarla se cierran tus otras sesiones abiertas.';
    $('pwCancel').hidden = obligatorio;
    setTimeout(function(){ ($('pwActualWrap').hidden ? $('pwNueva') : $('pwActual')).focus(); }, 50);
  }
  $('pwCancel').addEventListener('click', function(){ location.replace('/'); });

  $('pwForm').addEventListener('submit', function(ev){
    ev.preventDefault();
    var actual = $('pwActualWrap').hidden ? claveIngresada : $('pwActual').value;
    var n1 = $('pwNueva').value, n2 = $('pwNueva2').value;
    if(n1 !== n2){ msg('pwError', 'Las contraseñas nuevas no coinciden.'); return; }
    if(n1.length < 10){ msg('pwError', 'La contraseña debe tener al menos 10 caracteres.'); return; }
    ocupado($('pwSubmit'), true, 'Guardando…'); msg('pwError', '');
    api('/api/clave', {actual: actual, nueva: n1}, true).then(function(d){
      if(d.ok){ claveIngresada = null; location.replace('/'); return; }
      if(d._status === 401){ location.replace('/login?motivo=vencida'); return; }
      msg('pwError', d.mensaje || 'No se pudo cambiar la contraseña.'); ocupado($('pwSubmit'), false, 'Guardar contraseña');
    }).catch(function(){ msg('pwError', 'Sin conexión con el servidor.'); ocupado($('pwSubmit'), false, 'Guardar contraseña'); });
  });

  setTimeout(function(){ if(!$('lgForm').hidden) $('lgUser').focus(); }, 50);
})();
