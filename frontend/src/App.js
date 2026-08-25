import React, { useState, useEffect } from "react";
import axios from "axios";
import LoginScreen from "./components/LoginScreen";
import ChatLayout from "./components/ChatLayout";
import { SocketProvider } from "./contexts/SocketContext";
import { ChatProvider } from "./contexts/ChatContext";
import { HiOutlineXMark } from "react-icons/hi2";
import Avatar from "./components/Avatar";
import "./styles/global.css";

axios.defaults.baseURL = process.env.REACT_APP_SERVER_URL || window.location.origin;

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionToken, setSessionToken] = useState("");
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("chatapp_session");
    if (saved) {
      try {
        const session = JSON.parse(saved);
        axios.defaults.headers.common.Authorization = `Bearer ${session.token}`;
        setSessionToken(session.token);
        setCurrentUser(session.user);
      } catch { localStorage.removeItem("chatapp_session"); }
    }
  }, []);

  const handleLogin = (session) => {
    localStorage.setItem("chatapp_session", JSON.stringify(session));
    axios.defaults.headers.common.Authorization = `Bearer ${session.token}`;
    setSessionToken(session.token);
    setCurrentUser(session.user);
  };

  const handleLogout = () => {
    localStorage.removeItem("chatapp_session");
    delete axios.defaults.headers.common.Authorization;
    setSessionToken("");
    setCurrentUser(null);
  };

  const showPopup = (name, message) => {
    setPopup({ name, message });
    setTimeout(() => setPopup(null), 4000);
  };

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  return (
    <SocketProvider currentUser={currentUser} token={sessionToken}>
      <ChatProvider currentUser={currentUser} onNewMessage={showPopup}>
        <ChatLayout currentUser={currentUser} onLogout={handleLogout} />

        {popup && (
          <div className="toast-notification" onClick={() => setPopup(null)}>
            <Avatar name={popup.name} size={39} />
            <div className="toast-copy"><strong>{popup.name}</strong><p>{popup.message}</p></div>
            <button onClick={() => setPopup(null)}><HiOutlineXMark /></button>
          </div>
        )}
      </ChatProvider>
    </SocketProvider>
  );
}
