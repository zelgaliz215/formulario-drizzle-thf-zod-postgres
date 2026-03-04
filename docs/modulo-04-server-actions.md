# Módulo 4: Server Actions para CRUD

## Objetivo del Módulo

Al finalizar este módulo tendrás:
- Server Actions completas para crear, leer, actualizar y eliminar documentos
- Patrón consistente de respuestas tipadas (`ActionResponse<T>`)
- Validación en el servidor antes de cualquier operación
- Manejo robusto de errores de base de datos
- Queries con filtros y paginación

---

## 4.1 ¿Por qué Server Actions?

Los Server Actions son funciones que se ejecutan **exclusivamente en el servidor** pero pueden ser invocadas directamente desde componentes cliente. Ventajas:

- **Sin API Routes**: No necesitas crear endpoints REST manualmente
- **Tipado end-to-end**: TypeScript conecta el cliente con el servidor
- **Colocación**: Puedes definirlos junto al código que los usa
- **Progresive Enhancement**: Funcionan incluso sin JavaScript habilitado
- **Integración con caché**: Se combinan con `revalidatePath` y `revalidateTag`

### Reglas importantes:

1. Deben tener `'use server'` al inicio del archivo o de la función
2. Solo pueden exportar funciones async
3. Los argumentos y retornos deben ser serializables (no puedes pasar funciones, clases, etc.)
4. Siempre valida los datos en el servidor (nunca confíes en el cliente)

---

## 4.2 Estructura de la Carpeta Actions

```
actions/
├── documentos/
│   ├── index.ts           # Re-exporta todas las acciones
│   ├── crear.ts           # Crear documento
│   ├── obtener.ts         # Obtener uno o varios
│   ├── actualizar.ts      # Actualizar documento
│   ├── eliminar.ts        # Eliminar documento
│   └── tipos.ts           # Tipos específicos de las acciones
└── index.ts               # Re-exporta todo
```

Esta separación permite:
- Archivos pequeños y enfocados
- Fácil navegación
- Imports selectivos (tree-shaking)

---

## 4.3 Tipos para las Acciones

Crea el archivo `actions/documentos/tipos.ts`:

```typescript
import type { Documento } from '@/db/schema';
import type { PaginatedResponse } from '@/types';
import type { FiltrosDocumento } from '@/lib/validations';

// Respuesta al crear un documento
export type CrearDocumentoResult = {
  documento: Documento;
};

// Respuesta al obtener un documento
export type ObtenerDocumentoResult = {
  documento: Documento;
};

// Respuesta al listar documentos
export type ListarDocumentosResult = PaginatedResponse<Documento>;

// Respuesta al actualizar
export type ActualizarDocumentoResult = {
  documento: Documento;
};

// Respuesta al eliminar
export type EliminarDocumentoResult = {
  id: string;
};

// Parámetros para listar con filtros
export type ListarDocumentosParams = FiltrosDocumento;
```

---

## 4.4 Utilidades Compartidas para Acciones

Antes de las acciones, creemos helpers para manejo de errores consistente.

Crea el archivo `actions/utils.ts`:

