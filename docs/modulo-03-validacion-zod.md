# Módulo 3: Esquemas de Validación con Zod

## Objetivo del Módulo

Al finalizar este módulo tendrás:
- Esquemas Zod completos para la entidad Documento
- Validaciones para crear y actualizar (parciales)
- Integración con `drizzle-zod` para evitar duplicación
- Tipos TypeScript inferidos desde Zod
- Validaciones personalizadas (fechas, formatos, archivos)

---

## 3.1 ¿Por qué Zod + Drizzle?

Tenemos dos fuentes de "verdad" sobre la estructura de datos:

1. **Drizzle Schema**: Define la estructura en la base de datos
2. **Zod Schema**: Define validaciones y transformaciones

El problema es que mantener ambos sincronizados manualmente es propenso a errores. Aquí es donde `drizzle-zod` ayuda: **genera esquemas Zod base desde tu schema de Drizzle**.

Sin embargo, `drizzle-zod` genera validaciones básicas. Para validaciones más complejas (como "fecha de vencimiento debe ser mayor a fecha de expedición"), necesitamos extender estos esquemas.

### Estrategia que usaremos:

```
Drizzle Schema (DB)
       ↓
  drizzle-zod
       ↓
Zod Schema Base (auto-generado)
       ↓
  Extensiones manuales
       ↓
Zod Schema Final (con validaciones completas)
```

---

## 3.2 Crear el Schema Base con drizzle-zod

Crea el archivo `lib/validations/documento.ts`:

