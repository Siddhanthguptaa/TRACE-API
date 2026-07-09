// Check what properties the Supabase session object has
const { createClient } = require('@supabase/supabase-js');

// The session object from supabase.auth.getSession() has:
// data.session.access_token  -- this is the JWT
// data.session.user.email    -- user email  
// data.session.user.id       -- user UUID

console.log("Supabase session shape:");
console.log("  session.access_token = JWT string");
console.log("  session.user.email = user email");
console.log("  session.user.id = user UUID (sub claim)");
