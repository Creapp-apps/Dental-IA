-- Migración local/remota: agregar columnas de subtítulos personalizables a landing_config

ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS servicios_subtitulo TEXT NOT NULL DEFAULT 'Cada tratamiento combina precisión clínica con la más alta estética dental.';
ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS equipo_subtitulo TEXT NOT NULL DEFAULT 'Un equipo multidisciplinario con más de 15 años de experiencia.';
ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS coberturas_subtitulo TEXT NOT NULL DEFAULT 'Trabajamos con las principales coberturas del país para brindarte la mejor atención médica sin preocupaciones.';
