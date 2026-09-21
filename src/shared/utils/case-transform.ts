/**
 * Utility untuk transformasi casing: camelCase ↔ snake_case
 * Digunakan sebelum response dikirim agar format identik dengan existing api.
 */

/** camelCase → snake_case (rekursif, handles nested objects & arrays) */
export function toSnakeCase<T>(value: T): T {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) => toSnakeCase(item)) as unknown as T;
  }

  if (value instanceof Date) {
    return value
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d{3}Z$/, "") as unknown as T;
  }

  if (typeof value === "object" && value.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = toSnakeCase(val);
    }
    return result as unknown as T;
  }

  return value;
}

/** camelCase → snake_case (string) */
export function camelToSnake(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .replace(/([0-9])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

/** snake_case → camelCase (rekursif) */
export function toCamelCase<T>(value: T): T {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) => toCamelCase(item)) as unknown as T;
  }

  if (value instanceof Date) {
    return value as unknown as T;
  }

  if (typeof value === "object" && value.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const camelKey = snakeToCamel(key);
      result[camelKey] = toCamelCase(val);
    }
    return result as unknown as T;
  }

  return value;
}

/** snake_case → camelCase (string) */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
