import React from "react";

const COLORS = [
  "#e57373","#f06292","#ba68c8","#7986cb",
  "#4fc3f7","#4dd0e1","#4db6ac","#81c784",
  "#aed581","#ffb74d","#ff8a65","#a1887f",
];

function getColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Avatar({ name = "?", size = 40, isGroup = false }) {
  const initials = isGroup
    ? (name[0] || "G").toUpperCase()
    : name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: isGroup ? "#2a3942" : getColor(name),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.38,
      fontWeight: 700,
      color: "#fff",
      flexShrink: 0,
      userSelect: "none",
      border: isGroup ? "2px solid #3d5a65" : "none",
    }}>
      {isGroup ? "👥" : initials}
    </div>
  );
}
