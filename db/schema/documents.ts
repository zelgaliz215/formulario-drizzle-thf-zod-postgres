import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import {
  tipoDocumentoEnum,
  estadoDocumentoEnum,
  prioridadDocumentoEnum,
} from "./enums";

/* 
La form a de crear tablas en drizzle es la siguiente:
export const nombre_tabla (En typescript) = pgTable('nombre_tabla' (En postgres), {
    nombre_columna (En typescript): tipo_de_dato_en_postgres(parametros nombre de la columna en postgres y parametros de la funcion del tipo de dato),
})
*/

export const documentos = pgTable("documentos", {
  // Identificador Unico
  id: uuid("id").defaultRandom().primaryKey(),

  // Codigo unico del documento
  codigo: varchar("codigo", { length: 20 }).notNull().unique(),

  // Titulo descriptivo
  titulo: varchar("titulo", { length: 200 }).notNull(),

  // Descripcion extendida(opcional)
  descripcion: text("descripcion"),

  // Tipo de documento(enum)
  tipo: tipoDocumentoEnum("tipo").notNull(),

  // Estado actual del documento(enum)
  estado: estadoDocumentoEnum("estado").notNull().default("borrador"),

  // Fecha de expedicion
  fechaExpedicion: date("fecha_expedicion", { mode: "string" }).notNull(),

  // Fecha de vencimiento (opcional)
  fechaVencimiento: date("fecha_vencimiento", { mode: "string" }),

  // Numero de folios
  numeroFolios: integer("numero_folios").notNull().default(1),

  // Es documento confidencial
  esConfidencial: boolean("es_confidencial").notNull().default(false),

  // Prioridad del documento(enum)
  prioridad: prioridadDocumentoEnum("prioridad").notNull().default("media"),

  // Etiquetas (array de texto)
  etiquetas: text("etiquetas").array(),

  // Ruta del archivo adjunto
  archivoAdjunto: varchar("archivo_adjunto", { length: 500 }),

  // Nombre original del archivo
  archivoNombre: varchar("archivo_nombre", { length: 255 }),

  // Tipo MIME del archivo
  archivoTipo: varchar("archivo_tipo", { length: 100 }),

  // Tamaño del archivo en bytes
  archivoTamanio: integer("archivo_tamanio"),

  // observaciones adicionales
  observaciones: text("observaciones"),

  // Contraseña para documentos protegidos (hash)
  passwordHash: varchar("password_hash", { length: 255 }),

  // Timestamps automaticos
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Tipos inferidos automáticamente por Drizzle
// Estos tipos reflejan exactamente la estructura de la tabla

// Tipo para SELECT (lo que obtienes al consultar)
export type Documento = typeof documentos.$inferSelect;

// Tipo para INSERT (lo que envías al crear)
export type NuevoDocumento = typeof documentos.$inferInsert;
