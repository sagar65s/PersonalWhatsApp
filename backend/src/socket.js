const Message = require("./models/Message");
const User = require("./models/User");
const Room = require("./models/Room");
const { verifyToken } = require("./middleware/auth");

// A user can have more than one live socket during refresh/reconnect or when
// ChatApp is open in multiple tabs. Keep every socket until its own disconnect.
const onlineUsers = new Map();
const typingUsers = new Map();

function initSocket(io) {
  io.use((socket, next) => {
    const payload = verifyToken(socket.handshake.auth?.token);
    if (!payload?.userId) return next(new Error("Authentication required"));
    socket.userId = payload.userId;
    next();
  });

  io.on("connection", async (socket) => {
    console.log("Socket connected: " + socket.id);
    // A permanent per-user room guarantees realtime delivery even when a
    // direct conversation was created after this socket connected.
    socket.join(`user:${socket.userId}`);
    const memberships = await Room.find({ members: socket.userId }).select("_id");
    memberships.forEach((room) => socket.join(room._id.toString()));

    const userSockets = onlineUsers.get(socket.userId) || new Set();
    userSockets.add(socket.id);
    onlineUsers.set(socket.userId, userSockets);
    await User.findByIdAndUpdate(socket.userId, { isOnline: true, lastSeen: new Date() });
    io.emit("users:online", Array.from(onlineUsers.keys()));

    socket.on("user:online", async () => {
      const userId = socket.userId;
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
      io.emit("users:online", Array.from(onlineUsers.keys()));
      console.log("User online: " + userId);
    });

    socket.on("room:join", async ({ roomId }) => {
      const allowed = await Room.exists({ _id: roomId, members: socket.userId });
      if (allowed) socket.join(roomId);
    });

    socket.on("room:leave", ({ roomId }) => {
      socket.leave(roomId);
    });
    socket.on("room:created", async ({ roomId, memberIds }) => {
      try {
        const room = await Room.findById(roomId)
          .populate("members", "username avatar isOnline lastSeen")
          .populate("createdBy", "username avatar")
          .populate({
            path: "lastMessage",
            populate: { path: "sender", select: "username" },
          });
        if (!room) return;
        memberIds.forEach((memberId) => {
          io.to(`user:${memberId}`).emit("room:new", room);
        });
        socket.join(roomId);
      } catch (err) {
        console.error("room:created error:", err);
      }
    });

    socket.on("message:send", async (data) => {
      try {
        const { roomId, content, type = "text", fileUrl, fileName, fileSize, mimeType } = data;
        const senderId = socket.userId;

        const room = await Room.findOne({ _id: roomId, members: senderId }).populate("members");
        if (!room) return socket.emit("message:error", { message: "Chat access denied" });
        if (!content && !fileUrl) return socket.emit("message:error", { message: "Message is empty" });
        if (typeof content !== "string" || content.length > 12000) return socket.emit("message:error", { message: "Message is too long" });
        if (fileUrl && (!fileUrl.startsWith("/uploads/") || !["image", "file", "audio"].includes(type))) {
          return socket.emit("message:error", { message: "Invalid attachment" });
        }

        const otherMembers = room.members.filter(
          (m) => m._id.toString() !== senderId
        );

        const allOnline = otherMembers.every((m) =>
          (onlineUsers.get(m._id.toString())?.size || 0) > 0
        );

        const status = allOnline ? "delivered" : "sent";

        const message = await Message.create({
          room: roomId,
          sender: senderId,
          content: content || "",
          type,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          fileSize: fileSize || null,
          mimeType: mimeType || null,
          status,
        });

        await Room.findByIdAndUpdate(roomId, {
          lastMessage: message._id,
          updatedAt: new Date(),
        });

        const populated = await message.populate("sender", "username avatar");

        const memberChannels = room.members.map((member) => `user:${member._id.toString()}`);
        io.to(roomId).to(memberChannels).emit("message:new", populated);
        console.log("Message sent to room: " + roomId + " Content: " + populated.content + " Status: " + status);

      } catch (err) {
        console.error("message:send error:", err);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("message:read", async ({ roomId }) => {
      try {
        const userId = socket.userId;
        const allowed = await Room.exists({ _id: roomId, members: userId });
        if (!allowed) return;
        await Message.updateMany(
          { room: roomId, sender: { $ne: userId }, status: { $ne: "read" } },
          { status: "read", $addToSet: { readBy: userId } }
        );
        io.to(roomId).emit("message:read", { roomId, userId });
        console.log("Messages read in room: " + roomId + " by: " + userId);
      } catch (err) {
        console.error("message:read error:", err);
      }
    });

    socket.on("typing:start", async ({ roomId, username }) => {
      const userId = socket.userId;
      if (!(await Room.exists({ _id: roomId, members: userId }))) return;
      const key = userId + ":" + roomId;
      if (typingUsers.has(key)) {
        clearTimeout(typingUsers.get(key).timeout);
      }
      const timeout = setTimeout(() => {
        typingUsers.delete(key);
        socket.to(roomId).emit("typing:stop", { userId, roomId });
      }, 3000);
      typingUsers.set(key, { roomId, timeout });
      socket.to(roomId).emit("typing:start", { userId, username, roomId });
    });

    socket.on("typing:stop", ({ roomId }) => {
      const userId = socket.userId;
      const key = userId + ":" + roomId;
      if (typingUsers.has(key)) {
        clearTimeout(typingUsers.get(key).timeout);
        typingUsers.delete(key);
      }
      socket.to(roomId).emit("typing:stop", { userId, roomId });
    });

    socket.on("disconnect", async () => {
      if (socket.userId) {
        const sockets = onlineUsers.get(socket.userId);
        sockets?.delete(socket.id);
        if (!sockets?.size) {
          onlineUsers.delete(socket.userId);
          await User.findByIdAndUpdate(socket.userId, {
            isOnline: false,
            lastSeen: new Date(),
          });
        }
        io.emit("users:online", Array.from(onlineUsers.keys()));
        console.log("User offline: " + socket.userId);
      }
    });
  });
}

module.exports = { initSocket };
