/* Gobierno interno de Cenova: acuerdos de vinculación de los socios que trabajan en la empresa
   (gerencia y coordinaciones), manual de desempeño y salida, evaluación y acta de entrega del cargo. */
const B = require('./base');
const { AlignmentType: A } = B;
const W = B.CONTENT; // 10080
const C = (t, w, align) => ({ t, w, align });
const R = A.RIGHT, CE = A.CENTER;
const info = (cod, et, num) => [['Código', cod], [et, num], ['Fecha', '[dd/mm/aaaa]'], ['Versión', '1']];
const lista = [];

/* Cláusulas comunes a los tres acuerdos */
function comunes(cargo, n0, lbl) {
  lbl = lbl || 'EL SOCIO GESTOR';
  const L = (x) => Array.isArray(x) ? x.map(L) : x.replace(/EL SOCIO GESTOR/g, lbl).replace(/ al socio gestor/g, lbl === 'LA SOCIA GESTORA' ? ' a la socia gestora' : ' al socio gestor').replace(/es dueño en parte/g, lbl === 'LA SOCIA GESTORA' ? 'es dueña en parte' : 'es dueño en parte').replace(/Si en el futuro la asamblea decide pagarle/g, 'Si en el futuro la asamblea decide pagarle');
  const ord = ['Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta', 'Sexta', 'Séptima', 'Octava', 'Novena', 'Décima', 'Undécima', 'Duodécima', 'Decimotercera', 'Decimocuarta'];
  let i = n0;
  const c = (t, x) => B.clausula(ord[i++], t, L(x));
  return [
    ...c('Naturaleza del vínculo', ['EL SOCIO GESTOR presta sus servicios en su calidad de accionista y por decisión propia, para el desarrollo de la empresa de la que es dueño en parte. Este acuerdo no crea un contrato de trabajo: no hay salario, subordinación laboral ni horario impuesto, y no se causan prestaciones sociales.', 'Si en el futuro la asamblea decide pagarle un salario u honorarios por el cargo, se firmará el contrato que corresponda y este acuerdo se ajustará por escrito.']),
    ...c('Remuneración y beneficio económico', ['El cargo no tiene remuneración fija. EL SOCIO GESTOR recibe el beneficio de su trabajo a través de las utilidades que la asamblea decrete, en proporción a sus acciones, según los estatutos.', 'Cenova le reembolsará los gastos en que incurra por cuenta de la empresa (transporte a obras, compras urgentes, trámites), siempre que estén aprobados según las políticas internas y tengan soporte. Los reembolsos se registran en Finanzas de la intranet.']),
    ...c('Seguridad social', 'Como no hay relación laboral, EL SOCIO GESTOR mantiene por su cuenta su afiliación a salud y pensión. Para las visitas y trabajos en obra debe estar afiliado a riesgos laborales (ARL) en el nivel de riesgo que corresponda, y presentar el soporte cuando la empresa lo pida.'),
    ...c('Desempeño', 'EL SOCIO GESTOR cumplirá las metas de su cargo que se fijen cada trimestre, según el Manual de desempeño y salida de socios gestores (formato CNV-FR-15), y participará en la evaluación trimestral (formato CNV-FR-16).'),
    ...c('Deberes como administrador', 'En lo que le corresponda como administrador, EL SOCIO GESTOR obrará de buena fe, con lealtad y con la diligencia de un buen hombre de negocios, en interés de la sociedad y de todos sus accionistas, conforme al artículo 23 de la Ley 222 de 1995.'),
    ...c('Retiro del cargo', ['EL SOCIO GESTOR puede renunciar al cargo con un aviso escrito de [30] días. La asamblea puede retirarlo del cargo por las causas y con el procedimiento del Manual (CNV-FR-15). En ambos casos hará la entrega formal del cargo con el acta CNV-FR-17.', 'Dejar el cargo no le quita su calidad de accionista ni sus acciones; la venta o transferencia de acciones se rige por los estatutos y por el acuerdo de accionistas, si existe.']),
    ...c('Vigencia', 'Este acuerdo rige desde su firma y por término indefinido, mientras EL SOCIO GESTOR ocupe el cargo. Cualquier cambio se hará por escrito y firmado por las partes.')
  ];
}
function partes(nombre, cargo) {
  return B.dosColumnas('La sociedad', B.emisor().slice(0, 4).concat([['Aprobado en', 'Acta de asamblea N° [número]']]),
    (nombre === 'Lina Giraldo' ? 'La socia gestora' : 'El socio gestor'), [['Nombre', nombre], ['C.C.', '[número] de [ciudad]'], ['Cargo', cargo], ['Acciones', '[número] ([porcentaje] %)'], ['Dirección', '[Dirección]'], ['Email', '[correo]']]);
}
function firmasAcuerdo(nombre, cargo, firmaSociedad, lbl) {
  return B.firmas([[firmaSociedad[0], firmaSociedad[1], 'C.C. [número]'], [nombre, (lbl || 'EL SOCIO GESTOR') + ' · ' + cargo, 'C.C. [número]']]);
}

