# Módulo 1: Fundamentos y Setup

## Objetivo del Módulo

Al finalizar este módulo tendrás un proyecto Next.js 15 completamente configurado con Drizzle ORM, PostgreSQL, Shadcn/ui y todas las dependencias necesarias para construir formularios robustos con validación.

---

## 1.1 Conceptos Fundamentales

Antes de escribir código, entendamos por qué usamos esta combinación de tecnologías:

### ¿Por qué Drizzle ORM?

Drizzle es un ORM TypeScript-first que ofrece:

- **Type safety completo**: Los tipos se infieren directamente del schema, sin generación de código adicional
- **SQL-like syntax**: Si conoces SQL, conoces Drizzle
- **Ligero**: Sin runtime pesado, compila a queries SQL puras
- **Migraciones declarativas**: Tu schema ES tu fuente de verdad

### ¿Por qué Zod?

Zod permite definir esquemas de validación que:

- **Infieren tipos TypeScript**: Un schema Zod genera su tipo automáticamente
- **Funcionan en cliente y servidor**: La misma validación en ambos lados
- **Son componibles**: Puedes extender, transformar y combinar schemas
- **Se integran con React Hook Form**: Via `@hookform/resolvers`

### ¿Por qué React Hook Form?

React Hook Form es la librería de formularios más eficiente porque:

- **Minimiza re-renders**: Usa refs en lugar de estado controlado
- **Es ligera**: ~9kb minificado
- **Tiene excelente DX**: API intuitiva con hooks
- **Integración nativa con Zod**: Validación sin código adicional

### ¿Por qué Server Actions?

Los Server Actions de Next.js 15 permiten:

- **Mutaciones sin API Routes**: Menos boilerplate
- **Validación en servidor**: Seguridad garantizada
- **Progressive Enhancement**: Funcionan sin JavaScript
- **Integración con caché**: Revalidación automática

---

## 1.2 Crear el Proyecto Next.js

Abre tu terminal y ejecuta:

```bash
npx create-next-app@latest documentos-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Cuando te pregunte por las opciones, selecciona:

```
✔ Would you like to use Turbopack for next dev? → Yes
✔ Would you like to customize the default import alias? → No
```

Entra al proyecto:

```bash
cd documentos-app
```

---

## 1.3 Instalar Dependencias

### Dependencias de Base de Datos (Drizzle + PostgreSQL)

```bash
pnpm install drizzle-orm postgres
pnpm install -D drizzle-kit @types/pg
```

- `drizzle-orm`: El ORM principal
- `postgres`: Driver de PostgreSQL (usamos `postgres` en lugar de `pg` por mejor rendimiento)
- `drizzle-kit`: CLI para migraciones y studio
- `@types/pg`: Tipos de TypeScript

### Dependencias de Validación y Formularios

```bash
pnpm install zod react-hook-form @hookform/resolvers drizzle-zod
```

- `zod`: Validación de schemas
- `react-hook-form`: Manejo de formularios
- `@hookform/resolvers`: Conecta Zod con React Hook Form
- `drizzle-zod`: Genera schemas Zod desde Drizzle automáticamente

### Dependencias de UI (Shadcn/ui)

Inicializa Shadcn/ui:

```bash
pnpm dlx shadcn@latest init
```

Selecciona estas opciones:

```
✔ Which style would you like to use? → New York
✔ Which color would you like to use as base color? → Slate
✔ Would you like to use CSS variables for colors? → Yes
```

Instala los componentes que usaremos:

```bash
pnpm dlx shadcn@latest add button input label textarea select checkbox radio-group calendar popover form card table badge dialog sonner alert-dialog
```

### Dependencias Adicionales

```bash
pnpm install date-fns uuid
pnpm install -D @types/uuid
```

- `date-fns`: Manejo de fechas (usado por el date picker)
- `uuid`: Generación de IDs únicos

### Dependencias para Upload de Archivos

```bash
pnpm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Estas las usaremos más adelante para el módulo de uploads.

