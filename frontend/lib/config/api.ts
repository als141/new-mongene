export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
  get API_URL() {
    return `${this.BASE_URL}/api/v1`;
  },
} as const;
