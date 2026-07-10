const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function test() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'teamtraceai@gmail.com',
    password: 'test' // Using test, might fail but I want to try
  });

  if (error) {
    console.log('Login error:', error.message);
    return;
  }

  const token = data.session.access_token;
  const parts = token.split('.');
  console.log('Header:', Buffer.from(parts[0], 'base64').toString());
  console.log('Payload:', Buffer.from(parts[1], 'base64').toString());
}
test();
