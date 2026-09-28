/*
 * Intranet Cenova — servidor (Cloudflare Worker).
 *
 * - Entrega la página solo a quien tiene sesión (sin sesión: únicamente la pantalla de ingreso).
 * - Ingreso con contraseñas cifradas (PBKDF2-SHA256 + clave secreta del servidor "PEPPER").
 * - Sesión atada a la pestaña: cookie HttpOnly + clave de pestaña; vence por inactividad en el servidor.
 * - API de datos con reglas (quién puede qué), registro de auditoría.
 * - Correos (Resend) solo al equipo, lectura de documentos con IA (Anthropic) y resumen diario (cron).
 */

const COLECCIONES = ['cotizaciones', 'proyectos', 'eventos', 'cotizacionesProveedor', 'clientes', 'ordenesCompra'];
const COOKIE = 'cenova_sesion';
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;
const SESION_MAX_MS = 12 * 60 * 60 * 1000;
const TEMAS = ['light', 'dark', 'lavanda'];

/* ======================= utilidades ======================= */
const enc = new TextEncoder();
function b64(buf) { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
function b64url(buf) { return b64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function aleatorio(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
async function sha256(txt) { return b64(await crypto.subtle.digest('SHA-256', enc.encode(txt))); }
function igualSeguro(a, b) {
  a = String(a || ''); b = String(b || '');
  let r = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) r |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return r === 0;
}
async function hashClave(env, clave, salB64, iter) {
  if (!env.PEPPER) throw new Error('Falta el secreto PEPPER');
  const hk = await crypto.subtle.importKey('raw', enc.encode(env.PEPPER), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const pre = await crypto.subtle.sign('HMAC', hk, enc.encode(clave));
  const k = await crypto.subtle.importKey('raw', pre, 'PBKDF2', false, ['deriveBits']);
  const sal = Uint8Array.from(atob(salB64), (c) => c.charCodeAt(0));
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iter }, k, 256));
}
function claveValida(nueva, usuario) {
  if (typeof nueva !== 'string' || nueva.length < 10) return 'La contraseña debe tener al menos 10 caracteres.';
  if (nueva.length > 200) return 'La contraseña es demasiado larga.';
  if (!/[a-zA-Z]/.test(nueva) || !/[0-9]/.test(nueva)) return 'Usa letras y números.';
  if (usuario && nueva.toLowerCase().indexOf(usuario.toLowerCase()) !== -1) return 'La contraseña no puede contener tu usuario.';
  return '';
}
function leerCookie(req, nombre) {
  const c = req.headers.get('cookie') || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + nombre + '=([^;]+)'));
  return m ? m[1] : null;
}
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://cdnjs.cloudflare.com",
  "worker-src 'self' blob: https://cdnjs.cloudflare.com",
  "frame-src 'self' blob:",
  "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'"
].join('; ');
function seguridad(h) {
  h.set('Content-Security-Policy', CSP);
  h.set('X-Frame-Options', 'DENY');
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'no-referrer');
  h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  h.set('X-Robots-Tag', 'noindex, nofollow');
  return h;
}
function json(data, status = 200, extra) {
  const h = seguridad(new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }));
  if (extra) for (const [k, v] of Object.entries(extra)) h.append(k, v);
  return new Response(JSON.stringify(data), { status, headers: h });
}
const err = (status, error, mensaje) => json({ error, mensaje }, status);
function ip(req) { return req.headers.get('cf-connecting-ip') || ''; }
async function auditar(env, usuario, accion, col, id, detalle, req) {
  try {
    await env.DB.prepare('INSERT INTO auditoria (ts, usuario, accion, col, doc_id, detalle, ip) VALUES (?,?,?,?,?,?,?)')
      .bind(Date.now(), usuario || null, accion, col || null, id || null, detalle ? String(detalle).slice(0, 500) : null, req ? ip(req) : null).run();
  } catch (e) { /* la auditoría nunca debe tumbar la operación */ }
}
function inactividadMs(env) { return (Number(env.INACTIVIDAD_MIN) || 15) * 60000; }

