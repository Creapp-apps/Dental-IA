-- ============================================================
-- MIGRATION: 003_pacientes_fotourl
-- Adds foto_url to pacientes and setups 'avatars' storage bucket
-- ============================================================

-- 1. Agregar columna a la tabla pacientes
ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 2. Asegurar que el bucket de avatares exista en Storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Storage
-- Permite que cualquier persona (público) vea los avatares
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access for avatars') THEN
        CREATE POLICY "Public Access for avatars" ON storage.objects
            FOR SELECT USING (bucket_id = 'avatars');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload avatars') THEN
        CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
            FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their avatars') THEN
        CREATE POLICY "Users can update their avatars" ON storage.objects
            FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their avatars') THEN
        CREATE POLICY "Users can delete their avatars" ON storage.objects
            FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
    END IF;
END $$;
