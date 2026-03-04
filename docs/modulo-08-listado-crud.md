# Módulo 8: Listado y Operaciones CRUD Completas

## Objetivo del Módulo

Al finalizar este módulo tendrás:
- Página de listado con DataTable completa
- Filtros avanzados y búsqueda
- Paginación server-side
- Ordenamiento por columnas
- Acciones individuales y en lote
- Componentes reutilizables para tablas

---

## 8.1 Arquitectura del Listado

El listado usa Server Components para la carga inicial y Client Components para interactividad:

```
/documentos (Server Component)
     │
     ├── Carga inicial de datos (Server Action)
     │
     └── <DocumentosClient> (Client Component)
              │
              ├── <FiltrosDocumentos>
              ├── <TablaDocumentos>
              └── <Paginacion>
```

**¿Por qué esta arquitectura?**

- **SEO**: La tabla se renderiza en el servidor
- **Performance**: Datos iniciales sin loading state
- **Interactividad**: Filtros y paginación sin recargar página
- **URL State**: Los filtros se reflejan en la URL (compartible/bookmarkeable)

---

## 8.2 Componente de Filtros

Crea el archivo `app/documentos/_components/filtros-documentos.tsx`:

```typescript
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { Search, X, Filter, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  TIPOS_DOCUMENTO,
  TIPO_DOCUMENTO_LABELS,
  ESTADOS_DOCUMENTO,
  ESTADO_DOCUMENTO_LABELS,
  PRIORIDADES_DOCUMENTO,
  PRIORIDAD_DOCUMENTO_LABELS,
} from '@/db/schema';

export function FiltrosDocumentos() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Obtener valores actuales de la URL
  const busqueda = searchParams.get('busqueda') || '';
  const tipo = searchParams.get('tipo') || '';
  const estado = searchParams.get('estado') || '';
  const prioridad = searchParams.get('prioridad') || '';
  const esConfidencial = searchParams.get('esConfidencial') === 'true';

  // Contar filtros activos
  const filtrosActivos = [tipo, estado, prioridad, esConfidencial ? 'true' : ''].filter(Boolean).length;

  // Actualizar URL con nuevos parámetros
  const actualizarFiltros = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      // Resetear a página 1 cuando cambian los filtros
      params.set('page', '1');

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams]
  );

  // Limpiar todos los filtros
  const limpiarFiltros = () => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  // Debounce para búsqueda
  const handleBusqueda = useCallback(
    (value: string) => {
      const timeoutId = setTimeout(() => {
        actualizarFiltros({ busqueda: value || null });
      }, 300);
      return () => clearTimeout(timeoutId);
    },
    [actualizarFiltros]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, título o descripción..."
            defaultValue={busqueda}
            onChange={(e) => handleBusqueda(e.target.value)}
            className="pl-9"
          />
          {busqueda && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => actualizarFiltros({ busqueda: null })}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filtros rápidos en desktop */}
        <div className="hidden md:flex gap-2">
          <Select
            value={tipo}
            onValueChange={(value) => actualizarFiltros({ tipo: value === 'todos' ? null : value })}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {TIPOS_DOCUMENTO.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIPO_DOCUMENTO_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={estado}
            onValueChange={(value) => actualizarFiltros({ estado: value === 'todos' ? null : value })}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {ESTADOS_DOCUMENTO.map((e) => (
                <SelectItem key={e} value={e}>
                  {ESTADO_DOCUMENTO_LABELS[e]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtros avanzados (Sheet) */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              {filtrosActivos > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filtrosActivos}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filtros Avanzados</SheetTitle>
              <SheetDescription>
                Aplica filtros para encontrar documentos específicos
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 py-6">
              {/* Tipo */}
              <div className="space-y-2">
                <Label>Tipo de Documento</Label>
                <Select
                  value={tipo}
                  onValueChange={(value) => actualizarFiltros({ tipo: value === 'todos' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los tipos</SelectItem>
                    {TIPOS_DOCUMENTO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_DOCUMENTO_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={estado}
                  onValueChange={(value) => actualizarFiltros({ estado: value === 'todos' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    {ESTADOS_DOCUMENTO.map((e) => (
                      <SelectItem key={e} value={e}>
                        {ESTADO_DOCUMENTO_LABELS[e]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prioridad */}
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select
                  value={prioridad}
                  onValueChange={(value) => actualizarFiltros({ prioridad: value === 'todos' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las prioridades</SelectItem>
                    {PRIORIDADES_DOCUMENTO.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORIDAD_DOCUMENTO_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Confidencial */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Solo Confidenciales</Label>
                  <p className="text-sm text-muted-foreground">
                    Mostrar solo documentos marcados como confidenciales
                  </p>
                </div>
                <Switch
                  checked={esConfidencial}
                  onCheckedChange={(checked) =>
                    actualizarFiltros({ esConfidencial: checked ? 'true' : null })
                  }
                />
              </div>
            </div>

            <SheetFooter>
              <SheetClose asChild>
                <Button variant="outline" onClick={limpiarFiltros}>
                  Limpiar Filtros
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button>Aplicar</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Botón limpiar (visible cuando hay filtros) */}
        {(busqueda || filtrosActivos > 0) && (
          <Button variant="ghost" onClick={limpiarFiltros} className="gap-2">
            <X className="h-4 w-4" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Indicador de loading */}
      {isPending && (
        <div className="h-1 w-full bg-muted overflow-hidden rounded-full">
          <div className="h-full w-1/3 bg-primary animate-pulse" />
        </div>
      )}
    </div>
  );
}
```

