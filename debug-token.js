const fs = require('fs');
const token = fs.readFileSync('access-token.txt','utf8').trim();
const parts = token.split('.');
if (parts.length !== 3) {
  console.error('token invalid');
  process.exit(1);
}
const decode = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64').toString('utf8');
};
console.log('HEADER:', decode(parts[0]));
console.log('PAYLOAD:', decode(parts[1]));
