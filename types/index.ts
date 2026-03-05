// Tipos globales compartidos
// Tipo genérico para respuestas de Server Actions
export type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// Tipo para estados de formulario
export type FormState = {
  status: "idle" | "loading" | "success" | "error";
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
} from "@/db/schema";