---

## 1.4 Configurar Variables de Entorno

Crea el archivo `.env.local` en la raíz del proyecto:

```bash
touch .env.local
```

Agrega las siguientes variables:

```env
# Base de datos PostgreSQL
DATABASE_URL="postgresql://usuario:password@localhost:5432/documentos_db"

# Storage (lo configuraremos después)
STORAGE_TYPE="local"

# S3/R2 (opcional, para producción)
S3_ENDPOINT=""
S3_REGION=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_BUCKET_NAME=""

# URL base de la aplicación
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> **Nota:** Para desarrollo local puedes usar Docker para PostgreSQL. Más adelante te muestro cómo.

---

## 1.5 Configurar PostgreSQL con Docker (Opcional pero Recomendado)

Si no tienes PostgreSQL instalado, la forma más fácil es usar Docker.

Crea un archivo `docker-compose.yml` en la raíz:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    container_name: documentos_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: usuario
      POSTGRES_PASSWORD: password
      POSTGRES_DB: documentos_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Inicia el contenedor:

```bash
docker-compose up -d
```

Verifica que esté corriendo:

```bash
docker-compose ps
```

---

## 1.6 Configurar Drizzle ORM

### Archivo de Configuración de Drizzle

Crea el archivo `drizzle.config.ts` en la raíz:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // Ubicación de los archivos de schema
  schema: "./src/db/schema/index.ts",

  // Carpeta donde se guardarán las migraciones
  out: "./src/db/migrations",

  // Dialecto de base de datos
  dialect: "postgresql",

  // Conexión a la base de datos
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },

  // Opciones adicionales
  verbose: true,
  strict: true,
});
```

### Cliente de Base de Datos

Crea la estructura de carpetas:

```bash
mkdir -p src/db/schema src/db/migrations
```

Crea el archivo `src/db/index.ts`:

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Verificar que existe la URL de conexión
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definida en las variables de entorno");
}

// Crear conexión a PostgreSQL
// En desarrollo usamos una conexión, en producción usamos pool
const connectionString = process.env.DATABASE_URL;

// Para queries (conexión persistente)
const client = postgres(connectionString, {
  max: 1, // Una conexión para desarrollo, ajustar para producción
  onnotice: () => {}, // Silenciar notices de PostgreSQL
});

// Exportar instancia de Drizzle con el schema
export const db = drizzle(client, {
  schema,
  logger: process.env.NODE_ENV === "development", // Log queries en desarrollo
});

// Exportar tipos útiles
export type Database = typeof db;
```

### Schema Inicial (Placeholder)

Crea el archivo `src/db/schema/index.ts`:

```typescript
// Aquí exportaremos todas las tablas
// Por ahora está vacío, lo llenaremos en el Módulo 2

export {};
```

---

## 1.7 Scripts de PNPM

Actualiza tu `package.json` para agregar scripts útiles:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:drop": "drizzle-kit drop"
  }
}
```

**Explicación de los scripts de Drizzle:**

| Script        | Descripción                                                |
| ------------- | ---------------------------------------------------------- |
| `db:generate` | Genera archivos de migración basados en cambios del schema |
| `db:migrate`  | Ejecuta las migraciones pendientes                         |
| `db:push`     | Sincroniza el schema directamente (útil en desarrollo)     |
| `db:studio`   | Abre Drizzle Studio para ver/editar datos                  |
| `db:drop`     | Elimina una migración                                      |

---

## 1.8 Estructura de Carpetas Inicial

Crea la estructura base del proyecto:

```bash
# Componentes de formulario
mkdir -p src/components/forms
mkdir -p src/components/ui

# Librería de utilidades
mkdir -p src/lib/validations
mkdir -p src/lib/storage

# Tipos compartidos
mkdir -p src/types

# Tests
mkdir -p src/__tests__/validations
mkdir -p src/__tests__/actions
mkdir -p src/__tests__/components

# App de documentos
mkdir -p src/app/documentos/nuevo
mkdir -p src/app/documentos/\[id\]/editar
```

