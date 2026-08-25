const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: ["direct", "group"],
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    avatar: {
      type: String,
      default: "",
    },
    clearedBy: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      at: { type: Date, required: true },
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", roomSchema);
