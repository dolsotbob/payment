// src/components/Navbar.tsx
import React from 'react';
import { Link } from 'react-router-dom';

interface NavbarProps {
    account: string | null;
}

const Navbar: React.FC<NavbarProps> = ({ account }) => {
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
            {account && (
                <p className="wallet-info" style={{ fontSize: '0.9rem', color: '#333' }}>
                    🦊 {account}
                </p>
            )}
        </nav>
    )
}

export default Navbar;