/* ======================= sesión ======================= */
async function sesionDe(req, env, { exigirPestana = true, contarActividad = false } = {}) {
  const token = leerCookie(req, COOKIE);
  if (!token) return null;
  const th = await sha256(token);
  const s = await env.DB.prepare('SELECT s.*, u.nombre, u.email, u.admin, u.tema, u.debe_cambiar, u.activo FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token_hash = ?').bind(th).first();
  if (!s || !s.activo) return null;
  const ahora = Date.now();
  if (ahora > s.expira || ahora - s.actividad > inactividadMs(env)) {
    await env.DB.prepare('DELETE FROM sesiones WHERE token_hash = ?').bind(th).run();
    return null;
  }
  if (exigirPestana) {
    const pk = req.headers.get('x-pestana');
    if (!pk || !igualSeguro(await sha256(pk), s.pestana_hash)) return null;
  }
  if (contarActividad) await env.DB.prepare('UPDATE sesiones SET actividad = ? WHERE token_hash = ?').bind(ahora, th).run();
  s.token_hash = th;
  return s;
}
function cookieSesion(token) { return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict`; }
function cookieBorrar() { return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`; }

/* ======================= ingreso ======================= */
async function login(req, env) {
  let body; try { body = await req.json(); } catch (e) { return err(400, 'formato', 'Solicitud inválida.'); }
  const usuario = String(body.usuario || '').trim().toLowerCase();
  const clave = String(body.clave || '');
  const incorrecto = () => err(401, 'credenciales', 'Usuario o contraseña incorrectos.');
  if (!usuario || !clave || clave.length > 200) return incorrecto();
  const u = await env.DB.prepare('SELECT * FROM usuarios WHERE id = ? OR lower(email) = ?').bind(usuario, usuario).first();
  const ahora = Date.now();
  if (!u || !u.activo) { await auditar(env, usuario, 'ingreso_fallido', null, null, 'usuario inexistente', req); return incorrecto(); }
  if (u.bloqueado_hasta > ahora) {
    return err(429, 'bloqueado', 'Demasiados intentos fallidos. Por seguridad la cuenta quedó bloqueada; intenta en ' + Math.ceil((u.bloqueado_hasta - ahora) / 60000) + ' minuto(s).');
  }
  let ok = false;
  if (u.hash) {
    ok = igualSeguro(await hashClave(env, clave, u.sal, u.iteraciones), u.hash);
  } else {
    let iniciales = {}; try { iniciales = JSON.parse(env.CLAVES_INICIALES || '{}'); } catch (e) { /* vacío */ }
    ok = !!iniciales[u.id] && igualSeguro(await sha256(clave), await sha256(String(iniciales[u.id])));
  }
  if (!ok) {
    const intentos = u.intentos + 1;
    const bloqueo = intentos >= MAX_INTENTOS ? ahora + BLOQUEO_MS : 0;
    await env.DB.prepare('UPDATE usuarios SET intentos = ?, bloqueado_hasta = ? WHERE id = ?').bind(bloqueo ? 0 : intentos, bloqueo, u.id).run();
    await auditar(env, u.id, bloqueo ? 'cuenta_bloqueada' : 'ingreso_fallido', null, null, null, req);
    return bloqueo ? err(429, 'bloqueado', 'Demasiados intentos fallidos. Por seguridad la cuenta quedó bloqueada 15 minutos.') : incorrecto();
  }
  const token = b64url(aleatorio(32)), pestana = b64url(aleatorio(24));
  await env.DB.batch([
    env.DB.prepare('UPDATE usuarios SET intentos = 0, bloqueado_hasta = 0, ultimo_ingreso = ? WHERE id = ?').bind(ahora, u.id),
    env.DB.prepare('DELETE FROM sesiones WHERE expira < ? OR actividad < ?').bind(ahora, ahora - inactividadMs(env)),
    env.DB.prepare('INSERT INTO sesiones (token_hash, pestana_hash, usuario_id, creada, actividad, expira, ip, agente) VALUES (?,?,?,?,?,?,?,?)')
      .bind(await sha256(token), await sha256(pestana), u.id, ahora, ahora, ahora + SESION_MAX_MS, ip(req), (req.headers.get('user-agent') || '').slice(0, 200))
  ]);
  await auditar(env, u.id, 'ingreso', null, null, null, req);
  return json({ ok: true, pestana, debeCambiar: !!u.debe_cambiar || !u.hash, nombre: u.nombre, tema: u.tema }, 200, { 'Set-Cookie': cookieSesion(token) });
}

