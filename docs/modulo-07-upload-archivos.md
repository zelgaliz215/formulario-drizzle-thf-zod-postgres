# Módulo 7: Upload de Archivos

## Objetivo del Módulo

Al finalizar este módulo tendrás:
- Sistema de upload funcionando con dos opciones de storage
- Storage local para desarrollo
- Storage S3/Cloudflare R2 para producción
- Server Actions para subir y eliminar archivos
- Presigned URLs para upload directo al bucket
- Progreso real de upload en el cliente

---

## 7.1 Arquitectura del Sistema de Upload

Implementaremos un patrón de abstracción que permite cambiar entre storage local y S3 sin modificar el código del formulario:

```
Cliente (FormFileDragDrop)
        ↓
Upload Handler (decide estrategia)
        ↓
    ┌───────────────────┐
    │   STORAGE_TYPE?   │
    └───────────────────┘
         │         │
    local│         │s3
         ↓         ↓
   Local FS    S3/R2 Bucket
```

**¿Por qué dos opciones?**

- **Local**: Más simple para desarrollo, no requiere configurar servicios externos
- **S3/R2**: Escalable, CDN, mejor para producción

---

## 7.2 Configuración de Variables de Entorno

Actualiza tu `.env.local`:

```env
# Tipo de storage: 'local' | 's3'
STORAGE_TYPE="local"

# Configuración Local
UPLOAD_DIR="./uploads"
NEXT_PUBLIC_UPLOAD_URL="/api/uploads"

# Configuración S3/R2 (para producción)
S3_ENDPOINT="https://xxx.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_ACCESS_KEY_ID="tu_access_key"
S3_SECRET_ACCESS_KEY="tu_secret_key"
S3_BUCKET_NAME="documentos"
S3_PUBLIC_URL="https://cdn.tudominio.com"
```

---

## 7.3 Tipos para el Sistema de Storage

Crea el archivo `lib/storage/types.ts`:

```typescript
/**
 * Resultado de una operación de upload exitosa
 */
export interface UploadResult {
  /** Ruta o key del archivo en el storage */
  path: string;
  /** URL pública para acceder al archivo */
  url: string;
  /** Nombre original del archivo */
  filename: string;
  /** Tipo MIME */
  mimeType: string;
  /** Tamaño en bytes */
  size: number;
}

/**
 * Opciones para subir un archivo
 */
export interface UploadOptions {
  /** Carpeta destino dentro del storage */
  folder?: string;
  /** Nombre personalizado (sin extensión) */
  customName?: string;
  /** Tipos MIME permitidos */
  allowedTypes?: string[];
  /** Tamaño máximo en bytes */
  maxSize?: number;
}

/**
 * Información para presigned URL (S3)
 */
export interface PresignedUrlInfo {
  /** URL para subir el archivo */
  uploadUrl: string;
  /** Key/path donde quedará el archivo */
  key: string;
  /** URL pública del archivo después del upload */
  publicUrl: string;
  /** Tiempo de expiración de la URL */
  expiresAt: Date;
}

/**
 * Interfaz que debe implementar cada storage provider
 */
export interface StorageProvider {
  /**
   * Sube un archivo al storage
   */
  upload(file: Buffer, filename: string, options?: UploadOptions): Promise<UploadResult>;
  
  /**
   * Elimina un archivo del storage
   */
  delete(path: string): Promise<boolean>;
  
  /**
   * Obtiene la URL pública de un archivo
   */
  getUrl(path: string): string;
  
  /**
   * Verifica si un archivo existe
   */
  exists(path: string): Promise<boolean>;
}

/**
 * Configuración del storage
 */
export interface StorageConfig {
  type: 'local' | 's3';
  local?: {
    uploadDir: string;
    publicUrl: string;
  };
  s3?: {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    publicUrl: string;
  };
}
```

---

## 7.4 Provider de Storage Local

Crea el archivo `lib/storage/local-storage.ts`:

