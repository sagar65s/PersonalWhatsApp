import React, { useEffect, useState } from "react";
import axios from "axios";
import { HiOutlineCheck, HiOutlineMagnifyingGlass, HiOutlineUserGroup, HiOutlineXMark } from "react-icons/hi2";
import Avatar from "./Avatar";
import { useSocket } from "../contexts/SocketContext";

export default function NewGroupModal({ currentUser, onClose }) {
  const { socket } = useSocket();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get(`/api/users?exclude=${currentUser._id}`).then(({ data }) => setUsers(data)).catch(() => setError("Could not load people."));
  }, [currentUser._id]);

  const toggle = (id) => setSelected((old) => old.includes(id) ? old.filter((item) => item !== id) : [...old, id]);
  const filtered = users.filter((user) => user.username.toLowerCase().includes(search.toLowerCase()));

  async function createGroup() {
    if (name.trim().length < 2) return setError("Group name must contain at least 2 characters.");
    if (!selected.length) return setError("Select at least one member.");
    setLoading(true); setError("");
    try {
      const { data: room } = await axios.post("/api/rooms/group", { name: name.trim(), members: selected });
      socket.current?.emit("room:created", { roomId: room._id, memberIds: room.members.map((member) => member._id) });
      onClose();
    } catch (requestError) { setError(requestError.response?.data?.message || "Group creation failed."); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card group-modal" role="dialog" aria-modal="true" aria-label="Create a new group">
        <header className="modal-head"><div className="modal-title-icon"><HiOutlineUserGroup /></div><div><span className="eyebrow">NEW CONVERSATION</span><h3>Create a group</h3><p>Bring everyone together in one place.</p></div><button className="icon-btn" onClick={onClose}><HiOutlineXMark /></button></header>
        {error && <div className="form-notice error"><span>!</span>{error}</div>}
        <label className="modal-field"><span>Group name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Project crew" maxLength={60} autoFocus /></label>
        <div className="modal-search"><HiOutlineMagnifyingGlass /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people" /></div>
        <div className="selected-summary"><strong>Select members</strong><span>{selected.length} selected</span></div>
        <div className="member-list">
          {filtered.map((user) => {
            const active = selected.includes(user._id);
            return <button className={`member-row ${active ? "selected" : ""}`} key={user._id} onClick={() => toggle(user._id)}><Avatar name={user.username} size={42} /><span><strong>{user.username}</strong><small>{user.isOnline ? "Online" : "Add to this group"}</small></span><i>{active && <HiOutlineCheck />}</i></button>;
          })}
          {!filtered.length && <div className="mini-empty">No people found.</div>}
        </div>
        <footer className="modal-actions"><button className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn compact" onClick={createGroup} disabled={loading}>{loading ? <span className="button-loader" /> : `Create group${selected.length ? ` · ${selected.length + 1}` : ""}`}</button></footer>
      </section>
    </div>
  );
}
