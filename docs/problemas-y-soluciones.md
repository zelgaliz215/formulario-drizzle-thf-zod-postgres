# Registro de Problemas y Soluciones

Este documento documenta los retos técnicos encontrados durante el desarrollo y cómo se resolvieron.

---

## 1. Error en Rutas de `drizzle.config.ts`

### Problema

Al intentar ejecutar `pnpm db:generate`, Drizzle Kit no lograba encontrar los archivos del esquema o no generaba las migraciones en la carpeta esperada.

**Error:**

```text
Error: Could not find any schema files
```

### Causa

Las rutas en `drizzle.config.ts` tenían un punto extra al inicio (`.db/` en lugar de `./db/`), lo que hacía que el sistema buscara en una carpeta oculta que no existía.

### Solución

Se corrigieron las rutas en el archivo de configuración para apuntar correctamente a la carpeta `db`:

```typescript
// drizzle.config.ts
export default defineConfig({
  schema: "./db/schema/", // Antes: ".db/schema/"
  out: "./db/migrations", // Antes: ".db/migrations"
  // ...
});
```

---

## 2. Variables de Entorno no cargadas en Scripts (Seed)

### Problema

Al ejecutar `pnpm db:seed`, el script fallaba inmediatamente indicando que la URL de la base de datos no estaba definida, a pesar de que existía un archivo `.env.local` y se llamaba a `dotenv.config()` en el archivo de seed.

**Error:**

```text
Error: La url de la base de datos no esta definida
    at postgres (C:\...\db\index.ts:7:11)
```

### Causa

Debido al comportamiento de los módulos de JavaScript (ESM), las sentencias `import` se ejecutan (hoisting) **antes** que cualquier código lógico en el archivo.

En `seed.ts`:

```typescript
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // Esto se ejecuta DESPUÉS de los imports

import { db } from "./index"; // Esto disparaba la inicialización en db/index.ts sin variables cargadas
```

### Solución

Se centralizó la carga de variables de entorno directamente en el punto de entrada de la base de datos (`db/index.ts`) para asegurar que cualquier script que importe la base de datos tenga acceso a las variables inmediatamente.

```typescript
// db/index.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Ahora process.env.DATABASE_URL ya está disponible antes de inicializar la conexión
if (!process.env.DATABASE_URL) {
  throw new Error("La url de la base de datos no esta definida");
}
```

---

## 3. Estado de la Base de Datos (Sincronización)

### Problema

Incongruencia entre el esquema definido en código y las tablas en el motor de base de datos (PostgreSQL).

### Solución

Utilizar el flujo estándar de Drizzle:

1. `pnpm db:generate`: Para crear los archivos de migración `.sql`.
2. `pnpm db:push`: Para aplicar cambios rápidos en desarrollo.
3. `pnpm db:migrate`: Para aplicar migraciones formales.

---

## 4. Centralización de Tipos Globales (Re-exportación)

### Problema

Importaciones desordenadas y "profundas" en los componentes y Server Actions (ej. `import { Documento } from "@/db/schema/documents"`), lo que hace que el código sea difícil de mantener y propenso a errores al refactorizar carpetas.

### Causa

Cada archivo de esquema exporta sus propios tipos, lo que obliga a conocer la estructura exacta de carpetas de la base de datos desde la capa de UI.

### Solución

Se implementó un archivo centralizado en `@/types/index.ts` que re-exporta los tipos del schema junto con tipos de utilidad de la aplicación (paginación, filtros, respuestas de acciones).

**Beneficios:**

1. **Abstracción:** La UI solo conoce `@/types`, no la estructura interna del DB.
2. **Punto Único de Verdad:** Todos los tipos de negocio residen en un mismo lugar.
3. **Mantenibilidad:** Si el schema cambia de ubicación, solo se actualiza una línea en el archivo de tipos central.
4. **Seguridad:** Evita dependencias circulares al importar desde un archivo de tipos puro (.ts) en lugar de uno con lógica de base de datos.

---

## 5. Tipos de TypeScript vs. Migraciones de Base de Datos

### Problema

Incertidumbre sobre si añadir exportaciones de tipos (como `Documento = typeof documentos.$inferSelect`) requiere generar (`generate`) y aplicar (`migrate`) una nueva migración.

### Causa

Confusión entre los archivos de esquema que definen la estructura física (SQL) y las utilidades de TypeScript que definen la forma de los datos para el compilador.

### Solución

No es necesario migrar. Las utilidades de inferencia de tipos de Drizzle (`$inferSelect`, `$inferInsert`) son **puramente TypeScript**.

**Regla de Oro:**

- **Requiere Migración:** Cambios en `pgTable`, `pgEnum`, añadir/quitar columnas, cambiar tipos de datos SQL, índices o restricciones (`notNull`, `unique`).
- **No Requiere Migración:** Añadir `export type`, cambiar nombres de variables de TypeScript que no afecten el nombre de la columna en Postgres, o añadir lógica de validación que solo vive en el código.
