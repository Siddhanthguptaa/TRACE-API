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
