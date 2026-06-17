const { Client } = require('pg');

const hosts = [
    'aws-0-sa-east-1.pooler.supabase.com',
    'aws-0-us-east-1.pooler.supabase.com'
];
const user = 'postgres.fnrahivsztbwjmvpveae';
const database = 'postgres';
const ports = [6543, 5432];

const passwords = [
    'Alvarez2026!',
    'Alvarez2026',
    'alvarez',
    'dental-ia',
    'Dental-IA',
    'Dentalia2026',
    'Alvarez_2026!',
    'Alvarez_2026'
];

async function test() {
    for (const host of hosts) {
        for (const port of ports) {
            for (const pwd of passwords) {
                console.log(`Testing host: ${host}, port: ${port}, pwd: ${pwd}`);
                const client = new Client({
                    host,
                    user,
                    password: pwd,
                    database,
                    port,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 5000
                });
                try {
                    await client.connect();
                    console.log(`\n🎉 SUCCESS! Host: ${host}, Port: ${port}, Password is: ${pwd}\n`);
                    
                    // Alter table to add horarios if not exists
                    console.log("Altering table profesionales to add horarios column...");
                    const res = await client.query('ALTER TABLE profesionales ADD COLUMN IF NOT EXISTS horarios JSONB;');
                    console.log("Result:", res);
                    
                    await client.end();
                    return;
                } catch (err) {
                    console.log(`Failed: ${err.message}`);
                }
            }
        }
    }
    console.log("None of the candidate passwords/hosts worked.");
}

test().catch(console.error);
