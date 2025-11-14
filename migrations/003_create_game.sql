-- This file creates a table called game
CREATE TABLE IF NOT EXISTS game (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_tournament INTEGER,
    tournament_place INTEGER,
    id_user1 INTEGER NOT NULL,
    id_user2 INTEGER NOT NULL,
    points_user1 INTEGER NOT NULL,
    points_user2 INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    winner INTEGER,
    finished BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (id_tournament) REFERENCES tournament(id),
    FOREIGN KEY (id_user1) REFERENCES user(id),
    FOREIGN KEY (id_user2) REFERENCES user(id)
);

