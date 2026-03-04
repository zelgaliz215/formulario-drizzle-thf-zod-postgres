# Guía de Planificación de Proyectos Fullstack

## Propósito de esta Guía

Esta guía te ayuda a planificar proyectos de mediana a gran escala usando el stack Next.js + Drizzle + Zod + React Hook Form. Cubre desde la concepción hasta la ejecución, con énfasis en:

- Cómo pensar el proyecto antes de escribir código
- Cómo escalar de pocas a muchas entidades
- Cómo organizar equipos y tareas
- Cómo evitar errores comunes de planificación

---

## PARTE 1: ANTES DE ESCRIBIR CÓDIGO

### 1.1 Entender el Dominio

Antes de pensar en tecnología, necesitas entender profundamente el problema que resuelves.

**Preguntas clave:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTENDIMIENTO DEL DOMINIO                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. ¿Qué problema resuelve este sistema?                        │
│     → No "gestionar documentos", sino "reducir tiempo de        │
│       búsqueda de expedientes de 30min a 30seg"                 │
│                                                                  │
│  2. ¿Quiénes son los usuarios?                                  │
│     → Roles, conocimiento técnico, frecuencia de uso            │
│                                                                  │
│  3. ¿Qué procesos del mundo real modelamos?                     │
│     → Flujos actuales (aunque sean en papel)                    │
│                                                                  │
│  4. ¿Qué reglas de negocio existen?                             │
│     → "Un contrato no puede superar el presupuesto del CDP"     │
│     → "Solo el jefe puede aprobar documentos confidenciales"    │
│                                                                  │
│  5. ¿Qué integraciones externas necesitamos?                    │
│     → SIIF, SECOP, correo, notificaciones                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Ejercicio: Mapa de Actores y Acciones**

```
Actor: Secretaria
├── Crea documentos borrador
├── Adjunta archivos escaneados
├── Asigna a revisor
└── Consulta estado de trámites

Actor: Jefe de Área
├── Revisa documentos asignados
├── Aprueba o rechaza con observaciones
├── Firma digitalmente
└── Genera reportes de su área

Actor: Archivo Central
├── Recibe documentos aprobados
├── Asigna ubicación física
├── Gestiona préstamos
└── Controla vencimientos

Actor: Ciudadano (externo)
├── Consulta estado de radicado
├── Descarga respuestas
└── Radica nuevas solicitudes
```

---

### 1.2 Identificar Entidades y Relaciones

Una vez entiendes el dominio, identifica las "cosas" que el sistema maneja.

**Técnica: Sustantivos del Dominio**

Lee los requerimientos y subraya los sustantivos. Cada uno es candidato a entidad:

> "El sistema debe permitir crear **documentos** que pertenecen a **expedientes**. 
> Cada documento tiene un **tipo** y puede tener **anexos**. Los **usuarios** 
> pueden asignar **etiquetas** y el sistema registra el **historial** de cambios.
> Los documentos pasan por un **flujo de aprobación** con **estados** definidos."

**Entidades identificadas:**
- Documento
- Expediente
- Tipo (de documento)
- Anexo
- Usuario
- Etiqueta
- Historial
- Estado (del flujo)

**Diagrama de Relaciones (ERD Conceptual):**

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Usuario    │       │  Expediente  │       │    Serie     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id           │       │ id           │       │ id           │
│ nombre       │       │ numero       │       │ codigo       │
│ email        │       │ titulo       │       │ nombre       │
│ rol          │──┐    │ serie_id     │───────│ subserie     │
│ area_id      │  │    │ estado       │       │ retencion    │
└──────────────┘  │    │ responsable  │◄──┐   └──────────────┘
                  │    └──────────────┘   │
                  │           │           │
                  │           │ 1:N       │
                  │           ▼           │
                  │    ┌──────────────┐   │
                  │    │  Documento   │   │
                  │    ├──────────────┤   │
                  │    │ id           │   │
                  │    │ codigo       │   │
                  │    │ titulo       │   │
                  └───►│ creado_por   │   │
                       │ expediente_id│───┘
                       │ tipo_id      │───────┐
                       │ estado       │       │
                       └──────────────┘       │
                              │               │
                    ┌─────────┼─────────┐     │
                    │         │         │     │
                    ▼         ▼         ▼     ▼
             ┌──────────┐ ┌──────────┐ ┌──────────┐
             │  Anexo   │ │ Historial│ │TipoDoc   │
             ├──────────┤ ├──────────┤ ├──────────┤
             │ id       │ │ id       │ │ id       │
             │ archivo  │ │ accion   │ │ nombre   │
             │ doc_id   │ │ fecha    │ │ plantilla│
             └──────────┘ │ usuario  │ └──────────┘
                          │ doc_id   │
                          └──────────┘
```

---

### 1.3 Clasificar Entidades por Complejidad

No todas las entidades son iguales. Clasifícalas para priorizar:

**Matriz de Complejidad:**

```
                    CAMPOS
              Pocos (<10)    Muchos (>10)
            ┌─────────────┬─────────────┐
   Simples  │   BÁSICA    │   MEDIA     │
RELACIONES  │  TipoDoc    │  Usuario    │
            │  Estado     │  Área       │
            │  Etiqueta   │             │
            ├─────────────┼─────────────┤
   Complejas│   MEDIA     │   ALTA      │
   (FK, M:N)│  Anexo      │  Documento  │
            │  Historial  │  Expediente │
            │             │  Contrato   │
            └─────────────┴─────────────┘
