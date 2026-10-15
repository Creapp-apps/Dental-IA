import { describe, test, expect } from 'vitest'
import {
    anamnesisVacia,
    derivarCamposClinicos,
    obtenerAlertasCriticas,
    anamnesisTieneDatos,
    type AntecedentesSalud,
} from './antecedentes-salud'

describe('derivarCamposClinicos', () => {
    test('anamnesis nula/vacía → todo null', () => {
        expect(derivarCamposClinicos(null)).toEqual({ alergias: null, medicacion_actual: null, antecedentes: null })
        expect(derivarCamposClinicos(anamnesisVacia())).toEqual({ alergias: null, medicacion_actual: null, antecedentes: null })
    })

    test('alergias y medicación toman el detalle cuando valor=true', () => {
        const a = anamnesisVacia()
        a.preguntas['alergias_medicamentos'] = { valor: true, detalle: 'Penicilina, Látex' }
        a.preguntas['medicacion_diaria'] = { valor: true, detalle: 'Ibuprofeno 400mg' }
        const d = derivarCamposClinicos(a)
        expect(d.alergias).toBe('Penicilina, Látex')
        expect(d.medicacion_actual).toBe('Ibuprofeno 400mg')
    })

    test('valor=true sin detalle usa texto genérico', () => {
        const a = anamnesisVacia()
        a.preguntas['alergias_medicamentos'] = { valor: true }
        a.preguntas['medicacion_diaria'] = { valor: true, detalle: '   ' }
        const d = derivarCamposClinicos(a)
        expect(d.alergias).toBe('Alergia a medicamentos (sin especificar)')
        expect(d.medicacion_actual).toBe('Toma medicación diaria (sin especificar)')
    })

    test('antecedentes resume afecciones (con detalle) + señales de preguntas', () => {
        const a = anamnesisVacia()
        a.afecciones = ['diabetes', 'hepatitis']
        a.afecciones_detalle = { hepatitis: 'B' }
        a.preguntas['tratamiento_medico'] = { valor: true, detalle: 'Hipertensión' }
        a.preguntas['bifosfonatos'] = { valor: true }
        a.preguntas['embarazada'] = { valor: true }
        const d = derivarCamposClinicos(a)
        expect(d.antecedentes).toContain('Diabetes')
        expect(d.antecedentes).toContain('Hepatitis (B)')
        expect(d.antecedentes).toContain('En tratamiento médico: Hipertensión')
        expect(d.antecedentes).toContain('Toma/tomó bifosfonatos')
        expect(d.antecedentes).toContain('Embarazada')
    })
})

describe('obtenerAlertasCriticas', () => {
    test('anamnesis vacía → sin alertas', () => {
        expect(obtenerAlertasCriticas(anamnesisVacia())).toEqual([])
        expect(obtenerAlertasCriticas(null)).toEqual([])
    })

    test('incluye preguntas críticas en true y excluye las no críticas', () => {
        const a = anamnesisVacia()
        a.preguntas['alergias_medicamentos'] = { valor: true, detalle: 'Penicilina' }
        a.preguntas['embarazada'] = { valor: true }
        a.preguntas['mala_experiencia_odontologica'] = { valor: true, detalle: 'Dolor' } // no crítica
        a.preguntas['adiccion_drogas'] = { valor: true } // no crítica
        const alertas = obtenerAlertasCriticas(a)
        expect(alertas.some(x => x.startsWith('Reacciones alérgicas'))).toBe(true)
        expect(alertas.some(x => x.includes('Penicilina'))).toBe(true)
        expect(alertas.some(x => x.includes('embarazada') || x.includes('Está embarazada'))).toBe(true)
        expect(alertas.some(x => x.includes('mala experiencia'))).toBe(false)
        expect(alertas.some(x => x.includes('adicto'))).toBe(false)
    })

    test('incluye afecciones críticas marcadas y no las demás', () => {
        const a = anamnesisVacia()
        a.afecciones = ['diabetes', 'sinusitis', 'hepatitis']
        a.afecciones_detalle = { hepatitis: 'C' }
        const alertas = obtenerAlertasCriticas(a)
        expect(alertas).toContain('Diabetes')
        expect(alertas).toContain('Hepatitis: C')
        expect(alertas).not.toContain('Sinusitis')
    })
})

describe('anamnesisTieneDatos', () => {
    test('vacía → false; con una respuesta → true', () => {
        expect(anamnesisTieneDatos(null)).toBe(false)
        expect(anamnesisTieneDatos(anamnesisVacia())).toBe(false)
        const a = anamnesisVacia()
        a.preguntas['bifosfonatos'] = { valor: true }
        expect(anamnesisTieneDatos(a)).toBe(true)
        const b = anamnesisVacia()
        b.afecciones = ['diabetes']
        expect(anamnesisTieneDatos(b)).toBe(true)
        const c: AntecedentesSalud = { ...anamnesisVacia(), consentimiento: { aceptado: true, fecha: '2026-10-15' } }
        expect(anamnesisTieneDatos(c)).toBe(true)
    })
})
