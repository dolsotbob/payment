// components/MyPage/LogoutButton.tsx
import React from 'react';
import './MyPage.css';

const LogoutButton: React.FC = () => {
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('walletAddress');
        window.location.href = '/';
    };

    return (
        <button onClick={handleLogout} className="logout-button">
            🚪 Logout
        </button>
    );
};

export default LogoutButton;