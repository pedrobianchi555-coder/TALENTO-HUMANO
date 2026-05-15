/**
 * Input validation utilities for security
 */

// Sanitize string inputs - remove potentially dangerous characters
export function sanitizeString(input: string | null | undefined, maxLength: number = 500): string | null {
  if (!input) return null;
  
  // Convert to string and trim
  let sanitized = String(input).trim();
  
  // Remove null bytes and other control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized || null;
}

// Validate email format
export function validateEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  
  const sanitized = sanitizeString(email, 255);
  if (!sanitized) return null;
  
  // Basic email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return null;
  }
  
  return sanitized.toLowerCase();
}

// Validate and sanitize integer
export function validateInteger(value: any, min?: number, max?: number): number | null {
  const parsed = parseInt(value);
  
  if (isNaN(parsed)) return null;
  if (min !== undefined && parsed < min) return null;
  if (max !== undefined && parsed > max) return null;
  
  return parsed;
}

// Validate and sanitize float
export function validateFloat(value: any, min?: number, max?: number): number | null {
  const parsed = parseFloat(value);
  
  if (isNaN(parsed) || !isFinite(parsed)) return null;
  if (min !== undefined && parsed < min) return null;
  if (max !== undefined && parsed > max) return null;
  
  return parsed;
}

// Validate date format (YYYY-MM-DD)
export function validateDate(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  
  const sanitized = sanitizeString(dateString, 10);
  if (!sanitized) return null;
  
  // Check format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(sanitized)) return null;
  
  // Validate actual date
  const date = new Date(sanitized);
  if (isNaN(date.getTime())) return null;
  
  return sanitized;
}

// Validate enum value
export function validateEnum<T extends string>(value: any, allowedValues: readonly T[]): T | null {
  if (!value) return null;
  
  // For enum validation, we just trim and check length without removing special characters
  // This allows Spanish characters like tildes (á, é, í, ó, ú, ñ, etc.)
  const trimmed = String(value).trim();
  
  if (!trimmed || trimmed.length > 100) return null;
  
  if (allowedValues.includes(trimmed as T)) {
    return trimmed as T;
  }
  
  return null;
}

// Validate CI (Venezuelan ID)
export function validateCI(ci: string | null | undefined): string | null {
  if (!ci) return null;
  
  const sanitized = sanitizeString(ci, 20);
  if (!sanitized) return null;
  
  // Remove any non-digit characters
  const digitsOnly = sanitized.replace(/\D/g, '');
  
  // Venezuelan CI should be 6-8 digits
  if (digitsOnly.length < 6 || digitsOnly.length > 10) return null;
  
  return digitsOnly;
}

// Validate phone number
export function validatePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  const sanitized = sanitizeString(phone, 20);
  if (!sanitized) return null;
  
  // Remove any non-digit characters except + and -
  const cleaned = sanitized.replace(/[^\d+\-]/g, '');
  
  if (cleaned.length < 7 || cleaned.length > 20) return null;
  
  return cleaned;
}

// Validate score (1-5 for evaluations)
export function validateScore(score: any): number | null {
  return validateInteger(score, 1, 5);
}

// Validate month (1-12)
export function validateMonth(month: any): number | null {
  return validateInteger(month, 1, 12);
}

// Validate year (reasonable range)
export function validateYear(year: any): number | null {
  const currentYear = new Date().getFullYear();
  return validateInteger(year, 2000, currentYear + 10);
}

// Validate money amount (positive, max 2 decimals)
export function validateMoneyAmount(amount: any, maxAmount: number = 999999999): number | null {
  const parsed = validateFloat(amount, 0, maxAmount);
  if (parsed === null) return null;
  
  // Round to 2 decimals
  return Math.round(parsed * 100) / 100;
}

// Validate and sanitize text with length limits
export function validateText(text: string | null | undefined, minLength: number = 1, maxLength: number = 5000): string | null {
  if (!text) return null;
  
  const sanitized = sanitizeString(text, maxLength);
  if (!sanitized) return null;
  
  if (sanitized.length < minLength) return null;
  
  return sanitized;
}
