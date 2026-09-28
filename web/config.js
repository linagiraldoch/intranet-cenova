/*
 * Configuración de la Intranet Cenova.
 *
 * Estos datos NO son secretos: Firebase los diseñó para ir en la página.
 * La seguridad la ponen las reglas de Firestore (firestore.rules) y las
 * funciones del servidor, que solo dejan pasar a los usuarios del equipo.
 *
 * Reemplaza los valores de "firebase" con los de tu proyecto:
 * Firebase console → ⚙ Configuración del proyecto → Tus apps → App web → Configuración del SDK.
 */
window.CENOVA_CONFIG = {
  firebase: {
    apiKey: "PEGAR_AQUI",
    authDomain: "PEGAR_AQUI.firebaseapp.com",
    projectId: "PEGAR_AQUI",
    storageBucket: "PEGAR_AQUI.appspot.com",
    messagingSenderId: "PEGAR_AQUI",
    appId: "PEGAR_AQUI"
  },

  /* Región donde se publican las funciones del servidor (correo, lectura de PDF). */
  region: "us-central1",

  /* Usuario de ingreso → correo con el que existe en Firebase Authentication.
     "admin" puede importar respaldos. */
  usuarios: {
    lmgiraldo:  { email: "gerencia@cenovasas.com",  nombre: "Lina Giraldo",   admin: true },
    amberrocal: { email: "aberrocal@cenovasas.com", nombre: "Ángel Berrocal" },
    jlcantillo: { email: "jcantillo@cenovasas.com", nombre: "Jorge Cantillo" }
  },

  /* Minutos sin actividad antes de cerrar la sesión. */
  inactividadMin: 15
};