```typescript
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { documentos } from '@/db/schema';

// ============================================
// Schemas generados automáticamente desde Drizzle
// ============================================

// Schema base para INSERT (crear documento)
// drizzle-zod infiere los tipos y genera validaciones básicas
const insertSchemaBase = createInsertSchema(documentos);

// Schema base para SELECT (documento existente)
const selectSchemaBase = createSelectSchema(documentos);

// ============================================
// Constantes de validación
// ============================================

export const VALIDACION = {
  CODIGO: {
    MIN: 3,
    MAX: 20,
    // Formato: XXX-YYYY-NNN (ej: RES-2024-001)
    PATTERN: /^[A-Z]{2,5}-\d{4}-\d{3,5}$/,
    PATTERN_MESSAGE: 'Formato inválido. Use: XXX-YYYY-NNN (ej: RES-2024-001)',
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
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    EXTENSIONES: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'],
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
  required: 'Este campo es requerido',
  codigo: {
    min: `Mínimo ${VALIDACION.CODIGO.MIN} caracteres`,
    max: `Máximo ${VALIDACION.CODIGO.MAX} caracteres`,
    format: VALIDACION.CODIGO.PATTERN_MESSAGE,
  },
  titulo: {
    min: `Mínimo ${VALIDACION.TITULO.MIN} caracteres`,
    max: `Máximo ${VALIDACION.TITULO.MAX} caracteres`,
  },
  descripcion: {
    max: `Máximo ${VALIDACION.DESCRIPCION.MAX} caracteres`,
  },
  folios: {
    min: `Mínimo ${VALIDACION.FOLIOS.MIN} folio`,
    max: `Máximo ${VALIDACION.FOLIOS.MAX} folios`,
  },
  fechaVencimiento: {
    invalid: 'La fecha de vencimiento debe ser posterior a la fecha de expedición',
  },
  password: {
    min: `Mínimo ${VALIDACION.PASSWORD.MIN} caracteres`,
  },
  archivo: {
    size: `El archivo no debe superar ${VALIDACION.ARCHIVO.MAX_SIZE / 1024 / 1024}MB`,
    type: `Tipos permitidos: ${VALIDACION.ARCHIVO.EXTENSIONES.join(', ')}`,
  },
  etiquetas: {
    max: `Máximo ${VALIDACION.ETIQUETAS.MAX_CANTIDAD} etiquetas`,
    longitud: `Cada etiqueta máximo ${VALIDACION.ETIQUETAS.MAX_LONGITUD} caracteres`,
  },
} as const;

// ============================================
// Schema para CREAR documento
// ============================================

export const crearDocumentoSchema = z.object({
  // Código único con formato específico
  codigo: z
    .string({ required_error: MENSAJES.required })
    .min(VALIDACION.CODIGO.MIN, MENSAJES.codigo.min)
    .max(VALIDACION.CODIGO.MAX, MENSAJES.codigo.max)
    .regex(VALIDACION.CODIGO.PATTERN, MENSAJES.codigo.format)
    .transform((val) => val.toUpperCase()),

  // Título del documento
  titulo: z
    .string({ required_error: MENSAJES.required })
    .min(VALIDACION.TITULO.MIN, MENSAJES.titulo.min)
    .max(VALIDACION.TITULO.MAX, MENSAJES.titulo.max)
    .transform((val) => val.trim()),

  // Descripción opcional
  descripcion: z
    .string()
    .max(VALIDACION.DESCRIPCION.MAX, MENSAJES.descripcion.max)
    .nullable()
    .optional()
    .transform((val) => val?.trim() || null),

  // Tipo de documento (enum)
  tipo: z.enum(['resolucion', 'circular', 'memorando', 'acta', 'informe', 'otro'], {
    required_error: MENSAJES.required,
    invalid_type_error: 'Seleccione un tipo válido',
  }),

  // Estado del documento (enum)
  estado: z
    .enum(['borrador', 'revision', 'aprobado', 'archivado', 'anulado'])
    .default('borrador'),

  // Fecha de expedición (requerida)
  fechaExpedicion: z
    .string({ required_error: MENSAJES.required })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),

  // Fecha de vencimiento (opcional)
  fechaVencimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido')
    .nullable()
    .optional()
    .transform((val) => val || null),

  // Número de folios
  numeroFolios: z
    .number({ required_error: MENSAJES.required, invalid_type_error: 'Debe ser un número' })
    .int('Debe ser un número entero')
    .min(VALIDACION.FOLIOS.MIN, MENSAJES.folios.min)
    .max(VALIDACION.FOLIOS.MAX, MENSAJES.folios.max)
    .default(1),

  // ¿Es confidencial?
  esConfidencial: z.boolean().default(false),

  // Prioridad (enum)
  prioridad: z
    .enum(['baja', 'media', 'alta', 'urgente'])
    .default('media'),

  // Etiquetas (array de strings)
  etiquetas: z
    .array(
      z.string().max(VALIDACION.ETIQUETAS.MAX_LONGITUD, MENSAJES.etiquetas.longitud)
    )
    .max(VALIDACION.ETIQUETAS.MAX_CANTIDAD, MENSAJES.etiquetas.max)
    .nullable()
    .optional()
    .transform((val) => val?.filter((tag) => tag.trim() !== '') || null),

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
})
// Validación cruzada: fechaVencimiento > fechaExpedicion
.refine(
  (data) => {
    if (!data.fechaVencimiento) return true;
    return new Date(data.fechaVencimiento) > new Date(data.fechaExpedicion);
  },
  {
    message: MENSAJES.fechaVencimiento.invalid,
    path: ['fechaVencimiento'],
  }
);

// ============================================
// Schema para ACTUALIZAR documento (parcial)
// ============================================

// Para actualizar, todos los campos son opcionales excepto validaciones
export const actualizarDocumentoSchema = crearDocumentoSchema.partial().extend({
  // El ID es requerido para actualizar
  id: z.string().uuid('ID inválido'),
});

// ============================================
// Schema para validar archivo antes de upload
// ============================================

export const archivoSchema = z.object({
  nombre: z.string(),
  tipo: z
    .string()
    .refine(
      (tipo) => VALIDACION.ARCHIVO.TIPOS_PERMITIDOS.includes(tipo),
      MENSAJES.archivo.type
    ),
  tamanio: z
    .number()
    .max(VALIDACION.ARCHIVO.MAX_SIZE, MENSAJES.archivo.size),
});

// ============================================
// Schema para filtros de búsqueda
// ============================================

export const filtrosDocumentoSchema = z.object({
  busqueda: z.string().optional(),
  tipo: z.enum(['resolucion', 'circular', 'memorando', 'acta', 'informe', 'otro']).optional(),
  estado: z.enum(['borrador', 'revision', 'aprobado', 'archivado', 'anulado']).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']).optional(),
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
export type ActualizarDocumentoInput = z.input<typeof actualizarDocumentoSchema>;
export type ActualizarDocumentoOutput = z.output<typeof actualizarDocumentoSchema>;

// Tipo para archivo
export type ArchivoInput = z.infer<typeof archivoSchema>;

// Tipo para filtros
export type FiltrosDocumento = z.infer<typeof filtrosDocumentoSchema>;
```

