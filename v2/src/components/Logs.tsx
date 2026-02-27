import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { TerminalSquare, ExternalLink } from 'lucide-react';

const DemoCard: React.FC<{ title: string; tags: string[]; desc: string; featured?: boolean }> = ({ title, tags, desc, featured }) => (
    <div className={`glass-card p-6 flex flex-col group relative overflow-hidden transition-all duration-300 hover:border-purple-glow ${featured ? 'col-span-2 bg-purple-accent/5' : ''}`}>
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-purple-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <h3 className="text-xl font-display text-cloud-purple mb-2 flex items-center justify-between">
            {title}
            <ExternalLink className="w-4 h-4 text-purple-accent opacity-0 group-hover:opacity-100 transition-opacity" />
        </h3>
        <p className="text-text-secondary text-sm mb-6 flex-1">{desc}</p>
        <div className="flex flex-wrap gap-2 mt-auto">
            {tags.map(t => (
                <span key={t} className="px-2 py-1 text-[10px] font-mono uppercase bg-black/40 border border-purple-accent/20 rounded text-purple-light">
                    {t}
                </span>
            ))}
        </div>
    </div>
);

export const Logs: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const cards = containerRef.current.querySelectorAll('.glass-card');
        gsap.fromTo(cards,
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.2 }
        );
    }, []);

    return (
        <div ref={containerRef} className="relative min-h-screen w-full bg-cyber-black pt-24 pb-8 px-8 flex flex-col items-center">
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />

            <div className="relative z-10 w-full max-w-5xl flex flex-col gap-6">

                <header className="mb-4">
                    <h1 className="text-3xl font-mono text-purple-glow tracking-widest uppercase flex items-center gap-3">
                        <TerminalSquare className="text-purple-accent" />
                        Demos
                    </h1>
                    <p className="text-text-muted text-sm mt-1 font-mono">&gt; EXECUTING SIMULATIONS...</p>
                </header>

                <div className="grid grid-cols-2 gap-6">
                    <DemoCard
                        featured
                        title="Roblox Game Development"
                        desc="Gameplay systems and animations for titles with 1.7B+ visits and 250K+ concurrent players. High-concurrency Lua systems."
                        tags={['Lua', 'Blender', 'Roblox Studio']}
                    />
                </div>
            </div>
        </div>
    );
};
