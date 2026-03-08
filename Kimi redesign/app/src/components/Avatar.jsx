import React from 'react';
import mateAvatar from '../assets/mate-avatar.png';

const Avatar = ({ message }) => {
    return (
        <div className="fixed bottom-24 left-4 z-40 pointer-events-none">
            <div className="relative group pointer-events-auto">
                {/* Glow effect behind avatar */}
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-75 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <img
                    src={mateAvatar}
                    alt="Mate Avatar"
                    className="w-28 h-auto drop-shadow-2xl transition-all duration-300 transform group-hover:scale-110 group-hover:-rotate-3 animate-float"
                />

                {/* Thought Bubble */}
                <div
                    className={`
                        absolute -top-14 left-12
                        glass-card
                        text-foreground text-xs font-display font-medium
                        px-4 py-2
                        rounded-2xl rounded-bl-none
                        transition-all duration-300
                        shadow-glow-sm
                        whitespace-nowrap
                        ${message ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}
                    `}
                >
                    <span className="text-primary">{message || "G'day!"}</span>
                </div>
            </div>
        </div>
    );
};

export default Avatar;