```typescript
import { promises as fs } from 'fs';
import path from 'path';
import type { StorageProvider, UploadResult, UploadOptions } from './types';

export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;
  private publicUrl: string;

  constructor(uploadDir: string, publicUrl: string) {
    this.uploadDir = uploadDir;
    this.publicUrl = publicUrl;
  }

  /**
   * Asegura que el directorio de uploads exista
   */
  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // El directorio ya existe
    }
  }

  /**
   * Genera un nombre de archivo único
   */
  private generateFileName(originalName: string, customName?: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    if (customName) {
      return `${customName}-${timestamp}${ext}`;
    }
    
    const baseName = path.basename(originalName, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 50);
    
    return `${baseName}-${timestamp}-${random}${ext}`;
  }

  async upload(
    file: Buffer,
    filename: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const { folder = '', customName, allowedTypes, maxSize } = options;

    // Validar tipo MIME (básico basado en extensión)
    if (allowedTypes && allowedTypes.length > 0) {
      const ext = path.extname(filename).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      const mimeType = mimeMap[ext] || 'application/octet-stream';
      
      if (!allowedTypes.includes(mimeType)) {
        throw new Error(`Tipo de archivo no permitido: ${mimeType}`);
      }
    }

    // Validar tamaño
    if (maxSize && file.length > maxSize) {
      throw new Error(`El archivo excede el tamaño máximo permitido`);
    }

    // Preparar directorio y nombre
    const targetDir = path.join(this.uploadDir, folder);
    await this.ensureDir(targetDir);

    const newFilename = this.generateFileName(filename, customName);
    const filePath = path.join(targetDir, newFilename);
    const relativePath = path.join(folder, newFilename).replace(/\\/g, '/');

    // Escribir archivo
    await fs.writeFile(filePath, file);

    // Obtener info del archivo
    const stats = await fs.stat(filePath);
    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    return {
      path: relativePath,
      url: this.getUrl(relativePath),
      filename: newFilename,
      mimeType: mimeMap[ext] || 'application/octet-stream',
      size: stats.size,
    };
  }

  async delete(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      console.error('Error eliminando archivo local:', error);
      return false;
    }
  }

  getUrl(filePath: string): string {
    return `${this.publicUrl}/${filePath}`;
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
```

---

## 7.5 Provider de Storage S3

Crea el archivo `lib/storage/s3-storage.ts`:

```typescript
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import type { StorageProvider, UploadResult, UploadOptions, PresignedUrlInfo } from './types';

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(config: {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    publicUrl: string;
  }) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // Necesario para Cloudflare R2
      forcePathStyle: true,
    });
    this.bucket = config.bucket;
    this.publicUrl = config.publicUrl;
  }

  /**
   * Genera un key único para S3
   */
  private generateKey(originalName: string, folder: string, customName?: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    let filename: string;
    if (customName) {
      filename = `${customName}-${timestamp}${ext}`;
    } else {
      const baseName = path.basename(originalName, ext)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .substring(0, 50);
      filename = `${baseName}-${timestamp}-${random}${ext}`;
    }

    return folder ? `${folder}/${filename}` : filename;
  }

  /**
   * Obtiene el Content-Type basado en la extensión
   */
  private getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return mimeMap[ext] || 'application/octet-stream';
  }

  async upload(
    file: Buffer,
    filename: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const { folder = 'documentos', customName, allowedTypes, maxSize } = options;

    const contentType = this.getContentType(filename);

    // Validar tipo
    if (allowedTypes && !allowedTypes.includes(contentType)) {
      throw new Error(`Tipo de archivo no permitido: ${contentType}`);
    }

    // Validar tamaño
    if (maxSize && file.length > maxSize) {
      throw new Error(`El archivo excede el tamaño máximo permitido`);
    }

    const key = this.generateKey(filename, folder, customName);

    // Subir a S3
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
        // Metadata opcional
        Metadata: {
          'original-filename': filename,
        },
      })
    );

    return {
      path: key,
      url: this.getUrl(key),
      filename: path.basename(key),
      mimeType: contentType,
      size: file.length,
    };
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch (error) {
      console.error('Error eliminando archivo de S3:', error);
      return false;
    }
  }

  getUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Genera una presigned URL para upload directo desde el cliente
   * Esto evita que el archivo pase por el servidor de Next.js
   */
  async getPresignedUploadUrl(
    filename: string,
    folder: string = 'documentos',
    expiresIn: number = 3600 // 1 hora
  ): Promise<PresignedUrlInfo> {
    const key = this.generateKey(filename, folder);
    const contentType = this.getContentType(filename);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });

    return {
      uploadUrl,
      key,
      publicUrl: this.getUrl(key),
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }
}
```

---

## 7.6 Factory de Storage

Crea el archivo `lib/storage/index.ts`:

