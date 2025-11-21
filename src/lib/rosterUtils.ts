import { Course } from '../types';

/**
 * Normalizes the studentIds column that can arrive as JSON strings,
 * comma separated values, or already parsed arrays.
 */
export const normalizeStudentIds = (input: Course['studentIds']): string[] => {
  if (Array.isArray(input)) {
    return input
      .map((value) => `${value}`.trim())
      .filter((value) => value.length > 0);
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((value) => `${value}`.trim())
          .filter((value) => value.length > 0);
      }
    } catch {
      // not JSON, fall back to delimiter parsing
    }

    return trimmed
      .split(',')
      .map((value) => value.replace(/[\[\]\{\}"]/g, '').trim())
      .filter((value) => value.length > 0);
  }

  return [];
};
