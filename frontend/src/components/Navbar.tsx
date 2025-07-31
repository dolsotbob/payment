// src/components/Navbar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import storeImage from '../images/online-shop.png'
import './css/Navbar.css'

interface NavbarProps {
    account: string | null;
}

const Navbar: React.FC<NavbarProps> = ({ account }) => {
    return (
        <nav className='nav'>

            <div>
                <Link to="/" className="store-link">
                    <img src={storeImage} alt="Store Image" className='store-image'></img>
                </Link>
            </div>

            {/* {account && (
                <p className="wallet-info">🦊 {account}</p>
            )} */}

            {account && (
                <div className='nav-right'>
                    <Link to="/payment-history">🧾</Link>
                    <Link to="/mypage">👤</Link>
                </div>
            )}

        </nav>
    )
}

export default Navbar;