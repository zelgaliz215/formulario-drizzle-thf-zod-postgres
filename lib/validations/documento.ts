import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { documentos, TIPO_DOCUMENTO, ESTADO_DOCUMENTO } from "@/db/schema";

// Esta es la forma de generar los schemas automaticamente desde Drizzle
// Con esto se valida que la informacion que se almacena en la base de datos sea la correcta
// Y que la informacion que se recibe sea la correcta

//------------------------------------------------
// Schemas generados automaticamente desde Drizzle
//------------------------------------------------

// Schema base para INSERT (Crear documentos a la base de datos)
const insertSchemaBase = createInsertSchema(documentos);

// Schema base para SELECT (Obtener documentos de la base de datos)
const selectSchemaBase = createSelectSchema(documentos);

//------------------------------------------------
//Constantes de validación
//------------------------------------------------

export const VALIDACION = {
  CODIGO: {
    MIN: 3,
    MAX: 20,
    PATTERN: /^[A-Z]{2,5}-\d{4}-\d{3,5}$/,
    PATTERN_MESSAGE: "Formato inválido. Use: XXX-YYYY-NNN (ej: RES-2024-001)",
  },
  TITULO: {
    MIN: 5,
    MAX: 200,
  },
  DESCRIPCION: {
    MAX: 2000,
  },
  OBSERVACIONES: {
    MAX: 1000,
  },
  FOLIOS: {
    MIN: 1,
    MAX: 9999,
  },
  PASSWORD: {
    MIN: 8,
    MAX: 100,
  },
  ARCHIVO: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    TIPOS_PERMITIDOS: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    EXTENSIONES: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"],
  },
  ETIQUETAS: {
    MAX_CANTIDAD: 10,
    MAX_LONGITUD: 30,
  },
} as const;

// ============================================
// Mensajes de error personalizados
// ============================================

const MENSAJES = {
  required: "Este campo es requerido",
  codigo: {
    min: `El código debe tener mínimo ${VALIDACION.CODIGO.MIN} caracteres`,
    max: `El código debe tener máximo ${VALIDACION.CODIGO.MIN} caracteres`,
    format: VALIDACION.CODIGO.PATTERN_MESSAGE,
  },
  titulo: {
    min: `El título debe tener mínimo ${VALIDACION.TITULO.MIN} caracteres`,
    max: `El título debe tener máximo ${VALIDACION.TITULO.MAX} caracteres`,
  },
  descripcion: {
    max: `La descripción debe tener máximo ${VALIDACION.DESCRIPCION.MAX} caracteres`,
  },
  folio: {
    min: `El número de folios debe tener mínimo ${VALIDACION.FOLIOS.MIN} folios`,
    max: `El número de folios debe tener máximo ${VALIDACION.FOLIOS.MAX} folios`,
  },
  fechaVencimiento: {
    invalid:
      "La fecha de vencimiento debe ser posterior a la fecha de expedición",
  },
  password: {
    min: `La contraseña debe tener mínimo ${VALIDACION.PASSWORD.MIN} caracteres`,
  },
  archivo: {
    size: `El archivo no debe superar ${VALIDACION.ARCHIVO.MAX_SIZE / 1024 / 1024}MB`,
    type: `Tipos permitidos: ${VALIDACION.ARCHIVO.EXTENSIONES.join(", ")}`,
  },
  etiquetas: {
    max: `Máximo ${VALIDACION.ETIQUETAS.MAX_CANTIDAD} etiquetas`,
    longitud: `Cada etiqueta máximo ${VALIDACION.ETIQUETAS.MAX_LONGITUD} caracteres`,
  },
};

//------------------------------------------------
// Schema para crear documentos
//------------------------------------------------

