# Virtual Event Management API

A RESTful backend system for managing virtual events, user authentication, event scheduling, and participant registration.

## Features

- User registration
- Secure password hashing using bcrypt
- JWT-based authentication
- Organizer and attendee roles
- Event CRUD operations
- Event participant registration
- In-memory data storage
- Email notification after successful event registration
- RESTful API structure
- Postman collection for API testing

## Technology Stack

- Node.js
- Express.js
- bcrypt
- JSON Web Token (JWT)
- Nodemailer
- dotenv
- Node.js `crypto.randomUUID()`
- In-memory arrays

## Project Structure

```text
virtual-event-api/
│
├── controllers/
│   ├── authController.js
│   └── eventController.js
│
├── middleware/
│   ├── authMiddleware.js
│   └── roleMiddleware.js
│
├── routes/
│   ├── authRoutes.js
│   └── eventRoutes.js
│
├── data/
│   ├── users.js
│   └── events.js
│
├── services/
│   └── emailService.js
│
├── .env
├── .gitignore
├── server.js
├── package.json
└── Virtual-Event-Management-API.postman_collection.json
```

## Installation

Clone or download the project and open the project directory:

```bash
cd virtual-event-api
```

Install dependencies:

```bash
npm install
```

If dependencies have not been installed yet:

```bash
npm install express bcrypt jsonwebtoken dotenv nodemailer
```

For development:

```bash
npm install --save-dev nodemon
```

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000

JWT_SECRET=my_super_secret_key_123

EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_google_app_password
```

Do not commit `.env` to GitHub.

Example `.gitignore`:

```text
node_modules
.env
```

### Gmail configuration

For Gmail, use a Google App Password rather than your normal Gmail password when configuring Nodemailer.

If you do not want to configure email immediately, you can temporarily test the rest of the API first.

## Run the Application

Start normally:

```bash
node server.js
```

Or, if the `dev` script is configured:

```bash
npm run dev
```

Expected output:

```text
Server running on port 3000
```

## Health Check

```http
GET /health
```

Example:

```text
http://localhost:3000/health
```

Expected response:

```json
{
  "message": "Virtual Event API is running"
}
```

# API Documentation

Base URL:

```text
http://localhost:3000
```

## 1. Register User

### Endpoint

```http
POST /register
```

### Request Body

Organizer:

```json
{
  "name": "John Organizer",
  "email": "organizer@example.com",
  "password": "Password123",
  "role": "organizer"
}
```

Attendee:

```json
{
  "name": "Jane Attendee",
  "email": "attendee@example.com",
  "password": "Password123",
  "role": "attendee"
}
```

### Response

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "generated-id",
    "name": "John Organizer",
    "email": "organizer@example.com",
    "role": "organizer"
  }
}
```

Passwords are stored as bcrypt hashes and are never returned in the response.

---

## 2. Login

### Endpoint

```http
POST /login
```

### Request Body

```json
{
  "email": "organizer@example.com",
  "password": "Password123"
}
```

### Response

```json
{
  "message": "Login successful",
  "token": "JWT_TOKEN"
}
```

Save the token and send it with protected requests:

```text
Authorization: Bearer JWT_TOKEN
```

---

# Event APIs

## 3. Get All Events

### Endpoint

```http
GET /events
```

Authentication required.

### Header

```text
Authorization: Bearer JWT_TOKEN
```

---

## 4. Create Event

Only organizers can create events.

### Endpoint

```http
POST /events
```

### Headers

```text
Authorization: Bearer ORGANIZER_TOKEN
Content-Type: application/json
```

### Request Body

```json
{
  "title": "Node.js Workshop",
  "date": "2026-10-15",
  "time": "10:00",
  "description": "Introduction to Node.js and Express"
}
```

### Event Model

```json
{
  "id": "event-id",
  "title": "Node.js Workshop",
  "date": "2026-10-15",
  "time": "10:00",
  "description": "Introduction to Node.js and Express",
  "organizerId": "user-id",
  "participants": []
}
```

---

## 5. Get Event By ID

### Endpoint

```http
GET /events/:id
```

