# Prompt: Tutorial Completo - Drizzle + Zod + React Hook Form en Next.js 15

## Contexto y Objetivo

Actúa como un instructor experto en desarrollo fullstack con Next.js. Crea un tutorial práctico y progresivo para aprender a integrar **Drizzle ORM**, **Zod** y **React Hook Form** en una aplicación Next.js 16 con App Router, utilizando **Server Actions** para todas las operaciones de datos.

El tutorial debe ser didáctico, con explicaciones claras del "por qué" detrás de cada decisión arquitectónica, y seguir las mejores prácticas actuales de la industria.

---

## Especificaciones Técnicas

### Stack Tecnológico

- **Framework:** Next.js 15 (App Router)
- **ORM:** Drizzle ORM con PostgreSQL
- **Validación:** Zod (esquemas compartidos cliente/servidor)
- **Formularios:** React Hook Form con @hookform/resolvers
- **UI:** Shadcn/ui
- **Lenguaje:** TypeScript estricto

### Entidad de Ejemplo: Documento/Expediente

Crear una entidad `Documento` que incluya campos variados para demostrar todos los tipos de inputs:

| Campo            | Tipo BD      | Tipo Input        | Validación                           |
| ---------------- | ------------ | ----------------- | ------------------------------------ |
| id               | uuid         | -                 | Auto-generado                        |
| codigo           | varchar(20)  | text input        | Required, único, formato específico  |
| titulo           | varchar(200) | text input        | Required, min 5, max 200 caracteres  |
| descripcion      | text         | textarea          | Opcional, max 2000 caracteres        |
| tipo             | enum         | select            | Required, valores predefinidos       |
| estado           | enum         | radio buttons     | Required, valores predefinidos       |
| fechaExpedicion  | date         | date picker       | Required                             |
| fechaVencimiento | date         | date picker       | Opcional, debe ser > fechaExpedicion |
| numeroFolios     | integer      | number input      | Required, min 1, max 9999            |
| esConfidencial   | boolean      | checkbox          | Default false                        |
| prioridad        | enum         | radio buttons     | Required                             |
| etiquetas        | text[]       | multi-select/tags | Opcional                             |
| archivoAdjunto   | varchar      | file upload       | Opcional, validar tipo y tamaño      |
| observaciones    | text         | textarea          | Opcional                             |
| password         | varchar      | password input    | Para documentos protegidos, opcional |
| createdAt        | timestamp    | -                 | Auto-generado                        |
| updatedAt        | timestamp    | -                 | Auto-generado                        |

**Enums sugeridos:**

- `tipo`: 'resolucion', 'circular', 'memorando', 'acta', 'informe', 'otro'
- `estado`: 'borrador', 'revision', 'aprobado', 'archivado', 'anulado'
- `prioridad`: 'baja', 'media', 'alta', 'urgente'

---

## Estructura del Tutorial

### Módulo 1: Fundamentos y Setup

1. Configuración del proyecto Next.js 16
2. Instalación y configuración de Drizzle ORM con PostgreSQL
3. Configuración de Drizzle Kit para migraciones
4. Setup de Shadcn/ui

### Módulo 2: Definición del Schema con Drizzle

1. Crear el schema de la tabla `documentos`
2. Definir enums en PostgreSQL con Drizzle
3. Configurar relaciones (preparar para escalabilidad)
4. Generar y ejecutar migraciones
5. **Mejor práctica:** Organización de archivos del schema

### Módulo 3: Esquemas de Validación con Zod

1. Crear esquemas Zod que reflejen el schema de Drizzle
2. Esquemas para Create vs Update (parciales)
3. Validaciones personalizadas (fechas, formatos)
4. **Patrón:** Inferir tipos TypeScript desde Zod
5. **Mejor práctica:** Single source of truth - derivar esquemas Zod desde Drizzle con `drizzle-zod`

### Módulo 4: Server Actions para CRUD

1. Estructura de archivos para Server Actions
2. Implementar acción `crearDocumento`
3. Implementar acción `obtenerDocumentos` (con filtros y paginación)
4. Implementar acción `obtenerDocumentoPorId`
5. Implementar acción `actualizarDocumento`
6. Implementar acción `eliminarDocumento`
7. **Manejo de errores:** Patrón de respuesta consistente con tipos
8. **Mejor práctica:** Validación en el servidor (nunca confiar en el cliente)

### Módulo 5: Componentes de Formulario Reutilizables

Crear componentes wrapper sobre Shadcn/ui integrados con React Hook Form:

1. `FormInput` - Input de texto genérico
2. `FormTextarea` - Área de texto
3. `FormSelect` - Select/dropdown
4. `FormRadioGroup` - Grupo de radio buttons
5. `FormCheckbox` - Checkbox individual
6. `FormDatePicker` - Selector de fecha
7. `FormNumberInput` - Input numérico
8. `FormPasswordInput` - Input de contraseña con toggle visibility
9. `FormFileUpload` - Upload de archivo simple
10. `FormFileDragDrop` - Upload con drag & drop
11. `FormTagInput` - Input de etiquetas/tags múltiples

**Cada componente debe:**

