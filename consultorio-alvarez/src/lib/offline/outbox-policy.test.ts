import { describe, it, expect } from 'vitest'
import {
    calcularProximoIntento,
    esElegible,
    ordenarCola,
    filtrarBloqueados,
    siguienteEstadoTrasFallo,
} from './outbox-policy'

const AHORA = new Date('2026-10-08T12:00:00.000Z')

describe('calcularProximoIntento', () => {
    it('devuelve la espera de la escalera para cada intento', () => {
        expect(calcularProximoIntento(1, AHORA)).toBe('2026-10-08T12:00:05.000Z')
        expect(calcularProximoIntento(2, AHORA)).toBe('2026-10-08T12:00:15.000Z')
        expect(calcularProximoIntento(3, AHORA)).toBe('2026-10-08T12:01:00.000Z')
        expect(calcularProximoIntento(4, AHORA)).toBe('2026-10-08T12:05:00.000Z')
        expect(calcularProximoIntento(5, AHORA)).toBe('2026-10-08T12:15:00.000Z')
        expect(calcularProximoIntento(6, AHORA)).toBe('2026-10-08T13:00:00.000Z')
    })

    it('devuelve null cuando se agota la escalera', () => {
        expect(calcularProximoIntento(7, AHORA)).toBeNull()
    })

    // Review Focus 1: base local vieja o dato corrupto
    it('devuelve null con un contador fuera de rango en vez de romper', () => {
        expect(calcularProximoIntento(99, AHORA)).toBeNull()
        expect(calcularProximoIntento(0, AHORA)).toBeNull()
        expect(calcularProximoIntento(-3, AHORA)).toBeNull()
    })
})

describe('esElegible', () => {
    it('toma un pendiente sin espera pendiente', () => {
        expect(esElegible({ status: 'PENDIENTE', next_attempt_at: null }, AHORA)).toBe(true)
    })

    it('toma un pendiente cuya espera ya pasó', () => {
        const item = { status: 'PENDIENTE' as const, next_attempt_at: '2026-10-08T11:59:59.000Z' }
        expect(esElegible(item, AHORA)).toBe(true)
    })

    it('deja pasar un pendiente cuya espera todavía no venció', () => {
        const item = { status: 'PENDIENTE' as const, next_attempt_at: '2026-10-08T12:00:01.000Z' }
        expect(esElegible(item, AHORA)).toBe(false)
    })

    it('nunca toma un atascado', () => {
        expect(esElegible({ status: 'ATASCADO', next_attempt_at: null }, AHORA)).toBe(false)
    })

    // Review Focus 2: no quedar bloqueado para siempre por un valor corrupto
    it('considera elegible un pendiente con next_attempt_at inválido', () => {
        expect(esElegible({ status: 'PENDIENTE', next_attempt_at: '' }, AHORA)).toBe(true)
        expect(esElegible({ status: 'PENDIENTE', next_attempt_at: 'no es fecha' }, AHORA)).toBe(true)
        expect(esElegible({ status: 'PENDIENTE' }, AHORA)).toBe(true)
    })
})

describe('ordenarCola', () => {
    it('ordena por id ascendente, que es el orden en que el odontólogo hizo los cambios', () => {
        const items = [{ id: 7 }, { id: 2 }, { id: 11 }]
        expect(ordenarCola(items).map(i => i.id)).toEqual([2, 7, 11])
    })

    it('no muta el arreglo original', () => {
        const items = [{ id: 3 }, { id: 1 }]
        ordenarCola(items)
        expect(items.map(i => i.id)).toEqual([3, 1])
    })

    it('manda al final los items sin id', () => {
        const items = [{ id: undefined }, { id: 5 }]
        expect(ordenarCola(items).map(i => i.id)).toEqual([5, undefined])
    })
})

describe('filtrarBloqueados', () => {
    it('saltea los items de una fila que tiene algo atascado', () => {
        const elegibles = [
            { entity: 'pacientes', entity_id: 'p1' },
            { entity: 'pacientes', entity_id: 'p2' },
        ]
        const atascados = [{ entity: 'pacientes', entity_id: 'p1' }]

        expect(filtrarBloqueados(elegibles, atascados)).toEqual([
            { entity: 'pacientes', entity_id: 'p2' },
        ])
    })

    // Review Focus 3: el bloqueo es por par entity + entity_id
    it('no bloquea a otra entidad que comparta el id', () => {
        const elegibles = [{ entity: 'pacientes', entity_id: 'mismo-uuid' }]
        const atascados = [{ entity: 'turnos', entity_id: 'mismo-uuid' }]

        expect(filtrarBloqueados(elegibles, atascados)).toEqual(elegibles)
    })

    it('sin atascados devuelve todo', () => {
        const elegibles = [{ entity: 'turnos', entity_id: 't1' }]
        expect(filtrarBloqueados(elegibles, [])).toEqual(elegibles)
    })

    // Review Focus 4: la tanda puede quedar vacía, y quien llama tiene que
    // poder distinguir "no hay nada que subir" de "falló la subida"
    it('devuelve vacío cuando todo está bloqueado', () => {
        const elegibles = [{ entity: 'turnos', entity_id: 't1' }]
        const atascados = [{ entity: 'turnos', entity_id: 't1' }]
        expect(filtrarBloqueados(elegibles, atascados)).toEqual([])
    })
})

describe('siguienteEstadoTrasFallo', () => {
    it('manda a ATASCADO un fallo permanente sin recorrer la escalera', () => {
        const estado = siguienteEstadoTrasFallo(0, false, '23505', 'duplicate key', AHORA)

        expect(estado).toEqual({
            status: 'ATASCADO',
            attempts: 1,
            next_attempt_at: null,
            last_error_code: '23505',
            error_message: 'duplicate key',
        })
    })

    it('reprograma un fallo transitorio con la espera que toca', () => {
        const estado = siguienteEstadoTrasFallo(0, true, '57014', 'timeout', AHORA)

        expect(estado.status).toBe('PENDIENTE')
        expect(estado.attempts).toBe(1)
        expect(estado.next_attempt_at).toBe('2026-10-08T12:00:05.000Z')
    })

    it('manda a ATASCADO al agotar la escalera', () => {
        const estado = siguienteEstadoTrasFallo(6, true, '57014', 'timeout', AHORA)

        expect(estado.status).toBe('ATASCADO')
        expect(estado.attempts).toBe(7)
        expect(estado.next_attempt_at).toBeNull()
    })

    // Review Focus 1: contador fuera de rango heredado de una base vieja
    it('manda a ATASCADO un contador fuera de rango en vez de romper', () => {
        const estado = siguienteEstadoTrasFallo(98, true, undefined, undefined, AHORA)

        expect(estado.status).toBe('ATASCADO')
        expect(estado.next_attempt_at).toBeNull()
    })
})
