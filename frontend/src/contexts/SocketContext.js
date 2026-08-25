import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

const SERVER = process.env.REACT_APP_SERVER_URL || window.location.origin;

export function SocketProvider({ currentUser, token, children }) {
  const socket = useRef(null);
  const [socketInstance, setSocketInstance] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  useEffect(() => {
    const connection = io(SERVER, { transports: ["websocket", "polling"], auth: { token } });
    socket.current = connection;
    setSocketInstance(connection);

    connection.on("connect", () => {
      connection.emit("user:online");
    });

    connection.on("users:online", (ids) => {
      setOnlineUserIds(ids);
    });

    return () => {
      connection.disconnect();
      if (socket.current === connection) socket.current = null;
      setSocketInstance(null);
    };
  }, [currentUser._id, token]);

  return (
    <SocketContext.Provider value={{ socket, socketInstance, onlineUserIds }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
