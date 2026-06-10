import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local')
    if (!fs.existsSync(envPath)) {
        console.error('No env file')
        process.exit(1)
    }
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
        const [key, ...rest] = line.split('=')
        if (key && rest.length > 0) {
            process.env[key.trim()] = rest.join('=').trim()
        }
    }
}

async function main() {
    loadEnv()
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Check if we can select from pacientes
    const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error fetching pacientes:', error)
    } else {
        console.log('Paciente columns:', data.length > 0 ? Object.keys(data[0]) : 'No rows returned')
    }
}

main()
