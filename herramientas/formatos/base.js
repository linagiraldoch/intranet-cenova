/* Base común de los formatos de Cenova en Word: mismo diseño de la cotización
   (logo, cinta azul en la esquina, caja de datos del documento, barra de título y pie). */
const fs = require('fs');
const path = require('path');
const d = require('docx');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, AlignmentType, VerticalAlign, Header, Footer, PageNumber, TabStopType,
  HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType, LevelFormat, TableLayoutType
} = d;

const DIR = __dirname;
const NAVY = '173A73', BLUE = '2456A6', MUTED = '5B6B80', TEXT = '16233A', BODY = '3A4A60';
const ALT = 'EEF4FC', ROW2 = 'F6F9FD', LINE = 'E4E9F1', BOXLINE = 'CFE0F5', BAR = 'EAF1FB', FILL = 'FFF7D6';
const FONT = 'Arial';
const PAGE_W = 12240, MARGIN = 1080, CONTENT = PAGE_W - 2 * MARGIN; // carta, márgenes 0,75"
const EMPRESA = { nombre: 'Cenova S.A.S.', nit: '902.114.180-1', ciudad: 'Cartagena, Bolívar', web: 'https://cenovasas.com', email: 'gerencia@cenovasas.com', tel: '+57 320 717 4937', rep: 'Lina Giraldo', repCargo: 'Gerente General y Representante Legal' };

const logo = fs.readFileSync(path.join(DIR, 'logo.png'));
const cinta = fs.readFileSync(path.join(DIR, 'cinta.png'));

const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
const cellNoBorders = { top: NONE, bottom: NONE, left: NONE, right: NONE };
const thin = (c) => ({ style: BorderStyle.SINGLE, size: 4, color: c });

function run(text, o = {}) { return new TextRun({ text, font: FONT, size: o.size || 20, bold: o.bold, italics: o.italics, color: o.color || TEXT, characterSpacing: o.spacing, allCaps: o.caps, shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined }); }
/* Texto con [campos por llenar] resaltados en amarillo claro */
function runs(text, o = {}) {
  const out = []; const re = /\[[^\]]+\]/g; let i = 0, m;
  while ((m = re.exec(text))) { if (m.index > i) out.push(run(text.slice(i, m.index), o)); out.push(run(m[0], Object.assign({}, o, { fill: FILL, color: o.color || TEXT }))); i = m.index + m[0].length; }
  if (i < text.length) out.push(run(text.slice(i), o));
  return out;
}
function p(text, o = {}) {
  return new Paragraph({ children: Array.isArray(text) ? text : runs(text, o), alignment: o.align || AlignmentType.JUSTIFIED, spacing: { before: o.before || 0, after: o.after == null ? 120 : o.after, line: o.line || 288 }, indent: o.indent, keepNext: o.keepNext, numbering: o.numbering });
}
function vacio(after = 60) { return new Paragraph({ children: [], spacing: { after } }); }
/* Título de sección como en la cotización: mayúsculas, azul oscuro, negrita */
function h(text, o = {}) {
  return new Paragraph({ children: [run(text.toUpperCase(), { size: 19, bold: true, color: NAVY, spacing: 10 })], spacing: { before: o.before == null ? 240 : o.before, after: 100 }, keepNext: true,
    border: o.linea === false ? undefined : { bottom: { style: BorderStyle.SINGLE, size: 6, color: BOXLINE, space: 3 } } });
}
/* Cláusula numerada: "PRIMERA. Objeto." + texto */
function clausula(nombre, titulo, texto) {
  const partes = Array.isArray(texto) ? texto : [texto];
  return partes.map((t, i) => p(i === 0 ? [run(nombre.toUpperCase() + '. ' + titulo + '. ', { bold: true, color: NAVY, size: 20 })].concat(runs(t, { size: 20, color: BODY })) : runs(t, { size: 20, color: BODY }), { after: 100 }));
}
function vineta(text) { return new Paragraph({ children: runs(text, { size: 20, color: BODY }), numbering: { reference: 'vinetas', level: 0 }, spacing: { after: 60, line: 276 } }); }
function numerado(text, ref = 'numeros') { return new Paragraph({ children: runs(text, { size: 20, color: BODY }), numbering: { reference: ref, level: 0 }, spacing: { after: 60, line: 276 } }); }

