const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
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
  console.log("Signing up...");
  const { data, error } = await supabase.auth.signUp({
    email: 'test_agent_' + Date.now() + '@trace.dev',
    password: 'Password123!'
  });

  if (error) {
    console.log("Sign up error:", error.message);
    return;
  }
  
  const token = data.session.access_token;
  console.log("Got token. Hitting API...");
  
  try {
    const res = await axios.get("https://trace-api-ixv6o.ondigitalocean.app/api/portal/me", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("SUCCESS:", res.data);
  } catch (err) {
    if (err.response) {
      console.log("FAIL:", err.response.status, err.response.data);
    } else {
      console.log("NETWORK ERROR:", err.message);
    }
  }
}
test();
