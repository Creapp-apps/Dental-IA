-- 1. Crear el bucket "avatars" si no existe
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 
  'avatars', 
  true, 
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- (RLS ya está habilitado por defecto en la tabla storage.objects)

-- 3. Eliminar políticas previas si existieran para evitar errores de duplicidad
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Authenticated users can upload avatars" on storage.objects;
drop policy if exists "Authenticated users can update avatars" on storage.objects;
drop policy if exists "Authenticated users can delete avatars" on storage.objects;

-- 4. Crear política para lectura (Pública)
create policy "Avatar images are publicly accessible"
on storage.objects for select
using ( bucket_id = 'avatars' );

-- 5. Crear política para subida (Usuarios Autenticados)
create policy "Authenticated users can upload avatars"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'avatars' );

-- 6. Crear política para actualización (Usuarios Autenticados)
create policy "Authenticated users can update avatars"
on storage.objects for update
to authenticated
using ( bucket_id = 'avatars' );

-- 7. Crear política para eliminación (Usuarios Autenticados)
create policy "Authenticated users can delete avatars"
on storage.objects for delete
to authenticated
using ( bucket_id = 'avatars' );
