import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import axios from "axios";
import { useSocket } from "./SocketContext";
import { decryptMessage } from "../utils";

const ChatContext = createContext(null);

export function ChatProvider({ currentUser, onNewMessage, children }) {
  const { socket, socketInstance } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState({});
  const [notifications, setNotifications] = useState({});
  const activeRoomRef = useRef(null);
  const roomsRef = useRef([]);

  useEffect(() => { activeRoomRef.current = activeRoom; }, [activeRoom]);
  useEffect(() => { roomsRef.current = rooms; }, [rooms]);

  useEffect(() => {
    axios.get(`/api/rooms/user/${currentUser._id}`).then(({ data }) => setRooms(data));
  }, [currentUser._id]);

  useEffect(() => {
    const s = socketInstance;
    if (!s) return;

    const onNewRoom = (room) => {
      s.emit("room:join", { roomId: room._id });
      setRooms((prev) => {
        if (prev.find((r) => r._id === room._id)) return prev;
        return [room, ...prev];
      });
    };

    const onNewMsg = async (msg) => {
      const roomId = typeof msg.room === "object" ? msg.room._id : msg.room;
      setMessages((prev) => {
        const existing = prev[roomId] || [];
        if (existing.find((m) => m._id === msg._id)) return prev;
        return { ...prev, [roomId]: [...existing, msg] };
      });
      setRooms((prev) =>
        prev.map((r) => r._id === roomId ? { ...r, lastMessage: msg, updatedAt: msg.createdAt } : r)
           .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
      if (!roomsRef.current.some((room) => room._id === roomId)) {
        try {
          const { data: room } = await axios.get(`/api/rooms/${roomId}`);
          setRooms((prev) => prev.some((item) => item._id === roomId)
            ? prev
            : [{ ...room, lastMessage: msg, updatedAt: msg.createdAt }, ...prev]);
        } catch { /* The message remains available even if room refresh fails. */ }
      }
      if (activeRoomRef.current?._id !== roomId) {
        setNotifications((prev) => ({ ...prev, [roomId]: (prev[roomId] || 0) + 1 }));
        const senderName = msg.sender?.username || "Someone";
        const preview = msg.type === "image" ? "📷 Photo" : msg.type === "file" ? "📎 File" : msg.type === "audio" ? "🎙️ Voice message" : decryptMessage(msg.content);
        onNewMessage?.(senderName, preview);
      } else if ((msg.sender?._id || msg.sender) !== currentUser._id) {
        s.emit("message:read", { roomId });
      }
    };

    const onRead = ({ roomId }) => {
      setMessages((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] || []).map((m) => ({ ...m, status: "read" })),
      }));
    };

    const onRoomUpdated = (room) => {
      const isMember = room.members?.some((member) => member._id === currentUser._id);
      if (!isMember) return;
      s.emit("room:join", { roomId: room._id });
      setRooms((prev) => prev.some((item) => item._id === room._id)
        ? prev.map((item) => item._id === room._id ? room : item)
        : [room, ...prev]);
      setActiveRoom((current) => current?._id === room._id ? room : current);
    };

    const onChatCleared = ({ roomId }) => {
      setMessages((prev) => ({ ...prev, [roomId]: [] }));
      setNotifications((prev) => ({ ...prev, [roomId]: 0 }));
      setRooms((prev) => prev.map((room) => room._id === roomId ? { ...room, lastMessage: null } : room));
    };

    const onChatDeleted = ({ roomId }) => {
      setRooms((prev) => prev.filter((room) => room._id !== roomId));
      setMessages((prev) => { const next = { ...prev }; delete next[roomId]; return next; });
      setNotifications((prev) => { const next = { ...prev }; delete next[roomId]; return next; });
      setActiveRoom((current) => current?._id === roomId ? null : current);
    };

    s.on("room:new", onNewRoom);
    s.on("message:new", onNewMsg);
    s.on("message:read", onRead);
    s.on("room:updated", onRoomUpdated);
    s.on("chat:cleared", onChatCleared);
    s.on("chat:deleted", onChatDeleted);

    return () => {
      s.off("room:new", onNewRoom);
      s.off("message:new", onNewMsg);
      s.off("message:read", onRead);
      s.off("room:updated", onRoomUpdated);
      s.off("chat:cleared", onChatCleared);
      s.off("chat:deleted", onChatDeleted);
    };
  }, [socketInstance, onNewMessage, currentUser._id]);

  const totalUnread = Object.values(notifications).reduce((sum, count) => sum + count, 0);

  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) ChatApp` : "ChatApp";
    return () => { document.title = "ChatApp"; };
  }, [totalUnread]);

  async function openRoom(room) {
    setActiveRoom(room);
    setNotifications((prev) => ({ ...prev, [room._id]: 0 }));
    socket.current?.emit("room:join", { roomId: room._id });
    socket.current?.emit("message:read", { roomId: room._id, userId: currentUser._id });
    if (!messages[room._id]) {
      const { data } = await axios.get(`/api/messages/room/${room._id}`);
      setMessages((prev) => {
        const realtime = prev[room._id] || [];
        const merged = [...data.messages, ...realtime].filter(
          (message, index, all) => all.findIndex((item) => item._id === message._id) === index
        );
        return { ...prev, [room._id]: merged };
      });
    }
  }

  async function openDirectChat(user) {
    const { data: room } = await axios.post("/api/rooms/direct", {
      userId2: user._id,
    });
    socket.current?.emit("room:join", { roomId: room._id });
    setRooms((prev) => {
      if (prev.find((r) => r._id === room._id)) return prev;
      return [room, ...prev];
    });
    openRoom(room);
  }

  async function clearChat(roomId) {
    await axios.delete(`/api/messages/room/${roomId}`);
    setMessages((prev) => ({ ...prev, [roomId]: [] }));
    setNotifications((prev) => ({ ...prev, [roomId]: 0 }));
    setRooms((prev) => prev.map((room) => room._id === roomId ? { ...room, lastMessage: null } : room));
  }

  async function deleteChat(roomId) {
    await axios.delete(`/api/rooms/${roomId}`);
    setRooms((prev) => prev.filter((room) => room._id !== roomId));
    setMessages((prev) => { const next = { ...prev }; delete next[roomId]; return next; });
    setNotifications((prev) => { const next = { ...prev }; delete next[roomId]; return next; });
    setActiveRoom(null);
  }

  async function updateGroupMember(roomId, action, userId) {
    const { data: room } = await axios.patch(`/api/rooms/${roomId}/members`, { action, userId });
    setRooms((prev) => prev.map((item) => item._id === roomId ? room : item));
    setActiveRoom((current) => current?._id === roomId ? room : current);
    return room;
  }

  return (
    <ChatContext.Provider value={{ rooms, activeRoom, setActiveRoom, messages, notifications, totalUnread, openRoom, openDirectChat, clearChat, deleteChat, updateGroupMember }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}
