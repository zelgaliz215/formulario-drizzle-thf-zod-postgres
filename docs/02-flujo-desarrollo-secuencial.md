# Flujo de Desarrollo: Guía Secuencial de Tareas

## Visión General

Este documento presenta el flujo de desarrollo como un mapa de tareas interconectadas, explicando:

- **Qué** se hace en cada paso
- **Por qué** se hace en ese orden
- **Cómo** se implementa
- **Dependencias** entre tareas

---

## Diagrama de Flujo General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FASE 1: FUNDAMENTOS                                │
│                          (Secuencial - Obligatorio)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   [1.1] Crear Proyecto Next.js                                              │
│              │                                                               │
│              ▼                                                               │
│   [1.2] Instalar Dependencias ─────────────────┐                            │
│              │                                  │                            │
│              ▼                                  ▼                            │
│   [1.3] Configurar PostgreSQL         [1.4] Configurar Shadcn/ui           │
│              │                                  │                            │
│              └──────────┬───────────────────────┘                            │
│                         ▼                                                    │
│              [1.5] Estructura de Carpetas                                   │
│                         │                                                    │
└─────────────────────────┼───────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FASE 2: CAPA DE DATOS                                │
│                        (Secuencial - Fundacional)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   [2.1] Definir Enums ──────► [2.2] Definir Schema ──────► [2.3] Migrar    │
│                                                                    │         │
│                                                                    ▼         │
│                                                          [2.4] Seed (opcional)│
│                                                                              │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FASE 3: CAPA DE VALIDACIÓN                            │
│                    (Paralelo con Fase 4 si hay equipo)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   [3.1] Schema Zod Servidor ◄─────────────────────────────────────┐         │
│              │                                                     │         │
│              │ (deriva)                                           │         │
│              ▼                                                     │         │
│   [3.2] Schema Zod Cliente ───────► [3.3] Helpers de Validación   │         │
│              │                                                     │         │
│              │                                       (usa tipos de)│         │
│              └─────────────────────────────────────────────────────┘         │
│                                                                              │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FASE 4: CAPA DE ACCIONES                              │
│                        (Secuencial internamente)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   [4.1] Utils/Helpers ──────► [4.2] Action Crear                            │
│                                       │                                      │
│         ┌─────────────────────────────┼─────────────────────────────┐       │
│         │                             │                             │       │
│         ▼                             ▼                             ▼       │
│   [4.3] Action Leer          [4.4] Action Actualizar      [4.5] Action Eliminar│
│                                                                              │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FASE 5: COMPONENTES UI                                 │
│                    (Paralelo - Componentes independientes)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   [5.1] FormFieldWrapper (base)                                             │
│              │                                                               │
│              ├──────────────────┬──────────────────┬──────────────────┐     │
│              ▼                  ▼                  ▼                  ▼     │
│   [5.2] FormInput      [5.3] FormSelect    [5.4] FormDate    [5.5] FormFile │
│              │                  │                  │                  │     │
│              └──────────────────┴──────────────────┴──────────────────┘     │
│                                        │                                     │
│                                        ▼                                     │
│                            [5.6] Exportar Index                             │
│                                                                              │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FASE 6: INTEGRACIÓN                                  │
│                        (Secuencial - Depende de 4 y 5)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   [6.1] Hook useDocumentoForm                                               │
│              │                                                               │
│              ▼                                                               │
│   [6.2] Componente DocumentoForm                                            │
│              │                                                               │
│              ├──────────────────┬──────────────────┐                        │
│              ▼                  ▼                  ▼                        │
│   [6.3] Página Crear    [6.4] Página Editar  [6.5] Página Detalle          │
│                                                                              │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FASE 7: FEATURES AVANZADAS                               │
│                  (Paralelo - Módulos independientes)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌────────────────┐    ┌────────────────┐    ┌────────────────┐           │
│   │  [7.1] Upload  │    │ [7.2] Listado  │    │ [7.3] Errores  │           │
│   │    Storage     │    │    + Filtros   │    │   + Logging    │           │
│   │   Local/S3     │    │  + Paginación  │    │  + Boundaries  │           │
│   └───────┬────────┘    └───────┬────────┘    └───────┬────────┘           │
│           │                     │                     │                     │
│           └─────────────────────┴─────────────────────┘                     │
│                                 │                                            │
│                                 ▼                                            │
│                    [7.4] Integración Final                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## FASE 1: FUNDAMENTOS

