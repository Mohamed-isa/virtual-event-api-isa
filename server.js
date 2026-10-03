require("dotenv").config();

const express = require("express");

const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");

const app = express();

app.use(express.json());

app.use("/", authRoutes);
app.use("/events", eventRoutes);

app.get("/health", (req, res) => {
  res.json({
    message: "Virtual Event API is running"
  });
});

const PORT = process.env.PORT || 3000;

// Start server only when server.js is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export app for Jest/Supertest
module.exports = app;