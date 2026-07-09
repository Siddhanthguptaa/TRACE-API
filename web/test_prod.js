const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  'https://uvdtorvdcphslzgraktm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZHRvcnZkY3Boc2x6Z3Jha3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxODM2NTQsImV4cCI6MjA5ODc1OTY1NH0.goMubVZCj6dpvF1GLagXbXkEhlOu5C58Q4JcAS0siVc'
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
