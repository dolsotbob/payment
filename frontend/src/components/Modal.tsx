// src/components/Modal.tsx
import React from 'react';
import './css/Modal.css';

interface ModalProps {
    children: React.ReactNode;  // 모달 내부에 표시할 내용 (폼, 버튼 등)
    onClose: () => void;        // 닫기 동작을 수행할 함수
}

const Modal: React.FC<ModalProps> = ({ children, onClose }) => {
    return (
        // popup-wrapper: 화면 전체를 어둡게 덮고 중앙에 팝업 배치
        // modal-content: 모달 본체 
        // x 버튼을 누르면 onClose()가 호출되어 모달을 닫음  
        <div className="popup-wrapper">
            <div className="modal-content">
                <button className="modal-close-button" onClick={onClose}>×</button>
                {children}
            </div>
        </div>
    );
};

export default Modal;