-- Create asset_categories table
CREATE TABLE asset_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO asset_categories (id, name, description, created_at, updated_at) VALUES 
(1, 'Equipos de Cómputo', 'Laptops, computadoras de escritorio, tablets y equipos relacionados', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'Periféricos', 'Monitores, teclados, ratones, impresoras y accesorios', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'Telecomunicaciones', 'Teléfonos, equipos de red, routers y comunicaciones', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'Mobiliario', 'Escritorios, sillas, estantes y mobiliario de oficina', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'Vehículos', 'Automóviles, motocicletas y vehículos de la empresa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'Herramientas', 'Herramientas de trabajo, equipos especializados', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, 'Electrodomésticos', 'Refrigeradoras, microondas, aires acondicionados', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(8, 'Otros', 'Equipos diversos que no entran en otras categorías', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);