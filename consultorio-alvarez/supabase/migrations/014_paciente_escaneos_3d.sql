-- Migración: Módulo de Escaneos 3D y Casos Medit Link
-- Permite almacenar modelos 3D intraorales (STL, OBJ, PLY) asociados al paciente con metadatos clínicos y trazabilidad de laboratorio

CREATE TABLE IF NOT EXISTS public.paciente_escaneos_3d (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT get_user_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    medit_case_uuid TEXT, -- UUID del caso en Medit Link (si proviene de sync)
    nombre_caso TEXT NOT NULL,
    fecha_escaneo TIMESTAMPTZ NOT NULL DEFAULT now(),
    estado_caso TEXT NOT NULL DEFAULT 'SCAN', -- FORM, SCAN, CAD, CAM, MILL, COMPLETED
    origen TEXT NOT NULL DEFAULT 'manual', -- 'medit_link' | 'manual'
    
    -- Archivos 3D: array de objetos con { id, nombre, url, tipo: 'maxilar_superior' | 'maxilar_inferior' | 'oclusion', formato: 'stl' | 'obj', size_bytes }
    archivos JSONB NOT NULL DEFAULT '[]'::jsonb, 
    
    -- Metadatos clínicos (piezas dentales FDI, categoría, material, color/shade)
    piezas_dentales JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Estado de la orden de laboratorio asociada (trazabilidad de prótesis)
    orden_laboratorio JSONB,
    
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Habilitar RLS
ALTER TABLE public.paciente_escaneos_3d ENABLE ROW LEVEL SECURITY;

-- Política de aislamiento por Tenant
DROP POLICY IF EXISTS "tenant_isolation_paciente_escaneos_3d" ON public.paciente_escaneos_3d;
CREATE POLICY "tenant_isolation_paciente_escaneos_3d" 
ON public.paciente_escaneos_3d FOR ALL 
USING (tenant_id = get_user_tenant_id());

-- Storage Bucket para archivos 3D
INSERT INTO storage.buckets (id, name, public) 
VALUES ('escaneos_3d', 'escaneos_3d', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para escaneos_3d
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Allow public read access escaneos_3d'
    ) THEN
        CREATE POLICY "Allow public read access escaneos_3d" ON storage.objects
        FOR SELECT TO public USING (bucket_id = 'escaneos_3d');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Allow authenticated uploads escaneos_3d'
    ) THEN
        CREATE POLICY "Allow authenticated uploads escaneos_3d" ON storage.objects
        FOR INSERT TO authenticated WITH CHECK (bucket_id = 'escaneos_3d');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Allow authenticated deletes escaneos_3d'
    ) THEN
        CREATE POLICY "Allow authenticated deletes escaneos_3d" ON storage.objects
        FOR DELETE TO authenticated USING (bucket_id = 'escaneos_3d');
    END IF;
END $$;
