import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export const CinematicLoader: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const ringRef = useRef<HTMLDivElement>(null);
    const flashRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const [text, setText] = useState('SYSTEM_BOOT');

    useEffect(() => {
        let iterations = 0;
        const interval = setInterval(() => {
            setText((prev) => {
                if (iterations >= 10) {
                    clearInterval(interval);
                    return 'READY';
                }
                const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                return prev.split("").map((_, index) => {
                    if (index < iterations) return 'READY'[index];
                    return letters[Math.floor(Math.random() * letters.length)];
                }).join("");
            });
            iterations += 1;
        }, 60);

        if (containerRef.current && ringRef.current && textRef.current && flashRef.current) {
            const tl = gsap.timeline({
                onComplete: () => {
                    onComplete();
                }
            });

            tl.to(ringRef.current, {
                rotate: 720,
                scale: 0.8,
                duration: 1.5,
                ease: "power2.in",
            }, 0)
                .to(textRef.current, {
                    opacity: 1,
                    duration: 0.5,
                }, 0)

                .to(ringRef.current, {
                    scale: 0,
                    duration: 0.3,
                    ease: "expo.in"
                }, 1.5)
                .to(textRef.current, {
                    scale: 0,
                    opacity: 0,
                    duration: 0.3,
                    ease: "expo.in"
                }, 1.5)

                .to(flashRef.current, {
                    opacity: 1,
                    duration: 0.1,
                }, 1.8)

                .to(flashRef.current, {
                    opacity: 0,
                    duration: 1.2,
                    ease: "power2.out"
                }, 1.9)
                .to(containerRef.current, {
                    opacity: 0,
                    duration: 0.5,
                    ease: "power2.out"
                }, 2.5);
        }

        return () => clearInterval(interval);
    }, [onComplete]);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-cyber-black overflow-hidden pointer-events-none"
        >
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vw] rounded-full border border-purple-accent/10 block animate-[spin_10s_linear_infinite]" />
            </div>

            <div
                ref={ringRef}
                className="absolute w-[200px] h-[200px] rounded-full border-[2px] border-dashed border-purple-accent/80 flex items-center justify-center before:content-[''] before:absolute before:inset-4 before:rounded-full before:border-[1px] before:border-purple-glow/50"
                style={{
                    boxShadow: '0 0 80px rgba(157,78,221,0.5), inset 0 0 60px rgba(157,78,221,0.5)'
                }}
            >
                <div className="absolute w-full h-[2px] bg-purple-glow blur-[2px] top-1/2 -mt-[1px]" />
                <div className="absolute h-full w-[2px] bg-purple-glow blur-[2px] left-1/2 -ml-[1px]" />
            </div>

            <div
                ref={textRef}
                className="font-mono text-xl tracking-[0.4em] text-white font-bold opacity-0 relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
            >
                <span>{text}</span>
            </div>

            <div
                ref={flashRef}
                className="absolute inset-0 bg-white opacity-0 z-50 pointer-events-none"
            />
        </div>
    );
};
