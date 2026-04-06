const https = require('https');
const { URL } = require('url');

const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ';

function request(url, method='GET', body=null, headers={}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = https.request({
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { data = JSON.parse(data); } catch (e) {}
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  const email = 'raphacom.web@gmail.com';
  const password = 'Barber123!';

  console.log('Signing in with new credentials...');
  const tokenResp = await request(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, 'POST', { email, password });
  console.log('tokenResp:', tokenResp);
  if (tokenResp.status !== 200 || !tokenResp.data?.access_token) {
    console.error('Login failed');
    return;
  }
  const token = tokenResp.data.access_token;

  console.log('\nCalling get-my-context with new access token...');
  const ctxResp = await request(`${SUPABASE_URL}/functions/v1/get-my-context`, 'POST', null, { Authorization: `Bearer ${token}` });
  console.log('get-my-context:', ctxResp);
})();