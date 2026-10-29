require('dotenv').config();
const https = require('https');
const fs = require('fs');

const sql = fs.readFileSync('./dd14_migration.sql', 'utf8');

const PROJECT_REF = 'atcrofguzgiluheuevua';

// Try via Supabase Management API (requires access token, not service key)
// Fallback: try via pg connection or direct REST
// We'll try the /pg-meta endpoint approach with service role
const body = JSON.stringify({ query: sql });

const options = {
  hostname: `${PROJECT_REF}.supabase.co`,
  path: `/rest/v1/rpc/`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  }
};

console.log('Supabase URL:', process.env.SUPABASE_URL);
console.log('Service Role Key present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('');
console.log('Trying to check if doctors table exists first...');

// Check if doctors table exists by querying it
const checkOptions = {
  hostname: `${PROJECT_REF}.supabase.co`,
  path: `/rest/v1/doctors?limit=1`,
  method: 'GET',
  headers: {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  }
};

const req = https.request(checkOptions, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('GET /rest/v1/doctors status:', res.statusCode);
    console.log('Response:', data);
    if (res.statusCode === 200) {
      console.log('\n✅ doctors table EXISTS and is accessible!');
    } else if (res.statusCode === 404 || data.includes('PGRST205') || data.includes('does not exist')) {
      console.log('\n❌ doctors table does NOT exist.');
      console.log('\nYou need to run the migration manually:');
      console.log('1. Go to: https://supabase.com/dashboard/project/atcrofguzgiluheuevua/sql/new');
      console.log('2. Paste and run the contents of dd14_migration.sql');
    } else {
      console.log('\nUnexpected response - check manually.');
    }
  });
});

req.on('error', e => console.error('Request error:', e.message));
req.end();
