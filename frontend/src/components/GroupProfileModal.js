import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { HiOutlineMagnifyingGlass, HiOutlineTrash, HiOutlineUserGroup, HiOutlineUserMinus, HiOutlineUserPlus, HiOutlineXMark } from "react-icons/hi2";
import Avatar from "./Avatar";
import { useChat } from "../contexts/ChatContext";

export default function GroupProfileModal({ room, currentUser, onClose }) {
  const { updateGroupMember, deleteChat } = useChat();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const creatorId = room.createdBy?._id || room.createdBy;
  const isOwner = creatorId === currentUser._id;
  const memberIds = useMemo(() => new Set(room.members?.map((member) => member._id)), [room.members]);
  const available = users.filter((user) => !memberIds.has(user._id) && user.username.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!isOwner) return;
    axios.get(`/api/users?exclude=${currentUser._id}`).then(({ data }) => setUsers(data)).catch(() => setError("Could not load people."));
  }, [currentUser._id, isOwner]);

  async function changeMember(action, userId) {
    setBusy(`${action}:${userId}`); setError("");
    try { await updateGroupMember(room._id, action, userId); }
    catch (requestError) { setError(requestError.response?.data?.message || "Could not update this group."); }
    finally { setBusy(""); }
  }

  async function removeGroup() {
    if (!window.confirm(`Delete “${room.name}” permanently? All messages and attachments will be removed for every member.`)) return;
    setBusy("delete"); setError("");
    try { await deleteChat(room._id); onClose(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Could not delete this group."); setBusy(""); }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card group-profile-modal" role="dialog" aria-modal="true" aria-label="Group profile">
        <header className="group-profile-head">
          <Avatar name={room.name} size={70} isGroup />
          <div><span className="eyebrow">GROUP PROFILE</span><h3>{room.name}</h3><p>{room.members?.length || 0} members · Created by {room.createdBy?.username || "group owner"}</p></div>
          <button className="icon-btn" onClick={onClose}><HiOutlineXMark /></button>
        </header>
        {error && <div className="form-notice error"><span>!</span>{error}</div>}

        <div className="selected-summary"><strong>Members</strong><span>{isOwner ? "You manage this group" : "Only the creator can edit"}</span></div>
        <div className="member-list profile-members">
          {room.members?.map((member) => {
            const owner = member._id === creatorId;
            return <div className="member-row" key={member._id}><Avatar name={member.username} size={42} /><span><strong>{member.username}</strong><small>{owner ? "Group creator" : member._id === currentUser._id ? "You" : "Group member"}</small></span>{isOwner && !owner && <button className="member-action remove" disabled={Boolean(busy)} title="Remove member" onClick={() => changeMember("remove", member._id)}>{busy === `remove:${member._id}` ? <span className="button-loader" /> : <HiOutlineUserMinus />}</button>}</div>;
          })}
        </div>

        {isOwner && <>
          <div className="selected-summary"><strong><HiOutlineUserPlus /> Add members</strong><span>{available.length} available</span></div>
          <div className="modal-search"><HiOutlineMagnifyingGlass /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people to add" /></div>
          <div className="member-list add-members">
            {available.map((user) => <button className="member-row" key={user._id} disabled={Boolean(busy)} onClick={() => changeMember("add", user._id)}><Avatar name={user.username} size={40} /><span><strong>{user.username}</strong><small>Add to {room.name}</small></span><i>{busy === `add:${user._id}` ? <span className="button-loader" /> : <HiOutlineUserPlus />}</i></button>)}
            {!available.length && <div className="mini-empty"><HiOutlineUserGroup /> No more people to add.</div>}
          </div>
          <button className="danger-action" disabled={Boolean(busy)} onClick={removeGroup}><HiOutlineTrash /> Delete group permanently</button>
        </>}
      </section>
    </div>
  );
}
