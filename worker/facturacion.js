/*
 * Datos del cliente para facturar (2026-11-24).
 * Cualquiera del equipo crea clientes y los puede dejar incompletos; pero para anexar la factura de una orden
 * el cliente debe tener todos los datos, o un motivo escrito por cada dato que falte (p. ej. persona natural
 * sin RUT). La misma lógica está duplicada en web/index.html (cliFactFaltantes) para avisar antes de enviar.
 */
export const FACT_CAMPOS = [
  { k: 'tipoPersona', l: 'Tipo de persona (jurídica o natural)' },
  { k: 'nit', l: 'NIT o cédula' },
  { k: 'direccion', l: 'Dirección' },
  { k: 'ciudad', l: 'Ciudad' },
  { k: 'correoFact', l: 'Correo para la factura electrónica' },
  { k: 'rut', l: 'RUT' }
];

export const normNombre = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Devuelve las etiquetas de lo que falta (vacío = completo). Un dato faltante con motivo escrito cuenta como resuelto.
export function factFaltantes(cli, tieneRut) {
  const c = cli || {}, m = (c.factMotivos && typeof c.factMotivos === 'object') ? c.factMotivos : {};
  const out = [];
  for (const f of FACT_CAMPOS) {
    const val = f.k === 'rut' ? tieneRut : String(c[f.k] == null ? '' : c[f.k]).trim();
    if (val) continue;
    if (String(m[f.k] || '').trim().length >= 3) continue;
    out.push(f.l);
  }
  if (!String(c.nombre || '').trim()) out.unshift('Nombre o razón social');
  return out;
}

// Revisa el cliente de la orden antes de aceptar una factura. Devuelve un mensaje de error o null.
export async function revisarFacturaOrden(env, ordenId) {
  const fila = await env.DB.prepare("SELECT data FROM docs WHERE col = 'ordenesCompra' AND id = ?").bind(ordenId).first();
  if (!fila) return null;
  let o; try { o = JSON.parse(fila.data); } catch (e) { return null; }
  if (o && o.sinFactura && o.sinFactura.motivo) return null;
  const nom = normNombre(o && o.cliente);
  if (!nom) return null;
  const filas = await env.DB.prepare("SELECT id, data FROM docs WHERE col = 'clientes'").all();
  let cid = null, cli = null;
  for (const r of (filas.results || [])) {
    let d; try { d = JSON.parse(r.data); } catch (e) { continue; }
    if (normNombre(d.nombre) === nom) { cid = r.id; cli = d; break; }
  }
  if (!cli) return 'El cliente «' + (o.cliente || '') + '» no está registrado. Créalo en Clientes y completa sus datos para facturar.';
  const rut = await env.DB.prepare("SELECT 1 AS x FROM docs WHERE col = 'soportes' AND json_extract(data, '$.ref') = ? AND json_extract(data, '$.clase') = 'rut' LIMIT 1").bind('cli:' + cid).first();
  const falta = factFaltantes(cli, !!rut);
  if (!falta.length) return null;
  return 'Antes de facturar, completa los datos de «' + (cli.nombre || o.cliente) + '» (o escribe el motivo de cada uno que no aplique): ' + falta.join(', ') + '.';
}
