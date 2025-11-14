import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const dbPath = path.resolve("db", "transcendence.db");
const db = new Database(dbPath, { verbose: console.log });

function ensureMigrationsTable() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

async function runMigrations() {
    ensureMigrationsTable();

    const getAppliedMigrations = db.prepare("SELECT name FROM migrations");
    const appliedMigrations = new Set(getAppliedMigrations.all().map(row => row.name));

    const migrationsDir = path.resolve("migrations");
    const allMigrations = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith(".sql"))
        .sort();

    const insertMigration = db.prepare("INSERT INTO migrations (name) VALUES (?)");

    for (const file of allMigrations) {
        if (!appliedMigrations.has(file)) {
            console.log(`Applying migration: ${file}`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
            db.exec(sql);
            insertMigration.run(file);
        }
    }

    console.log("All migrations are up to date.");
    db.close();
}

runMigrations().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
