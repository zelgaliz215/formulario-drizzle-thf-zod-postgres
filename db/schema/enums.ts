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


// Arreglo para usar en selects/radios del formulario
export const TIPO_DOCUMENTO = tipoDocumentoEnum.enumValues;
export const ESTADO_DOCUMENTO = estadoDocumentoEnum.enumValues;
export const PRIORIDAD_DOCUMENTO = prioridadDocumentoEnum.enumValues;

// Labels amigables para mostrar en la UI
export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  resolucion: 'Resolución',
  circular: 'Circular',
  memorando: 'Memorando',
  acta: 'Acta',
  informe: 'Informe',
  otro: 'Otro',
};

export const ESTADO_DOCUMENTO_LABELS: Record<EstadoDocumento, string> = {
  borrador: 'Borrador',
  revision: 'En Revisión',
  aprobado: 'Aprobado',
  archivado: 'Archivado',
  anulado: 'Anulado',
};

export const PRIORIDAD_DOCUMENTO_LABELS: Record<PrioridadDocumento, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
};

/* 
**¿Por qué exportamos labels separados?**
Los enums en la BD usan valores simples (`resolucion`), 
pero en la UI queremos mostrar texto legible (`Resolución`). 
Mantener esto centralizado evita duplicación. 
*/

// Exportación de los tipos TypeScript inferidos de los enums
// Estos tipos se pueden usar en toda la aplicación

//?que hace esta linea = Saca el tipo de cada uno de los elementos
export type TipoDocumento = (typeof tipoDocumentoEnum.enumValues)[number];
export type EstadoDocumento = (typeof estadoDocumentoEnum.enumValues)[number];
export type PrioridadDocumento =
  (typeof prioridadDocumentoEnum.enumValues)[number];
