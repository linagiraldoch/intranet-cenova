/* Genera los 11 formatos de Cenova en Word (.docx) con el diseño de la cotización. */
const B = require('./base');
const { AlignmentType: A } = B;
const W = B.CONTENT; // 10080
const C = (t, w, align) => ({ t, w, align });
const R = A.RIGHT, CE = A.CENTER;
const info = (cod, extra) => [['Código', cod]].concat(extra || [['N°', '[0000]'], ['Fecha', '[dd/mm/aaaa]']]).concat([['Versión', '1']]);
const lista = [];

/* 01 · Informe de proyecto al cliente */
lista.push(['CNV-FR-01_Informe-de-proyecto.docx', 'CNV-FR-01', 'Informe de proyecto', [
  ...B.titulo('Informe de proyecto', info('CNV-FR-01', [['Informe N°', '[INF-0000]'], ['Fecha', '[dd/mm/aaaa]']]), '[Nombre del proyecto]'),
  B.dosColumnas('Datos del cliente', [['Cliente', '[Razón social]'], ['NIT', '[000.000.000-0]'], ['Atención', '[Nombre del contacto]'], ['Dirección', '[Dirección de la obra]'], ['Ciudad', '[Ciudad]'], ['Teléfono', '[Teléfono]']], 'Datos del emisor', B.emisor()),
  B.h('Datos del proyecto'),
  B.campos([['Orden de compra', '[OC-0000]'], ['Cotización', '[COT-0000]'], ['Fecha de inicio', '[dd/mm/aaaa]'], ['Fecha de finalización', '[dd/mm/aaaa]'], ['Responsable Cenova', '[Nombre]'], ['Estado', '[En ejecución / Finalizado]']], 4),
  B.h('1. Objetivo y alcance'),
  B.p('[Describa en pocas líneas qué se pidió y qué incluye el proyecto: sistema, cantidad de equipos, áreas cubiertas.]'),
  B.h('2. Actividades realizadas'),
  B.tabla([C('Fecha', 1500), C('Actividad', 5980), C('Responsable', 2600)], B.filasVacias(5, [1, 2, 3])),
  B.h('3. Equipos y materiales instalados'),
  B.tabla([C('#', 500, CE), C('Descripción / referencia', 4380), C('Cant.', 900, CE), C('Ubicación', 2300), C('Serial / ID', 2000)], B.filasVacias(6, [1, 2, 3, 4, 5], true)),
  B.h('4. Pruebas y resultados'),
  B.tabla([C('Prueba realizada', 4280), C('Resultado', 1800, CE), C('Observación', 4000)], [['Encendido y funcionamiento de cada equipo', '[OK / Falla]', ''], ['Visualización local y remota (app / web)', '[OK / Falla]', ''], ['Grabación y reproducción', '[OK / Falla]', ''], ['', '', '']]),
  B.h('5. Novedades y observaciones'),
  B.recuadro(1100, '[Cambios frente a lo cotizado, imprevistos, materiales reemplazados, pendientes del cliente.]'),
  B.h('6. Recomendaciones'),
  B.vineta('[Mantenimiento preventivo recomendado cada 6 meses.]'), B.vineta('[Recomendación de uso o mejora.]'),
  B.h('7. Registro fotográfico'),
  B.tabla([C('Antes', W / 2), C('Después', W / 2)], [[['', '', '', '', '[Foto]', '', ''], ['', '', '', '', '[Foto]', '', '']], ['[Descripción]', '[Descripción]'], [['', '', '', '', '[Foto]', '', ''], ['', '', '', '', '[Foto]', '', '']], ['[Descripción]', '[Descripción]']]),
  B.h('8. Garantía y soporte'),
  B.p('Los equipos cuentan con garantía de [12] meses por defectos de fábrica, sujeta a las políticas del fabricante, y la mano de obra con garantía de [6] meses contados desde la fecha de entrega. Para soporte escríbanos a ' + B.EMPRESA.email + ' o al ' + B.EMPRESA.tel + '.'),
  B.firmas([['[Nombre]', 'Elaboró · Cenova S.A.S.', '[Cargo]'], ['[Nombre]', 'Recibe · [Cliente]', 'C.C. [número]']])
]]);

