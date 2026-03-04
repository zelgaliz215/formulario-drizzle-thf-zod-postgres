# Módulo 9: Manejo de Errores Server-Side

## Objetivo del Módulo

Al finalizar este módulo tendrás:
- Sistema robusto de manejo de errores en Server Actions
- Tipos de error bien definidos y distinguibles
- Error boundaries para componentes React
- Logging estructurado para debugging
- Estrategias de retry para errores transitorios
- Experiencia de usuario consistente ante fallos

---

## 9.1 Filosofía del Manejo de Errores

En una aplicación robusta, los errores se manejan en múltiples capas:

```
┌─────────────────────────────────────────────────┐
│  UI Layer (Error Boundaries, Toast, Forms)      │
├─────────────────────────────────────────────────┤
│  Action Layer (Server Actions validation)       │
├─────────────────────────────────────────────────┤
│  Service Layer (Business logic errors)          │
├─────────────────────────────────────────────────┤
│  Data Layer (Database, External APIs)           │
└─────────────────────────────────────────────────┘
```

**Principios:**

1. **Fail fast**: Detectar errores lo antes posible
2. **Fail gracefully**: El usuario siempre ve un mensaje útil
3. **Never trust input**: Validar en servidor aunque se valide en cliente
4. **Log everything**: Errores en servidor = logs detallados
5. **Distinguish error types**: No todos los errores se manejan igual

---

## 9.2 Tipos de Error Personalizados

Crea el archivo `lib/errors/types.ts`:

```typescript
/**
 * Códigos de error de la aplicación
 */
export enum ErrorCode {
  // Errores de validación
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Errores de base de datos
  DB_CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR = 'DB_QUERY_ERROR',
  DB_CONSTRAINT_ERROR = 'DB_CONSTRAINT_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',
  
  // Errores de autenticación/autorización
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Errores de archivos
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  
  // Errores de red/externos
  NETWORK_ERROR = 'NETWORK_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // Errores genéricos
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Severidad del error (para logging)
 */
export enum ErrorSeverity {
  LOW = 'low',       // Info, puede ignorarse
  MEDIUM = 'medium', // Warning, requiere atención
  HIGH = 'high',     // Error, afecta funcionalidad
  CRITICAL = 'critical', // Error crítico, requiere acción inmediata
}

/**
 * Metadata adicional del error
 */
export interface ErrorMetadata {
  /** Código del error */
  code: ErrorCode;
  /** Severidad */
  severity: ErrorSeverity;
  /** Si el error es recuperable (puede reintentar) */
  retryable: boolean;
  /** Errores específicos por campo (para formularios) */
  fieldErrors?: Record<string, string[]>;
  /** Datos adicionales para debugging */
  context?: Record<string, unknown>;
  /** Timestamp del error */
  timestamp: Date;
  /** ID único del error (para correlación en logs) */
  errorId: string;
}

/**
 * Clase base para errores de la aplicación
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly retryable: boolean;
  public readonly fieldErrors?: Record<string, string[]>;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly errorId: string;
  public readonly originalError?: Error;

  constructor(
    message: string,
    options: {
      code?: ErrorCode;
      severity?: ErrorSeverity;
      retryable?: boolean;
      fieldErrors?: Record<string, string[]>;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = options.code || ErrorCode.UNKNOWN_ERROR;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.retryable = options.retryable ?? false;
    this.fieldErrors = options.fieldErrors;
    this.context = options.context;
    this.timestamp = new Date();
    this.errorId = generateErrorId();
    this.originalError = options.cause;

    // Mantener stack trace correcto
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convierte el error a un objeto plano para serialización
   */
  toJSON(): ErrorMetadata & { message: string } {
    return {
      message: this.message,
      code: this.code,
      severity: this.severity,
      retryable: this.retryable,
      fieldErrors: this.fieldErrors,
      context: this.context,
      timestamp: this.timestamp,
      errorId: this.errorId,
    };
  }
}

/**
 * Error de validación
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    fieldErrors?: Record<string, string[]>,
    context?: Record<string, unknown>
  ) {
    super(message, {
      code: ErrorCode.VALIDATION_ERROR,
      severity: ErrorSeverity.LOW,
      retryable: false,
      fieldErrors,
      context,
    });
    this.name = 'ValidationError';
  }
}

/**
 * Error de registro no encontrado
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    super(`${resource} no encontrado${identifier ? `: ${identifier}` : ''}`, {
      code: ErrorCode.RECORD_NOT_FOUND,
      severity: ErrorSeverity.LOW,
      retryable: false,
      context: { resource, identifier },
    });
    this.name = 'NotFoundError';
  }
}

/**
 * Error de registro duplicado
 */
export class DuplicateError extends AppError {
  constructor(field: string, value?: string) {
    super(`Ya existe un registro con este ${field}`, {
      code: ErrorCode.DUPLICATE_RECORD,
      severity: ErrorSeverity.LOW,
      retryable: false,
      fieldErrors: { [field]: [`Este ${field} ya está en uso`] },
      context: { field, value },
    });
    this.name = 'DuplicateError';
  }
}

/**
 * Error de base de datos
 */
export class DatabaseError extends AppError {
  constructor(message: string, cause?: Error, retryable = false) {
    super(message, {
      code: ErrorCode.DB_QUERY_ERROR,
      severity: ErrorSeverity.HIGH,
      retryable,
      cause,
    });
    this.name = 'DatabaseError';
  }
}

/**
 * Error de archivo
 */
export class FileError extends AppError {
  constructor(
    message: string,
    code: ErrorCode.FILE_TOO_LARGE | ErrorCode.INVALID_FILE_TYPE | ErrorCode.UPLOAD_FAILED,
    context?: Record<string, unknown>
  ) {
    super(message, {
      code,
      severity: ErrorSeverity.LOW,
      retryable: code === ErrorCode.UPLOAD_FAILED,
      context,
    });
    this.name = 'FileError';
  }
}

/**
 * Error de timeout/red (retryable)
 */
export class NetworkError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, {
      code: ErrorCode.NETWORK_ERROR,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      cause,
    });
    this.name = 'NetworkError';
  }
}

/**
 * Genera un ID único para el error
 */
function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `err_${timestamp}_${random}`;
}
```

