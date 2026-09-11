import { NextRequest, NextResponse } from 'next/server'
import { getTurnosSemana, getAuthenticatedTenantId } from '@/lib/supabase/queries'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const tenantId = await getAuthenticatedTenantId()
        if (!tenantId) {
            return NextResponse.json({ error: 'No autorizado o sesión expirada' }, { status: 401 })
        }

        const { searchParams } = request.nextUrl
        const inicioStr = searchParams.get('inicio')
        const finStr = searchParams.get('fin')
        const profesionalId = searchParams.get('profesionalId') || undefined

        if (!inicioStr || !finStr) {
            return NextResponse.json({ error: 'Parámetros inicio y fin requeridos' }, { status: 400 })
        }

        const inicio = new Date(inicioStr)
        const fin = new Date(finStr)

        if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
            return NextResponse.json({ error: 'Fechas inválidas' }, { status: 400 })
        }

        const turnos = await getTurnosSemana(inicio, fin, profesionalId)

        return NextResponse.json({ turnos })
    } catch (error: any) {
        console.error('Error en GET /api/turnos:', error)
        return NextResponse.json(
            { error: error?.message || 'Error interno al consultar turnos' },
            { status: 500 }
        )
    }
}