/* 02 · Acta de entrega y recibo a satisfacción */
lista.push(['CNV-FR-02_Acta-de-entrega.docx', 'CNV-FR-02', 'Acta de entrega y recibo a satisfacción', [
  ...B.titulo('Acta de entrega y recibo a satisfacción', info('CNV-FR-02', [['Acta N°', '[ACT-0000]'], ['Fecha', '[dd/mm/aaaa]']]), '[Nombre del proyecto]'),
  B.dosColumnas('Datos del cliente', [['Cliente', '[Razón social]'], ['NIT', '[000.000.000-0]'], ['Recibe', '[Nombre y cargo]'], ['Dirección', '[Dirección de la obra]'], ['Ciudad', '[Ciudad]']], 'Datos del emisor', B.emisor()),
  B.p('En [Ciudad], a los [día] días del mes de [mes] de [año], se reúnen las partes para hacer la entrega formal de los trabajos ejecutados por CENOVA S.A.S. según la cotización [COT-0000] y la orden de compra [OC-0000], y dejar constancia de lo siguiente:', { before: 120 }),
  B.h('1. Equipos y trabajos entregados'),
  B.tabla([C('#', 500, CE), C('Descripción', 4580), C('Cant.', 900, CE), C('Ubicación / serial', 2600), C('Estado', 1500, CE)], B.filasVacias(7, [1, 2, 3, 4, 5], true)),
  B.h('2. Pruebas realizadas en presencia del cliente'),
  B.casillas(['Encendido de todos los equipos', 'Visualización en sitio', 'Visualización remota (app)', 'Grabación y reproducción', 'Respaldo de energía', 'Etiquetado del cableado'], 3),
  B.h('3. Capacitación y documentos entregados'),
  B.casillas(['Capacitación al usuario', 'Usuarios y contraseñas', 'Manual / guía de uso', 'Certificados de garantía', 'Planos o esquema', 'Facturas de equipos'], 3),
  B.campos([['Capacitación dada a', '[Nombre]'], ['Fecha', '[dd/mm/aaaa]']], 4),
  B.h('4. Observaciones y pendientes'),
  B.recuadro(1000, '[Si queda algún pendiente, escríbalo aquí con la fecha en que se resolverá. Si no hay, escriba "Ninguno".]'),
  B.h('5. Recibo a satisfacción'),
  B.p('El cliente declara que recibe los equipos y trabajos descritos, que fueron probados en su presencia y que funcionan correctamente. Desde esta fecha corre la garantía: [12] meses para los equipos por defectos de fábrica, según las políticas del fabricante, y [6] meses para la mano de obra. La garantía no cubre daños por mal uso, variaciones eléctricas, manipulación por terceros ni causas externas.'),
  B.firmas([['[Nombre]', 'Entrega · Cenova S.A.S.', '[Cargo]'], ['[Nombre]', 'Recibe a satisfacción · [Cliente]', 'C.C. [número]']])
]]);

/* 03 · Orden de trabajo / visita técnica */
lista.push(['CNV-FR-03_Orden-de-trabajo.docx', 'CNV-FR-03', 'Orden de trabajo / visita técnica', [
  ...B.titulo('Orden de trabajo', info('CNV-FR-03', [['OT N°', '[OT-0000]'], ['Fecha', '[dd/mm/aaaa]']]), 'Visita técnica · [Cliente]'),
  B.campos([['Cliente', '[Razón social]'], ['Contacto', '[Nombre]'], ['Dirección', '[Dirección]'], ['Teléfono', '[Teléfono]'], ['Hora de llegada', '[00:00]'], ['Hora de salida', '[00:00]'], ['Orden / cotización', '[OC-0000 / COT-0000]'], ['Técnico líder', '[Nombre]']], 4),
  B.h('Tipo de servicio'),
  B.casillas(['Levantamiento', 'Instalación', 'Mantenimiento preventivo', 'Mantenimiento correctivo', 'Garantía', 'Soporte / configuración'], 3),
  B.h('Solicitud del cliente'), B.recuadro(800),
  B.h('Diagnóstico'), B.recuadro(900),
  B.h('Trabajos realizados'), B.recuadro(1200),
  B.h('Materiales y repuestos utilizados'),
  B.tabla([C('Material / repuesto', 5080), C('Cant.', 1000, CE), C('Sale de', 2000, CE), C('Observación', 2000)], B.filasVacias(4, [1, 2, 3, 4])),
  B.nota('"Sale de": bodega de Cenova, compra para esta obra o suministrado por el cliente.'),
  B.h('Pendientes y recomendaciones'), B.recuadro(800),
  B.h('Personal que atendió'),
  B.tabla([C('Nombre', 4080), C('Rol', 3000), C('Horas', 1000, CE), C('Firma', 2000)], B.filasVacias(3, [1, 2, 3, 4])),
  B.h('Conformidad del cliente'),
  B.casillas(['Excelente', 'Bueno', 'Regular', 'Malo'], 4),
  B.firmas([['[Nombre]', 'Técnico · Cenova S.A.S.', ''], ['[Nombre]', 'Cliente', 'C.C. [número]']])
]]);

