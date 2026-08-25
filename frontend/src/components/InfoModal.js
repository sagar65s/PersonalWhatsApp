import React from "react";

const InfoModal = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
      <div className="bg-white p-4 rounded w-80">
        <h2 className="font-bold mb-2">Message Info</h2>

        <p><strong>Sent:</strong> {new Date(message.createdAt).toLocaleString()}</p>
        <p><strong>Status:</strong> {message.read ? "Read" : "Delivered"}</p>

        <button onClick={onClose} className="mt-3">Close</button>
      </div>
    </div>
  );
};

export default InfoModal;