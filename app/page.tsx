import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  return (
    <div className="container mx-auto py-10">
      {/* Contenedor de tarjeta */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          {/* Titulo de la tarjeta */}
          <CardTitle className="text-2xl font-bold">Gestión de documentos</CardTitle>
          {/* Descripcion de la tarjeta */}
          <CardDescription>
            Tutorial de Drizzle ORM + PostgreSQL + Next.js 16 + React hook forms
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <p>
            En este tutorial se aprende a crear una aplicación para la gestión de documentos utilizando Drizzle ORM, PostgreSQL, Next.js 16 y React hook forms.
            <br />Este proyecto demuestra cómo construir formularios robustos con validación
            completa usando Server Actions.
          </p>

          <div className="flex gap-4">
            {/* Boton para ver documentos */}
            <Button asChild>
              <Link href="/documentos">Ver documentos</Link>
            </Button>
            {/* Boton para crear documento */}
            <Button variant="outline" asChild>
              <Link href="/documentos/nuevo">Crear documento</Link>
            </Button>
          </div>
        </CardContent>

      </Card>

    </div>
  );
}
