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

import { db } from './index'; // Esto disparaba la inicialización en db/index.ts sin variables cargadas
```

### Solución
Se centralizó la carga de variables de entorno directamente en el punto de entrada de la base de datos (`db/index.ts`) para asegurar que cualquier script que importe la base de datos tenga acceso a las variables inmediatamente.

```typescript
// db/index.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Ahora process.env.DATABASE_URL ya está disponible antes de inicializar la conexión
if (!process.env.DATABASE_URL) {
    throw new Error("La url de la base de datos no esta definida")
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
