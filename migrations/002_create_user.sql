-- This file creates a table called user
CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    alias TEXT NOT NULL,
    mail TEXT UNIQUE,
    password_hash TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'es',
    id_tournament INTEGER,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    temporal_user BOOLEAN NOT NULL DEFAULT FALSE,
    avatar_url TEXT NOT NULL DEFAULT '/public/uploads/default_avatar.png',
    AI_user BOOLEAN NOT NULL DEFAULT FALSE,
    auth_provider TEXT NOT NULL DEFAULT 'local', -- 'local', 'google', etc.
    FOREIGN KEY (id_tournament) REFERENCES tournament(id)
);

