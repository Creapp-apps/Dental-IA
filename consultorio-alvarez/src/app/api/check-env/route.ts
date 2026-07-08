import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    return NextResponse.json({
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET',
        META_WA_VERIFY_TOKEN: process.env.META_WA_VERIFY_TOKEN || 'NOT_SET',
        META_WA_PHONE_NUMBER_ID: process.env.META_WA_PHONE_NUMBER_ID ? 'SET_WITH_LENGTH_' + process.env.META_WA_PHONE_NUMBER_ID.length : 'NOT_SET',
        hasAccessToken: !!process.env.META_WA_ACCESS_TOKEN,
    })
}
