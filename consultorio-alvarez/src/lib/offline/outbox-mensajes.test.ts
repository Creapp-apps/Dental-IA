import { describe, it, expect } from 'vitest'
import { mensajeDeError, describirItem } from './outbox-mensajes'

describe('mensajeDeError', () => {
    it('traduce los códigos conocidos', () => {
        expect(mensajeDeError('23505', 'duplicate key')).toContain('Ya existe otro registro')
        expect(mensajeDeError('23503', 'fk')).toContain('ya no existe en la nube')
        expect(mensajeDeError('42501', 'denied')).toContain('no tiene permiso')
        expect(mensajeDeError('42703', 'col')).toContain('desactualizada')
        expect(mensajeDeError('PGRST204', 'cache')).toContain('desactualizada')
    })

    it('cae al mensaje técnico cuando no conoce el código', () => {
        expect(mensajeDeError('99999', 'algo raro pasó')).toBe('algo raro pasó')
    })

    it('tiene algo que decir aunque no haya ni código ni mensaje', () => {
        expect(mensajeDeError(undefined, undefined)).toBe('No se pudo subir el cambio a la nube.')
    })
})

describe('describirItem', () => {
    it('describe la operación en castellano', () => {
        expect(describirItem({ entity: 'pacientes', operation: 'INSERT' }, 'Ana Gómez'))
            .toBe('Paciente Ana Gómez — alta')
        expect(describirItem({ entity: 'turnos', operation: 'UPDATE' }, 'del 12/10'))
            .toBe('Turno del 12/10 — modificación')
        expect(describirItem({ entity: 'evoluciones', operation: 'DELETE' }, 'del 08/10'))
            .toBe('Evolución del 08/10 — eliminación')
    })
})