/* 04 · Contrato con cliente */
lista.push(['CNV-FR-04_Contrato-cliente-servicios-e-instalacion.docx', 'CNV-FR-04', 'Contrato de prestación de servicios e instalación', [
  ...B.titulo('Contrato de prestación de servicios', info('CNV-FR-04', [['Contrato N°', '[CON-0000]'], ['Fecha', '[dd/mm/aaaa]']]), 'Suministro e instalación de [sistema] · [Cliente]'),
  B.dosColumnas('El contratante (cliente)', [['Nombre', '[Razón social o nombre]'], ['NIT / C.C.', '[000.000.000-0]'], ['Representante', '[Nombre]'], ['C.C. rep.', '[número]'], ['Dirección', '[Dirección]'], ['Email', '[correo]']], 'El contratista', B.emisor([['C.C. rep.', '[número]']])),
  B.p('Entre las partes identificadas arriba, que en adelante se llamarán EL CONTRATANTE y EL CONTRATISTA (CENOVA S.A.S.), se celebra el presente contrato de prestación de servicios y suministro, que se regirá por las siguientes cláusulas y, en lo no previsto, por las normas del Código Civil y del Código de Comercio colombianos.', { before: 160 }),
  ...B.clausula('Primera', 'Objeto', 'EL CONTRATISTA se obliga a suministrar e instalar, con autonomía técnica y administrativa, [descripción del sistema o servicio] en el inmueble ubicado en [dirección], según el alcance, las cantidades y las especificaciones de la cotización [COT-0000] del [fecha], que hace parte integral de este contrato como Anexo 1.'),
  ...B.clausula('Segunda', 'Alcance', ['Incluye: [equipos, materiales, mano de obra, configuración, pruebas y capacitación].', 'No incluye, salvo que se indique en la cotización: obra civil (rotura de muros, resanes, pintura), acometidas eléctricas, permisos ante terceros, ni equipos o servicios no descritos en el Anexo 1.']),
  ...B.clausula('Tercera', 'Valor', 'El valor total del contrato es de [valor en letras] PESOS M/CTE ($[000.000]), [IVA incluido / más IVA del 19 %]. Cualquier trabajo adicional se cotizará por aparte y solo se ejecutará con aprobación escrita de EL CONTRATANTE (orden de cambio).'),
  ...B.clausula('Cuarta', 'Forma de pago', ['a) Anticipo del [50] %: $[000.000], a la firma de este contrato, para la compra de equipos y materiales.', 'b) Saldo del [50] %: $[000.000], contra entrega e instalación, a la firma del acta de entrega y recibo a satisfacción, dentro de los [5] días siguientes a la presentación de la factura electrónica.', 'Los pagos se harán a la cuenta [tipo] N° [número] del banco [banco] a nombre de CENOVA S.A.S. Los pagos por pasarela tendrán los descuentos propios de esa plataforma.']),
  ...B.clausula('Quinta', 'Plazo', 'Los trabajos se ejecutarán en [número] días [hábiles / calendario] contados desde el pago del anticipo y la disponibilidad del sitio. El plazo se ampliará por el tiempo que duren las demoras atribuibles a EL CONTRATANTE, a terceros o a fuerza mayor.'),
  ...B.clausula('Sexta', 'Obligaciones del contratista', ['1) Ejecutar los trabajos con personal idóneo y con las normas técnicas y de seguridad aplicables, incluido el trabajo en alturas cuando corresponda. 2) Suministrar equipos nuevos y con garantía del fabricante. 3) Mantener el sitio ordenado y retirar los residuos de la instalación. 4) Entregar el sistema probado, configurado y con capacitación básica al usuario. 5) Responder por la afiliación y los pagos a seguridad social de su personal.']),
  ...B.clausula('Séptima', 'Obligaciones del contratante', ['1) Pagar el valor en los plazos acordados. 2) Dar acceso al sitio en los horarios convenidos y designar una persona de contacto. 3) Tener disponibles los puntos eléctricos, el internet y las condiciones locativas necesarias. 4) Obtener los permisos de copropiedad o de terceros que se requieran. 5) Informar por escrito cualquier cambio en el alcance.']),
  ...B.clausula('Octava', 'Entrega y recibo', 'Terminados los trabajos se firmará el acta de entrega y recibo a satisfacción (formato CNV-FR-02). Si EL CONTRATANTE no firma ni presenta observaciones por escrito dentro de los [3] días hábiles siguientes a la entrega, los trabajos se entenderán recibidos a satisfacción.'),
  ...B.clausula('Novena', 'Garantía', 'Los equipos tienen la garantía del fabricante por [12] meses por defectos de fábrica. La mano de obra tiene garantía de [6] meses. La garantía no cubre daños por mal uso, variaciones eléctricas, humedad, manipulación de terceros o causas externas.'),
  ...B.clausula('Décima', 'Reserva de dominio', 'Los equipos y materiales suministrados serán propiedad de EL CONTRATISTA hasta que EL CONTRATANTE pague la totalidad del precio (artículo 952 del Código de Comercio).'),
  ...B.clausula('Undécima', 'Datos personales e imágenes', 'Si el sistema capta imágenes o datos personales, EL CONTRATANTE es el responsable de su tratamiento conforme a la Ley 1581 de 2012 y a sus decretos reglamentarios, incluido el aviso de videovigilancia. EL CONTRATISTA solo accederá a esa información para fines de instalación y soporte, y guardará reserva sobre ella.'),
  ...B.clausula('Duodécima', 'Terminación', 'El contrato termina por cumplimiento del objeto, por mutuo acuerdo o por incumplimiento grave de una de las partes, previo aviso escrito de [5] días hábiles para corregirlo. Si EL CONTRATANTE termina el contrato sin justa causa, pagará los trabajos ejecutados y los equipos ya adquiridos para la obra.'),
  ...B.clausula('Decimotercera', 'Solución de controversias', 'Las diferencias se resolverán primero por arreglo directo durante [15] días; si no hay acuerdo, se acudirá a la conciliación en un centro de conciliación de [Cartagena] y, de no lograrse, a la justicia ordinaria.'),
  ...B.clausula('Decimocuarta', 'Mérito ejecutivo y domicilio', 'Este contrato presta mérito ejecutivo para exigir las obligaciones de pago. Para todos los efectos, el domicilio contractual es la ciudad de [Cartagena]. Las notificaciones se enviarán a los correos indicados al inicio.'),
  ...B.clausula('Decimoquinta', 'Perfeccionamiento', 'El contrato se perfecciona con la firma de las partes y forman parte de él la cotización (Anexo 1) y las órdenes de cambio aprobadas.'),
  B.p('Para constancia se firma en [Ciudad], el [dd/mm/aaaa], en dos ejemplares del mismo valor.', { before: 120 }),
  B.firmas([['[Nombre]', 'EL CONTRATANTE', 'C.C. / NIT [número]'], ['[Nombre]', 'EL CONTRATISTA · Cenova S.A.S.', 'Representante legal · NIT ' + B.EMPRESA.nit]]),
  B.nota('Formato de referencia. Antes de firmar un contrato de valor alto o con condiciones especiales, revíselo con un abogado.')
]]);

