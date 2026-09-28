# Intranet Cenova

Panel de seguimiento gerencial de **Cenova S.A.S.**: cotizaciones, órdenes de compra, proyectos, clientes, agenda, cronograma y estadísticas. El acceso está restringido a los usuarios del equipo.

- **Página:** `web/`, publicada en GitHub Pages → `https://linagiraldoch.github.io/intranet-cenova/`
- **Usuarios y base de datos:** Firebase Authentication + Cloud Firestore
- **Servidor:** Cloud Functions (`functions/`). Envía los correos de apoyo y el resumen diario, y lee PDFs con IA.

## Seguridad

| Qué | Cómo se protege |
|---|---|
| Contraseñas | Firebase las guarda cifradas en su servidor y nunca están en el código. En el primer ingreso cada persona debe crear su propia clave (mínimo 10 caracteres, con letras y números, sin contener el usuario). |
| Datos | Las reglas de `firestore.rules` solo dejan leer y escribir a los 3 correos del equipo con sesión iniciada. Cualquier otra persona recibe "acceso denegado", aunque tenga la página abierta o intente entrar directo a la base de datos. |
| Números COT / OC | Las reglas impiden cambiarlos una vez asignados. Las órdenes de compra no se pueden borrar, solo anular. |
| Claves de Anthropic y Gmail | Se guardan en Secret Manager de Google. Nunca llegan al navegador ni al repositorio. |
| Correo | Solo se puede enviar a correos del equipo, así que nadie puede usar la intranet para mandar spam. |
| Sesión | Se cierra al cerrar la pestaña o tras 15 minutos sin actividad, con un aviso 1 minuto antes. |
| Intentos fallidos | Firebase bloquea la cuenta unos minutos si hay muchos intentos seguidos. El mensaje de error nunca dice si el usuario existe. |
| Conexión | Todo va por HTTPS. La página trae una política de contenido (CSP) que limita desde dónde se cargan scripts. |

> Los valores de `web/config.js` (apiKey, projectId…) **no son secretos**. Firebase los diseñó para ir en la página. La protección real son las reglas y las funciones.

## Usuarios

| Usuario | Correo en Firebase | Rol |
|---|---|---|
| `Lmgiraldo` | gerencia@cenovasas.com | Administración (puede importar respaldos) |
| `Amberrocal` | aberrocal@cenovasas.com | Equipo |
| `Jlcantillo` | jcantillo@cenovasas.com | Equipo |

El usuario no distingue mayúsculas y minúsculas. Para agregar a alguien hay que tocar 3 cosas: `web/config.js`, las dos listas de `firestore.rules` y la lista `EQUIPO` de `functions/index.js`. Luego se crea el usuario en Firebase.

---

## Instalación paso a paso

### 1. Crear el proyecto de Firebase
1. Entra a https://console.firebase.google.com con la cuenta de Google de Cenova.
2. **Agregar proyecto** → nombre `intranet-cenova` → desactiva Google Analytics → Crear.

### 2. Usuarios (Authentication)
1. **Compilación → Authentication → Comenzar** → habilita **Correo electrónico/contraseña**.
2. En la pestaña **Usuarios → Agregar usuario**, crea los 3 correos de la tabla con su contraseña inicial.
3. En **Configuración → Acciones del usuario**, **desmarca "Habilitar la creación (registro)"**. Así nadie puede crearse una cuenta por su cuenta.
4. En **Configuración → Dominios autorizados**, agrega `linagiraldoch.github.io`.

### 3. Base de datos (Firestore)
**Compilación → Firestore Database → Crear base de datos** → ubicación `southamerica-east1 (São Paulo)` → **Modo de producción**.

### 4. Conectar la página
**⚙ Configuración del proyecto → Tus apps → `</>` (Web)** → nombre `intranet` → copia el bloque `firebaseConfig` y pégalo en `web/config.js`.

### 5. Plan Blaze (necesario para las funciones del servidor)
**Actualizar → Blaze (pago por uso)**. Con el uso de 3 personas queda dentro de la capa gratuita. Aun así, crea una **alerta de presupuesto** de US$5 para que te avise si algo cambia.

### 6. Claves secretas
- **Anthropic** (lectura de PDFs): https://console.anthropic.com → API Keys → Create Key.
- **Gmail** (correos desde gerencia@cenovasas.com): activa la verificación en dos pasos en esa cuenta. Luego entra a https://myaccount.google.com/apppasswords y crea una contraseña de aplicación llamada "Intranet".

### 7. Publicar reglas y funciones (desde Google Cloud Shell, en el navegador)
Abre https://shell.cloud.google.com y ejecuta:

```bash
git clone https://github.com/linagiraldoch/intranet-cenova.git
cd intranet-cenova
(cd functions && npm install)
npx firebase-tools login --no-localhost
npx firebase-tools use --add          # elige el proyecto intranet-cenova, alias: default
npx firebase-tools functions:secrets:set ANTHROPIC_API_KEY    # pega la clave de Anthropic
npx firebase-tools functions:secrets:set GMAIL_APP_PASSWORD   # pega la contraseña de aplicación de Gmail
npx firebase-tools deploy --only firestore:rules,functions
```

### 8. Publicar la página
En GitHub: **Settings → Pages → Source: GitHub Actions**. Cada cambio en `web/` se publica solo.

### 9. Primer ingreso
1. Entra a `https://linagiraldoch.github.io/intranet-cenova/` con `Lmgiraldo` y la contraseña inicial.
2. Crea tu contraseña nueva cuando te la pida.
3. Menú lateral → **Importar respaldo de datos** → elige el archivo `respaldo-cenova-AAAA-MM-DD.json`. Ese archivo **no** va en el repositorio: guárdalo en un lugar privado.

---

## Desarrollo local (opcional)

```bash
(cd functions && npm install)
npx firebase-tools emulators:start --project demo-cenova --only auth,firestore,functions
```
En `web/config.js` agrega `emulador: {host:"127.0.0.1", auth:9099, firestore:8080, functions:5001}` y sirve la carpeta `web/` con cualquier servidor estático.