```

**Orden de desarrollo sugerido:**

1. **Básicas primero**: Son tablas de lookup, otras dependen de ellas
2. **Medias después**: Tienen algunas relaciones pero son manejables
3. **Altas al final**: Requieren que las demás existan

---

### 1.4 Definir Módulos Funcionales

Agrupa entidades y funcionalidades en módulos cohesivos:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MÓDULOS DEL SISTEMA                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MÓDULO: Gestión Documental                                     │
│  ├── Entidades: Documento, Anexo, TipoDocumento                 │
│  ├── Funcionalidades:                                           │
│  │   ├── CRUD de documentos                                     │
│  │   ├── Upload de anexos                                       │
│  │   ├── Versionamiento                                         │
│  │   └── Búsqueda full-text                                     │
│  └── Dependencias: Usuarios, Expedientes                        │
│                                                                  │
│  MÓDULO: Expedientes                                            │
│  ├── Entidades: Expediente, Serie, Subserie                     │
│  ├── Funcionalidades:                                           │
│  │   ├── CRUD de expedientes                                    │
│  │   ├── Tabla de retención                                     │
│  │   ├── Transferencias                                         │
│  │   └── Cierre y reapertura                                    │
│  └── Dependencias: Usuarios                                     │
│                                                                  │
│  MÓDULO: Flujos de Trabajo                                      │
│  ├── Entidades: Flujo, Estado, Transición, Tarea                │
│  ├── Funcionalidades:                                           │
│  │   ├── Definición de flujos                                   │
│  │   ├── Asignación de tareas                                   │
│  │   ├── Aprobaciones                                           │
│  │   └── Notificaciones                                         │
│  └── Dependencias: Usuarios, Documentos                         │
│                                                                  │
│  MÓDULO: Usuarios y Permisos                                    │
│  ├── Entidades: Usuario, Rol, Permiso, Área                     │
│  ├── Funcionalidades:                                           │
│  │   ├── Autenticación                                          │
│  │   ├── Gestión de roles                                       │
│  │   ├── Permisos granulares                                    │
│  │   └── Auditoría de accesos                                   │
│  └── Dependencias: Ninguna (base)                               │
│                                                                  │
│  MÓDULO: Reportes y Estadísticas                                │
│  ├── Entidades: (usa las demás)                                 │
│  ├── Funcionalidades:                                           │
│  │   ├── Dashboard                                              │
│  │   ├── Reportes predefinidos                                  │
│  │   ├── Exportación Excel/PDF                                  │
│  │   └── Indicadores de gestión                                 │
│  └── Dependencias: Todos los módulos                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Grafo de Dependencias entre Módulos:**

```
                    ┌─────────────────┐
                    │    Usuarios     │
                    │   y Permisos    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
      ┌───────────┐  ┌───────────┐  ┌───────────┐
      │Expedientes│  │ Gestión   │  │  Flujos   │
      │           │  │Documental │  │de Trabajo │
      └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
            │              │              │
            └──────────────┼──────────────┘
                           │
                           ▼
                   ┌───────────────┐
                   │   Reportes    │
                   │ Estadísticas  │
                   └───────────────┘
```

---

## PARTE 2: DISEÑO TÉCNICO

### 2.1 Diseño del Schema de Base de Datos

**Principios para schemas grandes:**

```
┌─────────────────────────────────────────────────────────────────┐
│              PRINCIPIOS DE DISEÑO DE SCHEMA                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CONSISTENCIA DE NOMBRES                                     │
│     ├── Tablas: plural, snake_case (documentos, tipos_documento)│
│     ├── Columnas: singular, snake_case (fecha_creacion)         │
│     ├── PKs: siempre "id"                                       │
│     ├── FKs: tabla_singular + "_id" (documento_id)              │
│     └── Timestamps: created_at, updated_at, deleted_at          │
│                                                                  │
│  2. NORMALIZACIÓN PRAGMÁTICA                                    │
│     ├── 3NF como base, desnormalizar con justificación          │
│     ├── Datos que cambian juntos → misma tabla                  │
│     └── Datos de lookup → tablas separadas                      │
│                                                                  │
│  3. SOFT DELETE POR DEFECTO                                     │
│     ├── deleted_at en lugar de DELETE                           │
│     ├── Permite auditoría y recuperación                        │
│     └── Filtrar con WHERE deleted_at IS NULL                    │
│                                                                  │
│  4. AUDITORÍA INTEGRADA                                         │
│     ├── created_by, updated_by en tablas importantes            │
│     ├── Tabla de historial para cambios críticos                │
│     └── Considerar event sourcing para flujos complejos         │
│                                                                  │
│  5. ÍNDICES ESTRATÉGICOS                                        │
│     ├── PKs y FKs automáticos                                   │
│     ├── Campos de búsqueda frecuente                            │
│     ├── Campos de ordenamiento                                  │
│     └── Índices compuestos para queries comunes                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Organización de archivos de schema:**

