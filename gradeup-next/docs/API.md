# GradeUp NIL API Documentation

This document provides comprehensive documentation for the GradeUp NIL REST API, covering all available endpoints, authentication requirements, request/response schemas, and error handling.

## Table of Contents

- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Pagination](#pagination)
- [Rate Limiting](#rate-limiting)
- [API Endpoints](#api-endpoints)
  - [Athletes](#athletes)
  - [Deals](#deals)
  - [Campaigns](#campaigns)
  - [Webhooks](#webhooks)

---

## Authentication

GradeUp NIL uses Supabase authentication with cookie-based sessions. All authenticated endpoints require a valid session cookie.

### How Authentication Works

1. **Session Creation**: Users authenticate via Supabase Auth (email/password, OAuth providers)
2. **Cookie Storage**: Session tokens are stored in HTTP-only cookies managed by Supabase SSR
3. **Request Authentication**: The API reads the session from cookies on each request

### Authentication Header

No explicit `Authorization` header is required. The API automatically extracts the user session from cookies.

### Obtaining a Session

```javascript
// Using Supabase client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sign in with email/password
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
```

### Authentication Errors

| Status Code | Error Message | Description |
|-------------|---------------|-------------|
| 401 | Unauthorized | No valid session found or session expired |
| 403 | Forbidden | User lacks permission for the requested resource |

---

## Error Handling

### Standard Error Response

All API errors follow this format:

```json
{
  "error": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success - Request completed successfully |
| 201 | Created - Resource created successfully |
| 204 | No Content - Resource deleted successfully |
| 400 | Bad Request - Invalid input or validation error |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource does not exist |
| 500 | Internal Server Error - Server-side error |

### Validation Errors

When input validation fails, the API returns a 400 status with a formatted message:

```json
{
  "error": "Validation failed: title: This field is required; compensation_amount: Number must be greater than or equal to 0"
}
```

---

## Pagination

All list endpoints support pagination with the following query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `page_size` | integer | 10 | Number of items per page |

### Paginated Response Format

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "page_size": 10,
    "total": 100,
    "total_pages": 10
  }
}
```

---

## Rate Limiting

Rate limiting is handled at the infrastructure level (Supabase/Vercel). Current limits:

- **Anonymous requests**: 100 requests per minute
- **Authenticated requests**: 1000 requests per minute

When rate limited, the API returns a `429 Too Many Requests` response.

---

## API Endpoints

---

## Athletes

### GET /api/athletes

Retrieve a paginated list of searchable athletes.

**Authentication**: Optional (public athletes only)

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `page_size` | integer | Items per page (default: 10) |
| `sport_ids` | string | Comma-separated list of sport UUIDs |
| `school_ids` | string | Comma-separated list of school UUIDs |
| `min_gpa` | number | Minimum GPA filter (0.0 - 4.0) |
| `search` | string | Search term for major, position, or hometown |

**Response**: `200 OK`

```json
{
  "athletes": [
    {
      "id": "uuid",
      "profile_id": "uuid",
      "school_id": "uuid",
      "sport_id": "uuid",
      "position": "Quarterback",
      "jersey_number": "12",
      "academic_year": "junior",
      "gpa": 3.8,
      "major": "Business Administration",
      "hometown": "Austin, TX",
      "height_inches": 74,
      "weight_lbs": 210,
      "is_searchable": true,
      "nil_valuation": 50000,
      "social_followers": 15000,
      "instagram_handle": "athlete123",
      "twitter_handle": "athlete123",
      "tiktok_handle": "athlete123",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:00:00Z",
      "profile": {
        "first_name": "John",
        "last_name": "Smith",
        "avatar_url": "https://example.com/avatar.jpg",
        "bio": "Student athlete at State University"
      },
      "school": {
        "id": "uuid",
        "name": "State University",
        "logo_url": "https://example.com/logo.png",
        "division": "D1"
      },
      "sport": {
        "id": "uuid",
        "name": "Football",
        "icon": "football"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 10,
    "total": 150,
    "total_pages": 15
  }
}
```

**Example Request**:

```bash
curl -X GET "https://api.gradeupnil.com/api/athletes?page=1&page_size=20&min_gpa=3.0&sport_ids=uuid1,uuid2"
```

---

### POST /api/athletes

Create a new athlete profile for the authenticated user.

**Authentication**: Required

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `school_id` | uuid | Yes | UUID of the athlete's school |
| `sport_id` | uuid | Yes | UUID of the athlete's sport |
| `position` | string | No | Playing position (max 100 chars) |
| `jersey_number` | string | No | Jersey number (max 10 chars) |
| `academic_year` | enum | No | One of: `freshman`, `sophomore`, `junior`, `senior`, `graduate`, `redshirt_freshman`, `redshirt_sophomore`, `redshirt_junior`, `redshirt_senior` |
| `gpa` | number | No | Grade point average (0.0 - 4.0) |
| `major` | string | No | Academic major (max 200 chars) |
| `hometown` | string | No | Hometown (max 200 chars) |
| `height_inches` | integer | No | Height in inches (36 - 108) |
| `weight_lbs` | integer | No | Weight in pounds (50 - 500) |
| `is_searchable` | boolean | No | Whether profile is publicly searchable (default: true) |

**Request Example**:

```json
{
  "school_id": "123e4567-e89b-12d3-a456-426614174000",
  "sport_id": "987fcdeb-51a2-43e8-b8c9-123456789abc",
  "position": "Point Guard",
  "academic_year": "junior",
  "gpa": 3.75,
  "major": "Sports Management",
  "hometown": "Chicago, IL",
  "height_inches": 72,
  "weight_lbs": 185,
  "is_searchable": true
}
```

**Response**: `201 Created`

```json
{
  "id": "uuid",
  "profile_id": "uuid",
  "school_id": "uuid",
  "sport_id": "uuid",
  "position": "Point Guard",
  "academic_year": "junior",
  "gpa": 3.75,
  "major": "Sports Management",
  "hometown": "Chicago, IL",
  "height_inches": 72,
  "weight_lbs": 185,
  "is_searchable": true,
  "created_at": "2024-01-15T10:30:00Z",
  "profile": {...},
  "school": {...},
  "sport": {...}
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation failed | Invalid input data |
| 401 | Unauthorized | Not authenticated |

---

### GET /api/athletes/:id

Retrieve a specific athlete by ID.

**Authentication**: Optional

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Athlete's unique identifier |

**Response Behavior**:

- **Authenticated users**: Full athlete data including email, GPA, contact info
- **Unauthenticated users**: Limited public fields only (if `is_searchable` is true)

**Response (Authenticated)**: `200 OK`

```json
{
  "id": "uuid",
  "profile_id": "uuid",
  "school_id": "uuid",
  "sport_id": "uuid",
  "position": "Quarterback",
  "jersey_number": "12",
  "academic_year": "senior",
  "gpa": 3.9,
  "major": "Finance",
  "hometown": "Dallas, TX",
  "height_inches": 75,
  "weight_lbs": 220,
  "is_searchable": true,
  "nil_valuation": 75000,
  "social_followers": 25000,
  "instagram_handle": "qb12",
  "twitter_handle": "qb12",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-20T00:00:00Z",
  "profile": {
    "first_name": "Michael",
    "last_name": "Johnson",
    "avatar_url": "https://example.com/avatar.jpg",
    "bio": "4-year starter, Dean's List",
    "email": "mjohnson@university.edu"
  },
  "school": {...},
  "sport": {...}
}
```

**Response (Unauthenticated)**: `200 OK`

```json
{
  "id": "uuid",
  "position": "Quarterback",
  "academic_year": "senior",
  "is_searchable": true,
  "nil_valuation": 75000,
  "social_followers": 25000,
  "profile": {
    "first_name": "Michael",
    "last_name": "Johnson",
    "avatar_url": "https://example.com/avatar.jpg"
  },
  "school": {
    "id": "uuid",
    "name": "State University",
    "logo_url": "https://example.com/logo.png",
    "division": "D1"
  },
  "sport": {
    "id": "uuid",
    "name": "Football",
    "icon": "football"
  }
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 404 | Athlete not found | Athlete does not exist or is not searchable (for unauthenticated users) |

---

### PATCH /api/athletes/:id

Update an athlete's profile. Users can only update their own athlete profile.

**Authentication**: Required

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Athlete's unique identifier |

**Request Body**:

All fields are optional:

| Field | Type | Description |
|-------|------|-------------|
| `school_id` | uuid | School UUID |
| `sport_id` | uuid | Sport UUID |
| `position` | string | Playing position |
| `jersey_number` | string | Jersey number |
| `academic_year` | enum | Academic year |
| `gpa` | number | GPA (0.0 - 4.0) |
| `major` | string | Major |
| `hometown` | string | Hometown |
| `height_inches` | integer | Height in inches |
| `weight_lbs` | integer | Weight in pounds |
| `is_searchable` | boolean | Public visibility |
| `nil_valuation` | number | NIL valuation (0 - 100,000,000) |
| `social_followers` | integer | Total social media followers |
| `instagram_handle` | string | Instagram username (max 30 chars) |
| `twitter_handle` | string | Twitter/X username (max 15 chars) |
| `tiktok_handle` | string | TikTok username (max 24 chars) |

**Request Example**:

```json
{
  "gpa": 3.85,
  "nil_valuation": 60000,
  "social_followers": 20000,
  "is_searchable": true
}
```

**Response**: `200 OK`

Returns the updated athlete object with all relations.

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation failed | Invalid input data |
| 401 | Unauthorized | Not authenticated |
| 404 | Athlete not found or not authorized | Athlete doesn't exist or user doesn't own it |

---

### DELETE /api/athletes/:id

Delete an athlete's profile. Users can only delete their own athlete profile.

**Authentication**: Required

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Athlete's unique identifier |

**Response**: `204 No Content`

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Error message | Database error |
| 401 | Unauthorized | Not authenticated |

---

## Deals

### GET /api/deals

Retrieve a paginated list of deals for the authenticated user.

**Authentication**: Required

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `page_size` | integer | Items per page (default: 10) |
| `status` | string | Comma-separated statuses: `draft`, `pending`, `accepted`, `rejected`, `in_progress`, `completed`, `cancelled`, `disputed` |
| `deal_type` | string | Comma-separated types: `social_post`, `appearance`, `endorsement`, `licensing`, `autograph`, `camp`, `speaking`, `merchandise`, `other` |
| `athlete_id` | uuid | Filter by athlete |
| `brand_id` | uuid | Filter by brand |

**Response**: `200 OK`

```json
{
  "deals": [
    {
      "id": "uuid",
      "athlete_id": "uuid",
      "brand_id": "uuid",
      "opportunity_id": "uuid",
      "title": "Social Media Campaign",
      "description": "3 Instagram posts promoting product",
      "deal_type": "social_post",
      "compensation_amount": 2500,
      "compensation_type": "fixed",
      "start_date": "2024-02-01",
      "end_date": "2024-02-28",
      "deliverables": ["Instagram post 1", "Instagram post 2", "Story"],
      "status": "accepted",
      "notes": null,
      "contract_url": "https://example.com/contract.pdf",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-20T14:30:00Z",
      "accepted_at": "2024-01-18T09:00:00Z",
      "brand": {
        "id": "uuid",
        "company_name": "Nike",
        "logo_url": "https://example.com/nike.png"
      },
      "athlete": {
        "id": "uuid",
        "profile": {
          "first_name": "John",
          "last_name": "Smith",
          "avatar_url": "https://example.com/avatar.jpg"
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 10,
    "total": 25,
    "total_pages": 3
  }
}
```

**Example Request**:

```bash
curl -X GET "https://api.gradeupnil.com/api/deals?status=pending,accepted&deal_type=social_post" \
  -H "Cookie: sb-access-token=..."
```

---

### POST /api/deals

Create a new deal.

**Authentication**: Required

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `athlete_id` | uuid | Yes | Athlete's UUID |
| `brand_id` | uuid | Yes | Brand's UUID |
| `opportunity_id` | uuid | No | Associated opportunity UUID |
| `title` | string | Yes | Deal title (max 200 chars) |
| `description` | string | No | Deal description (max 5000 chars) |
| `deal_type` | enum | Yes | One of: `social_post`, `appearance`, `endorsement`, `licensing`, `autograph`, `camp`, `speaking`, `merchandise`, `other` |
| `compensation_amount` | number | Yes | Payment amount (0 - 100,000,000) |
| `compensation_type` | enum | No | One of: `fixed`, `hourly`, `per_post`, `revenue_share`, `product`, `hybrid` (default: `fixed`) |
| `start_date` | string | No | Start date (ISO 8601 or YYYY-MM-DD) |
| `end_date` | string | No | End date (ISO 8601 or YYYY-MM-DD) |
| `deliverables` | array | No | Array of deliverable strings (max 50 items, 500 chars each) |

**Request Example**:

```json
{
  "athlete_id": "123e4567-e89b-12d3-a456-426614174000",
  "brand_id": "987fcdeb-51a2-43e8-b8c9-123456789abc",
  "title": "Instagram Partnership",
  "description": "Monthly Instagram content partnership",
  "deal_type": "social_post",
  "compensation_amount": 5000,
  "compensation_type": "fixed",
  "start_date": "2024-03-01",
  "end_date": "2024-05-31",
  "deliverables": [
    "2 Instagram feed posts per month",
    "4 Instagram stories per month",
    "1 Reel per month"
  ]
}
```

**Response**: `201 Created`

Returns the created deal with brand and athlete relations.

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation failed | Invalid input data |
| 401 | Unauthorized | Not authenticated |

---

### GET /api/deals/:id

Retrieve a specific deal by ID.

**Authentication**: Required

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Deal's unique identifier |

**Response**: `200 OK`

```json
{
  "id": "uuid",
  "athlete_id": "uuid",
  "brand_id": "uuid",
  "title": "Social Media Campaign",
  "description": "Content creation partnership",
  "deal_type": "social_post",
  "compensation_amount": 2500,
  "compensation_type": "fixed",
  "start_date": "2024-02-01",
  "end_date": "2024-02-28",
  "deliverables": ["Post 1", "Post 2", "Story"],
  "status": "accepted",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-20T14:30:00Z",
  "accepted_at": "2024-01-18T09:00:00Z",
  "brand": {
    "id": "uuid",
    "company_name": "Nike",
    "logo_url": "https://example.com/nike.png",
    "contact_name": "Jane Doe",
    "contact_email": "jane@nike.com"
  },
  "athlete": {
    "id": "uuid",
    "profile": {
      "first_name": "John",
      "last_name": "Smith",
      "avatar_url": "https://example.com/avatar.jpg",
      "bio": "Student athlete"
    },
    "school": {...},
    "sport": {...}
  }
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Not authenticated |
| 404 | Deal not found | Deal does not exist |

---

### PATCH /api/deals/:id

Update a deal. Only the athlete or brand involved in the deal can update it.

**Authentication**: Required

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Deal's unique identifier |

**Request Body**:

All fields are optional:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Deal title |
| `description` | string | Deal description |
| `deal_type` | enum | Deal type |
| `compensation_amount` | number | Payment amount |
| `compensation_type` | enum | Compensation type |
| `start_date` | string | Start date |
| `end_date` | string | End date |
| `deliverables` | array | Deliverables list |
| `status` | enum | Deal status (automatically sets timestamps) |
| `notes` | string | Internal notes (max 2000 chars) |
| `contract_url` | string | URL to contract document |

**Status Transitions**:

When updating the status, the API automatically sets the appropriate timestamp:

- `accepted` -> Sets `accepted_at`
- `completed` -> Sets `completed_at`
- `cancelled` -> Sets `cancelled_at`

**Request Example**:

```json
{
  "status": "accepted",
  "notes": "Approved by marketing team"
}
```

**Response**: `200 OK`

Returns the updated deal object.

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation failed | Invalid input data |
| 401 | Unauthorized | Not authenticated |
| 403 | You do not have permission to modify this deal | User is not the athlete or brand on this deal |
| 404 | Deal not found | Deal does not exist |

---

### DELETE /api/deals/:id

Delete a deal. Only the athlete or brand involved can delete, and only deals with status `draft`, `cancelled`, or `rejected` can be deleted.

**Authentication**: Required

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Deal's unique identifier |

**Response**: `204 No Content`

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Cannot delete an active deal. Cancel it first. | Deal has an active status |
| 401 | Unauthorized | Not authenticated |
| 403 | Deal not found or you do not have permission to delete it | User is not authorized |

---

## Campaigns

### GET /api/campaigns

Retrieve a paginated list of campaigns.

**Authentication**: Required

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `page_size` | integer | Items per page (default: 10) |
| `brand_id` | uuid | Filter by brand (defaults to user's brand) |
| `status` | string | Comma-separated statuses: `draft`, `active`, `paused`, `completed`, `cancelled` |

**Response**: `200 OK`

```json
{
  "campaigns": [
    {
      "id": "uuid",
      "brand_id": "uuid",
      "title": "Summer Athlete Campaign",
      "description": "Partner with college athletes for summer promotion",
      "budget": 50000,
      "start_date": "2024-06-01",
      "end_date": "2024-08-31",
      "status": "active",
      "target_sports": ["uuid1", "uuid2"],
      "target_divisions": ["D1", "D2"],
      "target_min_gpa": 3.0,
      "target_min_followers": 5000,
      "created_at": "2024-05-01T10:00:00Z",
      "updated_at": "2024-05-15T14:30:00Z",
      "brand": {
        "id": "uuid",
        "company_name": "Nike",
        "logo_url": "https://example.com/nike.png"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 10,
    "total": 5,
    "total_pages": 1
  }
}
```

---

### POST /api/campaigns

Create a new campaign. Automatically associates with the authenticated user's brand.

**Authentication**: Required (must have a brand profile)

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Campaign title (max 200 chars) |
| `description` | string | No | Campaign description (max 5000 chars) |
| `budget` | number | Yes | Total budget (0 - 100,000,000) |
| `start_date` | string | Yes | Start date (ISO 8601 or YYYY-MM-DD) |
| `end_date` | string | No | End date (ISO 8601 or YYYY-MM-DD) |
| `status` | enum | No | One of: `draft`, `active`, `paused`, `completed`, `cancelled` (default: `draft`) |
| `target_sports` | array | No | Array of sport UUIDs (max 50) |
| `target_divisions` | array | No | Array of division strings (max 10) |
| `target_min_gpa` | number | No | Minimum athlete GPA (0.0 - 4.0) |
| `target_min_followers` | integer | No | Minimum social media followers |

**Request Example**:

```json
{
  "title": "Back to School Campaign",
  "description": "Partner with student athletes for fall semester promotion",
  "budget": 25000,
  "start_date": "2024-08-15",
  "end_date": "2024-12-15",
  "status": "draft",
  "target_sports": ["123e4567-e89b-12d3-a456-426614174000"],
  "target_divisions": ["D1"],
  "target_min_gpa": 3.0,
  "target_min_followers": 1000
}
```

**Response**: `201 Created`

Returns the created campaign with brand relation.

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation failed | Invalid input data |
| 401 | Unauthorized | Not authenticated |
| 404 | Brand not found | User does not have a brand profile |

---

### GET /api/campaigns/:id

Retrieve a specific campaign by ID with metrics.

**Authentication**: Required

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Campaign's unique identifier |

**Response**: `200 OK`

```json
{
  "id": "uuid",
  "brand_id": "uuid",
  "title": "Summer Athlete Campaign",
  "description": "Partner with college athletes",
  "budget": 50000,
  "start_date": "2024-06-01",
  "end_date": "2024-08-31",
  "status": "active",
  "target_sports": ["uuid1", "uuid2"],
  "target_divisions": ["D1"],
  "target_min_gpa": 3.0,
  "target_min_followers": 5000,
  "created_at": "2024-05-01T10:00:00Z",
  "updated_at": "2024-05-15T14:30:00Z",
  "brand": {
    "id": "uuid",
    "company_name": "Nike",
    "logo_url": "https://example.com/nike.png"
  },
  "metrics": {
    "spent": 15000,
    "athlete_count": 5,
    "deal_count": 8
  }
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Not authenticated |
| 404 | Campaign not found | Campaign does not exist |

---

### PATCH /api/campaigns/:id

Update a campaign. Only the brand owner can update their campaigns.

**Authentication**: Required

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Campaign's unique identifier |

**Request Body**:

All fields from the create schema are optional.

**Request Example**:

```json
{
  "status": "active",
  "budget": 75000
}
```

**Response**: `200 OK`

Returns the updated campaign object.

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation failed | Invalid input data |
| 401 | Unauthorized | Not authenticated |
| 404 | Campaign not found or not authorized | Campaign doesn't exist or user doesn't own it |

---

### DELETE /api/campaigns/:id

Delete a campaign. Only draft campaigns can be deleted.

**Authentication**: Required

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Campaign's unique identifier |

**Response**: `204 No Content`

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Cannot delete an active campaign. Set status to draft first. | Campaign is not in draft status |
| 401 | Unauthorized | Not authenticated |
| 404 | Brand not found | User does not have a brand profile |
| 404 | Campaign not found | Campaign does not exist or user doesn't own it |

---

## Webhooks

### POST /api/webhooks/stripe

Stripe webhook endpoint for payment event processing.

**Authentication**: Stripe signature verification

**Headers Required**:

| Header | Description |
|--------|-------------|
| `stripe-signature` | Stripe webhook signature for verification |

**Handled Events**:

| Event Type | Action |
|------------|--------|
| `payment_intent.succeeded` | Updates payment status to `completed` and sets `paid_at` |
| `payment_intent.payment_failed` | Updates payment status to `failed` |

**Request Body**: Raw Stripe event payload

**Response**: `200 OK`

```json
{
  "received": true
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid signature | Webhook signature verification failed |

---

## Type Definitions

### Academic Year Enum

```typescript
type AcademicYear =
  | 'freshman'
  | 'sophomore'
  | 'junior'
  | 'senior'
  | 'graduate'
  | 'redshirt_freshman'
  | 'redshirt_sophomore'
  | 'redshirt_junior'
  | 'redshirt_senior';
```

### Deal Type Enum

```typescript
type DealType =
  | 'social_post'
  | 'appearance'
  | 'endorsement'
  | 'licensing'
  | 'autograph'
  | 'camp'
  | 'speaking'
  | 'merchandise'
  | 'other';
```

### Deal Status Enum

```typescript
type DealStatus =
  | 'draft'
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';
```

### Compensation Type Enum

```typescript
type CompensationType =
  | 'fixed'
  | 'hourly'
  | 'per_post'
  | 'revenue_share'
  | 'product'
  | 'hybrid';
```

### Campaign Status Enum

```typescript
type CampaignStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// Using fetch
const response = await fetch('/api/athletes?page=1&min_gpa=3.0', {
  method: 'GET',
  credentials: 'include', // Include cookies for authentication
});

const { athletes, pagination } = await response.json();

// Creating a deal
const createDeal = await fetch('/api/deals', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    athlete_id: 'uuid',
    brand_id: 'uuid',
    title: 'Partnership Deal',
    deal_type: 'social_post',
    compensation_amount: 1000,
  }),
});
```

### cURL

```bash
# List athletes with filters
curl -X GET "https://api.gradeupnil.com/api/athletes?page=1&page_size=20&min_gpa=3.5" \
  -H "Cookie: sb-access-token=YOUR_TOKEN"

# Create a new campaign
curl -X POST "https://api.gradeupnil.com/api/campaigns" \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "title": "Spring Campaign",
    "budget": 10000,
    "start_date": "2024-03-01",
    "status": "draft"
  }'
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-15 | Initial API release |

---

*Last updated: February 2024*
