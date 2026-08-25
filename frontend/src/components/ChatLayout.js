import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import { useChat } from "../contexts/ChatContext";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

export default function ChatLayout({ currentUser, onLogout }) {
  const { activeRoom, setActiveRoom } = useChat();
  const isMobile = useIsMobile();

  const handleBack = () => setActiveRoom?.(null);

  // Mobile: show either sidebar or chat, not both
  if (isMobile) {
    if (activeRoom) {
      return (
        <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-primary)" }}>
          <ChatWindow currentUser={currentUser} onBack={handleBack} isMobile={true} />
        </div>
      );
    }
    return (
      <div style={{ height: "100dvh", overflow: "hidden", background: "var(--bg-secondary)" }}>
        <Sidebar currentUser={currentUser} onLogout={onLogout} fullWidth={true} />
      </div>
    );
  }

  // Desktop: sidebar + chat side by side
  return (
    <div className="app-shell" style={{ display: "flex", height: "100dvh", overflow: "hidden", background: "var(--bg-primary)" }}>
      <Sidebar currentUser={currentUser} onLogout={onLogout} />
      {activeRoom ? (
        <ChatWindow currentUser={currentUser} />
      ) : (
        <div className="empty-chat" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", borderLeft: "1px solid var(--border)" }}>
          <div className="empty-chat-orb">✦</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Your conversations, beautifully connected.</div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>Choose a chat or start a new conversation.</div>
        </div>
      )}
    </div>
  );
}
