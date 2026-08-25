import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { BsCheck2, BsCheck2All } from "react-icons/bs";
import { HiOutlineArrowDownTray, HiOutlineArrowRight, HiOutlineArrowUturnLeft, HiOutlineClipboard, HiOutlineDocument, HiOutlineEllipsisVertical, HiOutlineMicrophone, HiOutlinePhoto } from "react-icons/hi2";
import { decryptMessage } from "../utils";

const SERVER = process.env.REACT_APP_SERVER_URL || window.location.origin;
const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function fileSize(bytes) {
  if (!bytes) return "Document";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function extension(name = "") {
  return name.includes(".") ? name.split(".").pop().slice(0, 5).toUpperCase() : "FILE";
}

function Delivery({ status }) {
  if (status === "read") return <BsCheck2All className="tick tick-read" title="Read" />;
  if (status === "delivered") return <BsCheck2All className="tick" title="Delivered" />;
  return <BsCheck2 className="tick" title="Sent" />;
}

export default function MessageBubble({ message, isOwn, onReply, onForward }) {
  const [menu, setMenu] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [reaction, setReaction] = useState("");
  const hold = useRef(null);
  const text = decryptMessage(message.content);
  const time = message.createdAt ? format(new Date(message.createdAt), "h:mm a") : "";
  const sender = message.sender?.username || "Unknown";
  const url = message.fileUrl ? `${SERVER}${message.fileUrl}` : "";

  useEffect(() => {
    const close = (event) => event.key === "Escape" && setMenu(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const openMenu = (x, y) => setMenu({ x: Math.min(x, window.innerWidth - 240), y: Math.min(y, window.innerHeight - 235) });
  const contextMenu = (event) => { event.preventDefault(); openMenu(event.clientX, event.clientY); };
  const touchStart = (event) => { const touch = event.touches[0]; hold.current = setTimeout(() => openMenu(touch.clientX, touch.clientY), 520); };
  const touchEnd = () => clearTimeout(hold.current);
  const copy = () => { navigator.clipboard?.writeText(text || message.fileName || "").catch(() => {}); setMenu(null); };

  return (
    <div className={`message-line ${isOwn ? "own" : "other"}`}>
      <div className="message-stack">
        {!isOwn && <span className="message-sender">{sender}</span>}
        <article className={`message-card ${message.type}`} onContextMenu={contextMenu} onTouchStart={touchStart} onTouchEnd={touchEnd} onTouchMove={touchEnd}>
          <button className="message-menu-button" aria-label="Message actions" onClick={(event) => { const box = event.currentTarget.getBoundingClientRect(); openMenu(box.right - 220, box.bottom + 6); }}><HiOutlineEllipsisVertical /></button>

          {message.type === "image" && url && !imageFailed && <div className="message-image-wrap"><img src={url} alt={message.fileName || "Shared attachment"} onError={() => setImageFailed(true)} onClick={() => window.open(url, "_blank", "noopener,noreferrer")} />{message.fileName && <span className="image-badge"><HiOutlinePhoto /> Photo</span>}</div>}
          {message.type === "image" && imageFailed && <a className="broken-attachment" href={url} target="_blank" rel="noopener noreferrer"><HiOutlinePhoto /><span>Open shared image</span></a>}

          {message.type === "file" && url && <a className="document-card" href={url} target="_blank" rel="noopener noreferrer" download={message.fileName || true}><span className="document-icon"><HiOutlineDocument /><b>{extension(message.fileName)}</b></span><span className="document-copy"><strong>{message.fileName || "Shared document"}</strong><small>{fileSize(message.fileSize)} · Tap to open</small></span><span className="download-icon"><HiOutlineArrowDownTray /></span></a>}

          {message.type === "audio" && url && <div className="voice-message"><span><HiOutlineMicrophone /></span><audio controls preload="metadata" src={url}>Your browser does not support audio playback.</audio></div>}

          {text && <p className={`message-text ${message.type !== "text" ? "caption" : ""}`}>{text}</p>}
          <footer className="message-meta"><time>{time}</time>{isOwn && <Delivery status={message.status || "sent"} />}</footer>
        </article>
        {reaction && <button className="reaction-pill" onClick={() => setReaction("")}>{reaction}</button>}
      </div>

      {menu && <>
        <div className="menu-scrim" onClick={() => setMenu(null)} />
        <div className="message-popover" style={{ left: Math.max(10, menu.x), top: Math.max(10, menu.y) }}>
          <div className="reaction-bar">{REACTIONS.map((emoji) => <button key={emoji} className={reaction === emoji ? "active" : ""} onClick={() => { setReaction(reaction === emoji ? "" : emoji); setMenu(null); }}>{emoji}</button>)}</div>
          <button onClick={() => { onReply?.(message); setMenu(null); }}><HiOutlineArrowUturnLeft /> Reply</button>
          {text && <button onClick={copy}><HiOutlineClipboard /> Copy text</button>}
          <button onClick={() => { onForward?.(message); setMenu(null); }}><HiOutlineArrowRight /> Forward</button>
        </div>
      </>}
    </div>
  );
}
