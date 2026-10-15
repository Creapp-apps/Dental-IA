import { describe, it, expect } from 'vitest'
import { parsearPrecioAR, parsearLineasTratamientos, filtrarNuevos } from './importar-tratamientos'

describe('parsearPrecioAR', () => {
    it('miles con punto', () => expect(parsearPrecioAR('1.500')).toBe(1500))
    it('miles y decimal', () => expect(parsearPrecioAR('1.500,50')).toBe(1500.5))
    it('con símbolo $', () => expect(parsearPrecioAR('$ 2.000')).toBe(2000))
    it('entero simple', () => expect(parsearPrecioAR('800')).toBe(800))
    it('vacío → undefined', () => expect(parsearPrecioAR('')).toBeUndefined())
    it('no numérico → undefined', () => expect(parsearPrecioAR('abc')).toBeUndefined())
    it('cero → undefined', () => expect(parsearPrecioAR('0')).toBeUndefined())
})

describe('parsearLineasTratamientos', () => {
    it('solo nombres, una por línea', () => {
        const r = parsearLineasTratamientos('CONSULTA\nCARIES CHICA\n\nLIMPIEZA SIMPLE')
        expect(r).toEqual([
            { nombre: 'CONSULTA' },
            { nombre: 'CARIES CHICA' },
            { nombre: 'LIMPIEZA SIMPLE' },
        ])
    })

    it('nombre ; precio', () => {
        const r = parsearLineasTratamientos('CONSULTA ; 1500\nCARIES GRANDE;$ 8.000')
        expect(r).toEqual([
            { nombre: 'CONSULTA', precio_referencia: 1500 },
            { nombre: 'CARIES GRANDE', precio_referencia: 8000 },
        ])
    })

    it('separador tab (pegado de planilla)', () => {
        const r = parsearLineasTratamientos('SELLANTES\t2.500')
        expect(r).toEqual([{ nombre: 'SELLANTES', precio_referencia: 2500 }])
    })

    it('ignora líneas en blanco y recorta espacios', () => {
        expect(parsearLineasTratamientos('  \n  CONSULTA  \n')).toEqual([{ nombre: 'CONSULTA' }])
    })

    it('texto vacío → []', () => expect(parsearLineasTratamientos('')).toEqual([]))
})

describe('filtrarNuevos', () => {
    it('omite los que ya existen (case-insensitive)', () => {
        const { nuevos, omitidos } = filtrarNuevos(
            [{ nombre: 'Consulta' }, { nombre: 'Caries chica' }],
            ['CONSULTA'],
        )
        expect(nuevos).toEqual([{ nombre: 'Caries chica' }])
        expect(omitidos).toEqual(['Consulta'])
    })

    it('omite duplicados dentro del mismo pegado', () => {
        const { nuevos, omitidos } = filtrarNuevos(
            [{ nombre: 'Limpieza' }, { nombre: 'limpieza' }],
            [],
        )
        expect(nuevos).toEqual([{ nombre: 'Limpieza' }])
        expect(omitidos).toEqual(['limpieza'])
    })

    it('todos nuevos', () => {
        const { nuevos, omitidos } = filtrarNuevos([{ nombre: 'A' }, { nombre: 'B' }], [])
        expect(nuevos).toHaveLength(2)
        expect(omitidos).toEqual([])
    })
})
