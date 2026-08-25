import React from "react";
import { HiUserGroup } from "react-icons/hi2";

const GRADIENTS = [
  ["#8b5cf6", "#5b7cff"], ["#06b6d4", "#2dd4bf"], ["#f97316", "#fb7185"],
  ["#22c55e", "#14b8a6"], ["#ec4899", "#8b5cf6"], ["#3b82f6", "#06b6d4"],
];

function gradientFor(name) {
  const hash = [...(name || "?")].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [from, to] = GRADIENTS[hash % GRADIENTS.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

export default function Avatar({ name = "?", size = 44, isGroup = false, online = false }) {
  const initials = name.split(/\s+/).filter(Boolean).map((word) => word[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <div className="avatar-wrap" style={{ width: size, height: size, minWidth: size }}>
      <div className="avatar-core" style={{ background: gradientFor(name), fontSize: size * 0.34 }}>
        {isGroup ? <HiUserGroup /> : initials}
      </div>
      {online && <span className="avatar-online" aria-label="Online" />}
    </div>
  );
}