async function cambiarClave(req, env) {
  const s = await sesionDe(req, env, { contarActividad: true });
  if (!s) return err(401, 'sesion', 'Tu sesión venció. Ingresa de nuevo.');
  let body; try { body = await req.json(); } catch (e) { return err(400, 'formato', 'Solicitud inválida.'); }
  const u = await env.DB.prepare('SELECT * FROM usuarios WHERE id = ?').bind(s.usuario_id).first();
  const actual = String(body.actual || ''), nueva = String(body.nueva || '');
  let ok;
  if (u.hash) ok = igualSeguro(await hashClave(env, actual, u.sal, u.iteraciones), u.hash);
  else { let ini = {}; try { ini = JSON.parse(env.CLAVES_INICIALES || '{}'); } catch (e) { /* */ } ok = !!ini[u.id] && igualSeguro(actual, String(ini[u.id])); }
  if (!ok) return err(400, 'actual', 'La contraseña actual no es correcta.');
  const problema = claveValida(nueva, u.id);
  if (problema) return err(400, 'debil', problema);
  if (nueva === actual) return err(400, 'igual', 'La nueva contraseña debe ser distinta de la actual.');
  const sal = b64(aleatorio(16)), iter = Number(env.ITERACIONES) || 50000;
  const hash = await hashClave(env, nueva, sal, iter);
  await env.DB.batch([
    env.DB.prepare('UPDATE usuarios SET hash = ?, sal = ?, iteraciones = ?, debe_cambiar = 0, clave_cambiada = ? WHERE id = ?').bind(hash, sal, iter, Date.now(), u.id),
    // Al cambiar la contraseña se cierran las demás sesiones abiertas de esa persona.
    env.DB.prepare('DELETE FROM sesiones WHERE usuario_id = ? AND token_hash <> ?').bind(u.id, s.token_hash)
  ]);
  await auditar(env, u.id, 'cambio_clave', null, null, null, req);
  return json({ ok: true });
}

