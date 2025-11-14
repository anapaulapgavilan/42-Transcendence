-- This file creates a table called tournament
CREATE TABLE IF NOT EXISTS tournament (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished BOOLEAN DEFAULT FALSE
);

