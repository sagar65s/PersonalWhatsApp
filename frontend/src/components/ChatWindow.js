import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useChat } from "../contexts/ChatContext";
import { useSocket } from "../contexts/SocketContext";
import MessageBubble from "./MessageBubble";
import Avatar from "./Avatar";
import { BsPaperclip } from "react-icons/bs";
import { encryptMessage, decryptMessage } from "../utils";

const SERVER = process.env.REACT_APP_SERVER_URL || window.location.origin;

export default function ChatWindow({ currentUser, onBack, isMobile }) {
  const { activeRoom, messages } = useChat();
  const { socket, onlineUserIds } = useSocket();
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sendError, setSendError] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [rooms, setRooms] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const roomMessages = messages[activeRoom?._id] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [roomMessages.length]);

  useEffect(() => {
    setTypingUsers({});
    setText("");
    setPendingFile(null);
    setReplyTo(null);
  }, [activeRoom?._id]);

  useEffect(() => {
    const s = socket.current;
    if (!s || !activeRoom) return;
    const onStart = ({ userId, username, roomId }) => {
      if (userId === currentUser._id || roomId !== activeRoom._id) return;
      setTypingUsers((p) => ({ ...p, [userId]: username }));
    };
    const onStop = ({ userId }) => {
      setTypingUsers((p) => { const n = { ...p }; delete n[userId]; return n; });
    };
    s.on("typing:start", onStart);
    s.on("typing:stop", onStop);
    return () => { s.off("typing:start", onStart); s.off("typing:stop", onStop); };
  }, [socket, activeRoom, currentUser._id]);

  const handleTyping = (e) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
    const s = socket.current;
    if (!s || !activeRoom) return;
    s.emit("typing:start", { roomId: activeRoom._id, userId: currentUser._id, username: currentUser.username });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      s.emit("typing:stop", { roomId: activeRoom._id, userId: currentUser._id });
    }, 1500);
  };

  const sendMessage = useCallback(async () => {
    const s = socket.current;
    if (!activeRoom || !s) return;

    if (pendingFile) {
      let uploaded = false;
      setUploading(true);
      setSendError("");
      setUploadProgress(0);
      try {
        const fd = new FormData();
        fd.append("file", pendingFile);
        const { data } = await axios.post("/api/upload", fd, {
          onUploadProgress: (event) => setUploadProgress(event.total ? Math.round((event.loaded * 100) / event.total) : 0),
        });
        s.emit("message:send", {
          roomId: activeRoom._id, senderId: currentUser._id,
          content: text.trim() || "", type: data.type,
          fileUrl: data.fileUrl, fileName: data.fileName,
          fileSize: data.fileSize, mimeType: data.mimeType,
        });
        uploaded = true;
      } catch (error) {
        setSendError(error.response?.data?.message || "File upload failed. Please try again.");
      } finally {
        setUploading(false); setUploadProgress(0);
        if (uploaded) { setPendingFile(null); setText(""); setReplyTo(null); }
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      }
      return;
    }

    const content = text.trim();
    if (!content) return;

    s.emit("message:send", {
      roomId: activeRoom._id, senderId: currentUser._id,
      content: encryptMessage(content), type: "text",
    });
    s.emit("typing:stop", { roomId: activeRoom._id, userId: currentUser._id });
    clearTimeout(typingTimeoutRef.current);
    setText(""); setReplyTo(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [socket, activeRoom, currentUser, text, pendingFile]);

  const chooseFile = (file) => {
    setSendError("");
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) return setSendError("Maximum file size is 25 MB.");
    setPendingFile(file);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Forward message to another room
  const handleForward = async (msg, targetRoomId) => {
    const s = socket.current;
    if (!s) return;
    s.emit("message:send", {
      roomId: targetRoomId, senderId: currentUser._id,
      content: msg.content, type: msg.type,
      fileUrl: msg.fileUrl || undefined, fileName: msg.fileName || undefined,
      fileSize: msg.fileSize || undefined, mimeType: msg.mimeType || undefined,
    });
    setForwardMsg(null);
  };

  const getRoomName = () => {
    if (!activeRoom) return "";
    if (activeRoom.type === "group") return activeRoom.name;
    return activeRoom.members?.find((m) => m._id !== currentUser._id)?.username || "Unknown";
  };

  const getRoomStatus = () => {
    if (!activeRoom) return "";
    if (activeRoom.type === "group") return (activeRoom.members?.length || 0) + " members";
    const other = activeRoom.members?.find((m) => m._id !== currentUser._id);
    return other ? (onlineUserIds.includes(other._id) ? "Online" : "Offline") : "";
  };

  const isOtherOnline = () => {
    if (!activeRoom || activeRoom.type !== "direct") return false;
    const other = activeRoom.members?.find((m) => m._id !== currentUser._id);
    return other ? onlineUserIds.includes(other._id) : false;
  };

  const typingNames = Object.values(typingUsers);
  const typingText = typingNames.length === 0 ? "" : typingNames.length === 1 ? typingNames[0] + " is typing" : typingNames.join(", ") + " are typing";

  function groupByDate(msgs) {
    const groups = [];
    let lastDate = null;
    for (const msg of msgs) {
      const d = new Date(msg.createdAt).toDateString();
      if (d !== lastDate) { groups.push({ type: "divider", date: d, id: "d-" + d }); lastDate = d; }
      groups.push({ type: "message", msg, id: msg._id });
    }
    return groups;
  }

  function formatDividerDate(dateStr) {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";
    return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  if (!activeRoom) return null;
  const grouped = groupByDate(roomMessages);

  return (
    <div className="chat-window" style={{ flex: 1, minWidth: 0, height: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg-primary)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: isMobile ? "12px 16px" : "10px 20px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", flexShrink: 0, zIndex: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
        {isMobile && onBack && (
          <button onClick={onBack} style={{ color: "var(--accent)", fontSize: 26, lineHeight: 1, padding: "0 4px 0 0" }}>‹</button>
        )}
        <Avatar name={getRoomName()} size={42} isGroup={activeRoom.type === "group"} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 16, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{getRoomName()}</div>
          <div style={{ fontSize: 12, color: typingText ? "var(--accent)" : isOtherOnline() ? "var(--accent)" : "var(--text-secondary)", fontStyle: typingText ? "italic" : "normal" }}>
            {typingText ? typingText + "..." : getRoomStatus()}
          </div>
        </div>
        <button style={{ width: 38, height: 38, borderRadius: "50%", color: "var(--text-secondary)", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>🔍</button>
      </div>

      {/* Messages */}
      <div className="message-canvas" style={{ flex: 1, overflowY: "auto", padding: "12px 5%", display: "flex", flexDirection: "column", gap: 2 }}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); chooseFile(e.dataTransfer.files?.[0]); }}>
        {grouped.map((item) => {
          if (item.type === "divider") {
            return (
              <div key={item.id} style={{ textAlign: "center", margin: "14px 0 6px" }}>
                <span style={{ display: "inline-block", background: "#182229", color: "var(--text-secondary)", fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 8 }}>
                  {formatDividerDate(item.date)}
                </span>
              </div>
            );
          }
          const msg = item.msg;
          const isOwn = msg.sender?._id === currentUser._id;
          return (
            <MessageBubble
              key={item.id}
              message={msg}
              isOwn={isOwn}
              currentUser={currentUser}
              onReply={(m) => { setReplyTo(m); textareaRef.current?.focus(); }}
              onForward={(m) => { setForwardMsg(m); axios.get("/api/users?exclude=" + currentUser._id).then(({ data }) => setRooms(data)); }}
            />
          );
        })}

        {typingNames.length > 0 && (
          <div style={{ display: "flex", alignSelf: "flex-start", padding: "4px 0" }}>
            <div style={{ background: "var(--bg-message-in)", borderRadius: "18px 18px 18px 4px", padding: "10px 14px", display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-muted)", animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", background: "var(--bg-tertiary)", borderTop: "1px solid var(--border)", borderLeft: "3px solid var(--accent)", flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, marginBottom: 2 }}>
              {replyTo.sender?.username || "Unknown"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {replyTo.type === "image" ? "📷 Photo" : replyTo.type === "file" ? "📎 File" : decryptMessage(replyTo.content)}
            </div>
          </div>
          <button onClick={() => setReplyTo(null)} style={{ color: "var(--text-muted)", fontSize: 18 }}>✕</button>
        </div>
      )}

      {/* File preview */}
      {pendingFile && (
        <div className="attachment-preview" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", background: "var(--bg-tertiary)", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          {/image/i.test(pendingFile.type) ? <img src={URL.createObjectURL(pendingFile)} alt="Preview" className="pending-image" /> : <span style={{ fontSize: 24 }}>📄</span>}
          <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pendingFile.name}</span>
          <span className="file-size">{(pendingFile.size / 1024 / 1024).toFixed(2)} MB</span>
          <button onClick={() => setPendingFile(null)} style={{ color: "var(--danger)", fontSize: 18, fontWeight: 700 }}>✕</button>
        </div>
      )}

      {sendError && <div className="send-error">⚠ {sendError}</div>}
      {uploading && <div className="upload-progress"><span style={{ width: `${uploadProgress}%` }} /></div>}

      {/* Input */}
      <div className="composer" style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "10px 16px", background: "var(--bg-secondary)", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <button onClick={() => fileInputRef.current?.click()} title="Attach"
          style={{ width: 42, height: 42, borderRadius: "50%", color: "var(--text-secondary)", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
        >
          <BsPaperclip />
        </button>
        <input ref={fileInputRef} type="file" style={{ display: "none" }}
          onChange={(e) => { chooseFile(e.target.files?.[0]); e.target.value = ""; }}
          accept="image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.rtf,.odt,.ods,.odp"
        />
        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", background: "var(--bg-tertiary)", borderRadius: 10, padding: "9px 14px", minHeight: 44 }}>
          <textarea ref={textareaRef}
            style={{ flex: 1, background: "none", color: "var(--text-primary)", fontSize: 15, resize: "none", maxHeight: 120, overflowY: "auto", lineHeight: 1.5, border: "none", outline: "none", fontFamily: "inherit", padding: 0 }}
            placeholder={pendingFile ? "Add a caption..." : replyTo ? "Reply..." : "Type a message"}
            value={text} onChange={handleTyping} onKeyDown={handleKeyDown} rows={1}
          />
        </div>
        <button onClick={sendMessage} disabled={(!text.trim() && !pendingFile) || uploading}
          style={{
            width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
            background: (!text.trim() && !pendingFile) || uploading ? "var(--bg-tertiary)" : "var(--accent)",
            color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: (!text.trim() && !pendingFile) || uploading ? "not-allowed" : "pointer",
            boxShadow: (!text.trim() && !pendingFile) || uploading ? "none" : "0 2px 8px rgba(0,168,132,0.4)",
            transition: "background 0.2s",
          }}>
          {uploading ? "⏳" : "➤"}
        </button>
      </div>

      {/* Forward Modal */}
      {forwardMsg && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setForwardMsg(null); }}>
          <div style={{ background: "#202c33", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380, maxHeight: "70vh", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 17, color: "#e9edef" }}>Forward to...</span>
              <button onClick={() => setForwardMsg(null)} style={{ color: "#8696a0", fontSize: 20 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {rooms.map((user) => (
                <div key={user._id} onClick={async () => {
                  const { data: room } = await axios.post("/api/rooms/direct", { userId2: user._id });
                  handleForward(forwardMsg, room._id);
                }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <Avatar name={user.username} size={38} />
                  <span style={{ fontWeight: 500, color: "#e9edef" }}>{user.username}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