- Integrarse con `useFormContext` de React Hook Form
- Mostrar errores de validación automáticamente
- Ser accesible (ARIA labels)
- Soportar estados: loading, disabled, error
- Tener tipado fuerte con TypeScript

### Módulo 6: Formulario Completo de Documento

1. Configurar React Hook Form con zodResolver
2. Construir el formulario usando los componentes reutilizables
3. Manejar submit con Server Actions
4. Estados de carga y feedback al usuario
5. Modo edición vs creación
6. Reset y valores por defecto

### Módulo 7: Upload de Archivos

1. **Opción A - Local Filesystem:**
   - Configurar ruta de uploads en Next.js
   - Server Action para guardar archivo
   - Servir archivos estáticos

2. **Opción B - S3/Cloudflare R2:**
   - Configuración del cliente S3
   - Presigned URLs para upload directo
   - Server Action para confirmar upload

3. **Común a ambos:**
   - Validación de tipo MIME y tamaño
   - Preview de archivos
   - Progreso de upload
   - Eliminar archivo

### Módulo 8: Listado y Operaciones CRUD Completas

1. Página de listado con DataTable
2. Filtros y búsqueda
3. Paginación server-side
4. Acciones: ver, editar, eliminar
5. Confirmación de eliminación
6. Feedback con toast notifications

### Módulo 9: Manejo de Errores Server-Side

1. Tipos de error: validación, base de datos, permisos, inesperados
2. Patrón Result/Either para Server Actions
3. Mapeo de errores de Drizzle/PostgreSQL a mensajes amigables
4. Logging de errores
5. Errores específicos por campo vs errores generales
6. Retry logic para errores transitorios

### Módulo 10: Testing

1. **Unit tests de esquemas Zod:**
   - Casos válidos e inválidos
   - Edge cases
   - Validaciones personalizadas

2. **Tests de Server Actions:**
   - Mocking de la base de datos
   - Validación de inputs
   - Manejo de errores

3. **Tests de componentes de formulario:**
   - Renderizado correcto
   - Interacción del usuario
   - Mostrar errores de validación

4. **Herramientas:** Vitest + Testing Library

---

## Arquitectura de Carpetas Sugerida

```
src/
├── app/
│   ├── documentos/
│   │   ├── page.tsx              # Listado
│   │   ├── nuevo/page.tsx        # Crear
│   │   ├── [id]/
│   │   │   ├── page.tsx          # Ver detalle
│   │   │   └── editar/page.tsx   # Editar
│   │   └── actions.ts            # Server Actions del módulo
│   └── api/
│       └── upload/route.ts       # API Route para uploads (si necesario)
├── components/
│   ├── ui/                       # Shadcn/ui components
│   └── forms/                    # Componentes de formulario reutilizables
│       ├── form-input.tsx
│       ├── form-textarea.tsx
│       ├── form-select.tsx
│       ├── form-radio-group.tsx
│       ├── form-checkbox.tsx
│       ├── form-date-picker.tsx
│       ├── form-number-input.tsx
│       ├── form-password-input.tsx
│       ├── form-file-upload.tsx
│       ├── form-file-drag-drop.tsx
│       ├── form-tag-input.tsx
│       └── index.ts
├── db/
│   ├── index.ts                  # Cliente Drizzle
│   ├── schema/
│   │   ├── documentos.ts
│   │   └── index.ts
│   └── migrations/
├── lib/
│   ├── validations/
│   │   ├── documento.ts          # Esquemas Zod
│   │   └── index.ts
│   ├── storage/
│   │   ├── local.ts
│   │   ├── s3.ts
│   │   └── index.ts
│   └── utils.ts
├── types/
│   └── index.ts                  # Tipos compartidos
└── __tests__/
    ├── validations/
    ├── actions/
    └── components/
```

---

## Requisitos de Calidad

### Código

- TypeScript estricto (no `any`, no `@ts-ignore`)
- Comentarios explicativos en partes complejas
- Nombres descriptivos en español para la entidad, inglés para código técnico
- Consistencia en el estilo de código

### Mejores Prácticas

- Validación tanto en cliente como servidor
- Tipos inferidos desde Zod cuando sea posible
- Componentes pequeños y enfocados
- Separación clara de responsabilidades
- Error boundaries donde aplique

### UX

- Feedback inmediato en validaciones
- Estados de carga claros
- Mensajes de error útiles y específicos
- Accesibilidad básica (labels, ARIA)

---

## Formato de Entrega

Para cada módulo:

1. **Explicación conceptual** breve del tema
2. **Código completo** con comentarios
3. **Explicación del código** - por qué se hace así
4. **Errores comunes** a evitar
5. **Ejercicio práctico** opcional para reforzar

---

## Instrucciones Adicionales

- Usa las últimas APIs estables de Next.js 16 (App Router, Server Actions)
- Prioriza la claridad sobre la brevedad en las explicaciones
- Incluye snippets de código que se puedan copiar y ejecutar
- Menciona alternativas cuando existan múltiples enfoques válidos
- Al final de cada módulo, resume los conceptos clave aprendidos

---

## Comenzar

Inicia con el **Módulo 1: Fundamentos y Setup**, proporcionando todos los comandos de instalación y archivos de configuración necesarios para arrancar el proyecto desde cero.
