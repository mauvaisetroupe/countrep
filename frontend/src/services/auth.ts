import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { i18n } from '../i18n'

const t = i18n.global.t

const API_URL = import.meta.env.VITE_API_URL || '';

export async function registerUser(username: string) {
  const res = await fetch(`${API_URL}/api/auth/register-challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || t('auth.registerChallenge'));
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
    throw new Error(verification.error || t('auth.registerFailed'));
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
    throw new Error(errData.error || t('auth.loginChallenge'));
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
    throw new Error(errData.error || t('auth.challenge'));
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
    throw new Error(verification.error || t('auth.addDeviceFailed'));
  }

  return verification;
}