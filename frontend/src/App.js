import React, { useState, useEffect } from "react";
import axios from "axios";
import LoginScreen from "./components/LoginScreen";
import ChatLayout from "./components/ChatLayout";
import { SocketProvider } from "./contexts/SocketContext";
import { ChatProvider } from "./contexts/ChatContext";
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
          <div onClick={() => setPopup(null)} style={{
            position: "fixed", top: 20, right: 20,
            background: "var(--bg-tertiary)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "12px 16px", boxShadow: "var(--shadow-lg)",
            zIndex: 9999, minWidth: 260, maxWidth: 320,
            animation: "slideDown 0.3s ease", cursor: "pointer",
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: "var(--accent)",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 16, flexShrink: 0,
            }}>
              {popup.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 2 }}>{popup.name}</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{popup.message}</div>
            </div>
            <button onClick={() => setPopup(null)} style={{ color: "var(--text-muted)", fontSize: 16, flexShrink: 0 }}>✕</button>
          </div>
        )}
      </ChatProvider>
    </SocketProvider>
  );
}
