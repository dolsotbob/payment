// src/components/Modal.tsx
import React from 'react';
import './css/Modal.css';

interface ModalProps {
    children: React.ReactNode;
    onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ children, onClose }) => {
    return (
        <div className="popup-wrapper">
            <div className="modal-content">
                <button className="modal-close-button" onClick={onClose}>×</button>
                {children}
            </div>
        </div>
    );
};

export default Modal;