function cell(children, o = {}) {
  return new TableCell({
    children: (Array.isArray(children) ? children : [children]).map((c) => typeof c === 'string' ? new Paragraph({ children: runs(c, { size: o.size || 18, bold: o.bold, color: o.color || TEXT }), alignment: o.align || AlignmentType.LEFT, spacing: { after: 0, line: 252 } }) : c),
    width: { size: o.w, type: WidthType.DXA }, columnSpan: o.span,
    shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
    margins: { top: o.pad == null ? 70 : o.pad, bottom: o.pad == null ? 70 : o.pad, left: 120, right: 120 },
    verticalAlign: o.valign || VerticalAlign.CENTER,
    borders: o.borders || { top: thin(LINE), bottom: thin(LINE), left: NONE, right: NONE }
  });
}
/* Tabla con encabezado azul oscuro y filas alternadas, como la de ítems de la cotización */
function tabla(cols, filas, o = {}) {
  const total = cols.reduce((s, c) => s + c.w, 0);
  const head = new TableRow({ tableHeader: true, children: cols.map((c) => cell(c.t.toUpperCase(), { w: c.w, fill: NAVY, color: 'FFFFFF', bold: true, size: 15, align: c.align })) });
  const rows = filas.map((f, i) => new TableRow({ children: f.map((v, j) => cell(v, { w: cols[j].w, fill: i % 2 ? ROW2 : undefined, align: cols[j].align, size: 18 })) }));
  if (o.total) rows.push(new TableRow({ children: [cell(o.total[0], { w: total - cols[cols.length - 1].w, span: cols.length - 1, fill: NAVY, color: 'FFFFFF', bold: true, align: AlignmentType.RIGHT }), cell(o.total[1], { w: cols[cols.length - 1].w, fill: NAVY, color: 'FFFFFF', bold: true, align: AlignmentType.RIGHT })] }));
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: cols.map((c) => c.w), rows: [head].concat(rows), layout: TableLayoutType.FIXED });
}
function filasVacias(n, cols, primera) { return Array.from({ length: n }, (_, i) => cols.map((c, j) => j === 0 && primera ? String(i + 1) : '')); }
/* Bloque de datos en dos columnas (Datos del cliente / Datos del emisor) */
function dosColumnas(t1, campos1, t2, campos2) {
  const W = CONTENT / 2;
  const col = (t, campos) => [
    new Paragraph({ children: [run(t.toUpperCase(), { size: 16, bold: true, color: NAVY, spacing: 10 })], spacing: { after: 80 } }),
    ...campos.map(([k, v]) => new Paragraph({ children: [run(k + ':', { size: 18, color: MUTED }), new TextRun({ text: '\t', font: FONT })].concat(runs(v, { size: 18, bold: k === 'Empresa' || k === 'Cliente' || k === 'Nombre' })),
      tabStops: [{ type: TabStopType.LEFT, position: 1500 }], spacing: { after: 40 } }))
  ];
  return new Table({ width: { size: CONTENT, type: WidthType.DXA }, columnWidths: [W, W], borders: noBorders, layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [cell(col(t1, campos1), { w: W, borders: cellNoBorders, valign: VerticalAlign.TOP, pad: 0 }), cell(col(t2, campos2), { w: W, borders: cellNoBorders, valign: VerticalAlign.TOP, pad: 0 })] })] });
}
function emisor(extra = []) { return [['Empresa', EMPRESA.nombre], ['NIT', EMPRESA.nit], ['Representante', EMPRESA.rep], ['Dirección', EMPRESA.ciudad], ['Teléfono', EMPRESA.tel], ['Email', EMPRESA.email]].concat(extra); }
/* Campos sueltos en tabla de 2 o 4 columnas: etiqueta gris / valor */
function campos(pares, cols = 2) {
  const lw = cols === 2 ? 2600 : 1700, vw = (CONTENT - lw * (cols / 2)) / (cols / 2);
  const widths = []; for (let i = 0; i < cols / 2; i++) widths.push(lw, vw);
  const rows = [];
  for (let i = 0; i < pares.length; i += cols / 2) {
    const cs = [];
    for (let j = 0; j < cols / 2; j++) {
      const par = pares[i + j] || ['', ''];
      cs.push(cell(par[0], { w: lw, fill: ALT, color: MUTED, size: 17, borders: { top: thin(BOXLINE), bottom: thin(BOXLINE), left: thin(BOXLINE), right: NONE } }));
      cs.push(cell(par[1], { w: vw, size: 18, borders: { top: thin(BOXLINE), bottom: thin(BOXLINE), left: NONE, right: thin(BOXLINE) } }));
    }
    rows.push(new TableRow({ children: cs }));
  }
  return new Table({ width: { size: CONTENT, type: WidthType.DXA }, columnWidths: widths, rows, layout: TableLayoutType.FIXED });
}
/* Casillas de verificación: ☐ opción */
function casillas(opciones, porFila = 3) {
  const w = Math.floor(CONTENT / porFila), rows = [];
  for (let i = 0; i < opciones.length; i += porFila) {
    rows.push(new TableRow({ children: Array.from({ length: porFila }, (_, j) => cell(opciones[i + j] ? [new Paragraph({ children: [run('☐  ', { size: 20, color: NAVY })].concat(runs(opciones[i + j], { size: 18 })), spacing: { after: 0 } })] : '', { w, borders: cellNoBorders, pad: 40 })) }));
  }
  return new Table({ width: { size: w * porFila, type: WidthType.DXA }, columnWidths: Array(porFila).fill(w), rows, borders: noBorders, layout: TableLayoutType.FIXED });
}
/* Recuadro para escribir (líneas) */
function recuadro(alto = 1200, texto = '') {
  return new Table({ width: { size: CONTENT, type: WidthType.DXA }, columnWidths: [CONTENT], layout: TableLayoutType.FIXED,
    rows: [new TableRow({ height: { value: alto, rule: 'atLeast' }, children: [cell(texto ? [p(texto, { size: 18, color: MUTED, after: 0, align: AlignmentType.LEFT })] : '', { w: CONTENT, valign: VerticalAlign.TOP, borders: { top: thin(BOXLINE), bottom: thin(BOXLINE), left: thin(BOXLINE), right: thin(BOXLINE) } })] })] });
}
/* Firmas: varias columnas con línea, nombre, cargo y documento */
function firmas(lista) {
  const w = Math.floor(CONTENT / lista.length);
  const col = (f) => [
    new Paragraph({ children: [], spacing: { before: 650, after: 0 } }),
    new Paragraph({ children: [], border: { top: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 1 } }, spacing: { after: 40 }, indent: { left: 200, right: 200 } }),
    new Paragraph({ children: runs(f[0], { size: 18, bold: true }), alignment: AlignmentType.CENTER, spacing: { after: 20 } }),
    ...f.slice(1).map((x) => new Paragraph({ children: runs(x, { size: 16, color: MUTED }), alignment: AlignmentType.CENTER, spacing: { after: 20 } }))
  ];
  return new Table({ width: { size: w * lista.length, type: WidthType.DXA }, columnWidths: Array(lista.length).fill(w), borders: noBorders, layout: TableLayoutType.FIXED,
    rows: [new TableRow({ cantSplit: true, children: lista.map((f) => cell(col(f), { w, borders: cellNoBorders, valign: VerticalAlign.TOP })) })] });
}
function firmaCenova() { return ['[Nombre]', 'Por Cenova S.A.S. · NIT ' + EMPRESA.nit, 'Cargo: [Cargo]']; }