### Tarea 1.1: Crear Proyecto Next.js

```
Secuencia: PRIMERA (no tiene dependencias)
Duración estimada: 5 minutos
```

**¿Qué?**
Crear el proyecto base con Next.js 16 usando create-next-app.

**¿Por qué primero?**
Todo lo demás depende de tener un proyecto funcional. Es el contenedor donde vivirá todo el código.

**¿Por qué estas opciones específicas?**

```bash
npx create-next-app@latest documentos-app \
  --typescript \      # Type safety desde el inicio
  --tailwind \        # Styling consistente con Shadcn
  --eslint \          # Calidad de código
  --app \             # App Router (moderno, Server Components)
  --src-dir \         # Separación clara de código fuente
  --import-alias "@/*"  # Imports limpios
```

| Opción         | Alternativa  | Por qué elegimos esta                     |
| -------------- | ------------ | ----------------------------------------- |
| `--typescript` | JavaScript   | Errores en compile-time, no runtime       |
| `--app`        | Pages Router | Server Components, Server Actions nativas |
| `--src-dir`    | Sin src/     | Separación clara de config vs código      |
| `--tailwind`   | CSS Modules  | Requerido para Shadcn/ui                  |

**Resultado:** Proyecto ejecutable con `pnpm run dev`

---

### Tarea 1.2: Instalar Dependencias

```
Secuencia: Después de 1.1
Puede paralelizarse: Sí (múltiples pnpm install)
Duración estimada: 3 minutos
```

**¿Qué?**
Instalar todas las librerías necesarias en grupos lógicos.

**¿Por qué en grupos?**
Facilita entender qué hace cada dependencia y permite instalar en paralelo.

```bash
# Grupo A: Base de datos (necesario para Fase 2)
pnpm install drizzle-orm postgres
pnpm install -D drizzle-kit

# Grupo B: Validación (necesario para Fase 3)
pnpm install zod react-hook-form @hookform/resolvers drizzle-zod

# Grupo C: UI (necesario para Fase 5)
# Se instala con shadcn init

# Grupo D: Utilidades (usado en múltiples fases)
pnpm install date-fns uuid
pnpm install -D @types/uuid

# Grupo E: Storage (necesario para Fase 7)
pnpm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Diagrama de dependencias de librerías:**

```
drizzle-orm ◄─────── drizzle-zod ─────► zod
     │                                    │
     │                                    ▼
     ▼                            @hookform/resolvers
  postgres                               │
                                         ▼
                               react-hook-form
```

**¿Por qué `postgres` en lugar de `pg`?**

- Más rápido (no usa node-gyp)
- Mejor soporte para tipos TypeScript
- API moderna con Promises

---

### Tarea 1.3: Configurar PostgreSQL

```
Secuencia: Después de 1.2 (necesita drizzle-kit)
Paralelo con: 1.4 (Shadcn)
Duración estimada: 10 minutos
```

**¿Qué?**
Configurar la conexión a la base de datos y Drizzle Kit.

**¿Por qué Docker para PostgreSQL?**

| Opción       | Pros                                     | Contras                                     |
| ------------ | ---------------------------------------- | ------------------------------------------- |
| Docker       | Aislado, reproducible, fácil de resetear | Requiere Docker instalado                   |
| Local        | Sin Docker                               | Configuración manual, conflictos de versión |
| Cloud (Neon) | Sin instalación                          | Requiere internet, latencia                 |

**Archivos creados:**

```yaml
# docker-compose.yml
# ¿Por qué un archivo separado?
# - Versionable en Git
# - Compartible con el equipo
# - Fácil de modificar sin tocar código
```

```typescript
// drizzle.config.ts
// ¿Por qué archivo de configuración separado?
// - Drizzle Kit lo requiere
// - Separa config de código
// - Permite diferentes configs por entorno
```

```typescript
// db/index.ts
// ¿Por qué singleton del cliente?
// - Una sola conexión compartida
// - Evita connection leaks
// - Permite logging centralizado
```

---

### Tarea 1.4: Configurar Shadcn/ui

```
Secuencia: Después de 1.2
Paralelo con: 1.3 (PostgreSQL)
Duración estimada: 5 minutos
```

**¿Qué?**
Inicializar Shadcn/ui e instalar componentes base.

**¿Por qué Shadcn/ui y no otra librería?**

| Librería   | Modelo     | Personalización      | Bundle Size      |
| ---------- | ---------- | -------------------- | ---------------- |
| Shadcn/ui  | Copy/paste | Total (es tu código) | Solo lo que usas |
| MUI        | Package    | Temas limitados      | Grande           |
| Chakra     | Package    | Props                | Medio            |
| Ant Design | Package    | Temas                | Grande           |

**¿Por qué instalar componentes específicos?**

```bash
pnpx shadcn@latest add button input label textarea select \
  checkbox radio-group calendar popover form card table \
  badge dialog sonner
