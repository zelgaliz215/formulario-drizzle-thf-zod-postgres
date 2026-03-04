# Módulo 2: Definición del Schema con Drizzle

## Objetivo del Módulo

Al finalizar este módulo tendrás:
- La tabla `documentos` definida con todos los campos
- Enums de PostgreSQL para tipo, estado y prioridad
- Migraciones generadas y aplicadas
- Tipos TypeScript inferidos automáticamente
- Drizzle Studio funcionando para visualizar la base de datos

---

## 2.1 Entendiendo el Schema de Drizzle

En Drizzle, el schema define la estructura de tu base de datos usando TypeScript. A diferencia de otros ORMs donde escribes modelos y generas migraciones, en Drizzle:

1. **Defines tablas** usando funciones como `pgTable()`
2. **Defines columnas** con helpers tipados (`varchar`, `integer`, `boolean`, etc.)
3. **Drizzle infiere los tipos** automáticamente
4. **Generas migraciones** con `drizzle-kit generate`

La ventaja principal: **tu código TypeScript ES la fuente de verdad**.

---

## 2.2 Crear los Enums de PostgreSQL

PostgreSQL soporta tipos ENUM nativos, que son más eficientes que strings y garantizan integridad de datos.

Crea el archivo `db/schema/enums.ts`:

```typescript
import { pgEnum } from 'drizzle-orm/pg-core';

// Tipo de documento
export const tipoDocumentoEnum = pgEnum('tipo_documento', [
  'resolucion',
  'circular', 
  'memorando',
  'acta',
  'informe',
  'otro'
]);

// Estado del documento
export const estadoDocumentoEnum = pgEnum('estado_documento', [
  'borrador',
  'revision',
  'aprobado',
  'archivado',
  'anulado'
]);

// Prioridad del documento
export const prioridadDocumentoEnum = pgEnum('prioridad_documento', [
  'baja',
  'media',
  'alta',
  'urgente'
]);

// Exportar los tipos TypeScript inferidos de los enums
// Estos tipos se pueden usar en toda la aplicación
export type TipoDocumento = (typeof tipoDocumentoEnum.enumValues)[number];
export type EstadoDocumento = (typeof estadoDocumentoEnum.enumValues)[number];
export type PrioridadDocumento = (typeof prioridadDocumentoEnum.enumValues)[number];

// Arrays para usar en selects/radios del formulario
export const TIPOS_DOCUMENTO = tipoDocumentoEnum.enumValues;
export const ESTADOS_DOCUMENTO = estadoDocumentoEnum.enumValues;
export const PRIORIDADES_DOCUMENTO = prioridadDocumentoEnum.enumValues;

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
```

**¿Por qué exportamos labels separados?**

Los enums en la BD usan valores simples (`resolucion`), pero en la UI queremos mostrar texto legible (`Resolución`). Mantener esto centralizado evita duplicación.

---

## 2.3 Crear la Tabla de Documentos

Crea el archivo `db/schema/documents.ts`:

```typescript
import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  integer, 
  boolean, 
  date,
  timestamp 
} from 'drizzle-orm/pg-core';
import { 
  tipoDocumentoEnum, 
  estadoDocumentoEnum, 
  prioridadDocumentoEnum 
} from './enums';

export const documentos = pgTable('documentos', {
  // Identificador único
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Código único del documento (ej: RES-2024-001)
  codigo: varchar('codigo', { length: 20 }).notNull().unique(),
  
  // Título descriptivo
  titulo: varchar('titulo', { length: 200 }).notNull(),
  
  // Descripción extendida (opcional)
  descripcion: text('descripcion'),
  
  // Tipo de documento (enum)
  tipo: tipoDocumentoEnum('tipo').notNull(),
  
  // Estado actual (enum)
  estado: estadoDocumentoEnum('estado').notNull().default('borrador'),
  
  // Fecha de expedición
  fechaExpedicion: date('fecha_expedicion', { mode: 'string' }).notNull(),
  
  // Fecha de vencimiento (opcional)
  fechaVencimiento: date('fecha_vencimiento', { mode: 'string' }),
  
  // Número de folios/páginas
  numeroFolios: integer('numero_folios').notNull().default(1),
  
  // ¿Es documento confidencial?
  esConfidencial: boolean('es_confidencial').notNull().default(false),
  
  // Prioridad (enum)
  prioridad: prioridadDocumentoEnum('prioridad').notNull().default('media'),
  
  // Etiquetas (array de texto)
  etiquetas: text('etiquetas').array(),
  
  // Ruta al archivo adjunto
  archivoAdjunto: varchar('archivo_adjunto', { length: 500 }),
  
  // Nombre original del archivo
  archivoNombre: varchar('archivo_nombre', { length: 255 }),
  
  // Tipo MIME del archivo
  archivoTipo: varchar('archivo_tipo', { length: 100 }),
  
  // Tamaño del archivo en bytes
  archivoTamanio: integer('archivo_tamanio'),
  
  // Observaciones adicionales
  observaciones: text('observaciones'),
  
  // Contraseña para documentos protegidos (hash)
  passwordHash: varchar('password_hash', { length: 255 }),
  
  // Timestamps automáticos
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  
  updatedAt: timestamp('updated_at', { withTimezone: true })
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
```

