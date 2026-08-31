import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export async function registerUser(username) {
  const res = await fetch('/api/auth/register-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  const optionsJSON = await res.json();

  const attResp = await startRegistration({ optionsJSON });

  const verificationRes = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, cred: attResp })
  });
  return verificationRes.json();
}

export async function loginUser(username) {
  const res = await fetch('/api/auth/login-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  const optionsJSON = await res.json();

  const assResp = await startAuthentication({ optionsJSON });

  const verificationRes = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, cred: assResp })
  });
  return verificationRes.json();
}