import { describe, test, expect } from 'vitest'
import { idsPacientesEnScope, puedeVerFichaPaciente } from './scope'

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
