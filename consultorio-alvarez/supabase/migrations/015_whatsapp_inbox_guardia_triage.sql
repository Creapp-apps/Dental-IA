-- ============================================================
-- MIGRACIÓN 015: PANEL DE MENSAJES WHATSAPP (MULTIATENCIÓN)
-- + SISTEMA DE GUARDIA 24HS Y TRIAGE ODONTOLÓGICO INTELIGENTE
-- ============================================================

-- 1. TABLA DE CONVERSACIONES WHATSAPP
CREATE TABLE IF NOT EXISTS public.whatsapp_conversaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
    telefono TEXT NOT NULL, -- Formato internacional normalizado (ej: 5491130174859)
    nombre_contacto TEXT,
    estado TEXT NOT NULL DEFAULT 'BOT' CHECK (estado IN ('BOT', 'HUMANO_PENDIENTE', 'HUMANO_ATENDIENDO', 'CERRADO')),
    asignado_a UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    ultimo_mensaje_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ultimo_mensaje_texto TEXT,
    no_leidos_operador INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_whatsapp_conversaciones_tenant_telefono UNIQUE (tenant_id, telefono)
);

-- Índices de alto rendimiento para búsquedas y ordenamiento
CREATE INDEX IF NOT EXISTS idx_wa_conv_tenant_estado ON public.whatsapp_conversaciones(tenant_id, estado);
CREATE INDEX IF NOT EXISTS idx_wa_conv_tenant_ultimo_msg ON public.whatsapp_conversaciones(tenant_id, ultimo_mensaje_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_conv_tenant_telefono ON public.whatsapp_conversaciones(tenant_id, telefono);

-- 2. TABLA DE MENSAJES WHATSAPP
CREATE TABLE IF NOT EXISTS public.whatsapp_mensajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    conversacion_id UUID NOT NULL REFERENCES public.whatsapp_conversaciones(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'interactivo', 'imagen', 'audio', 'documento', 'ubicacion', 'plantilla')),
    remitente TEXT NOT NULL CHECK (remitente IN ('paciente', 'bot', 'agente')),
    agente_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    agente_nombre TEXT, -- Ej: 'Yesica Perazzo' o 'Dr. Álvarez'
    contenido TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    wa_message_id TEXT, -- ID provisto por Meta Graph API
    estado_envio TEXT DEFAULT 'enviado' CHECK (estado_envio IN ('enviado', 'entregado', 'leido', 'fallido')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para renderizar el chat rápidamente en orden cronológico
CREATE INDEX IF NOT EXISTS idx_wa_msg_conversacion_created ON public.whatsapp_mensajes(conversacion_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_wa_msg_tenant_created ON public.whatsapp_mensajes(tenant_id, created_at DESC);

-- 3. TABLA DE CONFIGURACIÓN DE TRIAGE DE GUARDIA 24HS
CREATE TABLE IF NOT EXISTS public.triage_guardia_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    categoria TEXT NOT NULL, -- 'DOLOR_PULSATIL', 'FRACTURA_DIENTE', 'SANGRADO', 'ORTODONCIA', 'OTRO'
    titulo_boton TEXT NOT NULL,
    tips_alivio TEXT NOT NULL,
    advertencias TEXT NOT NULL,
    prioridad_agenda INT DEFAULT 1,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_triage_guardia_tenant_cat UNIQUE (tenant_id, categoria)
);

CREATE INDEX IF NOT EXISTS idx_triage_tenant_activo ON public.triage_guardia_config(tenant_id, activo);

-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.whatsapp_conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_guardia_config ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS DE AISLAMIENTO MULTI-TENANT ESTRICTO
DROP POLICY IF EXISTS "tenant_isolation_whatsapp_conversaciones" ON public.whatsapp_conversaciones;
CREATE POLICY "tenant_isolation_whatsapp_conversaciones" ON public.whatsapp_conversaciones
    FOR ALL
    TO authenticated
    USING (tenant_id = get_user_tenant_id())
    WITH CHECK (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "tenant_isolation_whatsapp_mensajes" ON public.whatsapp_mensajes;
CREATE POLICY "tenant_isolation_whatsapp_mensajes" ON public.whatsapp_mensajes
    FOR ALL
    TO authenticated
    USING (tenant_id = get_user_tenant_id())
    WITH CHECK (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "tenant_isolation_triage_guardia_config" ON public.triage_guardia_config;
CREATE POLICY "tenant_isolation_triage_guardia_config" ON public.triage_guardia_config
    FOR ALL
    TO authenticated
    USING (tenant_id = get_user_tenant_id())
    WITH CHECK (tenant_id = get_user_tenant_id());

-- 6. HABILITAR SUPABASE REALTIME PARA MENSAJES Y CONVERSACIONES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_conversaciones'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversaciones;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_mensajes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_mensajes;
    END IF;
END $$;

-- 7. SEED INICIAL DE TRIAGE CLÍNICO PARA TODOS LOS TENANTS EXISTENTES
INSERT INTO public.triage_guardia_config (tenant_id, categoria, titulo_boton, tips_alivio, advertencias, prioridad_agenda)
SELECT 
    t.id,
    c.categoria,
    c.titulo_boton,
    c.tips_alivio,
    c.advertencias,
    c.prioridad_agenda
FROM public.tenants t
CROSS JOIN (
    VALUES
    (
        'DOLOR_PULSATIL',
        '⚡ Dolor agudo / Muela latiente',
        '• Elevá la cabeza al acostarte (doble almohada) para reducir la presión en la zona.' || E'\n' ||
        '• Frío local: Aplicá una compresa fría envuelta en un paño sobre la mejilla (10 min sí, 10 min descanso).' || E'\n' ||
        '• Enjuagues tibios suaves con agua y una pizca de sal.',
        '⚠️ NUNCA apliques calor en la cara (acelera la infección e hinchazón).' || E'\n' ||
        '⚠️ NUNCA apoyes aspirina ni calmantes directos sobre la encía (produce quemaduras químicas).',
        1
    ),
    (
        'FRACTURA_DIENTE',
        '🦷 Diente roto o caído (Trauma)',
        '• Si el diente se salió entero: Tomalo por la corona (NUNCA la raíz) y sumergilo en un vaso con leche fría o solución fisiológica.' || E'\n' ||
        '• Si se fracturó un fragmento: Guardá el trozo en leche fría.' || E'\n' ||
        '• Si hay sangrado: Morder suavemente una gasa limpia durante 15 minutos.',
        '⚠️ NO raspes ni cepilles la raíz del diente.' || E'\n' ||
        '⚠️ NO dejes secar el diente al aire; cada minuto cuenta para reimplantarlo.',
        2
    ),
    (
        'SANGRADO',
        '🩸 Sangrado o herida en encía',
        '• Presión sostenida: Colocá una gasa doblada limpia y mordé firmemente sin soltar durante 20 minutos continuos.' || E'\n' ||
        '• Mantené posición erguida (sentado o semi-incorporado).' || E'\n' ||
        '• Podés morder un saquito de té negro húmedo (el ácido tánico ayuda a coagular).',
        '⚠️ NO te enjuagues con fuerza ni escupas continuamente (destruye el coágulo).' || E'\n' ||
        '⚠️ NO tomes bebidas muy calientes ni uses sorbetes.',
        1
    ),
    (
        'ORTODONCIA',
        '🩹 Molestia por Bracket / Alambre',
        '• Cera de ortodoncia: Secá la zona con hisopo y colocá una bolita de cera sobre el elemento que lastima.' || E'\n' ||
        '• Alambre pinchando: Empujalo suavemente contra el diente usando la goma de borrar de un lápiz o un hisopo.',
        '⚠️ NO cortes el alambre con alicates comunes o tijeras caseras.' || E'\n' ||
        '⚠️ NO fuerces brackets sueltos si siguen adheridos al arco.',
        3
    )
) AS c(categoria, titulo_boton, tips_alivio, advertencias, prioridad_agenda)
ON CONFLICT (tenant_id, categoria) DO NOTHING;
