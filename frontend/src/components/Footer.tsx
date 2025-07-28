// src/components/Footer.tsx
import React from 'react';
import './css/Footer.css';

const Footer: React.FC = () => {
    return (
        <footer className="footer">
            <div className="footer-top">
                <a href="/about">About</a>
                <a href="/support">Customer Support</a>
                <a href="https://github.com/dolsotbob/payment" target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>

            <div className="footer-middle">
                <a href="/terms">Terms</a>
                <a href="/privacy">Privacy</a>
            </div>

            <div className="footer-bottom">
                <p>© 2025 My Little Coin Cart. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;