/* Encabezado de página: logo + nombre a la izquierda y la cinta flotando en la esquina */
function encabezado() {
  const marca = new Table({ width: { size: CONTENT, type: WidthType.DXA }, columnWidths: [760, CONTENT - 760], borders: noBorders, layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [
      cell([new Paragraph({ children: [new ImageRun({ type: 'png', data: logo, transformation: { width: 44, height: 34 } })], spacing: { after: 0 } })], { w: 760, borders: cellNoBorders, pad: 0 }),
      cell([new Paragraph({ children: [run('CENOVA', { size: 30, bold: true, color: NAVY, spacing: 8 })], spacing: { after: 0, line: 240 } }),
            new Paragraph({ children: [run('TECNOLOGÍA QUE TRANSFORMA', { size: 13, color: MUTED, spacing: 30 })], spacing: { after: 0 } })], { w: CONTENT - 760, borders: cellNoBorders, pad: 0 })
    ] })] });
  const cintaP = new Paragraph({ children: [new ImageRun({ type: 'png', data: cinta, transformation: { width: 190, height: 130 },
    floating: { horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: (8.5 * 914400) - 190 * 9525 }, verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
      wrap: { type: TextWrappingType.NONE }, behindDocument: true, allowOverlap: true } })], spacing: { after: 0 } });
  return new Header({ children: [cintaP, marca, new Paragraph({ children: [], spacing: { after: 120 } })] });
}
/* Pie: correo, web y teléfono como en la cotización + número de página */
function pie(codigo) {
  const dot = (c) => run(' ' + c + ' ', { size: 14, bold: true, color: 'FFFFFF', fill: BLUE });
  return new Footer({ children: [
    new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 6 } }, spacing: { after: 40 },
      children: [dot('@'), run('  ' + EMPRESA.email + '      ', { size: 16, bold: true, color: NAVY }), dot('>'), run('  ' + EMPRESA.web + '      ', { size: 16, bold: true, color: NAVY }), dot('T'), run('  ' + EMPRESA.tel, { size: 16, bold: true, color: NAVY })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
      children: [run(EMPRESA.nombre + ' · NIT ' + EMPRESA.nit + ' · ' + EMPRESA.ciudad + ' · ' + codigo + ' · Página ', { size: 14, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 14, color: MUTED }), run(' de ', { size: 14, color: MUTED }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 14, color: MUTED })] })
  ] });
}
/* Título del documento a la izquierda y caja de datos (N°, fecha…) a la derecha, + barra de subtítulo */
function titulo(tit, info, subtitulo) {
  const BOX = 3400, L = CONTENT - BOX;
  const filasInfo = info.map(([k, v], i) => new TableRow({ children: [
    cell(k, { w: 1500, fill: i % 2 === 0 ? ALT : undefined, color: MUTED, size: 16, borders: cellNoBorders, pad: 50 }),
    cell(v, { w: BOX - 1500, fill: i % 2 === 0 ? ALT : undefined, color: NAVY, bold: true, size: 16, align: AlignmentType.RIGHT, borders: cellNoBorders, pad: 50 })] }));
  const caja = new Table({ width: { size: BOX, type: WidthType.DXA }, columnWidths: [1500, BOX - 1500], rows: filasInfo, layout: TableLayoutType.FIXED,
    borders: { top: thin(BOXLINE), bottom: thin(BOXLINE), left: thin(BOXLINE), right: thin(BOXLINE), insideHorizontal: NONE, insideVertical: NONE } });
  const t = new Table({ width: { size: CONTENT, type: WidthType.DXA }, columnWidths: [L, BOX], borders: noBorders, layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [
      cell([new Paragraph({ children: [run(tit, { size: 38, bold: true, color: NAVY })], spacing: { after: 0, line: 300 } })], { w: L, borders: cellNoBorders, valign: VerticalAlign.BOTTOM, pad: 0 }),
      cell([caja], { w: BOX, borders: cellNoBorders, pad: 0 })] })] });
  const out = [t];
  if (subtitulo) out.push(new Paragraph({ children: runs(subtitulo, { size: 21, bold: true, color: NAVY }), shading: { type: ShadingType.CLEAR, color: 'auto', fill: BAR },
    spacing: { before: 200, after: 200 }, indent: { left: 130, right: 130 }, border: { top: { style: BorderStyle.SINGLE, size: 18, color: BAR, space: 4 }, bottom: { style: BorderStyle.SINGLE, size: 18, color: BAR, space: 4 }, left: { style: BorderStyle.SINGLE, size: 18, color: BAR, space: 6 }, right: { style: BorderStyle.SINGLE, size: 18, color: BAR, space: 6 } } }));
  else out.push(vacio(160));
  return out;
}
function nota(text) { return p(text, { size: 16, color: MUTED, italics: true, after: 80 }); }

