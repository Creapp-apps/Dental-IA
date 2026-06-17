require('dotenv').config({ path: '.env.local' });

async function run() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
    });
    console.log("Status:", res.status);
    console.log("Headers:");
    for (const [key, value] of res.headers.entries()) {
        console.log(`  ${key}: ${value}`);
    }
}

run().catch(console.error);