```typescript
import type { StorageProvider, StorageConfig } from './types';
import { LocalStorageProvider } from './local-storage';
import { S3StorageProvider } from './s3-storage';

// Re-exportar tipos
export * from './types';

// Singleton del storage provider
let storageInstance: StorageProvider | null = null;

/**
 * Obtiene la configuración del storage desde variables de entorno
 */
function getStorageConfig(): StorageConfig {
  const type = (process.env.STORAGE_TYPE || 'local') as 'local' | 's3';

  return {
    type,
    local: {
      uploadDir: process.env.UPLOAD_DIR || './uploads',
      publicUrl: process.env.NEXT_PUBLIC_UPLOAD_URL || '/api/uploads',
    },
    s3: {
      endpoint: process.env.S3_ENDPOINT || '',
      region: process.env.S3_REGION || 'auto',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      bucket: process.env.S3_BUCKET_NAME || '',
      publicUrl: process.env.S3_PUBLIC_URL || '',
    },
  };
}

/**
 * Obtiene la instancia del storage provider
 */
export function getStorage(): StorageProvider {
  if (storageInstance) {
    return storageInstance;
  }

  const config = getStorageConfig();

  if (config.type === 's3') {
    if (!config.s3?.endpoint || !config.s3?.accessKeyId || !config.s3?.secretAccessKey) {
      throw new Error('Configuración de S3 incompleta. Revisa las variables de entorno.');
    }
    
    storageInstance = new S3StorageProvider({
      endpoint: config.s3.endpoint,
      region: config.s3.region,
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
      bucket: config.s3.bucket,
      publicUrl: config.s3.publicUrl,
    });
  } else {
    storageInstance = new LocalStorageProvider(
      config.local!.uploadDir,
      config.local!.publicUrl
    );
  }

  return storageInstance;
}

/**
 * Obtiene el provider de S3 específicamente (para presigned URLs)
 */
export function getS3Storage(): S3StorageProvider {
  const config = getStorageConfig();
  
  if (config.type !== 's3') {
    throw new Error('S3 storage no está configurado');
  }

  return new S3StorageProvider({
    endpoint: config.s3!.endpoint,
    region: config.s3!.region,
    accessKeyId: config.s3!.accessKeyId,
    secretAccessKey: config.s3!.secretAccessKey,
    bucket: config.s3!.bucket,
    publicUrl: config.s3!.publicUrl,
  });
}

/**
 * Verifica si el storage configurado es S3
 */
export function isS3Storage(): boolean {
  return process.env.STORAGE_TYPE === 's3';
}
```

---

## 7.7 Server Actions para Upload

Crea el archivo `actions/upload/index.ts`:

```typescript
'use server';

import { getStorage, getS3Storage, isS3Storage } from '@/lib/storage';
import type { UploadResult, PresignedUrlInfo } from '@/lib/storage';
import type { ActionResponse } from '@/types';
import { VALIDACION } from '@/lib/validations';

/**
 * Sube un archivo al storage (para storage local o cuando el archivo pasa por el servidor)
 */
export async function subirArchivo(
  formData: FormData
): Promise<ActionResponse<UploadResult>> {
  try {
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'documentos';

    if (!file) {
      return { success: false, error: 'No se proporcionó ningún archivo' };
    }

    // Validar tipo
    if (!VALIDACION.ARCHIVO.TIPOS_PERMITIDOS.includes(file.type)) {
      return { 
        success: false, 
        error: `Tipo de archivo no permitido. Use: ${VALIDACION.ARCHIVO.EXTENSIONES.join(', ')}` 
      };
    }

    // Validar tamaño
    if (file.size > VALIDACION.ARCHIVO.MAX_SIZE) {
      return { 
        success: false, 
        error: `El archivo excede el tamaño máximo de ${VALIDACION.ARCHIVO.MAX_SIZE / 1024 / 1024}MB` 
      };
    }

    // Convertir File a Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Subir usando el provider configurado
    const storage = getStorage();
    const result = await storage.upload(buffer, file.name, {
      folder,
      allowedTypes: VALIDACION.ARCHIVO.TIPOS_PERMITIDOS,
      maxSize: VALIDACION.ARCHIVO.MAX_SIZE,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Error subiendo archivo:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al subir el archivo' 
    };
  }
}

/**
 * Obtiene una presigned URL para upload directo a S3
 * (Solo funciona cuando STORAGE_TYPE=s3)
 */
export async function obtenerPresignedUrl(
  filename: string,
  folder: string = 'documentos'
): Promise<ActionResponse<PresignedUrlInfo>> {
  try {
    if (!isS3Storage()) {
      return { 
        success: false, 
        error: 'Presigned URLs solo están disponibles con storage S3' 
      };
    }

    // Validar extensión del archivo
    const ext = filename.split('.').pop()?.toLowerCase();
    const extensionesPermitidas = VALIDACION.ARCHIVO.EXTENSIONES.map(e => e.replace('.', ''));
    
    if (!ext || !extensionesPermitidas.includes(ext)) {
      return { 
        success: false, 
        error: `Extensión no permitida. Use: ${VALIDACION.ARCHIVO.EXTENSIONES.join(', ')}` 
      };
    }

    const s3Storage = getS3Storage();
    const presignedInfo = await s3Storage.getPresignedUploadUrl(filename, folder);

    return { success: true, data: presignedInfo };
  } catch (error) {
    console.error('Error obteniendo presigned URL:', error);
    return { 
      success: false, 
      error: 'Error al generar URL de subida' 
    };
  }
}

/**
 * Elimina un archivo del storage
 */
export async function eliminarArchivo(
  path: string
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    if (!path) {
      return { success: false, error: 'Ruta de archivo no proporcionada' };
    }

    const storage = getStorage();
    const deleted = await storage.delete(path);

    if (!deleted) {
      return { success: false, error: 'No se pudo eliminar el archivo' };
    }

    return { success: true, data: { deleted: true } };
  } catch (error) {
    console.error('Error eliminando archivo:', error);
    return { 
      success: false, 
      error: 'Error al eliminar el archivo' 
    };
  }
}

/**
 * Confirma que un archivo fue subido correctamente (para presigned URLs)
 */
export async function confirmarUpload(
  key: string
): Promise<ActionResponse<{ confirmed: boolean; url: string }>> {
  try {
    const storage = getStorage();
    const exists = await storage.exists(key);

    if (!exists) {
      return { success: false, error: 'El archivo no fue encontrado' };
    }

    return { 
      success: true, 
      data: { 
        confirmed: true, 
        url: storage.getUrl(key) 
      } 
    };
  } catch (error) {
    console.error('Error confirmando upload:', error);
    return { success: false, error: 'Error al confirmar el upload' };
  }
}
```

