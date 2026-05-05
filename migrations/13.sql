-- Actualizar la tabla users para asegurar que hr_permissions tenga un valor por defecto
UPDATE users SET hr_permissions = '[]' WHERE role = 'HR' AND (hr_permissions IS NULL OR hr_permissions = '');

-- Insertar datos de ejemplo para permisos de administrador
-- Esto asignará permisos de administrador al primer usuario HR encontrado
UPDATE users 
SET hr_permissions = '["hr:admin"]' 
WHERE role = 'HR' 
  AND id = (SELECT MIN(id) FROM users WHERE role = 'HR')
  AND (hr_permissions IS NULL OR hr_permissions = '' OR hr_permissions = '[]');