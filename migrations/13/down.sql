-- Revertir los cambios de permisos
UPDATE users SET hr_permissions = NULL WHERE role = 'HR';