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
            alignItems: 'center',
            marginBottom: '2rem',
        }}>

            <div>
                <Link to="/" style={{ marginRight: '1rem', fontSize: '2rem' }}>🛍️</Link>
            </div>

            {/* {account && (
                <p className="wallet-info" style={{ fontSize: '1.5rem', color: '#333' }}>
                    🦊 {account}
                </p>
            )} */}

            <div style={{ display: 'flex', alignItems: 'center', fontSize: '2rem' }}>
                <Link to="/payment-history" style={{ marginRight: '1rem' }}>🧾</Link>
                <Link to="/mypage" style={{ marginRight: '1rem' }}>👤</Link>
            </div>

        </nav>
    )
}

export default Navbar;