---

## 9.3 Sistema de Logging

Crea el archivo `lib/errors/logger.ts`:

```typescript
import { ErrorCode, ErrorSeverity, AppError } from './types';

/**
 * Niveles de log
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Entrada de log estructurada
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  errorId?: string;
  code?: ErrorCode;
  severity?: ErrorSeverity;
  context?: Record<string, unknown>;
  stack?: string;
  duration?: number;
}

/**
 * Logger simple pero estructurado
 * En producción, esto se conectaría a un servicio como Sentry, LogRocket, etc.
 */
class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Formatea una entrada de log para consola
   */
  private formatForConsole(entry: LogEntry): string {
    const { level, message, errorId, code, context } = entry;
    
    let output = `[${entry.timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (errorId) output += ` (${errorId})`;
    if (code) output += ` [${code}]`;
    
    return output;
  }

  /**
   * Log de nivel debug
   */
  debug(message: string, context?: Record<string, unknown>) {
    if (!this.isDevelopment) return;

    const entry: LogEntry = {
      level: LogLevel.DEBUG,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    console.debug(this.formatForConsole(entry), context || '');
  }

  /**
   * Log de nivel info
   */
  info(message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: LogLevel.INFO,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    console.info(this.formatForConsole(entry), context || '');
  }

  /**
   * Log de nivel warning
   */
  warn(message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: LogLevel.WARN,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    console.warn(this.formatForConsole(entry), context || '');
  }

  /**
   * Log de error
   */
  error(error: Error | AppError | string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: LogLevel.ERROR,
      message: typeof error === 'string' ? error : error.message,
      timestamp: new Date().toISOString(),
      context,
    };

    if (error instanceof AppError) {
      entry.errorId = error.errorId;
      entry.code = error.code;
      entry.severity = error.severity;
      entry.context = { ...error.context, ...context };
      entry.stack = error.stack;
    } else if (error instanceof Error) {
      entry.stack = error.stack;
    }

    console.error(this.formatForConsole(entry));
    
    if (this.isDevelopment && entry.stack) {
      console.error(entry.stack);
    }

    // En producción, enviar a servicio de monitoreo
    if (!this.isDevelopment) {
      this.sendToMonitoring(entry);
    }
  }

  /**
   * Log de una acción/operación con duración
   */
  action(
    actionName: string,
    fn: () => Promise<void> | void,
    context?: Record<string, unknown>
  ): Promise<void> {
    const start = Date.now();

    return Promise.resolve(fn())
      .then(() => {
        const duration = Date.now() - start;
        this.debug(`Action completed: ${actionName}`, { duration, ...context });
      })
      .catch((error) => {
        const duration = Date.now() - start;
        this.error(error, { action: actionName, duration, ...context });
        throw error;
      });
  }

  /**
   * Placeholder para enviar a servicio de monitoreo
   */
  private sendToMonitoring(entry: LogEntry) {
    // TODO: Integrar con Sentry, LogRocket, etc.
    // Ejemplo con Sentry:
    // Sentry.captureException(entry);
  }
}

