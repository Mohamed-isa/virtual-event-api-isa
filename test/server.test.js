const request = require("supertest");

// Mock email service so tests do not send real emails
jest.mock("../services/emailService", () => ({
  sendRegistrationEmail: jest.fn().mockResolvedValue(true)
}));

const app = require("../server");

const users = require("../data/users");
const events = require("../data/events");

describe("Virtual Event Management API", () => {
  let organizerToken;
  let attendeeToken;
  let eventId;

  const organizer = {
    name: "Test Organizer",
    email: "organizer-test@example.com",
    password: "Password123",
    role: "organizer"
  };

  const attendee = {
    name: "Test Attendee",
    email: "attendee-test@example.com",
    password: "Password123",
    role: "attendee"
  };

  beforeEach(() => {
    // Clear in-memory data before every test
    users.length = 0;
    events.length = 0;

    organizerToken = null;
    attendeeToken = null;
    eventId = null;
  });

  // ---------------------------------------------------
  // HEALTH CHECK
  // ---------------------------------------------------

  test("GET /health - should return API running message", async () => {
    const response = await request(app)
      .get("/health");

    expect(response.statusCode).toBe(200);

    expect(response.body).toEqual({
      message: "Virtual Event API is running"
    });
  });

  // ---------------------------------------------------
  // USER REGISTRATION
  // ---------------------------------------------------

  test("POST /register - should register an organizer", async () => {
    const response = await request(app)
      .post("/register")
      .send(organizer);

    expect(response.statusCode).toBe(201);

    expect(response.body.message).toBe(
      "User registered successfully"
    );

    expect(response.body.user).toHaveProperty("id");
    expect(response.body.user.name).toBe(organizer.name);
    expect(response.body.user.email).toBe(organizer.email);
    expect(response.body.user.role).toBe("organizer");

    // Password should not be returned
    expect(response.body.user.password).toBeUndefined();

    // User should be stored
    expect(users.length).toBe(1);

    // Password should be hashed
    expect(users[0].password).not.toBe(organizer.password);
  });

  test("POST /register - should register an attendee", async () => {
    const response = await request(app)
      .post("/register")
      .send(attendee);

    expect(response.statusCode).toBe(201);

    expect(response.body.user.role).toBe("attendee");
    expect(response.body.user.email).toBe(attendee.email);
  });

  test("POST /register - should reject duplicate email", async () => {
    await request(app)
      .post("/register")
      .send(organizer);

    const response = await request(app)
      .post("/register")
      .send(organizer);

    expect(response.statusCode).toBe(409);

    expect(response.body.message).toBe(
      "User already exists"
    );
  });

  test("POST /register - should reject missing required fields", async () => {
    const response = await request(app)
      .post("/register")
      .send({
        name: "Test User"
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe(
      "Name, email and password are required"
    );
  });

  // ---------------------------------------------------
  // LOGIN
  // ---------------------------------------------------

  test("POST /login - should login organizer and return JWT token", async () => {
    await request(app)
      .post("/register")
      .send(organizer);

    const response = await request(app)
      .post("/login")
      .send({
        email: organizer.email,
        password: organizer.password
      });

    expect(response.statusCode).toBe(200);

    expect(response.body.message).toBe(
      "Login successful"
    );

    expect(response.body).toHaveProperty("token");

    expect(typeof response.body.token).toBe("string");

    organizerToken = response.body.token;
  });

  test("POST /login - should login attendee and return JWT token", async () => {
    await request(app)
      .post("/register")
      .send(attendee);

    const response = await request(app)
      .post("/login")
      .send({
        email: attendee.email,
        password: attendee.password
      });

    expect(response.statusCode).toBe(200);

    expect(response.body.message).toBe(
      "Login successful"
    );

    expect(response.body).toHaveProperty("token");

    attendeeToken = response.body.token;
  });

  test("POST /login - should reject invalid password", async () => {
    await request(app)
      .post("/register")
      .send(organizer);

    const response = await request(app)
      .post("/login")
      .send({
        email: organizer.email,
        password: "WrongPassword"
      });

    expect(response.statusCode).toBe(401);

    expect(response.body.message).toBe(
      "Invalid email or password"
    );
  });

  test("POST /login - should reject unknown email", async () => {
    const response = await request(app)
      .post("/login")
      .send({
        email: "unknown@example.com",
        password: "Password123"
      });

    expect(response.statusCode).toBe(401);

    expect(response.body.message).toBe(
      "Invalid email or password"
    );
  });

  // ---------------------------------------------------
  // EVENT AUTHENTICATION
  // ---------------------------------------------------

  test("GET /events - should reject request without token", async () => {
    const response = await request(app)
      .get("/events");

    expect(response.statusCode).toBe(401);

    expect(response.body.message).toBe(
      "Access token required"
    );
  });

  // ---------------------------------------------------
  // CREATE EVENT
  // ---------------------------------------------------

  test("POST /events - organizer should create an event", async () => {
    // Register organizer
    await request(app)
      .post("/register")
      .send(organizer);

    // Login organizer
    const loginResponse = await request(app)
      .post("/login")
      .send({
        email: organizer.email,
        password: organizer.password
      });

    organizerToken = loginResponse.body.token;

    // Create event
    const response = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({
        title: "Node.js Workshop",
        date: "2026-10-15",
        time: "10:00",
        description: "Introduction to Node.js and Express"
      });

    expect(response.statusCode).toBe(201);

    expect(response.body.message).toBe(
      "Event created successfully"
    );

    expect(response.body.event).toHaveProperty("id");
    expect(response.body.event.title).toBe(
      "Node.js Workshop"
    );

    expect(response.body.event.organizerId).toBe(
      users[0].id
    );

    expect(response.body.event.participants).toEqual([]);

    eventId = response.body.event.id;
  });

  test("POST /events - attendee should not be allowed to create event", async () => {
    await request(app)
      .post("/register")
      .send(attendee);

    const loginResponse = await request(app)
      .post("/login")
      .send({
        email: attendee.email,
        password: attendee.password
      });

    attendeeToken = loginResponse.body.token;

    const response = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${attendeeToken}`)
      .send({
        title: "Unauthorized Event",
        date: "2026-10-15",
        time: "10:00",
        description: "This should not be created"
      });

    expect(response.statusCode).toBe(403);

    expect(response.body.message).toBe(
      "Access denied"
    );
  });

  test("POST /events - should reject incomplete event data", async () => {
    await request(app)
      .post("/register")
      .send(organizer);

    const loginResponse = await request(app)
      .post("/login")
      .send({
        email: organizer.email,
        password: organizer.password
      });

    organizerToken = loginResponse.body.token;

    const response = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({
        title: "Incomplete Event"
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe(
      "All event fields are required"
    );
  });

  // ---------------------------------------------------
  // GET EVENTS
  // ---------------------------------------------------

  test("GET /events - should return all events", async () => {
    // Register organizer
    await request(app)
      .post("/register")
      .send(organizer);

    // Login organizer
    const loginResponse = await request(app)
      .post("/login")
      .send({
        email: organizer.email,
        password: organizer.password
      });

    organizerToken = loginResponse.body.token;

    // Create event
    await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({
        title: "Test Event",
        date: "2026-10-20",
        time: "11:00",
        description: "Test event description"
      });

    const response = await request(app)
      .get("/events")
      .set("Authorization", `Bearer ${organizerToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body).toHaveProperty("events");

    expect(Array.isArray(response.body.events)).toBe(true);

    expect(response.body.events.length).toBe(1);

    expect(response.body.events[0].title).toBe(
      "Test Event"
    );
  });

  // ---------------------------------------------------
  // GET EVENT BY ID
  // ---------------------------------------------------

  test("GET /events/:id - should return event by ID", async () => {
    await request(app)
      .post("/register")
      .send(organizer);

    const loginResponse = await request(app)
      .post("/login")
      .send({
        email: organizer.email,
        password: organizer.password
      });

    organizerToken = loginResponse.body.token;

    const createResponse = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({
        title: "Specific Event",
        date: "2026-10-25",
        time: "12:00",
        description: "Specific event"
      });

    eventId = createResponse.body.event.id;

    const response = await request(app)
      .get(`/events/${eventId}`)
      .set("Authorization", `Bearer ${organizerToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.event.id).toBe(eventId);

    expect(response.body.event.title).toBe(
      "Specific Event"
    );
  });

  test("GET /events/:id - should return 404 for unknown event", async () => {
    await request(app)
      .post("/register")
      .send(organizer);

    const loginResponse = await request(app)
      .post("/login")
      .send({
        email: organizer.email,
        password: organizer.password
      });

    organizerToken = loginResponse.body.token;

    const response = await request(app)
      .get("/events/invalid-event-id")
      .set("Authorization", `Bearer ${organizerToken}`);

    expect(response.statusCode).toBe(404);

    expect(response.body.message).toBe(
      "Event not found"
    );
  });

  // ---------------------------------------------------
  // UPDATE EVENT
  // ---------------------------------------------------

  test("PUT /events/:id - organizer should update own event", async () => {
    await request(app)
      .post("/register")
      .send(organizer);

    const loginResponse = await request(app)
      .post("/login")
      .send({
        email: organizer.email,
        password: organizer.password
      });

    organizerToken = loginResponse.body.token;

    const createResponse = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({
        title: "Old Event Title",
        date: "2026-10-30",
        time: "10:00",
        description: "Old description"
      });

    eventId = createResponse.body.event.id;

    const response = await request(app)
      .put(`/events/${eventId}`)
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({
        title: "Updated Event Title",
        description: "Updated description"
      });

    expect(response.statusCode).toBe(200);

    expect(response.body.message).toBe(
      "Event updated successfully"
    );

    expect(response.body.event.title).toBe(
      "Updated Event Title"
    );

    expect(response.body.event.description).toBe(
      "Updated description"
    );
  });

  test("PUT /events/:id - attendee should not update event", async () => {
    // Create organizer
    await request(app)
      .post("/register")
      .send(organizer);

    const organizerLogin = await request(app)
      .post("/login")
      .send({
        email: organizer.email,
        password: organizer.password
      });

    organizerToken = organizerLogin.body.token;

    // Create event
    const createResponse = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({
        title: "Organizer Event",
        date: "2026-11-01",
        time: "10:00",
        description: "Organizer event"
      });

    eventId = createResponse.body.event.id;

    // Create attendee
    await request(app)
      .post("/register")
      .send(attendee);

    const attendeeLogin = await request(app)
      .post("/login")
      .send({
        email: attendee.email,
        password: attendee.password
      });

    attendeeToken = attendeeLogin.body.token;

    // Try to update event
    const response = await request(app)
      .put(`/events/${eventId}`)
      .set("Authorization", `Bearer ${attendeeToken}`)
      .send({
        title: "Hacked Event"
      });

    expect(response.statusCode).toBe(403);

    expect(response.body.message).toBe(
      "Access denied"
    );
  });

  // ---------------------------------------------------
  // EVENT REGISTRATION
  // ---------------------------------------------------

  test("POST /events/:id/register - attendee should register successfully", async () => {
    // Create organizer
    await request(app)
      .post("/register")
      .send(organizer);

    const organizerLogin = await request(app)
      .post("/login")
      .send({
        email: organizer.email,
        password: organizer.password
      });

    organizerToken = organizerLogin.body.token;

    // Create event
    const createResponse = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({
        title: "JavaScript Workshop",
        date: "2026-11-05",
        time: "14:00",
        description: "Advanced JavaScript"
      });

    eventId = createResponse.body.event.id;

    // Create attendee
    await request(app)
      .post("/register")
      .send(attendee);

    const attendeeLogin = await request(app)
      .post("/login")
      .send({
        email: attendee.email,
        password: attendee.password
      });

    attendeeToken = attendeeLogin.body.token;

    // Register attendee
    const response = await request(app)
      .post(`/events/${eventId}/register`)
      .set("Authorization", `Bearer ${attendeeToken}`);

    expect(response.statusCode).toBe(201);

    expect(response.body.message).toBe(
      "Successfully registered for event"
    );

    expect(response.body.eventId).toBe(eventId);

    // Check participant was added
    expect(events[0].participants.length).toBe(1);

    expect(events[0].participants[0]).toBe(
      users.find(user => user.email === attendee.email).id
    );
  });

  test("POST /events/:id/register - should reject duplicate registration", async () => {
    // Create organizer
    await request(app)
      .post("/register")
      .send(organizer);

    const organizerLogin = await request(app)
      .post("/login")
      .send({
        email: organizer.email,
        password: organizer.password
      });

    organizerToken = organizerLogin.body.token;

    // Create event
    const createResponse = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({
        title: "Duplicate Registration Test",
        date: "2026-11-10",
        time: "15:00",
        description: "Testing duplicate registration"
      });

    eventId = createResponse.body.event.id;

    // Create attendee
    await request(app)
      .post("/register")
      .send(attendee);

    const attendeeLogin = await request(app)
      .post("/login")
      .send({
        email: attendee.email,
        password: attendee.password
      });

    attendeeToken = attendeeLogin.body.token;

    // First registration
    const firstResponse = await request(app)
      .post(`/events/${eventId}/register`)
      .set("Authorization", `Bearer ${attendeeToken}`);

    expect(firstResponse.statusCode).toBe(201);

    // Second registration
    const secondResponse = await request(app)
      .post(`/events/${eventId}/register`)
      .set("Authorization", `Bearer ${attendeeToken}`);

    expect(secondResponse.statusCode).toBe(409);

    expect(secondResponse.body.message).toBe(
      "Already registered for this event"
    );
  });

  // ---------------------------------------------------
  // DELETE EVENT
  // ---------------------------------------------------

  test("DELETE /events/:id - organizer should delete own event", async () => {
    await request(app)
      .post("/register")
      .send(organizer);

    const loginResponse = await request(app)
      .post("/login")
      .send({
        email: organizer.email,
        password: organizer.password
      });

    organizerToken = loginResponse.body.token;

    const createResponse = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({
        title: "Event To Delete",
        date: "2026-11-15",
        time: "16:00",
        description: "This event will be deleted"
      });

    eventId = createResponse.body.event.id;

    expect(events.length).toBe(1);

    const response = await request(app)
      .delete(`/events/${eventId}`)
      .set("Authorization", `Bearer ${organizerToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.message).toBe(
      "Event deleted successfully"
    );

    expect(events.length).toBe(0);
  });

  test("DELETE /events/:id - should return 404 for unknown event", async () => {
    await request(app)
      .post("/register")
      .send(organizer);

    const loginResponse = await request(app)
      .post("/login")
      .send({
        email: organizer.email,
        password: organizer.password
      });

    organizerToken = loginResponse.body.token;

    const response = await request(app)
      .delete("/events/non-existing-id")
      .set("Authorization", `Bearer ${organizerToken}`);

    expect(response.statusCode).toBe(404);

    expect(response.body.message).toBe(
      "Event not found"
    );
  });
});