/* 12 · Gerencia General y Representación Legal */
lista.push(['CNV-FR-12_Acuerdo-socio-gestor-Gerencia-General.docx', 'CNV-FR-12', 'Acuerdo de vinculación — Gerencia General y Representación Legal', [
  ...B.titulo('Acuerdo de vinculación de socio gestor', info('CNV-FR-12', 'Acuerdo N°', 'SG-001'), 'Gerente General y Representante Legal · Lina Giraldo'),
  partes('Lina Giraldo', 'Gerente General y Representante Legal'),
  B.p('Entre CENOVA S.A.S. (LA SOCIEDAD), representada en este acto por [nombre del socio que firma por la asamblea], autorizado por la asamblea de accionistas en el acta citada, y la accionista identificada arriba (LA SOCIA GESTORA), se celebra este acuerdo para dejar por escrito su cargo, sus funciones y las reglas internas que aplican, con las siguientes cláusulas:', { before: 160 }),
  ...B.clausula('Primera', 'Cargo', 'LA SOCIA GESTORA ejerce el cargo de Gerente General y Representante Legal de CENOVA S.A.S., según su designación por la asamblea de accionistas e inscripción en la Cámara de Comercio de Cartagena, con las facultades y límites que fijan los estatutos sociales y la Ley 1258 de 2008.'),
  ...B.clausula('Segunda', 'Funciones', ['Además de las que le den la ley y los estatutos, tiene a su cargo:']),
  B.numerado('Representar legalmente a la sociedad ante clientes, proveedores, bancos, la DIAN, la Cámara de Comercio y demás autoridades.'),
  B.numerado('Firmar contratos, cotizaciones, órdenes de compra y documentos de la empresa, dentro de los límites de los estatutos.'),
  B.numerado('Dirigir las finanzas: flujo de caja, pagos a proveedores y personal, cobro de cartera, cuentas bancarias y presupuesto.'),
  B.numerado('Velar por el cumplimiento de las obligaciones tributarias, contables, laborales y de seguridad social, con el apoyo del contador.'),
  B.numerado('Fijar los precios estándar y las metas de margen, y aprobar las cotizaciones que estén por debajo del margen mínimo.'),
  B.numerado('Administrar la intranet de Cenova (usuarios, permisos y Finanzas) y la información de la empresa.'),
  B.numerado('Coordinar a las direcciones técnica y comercial, convocar la reunión semanal de seguimiento y la evaluación trimestral.'),
  B.numerado('Presentar a la asamblea, al cierre de cada ejercicio, los estados financieros y el informe de gestión.'),
  ...B.clausula('Tercera', 'Dedicación', 'LA SOCIA GESTORA dedicará al cargo el tiempo que requiera la buena marcha de la empresa, sin perjuicio de sus otras actividades, y atenderá los asuntos urgentes de representación legal y pagos.'),
  ...comunes('Gerente General y Representante Legal', 3, 'LA SOCIA GESTORA'),
  B.p('Para constancia se firma en Cartagena, el [dd/mm/aaaa].', { before: 120 }),
  firmasAcuerdo('Lina Giraldo', 'Gerente General y Representante Legal', ['[Nombre]', 'Por LA SOCIEDAD (autorizado por la asamblea)'], 'LA SOCIA GESTORA'),
  B.nota('La representación legal nace de los estatutos y del nombramiento inscrito en la Cámara de Comercio; este acuerdo solo deja por escrito las funciones y las reglas internas.')
]]);

