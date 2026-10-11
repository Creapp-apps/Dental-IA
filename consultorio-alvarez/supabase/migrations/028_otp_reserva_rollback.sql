-- Rollback de la migración 028: elimina la tabla de OTP de reserva.
BEGIN;

DROP TABLE IF EXISTS public.otp_reserva;

COMMIT;