```typescript
import { ZodError, ZodSchema } from 'zod';
import type { ActionResponse } from '@/types';

/**
 * Wrapper para ejecutar acciones con manejo de errores consistente
 */
export async function ejecutarAccion<T>(
  fn: () => Promise<T>
): Promise<ActionResponse<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return manejarError(error);
  }
}

/**
 * Valida datos con un schema Zod
 * Retorna los datos validados o lanza error
 */
export function validarDatos<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Convierte errores a ActionResponse
 */
export function manejarError(error: unknown): ActionResponse<never> {
  // Error de validación Zod
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    
    error.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(err.message);
    });

    return {
      success: false,
      error: 'Error de validación',
      fieldErrors,
    };
  }

  // Error de base de datos PostgreSQL
  if (isPostgresError(error)) {
    return manejarErrorPostgres(error);
  }

  // Error genérico
  if (error instanceof Error) {
    // En desarrollo mostramos el mensaje real
    // En producción mostramos un mensaje genérico
    const mensaje = process.env.NODE_ENV === 'development'
      ? error.message
      : 'Ha ocurrido un error inesperado';
    
    console.error('Error en acción:', error);
    
    return {
      success: false,
      error: mensaje,
    };
  }

  // Error desconocido
  console.error('Error desconocido:', error);
  return {
    success: false,
    error: 'Ha ocurrido un error inesperado',
  };
}

/**
 * Type guard para errores de PostgreSQL
 */
function isPostgresError(error: unknown): error is PostgresError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as PostgresError).code === 'string'
  );
}

interface PostgresError {
  code: string;
  detail?: string;
  constraint?: string;
  column?: string;
  table?: string;
}

/**
 * Mapea códigos de error de PostgreSQL a mensajes amigables
 */
function manejarErrorPostgres(error: PostgresError): ActionResponse<never> {
  switch (error.code) {
    // Violación de unique constraint
    case '23505': {
      const campo = extraerCampoDeConstraint(error.constraint);
      return {
        success: false,
        error: `Ya existe un registro con este ${campo}`,
        fieldErrors: campo ? { [campo]: [`Este ${campo} ya está en uso`] } : undefined,
      };
    }
    
    // Violación de foreign key
    case '23503':
      return {
        success: false,
        error: 'No se puede completar la operación: referencia a datos inexistentes',
      };
    
    // Violación de not null
    case '23502':
      return {
        success: false,
        error: `El campo ${error.column || 'requerido'} no puede estar vacío`,
      };
    
    // Violación de check constraint
    case '23514':
      return {
        success: false,
        error: 'Los datos no cumplen con las restricciones requeridas',
      };

    // Timeout de conexión
    case '57014':
      return {
        success: false,
        error: 'La operación tardó demasiado. Intente nuevamente.',
      };

    default:
      console.error('Error de PostgreSQL no manejado:', error);
      return {
        success: false,
        error: 'Error de base de datos',
      };
  }
}

/**
 * Intenta extraer el nombre del campo de un constraint
 * Ejemplo: "documentos_codigo_unique" -> "codigo"
 */
function extraerCampoDeConstraint(constraint?: string): string | null {
  if (!constraint) return null;
  
  // Formato típico: tabla_campo_tipo (ej: documentos_codigo_unique)
  const partes = constraint.split('_');
  if (partes.length >= 2) {
    // Retorna la segunda parte (el campo)
    return partes[1];
  }
  
  return null;
}
```

---

## 4.5 Acción: Crear Documento

Crea el archivo `actions/documentos/crear.ts`:

```typescript
'use server';

import { db, documentos } from '@/db';
import { crearDocumentoSchema, type CrearDocumentoInput } from '@/lib/validations';
import { ejecutarAccion, validarDatos } from '../utils';
import { revalidatePath } from 'next/cache';
import type { ActionResponse } from '@/types';
import type { CrearDocumentoResult } from './tipos';

/**
 * Crea un nuevo documento en la base de datos
 * 
 * @param input - Datos del documento a crear
 * @returns ActionResponse con el documento creado o error
 */
export async function crearDocumento(
  input: CrearDocumentoInput
): Promise<ActionResponse<CrearDocumentoResult>> {
  return ejecutarAccion(async () => {
    // 1. Validar datos de entrada
    const datosValidados = validarDatos(crearDocumentoSchema, input);
    
    // 2. Preparar datos para inserción
    // Nota: Si hay password, aquí deberíamos hashearlo
    const datosParaInsertar = {
      ...datosValidados,
      // Convertir campos opcionales vacíos a null
      descripcion: datosValidados.descripcion || null,
      fechaVencimiento: datosValidados.fechaVencimiento || null,
      etiquetas: datosValidados.etiquetas?.length ? datosValidados.etiquetas : null,
      observaciones: datosValidados.observaciones || null,
      // Por ahora guardamos el password en texto plano
      // TODO: Implementar hashing con bcrypt
      passwordHash: datosValidados.password || null,
    };

    // Remover el campo password ya que lo guardamos como passwordHash
    const { password, ...datosFinales } = datosParaInsertar as typeof datosParaInsertar & { password?: string };

    // 3. Insertar en base de datos
    const [documento] = await db
      .insert(documentos)
      .values(datosFinales)
      .returning();

    // 4. Revalidar caché de la lista de documentos
    revalidatePath('/documentos');

    return { documento };
  });
}
```

