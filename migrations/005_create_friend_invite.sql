CREATE TABLE IF NOT EXISTS friend_invite (
  id_user1 INTEGER NOT NULL,
  id_user2 INTEGER NOT NULL,
  state VARCHAR NOT NULL DEFAULT 'pending',
  FOREIGN KEY (id_user1) REFERENCES user(id),
  FOREIGN KEY (id_user2) REFERENCES user(id)
);