### Explicación de Decisiones

**`uuid().defaultRandom().primaryKey()`**
- UUIDs son mejores que auto-increment para sistemas distribuidos
- `defaultRandom()` genera el UUID automáticamente en PostgreSQL

**`date({ mode: 'string' })`**
- Retorna fechas como strings `'2024-01-15'` en lugar de objetos `Date`
- Más fácil de manejar en formularios y JSON

**`text().array()`**
- PostgreSQL soporta arrays nativos
- Ideal para etiquetas sin necesidad de tabla de relación

**`.$onUpdate(() => new Date())`**
- Actualiza `updatedAt` automáticamente en cada UPDATE
- Esto lo maneja Drizzle, no PostgreSQL

**Campos de archivo separados**
- `archivoAdjunto`: Ruta donde se guardó
- `archivoNombre`: Nombre original (para descargas)
- `archivoTipo`: MIME type (para validación/preview)
- `archivoTamanio`: Tamaño (para mostrar en UI)

---

## 2.4 Exportar el Schema

Actualiza el archivo `db/schema/index.ts`:

```typescript
// Exportar enums y sus tipos
export * from './enums';

// Exportar tablas y sus tipos
export * from './documents';
```

---

## 2.5 Configurar el Cliente de Drizzle

Actualiza el archivo `db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Verificar variable de entorno
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL no está definida. ' +
    'Asegúrate de tener un archivo .env.local con la variable configurada.'
  );
}

// Crear cliente de PostgreSQL
// max: 1 para desarrollo, aumentar para producción
const client = postgres(connectionString, {
  max: process.env.NODE_ENV === 'production' ? 10 : 1,
});

// Crear instancia de Drizzle con el schema
// Esto habilita el query builder con tipos
export const db = drizzle(client, { 
  schema,
  logger: process.env.NODE_ENV === 'development',
});

// Re-exportar todo el schema para conveniencia
export * from './schema';

// Tipo de la instancia de base de datos
export type Database = typeof db;
```

---

## 2.6 Generar y Aplicar Migraciones

Ahora que tenemos el schema definido, generemos las migraciones.

### Paso 1: Generar la migración

```bash
pnpm db:generate
```

Deberías ver algo como:

```
[✓] Your SQL migration file ➜ db/migrations/0000_initial.sql
```

### Paso 2: Revisar la migración generada

Abre el archivo generado en `db/migrations/`. Debería contener SQL similar a:

```sql
DO $$ BEGIN
 CREATE TYPE "public"."estado_documento" AS ENUM('borrador', 'revision', 'aprobado', 'archivado', 'anulado');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."prioridad_documento" AS ENUM('baja', 'media', 'alta', 'urgente');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."tipo_documento" AS ENUM('resolucion', 'circular', 'memorando', 'acta', 'informe', 'otro');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "documentos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "codigo" varchar(20) NOT NULL,
  "titulo" varchar(200) NOT NULL,
  "descripcion" text,
  "tipo" "tipo_documento" NOT NULL,
  "estado" "estado_documento" DEFAULT 'borrador' NOT NULL,
  "fecha_expedicion" date NOT NULL,
  "fecha_vencimiento" date,
  "numero_folios" integer DEFAULT 1 NOT NULL,
  "es_confidencial" boolean DEFAULT false NOT NULL,
  "prioridad" "prioridad_documento" DEFAULT 'media' NOT NULL,
  "etiquetas" text[],
  "archivo_adjunto" varchar(500),
  "archivo_nombre" varchar(255),
  "archivo_tipo" varchar(100),
  "archivo_tamanio" integer,
  "observaciones" text,
  "password_hash" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "documentos_codigo_unique" UNIQUE("codigo")
);
```

### Paso 3: Aplicar la migración

```bash
pnpm db:migrate
```

### Alternativa: Push directo (desarrollo)

Para desarrollo rápido, puedes usar `push` que sincroniza sin crear archivos de migración:

```bash
pnpm db:push
```

> **Nota:** En producción siempre usa migraciones (`generate` + `migrate`).

---

## 2.7 Verificar con Drizzle Studio

Ahora que hay un schema, Drizzle Studio debería funcionar:

```bash
pnpm db:studio
```

Abre https://local.drizzle.studio y deberías ver:
- La tabla `documentos`
- Los 3 enums creados
- Todas las columnas con sus tipos

También puedes verificar en DBeaver que la tabla existe.

---

## 2.8 Preparar el Seed (Opcional)

Crea el archivo `db/seed.ts` para tener datos de prueba:

