import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv"

dotenv.config({
  path: ".env.local" // Carga las variables de entorno desde .env.local
});

export default defineConfig({
  // Ubicación de los archivos de schema
  schema: "./db/schema/",

  // Carpeta donde se guardarán las migraciones
  out: "./db/migrations",

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
