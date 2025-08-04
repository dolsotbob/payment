// src/components/LogoutButton.tsx
import React from 'react';
import './css/Logout.css';
import doorImage from '../images/door.png';

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
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="50"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="logout-icon"
            >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
        </button>
    );
};

export default LogoutButton;
