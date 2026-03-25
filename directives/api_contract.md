# Vyaapar Mitra API — Contract

**Base URL (Local):** `http://localhost:8000`  
**Base URL (Production):** `https://your-deploy-url`  
**API Version:** `v1`  
**Prefix:** `/api/v1`

## Authentication

All protected routes require:
```
Authorization: Bearer <access_token>
```

## Response Format (ALL endpoints)

```json
{
  "success": true,
  "data": {},
  "message": "Human-readable string"
}
```

---

## 1. Authentication

### POST /api/v1/auth/signup

**Description:** Register a new user account.  
**Auth:** ❌ Not required

**Request Body:**
```json
{
  "email": "ramesh@myshop.com",
  "password": "securepass123",
  "name": "Ramesh Sharma"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGci...",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": {
      "id": "uuid",
      "email": "ramesh@myshop.com",
      "name": "Ramesh Sharma",
      "is_active": true,
      "created_at": "2026-03-24T00:00:00Z"
    }
  },
  "message": "Account created successfully"
}
```

**Errors:** `409 Conflict` — email already exists

---

### POST /api/v1/auth/login

**Description:** Login and receive access token.  
**Auth:** ❌ Not required

**Request Body:**
```json
{
  "email": "ramesh@myshop.com",
  "password": "securepass123"
}
```

**Response 200:** Same shape as signup.  
**Errors:** `401 Unauthorized` — invalid credentials

---

### GET /api/v1/auth/me

**Description:** Get current user profile.  
**Auth:** ✅ Required

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "ramesh@myshop.com",
    "name": "Ramesh Sharma",
    "is_active": true,
    "created_at": "2026-03-24T00:00:00Z"
  },
  "message": "User profile retrieved"
}
```

---

## 2. Products

### GET /api/v1/products

**Description:** List user's products (paginated).  
**Auth:** ✅ Required  
**Query Params:** `skip` (default 0), `limit` (default 50, max 200)

**curl:**
```bash
curl -H "Authorization: Bearer <token>" \
     "http://localhost:8000/api/v1/products?skip=0&limit=20"
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Masala Dosa",
      "category": "Food",
      "price": 80.0,
      "quantity": 100,
      "sku": "FOOD-001",
      "description": "South Indian crispy dosa",
      "is_active": true,
      "created_at": "2026-03-24T00:00:00Z",
      "updated_at": null
    }
  ],
  "message": "1 product(s) found"
}
```

---

### POST /api/v1/products

**Description:** Create a new product.  
**Auth:** ✅ Required  
**Status:** 201 Created

**Request Body:**
```json
{
  "name": "Masala Dosa",
  "category": "Food",
  "price": 80.0,
  "quantity": 100,
  "sku": "FOOD-001",
  "description": "South Indian crispy dosa"
}
```

---

### PUT /api/v1/products/{id}

**Description:** Partially update a product (only send changed fields).  
**Auth:** ✅ Required

**Request Body (partial):**
```json
{ "price": 95.0, "quantity": 150 }
```

**Errors:** `404` — product not found

---

### DELETE /api/v1/products/{id}

**Description:** Soft-delete a product (marks inactive, not removed from DB).  
**Auth:** ✅ Required

---

## 3. Upload

### POST /api/v1/upload/csv

**Description:** Upload a sales CSV for processing and analytics.  
**Auth:** ✅ Required  
**Content-Type:** `multipart/form-data`

**curl:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "file=@sales.csv" \
  "http://localhost:8000/api/v1/upload/csv"
```

**Supported CSV Columns (auto-detected):**

| Column Type | Accepted Names |
|-------------|---------------|
| Date        | date, order_date, sale_date |
| Product     | product, product_name, item |
| Category    | category, type, department |
| Price       | price, unit_price, amount |
| Quantity    | quantity, qty, units |
| Revenue     | revenue, total, sales_amount |

**Response 200:** Full analytics object (same as /analytics/summary)

---

## 4. Analytics

### GET /api/v1/analytics/summary

**Description:** Full analytics from user's sales data.  
**Auth:** ✅ Required

**Response 200:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_revenue": "₹1,25,000",
      "total_orders": "500",
      "net_profit": "₹22,500",
      "avg_order_value": "₹250",
      "revenue_change": "+12.5%"
    },
    "top_products": [...],
    "category_data": [...],
    "revenue_data": [...],
    "revenue_forecast": [...],
    "gst_estimate": {...},
    "recommendations": [...]
  },
  "message": "Analytics computed successfully"
}
```

---

### GET /api/v1/analytics/trends

**Description:** Lightweight trends + forecast data for mobile charts.  
**Auth:** ✅ Required

**Response 200:**
```json
{
  "success": true,
  "data": {
    "revenue_data": [...],
    "revenue_forecast": [...],
    "comparison_data": [...],
    "category_trend": [...]
  },
  "message": "Trends retrieved"
}
```

---

## 5. Health

### GET /

Public health check — confirm API is alive.

### GET /api/v1/health

Returns system status including rate limit config.

---

## Rate Limiting

- **60 requests per minute** per IP address.
- Exceeding this returns `429 Too Many Requests`.

## Error Responses

All errors follow the standard envelope:
```json
{
  "success": false,
  "data": null,
  "message": "Specific error description"
}
```