/* 05 · Contrato con técnico / personal de apoyo */
lista.push(['CNV-FR-05_Contrato-servicios-personal-tecnico.docx', 'CNV-FR-05', 'Contrato de prestación de servicios — personal técnico', [
  ...B.titulo('Contrato de prestación de servicios', info('CNV-FR-05', [['Contrato N°', '[CPS-0000]'], ['Fecha', '[dd/mm/aaaa]']]), 'Servicios técnicos independientes · [Nombre del técnico]'),
  B.dosColumnas('El contratante', B.emisor(), 'El contratista (técnico)', [['Nombre', '[Nombre completo]'], ['C.C.', '[número]'], ['Dirección', '[Dirección]'], ['Teléfono', '[Teléfono]'], ['Email', '[correo]'], ['Especialidad', '[Técnico CCTV / redes / alturas…]']]),
  B.p('Entre CENOVA S.A.S. (EL CONTRATANTE) y la persona identificada arriba (EL CONTRATISTA), se celebra este contrato de prestación de servicios de naturaleza civil, regido por los artículos 1495 y siguientes del Código Civil, con las siguientes cláusulas:', { before: 160 }),
  ...B.clausula('Primera', 'Objeto', 'EL CONTRATISTA prestará, con sus propios medios y autonomía técnica, los servicios de [instalación, cableado, configuración, mantenimiento] en las obras que EL CONTRATANTE le proponga y él acepte, según las órdenes de trabajo de cada obra.'),
  ...B.clausula('Segunda', 'Naturaleza del contrato', 'Este contrato no genera relación laboral ni subordinación. EL CONTRATISTA organiza su trabajo con independencia, puede prestar servicios a terceros y no tiene horario fijo distinto del necesario para coordinar la obra con el cliente. No hay lugar a salarios ni prestaciones sociales.'),
  ...B.clausula('Tercera', 'Valor y forma de pago', ['El valor será de $[000.000] por día de servicio efectivo, [incluido / sin incluir] almuerzo y transporte, o el valor global que se acuerde por escrito para cada obra.', 'EL CONTRATANTE pagará dentro de los [8] días siguientes a la presentación de la cuenta de cobro (formato CNV-FR-08) con el soporte de pago de seguridad social del periodo. Se harán las retenciones de ley que correspondan.']),
  ...B.clausula('Cuarta', 'Seguridad social', 'EL CONTRATISTA debe estar afiliado como independiente a salud, pensión y riesgos laborales (ARL) y pagar sus aportes sobre la base que fija la ley (hoy, el 40 % del valor mensual facturado). Para tareas de alto riesgo la ARL debe corresponder al nivel de riesgo de la actividad. Sin el soporte de pago no se podrá iniciar la obra ni pagar la cuenta de cobro.'),
  ...B.clausula('Quinta', 'Seguridad y salud en el trabajo', 'EL CONTRATISTA cumplirá las normas de seguridad de cada obra y usará los elementos de protección personal. Para trabajo en alturas debe tener vigente el certificado de trabajo seguro en alturas (Resolución 4272 de 2021) y seguir el permiso de trabajo de la obra.'),
  ...B.clausula('Sexta', 'Herramientas y materiales', 'EL CONTRATISTA usará [sus propias herramientas / las herramientas que le entregue EL CONTRATANTE]. Los materiales y equipos de la obra son de EL CONTRATANTE o del cliente; lo que sobre se devuelve a la bodega de EL CONTRATANTE.'),
  ...B.clausula('Séptima', 'Calidad y garantía', 'EL CONTRATISTA corregirá sin costo adicional los defectos de su trabajo que se reporten dentro de los [3] meses siguientes a la entrega de cada obra. Responderá por los daños que cause por su culpa a los equipos, al inmueble o a terceros.'),
  ...B.clausula('Octava', 'Confidencialidad y clientes', 'EL CONTRATISTA guardará reserva sobre la información de EL CONTRATANTE y de sus clientes (contraseñas, planos, imágenes, precios). Durante este contrato y los [12] meses siguientes no ofrecerá directamente sus servicios a los clientes que conozca a través de EL CONTRATANTE para los mismos trabajos.'),
  ...B.clausula('Novena', 'Duración y terminación', 'El contrato tiene una duración de [12 meses / la duración de la obra] y podrá terminarse en cualquier momento por cualquiera de las partes con aviso escrito de [8] días, o de inmediato por incumplimiento grave. Las obras en curso se liquidarán por los días efectivamente prestados.'),
  B.p('Para constancia se firma en [Ciudad], el [dd/mm/aaaa].', { before: 120 }),
  B.firmas([firmaRep(), ['[Nombre]', 'EL CONTRATISTA', 'C.C. [número]']]),
  B.nota('Si la persona va a cumplir horario, recibir órdenes permanentes o trabajar solo para Cenova, lo correcto es un contrato laboral, no este formato.')
]]);
function firmaRep() { return [B.EMPRESA.rep, 'EL CONTRATANTE · Cenova S.A.S.', 'Representante legal · NIT ' + B.EMPRESA.nit]; }

