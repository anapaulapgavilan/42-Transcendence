CREATE TABLE IF NOT EXISTS tournament_match (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_tournament INTEGER NOT NULL,
    round INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    player1_id INTEGER,
    player2_id INTEGER,
    winner_id INTEGER,
    score_player1 INTEGER,
    score_player2 INTEGER,
    FOREIGN KEY (id_tournament) REFERENCES tournament(id),
    FOREIGN KEY (player1_id) REFERENCES user(id),
    FOREIGN KEY (player2_id) REFERENCES user(id),
    FOREIGN KEY (winner_id) REFERENCES user(id)
);