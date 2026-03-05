// PostgreSQL soporta tipos ENUM nativos, que son más eficientes que strings y garantizan integridad de datos.
import { pgEnum } from "drizzle-orm/pg-core";
import { type } from "os";

// Tipo de documento
export const tipoDocumentoEnum = pgEnum("tipo_documento", [
  "resolucion",
  "circular",
  "memorando",
  "acta",
  "informe",
  "otro",
]);

// Estado del documento
export const estadoDocumentoEnum = pgEnum("estado_documento", [
  "borrador",
  "revision",
  "aprobado",
  "archivado",
  "anulado",
]);

// Prioridad del documento
export const prioridadDocumentoEnum = pgEnum("pioridad_document", [
  "baja",
  "media",
  "alta",
  "urgente",
]);

// Exportación de los tipos TypeScript inferidos de los enums
// Estos tipos se pueden usar en toda la aplicación

//?que hace esta linea = Saca el tipo de cada uno de los elementos
export type TipoDocumento = (typeof tipoDocumentoEnum.enumValues)[number];
export type EstadoDocumento = (typeof estadoDocumentoEnum.enumValues)[number];
export type PrioridadDocumento =
  (typeof prioridadDocumentoEnum.enumValues)[number];