/* 06 · Contrato con proveedor / subcontratista */
lista.push(['CNV-FR-06_Contrato-proveedor-subcontratista.docx', 'CNV-FR-06', 'Contrato con proveedor / subcontratista', [
  ...B.titulo('Contrato de subcontratación', info('CNV-FR-06', [['Contrato N°', '[SUB-0000]'], ['Fecha', '[dd/mm/aaaa]']]), '[Suministro / obra subcontratada] · [Proveedor]'),
  B.dosColumnas('El contratante', B.emisor(), 'El subcontratista / proveedor', [['Nombre', '[Razón social]'], ['NIT', '[000.000.000-0]'], ['Representante', '[Nombre]'], ['Dirección', '[Dirección]'], ['Teléfono', '[Teléfono]'], ['Email', '[correo]']]),
  B.p('Entre CENOVA S.A.S. (EL CONTRATANTE) y la empresa identificada arriba (EL SUBCONTRATISTA) se celebra este contrato, regido por el Código de Comercio y el Código Civil, con las siguientes cláusulas:', { before: 160 }),
  ...B.clausula('Primera', 'Objeto', 'EL SUBCONTRATISTA se obliga a [suministrar los bienes / ejecutar los trabajos] descritos en su cotización [número] del [fecha] (Anexo 1), para el proyecto [nombre] del cliente [cliente] de EL CONTRATANTE.'),
  ...B.clausula('Segunda', 'Valor y forma de pago', 'El valor es de $[000.000] [más IVA / IVA incluido]. Se pagará [anticipo del [30] % y saldo contra entrega a satisfacción / a [30] días de la factura electrónica], previa verificación de cantidades y calidad. Se harán las retenciones de ley.'),
  ...B.clausula('Tercera', 'Plazo y lugar de entrega', 'La entrega o ejecución se hará a más tardar el [dd/mm/aaaa] en [lugar]. Cada día de retraso no justificado causará una multa del [0,5] % del valor del contrato, hasta el [10] %, que EL CONTRATANTE podrá descontar de los pagos.'),
  ...B.clausula('Cuarta', 'Calidad y garantía', 'Los bienes serán nuevos, originales y con las especificaciones del Anexo 1. EL SUBCONTRATISTA garantiza los bienes por [12] meses y los trabajos por [6] meses, y reemplazará sin costo lo defectuoso dentro de los [5] días hábiles siguientes al aviso.'),
  ...B.clausula('Quinta', 'Personal y seguridad social', 'EL SUBCONTRATISTA ejecuta con su propio personal, bajo su exclusiva responsabilidad laboral, y responde por sus salarios, prestaciones, afiliación y aportes a seguridad social y ARL, y por el cumplimiento de las normas de seguridad y salud en el trabajo (incluido trabajo en alturas). Mantendrá indemne a EL CONTRATANTE frente a cualquier reclamación de su personal.'),
  ...B.clausula('Sexta', 'Relación con el cliente', 'EL SUBCONTRATISTA actúa en nombre de EL CONTRATANTE frente al cliente final, no negociará directamente con él trabajos relacionados con este proyecto y guardará reserva de la información, precios y datos del cliente.'),
  ...B.clausula('Séptima', 'Pólizas (opcional)', 'Si el valor lo amerita, EL SUBCONTRATISTA constituirá a favor de EL CONTRATANTE pólizas de [cumplimiento del 10 %, calidad del 10 % y salarios y prestaciones del 5 %], por el plazo del contrato y [4] meses más.'),
  ...B.clausula('Octava', 'Terminación', 'EL CONTRATANTE podrá terminar el contrato por incumplimiento, previo aviso escrito de [3] días para corregir, y pagará solo lo recibido a satisfacción. Las diferencias se resolverán por arreglo directo y, en su defecto, ante la justicia ordinaria de [Cartagena].'),
  B.p('Para constancia se firma en [Ciudad], el [dd/mm/aaaa].', { before: 120 }),
  B.firmas([firmaRep(), ['[Nombre]', 'EL SUBCONTRATISTA', 'Representante legal · NIT [número]']])
]]);

