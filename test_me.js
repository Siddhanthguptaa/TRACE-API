const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  'https://uvdtorvdcphslzgraktm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZHRvcnZkY3Boc2x6Z3Jha3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxODM2NTQsImV4cCI6MjA5ODc1OTY1NH0.goMubVZCj6dpvF1GLagXbXkEhlOu5C58Q4JcAS0siVc'
);

async function test() {
  try {
    // Attempt to log in with one of the emails to get a token
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@trace.dev',
      password: 'test' // assuming simple password for test users
    });

    if (error) {
      console.log('Login error (expected if wrong pass):', error.message);
      return;
    }

    console.log('Logged in successfully!');
    const token = data.session.access_token;

    // Hit the local API
    const res = await axios.get('http://localhost:8000/portal/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('API Response:', res.data);
  } catch (err) {
    if (err.response) {
      console.log('API Error:', err.response.status, err.response.data);
    } else {
      console.log('Request Error:', err.message);
    }
  }
}

test();
