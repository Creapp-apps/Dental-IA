import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    return NextResponse.json(
        { 
            status: 'ok', 
            service: 'dental-ia-heartbeat', 
            timestamp: Date.now() 
        },
        { 
            headers: { 
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' 
            } 
        }
    )
}
