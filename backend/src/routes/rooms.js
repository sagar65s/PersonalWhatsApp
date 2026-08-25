const express = require("express");
const router = express.Router();
const Room = require("../models/Room");
const Message = require("../models/Message");
const User = require("../models/User");
const { auth } = require("../middleware/auth");
const fs = require("fs/promises");
const path = require("path");

const uploadsDir = path.resolve(__dirname, "../../uploads");
const ownerId = (room) => (room.createdBy?._id || room.createdBy)?.toString();
async function removeFiles(messages) {
  await Promise.all(messages.filter((message) => message.fileUrl?.startsWith("/uploads/")).map((message) => {
    const target = path.join(uploadsDir, path.basename(message.fileUrl));
    return fs.unlink(target).catch((error) => { if (error.code !== "ENOENT") console.error("Attachment cleanup error:", error.message); });
  }));
}
const populateRoom = (query) => query
  .populate("members", "username avatar isOnline lastSeen")
  .populate("createdBy", "username avatar")
  .populate({ path: "lastMessage", populate: { path: "sender", select: "username" } });

router.use(auth);

router.get("/user/:userId", async (req, res) => {
  try {
    if (req.params.userId !== req.userId) return res.status(403).json({ message: "Access denied" });
    const rooms = await populateRoom(Room.find({ members: req.userId })).sort({ updatedAt: -1 });
    res.json(rooms.map((room) => {
      const result = room.toObject();
      const clearedAt = result.clearedBy?.find((entry) => entry.user.toString() === req.userId)?.at;
      if (clearedAt && result.lastMessage?.createdAt && new Date(result.lastMessage.createdAt) <= new Date(clearedAt)) result.lastMessage = null;
      return result;
    }));
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
      .populate("createdBy", "username avatar")
      .populate("lastMessage");

    if (!room) {
      room = await Room.create({
        type: "direct",
        members: [userId1, userId2],
        createdBy: userId1,
      });
      room = await room.populate([{ path: "members", select: "username avatar isOnline lastSeen" }, { path: "createdBy", select: "username avatar" }]);
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
    const populated = await room.populate([{ path: "members", select: "username avatar isOnline lastSeen" }, { path: "createdBy", select: "username avatar" }]);
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:roomId/members", async (req, res) => {
  try {
    const { action, userId } = req.body;
    const room = await Room.findById(req.params.roomId);
    if (!room || room.type !== "group") return res.status(404).json({ message: "Group not found" });
    if (ownerId(room) !== req.userId) return res.status(403).json({ message: "Only the group creator can manage members" });
    if (!userId || !["add", "remove"].includes(action)) return res.status(400).json({ message: "Choose a valid member action" });
    if (action === "remove" && userId === req.userId) return res.status(400).json({ message: "The group creator cannot be removed" });
    if (!(await User.exists({ _id: userId }))) return res.status(404).json({ message: "User not found" });

    const previousMemberIds = room.members.map(String);
    if (action === "add" && !previousMemberIds.includes(userId)) room.members.push(userId);
    if (action === "remove") room.members = room.members.filter((member) => member.toString() !== userId);
    await room.save();

    const populated = await populateRoom(Room.findById(room._id));
    const io = req.app.get("io");
    const allMemberIds = [...new Set([...previousMemberIds, ...populated.members.map((member) => member._id.toString())])];
    allMemberIds.forEach((memberId) => io?.to(`user:${memberId}`).emit("room:updated", populated));
    if (action === "remove") io?.to(`user:${userId}`).emit("chat:deleted", { roomId: room._id.toString() });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:roomId", async (req, res) => {
  try {
    const room = await Room.findOne({ _id: req.params.roomId, members: req.userId });
    if (!room) return res.status(404).json({ message: "Chat not found" });
    if (room.type === "group" && ownerId(room) !== req.userId) {
      return res.status(403).json({ message: "Only the group creator can delete this group" });
    }
    const memberIds = room.members.map(String);
    const messages = await Message.find({ room: room._id }).select("fileUrl");
    await removeFiles(messages);
    await Message.deleteMany({ room: room._id });
    await room.deleteOne();
    const io = req.app.get("io");
    memberIds.forEach((memberId) => io?.to(`user:${memberId}`).emit("chat:deleted", { roomId: room._id.toString() }));
    res.json({ message: room.type === "group" ? "Group deleted permanently" : "Chat deleted permanently" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:roomId", async (req, res) => {
  try {
    const room = await populateRoom(Room.findOne({ _id: req.params.roomId, members: req.userId }));
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
