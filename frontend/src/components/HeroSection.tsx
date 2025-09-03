// src/components/HeroSection.tsx
import React from 'react';
import './css/HeroSection.css';
import heroImage from '../images/hero.jpg'

const HeroSection: React.FC = () => {
    return (
        <div className="hero-container">
            <img src={heroImage} alt="hero" className="hero-image" />
            <div className="hero-text">
                <h1 className="delay-1">Pay Less</h1>
                <h1 className="delay-2">Shop Smart</h1>
                <h1 className="delay-3">With Coin</h1>
            </div>
        </div>
    );
};

export default HeroSection;