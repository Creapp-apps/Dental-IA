import { describe, it, expect } from 'vitest'
import { rutaTenant, esRutaDeTenant, extraerRuta, BUCKETS_PRIVADOS } from './rutas'

const TENANT = 'bbbf0312-0000-0000-0000-000000000000'

describe('rutaTenant', () => {
    it('pone el tenant como primer segmento', () => {
        expect(rutaTenant(TENANT, 'pacientes', 'foto.jpg')).toBe(`${TENANT}/pacientes/foto.jpg`)
    })

    it('limpia barras sobrantes en los segmentos', () => {
        expect(rutaTenant(TENANT, '/pacientes/', '/foto.jpg')).toBe(`${TENANT}/pacientes/foto.jpg`)
    })

    // Review Focus 3: nunca escribir en la raíz del bucket
    it('tira si el tenant está vacío', () => {
        expect(() => rutaTenant('', 'foto.jpg')).toThrow()
        expect(() => rutaTenant(null, 'foto.jpg')).toThrow()
        expect(() => rutaTenant(undefined, 'foto.jpg')).toThrow()
    })

    it('tira si no hay ningún segmento', () => {
        expect(() => rutaTenant(TENANT)).toThrow()
    })
})

describe('esRutaDeTenant', () => {
    it('reconoce la ruta propia', () => {
        expect(esRutaDeTenant(`${TENANT}/pacientes/foto.jpg`, TENANT)).toBe(true)
    })

    it('rechaza la de otro consultorio', () => {
        expect(esRutaDeTenant('otro-tenant/pacientes/foto.jpg', TENANT)).toBe(false)
    })

    // Review Focus 5: las rutas viejas sin tenant no pertenecen a nadie
    it('rechaza una ruta sin tenant', () => {
        expect(esRutaDeTenant('3d/paciente/archivo.stl', TENANT)).toBe(false)
        expect(esRutaDeTenant('foto.jpg', TENANT)).toBe(false)
    })

    // Fix: con tenant vacío nunca hay pertenencia, ni con rutas que empiezan por '/'
    it('rechaza cualquier ruta si el tenant está vacío', () => {
        expect(esRutaDeTenant('/pacientes/foto.jpg', '')).toBe(false)
        expect(esRutaDeTenant('pacientes/foto.jpg', '')).toBe(false)
        expect(esRutaDeTenant('/', '')).toBe(false)
    })
})

describe('extraerRuta', () => {
    it('devuelve la ruta tal cual si ya es una ruta', () => {
        expect(extraerRuta(`${TENANT}/pacientes/foto.jpg`, 'avatars')).toBe(`${TENANT}/pacientes/foto.jpg`)
    })

    // Review Focus 1: conviven filas con URL vieja y filas con ruta
    it('saca la ruta de una URL pública vieja', () => {
        const url = `https://xyz.supabase.co/storage/v1/object/public/avatars/${TENANT}/pacientes/foto.jpg`
        expect(extraerRuta(url, 'avatars')).toBe(`${TENANT}/pacientes/foto.jpg`)
    })

    it('saca la ruta de una URL firmada', () => {
        const url = `https://xyz.supabase.co/storage/v1/object/sign/avatars/${TENANT}/foto.jpg?token=abc`
        expect(extraerRuta(url, 'avatars')).toBe(`${TENANT}/foto.jpg`)
    })

    // Review Focus 2: un valor que no se puede resolver no rompe la pantalla
    it('devuelve null con un valor vacío o de otro bucket', () => {
        expect(extraerRuta('', 'avatars')).toBeNull()
        expect(extraerRuta('https://xyz.supabase.co/storage/v1/object/public/otro/foto.jpg', 'avatars')).toBeNull()
    })

    // Fix: Supabase percent-encodea el nombre en las URLs; la ruta tiene que salir decodificada
    it('decodifica los espacios de una URL pública', () => {
        const url = `https://xyz.supabase.co/storage/v1/object/public/avatars/${TENANT}/Mi%20foto.jpg`
        expect(extraerRuta(url, 'avatars')).toBe(`${TENANT}/Mi foto.jpg`)
    })

    // Fix: una secuencia de escape inválida no puede tirar; se trata como irresoluble
    it('devuelve null si la URL tiene una secuencia de escape inválida', () => {
        const url = `https://xyz.supabase.co/storage/v1/object/public/avatars/${TENANT}/foto%ZZ.jpg`
        expect(extraerRuta(url, 'avatars')).toBeNull()
    })

    // Fix: solo el esquema http(s):// marca una URL; 'httpdocs/' es una ruta
    it('trata como ruta un valor que empieza con http pero no es URL', () => {
        expect(extraerRuta('httpdocs/foto.jpg', 'avatars')).toBe('httpdocs/foto.jpg')
    })
})

describe('BUCKETS_PRIVADOS', () => {
    it('lista exactamente los buckets con datos de pacientes', () => {
        expect(BUCKETS_PRIVADOS.has('avatars')).toBe(true)
        expect(BUCKETS_PRIVADOS.has('paciente_adjuntos')).toBe(true)
        expect(BUCKETS_PRIVADOS.has('escaneos_3d')).toBe(true)
        expect(BUCKETS_PRIVADOS.has('tenant_assets')).toBe(false)
    })
})
