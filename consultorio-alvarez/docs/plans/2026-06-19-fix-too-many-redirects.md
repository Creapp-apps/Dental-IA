# Fix TOO_MANY_REDIRECTS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the infinite redirect loop (`TOO_MANY_REDIRECTS`) in production and development by restoring Next.js middleware with `getUser()` authentication validation, adding a server-side logout route handler to correctly purge cookies, and protecting both admin and portal layouts from layout/cookie mismatch loops.

**Architecture:**
- Create `src/middleware.ts` utilizing Supabase's `auth.getUser()` to ensure consistent, API-validated session state (avoiding mismatch loops caused by `auth.getSession()` parsing expired/stale cookies).
- Remove the unused `src/proxy.ts` file.
- Implement a `/api/auth/logout` API route handler that securely signs out (clearing response cookies) and redirects the user, solving the issue of layout Server Components being unable to mutate cookies.
- Update `/admin/layout` to verify database registry existence and redirect through the logout API if missing.
- Update portal `/(dashboard)/layout` to redirect through the logout API if the patient record is missing.

**Tech Stack:** Next.js 16 (App Router), Supabase Auth (`@supabase/ssr`), TypeScript

---

### Task 1: Create Logout Route Handler

**Files:**
- Create: `consultorio-alvarez/src/app/api/auth/logout/route.ts`

**Step 1: Write Route Handler Code**

Write the following content to `consultorio-alvarez/src/app/api/auth/logout/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/login'
    const supabase = await createClient()
    await supabase.auth.signOut()

    return NextResponse.redirect(new URL(redirectTo, request.url))
}
```

**Step 2: Commit**

```bash
git add consultorio-alvarez/src/app/api/auth/logout/route.ts
git commit -m "feat: add unified logout route handler to clear cookies on redirect"
```

---

### Task 2: Implement Edge-Compatible Middleware

**Files:**
- Create: `consultorio-alvarez/src/middleware.ts`
- Delete: `consultorio-alvarez/src/proxy.ts`

**Step 1: Write Middleware Code**

Write the following code to `consultorio-alvarez/src/middleware.ts`:

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const ADMIN_PREFIXES = ['/admin', '/agenda', '/pacientes', '/cobros', '/configuracion']

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Path classification
    const isRoot = pathname === '/'
    const isAdminRoute = ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
    const isAdminLogin = pathname.startsWith('/login')
    const isPortalLogin = /^\/portal\/[^/]+\/login/.test(pathname)
    const isPortalRoute = pathname.startsWith('/portal/') && !isPortalLogin

    // Fast-path bypass if route is not protected or sensitive to auth state
    if (!isRoot && !isAdminRoute && !isAdminLogin && !isPortalRoute && !isPortalLogin) {
        return NextResponse.next()
    }

    let response = NextResponse.next({ request })

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

    if (user && (isAdminLogin || isRoot)) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        return NextResponse.redirect(url)
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
```

**Step 2: Delete proxy.ts**

Run: `rm consultorio-alvarez/src/proxy.ts`

**Step 3: Commit**

```bash
git rm consultorio-alvarez/src/proxy.ts
git add consultorio-alvarez/src/middleware.ts
git commit -m "feat: migrate proxy.ts to Edge-compatible middleware using getUser"
```

---

### Task 3: Secure Admin Layout Auth Mismatches

**Files:**
- Modify: `consultorio-alvarez/src/app/(admin)/layout.tsx`

**Step 1: Modify Layout Code**

Replace lines 15-21 in `consultorio-alvarez/src/app/(admin)/layout.tsx` to verify the user registry in the database. If the user is logged into Auth but is not registered in the database, redirect through the logout API.

```typescript
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Verify user exists in the database
    const usuario = await getCurrentUsuario()
    if (!usuario) {
        redirect(`/api/auth/logout?redirectTo=/login`)
    }
```

**Step 2: Commit**

```bash
git add consultorio-alvarez/src/app/(admin)/layout.tsx
git commit -m "fix: secure admin layout against missing DB users by redirecting to logout API"
```

---

### Task 4: Secure Portal Layout Patient Mismatches

**Files:**
- Modify: `consultorio-alvarez/src/app/(portal)/portal/[slug]/(dashboard)/layout.tsx`

**Step 1: Modify Layout Code**

Replace lines 34-38 in `consultorio-alvarez/src/app/(portal)/portal/[slug]/(dashboard)/layout.tsx` to redirect through the logout API instead of trying to log out inside the layout.

```typescript
    if (!paciente) {
        // The authenticated email does not correspond to a patient in this tenant.
        // Redirect to logout API to clear cookies before sending them back to login.
        redirect(`/api/auth/logout?redirectTo=/portal/${slug}/login`)
    }
```

**Step 2: Commit**

```bash
git add consultorio-alvarez/src/app/(portal)/portal/[slug]/(dashboard)/layout.tsx
git commit -m "fix: redirect portal layout to logout API on patient mismatch to clean up session"
```

---

### Task 5: Build Verification

**Step 1: Run Next.js Build**

Run: `npm run build` in `consultorio-alvarez/` directory.

**Step 2: Verify success**

Ensure that the build compiles successfully without any typescript, linting, or edge middleware errors.
