/**
 * Utility functions for formatting dates correctly without timezone issues
 */

/**
 * Formats a date string in Spanish format (DD de MMMM de YYYY)
 * Handles dates in UTC to avoid timezone conversion issues
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "No especificada";
  
  try {
    // If the date is just YYYY-MM-DD without time, treat it as UTC midnight
    const date = dateString.includes(' ') || dateString.includes('T') 
      ? new Date(dateString) 
      : new Date(dateString + 'T00:00:00Z');
    
    if (isNaN(date.getTime())) {
      return "Fecha inválida";
    }
    
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    const day = date.getUTCDate();
    const month = months[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    
    return `${day} de ${month} de ${year}`;
  } catch {
    return "Fecha inválida";
  }
}

/**
 * Formats a date string in short Spanish format (DD/MM/YYYY)
 * Handles dates in UTC to avoid timezone conversion issues
 */
export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return "No especificada";
  
  try {
    const date = dateString.includes(' ') || dateString.includes('T') 
      ? new Date(dateString) 
      : new Date(dateString + 'T00:00:00Z');
    
    if (isNaN(date.getTime())) {
      return "Fecha inválida";
    }
    
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    
    return `${day}/${month}/${year}`;
  } catch {
    return "Fecha inválida";
  }
}

/**
 * Formats a birthday (only day and month, without year)
 */
export function formatBirthday(dateString: string | null | undefined): string {
  if (!dateString) return "No especificada";
  
  try {
    const date = new Date(dateString + 'T00:00:00Z');
    
    if (isNaN(date.getTime())) {
      return "Fecha inválida";
    }
    
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    const day = date.getUTCDate();
    const month = months[date.getUTCMonth()];
    
    return `${day} de ${month}`;
  } catch {
    return "Fecha inválida";
  }
}

/**
 * Formats a date with long month name (for reports and detailed views)
 * Example: "15 de noviembre de 2025"
 */
export function formatDateLong(dateString: string | null | undefined): string {
  return formatDate(dateString);
}

/**
 * Formats just the year from a date string
 */
export function formatYear(dateString: string | null | undefined): string {
  if (!dateString) return "";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return String(date.getUTCFullYear());
  } catch {
    return "";
  }
}
