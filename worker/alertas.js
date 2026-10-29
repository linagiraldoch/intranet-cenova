/* Alertas por vencimiento (2026-10-29).
   Lógica pura (sin base de datos ni red) para poder probarla: recibe los datos y devuelve los correos a enviar.
   Regla: un pendiente automático (seguimiento de cotización, cobro, orden de compra…) que lleva 1 día vencido
   le avisa a su responsable y a administración. Para no repetir cada mañana, se vuelve a avisar a los 3 y 7 días,
   y luego cada semana. */

const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').trim();
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const diasEntre = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000);

/* ¿Hoy toca avisar de algo vencido hace n días? */
export function tocaAvisar(n) { return n === 1 || n === 3 || n === 7 || (n > 7 && n % 7 === 0); }

/* A quién está asignado: el responsable de la cotización u orden de la que sale; si no hay, quien la creó. */
export function responsableDe(ev, origenes, usuarios) {
  const o = origenes[(ev.origen === 'orden' ? 'o:' : 'c:') + ev.origenId];
  const nombre = norm(o && o.responsable);
  if (nombre) {
    const u = usuarios.find((x) => nombre.indexOf(norm(x.nombre).split(' ')[0]) !== -1 || nombre === norm(x.id));
    if (u) return u;
  }
  return usuarios.find((x) => x.id === ev.creadoPorId) || null;
}

/* eventos: lista de eventos; origenes: {'c:<id>': cotización, 'o:<id>': orden}; usuarios: [{id,nombre,email,admin}] */
export function calcularAlertas({ eventos, origenes, usuarios, hoy, url }) {
  const vencidos = [];
  for (const ev of eventos) {
    if (!ev.auto || ev.estado !== 'pendiente' || !ev.fecha || ev.tipo === 'instalacion') continue;
    const n = diasEntre(ev.fecha, hoy);
    if (n < 1 || !tocaAvisar(n)) continue;
    vencidos.push({ ev, n, u: responsableDe(ev, origenes, usuarios) });
  }
  if (!vencidos.length) return [];
  const fila = (x) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eef1f5;"><strong>${esc(x.ev.titulo || x.ev.etiqueta || 'Pendiente')}</strong>
    <span style="color:#b93b3b;font-weight:bold;"> · vencido hace ${x.n} día${x.n === 1 ? '' : 's'}</span><br>
    <span style="color:#5b6b80;font-size:13px;">${esc(x.ev.cliente || '')}${x.u ? ' · asignado a ' + esc(x.u.nombre) : ''}${x.ev.motivo ? ' — ' + esc(x.ev.motivo) : ''}</span></td></tr>`;
  const cuerpo = (saludo, lista) => `<div style="font-family:Arial,Helvetica,sans-serif;color:#16233a;max-width:640px;"><p>${saludo}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${lista.map(fila).join('')}</table>
    <p style="margin-top:22px;"><a href="${esc(url)}" style="color:#2456a6;">Abrir la Intranet Cenova</a></p></div>`;
  const plano = (lista) => lista.map((x) => `VENCIDO (${x.n} d): ${x.ev.titulo || x.ev.etiqueta}${x.u ? ' — ' + x.u.nombre : ''}`).join('\n') + '\n\n' + url;
  const asunto = (lista, quien) => lista.length === 1
    ? `Vencido: ${lista[0].ev.etiqueta || lista[0].ev.titulo}${lista[0].ev.cliente ? ' · ' + lista[0].ev.cliente : ''}${quien ? ' — ' + quien : ''}`
    : `${lista.length} pendientes vencidos${quien ? ' — ' + quien : ''}`;
  const correos = [];
  /* 1) a cada responsable (que no sea administración): lo suyo */
  const porUsuario = new Map();
  for (const x of vencidos) if (x.u && !x.u.admin && x.u.email) porUsuario.set(x.u.id, (porUsuario.get(x.u.id) || []).concat([x]));
  for (const [, lista] of porUsuario) {
    const u = lista[0].u;
    correos.push({ to: [u.email], subject: asunto(lista, ''), html: cuerpo(`Hola ${esc(u.nombre.split(' ')[0])}, esto está vencido y es tuyo. Atiéndelo o márcalo en la intranet:`, lista), text: plano(lista) });
  }
  /* 2) a administración: todo lo del equipo, con el nombre de quien lo tiene */
  for (const a of usuarios.filter((x) => x.admin && x.email)) {
    correos.push({ to: [a.email], subject: asunto(vencidos, ''), html: cuerpo(`Hola ${esc(a.nombre.split(' ')[0])}, esto lleva días vencido en el equipo:`, vencidos), text: plano(vencidos) });
  }
  return correos;
}
