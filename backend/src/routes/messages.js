const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const Room = require("../models/Room");
const { auth } = require("../middleware/auth");

router.use(auth);

router.get("/room/:roomId", async (req, res) => {
  try {
    const room = await Room.findOne({ _id: req.params.roomId, members: req.userId });
    if (!room) return res.status(403).json({ message: "You are not a member of this chat" });
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const clearedAt = room.clearedBy?.find((entry) => entry.user.toString() === req.userId)?.at;
    const messageFilter = { room: req.params.roomId, ...(clearedAt ? { createdAt: { $gt: clearedAt } } : {}) };
    const messages = await Message.find(messageFilter)
      .populate("sender", "username avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Message.countDocuments(messageFilter);
    res.json({ messages: messages.reverse(), total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/room/:roomId", async (req, res) => {
  try {
    const room = await Room.findOne({ _id: req.params.roomId, members: req.userId });
    if (!room) return res.status(403).json({ message: "You are not a member of this chat" });
    room.clearedBy = (room.clearedBy || []).filter((entry) => entry.user.toString() !== req.userId);
    room.clearedBy.push({ user: req.userId, at: new Date() });
    await room.save();
    const io = req.app.get("io");
    io?.to(`user:${req.userId}`).emit("chat:cleared", { roomId: room._id.toString() });
    res.json({ message: "Chat cleared for you" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { roomId, content, type = "text", fileUrl, fileName, fileSize, mimeType } = req.body;
    const room = await Room.findOne({ _id: roomId, members: req.userId });
    if (!room) return res.status(403).json({ message: "You are not a member of this chat" });
    const message = await Message.create({
      room: roomId,
      sender: req.userId,
      content: content || "",
      type,
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileSize: fileSize || null,
      mimeType: mimeType || null,
    });
    await Room.findByIdAndUpdate(roomId, { lastMessage: message._id, updatedAt: new Date() });
    const populated = await message.populate("sender", "username avatar");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
