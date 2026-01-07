// Quick test to see what better-auth expects
const data = {
  email: "test@example.com",
  password: "test123",
  name: "Test User"
};

console.log('Sending signup request with:', JSON.stringify(data, null, 2));

fetch('http://localhost:3000/api/auth/sign-up/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
.then(r => r.json())
.then(result => console.log('Response:', JSON.stringify(result, null, 2)))
.catch(err => console.error('Error:', err));
