# Intranet Cenova

Panel de seguimiento gerencial de **Cenova S.A.S.**: cotizaciones, órdenes de compra, proyectos, clientes, agenda, cronograma, estadísticas y finanzas (solo administración). Queda en **https://intranet.cenovasas.com** y solo entra el equipo.

Todo corre en **Cloudflare**, con plan gratuito:

| Pieza | Dónde |
|---|---|
| Servidor + página | Cloudflare Worker `intranet-cenova` (`worker/index.js` + carpeta `web/`) |
| Base de datos | Cloudflare D1 `intranet-cenova` (esquema en `migrations/`) |
| Correos (apoyo y resumen diario 6:45 a. m.) | Resend, desde `notificaciones@intranet.cenovasas.com` |
| Lectura de PDFs con IA | API de Anthropic |

## Seguridad

| Qué | Cómo se protege |
|---|---|
| Acceso a la página | Sin sesión, el servidor solo entrega la pantalla de ingreso. El panel y sus datos nunca salen del servidor sin sesión válida. |
| Contraseñas | Se guardan cifradas con HMAC-SHA256 (clave secreta del servidor `PEPPER`) + PBKDF2-SHA256 con sal por usuario (10.000 iteraciones, ajustado al límite de CPU del plan gratuito; con Workers Paid se puede subir `ITERACIONES`). Ni siquiera con una copia de la base de datos se pueden descifrar sin esa clave. |
| Primer ingreso | Las contraseñas iniciales viven en un secreto (`CLAVES_INICIALES`), nunca en el código. Al entrar, cada persona debe crear la suya: mínimo 10 caracteres, con letras y números, sin contener el usuario. |
| Sesión | Cookie `HttpOnly`, `Secure` y `SameSite=Strict`, más una clave por pestaña. Una ventana o pestaña nueva pide ingresar otra vez. El servidor cierra la sesión tras 15 min sin actividad y a las 12 h como máximo. |
| Intentos fallidos | Con 5 intentos seguidos la cuenta se bloquea 15 minutos. El mensaje nunca dice si el usuario existe. |
| Reglas de datos | Los números COT y OC no se pueden cambiar. Las órdenes de compra no se borran (solo administración). Importar respaldos es solo para administración. Cada cambio queda en la tabla `auditoria`. |
| Correo | Solo se puede enviar a correos del equipo, así que nadie puede usar la intranet para mandar spam. |
| Navegador | Política de contenido (CSP), HSTS, bloqueo de marcos (anti-clickjacking) y protección CSRF. |

## Finanzas (solo administración)

Sección del menú visible solo para usuarios con `admin = 1`. El servidor no envía las colecciones financieras a nadie más (ni siquiera en `/api/sync`) y rechaza cualquier escritura o borrado que no venga de administración.

| Colección | Qué guarda |
|---|---|
| `finMovimientos` | Entradas, salidas y transferencias de dinero (pagadas o pendientes). Una salida ligada a un proyecto es costo directo de ese proyecto; sin proyecto es gasto operativo. |
| `finGastosFijos` | Gastos recurrentes (Google Workspace, dominio, contador…) con frecuencia y día de pago. Cada pago se registra como movimiento con `gastoFijoId` y `periodo`. |
| `finAjustes` (doc `general`) | Cuentas con saldo inicial y fecha, meta de margen y margen mínimo. |

Los pagos de clientes **no** se registran en Finanzas: se leen de la sección Pagos de cada orden de compra para no duplicarlos. Pestañas: Resumen (saldo, indicadores, puntos de mejora), Movimientos (con exportación a CSV), Gastos fijos, Rentabilidad (estado de resultados, por proyecto estimado vs. real, por cotización con precio mínimo para la meta, por tipo de ítem), Proyección a 6 meses y Cuentas y metas.

## Precios (lista de precios estándar)

Menú **Precios**, visible para todo el equipo (colección `precios`). Administración crea, edita y borra; el resto solo puede actualizar el `stock` y el contenido de los kits (`componentes`). El servidor rechaza cualquier otro cambio.

| Tipo | Qué guarda |
|---|---|
| `instalacion` | Los servicios de instalación (con alturas y en piso): texto para el cliente, % de administración, % de imprevistos y margen. |
| `personal` | Personal de apoyo por tipo (técnico, auxiliar, soldador…): día técnico, comida y transporte por día. |
| `logistica` | Camioneta, herramientas, EPP y línea de vida: costo por día, por persona-día o global. |
| `servicio`, `material`, `equipo` | Costo, margen y (materiales y equipos) stock. |
| `kit` | Kits de instalación: su costo es la suma de los materiales que llevan. |