/* 07 · Liquidación de pago a personal de obra */
lista.push(['CNV-FR-07_Liquidacion-pago-personal-de-obra.docx', 'CNV-FR-07', 'Liquidación de pago a personal de obra', [
  ...B.titulo('Liquidación de pago', info('CNV-FR-07', [['Liquidación N°', '[LIQ-0000]'], ['Fecha', '[dd/mm/aaaa]']]), 'Personal de obra · [Nombre del proyecto]'),
  B.campos([['Nombre', '[Nombre completo]'], ['C.C.', '[número]'], ['Rol', '[Técnico / auxiliar / soldador]'], ['Tipo de vinculación', '[Prestación de servicios]'], ['Proyecto / cliente', '[Proyecto · Cliente]'], ['Orden de compra', '[OC-0000]'], ['Periodo', '[dd/mm] a [dd/mm/aaaa]'], ['Responsable de obra', '[Nombre]']], 4),
  B.h('Días trabajados'),
  B.tabla([C('Fecha', 1250), C('Actividad', 2830), C('Días', 700, CE), C('Valor día', 1300, R), C('Almuerzo', 1250, R), C('Transporte', 1450, R), C('Total', 1300, R)], B.filasVacias(6, [1, 2, 3, 4, 5, 6, 7]), { total: ['SUBTOTAL', '$'] }),
  B.h('Otros pagos y descuentos'),
  B.tabla([C('Concepto', 6080), C('Tipo', 2000, CE), C('Valor', 2000, R)], [['Bonificación / horas extra acordadas', 'Suma', ''], ['Anticipos ya entregados', 'Resta', ''], ['Retención en la fuente (si aplica)', 'Resta', ''], ['Herramienta o material a cargo del técnico', 'Resta', '']], { total: ['NETO A PAGAR', '$'] }),
  B.h('Forma de pago'),
  B.campos([['Medio', '[Transferencia / efectivo]'], ['Banco', '[Banco]'], ['Tipo y N° de cuenta', '[Ahorros N°]'], ['Fecha de pago', '[dd/mm/aaaa]'], ['Planilla de seguridad social', '[N° de planilla del periodo]'], ['Cuenta de cobro', '[N°]']], 4),
  B.p('Recibí a satisfacción el valor neto indicado como pago total por los servicios prestados en el periodo y proyecto descritos, y declaro que no existen saldos pendientes por este concepto.', { before: 200 }),
  B.firmas([['[Nombre]', 'Aprueba · Cenova S.A.S.', '[Cargo]'], ['[Nombre]', 'Recibí conforme', 'C.C. [número]']])
]]);

