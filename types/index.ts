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

// Tipo para paginación
export type PaginationParams = {
  page: number;
  pageSize: number;
};

// Tipo para respuestas paginadas
export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};
