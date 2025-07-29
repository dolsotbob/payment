// src/components/LogoutButton.tsx
import React from 'react';
import './css/Logout.css'

interface LogoutButtonProps {
    onLogout: () => void;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ onLogout }) => {
    const handleLogout = () => {
        localStorage.removeItem('token'); // JWT 제거
        onLogout(); // App에서 setAccount(null) 등 처리
    };

    return (
        <button onClick={handleLogout} className="logout-button">
            🚪 로그아웃
        </button>
    );
};

export default LogoutButton;