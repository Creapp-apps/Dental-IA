-- Migration: Create tenant_integrations for 3rd party apps

CREATE TABLE IF NOT EXISTS public.tenant_integrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('whatsapp', 'mercadopago', 'arca')),
  is_active boolean DEFAULT false,
  credentials jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Ensure a tenant only has one active token configuration per provider at most
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_provider_per_tenant 
ON public.tenant_integrations (tenant_id, provider);

-- RLS Policies
ALTER TABLE public.tenant_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver integraciones de su tenant"
ON public.tenant_integrations FOR SELECT
USING (tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "Los usuarios pueden insertar integraciones en su tenant"
ON public.tenant_integrations FOR INSERT
WITH CHECK (tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "Los usuarios pueden actualizar integraciones de su tenant"
ON public.tenant_integrations FOR UPDATE
USING (tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid() LIMIT 1))
WITH CHECK (tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "Los usuarios pueden borrar integraciones de su tenant"
ON public.tenant_integrations FOR DELETE
USING (tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid() LIMIT 1));