/* ======================= datos ======================= */
async function sync(req, env, s) {
  const url = new URL(req.url);
  const desde = Math.max(0, (Number(url.searchParams.get('desde')) || 0) - 3000);
  const ahora = Date.now();
  const docs = await env.DB.prepare('SELECT col, id, data, actualizado FROM docs WHERE actualizado > ?').bind(desde).all();
  const borr = desde ? await env.DB.prepare('SELECT col, id, ts FROM borrados WHERE ts > ?').bind(desde).all() : { results: [] };
  return json({
    ahora,
    docs: docs.results.map((d) => ({ col: d.col, id: d.id, act: d.actualizado, data: JSON.parse(d.data) })),
    borrados: borr.results.map((b) => ({ col: b.col, id: b.id }))
  });
}
function idValido(id) { return typeof id === 'string' && /^[A-Za-z0-9_\-.:@+~]{1,200}$/.test(id); }
async function escribir(req, env, s, col, id, metodo) {
  if (COLECCIONES.indexOf(col) === -1) return err(404, 'coleccion', 'Colección no permitida.');
  if (id && !idValido(id)) return err(400, 'id', 'Identificador inválido.');
  const actual = id ? await env.DB.prepare('SELECT data FROM docs WHERE col = ? AND id = ?').bind(col, id).first() : null;
  const previo = actual ? JSON.parse(actual.data) : null;
  const ahora = Date.now();

  if (metodo === 'DELETE') {
    if (col === 'ordenesCompra' && !s.admin) return err(403, 'regla', 'Las órdenes de compra no se borran: cámbiala a "Anulada".');
    await env.DB.batch([
      env.DB.prepare('DELETE FROM docs WHERE col = ? AND id = ?').bind(col, id),
      env.DB.prepare('INSERT OR REPLACE INTO borrados (col, id, ts, usuario) VALUES (?,?,?,?)').bind(col, id, ahora, s.usuario_id)
    ]);
    await auditar(env, s.usuario_id, 'borrar', col, id, previo && previo.numero, req);
    return json({ ok: true, act: ahora });
  }

  let body; try { body = await req.json(); } catch (e) { return err(400, 'formato', 'Solicitud inválida.'); }
  let data = body && body.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return err(400, 'formato', 'Datos inválidos.');
  if (metodo === 'PATCH') {
    if (!previo) return err(404, 'no_existe', 'El registro no existe.');
    data = Object.assign({}, previo, data);
  }
  // Los números de registro (COT-xxxx, OC-xxxx) no se pueden cambiar una vez asignados.
  if ((col === 'cotizaciones' || col === 'ordenesCompra') && previo && previo.numero && data.numero !== previo.numero) {
    return err(403, 'regla', 'El número de registro ' + previo.numero + ' no se puede modificar.');
  }
  const txt = JSON.stringify(data);
  if (txt.length > 1800000) return err(413, 'tamano', 'El registro es demasiado grande (adjunto muy pesado).');
  if (!id) id = b64url(aleatorio(15)).replace(/[-_]/g, 'x').slice(0, 20);
  await env.DB.prepare('INSERT INTO docs (col, id, data, actualizado, actualizado_por) VALUES (?,?,?,?,?) ON CONFLICT(col, id) DO UPDATE SET data = excluded.data, actualizado = excluded.actualizado, actualizado_por = excluded.actualizado_por')
    .bind(col, id, txt, ahora, s.usuario_id).run();
  await env.DB.prepare('DELETE FROM borrados WHERE col = ? AND id = ?').bind(col, id).run();
  if (col !== 'eventos' || !data.auto) await auditar(env, s.usuario_id, previo ? 'editar' : 'crear', col, id, data.numero || data.titulo || data.nombre || data.proveedor, req);
  return json({ ok: true, id, act: ahora });
}

async function importar(req, env, s) {
  if (!s.admin) return err(403, 'regla', 'Solo administración puede importar respaldos.');
  let body; try { body = await req.json(); } catch (e) { return err(400, 'formato', 'El archivo no es un respaldo válido.'); }
  const ahora = Date.now(); const stmts = [];
  for (const col of COLECCIONES) {
    for (const [id, data] of Object.entries(body[col] || {})) {
      if (!idValido(id) || !data || typeof data !== 'object') continue;
      stmts.push(env.DB.prepare('INSERT OR REPLACE INTO docs (col, id, data, actualizado, actualizado_por) VALUES (?,?,?,?,?)').bind(col, id, JSON.stringify(data), ahora, s.usuario_id));
    }
  }
  if (!stmts.length) return err(400, 'vacio', 'El archivo no trae datos de la intranet.');
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  await auditar(env, s.usuario_id, 'importar_respaldo', null, null, stmts.length + ' registros', req);
  return json({ ok: true, total: stmts.length });
}