---

## 4.6 Acción: Obtener Documentos

Crea el archivo `actions/documentos/obtener.ts`:

```typescript
'use server';

import { db, documentos, type Documento } from '@/db';
import { eq, ilike, and, or, gte, lte, sql, count, desc, asc } from 'drizzle-orm';
import { filtrosDocumentoSchema, type FiltrosDocumento } from '@/lib/validations';
import { ejecutarAccion, validarDatos } from '../utils';
import type { ActionResponse } from '@/types';
import type { ObtenerDocumentoResult, ListarDocumentosResult } from './tipos';

/**
 * Obtiene un documento por su ID
 */
export async function obtenerDocumentoPorId(
  id: string
): Promise<ActionResponse<ObtenerDocumentoResult>> {
  return ejecutarAccion(async () => {
    // Validar que el ID sea un UUID válido
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new Error('ID de documento inválido');
    }

    const documento = await db.query.documentos.findFirst({
      where: eq(documentos.id, id),
    });

    if (!documento) {
      throw new Error('Documento no encontrado');
    }

    return { documento };
  });
}

/**
 * Obtiene un documento por su código único
 */
export async function obtenerDocumentoPorCodigo(
  codigo: string
): Promise<ActionResponse<ObtenerDocumentoResult>> {
  return ejecutarAccion(async () => {
    const documento = await db.query.documentos.findFirst({
      where: eq(documentos.codigo, codigo.toUpperCase()),
    });

    if (!documento) {
      throw new Error('Documento no encontrado');
    }

    return { documento };
  });
}

/**
 * Lista documentos con filtros y paginación
 */
export async function listarDocumentos(
  params: FiltrosDocumento = {}
): Promise<ActionResponse<ListarDocumentosResult>> {
  return ejecutarAccion(async () => {
    // 1. Validar y aplicar defaults a los parámetros
    const filtros = validarDatos(filtrosDocumentoSchema, params);
    const { page, pageSize, busqueda, tipo, estado, prioridad, esConfidencial, fechaDesde, fechaHasta } = filtros;

    // 2. Construir condiciones de filtrado
    const condiciones = [];

    // Búsqueda en código, título y descripción
    if (busqueda && busqueda.trim() !== '') {
      const terminoBusqueda = `%${busqueda.trim()}%`;
      condiciones.push(
        or(
          ilike(documentos.codigo, terminoBusqueda),
          ilike(documentos.titulo, terminoBusqueda),
          ilike(documentos.descripcion, terminoBusqueda)
        )
      );
    }

    // Filtro por tipo
    if (tipo) {
      condiciones.push(eq(documentos.tipo, tipo));
    }

    // Filtro por estado
    if (estado) {
      condiciones.push(eq(documentos.estado, estado));
    }

    // Filtro por prioridad
    if (prioridad) {
      condiciones.push(eq(documentos.prioridad, prioridad));
    }

    // Filtro por confidencialidad
    if (esConfidencial !== undefined) {
      condiciones.push(eq(documentos.esConfidencial, esConfidencial));
    }

    // Filtro por rango de fechas
    if (fechaDesde) {
      condiciones.push(gte(documentos.fechaExpedicion, fechaDesde));
    }

    if (fechaHasta) {
      condiciones.push(lte(documentos.fechaExpedicion, fechaHasta));
    }

    // 3. Combinar condiciones (AND)
    const whereClause = condiciones.length > 0 ? and(...condiciones) : undefined;

    // 4. Obtener total de registros (para paginación)
    const [{ total }] = await db
      .select({ total: count() })
      .from(documentos)
      .where(whereClause);

    const totalItems = Number(total);
    const totalPages = Math.ceil(totalItems / pageSize);

    // 5. Obtener documentos paginados
    const offset = (page - 1) * pageSize;

    const data = await db
      .select()
      .from(documentos)
      .where(whereClause)
      .orderBy(desc(documentos.createdAt))
      .limit(pageSize)
      .offset(offset);

    // 6. Retornar respuesta paginada
    return {
      data,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  });
}

/**
 * Obtiene estadísticas rápidas de documentos
 */
export async function obtenerEstadisticasDocumentos(): Promise<
  ActionResponse<{
    total: number;
    porEstado: Record<string, number>;
    porTipo: Record<string, number>;
  }>
> {
  return ejecutarAccion(async () => {
    // Total de documentos
    const [{ total }] = await db
      .select({ total: count() })
      .from(documentos);

    // Conteo por estado
    const porEstadoRaw = await db
      .select({
        estado: documentos.estado,
        cantidad: count(),
      })
      .from(documentos)
      .groupBy(documentos.estado);

    const porEstado: Record<string, number> = {};
    porEstadoRaw.forEach((row) => {
      porEstado[row.estado] = Number(row.cantidad);
    });

    // Conteo por tipo
    const porTipoRaw = await db
      .select({
        tipo: documentos.tipo,
        cantidad: count(),
      })
      .from(documentos)
      .groupBy(documentos.tipo);

    const porTipo: Record<string, number> = {};
    porTipoRaw.forEach((row) => {
      porTipo[row.tipo] = Number(row.cantidad);
    });

    return {
      total: Number(total),
      porEstado,
      porTipo,
    };
  });
}
```