```

Cada componente se copia a tu código. Solo instalamos lo que usamos para:

- Menor bundle size
- Control total del código
- Sin dependencias ocultas

---

### Tarea 1.5: Estructura de Carpetas

```
Secuencia: Después de 1.3 y 1.4
Duración estimada: 5 minutos
```

**¿Qué?**
Crear la estructura de directorios del proyecto.

**¿Por qué esta estructura específica?**

```
proyecto/
├── app/                    # Next.js App Router (convención)
│   └── documentos/         # Feature-based (por módulo)
│       └── _components/    # Colocación (componentes junto a páginas)
│
├── actions/                # Server Actions separadas
│                          # ¿Por qué no en app/?
│                          # - Reutilizables entre páginas
│                          # - Más fácil de testear
│                          # - Clara separación de responsabilidades
│
├── components/
│   ├── forms/             # Componentes de formulario reutilizables
│   └── ui/                # Shadcn (no tocar)
│
├── db/                    # Todo relacionado con BD junto
│   ├── schema/           # Definiciones de tablas
│   └── migrations/       # Cambios versionados
│
├── lib/                   # Utilidades y lógica compartida
│   ├── validations/      # Schemas Zod
│   ├── storage/          # Abstracción de storage
│   └── errors/           # Sistema de errores
│
├── hooks/                 # Custom hooks
└── types/                 # Tipos globales
```

**Principios aplicados:**

1. **Colocación**: Componentes específicos cerca de donde se usan (`_components/`)
2. **Feature-based**: Código organizado por funcionalidad, no por tipo
3. **Separación de capas**: DB → Validación → Actions → UI

---

## FASE 2: CAPA DE DATOS

### Tarea 2.1: Definir Enums

```
Secuencia: Primera de Fase 2
Dependencias: Fase 1 completa
Duración estimada: 10 minutos
```

**¿Qué?**
Crear los tipos enumerados de PostgreSQL.

**¿Por qué enums de PostgreSQL y no strings?**

| Enfoque          | Validación | Storage  | Rendimiento |
| ---------------- | ---------- | -------- | ----------- |
| Enum PG          | En BD      | 4 bytes  | Más rápido  |
| String           | En app     | Variable | Más lento   |
| Check constraint | En BD      | Variable | Medio       |

**¿Por qué definir enums ANTES de la tabla?**

```typescript
// 1. Drizzle necesita los enums para referenciarlos en la tabla
// 2. Las migraciones deben crear enums antes de usarlos
// 3. Permite exportar tipos TypeScript derivados

export const tipoDocumentoEnum = pgEnum('tipo_documento', [...]);

// Esto genera automáticamente:
export type TipoDocumento = 'resolucion' | 'circular' | ...
```

**¿Por qué exportar labels separados?**

```typescript
export const TIPO_DOCUMENTO_LABELS = {
  resolucion: "Resolución", // Acento
  circular: "Circular",
};

