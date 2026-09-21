export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 60 * 15, // 15 minutes in seconds
  REFRESH_TOKEN: 60 * 60 * 2, // 2 hours in seconds
} as const;

export const CACHE_TTL = {
  FIVE_MINUTE: 60 * 5, // 5 minutes
  THIRTY_HOUR: 60 * 30, // 30 minutes
  ONE_HOUR: 60 * 60, // 1 hour
  THREE_HOUR: 60 * 60 * 3, // 3 hour
  TWENTY_FOUR_HOUR: 60 * 60 * 24, // 24 hours
} as const;

export const USER_ROLES = {
  USER: "user",
  ADMIN: "admin",
} as const;

export const AUTH_PROVIDERS = {
  SYSTEM: "system",
  GOOGLE: "google",
} as const;

export const QUEUE_NAMES = {
  EMAIL: "email",
} as const;