Example:

```text
GET /events/123
```

Authentication required.

---

## 6. Update Event

Only the organizer who created the event can update it.

### Endpoint

```http
PUT /events/:id
```

### Request Body

```json
{
  "title": "Advanced Node.js Workshop",
  "date": "2026-10-16",
  "time": "11:00",
  "description": "Advanced Node.js and REST API concepts"
}
```

---

## 7. Delete Event

Only the organizer who created the event can delete it.

### Endpoint

```http
DELETE /events/:id
```

Authentication required.

---

# Participant APIs

## 8. Register For Event

### Endpoint

```http
POST /events/:id/register
```

Authentication required.

### Header

```text
Authorization: Bearer ATTENDEE_TOKEN
```

When registration succeeds:

1. The attendee ID is added to the event's `participants` array.
2. An email notification is sent using Nodemailer.
3. The API returns a successful registration response.

Example response:

```json
{
  "message": "Successfully registered for event",
  "eventId": "event-id"
}
```

Duplicate registration is rejected:

```json
{
  "message": "Already registered for this event"
}
```

---

# Authorization

The application uses two roles.

## Organizer

Organizers can:

- Create events
- Update their own events
- Delete their own events
- View events
- Register for events

## Attendee

Attendees can:

- View events
- View event details
- Register for events

Attendees cannot create, update, or delete events.

## Authentication Flow

```text
Register
   |
   v
User stored with bcrypt password hash
   |
   v
Login
   |
   v
JWT token generated
   |
   v
Client sends:
Authorization: Bearer <token>
   |
   v
JWT middleware verifies token
   |
   v
Role middleware checks permissions
   |
   v
Controller executes request
```

# Postman Testing Order

Import:

```text
Virtual-Event-Management-API.postman_collection.json
```

Then execute requests in this order:

```text
1. Health Check

2. Register Organizer
3. Login Organizer

4. Register Attendee
5. Login Attendee

6. Create Event - Organizer
7. Get All Events
8. Get Event By ID
9. Update Event - Organizer

10. Register For Event - Attendee

11. Delete Event - Organizer
```

The Postman collection automatically saves:

- Organizer JWT into `organizerToken`
- Attendee JWT into `attendeeToken`
- Created event ID into `eventId`

This makes subsequent requests easier to test.

# In-Memory Storage

The application uses arrays instead of a database:

```javascript
const users = [];
```

and:

```javascript
const events = [];
```

Therefore, all data is lost whenever the Node.js server restarts.

This is acceptable for the current assignment because the requirement specifies in-memory storage.

For a production application, these arrays should be replaced with a database such as PostgreSQL or MongoDB.

# Error Handling

Common HTTP responses:

| Status | Meaning |
|---|---|
| 200 | Request successful |
| 201 | Resource created |
| 400 | Invalid request |
| 401 | Authentication required / invalid token |
| 403 | Insufficient permission |
| 404 | Resource not found |
| 409 | Duplicate registration/user |
| 500 | Server error |

# Security

The application uses:

- bcrypt for password hashing
- JWT for authentication
- Role-based authorization
- Environment variables for secrets
- `.gitignore` to prevent `.env` from being committed

Never commit real passwords, JWT secrets, or email credentials to GitHub.

# Git Commands

Initialize Git:

```bash
git init
```

Add files:

```bash
git add .
```

Commit:

```bash
git commit -m "Build virtual event management API"
```

Add your GitHub repository:

```bash
git remote add origin YOUR_GITHUB_REPOSITORY_URL
```

Push:

```bash
git branch -M main
git push -u origin main
```

## Assignment Requirements Checklist

- [x] Node.js project initialized
- [x] Express.js API
- [x] In-memory user storage
- [x] In-memory event storage
- [x] bcrypt password hashing
- [x] JWT authentication
- [x] Organizer/attendee roles
- [x] Event creation
- [x] Event retrieval
- [x] Event update
- [x] Event deletion
- [x] Event registration
- [x] Participant list management
- [x] Email notification
- [x] async/await
- [x] RESTful endpoints
- [x] Postman collection
