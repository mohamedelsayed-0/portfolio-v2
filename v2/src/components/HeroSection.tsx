import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { ParticleField } from './ParticleField';
import { Link } from 'react-router-dom';

const TERMINAL_PHRASES = [
    '> Initializing kernel // Mohamed Elsayed',
    '> Check Complete. Portfolio open',
];

function useScrambleLoop(phrases: string[], scrambleSpeed = 80, holdDuration = 3000): string {
    const [display, setDisplay] = useState(phrases[0]);
    const phraseIndexRef = useRef(0);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_/>.';

        function scrambleTo(target: string) {
            let iteration = 0;

            if (intervalRef.current) clearInterval(intervalRef.current);

            intervalRef.current = setInterval(() => {
                setDisplay(
                    target
                        .split('')
                        .map((char, index) => {
                            if (char === ' ') return ' ';
                            if (index < iteration) return target[index];
                            return letters[Math.floor(Math.random() * letters.length)];
                        })
                        .join('')
                );

                iteration++;
                if (iteration > target.length) {
                    clearInterval(intervalRef.current!);
                    setDisplay(target);

                    timeoutRef.current = setTimeout(() => {
                        phraseIndexRef.current = (phraseIndexRef.current + 1) % phrases.length;
                        scrambleTo(phrases[phraseIndexRef.current]);
                    }, holdDuration);
                }
            }, scrambleSpeed);
        }

        timeoutRef.current = setTimeout(() => {
            phraseIndexRef.current = 1;
            scrambleTo(phrases[1]);
        }, holdDuration);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [phrases, scrambleSpeed, holdDuration]);

    return display;
}

export const HeroSection: React.FC = () => {
    const terminalText = useScrambleLoop(TERMINAL_PHRASES, 80, 3000);

    return (
        <div className="relative h-screen w-full overflow-hidden bg-cyber-black flex flex-col justify-center items-center">
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 50], fov: 75 }}>
                    <ParticleField />
                </Canvas>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center p-8 max-w-4xl opacity-0 animate-[fadeIn_1.5s_ease-in-out_0.5s_forwards]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-purple-accent/20 blur-[100px] -z-10 rounded-full mix-blend-screen pointer-events-none" />

                <h1 className="font-hero text-6xl md:text-8xl font-bold tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white via-cloud-purple to-purple-accent shadow-purple-accent drop-shadow-[0_0_15px_rgba(157,78,221,0.5)]">
                    Mohamed<br />Elsayed.
                </h1>

                <p className="font-mono text-text-secondary text-lg md:text-xl max-w-2xl mb-2 tracking-wide">
                    Engineering Science @ UofT
                </p>

                <p className="font-mono text-purple-accent text-sm md:text-base max-w-2xl mb-8 tracking-wide h-6">
                    {terminalText}
                </p>

                <div className="flex flex-wrap gap-4 justify-center">
                    <Link
                        to="/dashboard"
                        className="px-8 py-3 bg-gradient-to-r from-purple-mid to-purple-light text-white font-sans font-bold rounded-xl shadow-[0_4px_25px_rgba(123,44,191,0.5)] hover:shadow-[0_12px_40px_rgba(123,44,191,0.7)] hover:-translate-y-1 transition-all duration-300"
                    >
                        About Me
                    </Link>
                    <a
                        href="./assets/resume.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-8 py-3 bg-glass-bg border border-purple-mid text-cloud-purple font-sans font-bold rounded-xl backdrop-blur-md hover:bg-purple-mid hover:text-white hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(123,44,191,0.3)] transition-all duration-300"
                    >
                        Resume
                    </a>
                </div>
            </div>
        </div>
    );
};