/* ======================= correo e IA ======================= */
async function enviarResend(env, { to, subject, html, text, replyTo }) {
  if (!env.RESEND_API_KEY) { const e = new Error('Correo no configurado'); e.codigo = 'no_configurado'; throw e; }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.RESEND_API_KEY },
    body: JSON.stringify({ from: env.CORREO_REMITENTE, to, subject, html, text, reply_to: replyTo })
  });
  if (!r.ok) { const e = new Error('Resend ' + r.status + ': ' + (await r.text()).slice(0, 200)); e.codigo = 'proveedor'; throw e; }
  return r.json();
}
async function correo(req, env, s) {
  let d; try { d = await req.json(); } catch (e) { return err(400, 'formato', 'Solicitud inválida.'); }
  const equipo = (await env.DB.prepare('SELECT lower(email) AS email FROM usuarios WHERE activo = 1').all()).results.map((x) => x.email);
  const to = (Array.isArray(d.to) ? d.to : [d.to]).map((x) => String(x || '').trim().toLowerCase()).filter(Boolean);
  if (!to.length || to.some((x) => equipo.indexOf(x) === -1)) return err(400, 'destinatarios', 'Los correos solo pueden ir a personas del equipo de Cenova.');
  const subject = String(d.subject || '').slice(0, 200), html = String(d.htmlBody || '').slice(0, 100000), text = String(d.body || '').slice(0, 50000);
  if (!subject || (!html && !text)) return err(400, 'formato', 'Falta el asunto o el mensaje.');
  try {
    const r = await enviarResend(env, { to, subject, html: html || undefined, text: text || undefined, replyTo: s.email });
    await auditar(env, s.usuario_id, 'correo', null, null, to.join(',') + ' · ' + subject, req);
    return json({ ok: true, id: r.id || null });
  } catch (e) {
    return err(e.codigo === 'no_configurado' ? 503 : 502, e.codigo === 'no_configurado' ? 'no_configurado' : 'proveedor', e.codigo === 'no_configurado' ? 'El envío de correos aún no está configurado.' : 'El servicio de correo no respondió.');
  }
}
function extraerJson(t) {
  t = String(t || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch (e) { /* sigue */ }
  const i = t.indexOf('{'), j = t.lastIndexOf('}');
  if (i !== -1 && j > i) { try { return JSON.parse(t.slice(i, j + 1)); } catch (e) { /* sigue */ } }
  return null;
}
async function leer(req, env, s) {
  if (!env.ANTHROPIC_API_KEY) return err(503, 'no_configurado', 'La lectura con IA aún no está configurada.');
  let d; try { d = await req.json(); } catch (e) { return err(400, 'formato', 'Solicitud inválida.'); }
  const prompt = String(d.prompt || '');
  if (!prompt || prompt.length > 80000) return err(400, 'formato', 'Documento vacío o demasiado largo.');
  const imgs = Array.isArray(d.images) ? d.images.slice(0, 4) : [];
  const tipos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  for (const im of imgs) if (!im || tipos.indexOf(im.mediaType) === -1 || typeof im.data !== 'string' || im.data.length > 7000000) return err(400, 'imagen', 'Imagen no válida (JPG, PNG o WEBP de hasta ~5 MB).');
  const content = imgs.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.mediaType, data: im.data } }));
  content.push({ type: 'text', text: prompt + '\n\nResponde únicamente con el objeto JSON, sin texto adicional.' });
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env.MODELO_IA || 'claude-sonnet-5', max_tokens: 4096, messages: [{ role: 'user', content }] })
  });
  if (r.status === 429) return err(429, 'rate_limited', 'Límite de uso de la IA alcanzado; intenta en unos minutos.');
  if (!r.ok) return err(502, 'proveedor', 'El servicio de IA no respondió correctamente.');
  const out = await r.json();
  const resultado = extraerJson((out.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n'));
  if (!resultado) return err(502, 'formato_ia', 'La respuesta de la IA no vino en el formato esperado.');
  await auditar(env, s.usuario_id, 'lectura_ia', null, null, null, req);
  return json({ ok: true, resultado });
}

/* ======================= resumen diario ======================= */
function hoyBogota() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
function sumarDias(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function fechaLarga(iso) { return new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso + 'T12:00:00Z')); }
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
async function resumenDiario(env) {
  const hoy = hoyBogota(), en3 = sumarDias(hoy, 3);
  const eventos = (await env.DB.prepare("SELECT data FROM docs WHERE col = 'eventos'").all()).results.map((r) => JSON.parse(r.data))
    .filter((e) => e.fecha && e.estado !== 'cancelado' && e.estado !== 'cumplido');
  const usuarios = (await env.DB.prepare('SELECT id, nombre, email, admin FROM usuarios WHERE activo = 1').all()).results;
  let enviados = 0;
  for (const u of usuarios) {
    const mios = eventos.filter((e) => u.admin || e.creadoPorId === u.id || (Array.isArray(e.apoyo) && e.apoyo.indexOf(u.nombre) !== -1));
    const hoyL = mios.filter((e) => e.fecha === hoy).sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || '')));
    const venc = mios.filter((e) => e.auto && e.fecha < hoy && e.tipo !== 'instalacion').sort((a, b) => a.fecha.localeCompare(b.fecha));
    const prox = mios.filter((e) => e.fecha > hoy && e.fecha <= en3).sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (!hoyL.length && !venc.length && !prox.length) continue;
    const dias = (e) => Math.round((new Date(hoy) - new Date(e.fecha)) / 86400000);
    const fila = (e, extra) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eef1f5;"><strong>${esc(e.titulo || 'Evento')}</strong>${e.hora ? ' · ' + esc(e.hora) : ''}${extra || ''}<br><span style="color:#5b6b80;font-size:13px;">${esc(e.cliente || '')}${e.motivo ? ' — ' + esc(e.motivo) : ''}</span></td></tr>`;
    const bloque = (t, l, f) => l.length ? `<h3 style="color:#173a73;margin:22px 0 6px;font-size:15px;">${t} (${l.length})</h3><table style="width:100%;border-collapse:collapse;font-size:14px;">${l.map(f).join('')}</table>` : '';
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#16233a;max-width:640px;"><p>Hola ${esc(u.nombre.split(' ')[0])}, esta es tu agenda de Cenova para hoy, ${esc(fechaLarga(hoy))}.</p>
      ${bloque('Hoy', hoyL, (e) => fila(e))}${bloque('Vencidos sin atender', venc, (e) => fila(e, ` <span style="color:#b93b3b;font-weight:bold;">· vencido hace ${dias(e)} día(s)</span>`))}${bloque('Próximos 3 días', prox, (e) => fila(e, ` · ${esc(fechaLarga(e.fecha))}`))}
      <p style="margin-top:22px;"><a href="${esc(env.INTRANET_URL)}" style="color:#2456a6;">Abrir la Intranet Cenova</a></p></div>`;
    const text = [`Agenda Cenova — ${fechaLarga(hoy)}`, ...hoyL.map((e) => `HOY: ${e.titulo}${e.hora ? ' ' + e.hora : ''}`), ...venc.map((e) => `VENCIDO (${dias(e)} d): ${e.titulo}`), ...prox.map((e) => `${e.fecha}: ${e.titulo}`), '', env.INTRANET_URL].join('\n');
    try {
      await enviarResend(env, { to: [u.email], subject: `Agenda Cenova — ${fechaLarga(hoy)}: ${hoyL.length} para hoy${venc.length ? `, ${venc.length} vencidos` : ''}`, html, text });
      enviados++;
    } catch (e) { console.log('resumen: no se pudo enviar a', u.id, e.message); }
  }
  await auditar(env, 'sistema', 'resumen_diario', null, null, enviados + ' correo(s)');
  return enviados;
}

/* ======================= enrutador ======================= */
async function pagina(env, req, ruta) {
  const url = new URL(req.url); url.pathname = ruta;
  const r = await env.ASSETS.fetch(new Request(url.toString(), { headers: req.headers }));
  const h = seguridad(new Headers(r.headers));
  if (ruta.endsWith('.html')) h.set('cache-control', 'no-store');
  return new Response(r.body, { status: r.status, headers: h });
}
const redir = (to) => new Response(null, { status: 302, headers: seguridad(new Headers({ location: to, 'cache-control': 'no-store' })) });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname;
    try {
      /* --- API --- */
      if (p.startsWith('/api/')) {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          // Protección CSRF: el navegador solo permite este encabezado desde la propia página.
          if (req.headers.get('x-cenova') !== '1') return err(403, 'origen', 'Solicitud no permitida.');
        }
        if (p === '/api/login' && req.method === 'POST') return await login(req, env);
        if (p === '/api/logout' && req.method === 'POST') {
          const t = leerCookie(req, COOKIE);
          if (t) await env.DB.prepare('DELETE FROM sesiones WHERE token_hash = ?').bind(await sha256(t)).run();
          return json({ ok: true }, 200, { 'Set-Cookie': cookieBorrar() });
        }
        if (p === '/api/clave' && req.method === 'POST') return await cambiarClave(req, env);

        const activo = req.headers.get('x-actividad') === '1';
        const s = await sesionDe(req, env, { contarActividad: activo });
        if (!s) return err(401, 'sesion', 'Tu sesión venció. Ingresa de nuevo.');
        if (p === '/api/me') return json({ id: s.usuario_id, nombre: s.nombre, email: s.email, admin: !!s.admin, tema: s.tema, debeCambiar: !!s.debe_cambiar, inactividadMin: Number(env.INACTIVIDAD_MIN) || 15 });
        if (s.debe_cambiar) return err(403, 'cambio_clave', 'Debes cambiar tu contraseña antes de continuar.');
        if (p === '/api/tema' && req.method === 'POST') {
          const { tema } = await req.json().catch(() => ({}));
          if (TEMAS.indexOf(tema) === -1) return err(400, 'tema', 'Tema inválido.');
          await env.DB.prepare('UPDATE usuarios SET tema = ? WHERE id = ?').bind(tema, s.usuario_id).run();
          return json({ ok: true });
        }
        if (p === '/api/sync' && req.method === 'GET') return await sync(req, env, s);
        if (p === '/api/importar' && req.method === 'POST') return await importar(req, env, s);
        if (p === '/api/correo' && req.method === 'POST') return await correo(req, env, s);
        if (p === '/api/leer' && req.method === 'POST') return await leer(req, env, s);
        const m = p.match(/^\/api\/docs\/([A-Za-z]+)(?:\/([^/]+))?$/);
        if (m) {
          const col = m[1], id = m[2] ? decodeURIComponent(m[2]) : null;
          if (req.method === 'POST' && !id) return await escribir(req, env, s, col, null, 'PUT');
          if (id && (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) return await escribir(req, env, s, col, id, req.method);
        }
        return err(404, 'ruta', 'No encontrado.');
      }

      /* --- Páginas --- */
      if (p === '/login' || p === '/login.html') return await pagina(env, req, '/login.html');
      if (p === '/login.js' || p === '/favicon.ico') return await pagina(env, req, p);
      // Todo lo demás (el panel y sus archivos) exige una sesión válida.
      const s = await sesionDe(req, env, { exigirPestana: false });
      if (!s || s.debe_cambiar) return redir('/login');
      if (p === '/' || p === '/index.html') return await pagina(env, req, '/index.html');
      if (p === '/app.js') return await pagina(env, req, '/app.js');
      return redir('/');
    } catch (e) {
      console.log('Error', p, e && e.stack || e);
      return err(500, 'servidor', 'Error interno del servidor.');
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(resumenDiario(env));
  }
};
