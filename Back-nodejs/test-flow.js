const http = require('http');

async function testFlow() {
  const email = `test-${Date.now()}@test.com`;
  
  // 1. Register
  const regBody = JSON.stringify({
    firstName: 'Test',
    lastName: 'Test',
    email,
    password: 'Password123!',
    passwordConfirmation: 'Password123!'
  });

  const req = http.request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(regBody)
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
      console.log('Register Response:', data);
      
      // Get the raw token from DB? No, we don't have the rawToken in the DB.
      // We can only get it from the email logs.
      // Where does nodemailer log?
    });
  });
  
  req.write(regBody);
  req.end();
}

testFlow();
