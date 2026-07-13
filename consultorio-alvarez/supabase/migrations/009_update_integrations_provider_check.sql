-- Migration: Update provider check constraint in tenant_integrations
-- Permite los nuevos proveedores 'billing_settings' y 'billing_payments' para el módulo de facturación

ALTER TABLE public.tenant_integrations 
DROP CONSTRAINT IF EXISTS tenant_integrations_provider_check;

ALTER TABLE public.tenant_integrations 
ADD CONSTRAINT tenant_integrations_provider_check 
CHECK (provider IN ('whatsapp', 'mercadopago', 'arca', 'billing_settings', 'billing_payments'));