/* 13 y 14 · Coordinaciones */
const coord = [
  ['CNV-FR-13', 'CNV-FR-13_Acuerdo-socio-gestor-Coordinacion-Tecnica-y-de-Operaciones.docx', 'Ángel Berrocal', 'Coordinador Técnico y de Operaciones', 'SG-002', [
    'Hacer los levantamientos técnicos y definir la solución, los equipos y los materiales de cada proyecto.',
    'Revisar técnicamente las cotizaciones antes de enviarlas: cantidades, materiales, días de instalación y personal.',
    'Programar y dirigir las instalaciones: personal, herramientas, materiales, compras y seguridad en la obra (incluido trabajo en alturas).',
    'Registrar en la intranet el avance de cada orden: días reales, personal pagado, novedades, materiales dañados y salidas de bodega.',
    'Entregar las obras con pruebas, capacitación al cliente, acta de entrega (CNV-FR-02) e informe de proyecto (CNV-FR-01).',
    'Atender garantías, mantenimientos y soporte técnico.',
    'Mantener al día el inventario (conteos, stock mínimo y ubicación) y el contenido de los kits de instalación.',
    'Buscar y evaluar proveedores y técnicos de apoyo, y pedir sus cotizaciones.'
  ]],
  ['CNV-FR-14', 'CNV-FR-14_Acuerdo-socio-gestor-Coordinacion-Comercial-y-Administrativa.docx', 'Jorge Cantillo', 'Coordinador Comercial y Administrativo', 'SG-003', [
    'Buscar clientes nuevos y atender a los actuales: visitas, llamadas, correos y redes.',
    'Armar y enviar las cotizaciones a tiempo, con costos completos, y hacerles seguimiento hasta su aprobación o rechazo.',
    'Registrar en la intranet clientes, cotizaciones, órdenes de compra y su estado.',
    'Acordar con el cliente las condiciones comerciales: anticipo, plazos de pago y fecha de inicio.',
    'Hacer el seguimiento a la cartera y apoyar el cobro de los saldos pendientes.',
    'Apoyar la parte administrativa: documentos de clientes y proveedores, contratos, archivo y entrega contable mensual (CNV-FR-10).',
    'Cuidar la imagen de la marca: sitio web, tienda virtual, presentaciones y redes.',
    'Proponer cada trimestre metas comerciales y reportar su resultado.'
  ]]
];
coord.forEach(([cod, file, nombre, cargo, num, funciones]) => {
  lista.push([file, cod, 'Acuerdo de vinculación — ' + cargo, [
    ...B.titulo('Acuerdo de vinculación de socio gestor', info(cod, 'Acuerdo N°', num), cargo + ' · ' + nombre),
    partes(nombre, cargo),
    B.p('Entre CENOVA S.A.S. (LA SOCIEDAD), representada por su Gerente General y Representante Legal, y el accionista identificado arriba (EL SOCIO GESTOR), se celebra este acuerdo para dejar por escrito su cargo, sus funciones y las reglas internas que aplican, con las siguientes cláusulas:', { before: 160 }),
    ...B.clausula('Primera', 'Cargo', 'EL SOCIO GESTOR ejerce el cargo de ' + cargo + ' de CENOVA S.A.S., designado por la asamblea de accionistas. Reporta a la Gerencia General y trabaja en coordinación con la otra dirección.'),
    ...B.clausula('Segunda', 'Funciones', 'Tiene a su cargo:'),
    ...funciones.map((f) => B.numerado(f)),
    ...B.clausula('Tercera', 'Dedicación', 'EL SOCIO GESTOR dedicará al cargo el tiempo que requieran los proyectos y clientes a su cargo, sin perjuicio de sus otras actividades, y participará en la reunión semanal de seguimiento. Cuando no pueda atender un compromiso, avisará con anticipación para que otro socio lo cubra.'),
    ...B.clausula('Cuarta', 'Representación', 'EL SOCIO GESTOR no es representante legal. Puede firmar cotizaciones, actas de entrega y documentos operativos de su área; los contratos, las órdenes de compra a proveedores y los pagos los firma o aprueba la Gerencia General, según los estatutos.'),
    ...comunes(cargo, 4),
    B.p('Para constancia se firma en Cartagena, el [dd/mm/aaaa].', { before: 120 }),
    firmasAcuerdo(nombre, cargo, ['Lina Giraldo', 'Por LA SOCIEDAD · Gerente General y Representante Legal'])
  ]]);
});

