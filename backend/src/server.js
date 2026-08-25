require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

const userRoutes = require("./routes/users");
const roomRoutes = require("./routes/rooms");
const messageRoutes = require("./routes/messages");
const uploadRoutes = require("./routes/upload");
const { initSocket } = require("./socket");

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const allowedOrigins = CLIENT_URL.split(",").map((url) => url.trim()).filter(Boolean);
if (process.env.NODE_ENV !== "production") {
  allowedOrigins.push("http://localhost:3000", "http://localhost:5000");
}
const primaryClientUrl = process.env.NODE_ENV === "production"
  ? (allowedOrigins[0] || "http://localhost:3000")
  : "http://localhost:3000";
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST", "PATCH", "DELETE"],
  credentials: true,
};

const io = new Server(server, {
  cors: {
    ...corsOptions,
  },
});
app.set("io", io);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(corsOptions));
app.use(express.json({ limit: "100kb" }));
app.use("/api", rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: true, legacyHeaders: false }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads"), {
  dotfiles: "deny",
  index: false,
  maxAge: "1d",
  setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
}));

app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", uploadRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Give API requests a clean JSON 404 instead of an HTML "Cannot GET" page.
app.use("/api", (req, res) => {
  res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
});

// When the frontend has been built, serve the entire application from this
// backend. This makes http://localhost:5000 the only URL users need to open.
const frontendBuild = path.resolve(__dirname, "../../frontend/build");
const frontendIndex = path.join(frontendBuild, "index.html");

if (fs.existsSync(frontendIndex)) {
  app.use(express.static(frontendBuild, { index: false, maxAge: "1h" }));
  app.get("*", (req, res) => res.sendFile(frontendIndex));
} else {
  app.get("/", (_req, res) => res.redirect(302, primaryClientUrl));
  app.use((_req, res) => res.status(404).json({
    message: "Page not found. Start the frontend or run npm start from the project root.",
    frontend: primaryClientUrl,
    health: "/api/health",
  }));
}

app.use((err, _req, res, _next) => {
  console.error("Request error:", err.message);
  res.status(err.message === "Origin not allowed by CORS" ? 403 : 500).json({
    message: err.message === "Origin not allowed by CORS" ? err.message : "Internal server error",
  });
});

initSocket(io);

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/chatapp";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be set and contain at least 32 characters");
  process.exit(1);
}

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
    const PORT = process.env.PORT || 5000;
    return server.listen(PORT, () => {
      console.log(`ChatApp is ready: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}

if (require.main === module) startServer();

module.exports = { app, server, startServer };