export const crearDocumentoSchema = z
  .object({
    // Código único con formato especifico
    codigo: z
      .string({ error: MENSAJES.required })
      .min(VALIDACION.CODIGO.MIN, MENSAJES.codigo.min)
      .max(VALIDACION.CODIGO.MAX, MENSAJES.codigo.max)
      .regex(VALIDACION.CODIGO.PATTERN, MENSAJES.codigo.format)
      .transform((val) => val.toUpperCase()),
    // Titulo del documento
    titulo: z
      .string({ error: MENSAJES.required })
      .min(VALIDACION.TITULO.MIN, MENSAJES.titulo.min)
      .max(VALIDACION.TITULO.MAX, MENSAJES.titulo.max)
      .transform((val) => val?.trim() || null),
    // Descripción opcional
    descripcion: z
      .string()
      .max(VALIDACION.DESCRIPCION.MAX, MENSAJES.descripcion.max)
      .nullable()
      .optional()
      .transform((val) => val?.trim || null),

    // Tipo de documento (enum)
    /*   tipo: z.enum(TIPO_DOCUMENTO, {
    error: (issue) => {
      // 1. Si no se envía nada (undefined) o el select envía un string vacío ("")
    if (issue.input === undefined || issue.input === "") {
        return MENSAJES.required;
    }

      // 2. Si se envía cualquier otra cosa que no esté en el array
    return "Seleccione un tipo válido";
    },
  }), */

    tipo: z.enum(TIPO_DOCUMENTO, {
      error: (issue) =>
        // 1. Si no se envía nada (undefined) o el select envía un string vacío ("")
        issue.input === undefined || issue.input === ""
          ? MENSAJES.required
          : "Seleccione un tipo válido",
    }),

    // Estado del documento
    estado: z.enum(ESTADO_DOCUMENTO).default("borrador"),

    // Fecha de expedición (requerida)
    fechaExpedicion: z
      .string({ error: MENSAJES.required })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),

    // Fecha de vencimiento (opcional)
    fechaVencimiento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido")
      .nullable()
      .optional()
      .transform((val) => val || null),

    // Número de folios
    numeroFolios: z
      .number({
        error: MENSAJES.required,
      })
      .int("Debe ser un número entero")
      .min(VALIDACION.FOLIOS.MIN, MENSAJES.folio.min)
      .max(VALIDACION.FOLIOS.MAX, MENSAJES.folio.max)
      .default(1),

    // ¿Es confidencial?
    esConfidencial: z.boolean().default(false),

    // Prioridad (enum)
    prioridad: z.enum(["baja", "media", "alta", "urgente"]).default("media"),

    // Etiquetas (array de strings)
    etiquetas: z
      .array(
        z
          .string()
          .max(VALIDACION.ETIQUETAS.MAX_LONGITUD, MENSAJES.etiquetas.longitud),
      )
      .max(VALIDACION.ETIQUETAS.MAX_CANTIDAD, MENSAJES.etiquetas.max)
      .nullable()
      .optional()
      .transform((val) => val?.filter((tag) => tag.trim() !== "") || null),

    // Campos de archivo (se llenan después del upload)
    archivoAdjunto: z.string().nullable().optional(),
    archivoNombre: z.string().nullable().optional(),
    archivoTipo: z.string().nullable().optional(),
    archivoTamanio: z.number().nullable().optional(),

    // Observaciones
    observaciones: z
      .string()
      .max(VALIDACION.OBSERVACIONES.MAX)
      .nullable()
      .optional()
      .transform((val) => val?.trim() || null),

    // Password para documentos protegidos
    password: z
      .string()
      .min(VALIDACION.PASSWORD.MIN, MENSAJES.password.min)
      .max(VALIDACION.PASSWORD.MAX)
      .nullable()
      .optional()
      .transform((val) => val || null),

    //-----------
  })
  // Validación cruzada de fechas
  .refine(
    (data) => {
      if (!data.fechaVencimiento || data.fechaVencimiento === "") return true;
      return new Date(data.fechaVencimiento) > new Date(data.fechaExpedicion);
    },
    {
      message:
        "La fecha de vencimiento debe ser posterior a la fecha de expedición",
      path: ["fechaVencimiento"],
    },
  );
//---------------

// ============================================
// Schema para ACTUALIZAR documento (parcial)
// ============================================

// Para actualizar, todos los campos son opcionales excepto validaciones
export const actualizarDocumentoSchema = crearDocumentoSchema.partial().extend({
  // El ID es requerido para actualizar
  id: z.string().uuid("ID inválido"),
});

// ============================================
// Schema para validar archivo antes de upload
// ============================================

export const archivoSchema = z.object({
  nombre: z.string(),
  tipo: z
    .string()
    .refine(
      (tipo) =>
        (VALIDACION.ARCHIVO.TIPOS_PERMITIDOS as readonly string[]).includes(
          tipo,
        ),
      MENSAJES.archivo.type,
    ),
  tamanio: z.number().max(VALIDACION.ARCHIVO.MAX_SIZE, MENSAJES.archivo.size),
});

// ============================================
// Schema para filtros de búsqueda
// ============================================

export const filtrosDocumentoSchema = z.object({
  busqueda: z.string().optional(),
  tipo: z
    .enum(["resolucion", "circular", "memorando", "acta", "informe", "otro"])
    .optional(),
  estado: z
    .enum(["borrador", "revision", "aprobado", "archivado", "anulado"])
    .optional(),
  prioridad: z.enum(["baja", "media", "alta", "urgente"]).optional(),
  esConfidencial: z.boolean().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});

// ============================================
// Tipos inferidos desde los schemas
// ============================================

// Tipo para los datos del formulario de creación
export type CrearDocumentoInput = z.input<typeof crearDocumentoSchema>;

// Tipo para los datos validados (después de transformaciones)
export type CrearDocumentoOutput = z.output<typeof crearDocumentoSchema>;

// Tipo para actualización
export type ActualizarDocumentoInput = z.input<
  typeof actualizarDocumentoSchema
>;
export type ActualizarDocumentoOutput = z.output<
  typeof actualizarDocumentoSchema
>;

// Tipo para archivo
export type ArchivoInput = z.infer<typeof archivoSchema>;

// Tipo para filtros
export type FiltrosDocumento = z.infer<typeof filtrosDocumentoSchema>;
