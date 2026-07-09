const jwt = require('jsonwebtoken');
const axios = require('axios');

const secret = 'ZiGJf6iJ0Rh0xQMFCRiurlve/X4LrehwDDl+RRX+iZaCqCm1082ovWe2w6Gt0PwOj1Duj5k6McNO17WIAHZQPA==';
const token = jwt.sign(
  { sub: 'test-user-id', email: 'test@example.com', aud: 'authenticated', role: 'authenticated' },
  secret,
  { algorithm: 'HS256', expiresIn: '1h' }
);

async function test() {
  console.log("Token generated. Hitting API...");
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
