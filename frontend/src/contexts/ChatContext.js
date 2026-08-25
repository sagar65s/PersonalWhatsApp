import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import axios from "axios";
import { useSocket } from "./SocketContext";
import { decryptMessage } from "../utils";

const ChatContext = createContext(null);

export function ChatProvider({ currentUser, onNewMessage, children }) {
  const { socket } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState({});
  const [notifications, setNotifications] = useState({});
  const activeRoomRef = useRef(null);

  useEffect(() => { activeRoomRef.current = activeRoom; }, [activeRoom]);

  useEffect(() => {
    axios.get(`/api/rooms/user/${currentUser._id}`).then(({ data }) => setRooms(data));
  }, [currentUser._id]);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;

    const onNewRoom = (room) => {
      setRooms((prev) => {
        if (prev.find((r) => r._id === room._id)) return prev;
        return [room, ...prev];
      });
    };

    const onNewMsg = (msg) => {
      const roomId = msg.room;
      setMessages((prev) => {
        const existing = prev[roomId] || [];
        if (existing.find((m) => m._id === msg._id)) return prev;
        return { ...prev, [roomId]: [...existing, msg] };
      });
      setRooms((prev) =>
        prev.map((r) => r._id === roomId ? { ...r, lastMessage: msg, updatedAt: msg.createdAt } : r)
           .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
      if (activeRoomRef.current?._id !== roomId) {
        setNotifications((prev) => ({ ...prev, [roomId]: (prev[roomId] || 0) + 1 }));
        const senderName = msg.sender?.username || "Someone";
        const preview = msg.type === "image" ? "📷 Photo" : msg.type === "file" ? "📎 File" : decryptMessage(msg.content);
        onNewMessage?.(senderName, preview);
      }
    };

    const onRead = ({ roomId }) => {
      setMessages((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] || []).map((m) => ({ ...m, status: "read" })),
      }));
    };

    s.on("room:new", onNewRoom);
    s.on("message:new", onNewMsg);
    s.on("message:read", onRead);

    return () => {
      s.off("room:new", onNewRoom);
      s.off("message:new", onNewMsg);
      s.off("message:read", onRead);
    };
  }, [socket, onNewMessage]);

  async function openRoom(room) {
    setActiveRoom(room);
    setNotifications((prev) => ({ ...prev, [room._id]: 0 }));
    socket.current?.emit("room:join", { roomId: room._id });
    socket.current?.emit("message:read", { roomId: room._id, userId: currentUser._id });
    if (!messages[room._id]) {
      const { data } = await axios.get(`/api/messages/room/${room._id}`);
      setMessages((prev) => ({ ...prev, [room._id]: data.messages }));
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

  return (
    <ChatContext.Provider value={{ rooms, activeRoom, setActiveRoom, messages, notifications, openRoom, openDirectChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}