```typescript
import { db, documentos } from './index';

const documentosSeed = [
  {
    codigo: 'RES-2024-001',
    titulo: 'Resolución de Nombramiento',
    descripcion: 'Resolución para nombramiento de personal administrativo',
    tipo: 'resolucion' as const,
    estado: 'aprobado' as const,
    fechaExpedicion: '2024-01-15',
    numeroFolios: 3,
    esConfidencial: false,
    prioridad: 'alta' as const,
    etiquetas: ['rrhh', 'nombramiento'],
  },
  {
    codigo: 'CIR-2024-005',
    titulo: 'Circular Informativa - Horarios',
    descripcion: 'Información sobre nuevos horarios de atención',
    tipo: 'circular' as const,
    estado: 'borrador' as const,
    fechaExpedicion: '2024-02-01',
    numeroFolios: 1,
    esConfidencial: false,
    prioridad: 'media' as const,
    etiquetas: ['informativo', 'horarios'],
  },
  {
    codigo: 'MEM-2024-012',
    titulo: 'Memorando Interno - Presupuesto Q1',
    descripcion: 'Comunicación interna sobre ejecución presupuestal',
    tipo: 'memorando' as const,
    estado: 'revision' as const,
    fechaExpedicion: '2024-03-10',
    fechaVencimiento: '2024-03-31',
    numeroFolios: 5,
    esConfidencial: true,
    prioridad: 'urgente' as const,
    etiquetas: ['presupuesto', 'confidencial', 'q1'],
  },
  {
    codigo: 'ACT-2024-003',
    titulo: 'Acta de Reunión - Comité Directivo',
    descripcion: 'Acta de la reunión mensual del comité directivo',
    tipo: 'acta' as const,
    estado: 'aprobado' as const,
    fechaExpedicion: '2024-02-20',
    numeroFolios: 8,
    esConfidencial: false,
    prioridad: 'media' as const,
    etiquetas: ['reunion', 'comite'],
  },
  {
    codigo: 'INF-2024-007',
    titulo: 'Informe de Gestión Trimestral',
    descripcion: 'Informe detallado de la gestión del primer trimestre',
    tipo: 'informe' as const,
    estado: 'archivado' as const,
    fechaExpedicion: '2024-04-05',
    numeroFolios: 25,
    esConfidencial: false,
    prioridad: 'baja' as const,
    etiquetas: ['informe', 'gestion', 'trimestral'],
  },
];

async function seed() {
  console.log('🌱 Iniciando seed de documentos...');
  
  try {
    // Limpiar tabla existente (opcional)
    await db.delete(documentos);
    console.log('   Tabla limpiada');
    
    // Insertar documentos de prueba
    const inserted = await db.insert(documentos).values(documentosSeed).returning();
    console.log(`   ${inserted.length} documentos insertados`);
    
    console.log('✅ Seed completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
}

seed();
```

Ejecuta el seed:

```bash
pnpm db:seed
```

---

## 2.9 Archivo de Tipos Actualizado

Actualiza `types/index.ts` para incluir tipos relacionados con documentos:

```typescript
// ============================================
// Tipos para respuestas de Server Actions
// ============================================

export type ActionResponse<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// ============================================
// Tipos para estados de UI
// ============================================

export type FormStatus = 'idle' | 'loading' | 'success' | 'error';

export type FormState = {
  status: FormStatus;
  message?: string;
};

// ============================================
// Tipos para paginación
// ============================================

export type PaginationParams = {
  page: number;
  pageSize: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

// ============================================
// Tipos para filtros de documentos
// ============================================

export type DocumentoFiltros = {
  busqueda?: string;
  tipo?: string;
  estado?: string;
  prioridad?: string;
  esConfidencial?: boolean;
  fechaDesde?: string;
  fechaHasta?: string;
};

// ============================================
// Re-exportar tipos de la base de datos
// ============================================

export type { 
  Documento, 
  NuevoDocumento,
  TipoDocumento,
  EstadoDocumento,
  PrioridadDocumento,
} from '@/db/schema';
```

---

## Resumen del Módulo

En este módulo hemos:

1. ✅ Creado enums de PostgreSQL con `pgEnum()`
2. ✅ Definido la tabla `documentos` con 20 columnas
3. ✅ Configurado tipos inferidos automáticamente
4. ✅ Generado y aplicado migraciones
5. ✅ Verificado la estructura con Drizzle Studio
6. ✅ Preparado datos de seed para pruebas

### Archivos creados/modificados:

```
db/
├── schema/
│   ├── enums.ts      ← Enums de PostgreSQL
│   ├── documents.ts  ← Tabla documentos
│   └── index.ts      ← Exportaciones
├── seed.ts           ← Datos de prueba
├── index.ts          ← Cliente Drizzle
└── migrations/
    └── 0000_xxx.sql  ← Migración generada
```

---

## Próximo Módulo

En el **Módulo 3: Esquemas de Validación con Zod** crearemos:

- Esquemas Zod que reflejan la estructura de Drizzle
- Validaciones personalizadas (fechas, formatos)
- Esquemas para Create vs Update
- Integración con `drizzle-zod` para DRY

---

¿Continúo con el Módulo 3?