// Separación de concerns:
// - BD: valores simples (resolucion)
// - UI: texto legible (Resolución)
```

---

### Tarea 2.2: Definir Schema de Tabla

```
Secuencia: Después de 2.1 (necesita enums)
Duración estimada: 20 minutos
```

**¿Qué?**
Definir la estructura de la tabla `documentos`.

**¿Por qué cada decisión de columna?**

```typescript
export const documentos = pgTable("documentos", {
  // ¿Por qué UUID y no autoincrement?
  // - Generación distribuida (no necesita BD)
  // - No revela cantidad de registros
  // - Más seguro en URLs
  id: uuid("id").defaultRandom().primaryKey(),

  // ¿Por qué varchar con límite y no text?
  // - Validación en BD (segunda línea de defensa)
  // - Optimización de almacenamiento
  codigo: varchar("codigo", { length: 20 }).notNull().unique(),

  // ¿Por qué date con mode: 'string'?
  // - Evita problemas de timezone
  // - Más fácil en formularios (input type="date")
  // - JSON serializable sin transformación
  fechaExpedicion: date("fecha_expedicion", { mode: "string" }).notNull(),

  // ¿Por qué text[].array() y no tabla relacionada?
  // - Etiquetas son simples (solo texto)
  // - No necesitan metadatos
  // - Queries más simples
  // - Para relaciones complejas: tabla separada
  etiquetas: text("etiquetas").array(),

  // ¿Por qué campos separados para archivo?
  // - archivoAdjunto: dónde está
  // - archivoNombre: cómo se llamaba (para descargas)
  // - archivoTipo: qué es (para preview)
  // - archivoTamanio: cuánto pesa (para UI)
  archivoAdjunto: varchar("archivo_adjunto", { length: 500 }),
  archivoNombre: varchar("archivo_nombre", { length: 255 }),

  // ¿Por qué $onUpdate?
  // - Drizzle lo maneja, no PostgreSQL
  // - Más portable entre BDs
  // - Control en la aplicación
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});
```

**Tipos inferidos automáticamente:**

```typescript
// Drizzle genera estos tipos del schema
type Documento = typeof documentos.$inferSelect; // Para consultas
type NuevoDocumento = typeof documentos.$inferInsert; // Para inserts
```

---

### Tarea 2.3: Generar y Aplicar Migraciones

```
Secuencia: Después de 2.2 (necesita schema)
Duración estimada: 5 minutos
```

**¿Qué?**
Convertir el schema TypeScript en SQL y aplicarlo a PostgreSQL.

**¿Por qué migraciones y no push directo?**

| Comando                      | Uso        | Ventajas                          | Desventajas                      |
| ---------------------------- | ---------- | --------------------------------- | -------------------------------- |
| `db:generate` + `db:migrate` | Producción | Versionado, reversible, auditable | Más pasos                        |
| `db:push`                    | Desarrollo | Rápido, directo                   | Sin historial, peligroso en prod |

**Flujo de migraciones:**

```
Schema TypeScript
       │
       ▼ (db:generate)
Archivo SQL en /migrations
       │
       ▼ (db:migrate)
PostgreSQL actualizado
```

**¿Por qué revisar la migración generada?**

```sql
-- Drizzle genera esto, pero debes verificar:
-- 1. ¿Los tipos son correctos?
-- 2. ¿Los defaults tienen sentido?
-- 3. ¿Los constraints están bien?

CREATE TYPE "tipo_documento" AS ENUM(...);
CREATE TABLE "documentos" (...);
```

---

### Tarea 2.4: Crear Seed (Opcional)

```
Secuencia: Después de 2.3 (necesita tabla creada)
Paralelo con: Fase 3 (puede empezar sin seed)
Duración estimada: 10 minutos
```

**¿Qué?**
Crear datos de prueba para desarrollo.

**¿Por qué archivo separado y no en migración?**

- Migraciones: estructura (schema)
- Seed: datos de prueba
- Separación permite resetear datos sin perder estructura

**¿Por qué tsx para ejecutar?**

```bash
pnpm install -D tsx

# tsx permite ejecutar TypeScript directamente
# sin compilar a JavaScript primero
pnpm db:seed  # "tsx db/seed.ts"
```

---

## FASE 3: CAPA DE VALIDACIÓN

### Tarea 3.1: Schema Zod para Servidor

```
Secuencia: Primera de Fase 3
Dependencias: Fase 2 completa (necesita tipos de DB)
Duración estimada: 30 minutos
```

**¿Qué?**
Crear schemas Zod que validan los datos para Server Actions.

**¿Por qué Zod y no validación manual?**

```typescript
// Sin Zod:
function validar(data: unknown) {
  if (!data.codigo) throw new Error("Código requerido");
  if (data.codigo.length < 3) throw new Error("Código muy corto");
  if (data.codigo.length > 20) throw new Error("Código muy largo");
  if (!data.codigo.match(/^[A-Z]{2,5}-\d{4}-\d{3,5}$/)) {
    throw new Error("Formato inválido");
  }
  // ... 50 líneas más
  // ¿Y los tipos? Siguen siendo unknown
}

