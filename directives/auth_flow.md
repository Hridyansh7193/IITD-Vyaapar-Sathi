# Vyaapar Mitra API — Auth Flow

## Overview

Authentication uses **JWT (JSON Web Tokens)** with bcrypt password hashing.
All protected endpoints require the `Authorization: Bearer <token>` header.

---

## Flow Diagram

```
Mobile App / Client
       │
       │ POST /api/v1/auth/signup  (email + password)
       ▼
   [Vyaapar API]
       │
       ├─ Hash password with bcrypt
       ├─ Store user in SQLite DB
       ├─ Generate signed JWT (HS256, 24hr expiry)
       │
       └─► Return { access_token, user_profile }
       
       │
       │ POST /api/v1/auth/login  (email + password)
       ▼
   [Vyaapar API]
       │
       ├─ Fetch user by email from DB
       ├─ Verify bcrypt hash
       ├─ Generate new JWT
       │
       └─► Return { access_token, user_profile }

       │
       │ GET /api/v1/products  (Authorization: Bearer <token>)
       ▼
   [RateLimiterMiddleware]
       │
   [ErrorHandlerMiddleware]
       │
   [get_current_user dependency]
       │
       ├─ Extract Bearer token from header
       ├─ Decode + validate JWT signature
       ├─ Check expiry (exp claim)
       ├─ Load User from DB by sub (user_id)
       │
       └─► Inject User into route handler
```

---

## Token Format

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### JWT Payload

```json
{
  "sub": "uuid-of-user",
  "email": "user@example.com",
  "exp": 1234567890,
  "iat": 1234567890
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 401  | Missing, invalid, or expired token |
| 403  | Account is deactivated |
| 409  | Email already registered |

---

## Token Refresh

Currently tokens expire after **24 hours**. To refresh:
1. Call `POST /api/v1/auth/login` again with credentials.
2. Store the new `access_token`.

> **For production:** Implement a refresh token endpoint with a long-lived refresh token stored in an HttpOnly cookie.

---

## Security Notes

- Passwords are **never stored in plaintext** — only bcrypt hashes.
- JWT secret is loaded from `.env` — never hardcoded.
- All non-public endpoints use `Depends(get_current_user)`.
- Rate limiter prevents brute-force login attacks (60 req/min per IP).
