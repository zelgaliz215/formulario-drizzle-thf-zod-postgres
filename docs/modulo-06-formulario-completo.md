# Módulo 6: Formulario Completo de Documento

## Objetivo del Módulo

Al finalizar este módulo tendrás:
- Página completa de creación de documentos
- Formulario integrado con Server Actions
- Manejo de estados (loading, success, error)
- Feedback con toast notifications
- Modo creación y modo edición
- Navegación después de guardar

---

## 6.1 Arquitectura del Formulario

El flujo completo será:

```
Usuario llena formulario
        ↓
React Hook Form valida (cliente)
        ↓
Si hay archivo → Upload primero
        ↓
Llamar Server Action con datos
        ↓
Server Action valida (servidor)
        ↓
Guardar en BD
        ↓
Mostrar feedback + Redirigir
```

Separamos la lógica en:

1. **Componente de página** (`page.tsx`): Layout y carga de datos
2. **Componente de formulario** (`documento-form.tsx`): Lógica del form
3. **Hooks personalizados**: Manejo de estados y acciones

---

## 6.2 Hook Personalizado para el Formulario

Creamos un hook que encapsula la lógica de submit y manejo de estados.

Crea el archivo `hooks/use-documento-form.ts`:

```typescript
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { 
  documentoFormSchema, 
  documentoFormDefaults,
  type DocumentoFormValues 
} from '@/lib/validations';
import { crearDocumento, actualizarDocumento } from '@/actions';
import type { Documento } from '@/db/schema';

interface UseDocumentoFormOptions {
  /** Documento existente para modo edición */
  documento?: Documento;
  /** Callback después de guardar exitosamente */
  onSuccess?: (documento: Documento) => void;
  /** Redirigir después de guardar */
  redirectTo?: string;
}

export function useDocumentoForm(options: UseDocumentoFormOptions = {}) {
  const { documento, onSuccess, redirectTo = '/documentos' } = options;
  
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Determinar si es modo edición
  const isEditing = !!documento;

  // Convertir documento existente a valores del formulario
  const defaultValues: DocumentoFormValues = documento
    ? {
        codigo: documento.codigo,
        titulo: documento.titulo,
        descripcion: documento.descripcion || '',
        tipo: documento.tipo,
        estado: documento.estado,
        fechaExpedicion: documento.fechaExpedicion,
        fechaVencimiento: documento.fechaVencimiento || '',
        numeroFolios: documento.numeroFolios,
        esConfidencial: documento.esConfidencial,
        prioridad: documento.prioridad,
        etiquetas: documento.etiquetas || [],
        archivo: null, // No podemos cargar el archivo existente
        observaciones: documento.observaciones || '',
        password: '', // No mostramos el password existente
      }
    : documentoFormDefaults;

  // Configurar React Hook Form
  const form = useForm<DocumentoFormValues>({
    resolver: zodResolver(documentoFormSchema),
    defaultValues,
    mode: 'onBlur', // Validar al salir del campo
  });

  // Manejar submit
  const onSubmit = async (data: DocumentoFormValues) => {
    startTransition(async () => {
      try {
        // 1. Si hay archivo, subirlo primero
        let archivoData = null;
        if (data.archivo) {
          archivoData = await uploadArchivo(data.archivo);
          if (!archivoData) {
            // Error en upload, ya se mostró toast
            return;
          }
        }

        // 2. Preparar datos para el servidor
        const datosParaServidor = {
          codigo: data.codigo,
          titulo: data.titulo,
          descripcion: data.descripcion || null,
          tipo: data.tipo,
          estado: data.estado,
          fechaExpedicion: data.fechaExpedicion,
          fechaVencimiento: data.fechaVencimiento || null,
          numeroFolios: data.numeroFolios,
          esConfidencial: data.esConfidencial,
          prioridad: data.prioridad,
          etiquetas: data.etiquetas?.length ? data.etiquetas : null,
          observaciones: data.observaciones || null,
          password: data.password || null,
          // Datos del archivo subido
          ...(archivoData && {
            archivoAdjunto: archivoData.ruta,
            archivoNombre: archivoData.nombre,
            archivoTipo: archivoData.tipo,
            archivoTamanio: archivoData.tamanio,
          }),
        };

        // 3. Llamar Server Action (crear o actualizar)
        const resultado = isEditing
          ? await actualizarDocumento({ id: documento.id, ...datosParaServidor })
          : await crearDocumento(datosParaServidor);

        // 4. Manejar respuesta
        if (resultado.success) {
          toast.success(
            isEditing ? 'Documento actualizado' : 'Documento creado',
            {
              description: `${resultado.data.documento.codigo} - ${resultado.data.documento.titulo}`,
            }
          );

          // Callback opcional
          onSuccess?.(resultado.data.documento);

          // Redirigir
          router.push(redirectTo);
          router.refresh();
        } else {
          // Manejar errores
          handleServerErrors(resultado);
        }
      } catch (error) {
        console.error('Error en submit:', error);
        toast.error('Error inesperado', {
          description: 'Por favor intente nuevamente',
        });
      }
    });
  };

  // Subir archivo (placeholder - se implementará en Módulo 7)
  const uploadArchivo = async (
    file: File
  ): Promise<{
    ruta: string;
    nombre: string;
    tipo: string;
    tamanio: number;
  } | null> => {
    try {
      setUploadProgress(0);

      // TODO: Implementar upload real en Módulo 7
      // Por ahora simulamos el upload
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setUploadProgress(50);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setUploadProgress(100);

      // Retornar datos simulados
      const resultado = {
        ruta: `/uploads/${Date.now()}-${file.name}`,
        nombre: file.name,
        tipo: file.type,
        tamanio: file.size,
      };

      setUploadProgress(null);
      return resultado;
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      toast.error('Error al subir archivo', {
        description: 'No se pudo subir el archivo adjunto',
      });
      setUploadProgress(null);
      return null;
    }
  };

  // Manejar errores del servidor
  const handleServerErrors = (resultado: { 
    success: false; 
    error: string; 
    fieldErrors?: Record<string, string[]> 
  }) => {
    // Si hay errores de campo, setearlos en el formulario
    if (resultado.fieldErrors) {
      Object.entries(resultado.fieldErrors).forEach(([field, messages]) => {
        form.setError(field as keyof DocumentoFormValues, {
          type: 'server',
          message: messages[0],
        });
      });
      
      toast.error('Error de validación', {
        description: 'Por favor revise los campos marcados',
      });
    } else {
      // Error general
      toast.error('Error al guardar', {
        description: resultado.error,
      });
    }
  };

  return {
    form,
    isEditing,
    isPending,
    uploadProgress,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
```

