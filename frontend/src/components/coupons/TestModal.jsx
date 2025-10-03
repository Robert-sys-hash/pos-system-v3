import React from 'react';

const TestModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Test Modal</h3>
        <button onClick={onClose}>Zamknij</button>
      </div>
    </div>
  );
};

export default TestModal;
