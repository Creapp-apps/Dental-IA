import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    const slug = request.nextUrl.searchParams.get('slug') || ''
    const supabase = await createClient()
    await supabase.auth.signOut()

    return NextResponse.redirect(
        new URL(`/portal/${slug}/login`, request.url)
    )
}