---

## 4.7 Acción: Actualizar Documento

Crea el archivo `actions/documentos/actualizar.ts`:

```typescript
'use server';

import { db, documentos } from '@/db';
import { eq } from 'drizzle-orm';
import { actualizarDocumentoSchema, type ActualizarDocumentoInput } from '@/lib/validations';
import { ejecutarAccion, validarDatos } from '../utils';
import { revalidatePath } from 'next/cache';
import type { ActionResponse } from '@/types';
import type { ActualizarDocumentoResult } from './tipos';

/**
 * Actualiza un documento existente
 * 
 * @param input - Datos a actualizar (debe incluir el ID)
 * @returns ActionResponse con el documento actualizado o error
 */
export async function actualizarDocumento(
  input: ActualizarDocumentoInput
): Promise<ActionResponse<ActualizarDocumentoResult>> {
  return ejecutarAccion(async () => {
    // 1. Validar datos de entrada
    const datosValidados = validarDatos(actualizarDocumentoSchema, input);
    const { id, ...datosActualizar } = datosValidados;

    // 2. Verificar que el documento existe
    const documentoExistente = await db.query.documentos.findFirst({
      where: eq(documentos.id, id),
    });

    if (!documentoExistente) {
      throw new Error('Documento no encontrado');
    }

    // 3. Preparar datos para actualización
    // Solo incluimos campos que fueron enviados (no undefined)
    const datosParaActualizar: Record<string, unknown> = {};

    // Iteramos sobre los campos validados
    Object.entries(datosActualizar).forEach(([key, value]) => {
      if (value !== undefined) {
        // Manejo especial para password -> passwordHash
        if (key === 'password') {
          if (value) {
            // TODO: Hashear password
            datosParaActualizar['passwordHash'] = value;
          }
        } else {
          datosParaActualizar[key] = value;
        }
      }
    });

    // Si no hay nada que actualizar, retornamos el documento existente
    if (Object.keys(datosParaActualizar).length === 0) {
      return { documento: documentoExistente };
    }

    // 4. Actualizar en base de datos
    const [documento] = await db
      .update(documentos)
      .set(datosParaActualizar)
      .where(eq(documentos.id, id))
      .returning();

    // 5. Revalidar caché
    revalidatePath('/documentos');
    revalidatePath(`/documentos/${id}`);

    return { documento };
  });
}

/**
 * Cambia el estado de un documento
 * Útil para workflows donde solo cambias el estado
 */
export async function cambiarEstadoDocumento(
  id: string,
  nuevoEstado: 'borrador' | 'revision' | 'aprobado' | 'archivado' | 'anulado'
): Promise<ActionResponse<ActualizarDocumentoResult>> {
  return ejecutarAccion(async () => {
    // Validar ID
    if (!id) {
      throw new Error('ID de documento requerido');
    }

    // Verificar que existe
    const documentoExistente = await db.query.documentos.findFirst({
      where: eq(documentos.id, id),
    });

    if (!documentoExistente) {
      throw new Error('Documento no encontrado');
    }

    // Actualizar estado
    const [documento] = await db
      .update(documentos)
      .set({ estado: nuevoEstado })
      .where(eq(documentos.id, id))
      .returning();

    // Revalidar caché
    revalidatePath('/documentos');
    revalidatePath(`/documentos/${id}`);

    return { documento };
  });
}
```

