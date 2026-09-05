import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const ADMIN_PREFIXES = ['/admin', '/agenda', '/pacientes', '/cobros', '/configuracion', '/mis-pagos', '/superadmin']

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Path classification
    const isRoot = pathname === '/'
    const isAdminRoute = ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
    const isAdminLogin = pathname.startsWith('/login')
    const isPortalLogin = /^\/portal\/[^/]+\/login/.test(pathname)
    const isPortalRoute = pathname.startsWith('/portal/') && !isPortalLogin

    // Extract and forward host for multi-tenant domain resolution
    const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
    const requestHeaders = new Headers(request.headers)
    
    // Soporte para pruebas y entornos de desarrollo/staging sin dominio final:
    const explicitTenant = request.nextUrl.searchParams.get('slug') || request.nextUrl.searchParams.get('tenant')
    if (explicitTenant) {
        requestHeaders.set('x-tenant-host', explicitTenant)
    } else if (rawHost) {
        requestHeaders.set('x-tenant-host', rawHost)
    }

    // ── Soporte para slugs limpios de tenants en entornos sin subdominios (ej: /curadent, /alvarez) ──
    const SYSTEM_RESERVED_ROUTES = [
        'admin', 'agenda', 'pacientes', 'cobros', 'configuracion', 'mis-pagos',
        'superadmin', 'login', 'portal', 'reservar', 'api', 'test-turnos',
        'favicon.ico', 'sounds', 'images', 'manifest.json'
    ]

    const pathSegments = pathname.split('/').filter(Boolean)
    const firstSegment = pathSegments[0]?.toLowerCase()

    if (firstSegment && !SYSTEM_RESERVED_ROUTES.includes(firstSegment)) {
        const potentialSlug = firstSegment
        const remainingPath = pathSegments.slice(1).join('/')

        if (remainingPath === 'reservar') {
            const url = request.nextUrl.clone()
            url.pathname = '/reservar'
            url.searchParams.set('slug', potentialSlug)
            requestHeaders.set('x-tenant-host', potentialSlug)
            return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
        }

        if (remainingPath === 'login') {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('slug', potentialSlug)
            return NextResponse.redirect(url)
        }

        if (remainingPath === 'admin') {
            const url = request.nextUrl.clone()
            url.pathname = '/admin'
            url.searchParams.set('slug', potentialSlug)
            return NextResponse.redirect(url)
        }

        if (!remainingPath) {
            // Rewrite transparente a la home inyectando el tenant slug
            const url = request.nextUrl.clone()
            url.pathname = '/'
            url.searchParams.set('slug', potentialSlug)
            requestHeaders.set('x-tenant-host', potentialSlug)
            return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
        }
    }

    // Fast-path bypass if route is not protected or sensitive to auth state
    if (!isRoot && !isAdminRoute && !isAdminLogin && !isPortalRoute && !isPortalLogin) {
        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        })
    }

    let response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return response
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

    // IMPORTANT: use getUser() instead of getSession() to guarantee API-validated auth state
    // and avoid redirects on expired/stale session cookies.
    const { data: { user } } = await supabase.auth.getUser()

    // ── Portal Route Protections ─────────────────────────────
    if (isPortalRoute && !user) {
        const slug = pathname.split('/')[2]
        const url = request.nextUrl.clone()
        url.pathname = `/portal/${slug}/login`
        return NextResponse.redirect(url)
    }

    if (isPortalLogin && user) {
        const slug = pathname.split('/')[2]
        const url = request.nextUrl.clone()
        url.pathname = `/portal/${slug}`
        return NextResponse.redirect(url)
    }

    // ── Admin Route Protections ──────────────────────────────
    if (!user && isAdminRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    if (user && isAdminLogin) {
        const explicitSlug = request.nextUrl.searchParams.get('slug')
        if (!explicitSlug) {
            const userEmail = user.email || ''
            const isSuperadmin = 
                userEmail === 'creapp.ar@gmail.com' ||
                userEmail === 'mazasebastian@hotmail.com' || 
                userEmail.endsWith('@creapp.com') || 
                userEmail.endsWith('@dental-ia.com')

            const url = request.nextUrl.clone()
            url.pathname = isSuperadmin ? '/superadmin' : '/admin'
            return NextResponse.redirect(url)
        }
    }

    if (user && (pathname === '/admin' || pathname === '/admin/')) {
        const explicitSlug = request.nextUrl.searchParams.get('slug')
        const userEmail = user.email || ''
        const isSuperadmin = 
            userEmail === 'creapp.ar@gmail.com' ||
            userEmail === 'mazasebastian@hotmail.com' || 
            userEmail.endsWith('@creapp.com') || 
            userEmail.endsWith('@dental-ia.com')

        if (isSuperadmin && !explicitSlug) {
            const url = request.nextUrl.clone()
            url.pathname = '/superadmin'
            return NextResponse.redirect(url)
        }
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
