-- Migration 017: Permitir rol 'superadmin' en public.usuarios y actualizar permisos
-- Permite que los administradores globales de Dental-IA tengan rol 'superadmin' a nivel de BD

ALTER TABLE public.usuarios 
DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE public.usuarios 
ADD CONSTRAINT usuarios_rol_check 
CHECK (rol IN ('superadmin', 'admin', 'profesional', 'secretaria'));

-- Promover usuarios clave de administración SaaS
UPDATE public.usuarios 
SET rol = 'superadmin' 
WHERE email IN ('creapp.ar@gmail.com', 'mazasebastian@hotmail.com');
