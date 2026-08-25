import React, { useState, useRef } from "react";
import { format } from "date-fns";
import { FaCheck, FaCheckDouble, FaDownload } from "react-icons/fa";
import { BsFileEarmarkFill } from "react-icons/bs";
import { decryptMessage } from "../utils";

const SERVER = process.env.REACT_APP_SERVER_URL || window.location.origin;

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const ALL_EMOJIS = [
  "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕","🤑","🤠","😈","👿","👹","👺","🤡","💩","👻","💀","☠️","👽","👾","🤖","🎃","😺","😸","😹","😻","😼","😽","🙀","😿","😾",
  "👋","🤚","🖐","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🫀","🫁","🧠","🦷","🦴","👀","👁","👅","👄",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️","🉑","☢️","☣️","📴","📳","🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴","🈵","🈹","🈲","🅰️","🅱️","🆎","🆑","🅾️","🆘","❌","⭕","🛑","⛔","📛","🚫","💯","💢","♨️","🚷","🚯","🚳","🚱","🔞","📵","🚭","❗","❕","❓","❔","‼️","⁉️","🔅","🔆","〽️","⚠️","🔱","⚜️","🔰","♻️","✅","🈯","💹","❎","🌐","💠","Ⓜ️","🌀","💤","🏧","🚾","♿","🅿️","🈳","🈂️","🛂","🛃","🛄","🛅","🚹","🚺","🚼","🚻","🚮","🎦","📶","🈁","🔣","ℹ️","🔤","🔡","🔠","🆖","🆗","🆙","🆒","🆕","🆓","0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟","🔢","▶️","⏸","⏯","⏹","⏺","⏭","⏮","⏩","⏪","⏫","⏬","◀️","🔼","🔽","➡️","⬅️","⬆️","⬇️","↗️","↘️","↙️","↖️","↕️","↔️","↪️","↩️","⤴️","⤵️","🔀","🔁","🔂","🔄","🔃","🎵","🎶","➕","➖","➗","✖️","♾","💲","💱","™️","©️","®️","〰️","➰","➿","🔚","🔙","🔛","🔝","🔜","✔️","☑️","🔘","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🟤","🔺","🔻","🔸","🔹","🔶","🔷","🔳","🔲","▪️","▫️","◾","◽","◼️","◻️","🟥","🟧","🟨","🟩","🟦","🟪","⬛","⬜","🟫","🔈","🔇","🔉","🔊","🔔","🔕","📣","📢","👁‍🗨","💬","💭","🗯","♠️","♣️","♥️","♦️","🃏","🎴","🀄","🕐","🕑","🕒","🕓","🕔","🕕","🕖","🕗","🕘","🕙","🕚","🕛","🕜","🕝","🕞","🕟","🕠","🕡","🕢","🕣","🕤","🕥","🕦","🕧"
];

function Ticks({ status }) {
  if (status === "read") return <FaCheckDouble style={{ marginLeft: 4, color: "#53bdeb", fontSize: 11 }} />;
  if (status === "delivered") return <FaCheckDouble style={{ marginLeft: 4, color: "rgba(255,255,255,0.5)", fontSize: 11 }} />;
  return <FaCheck style={{ marginLeft: 4, color: "rgba(255,255,255,0.5)", fontSize: 11 }} />;
}

