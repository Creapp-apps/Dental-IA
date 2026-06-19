import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/login'
    const supabase = await createClient()
    await supabase.auth.signOut()

    return NextResponse.redirect(new URL(redirectTo, request.url))
}