// Con Zod:
const schema = z.object({
  codigo: z
    .string()
    .min(3, "Código muy corto")
    .max(20, "Código muy largo")
    .regex(/^[A-Z]{2,5}-\d{4}-\d{3,5}$/, "Formato inválido"),
});

// Tipos inferidos automáticamente:
type Datos = z.infer<typeof schema>;
```

**¿Por qué constantes centralizadas?**

```typescript
export const VALIDACION = {
  CODIGO: {
    MIN: 3,
    MAX: 20,
    PATTERN: /^[A-Z]{2,5}-\d{4}-\d{3,5}$/,
  },
};

// Beneficios:
// 1. Un solo lugar para cambiar límites
// 2. Reutilizable en UI (maxLength del input)
// 3. Documentación implícita
// 4. Evita magic numbers
```

**¿Por qué .refine() para validaciones cruzadas?**

```typescript
.refine(
  (data) => {
    if (!data.fechaVencimiento) return true;
    return new Date(data.fechaVencimiento) > new Date(data.fechaExpedicion);
  },
  {
    message: 'Fecha vencimiento debe ser posterior',
    path: ['fechaVencimiento'],  // El error aparece en este campo
  }
)
```

---

### Tarea 3.2: Schema Zod para Cliente

```
Secuencia: Después de 3.1 (deriva del schema servidor)
Duración estimada: 15 minutos
```

**¿Qué?**
Schema específico para React Hook Form.

**¿Por qué un schema separado para el cliente?**

| Aspecto          | Schema Servidor                  | Schema Cliente      |
| ---------------- | -------------------------------- | ------------------- |
| Archivo          | `File → metadatos ya procesados` | `File \| null`      |
| Campos vacíos    | `null`                           | `''` (string vacío) |
| Transformaciones | Todas                            | Mínimas             |
| Uso              | Server Action                    | React Hook Form     |

```typescript
// Servidor: recibe metadatos del archivo ya subido
archivoAdjunto: z.string().nullable(),
archivoNombre: z.string().nullable(),

// Cliente: maneja el File directamente
archivo: z.instanceof(File).nullable(),
```

**¿Por qué valores por defecto?**

```typescript
export const documentoFormDefaults: DocumentoFormValues = {
  codigo: "",
  titulo: "",
  tipo: "otro",
  estado: "borrador",
  fechaExpedicion: new Date().toISOString().split("T")[0],
  // ...
};

// 1. El formulario siempre tiene valores controlados
// 2. Evita undefined vs null vs ''
// 3. Defaults sensatos mejoran UX
```

---

### Tarea 3.3: Helpers de Validación

```
Secuencia: Paralelo con 3.2
Duración estimada: 15 minutos
```

**¿Qué?**
Funciones utilitarias para trabajar con validación.

**¿Por qué `validarConSchema()` retorna ActionResponse?**

```typescript
function validarConSchema<T>(schema, data): ActionResponse<T> {
  // Encapsula try/catch
  // Transforma ZodError a formato estándar
  // Retorna tipo consistente
}

// Uso:
const resultado = validarConSchema(schema, datos);
if (!resultado.success) {
  return resultado; // Ya tiene el formato correcto
}
```

**¿Por qué `formatearTamanioArchivo()` aquí?**

```typescript
// Validación y presentación van juntas
// El usuario ve "Máximo 10MB"
// El error dice "Excede 10MB"
// Ambos usan la misma función
```

---

## FASE 4: CAPA DE ACCIONES

### Tarea 4.1: Utils y Helpers de Actions

```
Secuencia: Primera de Fase 4
Dependencias: Fase 3 completa
Duración estimada: 20 minutos
```

**¿Qué?**
Crear el wrapper `ejecutarAccion()` y helpers compartidos.

**¿Por qué un wrapper y no try/catch en cada action?**

```typescript
// Sin wrapper (repetitivo):
async function crearDocumento(data) {
  try {
    // lógica
    return { success: true, data: resultado };
  } catch (error) {
    if (error instanceof ZodError) {
      /* ... */
    }
    if (isPostgresError(error)) {
      /* ... */
    }
    console.error(error);
    return { success: false, error: "Error" };
  }
}

