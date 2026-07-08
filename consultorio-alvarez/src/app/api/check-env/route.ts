import { NextResponse } from 'next/server'

export async function GET() {
    return NextResponse.json({
        has_token: !!process.env.META_WA_VERIFY_TOKEN,
        token_type: typeof process.env.META_WA_VERIFY_TOKEN,
        token_length: process.env.META_WA_VERIFY_TOKEN ? process.env.META_WA_VERIFY_TOKEN.length : 0,
        token_value_is_empty: process.env.META_WA_VERIFY_TOKEN === '',
        fallback_value: 'ALVAREZ_WA_WEBHOOK_VERIFY_TOKEN',
        evaluated_verify_token: process.env.META_WA_VERIFY_TOKEN || 'ALVAREZ_WA_WEBHOOK_VERIFY_TOKEN'
    })
}