// Exportar instancia singleton
export const logger = new Logger();
```

---

## 9.4 Utilidades de Manejo de Errores Mejoradas

Actualiza el archivo `actions/utils.ts`:

```typescript
import { ZodError, ZodSchema } from 'zod';
import type { ActionResponse } from '@/types';
import { 
  AppError, 
  ValidationError, 
  NotFoundError, 
  DuplicateError,
  DatabaseError,
  ErrorCode,
} from '@/lib/errors/types';
import { logger } from '@/lib/errors/logger';

/**
 * Wrapper para ejecutar acciones con manejo de errores robusto
 */
export async function ejecutarAccion<T>(
  fn: () => Promise<T>,
  options: {
    actionName?: string;
    context?: Record<string, unknown>;
  } = {}
): Promise<ActionResponse<T>> {
  const { actionName = 'unknown', context } = options;
  const startTime = Date.now();

  try {
    const data = await fn();
    
    logger.debug(`Action success: ${actionName}`, {
      duration: Date.now() - startTime,
      ...context,
    });
    
    return { success: true, data };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log del error
    logger.error(error instanceof Error ? error : new Error(String(error)), {
      action: actionName,
      duration,
      ...context,
    });

    return manejarError(error);
  }
}

/**
 * Convierte cualquier error a ActionResponse
 */
export function manejarError(error: unknown): ActionResponse<never> {
  // Error de la aplicación (nuestros errores tipados)
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      fieldErrors: error.fieldErrors,
    };
  }

  // Error de validación Zod
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    
    error.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(err.message);
    });

    return {
      success: false,
      error: 'Error de validación',
      fieldErrors,
    };
  }

  // Error de PostgreSQL
  if (isPostgresError(error)) {
    return manejarErrorPostgres(error);
  }

  // Error genérico
  if (error instanceof Error) {
    const mensaje = process.env.NODE_ENV === 'development'
      ? error.message
      : 'Ha ocurrido un error inesperado';
    
    return {
      success: false,
      error: mensaje,
    };
  }

  // Error desconocido
  return {
    success: false,
    error: 'Ha ocurrido un error inesperado',
  };
}

/**
 * Valida datos con un schema Zod y lanza ValidationError si falla
 */
export function validarDatos<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    
    result.error.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(err.message);
    });

    throw new ValidationError('Error de validación', fieldErrors);
  }
  
  return result.data;
}

/**
 * Type guard para errores de PostgreSQL
 */
interface PostgresError {
  code: string;
  detail?: string;
  constraint?: string;
  column?: string;
  table?: string;
}

function isPostgresError(error: unknown): error is PostgresError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as PostgresError).code === 'string'
  );
}

/**
 * Mapea códigos de PostgreSQL a errores de la aplicación
 */
function manejarErrorPostgres(error: PostgresError): ActionResponse<never> {
  switch (error.code) {
    // Unique violation
    case '23505': {
      const campo = extraerCampoDeConstraint(error.constraint);
      const duplicateError = new DuplicateError(campo || 'campo');
      return {
        success: false,
        error: duplicateError.message,
        fieldErrors: duplicateError.fieldErrors,
      };
    }
    
    // Foreign key violation
    case '23503':
      return {
        success: false,
        error: 'No se puede completar la operación: referencia a datos inexistentes',
      };
    
    // Not null violation
    case '23502':
      return {
        success: false,
        error: `El campo ${error.column || 'requerido'} no puede estar vacío`,
      };
    
    // Check constraint violation
    case '23514':
      return {
        success: false,
        error: 'Los datos no cumplen con las restricciones requeridas',
      };

    // Connection errors
    case '08000':
    case '08003':
    case '08006':
      logger.error('Database connection error', { code: error.code });
      return {
        success: false,
        error: 'Error de conexión a la base de datos. Intente nuevamente.',
      };

    // Timeout
    case '57014':
      return {
        success: false,
        error: 'La operación tardó demasiado. Intente nuevamente.',
      };

    // Deadlock
    case '40P01':
      logger.warn('Deadlock detected', { detail: error.detail });
      return {
        success: false,
        error: 'Conflicto de operaciones. Intente nuevamente.',
      };

    default:
      logger.error('Unhandled PostgreSQL error', { 
        code: error.code, 
        detail: error.detail 
      });
      return {
        success: false,
        error: 'Error de base de datos',
      };
  }
}

