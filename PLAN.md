# Production Readiness Audit

## Context

Make MegaOrganize production-ready by fixing security issues, code inconsistencies, and deployment problems. Excluding SQLite limitations and caching (per user request).

## Critical Issues Found

### 1. Dockerfile Runs Dev Mode (CRITICAL)

**File**: `Dockerfile`, `entrypoint.sh`

- Current: `exec bun run dev --host 0.0.0.0`
- Problem: Dev server is not secure, slow, exposes source maps
- Fix: Build and use production server with `adapter-node`

### 2. No Content Security Policy (SECURITY)

**File**: `src/hooks.server.ts`

- Missing CSP headers allow XSS attacks
- Fix: Add CSP header to security headers

### 3. File Upload Validation (SECURITY)

**File**: `src/lib/server/services/attachment.service.ts`

- Only checks file size, not mime type
- No validation on storedName (though UUID is safe)
- Fix: Add allowed mime types list, validate extensions

### 4. No Request Body Size Limit (PERFORMANCE)

- API endpoints don't limit request body size
- Could lead to memory exhaustion
- Fix: Add body size check in hooks or per-route

### 5. Rate Limiting Only on Auth (SECURITY)

- Only login/register have rate limiting
- API endpoints are unprotected
- Fix: Add rate limiting to all API routes

### 6. Error Messages Leak Info (SECURITY)

- Some error messages expose internal details
- Fix: Generic error messages in production

## Code Inconsistencies Found

### 7. Inconsistent Error Handling

- Some services throw, some return error objects
- Fix: Standardize error handling pattern

### 8. Missing Input Sanitization

- Markdown is sanitized via DOMPurify (good)
- But some text inputs aren't sanitized
- Fix: Sanitize user inputs before storage

### 9. No Request Validation on GET Endpoints

- POST/PUT have validation via `validateBody()`
- GET query params are used directly
- Fix: Validate query parameters

### 10. Database Transactions

- Some multi-step operations aren't atomic
- Fix: Use transactions for related operations

## Files to Modify

### Critical Fixes

1. `Dockerfile` - Production build
2. `entrypoint.sh` - Production start
3. `src/hooks.server.ts` - CSP headers, body size limit
4. `src/lib/server/services/attachment.service.ts` - File validation

### Security Hardening

5. `src/lib/server/rate-limit.ts` - Generic rate limiter
6. `src/lib/server/api-helpers.ts` - Add rate limiting helper
7. `src/lib/server/validate.ts` - Add query param validation

### Code Quality

8. Multiple service files - Standardize error handling
9. Multiple API routes - Add input validation

## Steps

- [x] Step 1: Fix Dockerfile for production build
- [x] Step 2: Add CSP and security headers
- [x] Step 3: Add file upload validation
- [x] Step 4: Add API rate limiting
- [x] Step 5: Add request body size limit
- [x] Step 6: Standardize error handling
- [x] Step 7: Add input sanitization
- [x] Step 8: Test production build

## Verification

1. `bun run build` succeeds
2. Docker build works
3. Security headers present in responses
4. File upload rejects invalid types
5. Rate limiting works on API
6. No sensitive data in error messages
