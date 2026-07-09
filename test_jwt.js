const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://uvdtorvdcphslzgraktm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZHRvcnZkY3Boc2x6Z3Jha3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxODM2NTQsImV4cCI6MjA5ODc1OTY1NH0.goMubVZCj6dpvF1GLagXbXkEhlOu5C58Q4JcAS0siVc'
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
