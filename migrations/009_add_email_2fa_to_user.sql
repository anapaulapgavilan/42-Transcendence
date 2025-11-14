-- Adds a column to store which 2FA method the user has enabled ('app' or 'email')
ALTER TABLE user ADD COLUMN two_fa_method TEXT;

-- Adds columns for the email-based 2FA code and its expiration
ALTER TABLE user ADD COLUMN two_fa_email_code TEXT;
ALTER TABLE user ADD COLUMN two_fa_email_code_expires_at TIMESTAMP;