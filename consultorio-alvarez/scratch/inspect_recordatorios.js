const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
    console.log('Querying recordatorios...')
    const { data, error } = await supabase
        .from('recordatorios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

    if (error) {
        console.error('Error fetching data:', error)
        process.exit(1)
    }

    console.log(JSON.stringify(data, null, 2))
}

main().catch(err => {
    console.error('Unhandled error:', err)
})