---

## 3.3 Exportar Validaciones

Crea el archivo `lib/validations/index.ts`:

```typescript
// Schemas de documento
export {
  crearDocumentoSchema,
  actualizarDocumentoSchema,
  archivoSchema,
  filtrosDocumentoSchema,
  VALIDACION,
} from './documento';

// Tipos inferidos
export type {
  CrearDocumentoInput,
  CrearDocumentoOutput,
  ActualizarDocumentoInput,
  ActualizarDocumentoOutput,
  ArchivoInput,
  FiltrosDocumento,
} from './documento';
```

---

## 3.4 Helper para Procesar Errores de Zod

Crea el archivo `lib/validations/helpers.ts`:

```typescript
import { ZodError, ZodSchema } from 'zod';
import type { ActionResponse } from '@/types';

/**
 * Valida datos contra un schema Zod y retorna un ActionResponse tipado
 */
export function validarConSchema<T>(
  schema: ZodSchema<T>,
  data: unknown
): ActionResponse<T> {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof ZodError) {
      // Extraer errores por campo
      const fieldErrors: Record<string, string[]> = {};
      
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(err.message);
      });

      // Mensaje general con el primer error
      const primerError = error.errors[0];
      const mensaje = primerError 
        ? `${primerError.path.join('.')}: ${primerError.message}`
        : 'Error de validación';

      return {
        success: false,
        error: mensaje,
        fieldErrors,
      };
    }

    // Error inesperado
    return {
      success: false,
      error: 'Error de validación desconocido',
    };
  }
}

/**
 * Extrae errores de Zod en formato para React Hook Form
 * Útil cuando necesitas setear errores manualmente
 */
export function zodErrorsToFieldErrors(
  error: ZodError
): Record<string, { message: string }> {
  const fieldErrors: Record<string, { message: string }> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    // Solo guardamos el primer error por campo
    if (!fieldErrors[path]) {
      fieldErrors[path] = { message: err.message };
    }
  });

  return fieldErrors;
}

/**
 * Valida un archivo antes de subirlo
 */
export function validarArchivo(file: File): ActionResponse<{
  nombre: string;
  tipo: string;
  tamanio: number;
}> {
  const TIPOS_PERMITIDOS = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return {
      success: false,
      error: `Tipo de archivo no permitido. Use: PDF, JPG, PNG, WEBP, DOC, DOCX`,
    };
  }

  if (file.size > MAX_SIZE) {
    return {
      success: false,
      error: `El archivo excede el tamaño máximo de 10MB`,
    };
  }

  return {
    success: true,
    data: {
      nombre: file.name,
      tipo: file.type,
      tamanio: file.size,
    },
  };
}

/**
 * Formatea el tamaño de archivo para mostrar en UI
 */
export function formatearTamanioArchivo(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
```

Actualiza `lib/validations/index.ts`:

```typescript
// Schemas de documento
export {
  crearDocumentoSchema,
  actualizarDocumentoSchema,
  archivoSchema,
  filtrosDocumentoSchema,
  VALIDACION,
} from './documento';

// Tipos inferidos
export type {
  CrearDocumentoInput,
  CrearDocumentoOutput,
  ActualizarDocumentoInput,
  ActualizarDocumentoOutput,
  ArchivoInput,
  FiltrosDocumento,
} from './documento';

// Helpers de validación
export {
  validarConSchema,
  zodErrorsToFieldErrors,
  validarArchivo,
  formatearTamanioArchivo,
} from './helpers';
```

---

## 3.5 Schema del Formulario (para React Hook Form)

