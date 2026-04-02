-- ============================================================
-- Portal del Paciente — RLS Policies
-- 
-- Permitir que los pacientes autenticados vía Magic Link
-- puedan leer sus propios datos (turnos y perfil).
-- ============================================================

-- 1. Política en pacientes: lectura propia por email
CREATE POLICY "Pacientes pueden ver su propio perfil"
    ON pacientes
    FOR SELECT
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- 2. Política en pacientes: update parcial (teléfono, dirección, ciudad)
CREATE POLICY "Pacientes pueden actualizar su contacto"
    ON pacientes
    FOR UPDATE
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    WITH CHECK (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- 3. Política en turnos: lectura de turnos propios
CREATE POLICY "Pacientes pueden ver sus propios turnos"
    ON turnos
    FOR SELECT
    USING (
        paciente_id IN (
            SELECT id FROM pacientes
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );
