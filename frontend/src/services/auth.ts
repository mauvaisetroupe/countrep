import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

const API_URL = import.meta.env.VITE_API_URL || '';

export async function registerUser(username: string) {
  const res = await fetch(`${API_URL}/api/auth/register-challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Échec de la création du challenge d'enregistrement");
  }
  
  const optionsJSON = await res.json();
  const cred = await startRegistration({ optionsJSON });

  const verificationRes = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, cred })
  });
  
  const verification = await verificationRes.json();
  if (!verification.verified) {
    throw new Error(verification.error || "L'enregistrement a échoué.");
  }
  
  return verification;
}

export async function loginUser(username: string) {
  const res = await fetch(`${API_URL}/api/auth/login-challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Échec de la création du challenge de connexion");
  }

  const optionsJSON = await res.json();
  const cred = await startAuthentication({ optionsJSON });

  const verificationRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, cred })
  });

  const verification = await verificationRes.json();
  if (!verification.verified) {
    throw new Error(verification.error || "Échec de la connexion.");
  }

  return verification;
}

export async function addDevice(token: string) {
  const res = await fetch(`${API_URL}/api/auth/add-device-challenge`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Échec de la création du challenge.");
  }

  const optionsJSON = await res.json();
  const cred = await startRegistration({ optionsJSON });

  const verificationRes = await fetch(`${API_URL}/api/auth/add-device`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ cred })
  });

  const verification = await verificationRes.json();

  if (!verification.verified) {
    throw new Error(verification.error || "L'ajout de l'appareil a échoué.");
  }

  return verification;
}