/* 15 · Manual de desempeño y salida de socios gestores */
lista.push(['CNV-FR-15_Manual-desempeno-y-salida-de-socios-gestores.docx', 'CNV-FR-15', 'Manual de desempeño y salida de socios gestores', [
  ...B.titulo('Manual de desempeño y salida', info('CNV-FR-15', 'Manual', 'POL-01'), 'Políticas internas para los socios que trabajan en Cenova'),
  B.h('1. Objeto y alcance'),
  B.p('Este manual fija cómo se miden las metas de los socios que ocupan un cargo en CENOVA S.A.S. (Gerencia General, Coordinación Técnica y de Operaciones y Coordinación Comercial y Administrativa), qué pasa cuando no se cumplen y cómo se deja un cargo. Hace parte de los acuerdos de vinculación CNV-FR-12, 13 y 14. Aplica también a quien ocupe esos cargos en el futuro.'),
  B.h('2. Principios'),
  B.vineta('Las metas se acuerdan entre los tres socios, son pocas, se pueden medir con la intranet y se revisan cada trimestre.'),
  B.vineta('Las diferencias se hablan primero en la reunión semanal; lo escrito es para dejar constancia, no para castigar.'),
  B.vineta('Ser socio y ocupar un cargo son cosas distintas: salir del cargo no afecta las acciones.'),
  B.h('3. Metas por cargo'),
  B.p('Cada trimestre, en la primera semana, los socios acuerdan el valor de cada meta. Estos son los indicadores de referencia y de dónde salen:'),
  B.tabla([C('Cargo', 2300), C('Indicador', 4580), C('Dónde se mide', 3200)], [
    ['Gerencia General', 'Margen real de las obras frente a la meta (30 %)', 'Costos → Costo real por obra'],
    ['Gerencia General', 'Pagos, impuestos y obligaciones al día; cartera vencida', 'Finanzas → Resumen'],
    ['Gerencia General', 'Informe mensual a los socios y entrega contable a tiempo', 'Formatos (CNV-FR-10)'],
    ['Coord. Técnica y de Operaciones', 'Obras entregadas en los días cotizados', 'Estadísticas → Cumplimiento de días'],
    ['Coord. Técnica y de Operaciones', 'Costo real frente al cotizado y materiales dañados', 'Costos / Estadísticas → Desvíos'],
    ['Coord. Técnica y de Operaciones', 'Actas de entrega e informes firmados; cero accidentes', 'Formatos (CNV-FR-01 y 02)'],
    ['Coord. Comercial y Administrativa', 'Cotizaciones enviadas y tasa de aprobación', 'Estadísticas'],
    ['Coord. Comercial y Administrativa', 'Tiempo de respuesta al cliente y seguimiento al día', 'Cotizaciones / Agenda'],
    ['Coord. Comercial y Administrativa', 'Cartera cobrada y clientes nuevos', 'Finanzas / Clientes']
  ]),
  B.h('4. Evaluación trimestral'),
  B.numerado('En la última semana del trimestre cada socio llena su autoevaluación en el formato CNV-FR-16 con los resultados de la intranet.'),
  B.numerado('Los tres socios se reúnen, revisan cada meta y califican: Cumple (100 % o más), Cumple parcialmente (70 % a 99 %) o No cumple (menos de 70 %).'),
  B.numerado('Se dejan escritos los logros, las causas de lo que no se cumplió (incluidas las que no dependen del socio) y los compromisos del siguiente trimestre.'),
  B.numerado('El formato firmado se guarda con las actas de la empresa.'),
  B.h('5. Plan de mejora'),
  B.p('Si un socio tiene "No cumple" en la mayoría de sus metas en un trimestre, o en la misma meta dos trimestres seguidos, se acuerda por escrito un plan de mejora de [60] días con acciones concretas, apoyo de los demás socios y fechas de revisión. Si las causas son externas (mercado, clientes, salud), se ajustan las metas en vez de abrir un plan de mejora.'),
  B.h('6. Faltas'),
  B.p('Se consideran faltas en el ejercicio del cargo:'),
  B.tabla([C('Tipo', 1700), C('Ejemplos', 8380)], [
    ['Leve', 'Incumplir compromisos de la reunión semanal sin avisar; no registrar en la intranet lo de su área; retrasos repetidos en la respuesta a clientes.'],
    ['Grave', 'Comprometer a la empresa por encima de sus facultades; ocultar información de clientes, costos o pagos; usar recursos de la empresa para fines personales; tratar mal a clientes, proveedores o personal.'],
    ['Muy grave', 'Hacer trabajos para clientes de Cenova por su cuenta; apropiarse de dinero, equipos o información; actos que dañen gravemente la reputación de la empresa.']
  ]),
  B.p('Procedimiento: (a) llamado de atención escrito que describe los hechos; (b) el socio presenta sus explicaciones por escrito dentro de [5] días hábiles; (c) los demás socios deciden y dejan constancia. Las faltas leves se manejan con compromisos; dos faltas graves en un año o una muy grave pueden dar lugar al retiro del cargo. Nada de esto limita las acciones legales que procedan.', { before: 100 }),
  B.h('7. Retiro del cargo'),
  B.tabla([C('Causa', 2500), C('Cómo se hace', 7580)], [
    ['Renuncia', 'Aviso escrito a los demás socios con [30] días de anticipación, salvo que acuerden un plazo menor.'],
    ['Decisión de la asamblea', 'Por falta grave o muy grave, por incumplir un plan de mejora o por reorganización de la empresa. Se decide en asamblea con la mayoría de los estatutos y se le informa por escrito con las razones.'],
    ['Imposibilidad', 'Incapacidad prolongada, fallecimiento u otra causa que impida ejercer el cargo. Los demás socios asumen las funciones mientras se nombra reemplazo.']
  ]),
  B.p('Si quien sale es el Representante Legal, la asamblea nombra de inmediato su reemplazo y se inscribe el cambio en la Cámara de Comercio; mientras tanto actúa el suplente, si los estatutos lo prevén.', { before: 100 }),
  B.h('8. Entrega del cargo'),
  B.p('Dentro de los [10] días hábiles siguientes a la salida, el socio entrega el cargo con el acta CNV-FR-17, que incluye como mínimo:'),
  B.vineta('Usuarios y contraseñas de la intranet, correos, redes, tienda, proveedores y plataformas; se cambian el mismo día.'),
  B.vineta('Firmas y permisos en bancos, pasarela de pago, DIAN y Cámara de Comercio (en el caso de la Gerencia).'),
  B.vineta('Cotizaciones, clientes y obras en curso con su estado y los compromisos pendientes con cada uno.'),
  B.vineta('Dinero, tarjetas, equipos, herramientas, materiales y documentos de la empresa que tenga en su poder.'),
  B.vineta('Archivos digitales de la empresa (planos, fotos, contratos, bases de datos); no puede quedarse con copias.'),
  B.h('9. Después de la salida'),
  B.p('El socio que deja el cargo sigue siendo accionista, con los derechos de los estatutos. Guardará reserva de la información de la empresa y de sus clientes. Si decide vender sus acciones, se aplica el derecho de preferencia de los demás accionistas previsto en los estatutos o en el acuerdo de accionistas.'),
  B.h('10. Vigencia y cambios'),
  B.p('Este manual rige desde que lo firmen los tres socios. Se puede cambiar por acuerdo escrito de los socios o por decisión de la asamblea, y cada cambio queda con nueva versión y fecha.'),
  B.h('Firmas de conocimiento y aceptación'),
  B.firmas([['Lina Giraldo', 'Gerente General y Representante Legal', 'C.C. [número]'], ['Ángel Berrocal', 'Coordinador Técnico y de Operaciones', 'C.C. [número]'], ['Jorge Cantillo', 'Coordinador Comercial y Administrativo', 'C.C. [número]']]),
  B.nota('Revise que este manual no contradiga los estatutos de Cenova S.A.S. ni un acuerdo de accionistas; si hay diferencias, mandan los estatutos.')
]]);