/**
 * Extrae nombre del campo de un constraint de PostgreSQL
 */
function extraerCampoDeConstraint(constraint?: string): string | null {
  if (!constraint) return null;
  
  const partes = constraint.split('_');
  if (partes.length >= 2) {
    return partes[1];
  }
  
  return null;
}

/**
 * Wrapper para operaciones con retry automático
 */
export async function conRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoffMultiplier?: number;
    retryableErrors?: ErrorCode[];
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    retryableErrors = [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT_ERROR,
      ErrorCode.DB_CONNECTION_ERROR,
    ],
  } = options;

  let lastError: Error | undefined;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Verificar si el error es retryable
      const isRetryable = error instanceof AppError 
        ? error.retryable || retryableErrors.includes(error.code)
        : false;

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      logger.warn(`Retry attempt ${attempt}/${maxRetries}`, {
        error: lastError.message,
        nextDelay: currentDelay,
      });

      // Esperar antes de reintentar
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }

  throw lastError;
}
```

---

## 9.5 Error Boundary para React

Crea el archivo `components/error-boundary.tsx`:

```typescript
'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="max-w-md mx-auto my-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Algo salió mal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Ha ocurrido un error inesperado. Por favor intenta de nuevo.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="mt-4 p-4 bg-muted rounded-md text-xs overflow-auto">
                {this.state.error.message}
              </pre>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={this.handleReset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Intentar de nuevo
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}
```

---

## 9.6 Error Boundary para Server Components (Next.js)

Crea el archivo `app/documentos/error.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DocumentosError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log del error (en producción enviar a servicio de monitoreo)
    console.error('Error en módulo de documentos:', error);
  }, [error]);

  return (
    <div className="container mx-auto py-16">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            Error al cargar documentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Ha ocurrido un error al cargar esta página. Esto puede deberse a un 
            problema temporal de conexión o un error interno.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm font-mono text-destructive">{error.message}</p>
              {error.digest && (
                <p className="text-xs text-muted-foreground mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Si el problema persiste, contacta al administrador del sistema.
          </p>
        </CardContent>
        <CardFooter className="flex gap-4">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Intentar de nuevo
          </Button>
          <Button variant="outline" asChild>
            <Link href="/" className="gap-2">
              <Home className="h-4 w-4" />
              Ir al inicio
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

---

## 9.7 Loading State Global

Crea el archivo `app/documentos/loading.tsx`:

```typescript
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function DocumentosLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Stats skeleton */}
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

      {/* Filters skeleton */}
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1 max-w-md" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border p-4 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-10" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 9.8 Hook para Manejo de Errores en Cliente

Crea el archivo `hooks/use-error-handler.ts`:

```typescript
'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import type { ActionResponse } from '@/types';

interface UseErrorHandlerOptions {
  /** Callback cuando hay éxito */
  onSuccess?: () => void;
  /** Callback cuando hay error */
  onError?: (error: string) => void;
  /** Mensaje de éxito personalizado */
  successMessage?: string;
  /** Mostrar toast de éxito */
  showSuccessToast?: boolean;
}

/**
 * Hook para manejar respuestas de Server Actions de forma consistente
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const {
    onSuccess,
    onError,
    successMessage = 'Operación completada',
    showSuccessToast = true,
  } = options;

  const handleResponse = useCallback(
    <T>(response: ActionResponse<T>): T | null => {
      if (response.success) {
        if (showSuccessToast) {
          toast.success(successMessage);
        }
        onSuccess?.();
        return response.data;
      } else {
        toast.error('Error', {
          description: response.error,
        });
        onError?.(response.error);
        return null;
      }
    },
    [onSuccess, onError, successMessage, showSuccessToast]
  );

  const handleError = useCallback(
    (error: unknown) => {
      const message = error instanceof Error 
        ? error.message 
        : 'Ha ocurrido un error inesperado';
      
      toast.error('Error', {
        description: message,
      });
      
      onError?.(message);
    },
    [onError]
  );

  return {
    handleResponse,
    handleError,
  };
}

/**
 * Hook para mostrar errores de campo en formularios
 */
export function useFieldErrors() {
  const showFieldErrors = useCallback(
    (fieldErrors: Record<string, string[]> | undefined) => {
      if (!fieldErrors) return;

      Object.entries(fieldErrors).forEach(([field, messages]) => {
        messages.forEach((message) => {
          toast.error(`Error en ${field}`, {
            description: message,
          });
        });
      });
    },
    []
  );

  return { showFieldErrors };
}
```

---

## 9.9 Exportar Módulo de Errores

Crea el archivo `lib/errors/index.ts`:

```typescript
// Tipos de error
export {
  ErrorCode,
  ErrorSeverity,
  AppError,
  ValidationError,
  NotFoundError,
  DuplicateError,
  DatabaseError,
  FileError,
  NetworkError,
} from './types';

export type { ErrorMetadata } from './types';

// Logger
export { logger, LogLevel } from './logger';
```

Actualiza `hooks/index.ts`:

```typescript
export { useDocumentoForm } from './use-documento-form';
export { useErrorHandler, useFieldErrors } from './use-error-handler';
```

---

## 9.10 Ejemplo de Uso Integrado

Así se usaría todo junto en una acción:

```typescript
'use server';

import { db, documentos } from '@/db';
import { eq } from 'drizzle-orm';
import { ejecutarAccion, validarDatos, conRetry } from '@/actions/utils';
import { crearDocumentoSchema } from '@/lib/validations';
import { NotFoundError, DatabaseError } from '@/lib/errors';
import { logger } from '@/lib/errors';
import type { ActionResponse } from '@/types';

export async function obtenerDocumentoSeguro(
  id: string
): Promise<ActionResponse<{ documento: typeof documentos.$inferSelect }>> {
  return ejecutarAccion(
    async () => {
      // Operación con retry automático para errores de conexión
      const documento = await conRetry(
        async () => {
          const result = await db.query.documentos.findFirst({
            where: eq(documentos.id, id),
          });

          if (!result) {
            throw new NotFoundError('Documento', id);
          }

          return result;
        },
        { maxRetries: 3, delayMs: 500 }
      );

      logger.info('Documento obtenido', { documentoId: id });

      return { documento };
    },
    { actionName: 'obtenerDocumentoSeguro', context: { id } }
  );
}
```

---

## Resumen del Módulo

En este módulo hemos creado:

| Archivo | Descripción |
|---------|-------------|
| `lib/errors/types.ts` | Clases de error tipadas (`AppError`, `ValidationError`, etc.) |
| `lib/errors/logger.ts` | Sistema de logging estructurado |
| `lib/errors/index.ts` | Exportaciones del módulo |
| `actions/utils.ts` | Utilidades mejoradas con retry y logging |
| `components/error-boundary.tsx` | Error boundary para componentes cliente |
| `app/documentos/error.tsx` | Error page para el módulo de documentos |
| `app/documentos/loading.tsx` | Loading state global |
| `hooks/use-error-handler.ts` | Hook para manejar respuestas en cliente |

### Tipos de error implementados:

| Error | Uso | Retryable |
|-------|-----|-----------|
| `ValidationError` | Datos inválidos | No |
| `NotFoundError` | Recurso no existe | No |
| `DuplicateError` | Registro duplicado | No |
| `DatabaseError` | Error de BD | Configurable |
| `FileError` | Error de archivo | Solo upload |
| `NetworkError` | Error de red | Sí |

### Características:

- ✅ Errores tipados con códigos únicos
- ✅ Logging estructurado con niveles
- ✅ Error IDs para correlación
- ✅ Retry automático con backoff exponencial
- ✅ Error boundaries en React
- ✅ Loading states con Skeleton
- ✅ Mensajes amigables al usuario
- ✅ Información de debug solo en desarrollo

---

## Próximo Módulo

En el **Módulo 10: Resumen y Mejores Prácticas** consolidaremos:

- Checklist de arquitectura
- Patrones utilizados
- Recomendaciones de deployment
- Próximos pasos y mejoras sugeridas

---

¿Continúo con el Módulo 10 (final)?
