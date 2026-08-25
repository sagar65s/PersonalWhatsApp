import React from "react";

const ForwardModal = ({ users, onClose, onSelect }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
      <div className="bg-white p-4 rounded w-80">
        <h2 className="font-bold mb-3">Forward Message</h2>

        {users.map((user) => (
          <div
            key={user._id}
            className="p-2 hover:bg-gray-100 cursor-pointer"
            onClick={() => onSelect(user)}
          >
            {user.name}
          </div>
        ))}

        <button onClick={onClose} className="mt-3">Cancel</button>
      </div>
    </div>
  );
};

export default ForwardModal;