/* 16 · Evaluación de desempeño trimestral */
lista.push(['CNV-FR-16_Evaluacion-de-desempeno-trimestral.docx', 'CNV-FR-16', 'Evaluación de desempeño trimestral', [
  ...B.titulo('Evaluación de desempeño', info('CNV-FR-16', 'Trimestre', '[T1 / aaaa]'), '[Nombre del socio] · [Cargo]'),
  B.campos([['Socio evaluado', '[Nombre]'], ['Cargo', '[Cargo]'], ['Periodo', '[dd/mm] a [dd/mm/aaaa]'], ['Fecha de la reunión', '[dd/mm/aaaa]']], 4),
  B.h('1. Metas del trimestre'),
  B.tabla([C('Meta / indicador', 3480), C('Meta', 1300, CE), C('Resultado', 1300, CE), C('%', 900, CE), C('Calificación', 1500, CE), C('Comentario', 1600)], B.filasVacias(6, [1, 2, 3, 4, 5, 6])),
  B.nota('Calificación: Cumple (100 % o más) · Cumple parcialmente (70 % a 99 %) · No cumple (menos de 70 %). Los resultados salen de la intranet (Estadísticas, Costos, Finanzas).'),
  B.h('2. Logros del trimestre'), B.recuadro(900),
  B.h('3. Lo que no se cumplió y por qué'), B.recuadro(900, '[Incluya las causas que no dependen del socio: clientes, mercado, proveedores, salud.]'),
  B.h('4. Compromisos para el siguiente trimestre'),
  B.tabla([C('Compromiso', 5280), C('Responsable', 2400), C('Fecha', 2400)], B.filasVacias(4, [1, 2, 3])),
  B.h('5. Resultado general'),
  B.casillas(['Cumple', 'Cumple parcialmente', 'No cumple', 'Requiere plan de mejora'], 4),
  B.firmas([['[Nombre]', 'Socio evaluado'], ['[Nombre]', 'Socio'], ['[Nombre]', 'Socio']])
]]);