export default function MessageBubble({ message, isOwn, onReply, onForward }) {
  const [imgError, setImgError] = useState(false);
  const [menu, setMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showAllEmojis, setShowAllEmojis] = useState(false);
  const [reactions, setReactions] = useState({});
  const [emojiSearch, setEmojiSearch] = useState("");
  const longPressRef = useRef(null);

  const time = message.createdAt ? format(new Date(message.createdAt), "HH:mm") : "";
  const senderName = message.sender?.username || "";
  const decrypted = decryptMessage(message.content);
  const formattedSize = message.fileSize ? `${(message.fileSize / 1024 / 1024).toFixed(message.fileSize > 1024 * 1024 ? 1 : 2)} MB` : "Document";

  const openMenu = (x, y) => {
    // Keep menu inside viewport
    const menuW = 200, menuH = 320;
    const safeX = Math.min(x, window.innerWidth - menuW - 8);
    const safeY = Math.min(y, window.innerHeight - menuH - 8);
    setMenuPos({ x: Math.max(8, safeX), y: Math.max(8, safeY) });
    setMenu(true);
    setShowAllEmojis(false);
    setEmojiSearch("");
  };

  const closeMenu = () => { setMenu(false); setShowAllEmojis(false); setEmojiSearch(""); };

  const handleContextMenu = (e) => { e.preventDefault(); openMenu(e.clientX, e.clientY); };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    longPressRef.current = setTimeout(() => openMenu(touch.clientX, touch.clientY), 500);
  };
  const handleTouchEnd = () => clearTimeout(longPressRef.current);

  const handleReact = (emoji) => {
    setReactions((prev) => {
      const cur = prev[emoji] || 0;
      return { ...prev, [emoji]: cur === 0 ? 1 : 0 };
    });
    closeMenu();
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(decrypted).catch(() => {});
    closeMenu();
  };

  const handleReply = () => { onReply?.(message); closeMenu(); };
  const handleForward = () => { onForward?.(message); closeMenu(); };

  const filteredEmojis = emojiSearch ? ALL_EMOJIS.filter(e => e.includes(emojiSearch)) : ALL_EMOJIS;

  const bubbleStyle = {
    maxWidth: "65%",
    padding: "7px 12px",
    borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
    background: isOwn ? "var(--bg-message-out)" : "var(--bg-message-in)",
    color: "var(--text-primary)",
    fontSize: 14, lineHeight: 1.5, wordBreak: "break-word",
    boxShadow: "var(--shadow-sm)", cursor: "pointer", userSelect: "none",
    position: "relative",
  };

  const renderContent = () => {
    if (message.type === "image" && message.fileUrl && !imgError) {
      const url = SERVER + message.fileUrl;
      return (
        <div>
          <img src={url} alt="img" onError={() => setImgError(true)} onClick={() => window.open(url, "_blank")}
            style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 8, display: "block", cursor: "pointer", objectFit: "cover" }} />
          {message.content ? <div style={{ marginTop: 5, fontSize: 14 }}>{decrypted}</div> : null}
        </div>
      );
    }
    if (message.type === "file" && message.fileUrl) {
      const url = SERVER + message.fileUrl;
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" download={message.fileName || true}
          style={{ display: "flex", alignItems: "center", gap: 10, color: isOwn ? "#fff" : "var(--text-link)", textDecoration: "none" }}>
          <BsFileEarmarkFill style={{ fontSize: 22, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{message.fileName || "File"}</div>
            <div style={{ fontSize: 11, opacity: 0.7, display: "flex", alignItems: "center", gap: 4 }}>
              {formattedSize} · <FaDownload style={{ fontSize: 10 }} /> Download
            </div>
          </div>
        </a>
      );
    }
    return <span style={{ whiteSpace: "pre-wrap" }}>{decrypted}</span>;
  };

  const activeReactions = Object.entries(reactions).filter(([, count]) => count > 0);

  return (
    <>
      {menu && <div onClick={closeMenu} style={{ position: "fixed", inset: 0, zIndex: 998 }} />}

      <div className={isOwn ? "msg-out" : "msg-in"}
        style={{ display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start", marginBottom: 3 }}>
        {!isOwn && senderName && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", marginBottom: 2, marginLeft: 4, userSelect: "none" }}>{senderName}</span>
        )}

        <div className="message-bubble" style={bubbleStyle} onContextMenu={handleContextMenu} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchMove={handleTouchEnd}>
          {renderContent()}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2, marginTop: 3 }}>
            <span style={{ fontSize: 11, color: isOwn ? "rgba(255,255,255,0.5)" : "var(--text-muted)", userSelect: "none" }}>{time}</span>
            {isOwn && <Ticks status={message.status || "sent"} />}
          </div>
        </div>

        {/* Reactions display */}
        {activeReactions.length > 0 && (
          <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap", justifyContent: isOwn ? "flex-end" : "flex-start" }}>
            {activeReactions.map(([emoji]) => (
              <span key={emoji} onClick={() => handleReact(emoji)}
                style={{ background: "var(--bg-tertiary)", borderRadius: 12, padding: "2px 8px", fontSize: 16, cursor: "pointer", border: "1px solid var(--border)" }}>
                {emoji}
              </span>
            ))}
          </div>
        )}

        {/* Context Menu */}
        {menu && (
          <div style={{
            position: "fixed", top: menuPos.y, left: menuPos.x,
            background: "#202c33", borderRadius: 14,
            boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
            border: "1px solid rgba(134,150,160,0.2)",
            zIndex: 999, overflow: "hidden", minWidth: 200,
          }}>
            {!showAllEmojis ? (
              <>
                {/* Quick emoji row */}
                <div style={{ display: "flex", alignItems: "center", padding: "10px 10px 8px", borderBottom: "1px solid rgba(134,150,160,0.15)", gap: 2 }}>
                  {QUICK_EMOJIS.map((emoji) => (
                    <button key={emoji} onClick={() => handleReact(emoji)}
                      style={{
                        fontSize: 22, background: reactions[emoji] ? "rgba(0,168,132,0.2)" : "none",
                        border: reactions[emoji] ? "1px solid var(--accent)" : "1px solid transparent",
                        borderRadius: 8, padding: "3px 5px", cursor: "pointer", transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = reactions[emoji] ? "rgba(0,168,132,0.2)" : "none"}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button onClick={() => setShowAllEmojis(true)}
                    style={{ fontSize: 16, color: "#8696a0", background: "none", border: "1px solid transparent", borderRadius: 8, padding: "3px 6px", cursor: "pointer", marginLeft: "auto" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  >
                    +
                  </button>
                </div>

                {/* Menu items */}
                {[
                  { icon: "↩️", label: "Reply", action: handleReply },
                  { icon: "📋", label: "Copy", action: handleCopy },
                  { icon: "↪️", label: "Forward", action: handleForward },
                  { icon: "📌", label: "Pin", action: closeMenu },
                  { icon: "⭐", label: "Star", action: closeMenu },
                ].map(({ icon, label, action }) => (
                  <button key={label} onClick={action}
                    style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "12px 16px", background: "none", border: "none", color: "#e9edef", fontSize: 14, cursor: "pointer", textAlign: "left", transition: "background 0.15s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  >
                    <span style={{ fontSize: 18 }}>{icon}</span> {label}
                  </button>
                ))}
              </>
            ) : (
              // Full emoji picker
              <div style={{ width: 280, maxHeight: 340, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid rgba(134,150,160,0.15)" }}>
                  <button onClick={() => setShowAllEmojis(false)} style={{ color: "#8696a0", fontSize: 16, background: "none", border: "none", cursor: "pointer" }}>←</button>
                  <input
                    placeholder="Search reaction"
                    value={emojiSearch}
                    onChange={(e) => setEmojiSearch(e.target.value)}
                    style={{ flex: 1, background: "var(--bg-tertiary)", color: "#e9edef", padding: "6px 10px", borderRadius: 8, fontSize: 13, border: "none", outline: "none" }}
                    autoFocus
                  />
                </div>
                <div style={{ overflowY: "auto", padding: 8, display: "flex", flexWrap: "wrap", gap: 2, flex: 1 }}>
                  {filteredEmojis.map((emoji, i) => (
                    <button key={i} onClick={() => handleReact(emoji)}
                      style={{
                        fontSize: 22, background: reactions[emoji] ? "rgba(0,168,132,0.2)" : "none",
                        border: "none", borderRadius: 6, padding: "4px", cursor: "pointer", lineHeight: 1,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = reactions[emoji] ? "rgba(0,168,132,0.2)" : "none"}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
