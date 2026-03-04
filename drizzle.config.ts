import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // Ubicación de los archivos de schema
  schema: ".db/schema",

  // Carpeta donde se guardarán las migraciones
  out: ".db/migrations",

  // Dialecto de base de datos
  dialect: "postgresql",

  // Conexión a la base de datos
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },

  // Opciones adicionales
  verbose: true,
  strict: true,
});