/* 17 · Acta de entrega del cargo */
const chk = (filas) => filas.map((f) => [f, '☐', '']);
const colsChk = [C('Elemento', 5880), C('Entregado', 1300, CE), C('Observaciones', 2900)];
lista.push(['CNV-FR-17_Acta-de-entrega-del-cargo.docx', 'CNV-FR-17', 'Acta de entrega del cargo', [
  ...B.titulo('Acta de entrega del cargo', info('CNV-FR-17', 'Acta N°', '[AEC-000]'), '[Cargo] · [Nombre de quien entrega]'),
  B.campos([['Entrega', '[Nombre]'], ['Cargo', '[Cargo]'], ['Recibe', '[Nombre y cargo]'], ['Motivo', '[Renuncia / decisión de asamblea / otro]'], ['Fecha de salida', '[dd/mm/aaaa]'], ['Fecha de entrega', '[dd/mm/aaaa]']], 4),
  B.h('1. Accesos y contraseñas'),
  B.tabla(colsChk, chk(['Usuario de la intranet (se desactiva o se cambia la clave)', 'Correo corporativo y Google Workspace', 'Redes sociales, sitio web y tienda virtual', 'Plataformas de proveedores, pasarela de pago y apps de los sistemas de clientes', 'Otros: [describir]'])),
  B.h('2. Bancos, firmas y entidades'),
  B.tabla(colsChk, chk(['Firmas registradas en bancos y tokens', 'Usuario DIAN / firma electrónica', 'Cámara de Comercio (cambio de representante, si aplica)', 'Tarjetas de la empresa'])),
  B.h('3. Clientes, cotizaciones y obras en curso'),
  B.tabla([C('Cliente / proyecto', 3480), C('Estado', 2000), C('Pendiente', 2900), C('Fecha', 1700)], B.filasVacias(5, [1, 2, 3, 4])),
  B.h('4. Dinero, equipos y documentos'),
  B.tabla(colsChk, chk(['Dinero en efectivo o caja menor: $[000.000]', 'Equipos (computador, celular) de la empresa', 'Herramientas y materiales', 'Documentos físicos y archivos digitales (sin quedarse con copias)'])),
  B.h('5. Observaciones'), B.recuadro(900),
  B.p('Quien entrega declara que no conserva accesos, dinero, equipos ni información de la empresa, salvo lo anotado en las observaciones. Quien recibe deja constancia de lo recibido. Esta acta no afecta la calidad de accionista de quien entrega.', { before: 120 }),
  B.firmas([['[Nombre]', 'Entrega', 'C.C. [número]'], ['[Nombre]', 'Recibe', 'C.C. [número]'], ['[Nombre]', 'Testigo (socio)', 'C.C. [número]']])
]]);

(async () => {
  for (const [archivo, cod, tit, hijos] of lista) { await B.guardar(archivo, cod, tit, hijos); console.log('ok', archivo); }
})();
