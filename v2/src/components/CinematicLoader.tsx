import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export const CinematicLoader: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const ringRef = useRef<HTMLDivElement>(null);
    const [text, setText] = useState('LOADING_ASSETS');

    useEffect(() => {
        // Scramble Text Effect
        let iterations = 0;
        const interval = setInterval(() => {
            setText((prev) => {
                if (iterations >= 20) {
                    clearInterval(interval);
                    return 'SYSTEM_READY';
                }

                const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
                return prev.split("").map((_, index) => {
                    if (index < iterations) return 'SYSTEM_READY'[index];
                    return letters[Math.floor(Math.random() * letters.length)];
                }).join("");
            });
            iterations += 1;
        }, 50);

        // GSAP Transitions
        if (containerRef.current && ringRef.current && textRef.current) {
            const tl = gsap.timeline({
                onComplete: () => {
                    onComplete();
                }
            });

            tl.to(ringRef.current, {
                rotate: 360,
                duration: 2,
                ease: "power2.inOut",
            }, 0)
                .to(textRef.current, {
                    opacity: 1,
                    duration: 0.5,
                }, 0)
                .to(textRef.current, {
                    scale: 1.1,
                    color: '#c77dff',
                    duration: 0.5,
                    ease: "power2.out",
                }, 1.5)
                .to(containerRef.current, {
                    opacity: 0,
                    filter: 'blur(20px)',
                    duration: 1,
                    ease: "power3.inOut"
                }, 2.5);
        }

        return () => clearInterval(interval);
    }, [onComplete]);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-cyber-black text-cloud-purple overflow-hidden"
        >
            {/* Background Radial Rings */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <div className="w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full border border-purple-accent/30 radial-pulse animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                <div className="absolute w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full border border-purple-light/40 radial-pulse animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite_1s]" />
            </div>

            {/* Holographic Ring */}
            <div
                ref={ringRef}
                className="absolute w-[300px] h-[300px] rounded-full border-[1px] border-dashed border-purple-accent/60 flex items-center justify-center before:content-[''] before:absolute before:inset-2 before:rounded-full before:border-[1px] before:border-purple-glow/30"
                style={{
                    boxShadow: '0 0 50px rgba(157,78,221,0.2), inset 0 0 50px rgba(157,78,221,0.2)'
                }}
            >
                <div className="absolute w-[2px] h-20 bg-purple-glow blur-[1px] top-0 left-1/2 -ml-[1px]" />
            </div>

            {/* Text Output */}
            <div
                ref={textRef}
                className="font-mono text-xl tracking-[0.3em] font-medium opacity-0 flex flex-col items-center gap-4 relative z-10"
            >
                <span>{text}</span>
                <div className="w-48 h-[1px] bg-gradient-to-r from-transparent via-purple-accent to-transparent" />
                <span className="text-xs text-purple-accent tracking-widest opacity-60">
                    MCP-2099 KERNEL v9.4
                </span>
            </div>
        </div>
    );
};
