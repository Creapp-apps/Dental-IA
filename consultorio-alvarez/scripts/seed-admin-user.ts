#!/usr/bin/env tsx
/**
 * Seed: Crea el primer usuario admin en Supabase Auth
 * Uso: npx tsx scripts/seed-admin-user.ts
 *
 * Variables requeridas en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

// Cargar env manual (sin dotenv para no agregar dependencia)
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local')
    if (!fs.existsSync(envPath)) {
        console.error('❌  No se encontró .env.local')
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

async function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close()
            resolve(answer.trim())
        })
    })
}

async function main() {
    loadEnv()

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
        console.error('❌  Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
        process.exit(1)
    }

    const supabase = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    })

    console.log('\n🦷  Consultorio Álvarez — Crear usuario admin\n')

    const email = await prompt('Email del admin: ')
    const password = await prompt('Contraseña (mín. 6 caracteres): ')
    const nombre = await prompt('Nombre (opcional): ')
    const apellido = await prompt('Apellido (opcional): ')

    if (!email || !password) {
        console.error('❌  Email y contraseña son requeridos')
        process.exit(1)
    }

    console.log('\nCreando usuario en Supabase Auth...')

    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // confirmado automáticamente
        user_metadata: { nombre, apellido },
    })

    if (error) {
        console.error('❌  Error al crear usuario:', error.message)
        process.exit(1)
    }

    const userId = data.user.id
    console.log(`✅  Usuario creado: ${email} (id: ${userId})`)

    // Actualizar perfil con rol admin y nombre
    if (nombre || apellido) {
        const { error: profileError } = await supabase
            .from('perfiles')
            .update({ nombre: nombre || null, apellido: apellido || null, rol: 'admin' })
            .eq('id', userId)

        if (profileError) {
            console.warn('⚠️   Usuario creado pero no se pudo actualizar el perfil:', profileError.message)
            console.warn('    Actualizá el perfil manualmente en el panel de Supabase.')
        } else {
            console.log('✅  Perfil actualizado con rol "admin"')
        }
    }

    console.log('\n🚀  Listo. Ya podés iniciar sesión en:')
    console.log(`   http://localhost:3000/login`)
    console.log(`   Email: ${email}\n`)
}

main()