---

## 6.3 Componente del Formulario

Crea el archivo `components/forms/documento-form.tsx`:

```typescript
'use client';

import { FormProvider } from 'react-hook-form';
import { useDocumentoForm } from '@/hooks/use-documento-form';
import {
  FormInput,
  FormTextarea,
  FormSelect,
  FormRadioGroup,
  FormCheckbox,
  FormDatePicker,
  FormNumberInput,
  FormPasswordInput,
  FormFileDragDrop,
  FormTagInput,
} from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { 
  TIPOS_DOCUMENTO, 
  TIPO_DOCUMENTO_LABELS,
  ESTADOS_DOCUMENTO,
  ESTADO_DOCUMENTO_LABELS,
  PRIORIDADES_DOCUMENTO,
  PRIORIDAD_DOCUMENTO_LABELS,
} from '@/db/schema';
import { VALIDACION } from '@/lib/validations';
import type { Documento } from '@/db/schema';

interface DocumentoFormProps {
  /** Documento existente para edición */
  documento?: Documento;
  /** URL a redirigir después de guardar */
  redirectTo?: string;
}

export function DocumentoForm({ documento, redirectTo }: DocumentoFormProps) {
  const { form, isEditing, isPending, uploadProgress, onSubmit } = useDocumentoForm({
    documento,
    redirectTo,
  });

  // Preparar opciones para selects y radios
  const tipoOptions = TIPOS_DOCUMENTO.map((tipo) => ({
    value: tipo,
    label: TIPO_DOCUMENTO_LABELS[tipo],
  }));

  const estadoOptions = ESTADOS_DOCUMENTO.map((estado) => ({
    value: estado,
    label: ESTADO_DOCUMENTO_LABELS[estado],
  }));

  const prioridadOptions = PRIORIDADES_DOCUMENTO.map((prioridad) => ({
    value: prioridad,
    label: PRIORIDAD_DOCUMENTO_LABELS[prioridad],
  }));

  // Obtener fecha de expedición para validar fecha de vencimiento
  const fechaExpedicion = form.watch('fechaExpedicion');
  const minFechaVencimiento = fechaExpedicion 
    ? new Date(new Date(fechaExpedicion).getTime() + 86400000) // +1 día
    : undefined;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit}>
        <div className="space-y-6">
          
          {/* Sección: Información Básica */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  name="codigo"
                  label="Código"
                  placeholder="RES-2024-001"
                  description="Formato: XXX-YYYY-NNN"
                  required
                  disabled={isPending}
                  maxLength={VALIDACION.CODIGO.MAX}
                />
                <FormSelect
                  name="tipo"
                  label="Tipo de Documento"
                  options={tipoOptions}
                  placeholder="Seleccione un tipo"
                  required
                  disabled={isPending}
                />
              </div>

              <FormInput
                name="titulo"
                label="Título"
                placeholder="Título descriptivo del documento"
                required
                disabled={isPending}
                maxLength={VALIDACION.TITULO.MAX}
              />

              <FormTextarea
                name="descripcion"
                label="Descripción"
                placeholder="Descripción detallada del contenido del documento..."
                rows={3}
                maxLength={VALIDACION.DESCRIPCION.MAX}
                showCount
                disabled={isPending}
              />
            </CardContent>
          </Card>

          {/* Sección: Estado y Prioridad */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado y Prioridad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormSelect
                  name="estado"
                  label="Estado"
                  options={estadoOptions}
                  disabled={isPending}
                />
                <FormRadioGroup
                  name="prioridad"
                  label="Prioridad"
                  options={prioridadOptions}
                  orientation="horizontal"
                  disabled={isPending}
                />
              </div>

              <FormCheckbox
                name="esConfidencial"
                label="Documento confidencial"
                description="Marque si el documento contiene información sensible o de acceso restringido"
                disabled={isPending}
              />
            </CardContent>
          </Card>

          {/* Sección: Fechas y Folios */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fechas y Folios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormDatePicker
                  name="fechaExpedicion"
                  label="Fecha de Expedición"
                  required
                  disabled={isPending}
                  maxDate={new Date()}
                />
                <FormDatePicker
                  name="fechaVencimiento"
                  label="Fecha de Vencimiento"
                  description="Opcional"
                  disabled={isPending || !fechaExpedicion}
                  minDate={minFechaVencimiento}
                />
                <FormNumberInput
                  name="numeroFolios"
                  label="Número de Folios"
                  min={VALIDACION.FOLIOS.MIN}
                  max={VALIDACION.FOLIOS.MAX}
                  showStepper
                  required
                  disabled={isPending}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sección: Clasificación */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Clasificación</CardTitle>
            </CardHeader>
            <CardContent>
              <FormTagInput
                name="etiquetas"
                label="Etiquetas"
                placeholder="Escriba una etiqueta y presione Enter"
                description="Agregue etiquetas para facilitar la búsqueda"
                maxTags={VALIDACION.ETIQUETAS.MAX_CANTIDAD}
                maxTagLength={VALIDACION.ETIQUETAS.MAX_LONGITUD}
                disabled={isPending}
              />
            </CardContent>
          </Card>

          {/* Sección: Archivo Adjunto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Archivo Adjunto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormFileDragDrop
                name="archivo"
                label="Documento Digital"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                maxSize={VALIDACION.ARCHIVO.MAX_SIZE}
                acceptedTypesLabel="PDF, JPG, PNG, WEBP, DOC, DOCX"
                disabled={isPending}
              />

              {/* Mostrar archivo existente en modo edición */}
              {isEditing && documento?.archivoNombre && !form.watch('archivo') && (
                <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                  <p>Archivo actual: <strong>{documento.archivoNombre}</strong></p>
                  <p className="text-xs">Seleccione un nuevo archivo para reemplazarlo</p>
                </div>
              )}

              {/* Barra de progreso de upload */}
              {uploadProgress !== null && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-xs text-muted-foreground text-center">
                    Subiendo archivo... {uploadProgress}%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sección: Información Adicional */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Adicional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormTextarea
                name="observaciones"
                label="Observaciones"
                placeholder="Notas u observaciones adicionales..."
                rows={2}
                maxLength={VALIDACION.OBSERVACIONES.MAX}
                disabled={isPending}
              />

              <Separator />

              <FormPasswordInput
                name="password"
                label="Contraseña de Protección"
                description="Opcional. Establezca una contraseña si desea proteger el acceso al documento"
                disabled={isPending}
              />
            </CardContent>
          </Card>

          {/* Botones de Acción */}
          <Card>
            <CardFooter className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={isPending}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restablecer
              </Button>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => window.history.back()}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {uploadProgress !== null ? 'Subiendo...' : 'Guardando...'}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isEditing ? 'Actualizar' : 'Guardar'} Documento
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>

        </div>
      </form>
    </FormProvider>
  );
}
```

