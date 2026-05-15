
ALTER TABLE users ADD COLUMN sede TEXT CHECK (sede IN ('El Pilar', 'Caracas', 'Sur del Lago', 'Miranda', 'Apure'));
