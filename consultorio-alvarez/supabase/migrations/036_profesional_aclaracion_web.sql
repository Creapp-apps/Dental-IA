-- Aclaración opcional para mostrar en la reserva web junto al profesional, para
-- desambiguar cuando el paciente lo conoce por otro nombre (ej. "También
-- conocido como Pedro"). Evita que reserven con el profesional equivocado.
ALTER TABLE public.profesionales ADD COLUMN IF NOT EXISTS aclaracion_web TEXT;