---

## 6.4 Página de Crear Documento

Crea el archivo `app/documentos/nuevo/page.tsx`:

```typescript
import { DocumentoForm } from '@/components/forms/documento-form';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { Home, FileText } from 'lucide-react';

export const metadata = {
  title: 'Nuevo Documento | Sistema de Documentos',
  description: 'Crear un nuevo documento en el sistema',
};

export default function NuevoDocumentoPage() {
  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              Inicio
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/documentos" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Documentos
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Nuevo</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Documento</h1>
        <p className="text-muted-foreground mt-2">
          Complete el formulario para registrar un nuevo documento en el sistema.
        </p>
      </div>

      {/* Formulario */}
      <DocumentoForm />
    </div>
  );
}
```

---

## 6.5 Página de Editar Documento

Crea el archivo `app/documentos/[id]/editar/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import { DocumentoForm } from '@/components/forms/documento-form';
import { obtenerDocumentoPorId } from '@/actions';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { Home, FileText } from 'lucide-react';

interface EditarDocumentoPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditarDocumentoPageProps) {
  const { id } = await params;
  const resultado = await obtenerDocumentoPorId(id);
  
  if (!resultado.success) {
    return { title: 'Documento no encontrado' };
  }

  return {
    title: `Editar: ${resultado.data.documento.titulo} | Sistema de Documentos`,
    description: `Editar documento ${resultado.data.documento.codigo}`,
  };
}

export default async function EditarDocumentoPage({ params }: EditarDocumentoPageProps) {
  const { id } = await params;
  
  // Obtener documento
  const resultado = await obtenerDocumentoPorId(id);

  if (!resultado.success) {
    notFound();
  }

  const { documento } = resultado.data;

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              Inicio
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/documentos" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Documentos
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/documentos/${id}`}>
              {documento.codigo}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Editar</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Editar Documento</h1>
        <p className="text-muted-foreground mt-2">
          Modificando: <strong>{documento.codigo}</strong> - {documento.titulo}
        </p>
      </div>

      {/* Formulario en modo edición */}
      <DocumentoForm 
        documento={documento} 
        redirectTo={`/documentos/${id}`}
      />
    </div>
  );
}
```

---

## 6.6 Página de Detalle del Documento

Crea el archivo `app/documentos/[id]/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { obtenerDocumentoPorId } from '@/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { 
  Home, 
  FileText, 
  Edit, 
  Download, 
  Calendar, 
  FileStack, 
  Lock, 
  Tag,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  TIPO_DOCUMENTO_LABELS, 
  ESTADO_DOCUMENTO_LABELS, 
  PRIORIDAD_DOCUMENTO_LABELS 
} from '@/db/schema';
import { formatearTamanioArchivo } from '@/lib/validations';
import { EliminarDocumentoButton } from './_components/eliminar-documento-button';

