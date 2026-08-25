import React, { useState, useEffect } from "react";
import axios from "axios";
import { useChat } from "../contexts/ChatContext";
import { useSocket } from "../contexts/SocketContext";
import { formatDistanceToNow } from "date-fns";
import Avatar from "./Avatar";
import NewGroupModal from "./NewGroupModal";
import { decryptMessage } from "../utils";
import { MdGroup } from "react-icons/md";

export default function Sidebar({ currentUser, onLogout, fullWidth }) {
  const { rooms, activeRoom, openRoom, openDirectChat, notifications } = useChat();
  const { onlineUserIds } = useSocket();
  const [tab, setTab] = useState("chats");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);

  useEffect(() => {
    if (tab === "users") {
      axios.get("/api/users?exclude=" + currentUser._id).then(({ data }) => setUsers(data));
    }
  }, [tab, currentUser._id]);

  function getRoomName(room) {
    if (room.type === "group") return room.name;
    const other = room.members?.find((m) => m._id !== currentUser._id);
    return other?.username || "Unknown";
  }

  function getRoomOther(room) {
    return room.members?.find((m) => m._id !== currentUser._id);
  }

  function getPreview(room) {
    if (!room.lastMessage) return "No messages yet";
    const msg = room.lastMessage;
    if (msg.type === "image") return "📷 Photo";
    if (msg.type === "file") return "📎 " + (msg.fileName || "File");
    return decryptMessage(msg.content) || "";
  }

  function formatTime(date) {
    if (!date) return "";
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: false })
        .replace("about ", "").replace(" minutes", "m").replace(" minute", "m")
        .replace(" hours", "h").replace(" hour", "h")
        .replace(" days", "d").replace(" day", "d");
    } catch { return ""; }
  }

  const filteredRooms = rooms.filter((r) => getRoomName(r).toLowerCase().includes(search.toLowerCase()));
  const filteredUsers = users.filter((u) => u.username.toLowerCase().includes(search.toLowerCase()));

  const sidebarWidth = fullWidth ? "100%" : "var(--sidebar-width)";

  return (
    <div className="sidebar-shell" style={{
      width: sidebarWidth, minWidth: sidebarWidth, height: "100dvh",
      display: "flex", flexDirection: "column",
      background: "var(--bg-secondary)", borderRight: "1px solid var(--border)",
      overflow: "hidden", flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px", background: "var(--bg-tertiary)", height: 60, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <Avatar name={currentUser.username} size={40} />
            <div style={{
              width: 10, height: 10, borderRadius: "50%", background: "var(--online)",
              border: "2px solid var(--bg-secondary)", position: "absolute", bottom: 0, right: 0,
            }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{currentUser.username}</div>
            <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>Online</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button onClick={() => setShowGroupModal(true)} title="New Group"
            style={{ width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontSize: 20 }}>
            <MdGroup />
          </button>
          <button onClick={onLogout}
            style={{ padding: "6px 10px", borderRadius: 8, color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "8px 12px", background: "var(--bg-secondary)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-tertiary)", borderRadius: "var(--radius-xl)", padding: "8px 14px" }}>
          <span style={{ color: "var(--text-muted)", fontSize: 14 }}>🔍</span>
          <input
            style={{ flex: 1, background: "none", color: "var(--text-primary)", fontSize: 14 }}
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch("")} style={{ color: "var(--text-muted)", fontSize: 14 }}>✕</button>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", padding: "0 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {["chats", "users"].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600,
            color: tab === t ? "var(--accent)" : "var(--text-secondary)",
            borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
            transition: "var(--transition)",
          }}>
            {t === "chats" ? "Chats" : "People"}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "chats" ? (
          filteredRooms.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No chats yet. Switch to People to start one!
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isActive = activeRoom?._id === room._id;
              const other = room.type === "direct" ? getRoomOther(room) : null;
              const isOnline = other ? onlineUserIds.includes(other._id) : false;
              const unread = notifications[room._id] || 0;
              return (
                <div className="conversation-row" key={room._id}
                  onClick={() => openRoom(room)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 16px", cursor: "pointer",
                    background: isActive ? "var(--bg-tertiary)" : "transparent",
                    borderBottom: "1px solid var(--border)", transition: "var(--transition)",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <Avatar name={getRoomName(room)} size={48} isGroup={room.type === "group"} />
                    {isOnline && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--online)", border: "2px solid var(--bg-secondary)", position: "absolute", bottom: 0, right: 0 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {getRoomName(room)}
                      </span>
                      <span style={{ fontSize: 11, color: unread > 0 ? "var(--accent)" : "var(--text-muted)", flexShrink: 0, marginLeft: 8 }}>
                        {formatTime(room.updatedAt)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {getPreview(room)}
                      </span>
                      {unread > 0 && (
                        <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", flexShrink: 0 }}>
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          filteredUsers.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No users found</div>
          ) : (
            filteredUsers.map((user) => {
              const isOnline = onlineUserIds.includes(user._id);
              return (
                <div className="conversation-row" key={user._id} onClick={() => openDirectChat(user)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid var(--border)", transition: "var(--transition)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <Avatar name={user.username} size={48} />
                    {isOnline && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--online)", border: "2px solid var(--bg-secondary)", position: "absolute", bottom: 0, right: 0 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{user.username}</span>
                      <span style={{ fontSize: 11, color: isOnline ? "var(--accent)" : "var(--text-muted)", fontWeight: 600 }}>
                        {isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{isOnline ? "Active now" : "Tap to message"}</div>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      {showGroupModal && <NewGroupModal currentUser={currentUser} onClose={() => setShowGroupModal(false)} />}
    </div>
  );
}
