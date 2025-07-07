// src/components/Navbar.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
    return (
        <nav style={{
            backgroundColor: '#f5f5f5',
            padding: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '2rem',
        }}>
            <div>
                <Link to="/" style={{ marginRight: '1rem' }}>🛒 쇼핑</Link>
                <Link to="/payment-history">🧾 결제 내역</Link>
            </div>
        </nav>
    );
};

export default Navbar;