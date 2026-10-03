const crypto = require("crypto");

const events = require("../data/events");
const users = require("../data/users");

const {
  sendRegistrationEmail
} = require("../services/emailService");


// CREATE EVENT
const createEvent = async (req, res) => {
  try {
    const {
      title,
      date,
      time,
      description
    } = req.body;

    if (!title || !date || !time || !description) {
      return res.status(400).json({
        message: "All event fields are required"
      });
    }

    const event = {
      id: crypto.randomUUID(),
      title,
      date,
      time,
      description,
      organizerId: req.user.id,
      participants: []
    };

    events.push(event);

    res.status(201).json({
      message: "Event created successfully",
      event
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


// GET ALL EVENTS
const getEvents = async (req, res) => {
  try {
    res.json({
      events
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


// GET EVENT BY ID
const getEventById = async (req, res) => {
  try {
    const event = events.find(
      event => event.id === req.params.id
    );

    if (!event) {
      return res.status(404).json({
        message: "Event not found"
      });
    }

    res.json({
      event
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


// UPDATE EVENT
const updateEvent = async (req, res) => {
  try {
    const event = events.find(
      event => event.id === req.params.id
    );

    if (!event) {
      return res.status(404).json({
        message: "Event not found"
      });
    }

    if (event.organizerId !== req.user.id) {
      return res.status(403).json({
        message: "You can only update your own events"
      });
    }

    const {
      title,
      date,
      time,
      description
    } = req.body;

    if (title !== undefined) {
      event.title = title;
    }

    if (date !== undefined) {
      event.date = date;
    }

    if (time !== undefined) {
      event.time = time;
    }

    if (description !== undefined) {
      event.description = description;
    }

    res.json({
      message: "Event updated successfully",
      event
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


// DELETE EVENT
const deleteEvent = async (req, res) => {
  try {
    const index = events.findIndex(
      event => event.id === req.params.id
    );

    if (index === -1) {
      return res.status(404).json({
        message: "Event not found"
      });
    }

    const event = events[index];

    if (event.organizerId !== req.user.id) {
      return res.status(403).json({
        message: "You can only delete your own events"
      });
    }

    events.splice(index, 1);

    res.json({
      message: "Event deleted successfully"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


// REGISTER FOR EVENT
const registerForEvent = async (req, res) => {
  try {
    const event = events.find(
      event => event.id === req.params.id
    );

    if (!event) {
      return res.status(404).json({
        message: "Event not found"
      });
    }

    const user = users.find(
      user => user.id === req.user.id
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (event.participants.includes(user.id)) {
      return res.status(409).json({
        message: "Already registered for this event"
      });
    }

    event.participants.push(user.id);

    try {
      await sendRegistrationEmail(
        user.email,
        event
      );
    } catch (emailError) {
      console.error(
        "Email sending failed:",
        emailError.message
      );
    }

    res.status(201).json({
      message: "Successfully registered for event",
      eventId: event.id
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Registration failed"
    });
  }
};


module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  registerForEvent
};