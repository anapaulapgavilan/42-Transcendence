import fp from "fastify-plugin";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function dbConnector(fastify, options) {
    // path for database
    const dbPath = path.join(__dirname, "../../db/transcendence.db");
    
    // CORRECCIÓN: Quitamos 'fileMustExist: true' para que se cree si no existe
    // y aseguramos que 'readonly' sea false.
    const db = new Database(dbPath, { verbose: console.log, readonly: false });

    // add database to server
    fastify.decorate("db", db);

    // closing the databae
    fastify.addHook("onClose", (fastify, done) => {
        db.close();
        done();
    });

    console.log("Database and 'posts' table initialized");
}

export default fp(dbConnector);