interface DetalleDocumentoPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DetalleDocumentoPageProps) {
  const { id } = await params;
  const resultado = await obtenerDocumentoPorId(id);
  
  if (!resultado.success) {
    return { title: 'Documento no encontrado' };
  }

  return {
    title: `${resultado.data.documento.codigo} | Sistema de Documentos`,
    description: resultado.data.documento.titulo,
  };
}

export default async function DetalleDocumentoPage({ params }: DetalleDocumentoPageProps) {
  const { id } = await params;
  const resultado = await obtenerDocumentoPorId(id);

  if (!resultado.success) {
    notFound();
  }

  const { documento } = resultado.data;

  // Helpers para badges de estado y prioridad
  const estadoVariant = {
    borrador: 'secondary',
    revision: 'warning',
    aprobado: 'success',
    archivado: 'outline',
    anulado: 'destructive',
  } as const;

  const prioridadVariant = {
    baja: 'outline',
    media: 'secondary',
    alta: 'warning',
    urgente: 'destructive',
  } as const;

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              Inicio
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/documentos" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Documentos
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{documento.codigo}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header con acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{documento.codigo}</h1>
            <Badge variant={estadoVariant[documento.estado]}>
              {ESTADO_DOCUMENTO_LABELS[documento.estado]}
            </Badge>
            {documento.esConfidencial && (
              <Badge variant="destructive" className="gap-1">
                <Lock className="h-3 w-3" />
                Confidencial
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{documento.titulo}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/documentos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/documentos/${id}/editar`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
          <EliminarDocumentoButton id={documento.id} codigo={documento.codigo} />
        </div>
      </div>

      <div className="grid gap-6">
        {/* Información Principal */}
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                <p>{TIPO_DOCUMENTO_LABELS[documento.tipo]}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Prioridad</p>
                <Badge variant={prioridadVariant[documento.prioridad]}>
                  {PRIORIDAD_DOCUMENTO_LABELS[documento.prioridad]}
                </Badge>
              </div>
            </div>

            {documento.descripcion && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Descripción</p>
                <p className="whitespace-pre-wrap">{documento.descripcion}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fechas y Folios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Fechas y Folios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha de Expedición</p>
                <p>
                  {format(new Date(documento.fechaExpedicion), 'PPP', { locale: es })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha de Vencimiento</p>
                <p>
                  {documento.fechaVencimiento 
                    ? format(new Date(documento.fechaVencimiento), 'PPP', { locale: es })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Número de Folios</p>
                <p className="flex items-center gap-1">
                  <FileStack className="h-4 w-4" />
                  {documento.numeroFolios}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Etiquetas */}
        {documento.etiquetas && documento.etiquetas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Etiquetas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {documento.etiquetas.map((etiqueta) => (
                  <Badge key={etiqueta} variant="secondary">
                    {etiqueta}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Archivo Adjunto */}
        {documento.archivoNombre && (
          <Card>
            <CardHeader>
              <CardTitle>Archivo Adjunto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{documento.archivoNombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {documento.archivoTipo} • {documento.archivoTamanio ? formatearTamanioArchivo(documento.archivoTamanio) : '—'}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Descargar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Observaciones */}
        {documento.observaciones && (
          <Card>
            <CardHeader>
              <CardTitle>Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{documento.observaciones}</p>
            </CardContent>
          </Card>
        )}

        {/* Metadatos */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Creado: {format(new Date(documento.createdAt), 'PPp', { locale: es })}
              </span>
              <span>
                Actualizado: {format(new Date(documento.updatedAt), 'PPp', { locale: es })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## 6.7 Componente de Eliminar Documento

Crea el archivo `app/documentos/[id]/_components/eliminar-documento-button.tsx`:

```typescript
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { eliminarDocumento } from '@/actions';

interface EliminarDocumentoButtonProps {
  id: string;
  codigo: string;
}

export function EliminarDocumentoButton({ id, codigo }: EliminarDocumentoButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleEliminar = () => {
    startTransition(async () => {
      const resultado = await eliminarDocumento(id);

      if (resultado.success) {
        toast.success('Documento eliminado', {
          description: `El documento ${codigo} ha sido eliminado`,
        });
        setOpen(false);
        router.push('/documentos');
        router.refresh();
      } else {
        toast.error('Error al eliminar', {
          description: resultado.error,
        });
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente el documento{' '}
            <strong>{codigo}</strong> y todos sus datos asociados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleEliminar}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Sí, eliminar
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## 6.8 Actualizar Exportaciones de Componentes

Actualiza `components/forms/index.ts` para incluir el nuevo componente:

```typescript
// Wrapper base
export { FormFieldWrapper } from './form-field-wrapper';

// Inputs de texto
export { FormInput } from './form-input';
export { FormTextarea } from './form-textarea';
export { FormPasswordInput } from './form-password-input';

// Selección
export { FormSelect, type SelectOption } from './form-select';
export { FormRadioGroup, type RadioOption } from './form-radio-group';
export { FormCheckbox } from './form-checkbox';

// Numéricos y fechas
export { FormNumberInput } from './form-number-input';
export { FormDatePicker } from './form-date-picker';

// Archivos
export { FormFileUpload } from './form-file-upload';
export { FormFileDragDrop } from './form-file-drag-drop';

// Otros
export { FormTagInput } from './form-tag-input';

// Formularios completos
export { DocumentoForm } from './documento-form';
```

---

## 6.9 Crear Carpeta de Hooks

Crea el archivo `hooks/index.ts`:

```typescript
export { useDocumentoForm } from './use-documento-form';
```

---

## Resumen del Módulo

En este módulo hemos creado:

| Archivo | Descripción |
|---------|-------------|
| `hooks/use-documento-form.ts` | Hook con lógica de submit, upload y errores |
| `components/forms/documento-form.tsx` | Formulario completo con todas las secciones |
| `app/documentos/nuevo/page.tsx` | Página de creación |
| `app/documentos/[id]/page.tsx` | Página de detalle |
| `app/documentos/[id]/editar/page.tsx` | Página de edición |
| `app/documentos/[id]/_components/eliminar-documento-button.tsx` | Botón de eliminar con confirmación |

### Flujo completo implementado:

```
/documentos/nuevo     → Crear documento
/documentos/[id]      → Ver detalle
/documentos/[id]/editar → Editar documento
```

### Características:

- ✅ Formulario organizado en Cards/secciones
- ✅ Validación cliente (Zod) + servidor (Server Actions)
- ✅ Modo creación y edición con mismo componente
- ✅ Toast notifications para feedback
- ✅ Manejo de errores de campo
- ✅ Confirmación antes de eliminar
- ✅ Breadcrumbs para navegación
- ✅ Metadata dinámica para SEO

### Estructura de archivos:

```
app/
└── documentos/
    ├── nuevo/
    │   └── page.tsx
    └── [id]/
        ├── page.tsx
        ├── editar/
        │   └── page.tsx
        └── _components/
            └── eliminar-documento-button.tsx

components/
└── forms/
    └── documento-form.tsx

hooks/
└── use-documento-form.ts
```

---

## Próximo Módulo

En el **Módulo 7: Upload de Archivos** implementaremos:

- Storage local para desarrollo
- Storage S3/R2 para producción
- Server Actions para upload
- Presigned URLs
- Progreso real de upload
- Eliminación de archivos

---

¿Continúo con el Módulo 7?