```
db/
├── schema/
│   ├── _enums.ts              # Todos los enums (prefijo _ = primero)
│   ├── _common.ts             # Campos comunes (timestamps, etc.)
│   │
│   ├── usuarios/
│   │   ├── usuarios.ts
│   │   ├── roles.ts
│   │   ├── permisos.ts
│   │   ├── areas.ts
│   │   └── index.ts
│   │
│   ├── documentos/
│   │   ├── documentos.ts
│   │   ├── tipos-documento.ts
│   │   ├── anexos.ts
│   │   ├── historial.ts
│   │   └── index.ts
│   │
│   ├── expedientes/
│   │   ├── expedientes.ts
│   │   ├── series.ts
│   │   └── index.ts
│   │
│   ├── flujos/
│   │   ├── flujos.ts
│   │   ├── estados.ts
│   │   ├── transiciones.ts
│   │   ├── tareas.ts
│   │   └── index.ts
│   │
│   ├── relations.ts           # Todas las relaciones
│   └── index.ts               # Exporta todo
│
├── migrations/
├── seed/
│   ├── 01-usuarios.ts
│   ├── 02-areas.ts
│   ├── 03-tipos-documento.ts
│   └── index.ts
│
└── index.ts                   # Cliente Drizzle
```

**Template para campos comunes:**

```typescript
// db/schema/_common.ts

import { timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

// Campos de auditoría reutilizables
export const auditFields = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

export const createdByField = {
  createdBy: uuid('created_by').references(() => usuarios.id),
};

export const updatedByField = {
  updatedBy: uuid('updated_by').references(() => usuarios.id),
};

// Uso en tabla:
export const documentos = pgTable('documentos', {
  id: uuid('id').defaultRandom().primaryKey(),
  // ... campos específicos
  ...auditFields,
  ...createdByField,
  ...updatedByField,
});
```

---

### 2.2 Diseño de Validaciones

**Estrategia para validaciones a escala:**

```
┌─────────────────────────────────────────────────────────────────┐
│              ARQUITECTURA DE VALIDACIONES                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  lib/validations/                                               │
│  ├── _constants.ts          # Límites, patterns, mensajes       │
│  ├── _helpers.ts            # Funciones de validación comunes   │
│  ├── _base-schemas.ts       # Schemas reutilizables             │
│  │                                                               │
│  ├── usuarios/                                                  │
│  │   ├── usuario.schema.ts  # Crear, actualizar usuario         │
│  │   ├── login.schema.ts    # Login, registro                   │
│  │   └── index.ts                                               │
│  │                                                               │
│  ├── documentos/                                                │
│  │   ├── documento.schema.ts                                    │
│  │   ├── documento-form.schema.ts                               │
│  │   ├── anexo.schema.ts                                        │
│  │   └── index.ts                                               │
│  │                                                               │
│  └── index.ts               # Exporta todo                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Schemas base reutilizables:**

```typescript
// lib/validations/_base-schemas.ts

import { z } from 'zod';
import { LIMITS, PATTERNS, MESSAGES } from './_constants';

// Schemas atómicos reutilizables
export const schemas = {
  // IDs
  uuid: z.string().uuid(MESSAGES.invalidUuid),
  
  // Texto
  nombre: z.string()
    .min(LIMITS.NOMBRE.MIN, MESSAGES.nombreMin)
    .max(LIMITS.NOMBRE.MAX, MESSAGES.nombreMax),
  
  descripcion: z.string()
    .max(LIMITS.DESCRIPCION.MAX)
    .nullable()
    .optional(),
  
  email: z.string()
    .email(MESSAGES.emailInvalido)
    .toLowerCase(),
  
  telefono: z.string()
    .regex(PATTERNS.TELEFONO, MESSAGES.telefonoInvalido)
    .optional(),
  
  // Fechas
  fecha: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, MESSAGES.fechaInvalida),
  
  fechaOpcional: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, MESSAGES.fechaInvalida)
    .nullable()
    .optional(),
  
  // Números
  cantidad: z.coerce.number()
    .int()
    .positive(),
  
  monto: z.coerce.number()
    .positive()
    .multipleOf(0.01),  // Máximo 2 decimales
  
  // Archivos
  archivo: z.object({
    nombre: z.string(),
    tipo: z.string(),
    tamanio: z.number().max(LIMITS.ARCHIVO.MAX_SIZE),
    url: z.string().url(),
  }),
};

// Uso en schemas específicos:
export const crearUsuarioSchema = z.object({
  nombre: schemas.nombre,
  email: schemas.email,
  telefono: schemas.telefono,
  // ...
});
```

---

### 2.3 Diseño de Server Actions

**Organización para proyectos grandes:**

```
actions/
├── _utils/
│   ├── ejecutar-accion.ts    # Wrapper principal
│   ├── validar.ts            # Helpers de validación
│   ├── permisos.ts           # Verificación de permisos
│   ├── cache.ts              # Helpers de revalidación
│   └── index.ts
│
├── usuarios/
│   ├── crear.ts
│   ├── obtener.ts
│   ├── actualizar.ts
│   ├── eliminar.ts
│   ├── autenticar.ts
│   ├── tipos.ts
│   └── index.ts
│
├── documentos/
│   ├── crear.ts
│   ├── obtener.ts
│   ├── listar.ts             # Con filtros complejos
│   ├── actualizar.ts
│   ├── eliminar.ts
│   ├── cambiar-estado.ts     # Acción específica del dominio
│   ├── asignar.ts            # Acción específica del dominio
│   ├── tipos.ts
│   └── index.ts
│
├── expedientes/
│   └── ...
│
├── flujos/
│   └── ...
│
└── index.ts
```

**Patrón para acciones con permisos:**

```typescript
// actions/_utils/permisos.ts

import { getServerSession } from 'next-auth';
import { AppError, ErrorCode } from '@/lib/errors';

