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
    const messages = await Message.find({ room: req.params.roomId })
      .populate("sender", "username avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Message.countDocuments({ room: req.params.roomId });
    res.json({ messages: messages.reverse(), total, page, pages: Math.ceil(total / limit) });
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