---

## 7.8 API Route para Servir Archivos Locales

Crea el archivo `app/api/uploads/[...path]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Solo sirve archivos en modo local
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Solo funciona si el storage es local
  if (process.env.STORAGE_TYPE === 's3') {
    return NextResponse.json(
      { error: 'Esta ruta solo está disponible en modo local' },
      { status: 404 }
    );
  }

  try {
    const { path: pathSegments } = await params;
    const filePath = pathSegments.join('/');
    const fullPath = path.join(UPLOAD_DIR, filePath);

    // Prevenir path traversal
    const resolvedPath = path.resolve(fullPath);
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);
    
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    // Leer archivo
    const file = await fs.readFile(fullPath);
    
    // Determinar content-type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Retornar archivo
    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error sirviendo archivo:', error);
    return NextResponse.json(
      { error: 'Archivo no encontrado' },
      { status: 404 }
    );
  }
}
```

---

## 7.9 Hook de Upload Actualizado

Actualiza el hook para usar los Server Actions reales. Modifica `hooks/use-documento-form.ts`:

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
import { subirArchivo, obtenerPresignedUrl, confirmarUpload } from '@/actions/upload';
import type { Documento } from '@/db/schema';
import type { UploadResult } from '@/lib/storage';

interface UseDocumentoFormOptions {
  documento?: Documento;
  onSuccess?: (documento: Documento) => void;
  redirectTo?: string;
}