async function guardar(nombre, codigo, tituloDoc, hijos) {
  const doc = new Document({
    creator: 'Cenova S.A.S.', title: tituloDoc, description: 'Formato ' + codigo + ' de Cenova S.A.S.',
    styles: { default: { document: { run: { font: FONT, size: 20, color: TEXT } } } },
    numbering: { config: [
      { reference: 'vinetas', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } }, run: { color: BLUE } } }] },
      { reference: 'numeros', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 300 } } } }] },
      { reference: 'letras', levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: '%1)', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 300 } } } }] }
    ] },
    sections: [{ properties: { page: { size: { width: PAGE_W, height: 15840 }, margin: { top: 1500, bottom: 1300, left: MARGIN, right: MARGIN, header: 500, footer: 450 } } },
      headers: { default: encabezado() }, footers: { default: pie(codigo) }, children: hijos }]
  });
  const buf = await Packer.toBuffer(doc);
  fs.mkdirSync(path.join(DIR, 'out'), { recursive: true });
  fs.writeFileSync(path.join(DIR, 'out', nombre), buf); // luego se copian a web/formatos/
  return nombre;
}

module.exports = { d, run, runs, p, vacio, h, clausula, vineta, numerado, cell, tabla, filasVacias, dosColumnas, emisor, campos, casillas, recuadro, firmas, firmaCenova, titulo, nota, guardar, EMPRESA, CONTENT, NAVY, MUTED, ALT, BODY, AlignmentType };
