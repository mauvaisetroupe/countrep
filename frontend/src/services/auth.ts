import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export async function registerUser(username: string) {
  const res = await fetch('/api/auth/register-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Échec de la création du challenge d'enregistrement");
  }
  
  const optionsJSON = await res.json();
  const attResp = await startRegistration({ optionsJSON });

  const verificationRes = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, cred: attResp })
  });
  
  const verification = await verificationRes.json();
  if (!verification.verified) {
    throw new Error(verification.error || "L'enregistrement a échoué.");
  }
  
  return verification;
}

export async function loginUser(username: string) {
  const res = await fetch('/api/auth/login-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Échec de la création du challenge de connexion");
  }

  const optionsJSON = await res.json();
  const assResp = await startAuthentication({ optionsJSON });

  const verificationRes = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, cred: assResp })
  });

  const verification = await verificationRes.json();
  if (!verification.verified) {
    throw new Error(verification.error || "Échec de la connexion.");
  }

  return verification;
}