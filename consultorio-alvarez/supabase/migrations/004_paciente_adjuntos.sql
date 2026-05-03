-- Migración para Adjuntos de Pacientes (Estudios Médicos, Radiografías, etc.)

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.paciente_adjuntos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT get_user_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    nombre_archivo TEXT NOT NULL,
    url_archivo TEXT NOT NULL,
    tipo_archivo TEXT, -- mime type (application/pdf, image/jpeg, etc.)
    size_bytes BIGINT,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Enable RLS
ALTER TABLE public.paciente_adjuntos ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for the table (Tenant isolation)
CREATE POLICY "tenant_isolation_paciente_adjuntos" ON public.paciente_adjuntos FOR ALL USING (tenant_id = get_user_tenant_id());

-- 4. Create Storage Bucket 'paciente_adjuntos' if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('paciente_adjuntos', 'paciente_adjuntos', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Set up Storage Policies
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'paciente_adjuntos');

CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'paciente_adjuntos');

CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'paciente_adjuntos');
