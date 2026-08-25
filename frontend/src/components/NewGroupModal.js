import React, { useState, useEffect } from "react";
import axios from "axios";
import Avatar from "./Avatar";
import { useSocket } from "../contexts/SocketContext";

export default function NewGroupModal({ currentUser, onClose }) {
  const { socket } = useSocket();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get("/api/users?exclude=" + currentUser._id).then(({ data }) => setUsers(data));
  }, [currentUser._id]);

  function toggle(uid) {
    setSelected((p) => p.includes(uid) ? p.filter((x) => x !== uid) : [...p, uid]);
  }

  async function create() {
    if (!name.trim()) return setError("Enter a group name");
    if (selected.length < 1) return setError("Select at least 1 member");
    setLoading(true); setError("");
    try {
      const { data: room } = await axios.post("/api/rooms/group", {
        name: name.trim(), members: selected, createdBy: currentUser._id,
      });
      socket.current?.emit("room:created", { roomId: room._id, memberIds: room.members.map((m) => m._id) });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: 16,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "#202c33", borderRadius: 16, padding: 24,
        width: "100%", maxWidth: 400, maxHeight: "80vh",
        display: "flex", flexDirection: "column", gap: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 17, color: "#e9edef" }}>New Group</span>
          <button onClick={onClose} style={{ color: "#8696a0", fontSize: 20 }}>✕</button>
        </div>

        {error && <div style={{ color: "#f15c6d", fontSize: 13, background: "rgba(241,92,109,0.1)", padding: "8px 12px", borderRadius: 8 }}>{error}</div>}

        <input
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: "11px 14px", borderRadius: 10, background: "#2a3942", color: "#e9edef", fontSize: 15, border: "1px solid rgba(134,150,160,0.2)", width: "100%" }}
        />

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
          {users.map((u) => (
            <div key={u._id} onClick={() => toggle(u._id)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                borderRadius: 10, cursor: "pointer",
                background: selected.includes(u._id) ? "rgba(0,168,132,0.15)" : "transparent",
                transition: "background 0.15s",
              }}>
              <Avatar name={u.username} size={38} />
              <span style={{ flex: 1, fontWeight: 500, color: "#e9edef" }}>{u.username}</span>
              {selected.includes(u._id) && <span style={{ color: "#00a884", fontSize: 18 }}>✓</span>}
            </div>
          ))}
        </div>

        <button onClick={create} disabled={loading}
          style={{
            padding: "12px", borderRadius: 10, background: loading ? "#2a3942" : "#00a884",
            color: "#fff", fontWeight: 600, fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
          }}>
          {loading ? "Creating..." : `Create Group${selected.length > 0 ? ` (${selected.length + 1})` : ""}`}
        </button>
      </div>
    </div>
  );
}