export async function verificarPermiso(
  permiso: string,
  recursoId?: string
): Promise<void> {
  const session = await getServerSession();
  
  if (!session?.user) {
    throw new AppError('No autenticado', {
      code: ErrorCode.UNAUTHORIZED,
    });
  }
  
  const tienePermiso = await verificarPermisoUsuario(
    session.user.id,
    permiso,
    recursoId
  );
  
  if (!tienePermiso) {
    throw new AppError('Sin permisos para esta acción', {
      code: ErrorCode.FORBIDDEN,
    });
  }
}

// Uso en action:
export async function eliminarDocumento(id: string) {
  return ejecutarAccion(async () => {
    await verificarPermiso('documentos:eliminar', id);
    // ... lógica de eliminación
  });
}
```

**Patrón para acciones transaccionales:**

```typescript
// actions/documentos/crear-con-anexos.ts

import { db } from '@/db';

export async function crearDocumentoConAnexos(
  documento: CrearDocumentoInput,
  anexos: CrearAnexoInput[]
) {
  return ejecutarAccion(async () => {
    // Transacción: todo o nada
    return await db.transaction(async (tx) => {
      // 1. Crear documento
      const [doc] = await tx
        .insert(documentos)
        .values(documento)
        .returning();
      
      // 2. Crear anexos asociados
      if (anexos.length > 0) {
        await tx.insert(anexosTable).values(
          anexos.map(a => ({ ...a, documentoId: doc.id }))
        );
      }
      
      // 3. Registrar en historial
      await tx.insert(historial).values({
        documentoId: doc.id,
        accion: 'CREADO',
        datos: documento,
      });
      
      return doc;
    });
  });
}
```

---

### 2.4 Diseño de Componentes

**Jerarquía de componentes:**

```
components/
├── ui/                       # Shadcn/ui (no modificar)
│
├── forms/                    # Componentes de formulario genéricos
│   ├── fields/              # Campos atómicos
│   │   ├── form-input.tsx
│   │   ├── form-select.tsx
│   │   ├── form-date.tsx
│   │   └── ...
│   │
│   ├── composed/            # Campos compuestos
│   │   ├── direccion-fields.tsx    # Grupo de campos de dirección
│   │   ├── persona-fields.tsx      # Nombre, documento, etc.
│   │   └── archivo-upload.tsx
│   │
│   └── index.ts
│
├── data-display/            # Componentes de visualización
│   ├── data-table/
│   │   ├── data-table.tsx
│   │   ├── column-header.tsx
│   │   ├── pagination.tsx
│   │   ├── filters.tsx
│   │   └── index.ts
│   │
│   ├── cards/
│   │   ├── stat-card.tsx
│   │   ├── info-card.tsx
│   │   └── index.ts
│   │
│   └── badges/
│       ├── estado-badge.tsx
│       ├── prioridad-badge.tsx
│       └── index.ts
│
├── layout/                  # Componentes de estructura
│   ├── sidebar.tsx
│   ├── header.tsx
│   ├── breadcrumbs.tsx
│   └── page-header.tsx
│
├── feedback/                # Componentes de feedback
│   ├── loading-states/
│   ├── empty-states/
│   ├── error-states/
│   └── confirmations/
│
└── domain/                  # Componentes específicos del dominio
    ├── documentos/
    │   ├── documento-card.tsx
    │   ├── documento-form.tsx
    │   ├── documento-timeline.tsx
    │   └── index.ts
    │
    ├── expedientes/
    │   ├── expediente-tree.tsx
    │   ├── expediente-form.tsx
    │   └── index.ts
    │
    └── usuarios/
        ├── usuario-avatar.tsx
        ├── usuario-selector.tsx
        └── index.ts
```

---

## PARTE 3: PLANIFICACIÓN DE EJECUCIÓN

### 3.1 Roadmap por Fases

**Fase 0: Setup (1-2 días)**

```
┌─────────────────────────────────────────────────────────────────┐
│                         FASE 0: SETUP                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Entregables:                                                   │
│  ├── [ ] Repositorio configurado                                │
│  ├── [ ] Proyecto Next.js inicializado                          │
│  ├── [ ] Dependencias instaladas                                │
│  ├── [ ] PostgreSQL funcionando (local/cloud)                   │
│  ├── [ ] Shadcn/ui configurado                                  │
│  ├── [ ] Estructura de carpetas creada                          │
│  ├── [ ] Variables de entorno configuradas                      │
│  ├── [ ] CI/CD básico (lint, build)                             │
│  └── [ ] README con instrucciones de setup                      │
│                                                                  │
│  Verificación: `pnpm dev` funciona, BD conecta                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Fase 1: Core - Usuarios y Auth (1 semana)**

