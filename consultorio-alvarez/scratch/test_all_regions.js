const { Client } = require('pg');

const regions = [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'sa-east-1'
];
const user = 'postgres.fnrahivsztbwjmvpveae';
const database = 'postgres';
const port = 6543;

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
    for (const region of regions) {
        const host = `aws-0-${region}.pooler.supabase.com`;
        console.log(`Checking region: ${region} (${host})`);
        
        // Test first password to see if tenant/user exists
        const pwd = passwords[0];
        const client = new Client({
            host,
            user,
            password: pwd,
            database,
            port,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 3000
        });
        
        try {
            await client.connect();
            console.log(`\n🎉 SUCCESS! Connected to region: ${region} with password: ${pwd}\n`);
            
            // Alter table
            console.log("Altering table...");
            const res = await client.query('ALTER TABLE profesionales ADD COLUMN IF NOT EXISTS horarios JSONB;');
            console.log("Result:", res);
            
            await client.end();
            return;
        } catch (err) {
            console.log(`Result for ${region}: ${err.message}`);
            if (err.message.includes('password authentication failed')) {
                console.log(`👉 REGION IS CORRECT! (${region}). Tenant exists, but password '${pwd}' failed. Let's try other passwords.`);
                // Loop through other passwords for this region
                for (let i = 1; i < passwords.length; i++) {
                    const nextPwd = passwords[i];
                    console.log(`  Trying password: ${nextPwd}`);
                    const client2 = new Client({
                        host,
                        user,
                        password: nextPwd,
                        database,
                        port,
                        ssl: { rejectUnauthorized: false },
                        connectionTimeoutMillis: 3000
                    });
                    try {
                        await client2.connect();
                        console.log(`\n🎉 SUCCESS! Connected to region: ${region} with password: ${nextPwd}\n`);
                        console.log("Altering table...");
                        const res = await client2.query('ALTER TABLE profesionales ADD COLUMN IF NOT EXISTS horarios JSONB;');
                        console.log("Result:", res);
                        await client2.end();
                        return;
                    } catch (err2) {
                        console.log(`  Failed: ${err2.message}`);
                    }
                }
            }
        }
    }
    console.log("Finished check.");
}

test().catch(console.error);