El schema de Zod que usamos con React Hook Form puede diferir ligeramente del que usamos en el servidor. Por ejemplo, en el formulario manejamos el archivo como `File | null`, pero en el servidor recibimos los metadatos ya procesados.

Crea el archivo `lib/validations/documento-form.ts`:

```typescript
import { z } from 'zod';
import { VALIDACION } from './documento';

/**
 * Schema específico para el formulario del cliente
 * Difiere del schema del servidor en el manejo de archivos
 */
export const documentoFormSchema = z.object({
  codigo: z
    .string()
    .min(VALIDACION.CODIGO.MIN, `Mínimo ${VALIDACION.CODIGO.MIN} caracteres`)
    .max(VALIDACION.CODIGO.MAX, `Máximo ${VALIDACION.CODIGO.MAX} caracteres`)
    .regex(VALIDACION.CODIGO.PATTERN, VALIDACION.CODIGO.PATTERN_MESSAGE),

  titulo: z
    .string()
    .min(VALIDACION.TITULO.MIN, `Mínimo ${VALIDACION.TITULO.MIN} caracteres`)
    .max(VALIDACION.TITULO.MAX, `Máximo ${VALIDACION.TITULO.MAX} caracteres`),

  descripcion: z
    .string()
    .max(VALIDACION.DESCRIPCION.MAX, `Máximo ${VALIDACION.DESCRIPCION.MAX} caracteres`)
    .optional()
    .or(z.literal('')),

  tipo: z.enum(['resolucion', 'circular', 'memorando', 'acta', 'informe', 'otro'], {
    required_error: 'Seleccione un tipo',
  }),

  estado: z.enum(['borrador', 'revision', 'aprobado', 'archivado', 'anulado']),

  fechaExpedicion: z.string().min(1, 'La fecha es requerida'),

  fechaVencimiento: z.string().optional().or(z.literal('')),

  numeroFolios: z.coerce
    .number({ invalid_type_error: 'Debe ser un número' })
    .int('Debe ser un número entero')
    .min(VALIDACION.FOLIOS.MIN, `Mínimo ${VALIDACION.FOLIOS.MIN}`)
    .max(VALIDACION.FOLIOS.MAX, `Máximo ${VALIDACION.FOLIOS.MAX}`),

  esConfidencial: z.boolean(),

  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']),

  etiquetas: z.array(z.string()).optional(),

  // En el formulario, el archivo es un File o null
  archivo: z
    .instanceof(File, { message: 'Debe ser un archivo válido' })
    .nullable()
    .optional()
    .refine(
      (file) => {
        if (!file) return true;
        return file.size <= VALIDACION.ARCHIVO.MAX_SIZE;
      },
      `El archivo no debe superar ${VALIDACION.ARCHIVO.MAX_SIZE / 1024 / 1024}MB`
    )
    .refine(
      (file) => {
        if (!file) return true;
        return VALIDACION.ARCHIVO.TIPOS_PERMITIDOS.includes(file.type);
      },
      `Tipos permitidos: ${VALIDACION.ARCHIVO.EXTENSIONES.join(', ')}`
    ),

  observaciones: z
    .string()
    .max(VALIDACION.OBSERVACIONES.MAX, `Máximo ${VALIDACION.OBSERVACIONES.MAX} caracteres`)
    .optional()
    .or(z.literal('')),

  password: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => {
        if (!val || val === '') return true;
        return val.length >= VALIDACION.PASSWORD.MIN;
      },
      `Mínimo ${VALIDACION.PASSWORD.MIN} caracteres`
    ),
})
// Validación cruzada de fechas
.refine(
  (data) => {
    if (!data.fechaVencimiento || data.fechaVencimiento === '') return true;
    return new Date(data.fechaVencimiento) > new Date(data.fechaExpedicion);
  },
  {
    message: 'La fecha de vencimiento debe ser posterior a la fecha de expedición',
    path: ['fechaVencimiento'],
  }
);

// Tipo para los valores del formulario
export type DocumentoFormValues = z.infer<typeof documentoFormSchema>;

// Valores por defecto para el formulario
export const documentoFormDefaults: DocumentoFormValues = {
  codigo: '',
  titulo: '',
  descripcion: '',
  tipo: 'otro',
  estado: 'borrador',
  fechaExpedicion: new Date().toISOString().split('T')[0],
  fechaVencimiento: '',
  numeroFolios: 1,
  esConfidencial: false,
  prioridad: 'media',
  etiquetas: [],
  archivo: null,
  observaciones: '',
  password: '',
};
```