```
┌─────────────────────────────────────────────────────────────────┐
│                    FASE 1: USUARIOS Y AUTH                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ¿Por qué primero?                                              │
│  → Todo lo demás depende de saber quién está haciendo qué       │
│  → Permisos definen qué puede hacer cada módulo                 │
│                                                                  │
│  Entidades:                                                     │
│  ├── usuarios                                                   │
│  ├── roles                                                      │
│  ├── permisos                                                   │
│  ├── areas                                                      │
│  └── sesiones (si no usas NextAuth)                             │
│                                                                  │
│  Funcionalidades:                                               │
│  ├── [ ] Login / Logout                                         │
│  ├── [ ] Registro (si aplica)                                   │
│  ├── [ ] Recuperar contraseña                                   │
│  ├── [ ] CRUD de usuarios (admin)                               │
│  ├── [ ] Asignación de roles                                    │
│  ├── [ ] Middleware de autenticación                            │
│  └── [ ] Helper de permisos                                     │
│                                                                  │
│  Páginas:                                                       │
│  ├── /login                                                     │
│  ├── /recuperar-password                                        │
│  ├── /admin/usuarios                                            │
│  ├── /admin/usuarios/[id]                                       │
│  ├── /admin/roles                                               │
│  └── /perfil                                                    │
│                                                                  │
│  Verificación:                                                  │
│  → Puedo crear usuario, asignar rol, y el usuario solo ve       │
│    lo que su rol permite                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Fase 2: Módulo Principal (2 semanas)**

```
┌─────────────────────────────────────────────────────────────────┐
│                  FASE 2: GESTIÓN DOCUMENTAL                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ¿Por qué segundo?                                              │
│  → Es el core del negocio                                       │
│  → Los demás módulos trabajan sobre documentos                  │
│                                                                  │
│  Semana 1: Base                                                 │
│  ├── [ ] Schema: documentos, tipos_documento                    │
│  ├── [ ] Validaciones Zod completas                             │
│  ├── [ ] Server Actions CRUD                                    │
│  ├── [ ] Componentes de formulario                              │
│  ├── [ ] Página crear documento                                 │
│  └── [ ] Página listar documentos (básico)                      │
│                                                                  │
│  Semana 2: Avanzado                                             │
│  ├── [ ] Upload de archivos/anexos                              │
│  ├── [ ] Búsqueda y filtros avanzados                           │
│  ├── [ ] Paginación server-side                                 │
│  ├── [ ] Página detalle documento                               │
│  ├── [ ] Página editar documento                                │
│  ├── [ ] Historial de cambios                                   │
│  └── [ ] Permisos por tipo de documento                         │
│                                                                  │
│  Verificación:                                                  │
│  → Flujo completo: crear, buscar, editar, ver historial         │
│  → Upload funciona en desarrollo y staging                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Fase 3: Módulos Secundarios (2-3 semanas)**

```
┌─────────────────────────────────────────────────────────────────┐
│                   FASE 3: EXPEDIENTES Y FLUJOS                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Pueden desarrollarse en paralelo si hay equipo                 │
│                                                                  │
│  Track A: Expedientes (1.5 semanas)                             │
│  ├── [ ] Schema: expedientes, series                            │
│  ├── [ ] CRUD expedientes                                       │
│  ├── [ ] Asociar documentos a expedientes                       │
│  ├── [ ] Vista árbol de expediente                              │
│  ├── [ ] Tabla de retención documental                          │
│  └── [ ] Transferencias entre archivos                          │
│                                                                  │
│  Track B: Flujos de Trabajo (1.5 semanas)                       │
│  ├── [ ] Schema: flujos, estados, transiciones, tareas          │
│  ├── [ ] Configurador de flujos (admin)                         │
│  ├── [ ] Motor de ejecución de flujos                           │
│  ├── [ ] Bandeja de tareas pendientes                           │
│  ├── [ ] Acciones: aprobar, rechazar, devolver                  │
│  └── [ ] Notificaciones de asignación                           │
│                                                                  │
│  Integración (0.5 semanas)                                      │
│  ├── [ ] Documentos disparan flujos                             │
│  ├── [ ] Estados del flujo reflejados en documento              │
│  └── [ ] Permisos según estado del flujo                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Fase 4: Features Transversales (1-2 semanas)**

```
┌─────────────────────────────────────────────────────────────────┐
│                 FASE 4: FEATURES TRANSVERSALES                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Dashboard y Reportes                                           │
│  ├── [ ] Dashboard principal con KPIs                           │
│  ├── [ ] Gráficos de estado de documentos                       │
│  ├── [ ] Reporte de productividad por usuario                   │
│  ├── [ ] Reporte de documentos por vencer                       │
│  └── [ ] Exportación a Excel/PDF                                │
│                                                                  │
│  Notificaciones                                                 │
│  ├── [ ] Sistema de notificaciones in-app                       │
│  ├── [ ] Notificaciones por email                               │
│  ├── [ ] Preferencias de notificación                           │
│  └── [ ] Resumen diario/semanal                                 │
│                                                                  │
│  Búsqueda Global                                                │
│  ├── [ ] Búsqueda unificada (documentos, expedientes, usuarios) │
│  ├── [ ] Filtros avanzados                                      │
│  ├── [ ] Resultados agrupados por tipo                          │
│  └── [ ] Búsqueda en contenido de archivos (OCR)                │
│                                                                  │
│  Auditoría                                                      │
│  ├── [ ] Log de todas las acciones                              │
│  ├── [ ] Visor de auditoría (admin)                             │
│  ├── [ ] Alertas de actividad sospechosa                        │
│  └── [ ] Reportes de auditoría                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Fase 5: Polish y Producción (1 semana)**

