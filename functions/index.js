/*
 * Funciones del servidor de la Intranet Cenova.
 * Aquí viven las claves secretas (Anthropic y Gmail): nunca llegan al navegador.
 *
 *  enviarCorreo   → correos de "Solicitar apoyo" (solo a correos del equipo)
 *  leerDocumento  → lectura con IA de órdenes de compra y cotizaciones de proveedor
 *  resumenDiario  → correo diario 6:45 a. m. con la agenda de cada persona
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret, defineString } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');
const MODELO_IA = defineString('MODELO_IA', { default: 'claude-sonnet-5' });
const INTRANET_URL = defineString('INTRANET_URL', { default: '' });

const REMITENTE = 'gerencia@cenovasas.com';
const EQUIPO = {
  'gerencia@cenovasas.com': { nombre: 'Lina Giraldo', admin: true },
  'aberrocal@cenovasas.com': { nombre: 'Ángel Berrocal' },
  'jcantillo@cenovasas.com': { nombre: 'Jorge Cantillo' }
};
const EMULADOR = process.env.FUNCTIONS_EMULATOR === 'true';

function exigirEquipo(request) {
  const email = request.auth && request.auth.token && request.auth.token.email;
  if (!email || !EQUIPO[String(email).toLowerCase()]) {
    throw new HttpsError('permission-denied', 'Solo el equipo de Cenova puede usar esta función.');
  }
  return String(email).toLowerCase();
}

function transportador() {
  if (EMULADOR) return nodemailer.createTransport({ jsonTransport: true });
  return nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: REMITENTE, pass: GMAIL_APP_PASSWORD.value() }
  });
}

/* ------------------------------------------------------------------ */
exports.enviarCorreo = onCall({ secrets: [GMAIL_APP_PASSWORD], maxInstances: 3 }, async (request) => {
  const quien = exigirEquipo(request);
  const d = request.data || {};
  const to = (Array.isArray(d.to) ? d.to : [d.to]).map((x) => String(x || '').trim().toLowerCase()).filter(Boolean);
  // Solo se puede escribir a personas del equipo: la intranet no sirve para enviar correo a terceros.
  if (!to.length || to.some((x) => !EQUIPO[x])) {
    throw new HttpsError('invalid-argument', 'Los correos solo pueden ir a personas del equipo de Cenova.');
  }
  const subject = String(d.subject || '').slice(0, 200);
  const html = String(d.htmlBody || '').slice(0, 100000);
  const text = String(d.body || '').slice(0, 50000);
  if (!subject || (!html && !text)) throw new HttpsError('invalid-argument', 'Falta el asunto o el mensaje.');
  if (!EMULADOR && !GMAIL_APP_PASSWORD.value()) throw new HttpsError('failed-precondition', 'Correo no configurado.');
  const info = await transportador().sendMail({
    from: `Intranet Cenova <${REMITENTE}>`, replyTo: quien, to: to.join(', '), subject, html: html || undefined, text: text || undefined
  });
  logger.info('Correo enviado', { de: quien, a: to, asunto: subject });
  return { id: info.messageId || null };
});

/* ------------------------------------------------------------------ */
function extraerJson(texto) {
  const t = String(texto || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch (e) { /* sigue */ }
  const i = t.indexOf('{'), j = t.lastIndexOf('}');
  if (i !== -1 && j > i) { try { return JSON.parse(t.slice(i, j + 1)); } catch (e) { /* sigue */ } }
  throw new HttpsError('internal', 'La respuesta de la IA no vino en el formato esperado.');
}

exports.leerDocumento = onCall({ secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 120, memory: '512MiB', maxInstances: 3 }, async (request) => {
  exigirEquipo(request);
  const d = request.data || {};
  const prompt = String(d.prompt || '');
  if (!prompt || prompt.length > 80000) throw new HttpsError('invalid-argument', 'Documento vacío o demasiado largo.');
  const imgs = Array.isArray(d.images) ? d.images.slice(0, 4) : [];
  const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  for (const im of imgs) {
    if (!im || permitidos.indexOf(im.mediaType) === -1 || typeof im.data !== 'string' || im.data.length > 7000000) {
      throw new HttpsError('invalid-argument', 'Imagen no válida (usa JPG, PNG o WEBP de hasta ~5 MB).');
    }
  }
  if (EMULADOR && !process.env.ANTHROPIC_API_KEY) {
    return { resultado: { _emulador: true } };
  }
  const key = ANTHROPIC_API_KEY.value();
  if (!key) throw new HttpsError('failed-precondition', 'Lectura con IA no configurada.');
  const content = imgs.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.mediaType, data: im.data } }));
  content.push({ type: 'text', text: prompt + '\n\nResponde únicamente con el objeto JSON, sin texto adicional.' });
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODELO_IA.value(), max_tokens: 4096, messages: [{ role: 'user', content }] })
  });
  if (resp.status === 429) throw new HttpsError('resource-exhausted', 'Límite de uso de la IA alcanzado; intenta en unos minutos.');
  if (!resp.ok) {
    logger.error('Error Anthropic', { status: resp.status, body: (await resp.text()).slice(0, 500) });
    throw new HttpsError('unavailable', 'El servicio de IA no respondió correctamente.');
  }
  const json = await resp.json();
  const texto = (json.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  return { resultado: extraerJson(texto) };
});

