// API Configuration
// In production (CloudFront), API calls go through the same domain
// In development, we use the proxy configured in vite.config.ts

export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
export const AUTH_BASE_URL = import.meta.env.VITE_AUTH_URL || '';

// For staging/prod, these will be empty and use relative URLs
// CloudFront proxies /api/* and /auth/* to the respective Lambda functions
