import { describe, test, expect } from 'vitest'
import { cuadrantesPorTipo, type OdontogramaTipo } from './odontograma'

describe('cuadrantesPorTipo', () => {
    test('ADULTO: 4 cuadrantes de dientes permanentes (11-48)', () => {
        const cuadrantes = cuadrantesPorTipo('ADULTO')
        expect(cuadrantes).toHaveLength(4)
        const todos = cuadrantes.flatMap(c => c.dientes)
        expect(todos).toHaveLength(32)
        expect(todos).toContain('11')
        expect(todos).toContain('48')
        // Ningún temporario
        expect(todos.some(d => Number(d) >= 51)).toBe(false)
    })

    test('NINO: 4 cuadrantes de dientes temporarios (51-85)', () => {
        const cuadrantes = cuadrantesPorTipo('NINO')
        expect(cuadrantes).toHaveLength(4)
        const todos = cuadrantes.flatMap(c => c.dientes)
        expect(todos).toHaveLength(20)
        expect(todos).toContain('51')
        expect(todos).toContain('85')
        // Ningún permanente
        expect(todos.some(d => Number(d) <= 48)).toBe(false)
    })

    test('MIXTO: 8 cuadrantes (permanentes + temporarios, 52 piezas)', () => {
        const cuadrantes = cuadrantesPorTipo('MIXTO')
        expect(cuadrantes).toHaveLength(8)
        const todos = cuadrantes.flatMap(c => c.dientes)
        expect(todos).toHaveLength(52)
        expect(todos).toContain('11')
        expect(todos).toContain('85')
    })

    test('tipo desconocido cae a ADULTO', () => {
        expect(cuadrantesPorTipo('x' as OdontogramaTipo)).toEqual(cuadrantesPorTipo('ADULTO'))
    })
})
