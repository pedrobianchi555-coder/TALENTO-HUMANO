
ALTER TABLE users ADD COLUMN whatsapp_phone TEXT;
ALTER TABLE users ADD COLUMN whatsapp_opt_in BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN whatsapp_opt_in_date DATETIME;
