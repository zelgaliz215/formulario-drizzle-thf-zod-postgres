import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Verificar que existe la url de conexion
if (!process.env.DATABASE_URL) {
    throw new Error("La url de la base de datos no esta definida")
}

//Crea el string de conexion a la base de datos
const connectionString = process.env.DATABASE_URL;

// Para queries (conexion persistente) creamos el cliente
const client = postgres(connectionString, {
    max: 1, //Una conexion para desarrollo es suficiente, ajustar para produccion
    onnotice: () => {
    }
});

// exportar la instacia de drizzle con el schema
export const db = drizzle(client, {
    schema,
    logger: process.env.NODE_ENV === "development", // Muestra las queries en consola en desarrollo
});

// Re-exportar todo el schema para conveniencia
export * from './schema';

// Exportar los tipos de la base de datos
export type Database = typeof db;