import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    // Proteger contra prefetching de Next.js / navegadores: NUNCA cerrar sesión si es un prefetch
    const isPrefetch =
        request.headers.get('purpose') === 'prefetch' ||
        request.headers.get('sec-purpose') === 'prefetch' ||
        request.headers.get('x-purpose') === 'preview' ||
        request.headers.get('x-moz') === 'prefetch'

    if (isPrefetch) {
        return new NextResponse(null, { status: 204 })
    }

    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/login'
    const supabase = await createClient()
    await supabase.auth.signOut()

    return NextResponse.redirect(new URL(redirectTo, request.url))
}

export async function POST(request: NextRequest) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/login'
    const supabase = await createClient()
    await supabase.auth.signOut()

    return NextResponse.redirect(new URL(redirectTo, request.url))
}