---

## 4.8 Acción: Eliminar Documento

Crea el archivo `actions/documentos/eliminar.ts`:

```typescript
'use server';

import { db, documentos } from '@/db';
import { eq } from 'drizzle-orm';
import { ejecutarAccion } from '../utils';
import { revalidatePath } from 'next/cache';
import type { ActionResponse } from '@/types';
import type { EliminarDocumentoResult } from './tipos';

/**
 * Elimina un documento por su ID
 * 
 * @param id - ID del documento a eliminar
 * @returns ActionResponse con el ID eliminado o error
 */
export async function eliminarDocumento(
  id: string
): Promise<ActionResponse<EliminarDocumentoResult>> {
  return ejecutarAccion(async () => {
    // 1. Validar ID
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new Error('ID de documento inválido');
    }

    // 2. Verificar que el documento existe
    const documentoExistente = await db.query.documentos.findFirst({
      where: eq(documentos.id, id),
      columns: {
        id: true,
        archivoAdjunto: true,
      },
    });

    if (!documentoExistente) {
      throw new Error('Documento no encontrado');
    }

    // 3. Si tiene archivo adjunto, marcarlo para eliminación
    // TODO: Implementar eliminación del archivo del storage
    if (documentoExistente.archivoAdjunto) {
      console.log(`TODO: Eliminar archivo ${documentoExistente.archivoAdjunto}`);
      // await eliminarArchivoStorage(documentoExistente.archivoAdjunto);
    }

    // 4. Eliminar de la base de datos
    await db
      .delete(documentos)
      .where(eq(documentos.id, id));

    // 5. Revalidar caché
    revalidatePath('/documentos');

    return { id };
  });
}

/**
 * Elimina múltiples documentos por sus IDs
 * Útil para eliminación en lote desde la tabla
 */
export async function eliminarDocumentosEnLote(
  ids: string[]
): Promise<ActionResponse<{ eliminados: string[]; errores: string[] }>> {
  return ejecutarAccion(async () => {
    if (!ids || ids.length === 0) {
      throw new Error('No se proporcionaron IDs para eliminar');
    }

    // Limitar cantidad para evitar operaciones muy grandes
    if (ids.length > 50) {
      throw new Error('Máximo 50 documentos por operación');
    }

    const eliminados: string[] = [];
    const errores: string[] = [];

    // Eliminar uno por uno para manejar errores individuales
    // En producción podrías usar una transacción
    for (const id of ids) {
      try {
        const resultado = await eliminarDocumento(id);
        if (resultado.success) {
          eliminados.push(id);
        } else {
          errores.push(`${id}: ${resultado.error}`);
        }
      } catch (error) {
        errores.push(`${id}: Error desconocido`);
      }
    }

    // Revalidar caché una sola vez al final
    revalidatePath('/documentos');

    return { eliminados, errores };
  });
}
```

---

## 4.9 Exportar Acciones

Crea el archivo `actions/documentos/index.ts`:

```typescript
// Acciones CRUD
export { crearDocumento } from './crear';
export { 
  obtenerDocumentoPorId, 
  obtenerDocumentoPorCodigo,
  listarDocumentos,
  obtenerEstadisticasDocumentos,
} from './obtener';
export { actualizarDocumento, cambiarEstadoDocumento } from './actualizar';
export { eliminarDocumento, eliminarDocumentosEnLote } from './eliminar';

// Tipos
export type {
  CrearDocumentoResult,
  ObtenerDocumentoResult,
  ListarDocumentosResult,
  ActualizarDocumentoResult,
  EliminarDocumentoResult,
  ListarDocumentosParams,
} from './tipos';
```

Crea el archivo `actions/index.ts`:

```typescript
// Re-exportar todas las acciones de documentos
export * from './documentos';

// Re-exportar utilidades (por si se necesitan en otros lugares)
export { ejecutarAccion, manejarError } from './utils';
```

