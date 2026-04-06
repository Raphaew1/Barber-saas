const https = require('https');
const { URL } = require('url');
const TOKEN = require('fs').readFileSync('access-token.txt', 'utf8').trim();
const URL_BASE = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';

function request(path, method='GET', body=null) {
  return new Promise((resolve, reject) => {
    const url = new URL(URL_BASE + path);
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ',
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
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
  console.log('> GET /auth/v1/user');
  console.log(await request('/auth/v1/user'));

  console.log('> GET /functions/v1/get-my-context');
  console.log(await request('/functions/v1/get-my-context'));

  console.log('> GET /rest/v1/profiles?id=eq.2115dd42-ea92-4525-8449-322073b49e62');
  console.log(await request('/rest/v1/profiles?id=eq.2115dd42-ea92-4525-8449-322073b49e62'));
})();