El margen es sobre el precio de venta, igual que en Finanzas: precio = costo ÷ (1 − margen). En la cotización, "+ Desde Precios" agrega el ítem con su costo y margen ya calculados (el costo y el precio quedan bloqueados; solo se ajusta el margen). Los servicios de instalación abren una calculadora (personal, logística, kits y materiales + administración + imprevistos) y salen como una sola línea. En modo AIU el servicio queda a costo directo y la administración, los imprevistos y la utilidad van en la línea del AIU. Cada cotización compara el margen fijado en Precios con el cotizado. Las cotizaciones creadas desde el 2026-10-02 usan margen sobre la venta (`margenSobreVenta`); las anteriores conservan el recargo sobre el costo.

## Usuarios

| Usuario | Correo | Rol |
|---|---|---|
| `Lmgiraldo` | gerencia@cenovasas.com | Administración |
| `Amberrocal` | aberrocal@cenovasas.com | Equipo |
| `Jlcantillo` | jcantillo@cenovasas.com | Equipo |

Para agregar a alguien:
1. Cloudflare → D1 → `intranet-cenova` → Console, y ejecuta:
   `INSERT INTO usuarios (id, nombre, email) VALUES ('usuario', 'Nombre', 'correo@cenovasas.com');`
2. Agrega su contraseña inicial al secreto `CLAVES_INICIALES`.

Para quitarle el acceso a alguien: `UPDATE usuarios SET activo = 0 WHERE id = 'usuario';`

---

## Puesta en marcha (una sola vez)

La base de datos D1 `intranet-cenova` ya está creada y tiene las tablas y los usuarios.

### 1. Publicar el Worker desde GitHub
1. Cloudflare → **Workers & Pages → Create → Import a repository**.
2. Conecta GitHub y elige `linagiraldoch/intranet-cenova`.
3. Nombre del proyecto: `intranet-cenova`. Deja el comando de despliegue en `npx wrangler deploy` → **Deploy**.
4. El dominio `intranet.cenovasas.com` se configura solo (está en `wrangler.toml`). Desde ahí, cada cambio que se suba a GitHub se publica automáticamente.

### 2. Secretos
En el Worker: **Settings → Variables and Secrets → Add** (tipo **Secret**):

| Nombre | Valor |
|---|---|
| `PEPPER` | Un texto largo y aleatorio (40 caracteres o más), por ejemplo de un generador de contraseñas. **No lo cambies después**, porque invalidaría todas las contraseñas. |
| `CLAVES_INICIALES` | `{"lmgiraldo":"...","amberrocal":"...","jlcantillo":"..."}` con la contraseña del primer ingreso de cada uno |
| `RESEND_API_KEY` | Clave de https://resend.com (ver paso 3) |
| `ANTHROPIC_API_KEY` | Clave de https://console.anthropic.com → API Keys |

### 3. Correo con Resend
1. Crea una cuenta en https://resend.com.
2. **Domains → Add domain → `intranet.cenovasas.com`** y usa "Configuración automática" (Cloudflare). Si algún registro no se crea solo, agrégalo en Cloudflare → DNS con el proxy apagado (nube gris, "Solo DNS"). Los correos salen de `notificaciones@intranet.cenovasas.com` y no se tocan los registros de Gmail.
3. En **API Keys → Create**, copia la clave en el secreto `RESEND_API_KEY`.

### 4. Primer ingreso
1. Entra a https://intranet.cenovasas.com con `Lmgiraldo` y la contraseña inicial.
2. Crea tu contraseña nueva cuando te la pida.
3. Menú lateral → **Importar respaldo de datos** → elige `respaldo-cenova-AAAA-MM-DD.json`. Ese archivo **no** va en el repositorio.

### 5. (Recomendado) Límite de intentos por IP
Cloudflare → `cenovasas.com` → **Security → WAF → Rate limiting rules** → crea una regla para la ruta `/api/login`: máximo 10 solicitudes por minuto por IP y bloquear 10 minutos.

---

## Desarrollo local

```bash
npm install
npx wrangler d1 migrations apply intranet-cenova --local
printf 'PEPPER="local"\nCLAVES_INICIALES={"lmgiraldo":"Lmgiraldo"}\n' > .dev.vars
npx wrangler dev
```