export function useDocumentoForm(options: UseDocumentoFormOptions = {}) {
  const { documento, onSuccess, redirectTo = '/documentos' } = options;
  
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const isEditing = !!documento;

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
        archivo: null,
        observaciones: documento.observaciones || '',
        password: '',
      }
    : documentoFormDefaults;

  const form = useForm<DocumentoFormValues>({
    resolver: zodResolver(documentoFormSchema),
    defaultValues,
    mode: 'onBlur',
  });

  // Upload de archivo con soporte para local y S3
  const uploadArchivo = async (file: File): Promise<UploadResult | null> => {
    try {
      setUploadProgress(0);

      // Verificar si estamos usando S3 (presigned URL) o local
      const usePresignedUrl = process.env.NEXT_PUBLIC_STORAGE_TYPE === 's3';

      if (usePresignedUrl) {
        // Flujo S3: Obtener presigned URL y subir directamente
        const presignedResult = await obtenerPresignedUrl(file.name, 'documentos');
        
        if (!presignedResult.success) {
          throw new Error(presignedResult.error);
        }

        setUploadProgress(10);

        // Subir directamente a S3
        const { uploadUrl, key, publicUrl } = presignedResult.data;
        
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('Error al subir archivo a S3');
        }

        setUploadProgress(80);

        // Confirmar upload
        const confirmResult = await confirmarUpload(key);
        
        if (!confirmResult.success) {
          throw new Error(confirmResult.error);
        }

        setUploadProgress(100);

        return {
          path: key,
          url: publicUrl,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
        };
      } else {
        // Flujo local: Subir a través del servidor
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'documentos');

        setUploadProgress(30);

        const result = await subirArchivo(formData);

        setUploadProgress(100);

        if (!result.success) {
          throw new Error(result.error);
        }

        return result.data;
      }
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      toast.error('Error al subir archivo', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
      return null;
    } finally {
      // Limpiar progreso después de un momento
      setTimeout(() => setUploadProgress(null), 500);
    }
  };

  const onSubmit = async (data: DocumentoFormValues) => {
    startTransition(async () => {
      try {
        // 1. Subir archivo si existe
        let archivoData: UploadResult | null = null;
        if (data.archivo) {
          archivoData = await uploadArchivo(data.archivo);
          if (!archivoData) {
            return; // Error ya mostrado en uploadArchivo
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
          ...(archivoData && {
            archivoAdjunto: archivoData.path,
            archivoNombre: archivoData.filename,
            archivoTipo: archivoData.mimeType,
            archivoTamanio: archivoData.size,
          }),
        };

        // 3. Crear o actualizar
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

          onSuccess?.(resultado.data.documento);
          router.push(redirectTo);
          router.refresh();
        } else {
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

  const handleServerErrors = (resultado: { 
    success: false; 
    error: string; 
    fieldErrors?: Record<string, string[]> 
  }) => {
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

## 7.10 Variable de Entorno Pública

Agrega a `.env.local`:

```env
# Exponer el tipo de storage al cliente (para decidir flujo de upload)
NEXT_PUBLIC_STORAGE_TYPE="local"
```

---

## 7.11 Actualizar Exportaciones de Actions

Actualiza `actions/index.ts`:

```typescript
// Re-exportar todas las acciones de documentos
export * from './documentos';

// Re-exportar acciones de upload
export * from './upload';

// Re-exportar utilidades
export { ejecutarAccion, manejarError } from './utils';
```

---

## 7.12 Configurar Directorio de Uploads Local

Crea el directorio y un `.gitkeep`:

```bash
mkdir -p uploads/documentos
touch uploads/.gitkeep
```

Agrega a `.gitignore`:

```gitignore
# Uploads locales (excepto .gitkeep)
/uploads/*
!/uploads/.gitkeep
```

---

## Resumen del Módulo

En este módulo hemos implementado:

| Archivo | Descripción |
|---------|-------------|
| `lib/storage/types.ts` | Interfaces y tipos del sistema de storage |
| `lib/storage/local-storage.ts` | Provider para almacenamiento local |
| `lib/storage/s3-storage.ts` | Provider para S3/Cloudflare R2 |
| `lib/storage/index.ts` | Factory y utilidades |
| `actions/upload/index.ts` | Server Actions para upload |
| `app/api/uploads/[...path]/route.ts` | API Route para servir archivos locales |

### Flujos implementados:

**Storage Local:**
```
Cliente → FormData → Server Action → fs.writeFile → /uploads/
```

**Storage S3:**
```
Cliente → Presigned URL → Upload directo a S3 → Confirmar
```

### Características:

- ✅ Abstracción que permite cambiar storage sin modificar código
- ✅ Validación de tipo MIME y tamaño
- ✅ Nombres de archivo únicos con timestamp
- ✅ Presigned URLs para upload eficiente a S3
- ✅ Prevención de path traversal en storage local
- ✅ Progreso de upload en el cliente

### Estructura de archivos:

```
lib/
└── storage/
    ├── types.ts
    ├── local-storage.ts
    ├── s3-storage.ts
    └── index.ts

actions/
└── upload/
    └── index.ts

app/
└── api/
    └── uploads/
        └── [...path]/
            └── route.ts

uploads/
└── documentos/
    └── (archivos subidos)
```

---

## Próximo Módulo

En el **Módulo 8: Listado y Operaciones CRUD Completas** crearemos:

- Página de listado con DataTable
- Filtros y búsqueda
- Paginación server-side
- Acciones en lote
- Exportación de datos

---

¿Continúo con el Módulo 8?
