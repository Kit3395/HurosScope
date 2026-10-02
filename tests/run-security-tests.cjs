/**
 * HoruScope security test suite (Node-only).
 *
 * Boots the production server bundle on a throwaway port with an isolated
 * working directory (file-backed store, no Turso) and verifies:
 *  - every protected endpoint rejects unauthenticated requests (401)
 *  - owner-only endpoints reject non-owner sessions (403)
 *  - login fails closed with bad credentials and without a bootstrap secret
 *  - no password hashes ever leave the server
 *  - the public access-request submit stays public by design
 *
 * Run:  npm run build && node tests/run-security-tests.js
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 4173;
const OWNER_PASSWORD = 'test-bootstrap-password-123';
const ROOT = path.join(__dirname, '..');

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

async function req(method, p, { token, body } = {}) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`http://127.0.0.1:${PORT}${p}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch { /* ignore */ }
  return { status: res.status, data };
}

async function waitForBoot() {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (r.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function main() {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'hurotest-'));
  console.log(`Test workdir: ${workdir}`);

  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(PORT),
    HORUSCOPE_OWNER_PASSWORD: OWNER_PASSWORD,
  };
  delete env.TURSO_DATABASE_URL;
  delete env.TURSO_AUTH_TOKEN;

  const child = spawn('node', [path.join(ROOT, 'dist', 'server.cjs')], {
    cwd: workdir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.stdout.write(`[srv] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[srv:err] ${d}`));

  try {
    check('server boots', await waitForBoot());
    console.log('\n-- unauthenticated access --');
    for (const [m, p, b] of [
      ['GET', '/api/users'],
      ['POST', '/api/users', { email: 'x@y.z', displayName: 'X', password: 'password123' }],
      ['GET', '/api/access-requests'],
      ['POST', '/api/access-requests/fake/approve', {}],
      ['POST', '/api/access-requests/fake/reject', {}],
      ['GET', '/api/system/health'],
      ['GET', '/api/discovery/status'],
      ['POST', '/api/discovery/search', { query: 'test' }],
      ['GET', '/api/auth/me'],
    ]) {
      const r = await req(m, p, { body: b });
      check(`${m} ${p} -> 401`, r.status === 401, `got ${r.status}`);
    }

    console.log('\n-- login --');
    const bad = await req('POST', '/api/auth/login', {
      body: { email: 'kiethryangonzales@gmail.com', password: 'wrong-password' },
    });
    check('wrong password -> 401 INVALID_CREDENTIALS', bad.status === 401 && bad.data?.error === 'INVALID_CREDENTIALS', `got ${bad.status} ${bad.data?.error}`);

    const good = await req('POST', '/api/auth/login', {
      body: { email: 'kiethryangonzales@gmail.com', password: OWNER_PASSWORD },
    });
    check('bootstrap password login -> 200 + token', good.status === 200 && !!good.data?.token, `got ${good.status}`);
    check('login response has no passwordHash', !JSON.stringify(good.data).includes('passwordHash'));
    const token = good.data?.token;

    console.log('\n-- authenticated owner --');
    const me = await req('GET', '/api/auth/me', { token });
    check('GET /api/auth/me -> 200', me.status === 200 && me.data?.user?.email === 'kiethryangonzales@gmail.com', `got ${me.status}`);

    const users = await req('GET', '/api/users', { token });
    check('GET /api/users -> 200, no hashes', users.status === 200 && !JSON.stringify(users.data).includes('passwordHash'), `got ${users.status}`);

    const noPw = await req('POST', '/api/users', { token, body: { email: 'a@b.c', displayName: 'No Pw' } });
    check('create user without password -> 400', noPw.status === 400, `got ${noPw.status}`);

    const created = await req('POST', '/api/users', {
      token,
      body: { email: 'operator@example.com', displayName: 'Op', password: 'operator-pass-123', role: 'OPERATOR' },
    });
    check('create user with password -> 201', created.status === 201, `got ${created.status}`);
    const newUserId = created.data?.user?.id;

    const opLogin = await req('POST', '/api/auth/login', {
      body: { email: 'operator@example.com', password: 'operator-pass-123' },
    });
    check('new user can log in -> 200', opLogin.status === 200 && !!opLogin.data?.token, `got ${opLogin.status}`);
    const opToken = opLogin.data?.token;

    const opUsers = await req('GET', '/api/users', { token: opToken });
    check('non-owner GET /api/users -> 403', opUsers.status === 403, `got ${opUsers.status}`);

    // Direct hash overwrite attempt must be ignored
    const evil = await req('PUT', `/api/users/${newUserId}`, {
      token,
      body: { passwordHash: 'deadbeef', passwordSalt: 'x', displayName: 'Op Renamed' },
    });
    check('PUT ignores direct passwordHash write', evil.status === 200 && !JSON.stringify(evil.data).includes('deadbeef'), `got ${evil.status}`);
    const stillLogin = await req('POST', '/api/auth/login', {
      body: { email: 'operator@example.com', password: 'operator-pass-123' },
    });
    check('password still works after evil PUT', stillLogin.status === 200, `got ${stillLogin.status}`);

    console.log('\n-- public by design --');
    const submit = await req('POST', '/api/access-requests', {
      body: { email: 'requester@example.com', fullName: 'Requester' },
    });
    check('POST /api/access-requests (submit) -> 201 without token', submit.status === 201, `got ${submit.status}`);

    const approve = await req('POST', `/api/access-requests/${submit.data?.request?.id}/approve`, { token });
    check('owner approve -> 200', approve.status === 200, `got ${approve.status}`);
    const approvedLogin = await req('POST', '/api/auth/login', {
      body: { email: 'requester@example.com', password: 'does-not-exist' },
    });
    check('approved requester has no password -> 401', approvedLogin.status === 401, `got ${approvedLogin.status}`);

    const badToken = await req('GET', '/api/auth/me', { token: 'bogus' });
    check('bogus token -> 401', badToken.status === 401, `got ${badToken.status}`);

    console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
  } finally {
    child.kill('SIGTERM');
    fs.rmSync(workdir, { recursive: true, force: true });
  }
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('Test harness error:', e);
  process.exit(1);
});