Actualiza `lib/validations/index.ts` para incluir el schema del formulario:

```typescript
// Schemas de documento (servidor)
export {
  crearDocumentoSchema,
  actualizarDocumentoSchema,
  archivoSchema,
  filtrosDocumentoSchema,
  VALIDACION,
} from './documento';

// Schema del formulario (cliente)
export {
  documentoFormSchema,
  documentoFormDefaults,
} from './documento-form';

// Tipos inferidos
export type {
  CrearDocumentoInput,
  CrearDocumentoOutput,
  ActualizarDocumentoInput,
  ActualizarDocumentoOutput,
  ArchivoInput,
  FiltrosDocumento,
} from './documento';

export type { DocumentoFormValues } from './documento-form';

// Helpers de validación
export {
  validarConSchema,
  zodErrorsToFieldErrors,
  validarArchivo,
  formatearTamanioArchivo,
} from './helpers';
```

---

## 3.6 Patrón: Input vs Output Types

Un concepto importante en Zod es la diferencia entre tipos de entrada y salida:

```typescript
// Input: lo que el usuario envía (strings crudos)
type Input = z.input<typeof schema>;

// Output: después de transformaciones (tipos finales)
type Output = z.output<typeof schema>;
```

Ejemplo práctico:

```typescript
const schema = z.object({
  codigo: z.string().transform((val) => val.toUpperCase()),
  numeroFolios: z.coerce.number(),
});

// Input esperado del usuario
type Input = z.input<typeof schema>;
// { codigo: string; numeroFolios: string | number }

// Output después de parse
type Output = z.output<typeof schema>;
// { codigo: string; numeroFolios: number }
```

**En el formulario usamos Input** (lo que el usuario escribe).
**En el servidor usamos Output** (datos transformados y validados).

---

## 3.7 Ejemplo de Uso en Componente

Así se integra con React Hook Form:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  documentoFormSchema, 
  documentoFormDefaults,
  type DocumentoFormValues 
} from '@/lib/validations';

export function DocumentoForm() {
  const form = useForm<DocumentoFormValues>({
    resolver: zodResolver(documentoFormSchema),
    defaultValues: documentoFormDefaults,
  });

  const onSubmit = async (data: DocumentoFormValues) => {
    // 'data' ya está validado y tipado
    console.log(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Campos del formulario */}
    </form>
  );
}
```

---

## Resumen del Módulo

En este módulo hemos:

1. ✅ Creado schemas Zod con validaciones completas
2. ✅ Definido constantes centralizadas para límites y mensajes
3. ✅ Implementado validación cruzada (fechas)
4. ✅ Separado schemas de servidor vs cliente
5. ✅ Creado helpers para procesar errores
6. ✅ Definido tipos Input/Output para el formulario

### Archivos creados:

```
lib/
└── validations/
    ├── documento.ts       ← Schemas del servidor + constantes
    ├── documento-form.ts  ← Schema del formulario + defaults
    ├── helpers.ts         ← Funciones auxiliares
    └── index.ts           ← Exportaciones
```

### Tipos principales:

| Tipo | Uso |
|------|-----|
| `DocumentoFormValues` | Valores del formulario (React Hook Form) |
| `CrearDocumentoInput` | Lo que recibe el Server Action |
| `CrearDocumentoOutput` | Datos transformados para BD |
| `FiltrosDocumento` | Parámetros de búsqueda/filtro |

---

## Próximo Módulo

En el **Módulo 4: Server Actions para CRUD** crearemos:

- Acciones para crear, leer, actualizar y eliminar documentos
- Patrón consistente de respuesta (`ActionResponse`)
- Validación en el servidor
- Manejo de errores de base de datos
- Integración con el upload de archivos

---

¿Continúo con el Módulo 4?
