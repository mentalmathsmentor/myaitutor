import { useState, useEffect } from 'react';

const AVATARS = [
    '/avatars/Human 1 Standing.png',
    '/avatars/Human 2 Standing.png',
    '/avatars/Human 3 Standing Hi.png',
    '/avatars/Human 4 sitting.png',
    '/avatars/Human 5 Sleeping.png'
];

export default function AvatarDisplay() {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % AVATARS.length);
        }, 10000); // cycle every 10 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed bottom-4 left-4 z-50 pointer-events-none transition-opacity duration-500 ease-in-out">
            <img
                src={AVATARS[currentIndex]}
                alt="AI Assistant Avatar"
                className="w-32 h-32 object-contain drop-shadow-xl animate-float"
            />
        </div>
    );
}
