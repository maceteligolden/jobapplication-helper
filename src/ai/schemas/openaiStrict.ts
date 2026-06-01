/**
 * Helpers for Zod schemas compatible with OpenAI strict structured output.
 * OpenAI requires every property to appear in `required`; use defaults/nullable instead of .optional().
 */
import { z } from 'zod';

export const strictString = () => z.string().default('');
export const strictStringArray = () => z.array(z.string()).default([]);
export const strictBool = () => z.boolean().default(false);

/** Inline enum for OpenAI structured output — do not chain .default() on a reused z.enum ref. */
export const strictDatePrecision = () =>
  z.enum(['month', 'year', 'unknown'] as const);
