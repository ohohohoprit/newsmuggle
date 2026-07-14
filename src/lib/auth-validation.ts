/**
 * Validation schemas for auth inputs.
 * Simple inline validators — no external dependency needed.
 */

export function validateEmail(email: unknown): string {
  if (typeof email !== 'string' || !email.trim()) {
    throw new Error('Email is required.');
  }
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error('Invalid email format.');
  }
  if (trimmed.length > 255) {
    throw new Error('Email is too long.');
  }
  return trimmed;
}

export function validatePassword(password: unknown): string {
  if (typeof password !== 'string' || !password) {
    throw new Error('Password is required.');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
  if (password.length > 128) {
    throw new Error('Password is too long.');
  }
  return password;
}

export function validatePhone(phone: unknown): string {
  if (typeof phone !== 'string' || !phone.trim()) {
    throw new Error('Phone number is required.');
  }
  const trimmed = phone.trim();
  // Accept +countrycode format
  const phoneRegex = /^\+?[1-9]\d{6,14}$/;
  if (!phoneRegex.test(trimmed.replace(/[\s-()]/g, ''))) {
    throw new Error('Invalid phone number format. Use international format: +1234567890');
  }
  return trimmed.replace(/[\s-()]/g, '');
}

export function validateOtpCode(code: unknown): string {
  if (typeof code !== 'string' || !code) {
    throw new Error('OTP code is required.');
  }
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    throw new Error('OTP must be a 6-digit code.');
  }
  return trimmed;
}

export function validateName(name: unknown): string | undefined {
  if (name === undefined || name === null) return undefined;
  if (typeof name !== 'string') {
    throw new Error('Name must be a string.');
  }
  const trimmed = name.trim();
  if (trimmed.length > 100) {
    throw new Error('Name is too long.');
  }
  return trimmed || undefined;
}