---

## 4.10 Ejemplo de Uso en Componentes

### Uso en Server Component (RSC)

```typescript
// app/documentos/page.tsx
import { listarDocumentos } from '@/actions';

export default async function DocumentosPage() {
  const resultado = await listarDocumentos({ page: 1, pageSize: 10 });

  if (!resultado.success) {
    return <div>Error: {resultado.error}</div>;
  }

  const { data: docs, pagination } = resultado.data;

  return (
    <div>
      <h1>Documentos ({pagination.totalItems})</h1>
      <ul>
        {docs.map((doc) => (
          <li key={doc.id}>{doc.titulo}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Uso en Client Component con useTransition

```typescript
'use client';

import { useTransition } from 'react';
import { crearDocumento } from '@/actions';
import { toast } from 'sonner';

export function CrearDocumentoButton() {
  const [isPending, startTransition] = useTransition();

  const handleCrear = () => {
    startTransition(async () => {
      const resultado = await crearDocumento({
        codigo: 'RES-2024-001',
        titulo: 'Mi documento',
        tipo: 'resolucion',
        fechaExpedicion: '2024-01-15',
        // ... otros campos
      });

      if (resultado.success) {
        toast.success('Documento creado');
      } else {
        toast.error(resultado.error);
      }
    });
  };

  return (
    <button onClick={handleCrear} disabled={isPending}>
      {isPending ? 'Creando...' : 'Crear Documento'}
    </button>
  );
}
```

### Uso con React Hook Form (Preview del Módulo 6)

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { documentoFormSchema, type DocumentoFormValues } from '@/lib/validations';
import { crearDocumento } from '@/actions';

export function DocumentoForm() {
  const form = useForm<DocumentoFormValues>({
    resolver: zodResolver(documentoFormSchema),
  });

  const onSubmit = async (data: DocumentoFormValues) => {
    // Transformar datos del formulario al formato del servidor
    const resultado = await crearDocumento({
      ...data,
      // El archivo se maneja aparte (upload previo)
    });

    if (!resultado.success) {
      // Si hay errores de campo, setearlos en el form
      if (resultado.fieldErrors) {
        Object.entries(resultado.fieldErrors).forEach(([field, messages]) => {
          form.setError(field as any, { message: messages[0] });
        });
      }
    }
  };

  return <form onSubmit={form.handleSubmit(onSubmit)}>{/* campos */}</form>;
}
```

---

## Resumen del Módulo

En este módulo hemos:

1. ✅ Creado estructura organizada para Server Actions
2. ✅ Implementado utilidades para manejo consistente de errores
3. ✅ Creado acción `crearDocumento` con validación
4. ✅ Creado acciones de lectura con filtros y paginación
5. ✅ Creado acción `actualizarDocumento` (parcial)
6. ✅ Creado acciones de eliminación (individual y en lote)
7. ✅ Mapeado errores de PostgreSQL a mensajes amigables

### Archivos creados:

```
actions/
├── documentos/
│   ├── index.ts         # Re-exportaciones
│   ├── tipos.ts         # Tipos específicos
│   ├── crear.ts         # Crear documento
│   ├── obtener.ts       # Obtener/listar
│   ├── actualizar.ts    # Actualizar
│   └── eliminar.ts      # Eliminar
├── utils.ts             # Helpers compartidos
└── index.ts             # Exportación principal
```

### Patrón de respuesta:

```typescript
// Éxito
{ success: true, data: { documento: {...} } }

// Error simple
{ success: false, error: 'Mensaje de error' }

// Error con campos específicos (para formularios)
{ success: false, error: 'Error de validación', fieldErrors: { codigo: ['Ya existe'] } }
```

---

## Próximo Módulo

En el **Módulo 5: Componentes de Formulario Reutilizables** crearemos:

- Componentes wrapper sobre Shadcn/ui integrados con React Hook Form
- FormInput, FormTextarea, FormSelect, FormRadioGroup, etc.
- FormDatePicker, FormFileUpload, FormFileDragDrop
- Manejo automático de errores y estados

---

¿Continúo con el Módulo 5?
