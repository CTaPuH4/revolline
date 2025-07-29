import React from 'react';
import '../css/SalesPolicy.css'

const SalesPolicy = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        <h2>Правила продажи</h2>
        <p>Здесь будет текст с правилами продажи...</p>
      </div>
    </div>
  );
};

export default SalesPolicy;