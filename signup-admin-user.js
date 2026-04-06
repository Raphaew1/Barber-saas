const https = require('https');
const { URL } = require('url');

const url = new URL('https://kgpsfbuurggwmpcxrfpa.supabase.co/auth/v1/signup');
const body = JSON.stringify({
  email: 'raphacom.web@gmail.com',
  password: 'Barber123!'
});

const req = https.request({
  hostname: url.hostname,
  port: 443,
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ',
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try { data = JSON.parse(data); } catch (e) {}
    console.log('status:', res.statusCode);
    console.log('body:', data);
  });
});
req.on('error', (err) => console.error(err));
req.write(body);
req.end();
