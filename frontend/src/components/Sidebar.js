import React, { useEffect, useState } from "react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { HiOutlineChatBubbleLeftRight, HiOutlineMagnifyingGlass, HiOutlineUserGroup, HiOutlineUsers, HiOutlineArrowRightOnRectangle, HiOutlineXMark, HiOutlinePlus } from "react-icons/hi2";
import Avatar from "./Avatar";
import NewGroupModal from "./NewGroupModal";
import { useChat } from "../contexts/ChatContext";
import { useSocket } from "../contexts/SocketContext";
import { decryptMessage } from "../utils";

export default function Sidebar({ currentUser, onLogout, fullWidth = false }) {
  const { rooms, activeRoom, openRoom, openDirectChat, notifications, totalUnread } = useChat();
  const { onlineUserIds } = useSocket();
  const [tab, setTab] = useState("chats");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [showGroup, setShowGroup] = useState(false);

  useEffect(() => {
    if (tab !== "people") return;
    axios.get(`/api/users?exclude=${currentUser._id}`).then(({ data }) => setUsers(data)).catch(() => setUsers([]));
  }, [tab, currentUser._id]);

  const roomName = (room) => room.type === "group" ? room.name : room.members?.find((member) => member._id !== currentUser._id)?.username || "Unknown";
  const preview = (room) => {
    const message = room.lastMessage;
    if (!message) return "Start a conversation";
    if (message.type === "image") return "Photo";
    if (message.type === "audio") return "Voice message";
    if (message.type === "file") return message.fileName || "Document";
    return decryptMessage(message.content) || "Message";
  };
  const relativeTime = (date) => {
    try { return formatDistanceToNow(new Date(date), { addSuffix: false }).replace("about ", ""); }
    catch { return ""; }
  };

  const filteredRooms = rooms.filter((room) => roomName(room).toLowerCase().includes(search.toLowerCase()));
  const filteredUsers = users.filter((user) => user.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <aside className={`sidebar ${fullWidth ? "sidebar-full" : ""}`}>
      <header className="sidebar-brand">
        <div className="brand-lockup"><span className="brand-icon"><HiOutlineChatBubbleLeftRight /></span><div><strong>ChatApp</strong><small>Connect beautifully</small></div></div>
        <button className="icon-btn create-btn" title="New group" onClick={() => setShowGroup(true)}><HiOutlinePlus /></button>
      </header>

      <section className="profile-strip">
        <Avatar name={currentUser.username} size={48} online />
        <div className="profile-copy"><strong>{currentUser.username}</strong><span><i /> Available</span></div>
        <button className="icon-btn logout-btn" title="Logout" onClick={onLogout}><HiOutlineArrowRightOnRectangle /></button>
      </section>

      <div className="sidebar-search">
        <HiOutlineMagnifyingGlass />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tab === "chats" ? "Search conversations" : "Find people"} />
        {search && <button onClick={() => setSearch("")}><HiOutlineXMark /></button>}
      </div>

      <nav className="sidebar-tabs">
        <button className={tab === "chats" ? "active" : ""} onClick={() => setTab("chats")}><HiOutlineChatBubbleLeftRight /> Chats <span>{totalUnread > 0 ? totalUnread : rooms.length}</span></button>
        <button className={tab === "people" ? "active" : ""} onClick={() => setTab("people")}><HiOutlineUsers /> People</button>
      </nav>

      <div className="sidebar-list">
        {tab === "chats" && (filteredRooms.length ? filteredRooms.map((room) => {
          const other = room.type === "direct" ? room.members?.find((member) => member._id !== currentUser._id) : null;
          const online = Boolean(other && onlineUserIds.includes(other._id));
          const unread = notifications[room._id] || 0;
          return (
            <button className={`chat-row ${activeRoom?._id === room._id ? "active" : ""}`} key={room._id} onClick={() => openRoom(room)}>
              <Avatar name={roomName(room)} size={52} isGroup={room.type === "group"} online={online} />
              <span className="chat-row-copy"><span className="chat-row-top"><strong>{roomName(room)}</strong><time>{relativeTime(room.updatedAt)}</time></span><span className="chat-row-bottom"><em>{room.lastMessage?.type === "image" ? "▧ " : room.lastMessage?.type === "file" ? "◇ " : room.lastMessage?.type === "audio" ? "◉ " : ""}{preview(room)}</em>{unread > 0 && <b>{unread > 99 ? "99+" : unread}</b>}</span></span>
            </button>
          );
        }) : <EmptyList icon={<HiOutlineChatBubbleLeftRight />} title="No conversations yet" text="Open People and say hello." />)}

        {tab === "people" && (filteredUsers.length ? filteredUsers.map((user) => {
          const online = onlineUserIds.includes(user._id);
          return (
            <button className="chat-row" key={user._id} onClick={() => openDirectChat(user)}>
              <Avatar name={user.username} size={52} online={online} />
              <span className="chat-row-copy"><span className="chat-row-top"><strong>{user.username}</strong><time className={online ? "online-label" : ""}>{online ? "Online" : "Offline"}</time></span><span className="chat-row-bottom"><em>{online ? "Active now" : "Tap to start a chat"}</em></span></span>
            </button>
          );
        }) : <EmptyList icon={<HiOutlineUsers />} title="Nobody found" text="Try a different search." />)}
      </div>

      <button className="new-group-fab" onClick={() => setShowGroup(true)}><HiOutlineUserGroup /><span>New group</span></button>
      {showGroup && <NewGroupModal currentUser={currentUser} onClose={() => setShowGroup(false)} />}
    </aside>
  );
}

function EmptyList({ icon, title, text }) {
  return <div className="empty-list"><span>{icon}</span><strong>{title}</strong><p>{text}</p></div>;
}
