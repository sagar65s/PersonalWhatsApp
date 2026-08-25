import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

const SERVER = process.env.REACT_APP_SERVER_URL || window.location.origin;

export function SocketProvider({ currentUser, token, children }) {
  const socket = useRef(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  useEffect(() => {
    socket.current = io(SERVER, { transports: ["websocket", "polling"], auth: { token } });

    socket.current.on("connect", () => {
      socket.current.emit("user:online", { userId: currentUser._id });
    });

    socket.current.on("users:online", (ids) => {
      setOnlineUserIds(ids);
    });

    return () => {
      if (socket.current) socket.current.disconnect();
    };
  }, [currentUser._id, token]);

  return (
    <SocketContext.Provider value={{ socket, onlineUserIds }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