/* ------------------------------------------------------------------ */
function hoyBogota() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function sumarDias(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function fechaLarga(iso) {
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso + 'T12:00:00Z'));
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

async function armarYEnviarResumen() {
  const db = admin.firestore();
  const hoy = hoyBogota(), en3 = sumarDias(hoy, 3);
  const [evSnap, usSnap] = await Promise.all([db.collection('eventos').get(), db.collection('usuarios').get()]);
  const eventos = evSnap.docs.map((d) => Object.assign({ id: d.id }, d.data())).filter((e) => e.fecha && e.estado !== 'cancelado' && e.estado !== 'cumplido');
  const uidPorEmail = {};
  usSnap.docs.forEach((d) => { const u = d.data(); if (u.email) uidPorEmail[String(u.email).toLowerCase()] = d.id; });
  const url = INTRANET_URL.value();
  const tx = transportador();
  let enviados = 0;

  for (const email of Object.keys(EQUIPO)) {
    const p = EQUIPO[email], uid = uidPorEmail[email];
    const mios = eventos.filter((e) => p.admin || (uid && e.creadoPorId === uid) || (Array.isArray(e.apoyo) && e.apoyo.indexOf(p.nombre) !== -1));
    const hoyL = mios.filter((e) => e.fecha === hoy).sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || '')));
    const venc = mios.filter((e) => e.auto && e.fecha < hoy && e.tipo !== 'instalacion').sort((a, b) => a.fecha.localeCompare(b.fecha));
    const prox = mios.filter((e) => e.fecha > hoy && e.fecha <= en3).sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (!hoyL.length && !venc.length && !prox.length) continue;
    const fila = (e, extra) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eef1f5;"><strong>${esc(e.titulo || 'Evento')}</strong>${e.hora ? ' · ' + esc(e.hora) : ''}${extra || ''}<br><span style="color:#5b6b80;font-size:13px;">${esc(e.cliente || '')}${e.motivo ? ' — ' + esc(e.motivo) : ''}</span></td></tr>`;
    const bloque = (titulo, lista, fn) => lista.length ? `<h3 style="color:#173a73;margin:22px 0 6px;font-size:15px;">${titulo} (${lista.length})</h3><table style="width:100%;border-collapse:collapse;font-size:14px;">${lista.map(fn).join('')}</table>` : '';
    const diasVenc = (e) => Math.round((new Date(hoy) - new Date(e.fecha)) / 86400000);
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#16233a;max-width:640px;">
      <p>Hola ${esc(p.nombre.split(' ')[0])}, esta es tu agenda de Cenova para hoy, ${esc(fechaLarga(hoy))}.</p>
      ${bloque('Hoy', hoyL, (e) => fila(e))}
      ${bloque('Vencidos sin atender', venc, (e) => fila(e, ` <span style="color:#b93b3b;font-weight:bold;">· vencido hace ${diasVenc(e)} día(s)</span>`))}
      ${bloque('Próximos 3 días', prox, (e) => fila(e, ` · ${esc(fechaLarga(e.fecha))}`))}
      ${url ? `<p style="margin-top:22px;"><a href="${esc(url)}" style="color:#2456a6;">Abrir la Intranet Cenova</a></p>` : ''}
    </div>`;
    const texto = [
      `Agenda Cenova — ${fechaLarga(hoy)}`,
      ...hoyL.map((e) => `HOY: ${e.titulo}${e.hora ? ' ' + e.hora : ''} (${e.cliente || ''})`),
      ...venc.map((e) => `VENCIDO (${diasVenc(e)} d): ${e.titulo}`),
      ...prox.map((e) => `${e.fecha}: ${e.titulo}`),
      url ? `\n${url}` : ''
    ].join('\n');
    await tx.sendMail({
      from: `Intranet Cenova <${REMITENTE}>`, to: email,
      subject: `Agenda Cenova — ${fechaLarga(hoy)}: ${hoyL.length} para hoy${venc.length ? `, ${venc.length} vencidos` : ''}`,
      html, text: texto
    });
    enviados++;
  }
  logger.info('Resumen diario', { enviados });
  return enviados;
}

exports.resumenDiario = onSchedule({ schedule: '45 6 * * *', timeZone: 'America/Bogota', secrets: [GMAIL_APP_PASSWORD] }, async () => {
  await armarYEnviarResumen();
});
