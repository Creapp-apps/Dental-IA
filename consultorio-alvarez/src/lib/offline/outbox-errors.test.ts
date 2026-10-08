import { describe, it, expect } from 'vitest'
import { esReintentable } from './outbox-errors'

describe('esReintentable', () => {
    it('no reintenta los fallos permanentes', () => {
        expect(esReintentable('23505')).toBe(false) // clave duplicada
        expect(esReintentable('23503')).toBe(false) // la fila referenciada no existe
        expect(esReintentable('23502')).toBe(false) // falta un dato obligatorio
        expect(esReintentable('23514')).toBe(false) // viola una regla de la tabla
        expect(esReintentable('22P02')).toBe(false) // formato inválido
        expect(esReintentable('42501')).toBe(false) // RLS
        expect(esReintentable('42703')).toBe(false) // columna inexistente
        expect(esReintentable('42P01')).toBe(false) // tabla inexistente
        expect(esReintentable('PGRST204')).toBe(false) // esquema desactualizado
    })

    it('reintenta los fallos transitorios', () => {
        expect(esReintentable('57014')).toBe(true) // timeout de consulta
        expect(esReintentable('53300')).toBe(true) // demasiadas conexiones
        expect(esReintentable('53400')).toBe(true) // límite de configuración
        expect(esReintentable('08006')).toBe(true) // fallo de conexión
        expect(esReintentable('40001')).toBe(true) // serialización
        expect(esReintentable('40P01')).toBe(true) // deadlock
        expect(esReintentable('XX000')).toBe(true) // error interno del pooler
    })

    it('trata como transitorio un código desconocido o ausente', () => {
        expect(esReintentable('99999')).toBe(true)
        expect(esReintentable(undefined)).toBe(true)
        expect(esReintentable(null)).toBe(true)
        expect(esReintentable('')).toBe(true)
    })
})
