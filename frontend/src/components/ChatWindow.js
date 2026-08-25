import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { HiOutlineArrowLeft, HiOutlineArrowUp, HiOutlineDocument, HiOutlineFaceSmile, HiOutlineMagnifyingGlass, HiOutlinePaperClip, HiOutlinePhone, HiOutlineXMark } from "react-icons/hi2";
import Avatar from "./Avatar";
import MessageBubble from "./MessageBubble";
import { useChat } from "../contexts/ChatContext";
import { useSocket } from "../contexts/SocketContext";
import { decryptMessage, encryptMessage } from "../utils";

const ACCEPTED = "image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.rtf,.odt,.ods,.odp";
const EMOJIS = ["😀", "😂", "😍", "🥳", "👍", "👏", "🔥", "✨", "❤️", "✅", "🙏", "🎉"];

export default function ChatWindow({ currentUser, onBack, isMobile = false }) {
  const { activeRoom, messages } = useChat();
  const { socket, onlineUserIds } = useSocket();
  const [text, setText] = useState("");
  const [typing, setTyping] = useState({});
  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [reply, setReply] = useState(null);
  const [forward, setForward] = useState(null);
  const [people, setPeople] = useState([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const endRef = useRef(null);
  const typingTimer = useRef(null);
  const fileInput = useRef(null);
  const textarea = useRef(null);

  const roomMessages = useMemo(() => messages[activeRoom?._id] || [], [messages, activeRoom?._id]);
  const filteredMessages = useMemo(() => query.trim() ? roomMessages.filter((message) => decryptMessage(message.content).toLowerCase().includes(query.toLowerCase()) || message.fileName?.toLowerCase().includes(query.toLowerCase())) : roomMessages, [roomMessages, query]);
  const other = activeRoom?.type === "direct" ? activeRoom.members?.find((member) => member._id !== currentUser._id) : null;
  const roomName = activeRoom?.type === "group" ? activeRoom.name : other?.username || "Conversation";
  const otherOnline = Boolean(other && onlineUserIds.includes(other._id));
  const typingNames = Object.values(typing);
  const status = typingNames.length ? `${typingNames.join(", ")} ${typingNames.length > 1 ? "are" : "is"} typing…` : activeRoom?.type === "group" ? `${activeRoom.members?.length || 0} members` : otherOnline ? "Online now" : "Offline";
  const previewUrl = useMemo(() => pendingFile?.type.startsWith("image/") ? URL.createObjectURL(pendingFile) : "", [pendingFile]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [roomMessages.length]);
  useEffect(() => { setText(""); setTyping({}); setPendingFile(null); setReply(null); setQuery(""); setSearchOpen(false); }, [activeRoom?._id]);

  useEffect(() => {
    const activeSocket = socket.current;
    if (!activeSocket || !activeRoom) return undefined;
    const started = ({ userId, username, roomId }) => { if (userId !== currentUser._id && roomId === activeRoom._id) setTyping((old) => ({ ...old, [userId]: username })); };
    const stopped = ({ userId }) => setTyping((old) => { const next = { ...old }; delete next[userId]; return next; });
    const messageError = ({ message }) => setError(message || "Message could not be sent.");
    activeSocket.on("typing:start", started); activeSocket.on("typing:stop", stopped); activeSocket.on("message:error", messageError);
    return () => { activeSocket.off("typing:start", started); activeSocket.off("typing:stop", stopped); activeSocket.off("message:error", messageError); };
  }, [socket, activeRoom, currentUser._id]);

  const resizeTextarea = () => {
    if (!textarea.current) return;
    textarea.current.style.height = "auto";
    textarea.current.style.height = `${Math.min(textarea.current.scrollHeight, 130)}px`;
  };

  const handleText = (event) => {
    setText(event.target.value); setError(""); resizeTextarea();
    if (!socket.current || !activeRoom) return;
    socket.current.emit("typing:start", { roomId: activeRoom._id, username: currentUser.username });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.current?.emit("typing:stop", { roomId: activeRoom._id }), 1300);
  };

  const chooseFile = (file) => {
    setError("");
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) return setError("This file is larger than the 25 MB limit.");
    setPendingFile(file); setEmojiOpen(false);
  };

  const send = useCallback(async () => {
    const activeSocket = socket.current;
    if (!activeRoom || !activeSocket || uploading) return;
    if (pendingFile) {
      let uploaded = false;
      setUploading(true); setProgress(0); setError("");
      try {
        const body = new FormData(); body.append("file", pendingFile);
        const { data } = await axios.post("/api/upload", body, { onUploadProgress: (event) => setProgress(event.total ? Math.round((event.loaded * 100) / event.total) : 0) });
        activeSocket.emit("message:send", { roomId: activeRoom._id, content: text.trim(), type: data.type, fileUrl: data.fileUrl, fileName: data.fileName, fileSize: data.fileSize, mimeType: data.mimeType });
        uploaded = true;
      } catch (requestError) { setError(requestError.response?.data?.message || "Upload failed. Please try again."); }
      finally {
        setUploading(false); setProgress(0);
        if (uploaded) { setPendingFile(null); setText(""); setReply(null); }
      }
      return;
    }
    const content = text.trim();
    if (!content) return;
    activeSocket.emit("message:send", { roomId: activeRoom._id, content: encryptMessage(content), type: "text" });
    activeSocket.emit("typing:stop", { roomId: activeRoom._id });
    clearTimeout(typingTimer.current); setText(""); setReply(null); setEmojiOpen(false);
    if (textarea.current) textarea.current.style.height = "auto";
  }, [socket, activeRoom, text, pendingFile, uploading]);

  const keyDown = (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } };
  const openForward = (message) => { setForward(message); axios.get(`/api/users?exclude=${currentUser._id}`).then(({ data }) => setPeople(data)).catch(() => setPeople([])); };
  const forwardTo = async (user) => {
    try {
      const { data: room } = await axios.post("/api/rooms/direct", { userId2: user._id });
      socket.current?.emit("message:send", { roomId: room._id, content: forward.content, type: forward.type, fileUrl: forward.fileUrl || undefined, fileName: forward.fileName || undefined, fileSize: forward.fileSize || undefined, mimeType: forward.mimeType || undefined });
      setForward(null);
    } catch { setError("Could not forward this message."); }
  };

  if (!activeRoom) return null;
  const timeline = groupByDate(filteredMessages);

  return (
    <main className="chat-window">
      <header className="chat-header">
        {isMobile && <button className="icon-btn back-btn" onClick={onBack}><HiOutlineArrowLeft /></button>}
        <Avatar name={roomName} size={46} isGroup={activeRoom.type === "group"} online={otherOnline} />
        <div className="chat-heading"><strong>{roomName}</strong><span className={typingNames.length || otherOnline ? "accent" : ""}>{status}</span></div>
        {searchOpen && <div className="header-search"><HiOutlineMagnifyingGlass /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search in chat" /><button onClick={() => { setQuery(""); setSearchOpen(false); }}><HiOutlineXMark /></button></div>}
        <div className="chat-actions"><button className="icon-btn" title="Search" onClick={() => setSearchOpen((value) => !value)}><HiOutlineMagnifyingGlass /></button><button className="icon-btn" title="Voice call"><HiOutlinePhone /></button></div>
      </header>

      <section className="message-canvas" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files?.[0]); }}>
        <div className="canvas-noise" />
        {timeline.length ? timeline.map((item) => item.kind === "date"
          ? <div className="date-divider" key={item.id}><span>{formatDate(item.date)}</span></div>
          : <MessageBubble key={item.message._id} message={item.message} isOwn={(item.message.sender?._id || item.message.sender) === currentUser._id} onReply={setReply} onForward={openForward} />)
          : <div className="no-results"><HiOutlineMagnifyingGlass /><strong>No matching messages</strong><span>Try another word or filename.</span></div>}
        {typingNames.length > 0 && <div className="typing-bubble"><i /><i /><i /></div>}
        <div ref={endRef} />
      </section>

      {reply && <div className="reply-preview"><span className="reply-accent" /><div><strong>Replying to {reply.sender?.username || "message"}</strong><p>{reply.type === "image" ? "Photo" : reply.type === "file" ? reply.fileName : decryptMessage(reply.content)}</p></div><button onClick={() => setReply(null)}><HiOutlineXMark /></button></div>}

      {pendingFile && <div className="attachment-preview">{previewUrl ? <img src={previewUrl} alt="Selected" /> : <span className="attachment-file-icon"><HiOutlineDocument /></span>}<div><strong>{pendingFile.name}</strong><small>{(pendingFile.size / 1024 / 1024).toFixed(2)} MB · Ready to send</small></div><button onClick={() => setPendingFile(null)}><HiOutlineXMark /></button></div>}
      {error && <div className="send-error"><span>!</span>{error}<button onClick={() => setError("")}><HiOutlineXMark /></button></div>}
      {uploading && <div className="upload-progress"><span style={{ width: `${progress}%` }} /></div>}

      <footer className="composer">
        <div className="composer-tools">
          <button className="icon-btn" title="Emoji" onClick={() => setEmojiOpen((value) => !value)}><HiOutlineFaceSmile /></button>
          <button className="icon-btn" title="Attach file" onClick={() => fileInput.current?.click()}><HiOutlinePaperClip /></button>
          <input ref={fileInput} type="file" hidden accept={ACCEPTED} onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = ""; }} />
        </div>
        {emojiOpen && <div className="emoji-panel">{EMOJIS.map((emoji) => <button key={emoji} onClick={() => { setText((old) => `${old}${emoji}`); textarea.current?.focus(); }}>{emoji}</button>)}</div>}
        <div className="composer-input"><textarea ref={textarea} rows={1} value={text} onChange={handleText} onKeyDown={keyDown} placeholder={pendingFile ? "Add a caption…" : reply ? "Write a reply…" : "Write a message…"} /></div>
        <button className="send-button" disabled={(!text.trim() && !pendingFile) || uploading} onClick={send} aria-label="Send message">{uploading ? <span className="button-loader" /> : <HiOutlineArrowUp />}</button>
      </footer>

      {forward && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setForward(null)}><section className="modal-card forward-modal"><header className="modal-head"><div><span className="eyebrow">SHARE MESSAGE</span><h3>Forward to…</h3></div><button className="icon-btn" onClick={() => setForward(null)}><HiOutlineXMark /></button></header><div className="member-list">{people.map((user) => <button className="member-row" key={user._id} onClick={() => forwardTo(user)}><Avatar name={user.username} size={44} /><span><strong>{user.username}</strong><small>Send this message</small></span><i><HiOutlineArrowUp /></i></button>)}</div></section></div>}
    </main>
  );
}

function groupByDate(messages) {
  const result = []; let previous = "";
  messages.forEach((message) => { const date = new Date(message.createdAt).toDateString(); if (date !== previous) { result.push({ kind: "date", date, id: `date-${date}` }); previous = date; } result.push({ kind: "message", message }); });
  return result;
}

function formatDate(value) {
  const today = new Date().toDateString(); const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (value === today) return "Today"; if (value === yesterday) return "Yesterday";
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