// Con wrapper (DRY):
async function crearDocumento(data) {
  return ejecutarAccion(async () => {
    // Solo la lógica de negocio
    return resultado;
  });
}
```

**¿Por qué mapear errores de PostgreSQL?**

```typescript
switch (error.code) {
  case "23505": // Unique violation
  // El usuario entiende "Ya existe un documento con este código"
  // No entiende "duplicate key value violates unique constraint"
}
```

---

### Tarea 4.2: Action Crear

```
Secuencia: Después de 4.1
Duración estimada: 15 minutos
```

**¿Qué?**
Server Action para crear documentos.

**¿Por qué `'use server'` al inicio?**

```typescript
"use server";

// Indica a Next.js que:
// 1. Este código SOLO corre en servidor
// 2. Las funciones exportadas son invocables desde cliente
// 3. Los argumentos se serializan automáticamente
```

**¿Por qué validar aunque el cliente ya validó?**

```typescript
export async function crearDocumento(input) {
  return ejecutarAccion(async () => {
    // SIEMPRE validar en servidor
    const datosValidados = validarDatos(crearDocumentoSchema, input);

    // ¿Por qué?
    // 1. Cliente puede ser manipulado (DevTools)
    // 2. Puede llegar data de otras fuentes (API)
    // 3. Defensa en profundidad
  });
}
```

**¿Por qué `revalidatePath()` al final?**

```typescript
// Después de crear:
revalidatePath("/documentos");

// Invalida el caché de esa ruta
// La próxima visita re-fetcha datos frescos
// Sin esto, el listado no mostraría el nuevo documento
```

---

### Tareas 4.3, 4.4, 4.5: Actions CRUD

```
Secuencia: Después de 4.2 (pueden ser paralelas entre sí)
Duración estimada: 30 minutos total
```

**¿Por qué acciones separadas por archivo?**

```
actions/documentos/
├── crear.ts      # 50 líneas
├── obtener.ts    # 100 líneas (incluye filtros)
├── actualizar.ts # 60 líneas
└── eliminar.ts   # 40 líneas
```

Beneficios:

1. Archivos pequeños y enfocados
2. Fácil de encontrar lo que buscas
3. Git diffs más claros
4. Imports selectivos (tree-shaking)

**¿Por qué `actualizarDocumentoSchema.partial()`?**

```typescript
// Para actualizar, no todos los campos son requeridos
const actualizarSchema = crearSchema.partial().extend({
  id: z.string().uuid(), // Excepto el ID
});

// Permite: { id: '123', titulo: 'Nuevo título' }
// Sin enviar todos los demás campos
```

---

## FASE 5: COMPONENTES UI

### Tarea 5.1: FormFieldWrapper

```
Secuencia: Primera de Fase 5
Dependencias: Shadcn/ui instalado
Duración estimada: 15 minutos
```

**¿Qué?**
Componente base que envuelve todos los campos.

**¿Por qué un wrapper común?**

```typescript
// Antes: repetir en cada componente
<div>
  <Label>{label}</Label>
  <Input {...} />
  {error && <span className="text-red-500">{error}</span>}
  {description && <span className="text-gray-500">{description}</span>}
</div>

// Después: wrapper reutilizable
<FormFieldWrapper name="titulo" label="Título" required>
  <Input {...} />
</FormFieldWrapper>
```

**¿Por qué `useFormContext()` y no props?**

```typescript
// Con props (prop drilling):
<FormInput
  register={form.register}
  errors={form.formState.errors}
  control={form.control}
  name="titulo"
/>

// Con useFormContext (limpio):
<FormInput name="titulo" />

// El componente obtiene lo que necesita del contexto
const { control, formState: { errors } } = useFormContext();
```

---

### Tareas 5.2-5.5: Componentes de Formulario

```
Secuencia: Después de 5.1
Paralelo: Sí (independientes entre sí)
Duración estimada: 60 minutos total
```

**¿Por qué un componente por tipo de input?**

| Componente       | Complejidad | Razón de separación              |
| ---------------- | ----------- | -------------------------------- |
| FormInput        | Baja        | Base para texto simple           |
| FormSelect       | Media       | Maneja options, placeholder      |
| FormDatePicker   | Alta        | Calendar, format, locale         |
| FormFileDragDrop | Alta        | Drag events, preview, validación |

**¿Por qué Controller y no register?**

```typescript
// register: para inputs nativos simples
<input {...register('titulo')} />

