-- Intranet Cenova — esquema de la base de datos (Cloudflare D1).
-- Las contraseñas NO están aquí: el primer ingreso usa el secreto CLAVES_INICIALES
-- y obliga a cada persona a crear la suya.

CREATE TABLE IF NOT EXISTS usuarios (
  id              TEXT PRIMARY KEY,          -- el usuario en minúsculas (lmgiraldo…)
  nombre          TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  admin           INTEGER NOT NULL DEFAULT 0,
  activo          INTEGER NOT NULL DEFAULT 1,
  hash            TEXT,                      -- PBKDF2-SHA256 (base64) de HMAC(PEPPER, clave)
  sal             TEXT,
  iteraciones     INTEGER,
  debe_cambiar    INTEGER NOT NULL DEFAULT 1,
  tema            TEXT NOT NULL DEFAULT 'light',
  intentos        INTEGER NOT NULL DEFAULT 0,
  bloqueado_hasta INTEGER NOT NULL DEFAULT 0,
  ultimo_ingreso  INTEGER,
  clave_cambiada  INTEGER
);

CREATE TABLE IF NOT EXISTS sesiones (
  token_hash  TEXT PRIMARY KEY,              -- SHA-256 del token de la cookie
  pestana_hash TEXT NOT NULL,                -- SHA-256 de la clave de pestaña
  usuario_id  TEXT NOT NULL REFERENCES usuarios(id),
  creada      INTEGER NOT NULL,
  actividad   INTEGER NOT NULL,
  expira      INTEGER NOT NULL,
  ip          TEXT,
  agente      TEXT
);
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones(usuario_id);

-- Todos los registros del panel (cotizaciones, órdenes, eventos…) como documentos JSON.
CREATE TABLE IF NOT EXISTS docs (
  col             TEXT NOT NULL,
  id              TEXT NOT NULL,
  data            TEXT NOT NULL,
  actualizado     INTEGER NOT NULL,
  actualizado_por TEXT,
  PRIMARY KEY (col, id)
);
CREATE INDEX IF NOT EXISTS idx_docs_actualizado ON docs(actualizado);

CREATE TABLE IF NOT EXISTS borrados (
  col TEXT NOT NULL, id TEXT NOT NULL, ts INTEGER NOT NULL, usuario TEXT,
  PRIMARY KEY (col, id)
);
CREATE INDEX IF NOT EXISTS idx_borrados_ts ON borrados(ts);

-- Registro de quién hizo qué (no se puede editar desde la intranet).
CREATE TABLE IF NOT EXISTS auditoria (
  ts INTEGER NOT NULL, usuario TEXT, accion TEXT NOT NULL, col TEXT, doc_id TEXT, detalle TEXT, ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_auditoria_ts ON auditoria(ts);

INSERT OR IGNORE INTO usuarios (id, nombre, email, admin) VALUES
  ('lmgiraldo',  'Lina Giraldo',   'gerencia@cenovasas.com',  1),
  ('amberrocal', 'Ángel Berrocal', 'aberrocal@cenovasas.com', 0),
  ('jlcantillo', 'Jorge Cantillo', 'jcantillo@cenovasas.com', 0);
