const express = require("express");
const router = express.Router();
const Room = require("../models/Room");
const Message = require("../models/Message");
const { auth } = require("../middleware/auth");

router.use(auth);

router.get("/user/:userId", async (req, res) => {
  try {
    if (req.params.userId !== req.userId) return res.status(403).json({ message: "Access denied" });
    const rooms = await Room.find({ members: req.userId })
      .populate("members", "username avatar isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username" },
      })
      .sort({ updatedAt: -1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/direct", async (req, res) => {
  try {
    const userId1 = req.userId;
    const userId2 = req.body.userId2;
    if (!userId2 || userId1 === userId2) return res.status(400).json({ message: "Choose another user" });
    let room = await Room.findOne({
      type: "direct",
      members: { $all: [userId1, userId2], $size: 2 },
    })
      .populate("members", "username avatar isOnline lastSeen")
      .populate("lastMessage");

    if (!room) {
      room = await Room.create({
        type: "direct",
        members: [userId1, userId2],
        createdBy: userId1,
      });
      room = await room.populate("members", "username avatar isOnline lastSeen");
    }
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/group", async (req, res) => {
  try {
    const { name, members = [] } = req.body;
    const createdBy = req.userId;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: "Group name must be at least 2 characters" });
    }
    const memberSet = [...new Set([...members, createdBy])];
    const room = await Room.create({
      type: "group",
      name: name.trim(),
      members: memberSet,
      createdBy,
    });
    const populated = await room.populate("members", "username avatar isOnline lastSeen");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:roomId", async (req, res) => {
  try {
    const room = await Room.findOne({ _id: req.params.roomId, members: req.userId })
      .populate("members", "username avatar isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username" },
      });
    if (!room) return res.status(404).json({ message: "Room not found" });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:roomId/lastMessage", async (req, res) => {
  try {
    const { messageId } = req.body;
    const room = await Room.findOneAndUpdate(
      { _id: req.params.roomId, members: req.userId },
      { lastMessage: messageId },
      { new: true }
    );
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