```
┌─────────────────────────────────────────────────────────────────┐
│                  FASE 5: POLISH Y PRODUCCIÓN                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Performance                                                    │
│  ├── [ ] Optimizar queries lentas                               │
│  ├── [ ] Implementar caché donde aplique                        │
│  ├── [ ] Lazy loading de componentes pesados                    │
│  └── [ ] Optimizar bundle size                                  │
│                                                                  │
│  UX                                                             │
│  ├── [ ] Loading states en todas las páginas                    │
│  ├── [ ] Empty states informativos                              │
│  ├── [ ] Mensajes de error amigables                            │
│  ├── [ ] Tooltips y ayudas contextuales                         │
│  └── [ ] Responsive en móviles                                  │
│                                                                  │
│  Seguridad                                                      │
│  ├── [ ] Revisión de permisos                                   │
│  ├── [ ] Rate limiting                                          │
│  ├── [ ] Validación de inputs (XSS, injection)                  │
│  └── [ ] Headers de seguridad                                   │
│                                                                  │
│  Deployment                                                     │
│  ├── [ ] Configurar producción                                  │
│  ├── [ ] Migraciones de BD                                      │
│  ├── [ ] Seed de datos iniciales                                │
│  ├── [ ] Monitoreo y alertas                                    │
│  └── [ ] Backup automatizado                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3.2 Estimación de Tiempos

**Matriz de Estimación por Entidad:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESTIMACIÓN POR ENTIDAD                        │
├──────────────────┬──────────────────────────────────────────────┤
│   Complejidad    │              Tiempo Estimado                  │
├──────────────────┼──────────────────────────────────────────────┤
│                  │  Schema  │ Validación │ Actions │ UI │ Total │
├──────────────────┼──────────┼────────────┼─────────┼────┼───────┤
│ Básica           │  30min   │   30min    │   1h    │ 2h │  4h   │
│ (lookup tables)  │          │            │         │    │       │
├──────────────────┼──────────┼────────────┼─────────┼────┼───────┤
│ Media            │   1h     │    1h      │   2h    │ 4h │  8h   │
│ (CRUD estándar)  │          │            │         │    │       │
├──────────────────┼──────────┼────────────┼─────────┼────┼───────┤
│ Alta             │   2h     │    2h      │   4h    │ 8h │ 16h   │
│ (relaciones,     │          │            │         │    │       │
│  flujos, upload) │          │            │         │    │       │
├──────────────────┼──────────┼────────────┼─────────┼────┼───────┤
│ Muy Alta         │   4h     │    4h      │   8h    │16h │ 32h   │
│ (flujos complejos│          │            │         │    │       │
│  integraciones)  │          │            │         │    │       │
└──────────────────┴──────────┴────────────┴─────────┴────┴───────┘
```

**Ejemplo de estimación para proyecto mediano:**

```
Proyecto: Sistema de Gestión Documental
Entidades: 15
Duración estimada: 8-10 semanas

Desglose:
├── Setup (Fase 0)                          │   8h  │  1 día
├── Usuarios y Auth (Fase 1)                │  40h  │  1 semana
│   ├── usuarios (alta)                     │  16h
│   ├── roles (media)                       │   8h
│   ├── permisos (media)                    │   8h
│   └── auth/sesiones                       │   8h
│
├── Gestión Documental (Fase 2)             │  80h  │  2 semanas
│   ├── documentos (muy alta)               │  32h
│   ├── tipos_documento (básica)            │   4h
│   ├── anexos (alta)                       │  16h
│   ├── historial (media)                   │   8h
│   └── integración y pulido                │  20h
│
├── Expedientes y Flujos (Fase 3)           │ 100h  │  2.5 semanas
│   ├── expedientes (alta)                  │  16h
│   ├── series (media)                      │   8h
│   ├── flujos (muy alta)                   │  32h
│   ├── estados/transiciones (alta)         │  16h
│   ├── tareas (alta)                       │  16h
│   └── integración                         │  12h
│
├── Features Transversales (Fase 4)         │  60h  │  1.5 semanas
│   ├── dashboard                           │  16h
│   ├── reportes                            │  16h
│   ├── notificaciones                      │  16h
│   └── búsqueda global                     │  12h
│
└── Polish y Producción (Fase 5)            │  40h  │  1 semana

TOTAL: ~328 horas ≈ 8-9 semanas (1 desarrollador)
       ~4-5 semanas (2 desarrolladores en paralelo)
```

---

### 3.3 División de Trabajo en Equipo

**Para 2 desarrolladores:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    DIVISIÓN: 2 DESARROLLADORES                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SEMANA 1                                                       │
│  ├── Dev A: Setup + Schema de todas las entidades               │
│  └── Dev B: Setup + Componentes base de formulario              │
│                                                                  │
│  SEMANA 2                                                       │
│  ├── Dev A: Auth completo (login, permisos, middleware)         │
│  └── Dev B: Componentes de UI (data-table, cards, badges)       │
│                                                                  │
│  SEMANA 3-4                                                     │
│  ├── Dev A: Módulo Documentos (actions, páginas)                │
│  └── Dev B: Módulo Expedientes (actions, páginas)               │
│                                                                  │
│  SEMANA 5-6                                                     │
│  ├── Dev A: Módulo Flujos de Trabajo                            │
│  └── Dev B: Dashboard + Reportes                                │
│                                                                  │
│  SEMANA 7                                                       │
│  ├── Dev A: Integración de módulos + Notificaciones             │
│  └── Dev B: Búsqueda global + Polish UI                         │
│                                                                  │
│  SEMANA 8                                                       │
│  ├── Dev A: Testing + Bugs críticos                             │
│  └── Dev B: Deployment + Documentación                          │
│                                                                  │
│  Reuniones:                                                     │
│  ├── Daily standup (15 min)                                     │
│  ├── Review semanal (1h)                                        │
│  └── Planning de siguiente semana (1h)                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Para 3+ desarrolladores:**

