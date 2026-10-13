import { describe, test, expect } from 'vitest'
import { idsPacientesEnScope, puedeVerFichaPaciente, unirIdsPacientes, autorEvolucion } from './scope'

describe('idsPacientesEnScope', () => {
    test('devuelve los paciente_id distintos de los turnos', () => {
        const turnos = [
            { paciente_id: 'a' },
            { paciente_id: 'b' },
            { paciente_id: 'a' },
        ]
        expect(idsPacientesEnScope(turnos).sort()).toEqual(['a', 'b'])
    })

    test('descarta paciente_id nulo o indefinido', () => {
        const turnos = [
            { paciente_id: 'a' },
            { paciente_id: null },
            { paciente_id: undefined },
        ]
        expect(idsPacientesEnScope(turnos)).toEqual(['a'])
    })

    test('sin turnos devuelve lista vacía', () => {
        expect(idsPacientesEnScope([])).toEqual([])
    })
})

describe('unirIdsPacientes', () => {
    test('une asignados y los de turnos sin duplicar', () => {
        expect(unirIdsPacientes(['a', 'b'], ['b', 'c']).sort()).toEqual(['a', 'b', 'c'])
    })

    test('funciona con una de las listas vacía', () => {
        expect(unirIdsPacientes(['a'], []).sort()).toEqual(['a'])
        expect(unirIdsPacientes([], ['c']).sort()).toEqual(['c'])
    })

    test('descarta nulos y vacíos', () => {
        expect(unirIdsPacientes(['a', null as any], [undefined as any, 'c']).sort()).toEqual(['a', 'c'])
    })
})

describe('autorEvolucion', () => {
    test('un profesional siempre firma con su propio id, aunque pida otro', () => {
        expect(autorEvolucion({ esProfesional: true, profesionalId: 'yo', autorSolicitado: 'otro' })).toBe('yo')
    })

    test('un profesional sin pedir autor firma con el suyo', () => {
        expect(autorEvolucion({ esProfesional: true, profesionalId: 'yo', autorSolicitado: null })).toBe('yo')
    })

    test('admin/recepción respeta el autor solicitado (quien atendió)', () => {
        expect(autorEvolucion({ esProfesional: false, profesionalId: null, autorSolicitado: 'quien-atendio' })).toBe('quien-atendio')
    })
})

describe('puedeVerFichaPaciente', () => {
    test('un profesional ve la ficha de un paciente que tuvo en su agenda', () => {
        expect(
            puedeVerFichaPaciente({ esProfesional: true, idsEnScope: ['a', 'b'], pacienteId: 'a' })
        ).toBe(true)
    })

    test('un profesional NO ve la ficha de un paciente ajeno', () => {
        expect(
            puedeVerFichaPaciente({ esProfesional: true, idsEnScope: ['a', 'b'], pacienteId: 'z' })
        ).toBe(false)
    })

    test('quien no es profesional (admin) ve cualquier ficha', () => {
        expect(
            puedeVerFichaPaciente({ esProfesional: false, idsEnScope: [], pacienteId: 'z' })
        ).toBe(true)
    })
})