/* 08 · Cuenta de cobro (persona natural a Cenova) */
lista.push(['CNV-FR-08_Cuenta-de-cobro.docx', 'CNV-FR-08', 'Cuenta de cobro', [
  ...B.titulo('Cuenta de cobro', info('CNV-FR-08', [['Cuenta N°', '[0000]'], ['Fecha', '[dd/mm/aaaa]']]), '[Ciudad], [dd de mes de aaaa]'),
  B.p([B.run('CENOVA S.A.S.', { bold: true, size: 24, color: B.NAVY })], { align: A.CENTER, after: 0 }),
  B.p('NIT ' + B.EMPRESA.nit, { align: A.CENTER, after: 120, color: B.MUTED }),
  B.p([B.run('DEBE A:', { bold: true, size: 22, color: B.NAVY })], { align: A.CENTER, after: 60 }),
  B.p('[NOMBRE COMPLETO] · C.C. [número] de [ciudad]', { align: A.CENTER, after: 120, bold: true }),
  B.p([B.run('LA SUMA DE:', { bold: true, size: 22, color: B.NAVY })], { align: A.CENTER, after: 60 }),
  B.p('[valor en letras] PESOS M/CTE ($[000.000])', { align: A.CENTER, after: 80, bold: true }),
  B.h('Por concepto de'),
  B.tabla([C('Concepto', 5280), C('Proyecto / orden', 2200), C('Días', 800, CE), C('Valor', 1800, R)], [['Servicios técnicos de [instalación / mantenimiento]', '[OC-0000]', '', ''], ['Viáticos (almuerzo / transporte) acordados', '', '', '']], { total: ['TOTAL', '$'] }),
  B.h('Datos para el pago'),
  B.campos([['Banco', '[Banco]'], ['Tipo de cuenta', '[Ahorros / corriente]'], ['N° de cuenta', '[número]'], ['Titular', '[Nombre]'], ['Planilla de seguridad social', '[N° de planilla]'], ['Periodo cotizado', '[mes/aaaa]']], 4),
  B.h('Declaraciones'),
  B.vineta('No soy responsable del impuesto sobre las ventas (IVA) y no estoy obligado a expedir factura electrónica.'),
  B.vineta('No he contratado ni vinculado dos o más trabajadores para desarrollar esta actividad (para efectos de la retención en la fuente, artículo 383 del Estatuto Tributario).'),
  B.vineta('Adjunto el soporte de pago de mis aportes a salud, pensión y riesgos laborales del periodo.'),
  B.firmas([['[Nombre]', 'Firma de quien cobra', 'C.C. [número] · Tel. [número]']]),
  B.nota('Formato para que el personal independiente le cobre a Cenova. Para cobrarle a un cliente, Cenova debe emitir factura electrónica.')
]]);

/* 09 · Liquidación laboral */
lista.push(['CNV-FR-09_Liquidacion-prestaciones-sociales.docx', 'CNV-FR-09', 'Liquidación de prestaciones sociales', [
  ...B.titulo('Liquidación de contrato laboral', info('CNV-FR-09', [['Liquidación N°', '[LAB-0000]'], ['Fecha', '[dd/mm/aaaa]']]), 'Prestaciones sociales · [Nombre del trabajador]'),
  B.h('Datos del trabajador'),
  B.campos([['Nombre', '[Nombre completo]'], ['C.C.', '[número]'], ['Cargo', '[Cargo]'], ['Tipo de contrato', '[Término fijo / indefinido / obra]'], ['Fecha de ingreso', '[dd/mm/aaaa]'], ['Fecha de retiro', '[dd/mm/aaaa]'], ['Motivo del retiro', '[Renuncia / terminación / fin de contrato]'], ['Días laborados', '[0]']], 4),
  B.h('Base de liquidación'),
  B.campos([['Salario mensual', '$[000.000]'], ['Auxilio de transporte', '$[000.000] (si gana hasta 2 SMMLV)'], ['Base prestaciones', '$[salario + auxilio]'], ['Salario base vacaciones', '$[salario, sin auxilio]']], 4),
  B.h('Liquidación'),
  B.tabla([C('Concepto', 3000), C('Fórmula', 3880), C('Días', 1000, CE), C('Valor', 2200, R)], [
    ['Cesantías', 'Base prestaciones × días ÷ 360', '', '$'],
    ['Intereses sobre cesantías', 'Cesantías × días × 12 % ÷ 360', '', '$'],
    ['Prima de servicios', 'Base prestaciones × días del semestre ÷ 360', '', '$'],
    ['Vacaciones no disfrutadas', 'Salario base vacaciones × días ÷ 720', '', '$'],
    ['Salarios pendientes', 'Salario ÷ 30 × días', '', '$'],
    ['Indemnización (si aplica)', 'Artículo 64 del Código Sustantivo del Trabajo', '', '$']
  ], { total: ['TOTAL DEVENGADO', '$'] }),
  B.vacio(120),
  B.tabla([C('Deducciones', 6880), C('Valor', 3200, R)], [['Aporte a salud (4 % del salario pendiente)', '$'], ['Aporte a pensión (4 % del salario pendiente)', '$'], ['Préstamos o anticipos', '$'], ['Otros', '$']], { total: ['NETO A PAGAR', '$'] }),
  B.p('Valor neto en letras: [valor en letras] PESOS M/CTE.', { before: 160, bold: true }),
  B.h('Constancia'),
  B.p('El trabajador declara que recibe el valor neto indicado como liquidación final de salarios y prestaciones sociales por el tiempo laborado, que se le entregaron los certificados de aportes a seguridad social de los últimos tres meses y la certificación laboral, y que con este pago queda a paz y salvo por todo concepto laboral, salvo lo que la ley no permita renunciar.'),
  B.firmas([firmaRep(), ['[Nombre]', 'EL TRABAJADOR', 'C.C. [número]']]),
  B.nota('Revise la liquidación con el contador antes de pagarla: el valor del salario mínimo y del auxilio de transporte cambia cada año, y las cesantías del año anterior pueden estar ya consignadas en el fondo.')
]]);

