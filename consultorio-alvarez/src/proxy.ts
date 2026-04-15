import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Rutas que requieren sesión activa (admin)
const ADMIN_PREFIXES = ['/dashboard', '/agenda', '/pacientes', '/cobros', '/configuracion']

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Clasificación de rutas
    const isRoot = pathname === '/'
    const isAdminRoute = ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
    const isAdminLogin = pathname.startsWith('/login')
    const isPortalLogin = /^\/portal\/[^/]+\/login/.test(pathname)
    const isPortalRoute = pathname.startsWith('/portal/') && !isPortalLogin

    // Si no es ninguna ruta que nos interese, pasar de largo
    if (!isRoot && !isAdminRoute && !isAdminLogin && !isPortalRoute && !isPortalLogin) {
        return NextResponse.next()
    }

    let response = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // ── Portal routes ──────────────────────────────────────────
    if (isPortalRoute && !user) {
        // Extraer el slug del path: /portal/[slug]/...
        const slug = pathname.split('/')[2]
        const url = request.nextUrl.clone()
        url.pathname = `/portal/${slug}/login`
        return NextResponse.redirect(url)
    }

    // Portal login: si ya tiene sesión, mandarlo al dashboard del portal
    if (isPortalLogin && user) {
        const slug = pathname.split('/')[2]
        const url = request.nextUrl.clone()
        url.pathname = `/portal/${slug}`
        return NextResponse.redirect(url)
    }

    // ── Admin routes ───────────────────────────────────────────
    if (!user && (isAdminRoute || isRoot)) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    if (user && (isAdminLogin || isRoot)) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
