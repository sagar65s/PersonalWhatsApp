const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { auth } = require("../middleware/auth");

// Email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Login / Register
router.post("/login", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || username.trim().length < 2) {
      return res.status(400).json({ message: "Username must be at least 2 characters" });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ message: "Password must be at least 4 characters" });
    }

    let user = await User.findOne({ username: username.trim() }).select("+password");

    if (!user) {
      // New user — need email
      if (!email || !email.includes("@")) {
        return res.status(400).json({ message: "Please enter a valid email to register" });
      }
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already used by another account" });
      }
      const hashed = await bcrypt.hash(password, 10);
      user = await User.create({ username: username.trim(), email: email.toLowerCase(), password: hashed });
    } else {
      // Existing user — check password
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ message: "Wrong password!" });
      }
    }

    const token = jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ user: user.toJSON(), token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Forgot Password — send reset code
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    // Generate 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetCode = code;
    user.resetCodeExpiry = expiry;
    await user.save();

    // Send email
    await transporter.sendMail({
      from: `"ChatApp" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "ChatApp Password Reset Code",
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: auto;">
          <h2 style="color: #00a884;">ChatApp</h2>
          <p>Your password reset code is:</p>
          <h1 style="letter-spacing: 8px; color: #111;">${code}</h1>
          <p>This code expires in <b>10 minutes</b>.</p>
          <p>If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: "Reset code sent to your email!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reset Password — verify code and set new password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }
    if (!user.resetCode || user.resetCode !== code) {
      return res.status(400).json({ message: "Invalid reset code" });
    }
    if (new Date() > user.resetCodeExpiry) {
      return res.status(400).json({ message: "Reset code expired! Request a new one." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.resetCode = null;
    user.resetCodeExpiry = null;
    await user.save();

    res.json({ message: "Password reset successfully!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const { exclude } = req.query;
    const query = exclude ? { _id: { $ne: exclude } } : {};
    const users = await User.find(query).sort({ isOnline: -1, username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