---

## 8.3 Componente de Tabla de Documentos

Crea el archivo `app/documentos/_components/tabla-documentos.tsx`:

```typescript
'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  FileText,
  Lock,
  ArrowUpDown,
  CheckSquare,
  Square,
  Loader2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  TIPO_DOCUMENTO_LABELS,
  ESTADO_DOCUMENTO_LABELS,
  PRIORIDAD_DOCUMENTO_LABELS,
  type Documento,
  type EstadoDocumento,
  type PrioridadDocumento,
} from '@/db/schema';
import { eliminarDocumento, eliminarDocumentosEnLote } from '@/actions';

interface TablaDocumentosProps {
  documentos: Documento[];
  totalItems: number;
}

export function TablaDocumentos({ documentos, totalItems }: TablaDocumentosProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentoAEliminar, setDocumentoAEliminar] = useState<Documento | null>(null);
  const [eliminandoLote, setEliminandoLote] = useState(false);

  // Variantes de badge para estado
  const estadoVariant: Record<EstadoDocumento, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    borrador: 'secondary',
    revision: 'default',
    aprobado: 'default',
    archivado: 'outline',
    anulado: 'destructive',
  };

  const estadoColor: Record<EstadoDocumento, string> = {
    borrador: 'bg-slate-100 text-slate-700',
    revision: 'bg-amber-100 text-amber-700',
    aprobado: 'bg-green-100 text-green-700',
    archivado: 'bg-gray-100 text-gray-700',
    anulado: 'bg-red-100 text-red-700',
  };

  // Variantes de badge para prioridad
  const prioridadColor: Record<PrioridadDocumento, string> = {
    baja: 'bg-slate-100 text-slate-600',
    media: 'bg-blue-100 text-blue-700',
    alta: 'bg-orange-100 text-orange-700',
    urgente: 'bg-red-100 text-red-700',
  };

  // Selección
  const todosSeleccionados = documentos.length > 0 && selectedIds.size === documentos.length;
  const algunosSeleccionados = selectedIds.size > 0 && selectedIds.size < documentos.length;

  const toggleTodos = () => {
    if (todosSeleccionados) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documentos.map((d) => d.id)));
    }
  };

  const toggleUno = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Eliminar individual
  const handleEliminar = async () => {
    if (!documentoAEliminar) return;

    startTransition(async () => {
      const resultado = await eliminarDocumento(documentoAEliminar.id);

      if (resultado.success) {
        toast.success('Documento eliminado', {
          description: `${documentoAEliminar.codigo} ha sido eliminado`,
        });
        router.refresh();
      } else {
        toast.error('Error al eliminar', {
          description: resultado.error,
        });
      }

      setDeleteDialogOpen(false);
      setDocumentoAEliminar(null);
    });
  };

  // Eliminar en lote
  const handleEliminarLote = async () => {
    if (selectedIds.size === 0) return;

    setEliminandoLote(true);

    const resultado = await eliminarDocumentosEnLote(Array.from(selectedIds));

    if (resultado.success) {
      const { eliminados, errores } = resultado.data;

      if (eliminados.length > 0) {
        toast.success(`${eliminados.length} documento(s) eliminado(s)`);
      }

      if (errores.length > 0) {
        toast.error(`${errores.length} documento(s) no se pudieron eliminar`);
      }

      setSelectedIds(new Set());
      router.refresh();
    } else {
      toast.error('Error al eliminar', {
        description: resultado.error,
      });
    }

    setEliminandoLote(false);
  };

  // Abrir diálogo de eliminar
  const abrirDialogoEliminar = (documento: Documento) => {
    setDocumentoAEliminar(documento);
    setDeleteDialogOpen(true);
  };

  if (documentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No se encontraron documentos</h3>
        <p className="text-muted-foreground mt-1">
          Intenta ajustar los filtros o crea un nuevo documento.
        </p>
        <Button asChild className="mt-4">
          <Link href="/documentos/nuevo">Crear Documento</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Acciones en lote */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} documento(s) seleccionado(s)
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleEliminarLote}
            disabled={eliminandoLote}
          >
            {eliminandoLote ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Eliminar Seleccionados
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={todosSeleccionados}
                  ref={(el) => {
                    if (el) {
                      (el as HTMLButtonElement).dataset.state = algunosSeleccionados ? 'indeterminate' : todosSeleccionados ? 'checked' : 'unchecked';
                    }
                  }}
                  onCheckedChange={toggleTodos}
                  aria-label="Seleccionar todos"
                />
              </TableHead>
              <TableHead>Código</TableHead>
              <TableHead className="min-w-[200px]">Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Fecha Exp.</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documentos.map((documento) => (
              <TableRow
                key={documento.id}
                className={selectedIds.has(documento.id) ? 'bg-muted/50' : ''}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(documento.id)}
                    onCheckedChange={() => toggleUno(documento.id)}
                    aria-label={`Seleccionar ${documento.codigo}`}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/documentos/${documento.id}`}
                    className="font-mono text-sm font-medium hover:underline flex items-center gap-1"
                  >
                    {documento.codigo}
                    {documento.esConfidencial && (
                      <Lock className="h-3 w-3 text-destructive" />
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="max-w-[300px]">
                    <p className="truncate font-medium">{documento.titulo}</p>
                    {documento.descripcion && (
                      <p className="truncate text-sm text-muted-foreground">
                        {documento.descripcion}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {TIPO_DOCUMENTO_LABELS[documento.tipo]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={estadoColor[documento.estado]}>
                    {ESTADO_DOCUMENTO_LABELS[documento.estado]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={prioridadColor[documento.prioridad]}>
                    {PRIORIDAD_DOCUMENTO_LABELS[documento.prioridad]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(documento.fechaExpedicion), 'dd MMM yyyy', {
                    locale: es,
                  })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir menú</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/documentos/${documento.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalle
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/documentos/${documento.id}/editar`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => abrirDialogoEliminar(documento)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Diálogo de confirmación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el documento{' '}
              <strong>{documentoAEliminar?.codigo}</strong>.
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

---

## 8.4 Componente de Paginación

Crea el archivo `app/documentos/_components/paginacion-documentos.tsx`:

```typescript
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PaginacionDocumentosProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

export function PaginacionDocumentos({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
}: PaginacionDocumentosProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const cambiarPagina = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const cambiarPageSize = (size: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', size);
    params.set('page', '1'); // Resetear a página 1

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  // Calcular rango de items mostrados
  const desde = (currentPage - 1) * pageSize + 1;
  const hasta = Math.min(currentPage * pageSize, totalItems);

  // Generar números de página para mostrar
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const showPages = 5; // Páginas a mostrar

    if (totalPages <= showPages) {
      // Mostrar todas las páginas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Siempre mostrar primera página
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      // Páginas alrededor de la actual
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      // Siempre mostrar última página
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      {/* Info de resultados */}
      <div className="text-sm text-muted-foreground">
        Mostrando <strong>{desde}</strong> a <strong>{hasta}</strong> de{' '}
        <strong>{totalItems}</strong> documento(s)
      </div>

      {/* Controles */}
      <div className="flex items-center gap-4">
        {/* Selector de página size */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mostrar</span>
          <Select value={pageSize.toString()} onValueChange={cambiarPageSize}>
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Botones de navegación */}
        <div className="flex items-center gap-1">
          {/* Primera página */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => cambiarPagina(1)}
            disabled={currentPage === 1 || isPending}
            aria-label="Primera página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Página anterior */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => cambiarPagina(currentPage - 1)}
            disabled={currentPage === 1 || isPending}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Números de página */}
          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((page, index) =>
              page === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              ) : (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => cambiarPagina(page)}
                  disabled={isPending}
                >
                  {page}
                </Button>
              )
            )}
          </div>

          {/* Indicador móvil */}
          <span className="sm:hidden text-sm px-2">
            {currentPage} / {totalPages}
          </span>

          {/* Página siguiente */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => cambiarPagina(currentPage + 1)}
            disabled={currentPage === totalPages || isPending}
            aria-label="Página siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Última página */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => cambiarPagina(totalPages)}
            disabled={currentPage === totalPages || isPending}
            aria-label="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## 8.5 Exportar Componentes del Listado

Crea el archivo `app/documentos/_components/index.ts`:

```typescript
export { FiltrosDocumentos } from './filtros-documentos';
export { TablaDocumentos } from './tabla-documentos';
export { PaginacionDocumentos } from './paginacion-documentos';
```

---

## 8.6 Página Principal de Documentos

Crea el archivo `app/documentos/page.tsx`:

```typescript
import Link from 'next/link';
import { Suspense } from 'react';
import { Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { listarDocumentos, obtenerEstadisticasDocumentos } from '@/actions';
import {
  FiltrosDocumentos,
  TablaDocumentos,
  PaginacionDocumentos,
} from './_components';
import { ESTADO_DOCUMENTO_LABELS } from '@/db/schema';

interface DocumentosPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    busqueda?: string;
    tipo?: string;
    estado?: string;
    prioridad?: string;
    esConfidencial?: string;
  }>;
}

export const metadata = {
  title: 'Documentos | Sistema de Gestión',
  description: 'Listado de documentos del sistema',
};

// Componente de estadísticas
async function EstadisticasDocumentos() {
  const resultado = await obtenerEstadisticasDocumentos();

  if (!resultado.success) {
    return null;
  }

  const { total, porEstado } = resultado.data;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{total}</p>
        </CardContent>
      </Card>

      {Object.entries(porEstado).map(([estado, cantidad]) => (
        <Card key={estado}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {ESTADO_DOCUMENTO_LABELS[estado as keyof typeof ESTADO_DOCUMENTO_LABELS]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{cantidad}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Skeleton para estadísticas
function EstadisticasSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Componente de listado
async function ListadoDocumentos({
  searchParams,
}: {
  searchParams: DocumentosPageProps['searchParams'];
}) {
  const params = await searchParams;

  // Parsear parámetros de búsqueda
  const page = parseInt(params.page || '1', 10);
  const pageSize = parseInt(params.pageSize || '10', 10);

  const filtros = {
    page,
    pageSize,
    busqueda: params.busqueda,
    tipo: params.tipo as any,
    estado: params.estado as any,
    prioridad: params.prioridad as any,
    esConfidencial: params.esConfidencial === 'true' ? true : undefined,
  };

  // Obtener documentos
  const resultado = await listarDocumentos(filtros);

  if (!resultado.success) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Error al cargar documentos: {resultado.error}</p>
      </div>
    );
  }

  const { data: documentos, pagination } = resultado.data;

  return (
    <>
      <TablaDocumentos documentos={documentos} totalItems={pagination.totalItems} />
      <PaginacionDocumentos
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
      />
    </>
  );
}

// Skeleton para tabla
function TablaSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function DocumentosPage({ searchParams }: DocumentosPageProps) {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Documentos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los documentos del sistema
          </p>
        </div>
        <Button asChild>
          <Link href="/documentos/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Documento
          </Link>
        </Button>
      </div>

      {/* Estadísticas */}
      <Suspense fallback={<EstadisticasSkeleton />}>
        <EstadisticasDocumentos />
      </Suspense>

      {/* Filtros */}
      <FiltrosDocumentos />

      {/* Tabla con loading state */}
      <Suspense fallback={<TablaSkeleton />}>
        <ListadoDocumentos searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
```

---

## 8.7 Instalar Componentes Faltantes de Shadcn

Ejecuta los siguientes comandos para instalar componentes que usamos:

```bash
pnpm dlx shadcn@latest add sheet switch skeleton dropdown-menu alert-dialog
```

---

## 8.8 Página Not Found para Documentos

Crea el archivo `app/documentos/[id]/not-found.tsx`:

```typescript
import Link from 'next/link';
import { FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DocumentoNotFound() {
  return (
    <div className="container mx-auto py-16 text-center">
      <FileX className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold mb-2">Documento no encontrado</h1>
      <p className="text-muted-foreground mb-6">
        El documento que buscas no existe o ha sido eliminado.
      </p>
      <Button asChild>
        <Link href="/documentos">Volver al listado</Link>
      </Button>
    </div>
  );
}
```

---

## 8.9 Layout de Documentos (Opcional)

Si quieres agregar navegación o estructura común, crea `app/documentos/layout.tsx`:

```typescript
import { ReactNode } from 'react';

interface DocumentosLayoutProps {
  children: ReactNode;
}

export default function DocumentosLayout({ children }: DocumentosLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Podrías agregar un sidebar o navegación aquí */}
      {children}
    </div>
  );
}
```

---

## Resumen del Módulo

En este módulo hemos creado:

| Archivo | Descripción |
|---------|-------------|
| `app/documentos/_components/filtros-documentos.tsx` | Barra de búsqueda + filtros en Sheet |
| `app/documentos/_components/tabla-documentos.tsx` | DataTable con selección y acciones |
| `app/documentos/_components/paginacion-documentos.tsx` | Navegación de páginas |
| `app/documentos/page.tsx` | Página principal con estadísticas |
| `app/documentos/[id]/not-found.tsx` | Página 404 para documentos |

### Características implementadas:

**Filtros:**
- ✅ Búsqueda con debounce
- ✅ Filtros por tipo, estado, prioridad
- ✅ Toggle de confidencialidad
- ✅ Filtros persisten en URL (compartible)
- ✅ Sheet para filtros avanzados en móvil

**Tabla:**
- ✅ Selección individual y múltiple
- ✅ Acciones en lote (eliminar)
- ✅ Menú de acciones por fila
- ✅ Badges con colores por estado/prioridad
- ✅ Indicador de confidencialidad

**Paginación:**
- ✅ Server-side (no carga todos los datos)
- ✅ Selector de items por página
- ✅ Navegación con números de página
- ✅ Elipsis para muchas páginas

**UX:**
- ✅ Loading states con Skeletons
- ✅ Estadísticas rápidas
- ✅ Empty state cuando no hay resultados
- ✅ Confirmación antes de eliminar

### Estructura de archivos:

```
app/
└── documentos/
    ├── _components/
    │   ├── filtros-documentos.tsx
    │   ├── tabla-documentos.tsx
    │   ├── paginacion-documentos.tsx
    │   └── index.ts
    ├── [id]/
    │   ├── _components/
    │   │   └── eliminar-documento-button.tsx
    │   ├── editar/
    │   │   └── page.tsx
    │   ├── page.tsx
    │   └── not-found.tsx
    ├── nuevo/
    │   └── page.tsx
    ├── layout.tsx
    └── page.tsx
```

---

## Próximo Módulo

En el **Módulo 9: Manejo de Errores Server-Side** profundizaremos en:

- Patrón Result/Either más robusto
- Error boundaries para componentes
- Logging estructurado
- Errores específicos por campo
- Retry logic para errores transitorios
- Notificaciones de error globales

---

¿Continúo con el Módulo 9?
