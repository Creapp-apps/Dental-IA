import { describe, it, expect, vi, beforeEach } from 'vitest'

const createSignedUrl = vi.fn()
const from = vi.fn(() => ({ createSignedUrl }))

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({ storage: { from } }),
}))

import { urlFirmada } from './url-firmada'

const BASE = 'https://proyecto.supabase.co/storage/v1/object'

describe('urlFirmada', () => {
    beforeEach(() => {
        createSignedUrl.mockReset()
        from.mockClear()
        vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    it('devuelve null sin llamar a Storage si no hay valor', async () => {
        expect(await urlFirmada('avatars', null)).toBeNull()
        expect(await urlFirmada('avatars', '')).toBeNull()
        expect(await urlFirmada('avatars', undefined)).toBeNull()
        expect(from).not.toHaveBeenCalled()
    })

    it('sirve tal cual un asset local sin llamar a Storage', async () => {
        expect(await urlFirmada('escaneos_3d', '/models-3d/demo-maxillary.stl')).toBe('/models-3d/demo-maxillary.stl')
        expect(from).not.toHaveBeenCalled()
    })

    it('firma una ruta plana contra el bucket', async () => {
        createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://firmada/1' }, error: null })

        expect(await urlFirmada('avatars', 't1/pacientes/foto.jpg')).toBe('https://firmada/1')
        expect(from).toHaveBeenCalledWith('avatars')
        expect(createSignedUrl).toHaveBeenCalledWith('t1/pacientes/foto.jpg', 3600)
    })

    it('firma sobre la ruta extraída de una URL pública vieja', async () => {
        createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://firmada/2' }, error: null })

        const vieja = `${BASE}/public/avatars/pacientes/foto%20uno.jpg`
        expect(await urlFirmada('avatars', vieja)).toBe('https://firmada/2')
        expect(createSignedUrl).toHaveBeenCalledWith('pacientes/foto uno.jpg', 3600)
    })

    it('con descarga pide la URL como adjunto', async () => {
        createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://firmada/d' }, error: null })

        expect(await urlFirmada('paciente_adjuntos', 't1/x.pdf', undefined, { descarga: true })).toBe('https://firmada/d')
        expect(createSignedUrl).toHaveBeenCalledWith('t1/x.pdf', 3600, { download: true })
    })

    it('con varios buckets prueba el siguiente si el primero falla', async () => {
        createSignedUrl
            .mockResolvedValueOnce({ data: null, error: { message: 'Object not found' } })
            .mockResolvedValueOnce({ data: { signedUrl: 'https://firmada/3' }, error: null })

        expect(await urlFirmada(['escaneos_3d', 'paciente_adjuntos'], 't1/x.stl')).toBe('https://firmada/3')
        expect(from).toHaveBeenNthCalledWith(1, 'escaneos_3d')
        expect(from).toHaveBeenNthCalledWith(2, 'paciente_adjuntos')
    })

    it('devuelve null sin tirar si todos los buckets fallan', async () => {
        createSignedUrl.mockResolvedValue({ data: null, error: { message: 'Object not found' } })

        expect(await urlFirmada(['escaneos_3d', 'paciente_adjuntos'], 't1/x.stl')).toBeNull()
    })

    it('devuelve null si Storage tira una excepción', async () => {
        createSignedUrl.mockRejectedValue(new Error('red caída'))

        expect(await urlFirmada('avatars', 't1/x.jpg')).toBeNull()
    })
})
