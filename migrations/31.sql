
ALTER TABLE users ADD COLUMN mocha_user_id TEXT;
CREATE UNIQUE INDEX idx_users_mocha_user_id ON users(mocha_user_id) WHERE mocha_user_id IS NOT NULL;
