CREATE TABLE IF NOT EXISTS friends (
  id_user1 INTEGER NOT NULL,
  id_user2 INTEGER NOT NULL,
  FOREIGN KEY (id_user1) REFERENCES user(id),
  FOREIGN KEY (id_user2) REFERENCES user(id),
  PRIMARY KEY (id_user1, id_user2)
);