Tu estructura debería verse así:

```
documentos-app/
├── src/
│   ├── app/
│   │   ├── documentos/
│   │   │   ├── nuevo/
│   │   │   └── [id]/
│   │   │       └── editar/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── forms/
│   │   └── ui/
│   ├── db/
│   │   ├── migrations/
│   │   ├── schema/
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── lib/
│   │   ├── validations/
│   │   ├── storage/
│   │   └── utils.ts
│   ├── types/
│   └── __tests__/
│       ├── validations/
│       ├── actions/
│       └── components/
├── .env.local
├── docker-compose.yml
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

---

## 1.9 Configurar Tipos Globales

Crea el archivo `src/types/index.ts`:

```typescript
// Tipo genérico para respuestas de Server Actions
export type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// Tipo para estados de formulario
export type FormState = {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
};

// Tipo para paginación
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
  };
};
```

---

## 1.10 Actualizar Layout Principal

Actualiza `src/app/layout.tsx` para incluir el Toaster de notificaciones:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistema de Documentos",
  description: "Gestión de documentos y expedientes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <main className="min-h-screen bg-background">
          {children}
        </main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
```

---

## 1.11 Página de Inicio Temporal

Actualiza `src/app/page.tsx`:

```typescript
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Sistema de Gestión de Documentos</CardTitle>
          <CardDescription>
            Tutorial: Drizzle + Zod + React Hook Form en Next.js 15
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Este proyecto demuestra cómo construir formularios robustos con validación
            completa usando Server Actions.
          </p>

          <div className="flex gap-4">
            <Button asChild>
              <Link href="/documentos">
                Ver Documentos
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/documentos/nuevo">
                Crear Documento
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 1.12 Verificar la Instalación

Ejecuta el servidor de desarrollo:

```bash
npm run dev
```

Abre http://localhost:3000 y deberías ver la página de inicio.

**Verificaciones:**

- ✅ La página carga sin errores
- ✅ Los estilos de Tailwind funcionan
- ✅ Los componentes de Shadcn/ui se ven correctamente

Si tienes PostgreSQL corriendo, verifica la conexión con Drizzle Studio:

```bash
npm run db:studio
```

Esto abrirá una interfaz web en https://local.drizzle.studio donde podrás ver tu base de datos (estará vacía por ahora).

---

## Errores Comunes

### Error: Cannot find module 'postgres'

```bash
npm install postgres
```

### Error: DATABASE_URL is not defined

Asegúrate de que `.env.local` existe y tiene la variable `DATABASE_URL` correcta.

### Error: Connection refused (PostgreSQL)

1. Verifica que Docker esté corriendo: `docker-compose ps`
2. Verifica el puerto: `docker-compose logs postgres`
3. Asegúrate de que la URL en `.env.local` coincida con `docker-compose.yml`

### Error: Cannot resolve '@/components/ui/...'

Ejecuta nuevamente la instalación de componentes Shadcn:

```bash
pnpx shadcn@latest add button
```

---

## Resumen del Módulo

En este módulo hemos:

- [ ] Creado un proyecto Next.js 16 con TypeScript y Tailwind
- [ ] Instalado Drizzle ORM con PostgreSQL
- [ ] Configurado Zod y React Hook Form
- [ ] Inicializado Shadcn/ui con los componentes necesarios
- [ ] Configurado PostgreSQL con Docker
- [ ] Creado la estructura de carpetas del proyecto
- [ ] Definido tipos globales para Server Actions

---

## Próximo Módulo

En el **Módulo 2: Definición del Schema con Drizzle** crearemos:

- La tabla `documentos` con todos los campos
- Enums de PostgreSQL para tipo, estado y prioridad
- Migraciones iniciales
- Veremos cómo Drizzle infiere tipos automáticamente

---

¿Listo para continuar con el Módulo 2?
