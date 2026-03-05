CREATE TYPE "public"."estado_documento" AS ENUM('borrador', 'revision', 'aprobado', 'archivado', 'anulado');--> statement-breakpoint
CREATE TYPE "public"."pioridad_document" AS ENUM('baja', 'media', 'alta', 'urgente');--> statement-breakpoint
CREATE TYPE "public"."tipo_documento" AS ENUM('resolucion', 'circular', 'memorando', 'acta', 'informe', 'otro');--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"descripcion" text,
	"tipo" "tipo_documento" NOT NULL,
	"estado" "estado_documento" DEFAULT 'borrador' NOT NULL,
	"fecha_expedicion" date NOT NULL,
	"fecha_vencimiento" date,
	"numero_folios" integer DEFAULT 1 NOT NULL,
	"es_confidencial" boolean DEFAULT false NOT NULL,
	"prioridad" "pioridad_document" DEFAULT 'media' NOT NULL,
	"etiquetas" text[],
	"archivo_adjunto" varchar(500),
	"archivo_nombre" varchar(255),
	"archivo_tipo" varchar(100),
	"archivo_tamanio" integer,
	"observaciones" text,
	"password_hash" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documentos_codigo_unique" UNIQUE("codigo")
);
