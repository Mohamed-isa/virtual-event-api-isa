const express = require("express");

const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  registerForEvent
} = require("../controllers/eventController");

const authenticateToken =
  require("../middleware/authMiddleware");

const authorizeRole =
  require("../middleware/roleMiddleware");

const router = express.Router();


// GET ALL EVENTS
router.get(
  "/",
  authenticateToken,
  getEvents
);


// CREATE EVENT - ORGANIZER ONLY
router.post(
  "/",
  authenticateToken,
  authorizeRole("organizer"),
  createEvent
);


// REGISTER FOR EVENT
router.post(
  "/:id/register",
  authenticateToken,
  registerForEvent
);


// GET EVENT BY ID
router.get(
  "/:id",
  authenticateToken,
  getEventById
);


// UPDATE EVENT - ORGANIZER ONLY
router.put(
  "/:id",
  authenticateToken,
  authorizeRole("organizer"),
  updateEvent
);


// DELETE EVENT - ORGANIZER ONLY
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole("organizer"),
  deleteEvent
);


module.exports = router;