```
┌─────────────────────────────────────────────────────────────────┐
│                   DIVISIÓN: 3+ DESARROLLADORES                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Dev A (Backend Focus)                                          │
│  ├── Schemas de base de datos                                   │
│  ├── Server Actions                                             │
│  ├── Validaciones Zod                                           │
│  ├── Integraciones externas                                     │
│  └── Performance de queries                                     │
│                                                                  │
│  Dev B (Frontend Focus)                                         │
│  ├── Componentes de UI                                          │
│  ├── Páginas y layouts                                          │
│  ├── Formularios                                                │
│  ├── Responsive y accesibilidad                                 │
│  └── Animaciones y micro-interacciones                          │
│                                                                  │
│  Dev C (Fullstack/Integración)                                  │
│  ├── Auth y permisos                                            │
│  ├── Flujos de trabajo                                          │
│  ├── Notificaciones                                             │
│  ├── Testing                                                    │
│  └── DevOps y deployment                                        │
│                                                                  │
│  Sincronización:                                                │
│  ├── Interfaces definidas al inicio de cada feature             │
│  ├── Types compartidos en /types                                │
│  ├── PRs pequeños y frecuentes                                  │
│  └── Feature branches cortas (max 2-3 días)                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## PARTE 4: PATRONES Y DECISIONES COMUNES

### 4.1 Decisiones Arquitectónicas Frecuentes

**¿Cuándo crear una entidad separada vs un campo JSON?**

```
Entidad separada cuando:
├── Los datos tienen su propio ciclo de vida
├── Necesitas buscar/filtrar por esos datos
├── Hay relaciones con otras entidades
├── Los datos crecen indefinidamente
└── Necesitas validación a nivel de BD

Campo JSON cuando:
├── Los datos siempre se leen/escriben juntos
├── La estructura varía mucho entre registros
├── Son metadata o configuración
├── No necesitas buscar dentro del JSON
└── Son datos históricos/snapshot

Ejemplo:
├── Dirección de usuario → JSON (siempre se lee junto al usuario)
├── Etiquetas de documento → Array (búsqueda simple)
├── Historial de cambios → Entidad (crece, se consulta independiente)
└── Configuración de notificaciones → JSON (varía por usuario)
```

**¿Soft delete o hard delete?**

```
Soft delete (recomendado por defecto):
├── Permite recuperación
├── Mantiene integridad referencial
├── Auditoría completa
├── Requiere: filtrar WHERE deleted_at IS NULL

Hard delete cuando:
├── Datos sensibles que DEBEN eliminarse (GDPR)
├── Datos temporales/cache
├── Volumen muy alto que afecta performance
└── Requiere: ON DELETE CASCADE bien configurado
```

**¿Cuándo usar transacciones?**

```
Siempre usar transacciones cuando:
├── Múltiples inserts/updates relacionados
├── La operación tiene "todo o nada"
├── Hay side effects (enviar email, notificar)
└── Modificas datos que otros procesos leen

Ejemplo:
├── Crear documento + anexos → Transacción
├── Aprobar documento + notificar + actualizar flujo → Transacción
├── Leer documento → No necesita
└── Actualizar un solo campo → No necesita (pero no hace daño)
```

---

### 4.2 Checklist de Revisión por Módulo

```
┌─────────────────────────────────────────────────────────────────┐
│              CHECKLIST DE REVISIÓN POR MÓDULO                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BASE DE DATOS                                                  │
│  [ ] Schema sigue convenciones de nombres                       │
│  [ ] Índices en campos de búsqueda/filtro                       │
│  [ ] FKs con ON DELETE apropiado                                │
│  [ ] Campos de auditoría (created_at, updated_at)               │
│  [ ] Migración genera SQL correcto                              │
│  [ ] Seed funciona sin errores                                  │
│                                                                  │
│  VALIDACIÓN                                                     │
│  [ ] Schema Zod cubre todos los campos                          │
│  [ ] Mensajes de error en español                               │
│  [ ] Validaciones de negocio (.refine)                          │
│  [ ] Tipos exportados e inferidos                               │
│  [ ] Schema de form vs schema de server                         │
│                                                                  │
│  SERVER ACTIONS                                                 │
│  [ ] 'use server' presente                                      │
│  [ ] Validación antes de cualquier operación                    │
│  [ ] Verificación de permisos                                   │
│  [ ] Retorna ActionResponse<T>                                  │
│  [ ] Manejo de errores específico                               │
│  [ ] revalidatePath después de mutaciones                       │
│  [ ] Logging de operaciones importantes                         │
│                                                                  │
│  COMPONENTES                                                    │
│  [ ] Props tipadas correctamente                                │
│  [ ] Estados de loading                                         │
│  [ ] Estados de error                                           │
│  [ ] Estados vacíos                                             │
│  [ ] Accesibilidad (labels, aria)                               │
│  [ ] Responsive                                                 │
│                                                                  │
│  PÁGINAS                                                        │
│  [ ] Metadata (title, description)                              │
│  [ ] Loading.tsx presente                                       │
│  [ ] Error.tsx presente                                         │
│  [ ] Not-found.tsx si aplica                                    │
│  [ ] Breadcrumbs                                                │
│  [ ] Permisos verificados                                       │
│                                                                  │
│  TESTING (cuando aplique)                                       │
│  [ ] Validaciones tienen tests                                  │
│  [ ] Actions críticas tienen tests                              │
│  [ ] Flujos principales tienen E2E                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.3 Errores Comunes y Cómo Evitarlos

