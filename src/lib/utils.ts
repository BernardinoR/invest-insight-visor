import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely parse a competencia string (MM/YYYY format) to a Date object
 * Returns epoch date (1970-01-01) for invalid inputs
 */
export function parseCompetenciaToDate(competencia: string | null | undefined): Date {
  if (!competencia || typeof competencia !== 'string' || !competencia.includes('/')) {
    return new Date(0); // Epoch date for invalid competencias
  }
  const parts = competencia.split('/');
  if (parts.length !== 2) {
    return new Date(0);
  }
  const [month, year] = parts.map(Number);
  if (isNaN(month) || isNaN(year)) {
    return new Date(0);
  }
  const fullYear = year < 100 ? 2000 + year : year;
  return new Date(fullYear, month - 1);
}

/**
 * Type guard to check if a value is a valid competencia string
 */
export function isValidCompetencia(competencia: any): competencia is string {
  return competencia && 
         typeof competencia === 'string' && 
         competencia.includes('/') &&
         competencia.split('/').length === 2;
}
