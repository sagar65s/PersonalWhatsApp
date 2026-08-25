import React, { useEffect, useState } from "react";
import { HiOutlineChatBubbleLeftRight, HiOutlineLockClosed, HiOutlineSparkles } from "react-icons/hi2";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import { useChat } from "../contexts/ChatContext";

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 820);
  useEffect(() => {
    const update = () => setMobile(window.innerWidth < 820);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return mobile;
}

function WelcomePanel() {
  return (
    <main className="welcome-panel">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="welcome-art" aria-hidden="true">
        <span className="welcome-ring ring-one" />
        <span className="welcome-ring ring-two" />
        <div className="welcome-icon"><HiOutlineChatBubbleLeftRight /></div>
        <span className="floating-chip chip-one"><HiOutlineSparkles /> Instant</span>
        <span className="floating-chip chip-two"><HiOutlineLockClosed /> Private</span>
      </div>
      <div className="eyebrow">YOUR PRIVATE SPACE</div>
      <h1>Messages that feel<br />closer than ever.</h1>
      <p>Select a conversation or find someone new. Your chats, files and moments stay beautifully organized.</p>
      <div className="welcome-secure"><HiOutlineLockClosed /> Secured conversations</div>
    </main>
  );
}

export default function ChatLayout({ currentUser, onLogout }) {
  const { activeRoom, setActiveRoom } = useChat();
  const mobile = useIsMobile();
  if (mobile) {
    return activeRoom
      ? <div className="mobile-screen"><ChatWindow currentUser={currentUser} onBack={() => setActiveRoom(null)} isMobile /></div>
      : <div className="mobile-screen"><Sidebar currentUser={currentUser} onLogout={onLogout} fullWidth /></div>;
  }
  return (
    <div className="app-shell">
      <Sidebar currentUser={currentUser} onLogout={onLogout} />
      {activeRoom ? <ChatWindow currentUser={currentUser} /> : <WelcomePanel />}
    </div>
  );
}