```
┌─────────────────────────────────────────────────────────────────┐
│                      ERRORES COMUNES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ERROR: Empezar por la UI                                       │
│  ────────────────────────────────────────────────────────────   │
│  Síntoma: Muchos cambios cuando llega el backend                │
│  Solución: Schema → Validación → Actions → UI                   │
│                                                                  │
│  ERROR: No definir tipos compartidos                            │
│  ────────────────────────────────────────────────────────────   │
│  Síntoma: any por todos lados, errores en runtime               │
│  Solución: Inferir tipos de Zod/Drizzle, exportar en /types     │
│                                                                  │
│  ERROR: Validar solo en cliente                                 │
│  ────────────────────────────────────────────────────────────   │
│  Síntoma: Datos inválidos en BD                                 │
│  Solución: SIEMPRE validar en server actions                    │
│                                                                  │
│  ERROR: No manejar errores de BD                                │
│  ────────────────────────────────────────────────────────────   │
│  Síntoma: Usuario ve "Error 500" o mensaje técnico              │
│  Solución: Mapear códigos de PostgreSQL a mensajes amigables    │
│                                                                  │
│  ERROR: Over-engineering inicial                                │
│  ────────────────────────────────────────────────────────────   │
│  Síntoma: Abstracciones que no se usan, complejidad innecesaria │
│  Solución: Empezar simple, refactorizar cuando duela            │
│                                                                  │
│  ERROR: No versionar migraciones                                │
│  ────────────────────────────────────────────────────────────   │
│  Síntoma: "Funciona en mi máquina", BD de prod diferente        │
│  Solución: db:generate + db:migrate, nunca db:push en prod      │
│                                                                  │
│  ERROR: Componentes gigantes                                    │
│  ────────────────────────────────────────────────────────────   │
│  Síntoma: Archivos de 500+ líneas, difícil de mantener          │
│  Solución: Extraer hooks, separar en componentes más pequeños   │
│                                                                  │
│  ERROR: No pensar en permisos desde el inicio                   │
│  ────────────────────────────────────────────────────────────   │
│  Síntoma: Refactor masivo para agregar permisos después         │
│  Solución: Diseñar modelo de permisos en Fase 0, implementar    │
│           helpers de verificación antes de los módulos          │
│                                                                  │
│  ERROR: Ignorar estados de carga y error                        │
│  ────────────────────────────────────────────────────────────   │
│  Síntoma: UI "salta", usuario no sabe qué pasa                  │
│  Solución: Loading.tsx, Skeletons, Empty states desde el inicio │
│                                                                  │
│  ERROR: No documentar decisiones                                │
│  ────────────────────────────────────────────────────────────   │
│  Síntoma: "¿Por qué está así?" 3 meses después                  │
│  Solución: ADRs (Architecture Decision Records), comentarios    │
│           en código para decisiones no obvias                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## PARTE 5: TEMPLATES Y RECURSOS

### 5.1 Template de Documento de Diseño

```markdown
# Diseño: [Nombre del Módulo]

## Resumen
[1-2 párrafos describiendo el módulo]

## Entidades

### [Nombre Entidad 1]
- **Descripción**: [Qué representa]
- **Campos principales**: [Lista]
- **Relaciones**: [Con qué otras entidades]
- **Reglas de negocio**: [Validaciones especiales]

### [Nombre Entidad 2]
...

## Funcionalidades

### [Feature 1]
- **Actor**: [Quién la usa]
- **Descripción**: [Qué hace]
- **Flujo**: [Pasos]
- **Validaciones**: [Reglas]
- **Permisos**: [Quién puede]

### [Feature 2]
...

## Páginas/Rutas

| Ruta | Descripción | Permisos |
|------|-------------|----------|
| /modulo | Listado | rol:ver |
| /modulo/nuevo | Crear | rol:crear |
| /modulo/[id] | Detalle | rol:ver |
| /modulo/[id]/editar | Editar | rol:editar |

## Integraciones
- [Sistema externo 1]: [Cómo se integra]
- [Sistema externo 2]: [Cómo se integra]

## Consideraciones Técnicas
- [Performance]: [Qué optimizar]
- [Seguridad]: [Qué proteger]
- [Escalabilidad]: [Qué considerar]

## Preguntas Abiertas
- [ ] [Pregunta 1]
- [ ] [Pregunta 2]
```

### 5.2 Template de Ticket/Tarea

```markdown
## [TIPO]: [Título descriptivo]

**Tipo**: Feature | Bug | Tech Debt | Spike
**Módulo**: [Nombre del módulo]
**Prioridad**: Alta | Media | Baja
**Estimación**: [X horas/puntos]

### Descripción
[Qué hay que hacer y por qué]

### Criterios de Aceptación
- [ ] [Criterio 1]
- [ ] [Criterio 2]
- [ ] [Criterio 3]

### Tareas Técnicas
- [ ] Schema/migración
- [ ] Validación Zod
- [ ] Server Action
- [ ] Componentes UI
- [ ] Página(s)
- [ ] Tests

### Dependencias
- Bloqueado por: [Tickets]
- Bloquea a: [Tickets]

### Notas
[Contexto adicional, enlaces, decisiones]
```

---

## Conclusión

Esta guía te proporciona un framework para planificar proyectos de cualquier tamaño con este stack. Los puntos clave son:

1. **Entender antes de construir**: Dominio → Entidades → Módulos
2. **Orden correcto**: Schema → Validación → Actions → UI
3. **Incremental**: Módulo base → Módulos dependientes → Features transversales
4. **Consistente**: Convenciones, checklists, templates

El tiempo invertido en planificación se recupera multiplicado durante la implementación.