// Controller: para componentes complejos
<Controller
  name="tipo"
  control={control}
  render={({ field }) => (
    <Select
      value={field.value}
      onValueChange={field.onChange}
    />
  )}
/>

// Select de Shadcn no es un <select> nativo
// Necesita Controller para integrarse con RHF
```

---

### Tarea 5.6: Exportar Index

```
Secuencia: Última de Fase 5
Duración estimada: 5 minutos
```

**¿Qué?**
Archivo barrel que re-exporta todos los componentes.

**¿Por qué barrel exports?**

```typescript
// Sin barrel:
import { FormInput } from "@/components/forms/form-input";
import { FormSelect } from "@/components/forms/form-select";
import { FormDate } from "@/components/forms/form-date-picker";

// Con barrel:
import { FormInput, FormSelect, FormDate } from "@/components/forms";
```

---

## FASE 6: INTEGRACIÓN

### Tarea 6.1: Hook useDocumentoForm

```
Secuencia: Primera de Fase 6
Dependencias: Fases 3, 4, 5 completas
Duración estimada: 30 minutos
```

**¿Qué?**
Custom hook que encapsula toda la lógica del formulario.

**¿Por qué extraer a un hook?**

```typescript
// El componente solo se preocupa de UI:
function DocumentoForm() {
  const { form, isPending, onSubmit } = useDocumentoForm();
  return <form onSubmit={onSubmit}>...</form>;
}

// El hook maneja:
// - Configuración de React Hook Form
// - Llamadas a Server Actions
// - Upload de archivos
// - Manejo de errores
// - Navegación post-submit
```

**¿Por qué detectar modo edición automáticamente?**

```typescript
function useDocumentoForm({ documento }) {
  const isEditing = !!documento;

  // Un solo hook, dos comportamientos:
  // - Sin documento: crear
  // - Con documento: editar (pre-llenar form)
}
```

---

### Tareas 6.2-6.5: Formulario y Páginas

```
Secuencia: Después de 6.1
Paralelo: Parcialmente (6.2 primero, luego 6.3-6.5 en paralelo)
Duración estimada: 45 minutos total
```

**¿Por qué organizar el form en Cards/secciones?**

```typescript
<Card>
  <CardHeader><CardTitle>Información Básica</CardTitle></CardHeader>
  <CardContent>
    <FormInput name="codigo" />
    <FormInput name="titulo" />
  </CardContent>
</Card>

// Beneficios:
// 1. Formulario largo se vuelve manejable
// 2. Agrupación lógica
// 3. Mejor escaneo visual
// 4. Posibilidad de colapsar secciones
```

**¿Por qué páginas separadas para crear/editar/ver?**

```
/documentos/nuevo     → Crear (formulario vacío)
/documentos/[id]      → Ver (solo lectura)
/documentos/[id]/editar → Editar (formulario pre-llenado)
```

Alternativa: Todo en una página con tabs/modes

```
/documentos/[id]?mode=edit
```

Elegimos rutas separadas porque:

1. URLs más claras y compartibles
2. Mejor para SEO
3. Historial de navegación más limpio
4. Cada página tiene su metadata

---

## FASE 7: FEATURES AVANZADAS

### Tarea 7.1: Sistema de Upload

```
Secuencia: Paralelo con 7.2 y 7.3
Dependencias: Fase 6 completa
Duración estimada: 60 minutos
```

**¿Por qué abstracción de storage?**

```typescript
interface StorageProvider {
  upload(file, filename): Promise<UploadResult>;
  delete(path): Promise<boolean>;
  getUrl(path): string;
}

// Implementaciones:
class LocalStorageProvider implements StorageProvider {}
class S3StorageProvider implements StorageProvider {}

// El código que usa storage no sabe cuál es:
const storage = getStorage();
await storage.upload(file, name);
```

**¿Por qué presigned URLs para S3?**

```
Sin presigned URL:
Cliente → Servidor → S3
         (doble transferencia)

Con presigned URL:
1. Cliente pide URL al servidor
2. Servidor genera URL firmada
3. Cliente sube directo a S3
   (una sola transferencia)
```

---

### Tarea 7.2: Listado con Filtros

```
Secuencia: Paralelo con 7.1 y 7.3
Duración estimada: 60 minutos
```

**¿Por qué filtros en URL?**

```typescript
// Estado en URL:
/documentos?busqueda=res&tipo=resolucion&page=2