/* 10 · Entrega contable mensual */
const docs = (filas) => filas.map((f) => [f, '', '', '☐', '']);
const colsEnt = [C('Documento', 3880), C('Cantidad', 1150, CE), C('Valor total', 1600, R), C('Entregado', 1350, CE), C('Observaciones', 2100)];
lista.push(['CNV-FR-10_Entrega-contable-mensual.docx', 'CNV-FR-10', 'Entrega contable mensual', [
  ...B.titulo('Entrega contable', info('CNV-FR-10', [['Periodo', '[mes / aaaa]'], ['Fecha', '[dd/mm/aaaa]']]), 'Documentos del mes para contabilidad'),
  B.campos([['Entrega', '[Nombre · Cenova]'], ['Recibe', '[Contador(a)]'], ['Medio de entrega', '[Carpeta compartida / físico / correo]'], ['Fecha límite del contador', '[dd/mm/aaaa]']], 4),
  B.h('1. Ingresos'),
  B.tabla(colsEnt, docs(['Facturas electrónicas emitidas (consecutivo [desde–hasta])', 'Notas crédito / débito emitidas', 'Soportes de pagos de clientes (transferencias, pasarela)', 'Certificados de retención que nos practicaron'])),
  B.h('2. Egresos y compras'),
  B.tabla(colsEnt, docs(['Facturas electrónicas de compra (proveedores)', 'Cuentas de cobro de personal independiente', 'Soportes de pago a proveedores y personal', 'Comisiones y gastos bancarios / pasarela', 'Gastos fijos (software, arriendo, servicios)', 'Caja menor (recibos)'])),
  B.h('3. Nómina y seguridad social'),
  B.tabla(colsEnt, docs(['Planilla PILA pagada', 'Nómina electrónica del mes', 'Novedades (ingresos, retiros, incapacidades)'])),
  B.h('4. Bancos'),
  B.tabla(colsEnt, docs(['Extractos de todas las cuentas', 'Conciliación bancaria', 'Movimientos sin soporte (explicar)'])),
  B.h('5. Impuestos y otros'),
  B.tabla(colsEnt, docs(['Retenciones en la fuente practicadas', 'Base de IVA generado y descontable', 'Contratos firmados en el mes', 'Otros: [describir]'])),
  B.h('Resumen del mes'),
  B.campos([['Total ingresos', '$'], ['Total egresos', '$'], ['Saldo en bancos al cierre', '$'], ['Cartera por cobrar', '$']], 4),
  B.h('Observaciones'), B.recuadro(900),
  B.firmas([['[Nombre]', 'Entrega · Cenova S.A.S.', ''], ['[Nombre]', 'Recibe · Contador(a)', 'T.P. [número]']])
]]);

/* 11 · Carta / comunicado con membrete */
lista.push(['CNV-FR-11_Carta-con-membrete.docx', 'CNV-FR-11', 'Carta con membrete', [
  B.vacio(200),
  B.p('[Ciudad], [dd de mes de aaaa]', { align: A.LEFT, after: 360 }),
  B.p('Señores', { align: A.LEFT, after: 0 }),
  B.p('[NOMBRE DE LA EMPRESA O PERSONA]', { align: A.LEFT, after: 0, bold: true }),
  B.p('[Nombre del contacto] · [Cargo]', { align: A.LEFT, after: 0 }),
  B.p('[Dirección] · [Ciudad]', { align: A.LEFT, after: 300 }),
  B.p([B.run('Asunto: ', { bold: true, color: B.NAVY })].concat(B.runs('[Asunto de la carta]', { bold: true })), { align: A.LEFT, after: 300 }),
  B.p('Respetados señores:', { align: A.LEFT, after: 200 }),
  B.p('[Primer párrafo: motivo de la comunicación.]'),
  B.p('[Segundo párrafo: detalle, condiciones o información que se entrega.]'),
  B.p('[Párrafo de cierre: lo que se espera del destinatario o los datos de contacto.]', { after: 300 }),
  B.p('Cordialmente,', { align: A.LEFT, after: 0 }),
  B.vacio(700),
  B.p([B.run('[Nombre]', { bold: true })], { align: A.LEFT, after: 0 }),
  B.p('[Cargo] · Cenova S.A.S.', { align: A.LEFT, after: 0, color: B.MUTED }),
  B.p(B.EMPRESA.email + ' · ' + B.EMPRESA.tel, { align: A.LEFT, after: 300, color: B.MUTED }),
  B.p('Anexos: [número y descripción, o "Ninguno"]', { align: A.LEFT, size: 18, color: B.MUTED })
]]);

(async () => {
  for (const [archivo, cod, tit, hijos] of lista) { await B.guardar(archivo, cod, tit, hijos); console.log('ok', archivo); }
})();