// Beneficios:
// 1. Compartible: "mira estos documentos filtrados"
// 2. Bookmarkeable: guardar búsquedas frecuentes
// 3. Back button funciona
// 4. Refresh mantiene filtros
```

**¿Por qué paginación server-side?**

```typescript
// Client-side: carga todos, pagina en memoria
const todos = await fetch("/api/documentos"); // 10,000 docs
const pagina = todos.slice(0, 10);

// Server-side: solo carga lo necesario
const pagina = await fetch("/api/documentos?page=1&size=10"); // 10 docs

// Con 10,000 documentos:
// Client-side: ~5MB transferidos, 2s carga inicial
// Server-side: ~5KB transferidos, 100ms carga
```

---

### Tarea 7.3: Sistema de Errores

```
Secuencia: Paralelo con 7.1 y 7.2
Duración estimada: 45 minutos
```

**¿Por qué clases de error tipadas?**

```typescript
// Error genérico:
throw new Error("No encontrado");
// ¿Es un 404? ¿Un error de BD? ¿Qué hago?

// Error tipado:
throw new NotFoundError("Documento", id);
// Sé exactamente qué pasó y cómo manejarlo
```

**¿Por qué error boundaries en múltiples niveles?**

```
App Layout
    │
    └── Error Boundary (global)
            │
            └── /documentos Layout
                    │
                    └── Error Boundary (módulo) ← error.tsx
                            │
                            └── Componentes
                                    │
                                    └── Error Boundary (componente) ← <ErrorBoundary>
```

Cada nivel captura errores de sus hijos sin crashear toda la app.

---

### Tarea 7.4: Integración Final

```
Secuencia: Después de 7.1, 7.2, 7.3
Duración estimada: 30 minutos
```

**¿Qué?**
Conectar todas las partes y verificar que funcionan juntas.

**Checklist de integración:**

- [ ] Crear documento → aparece en listado
- [ ] Subir archivo → se guarda en storage
- [ ] Filtrar → URL se actualiza
- [ ] Error → se muestra mensaje amigable
- [ ] Editar → form pre-llenado
- [ ] Eliminar → confirmación → redirect

---

## Resumen: Orden Óptimo de Desarrollo

```
SEMANA 1: Fundamentos
├── Día 1: Fase 1 completa (setup)
├── Día 2: Fase 2 completa (base de datos)
└── Día 3: Fase 3 completa (validación)

SEMANA 2: Core
├── Día 4: Fase 4 completa (server actions)
├── Día 5-6: Fase 5 completa (componentes)
└── Día 7: Fase 6 completa (integración)

SEMANA 3: Features
├── Día 8: Tarea 7.1 (upload)
├── Día 9: Tarea 7.2 (listado)
├── Día 10: Tarea 7.3 (errores)
└── Día 11: Tarea 7.4 (integración final)
```

**Tiempos estimados totales:**

- Fase 1: ~30 minutos
- Fase 2: ~45 minutos
- Fase 3: ~60 minutos
- Fase 4: ~65 minutos
- Fase 5: ~80 minutos
- Fase 6: ~75 minutos
- Fase 7: ~195 minutos

**Total: ~9-10 horas** para un desarrollador familiarizado con el stack.

---

## Diagrama de Dependencias Críticas

```
                    ┌─────────────────┐
                    │  Proyecto Next  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │PostgreSQL│  │ Shadcn/ui│  │   Zod    │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │              │              │
             ▼              │              │
        ┌──────────┐        │              │
        │  Schema  │        │              │
        │ Drizzle  │        │              │
        └────┬─────┘        │              │
             │              │              │
             ▼              │              ▼
        ┌──────────┐        │        ┌──────────┐
        │Migraciones│       │        │ Schemas  │
        └────┬─────┘        │        │   Zod    │
             │              │        └────┬─────┘
             │              │              │
             └──────────────┼──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   Server     │
                    │   Actions    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │Componentes│ │  Hooks   │ │  Páginas │
        │   Form   │ │  Custom  │ │ Next.js  │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┴────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │  Aplicación   │
                  │   Completa    │
                  └───────────────┘
```

---

**Este flujo garantiza que:**

1. Nunca trabajas en algo que depende de algo no terminado
2. Las tareas paralelas están claramente identificadas
3. Cada fase tiene un entregable verificable
4. El proyecto es funcional en cada etapa
