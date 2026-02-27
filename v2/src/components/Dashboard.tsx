import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ServerCog, Cpu, Network, Code } from 'lucide-react';

const ExpCard: React.FC<{ title: string; company: string; date: string; desc: string; icon: React.FC<any> }> = ({ title, company, date, desc, icon: Icon }) => (
    <div className="bento-card glass-card p-6 flex flex-col justify-between h-full relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-accent/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-purple-accent/20 transition-colors duration-500" />
        <div className="flex justify-between items-start z-10 mb-4">
            <div>
                <span className="text-cloud-purple font-mono font-bold block">{title}</span>
                <span className="text-purple-glow font-mono text-xs uppercase tracking-wider">{company}</span>
            </div>
            <Icon className="text-purple-accent w-5 h-5 shrink-0 ml-2" />
        </div>
        <div className="z-10 flex-1">
            <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
        </div>
        <div className="mt-4 pt-4 border-t border-purple-accent/10 z-10">
            <span className="text-xs text-text-muted font-mono">{date}</span>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-accent/30 to-transparent" />
    </div>
);

const ProjectCard: React.FC<{ title: string; desc: string; tags: string[] }> = ({ title, desc, tags }) => (
    <div className="bento-card glass-card p-6 flex flex-col justify-between h-full relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-accent/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-purple-accent/20 transition-colors duration-500" />
        <div className="z-10 mb-4">
            <span className="text-cloud-purple font-mono font-bold block">{title}</span>
        </div>
        <div className="z-10 flex-1">
            <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
        </div>
        <div className="mt-4 pt-4 border-t border-purple-accent/10 z-10 flex flex-wrap gap-2">
            {tags.map(t => (
                <span key={t} className="px-2 py-1 text-[10px] font-mono uppercase bg-black/40 border border-purple-accent/20 rounded text-purple-light">
                    {t}
                </span>
            ))}
        </div>
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-accent/30 to-transparent" />
    </div>
);

const projects = [
    {
        title: 'Gaussian Simulations',
        desc: 'Deriving closed-form entanglement survival thresholds for two-mode squeezed vacuum states.',
        tags: ['Python', 'Quantum Info'],
    },
    {
        title: 'Structural Beam Simulation',
        desc: 'Beam deflection calculator with 3D stress visualizations and load animations.',
        tags: ['Python', 'MATLAB'],
    },
    {
        title: 'Pong AI',
        desc: 'AI-driven Pong agent built for the ESC180 tournament \u2014 placed 3rd overall. Adaptive strategy and physics.',
        tags: ['Python', 'Pygame'],
    },
    {
        title: 'Lumina \u2014 LaTeX Notetaker',
        desc: 'Web tool that converts handwritten, typed, and audio notes into structured LaTeX documents.',
        tags: ['TypeScript', 'Python', 'CSS'],
    },
];

export const Dashboard: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const cards = containerRef.current.querySelectorAll('.bento-card');
        gsap.fromTo(cards,
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.2 }
        );
    }, []);

    return (
        <div ref={containerRef} className="relative min-h-screen w-full bg-cyber-black pt-24 pb-12 px-8">
            <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(157,78,221,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-6">

                <header className="mb-6 flex items-center justify-between border-b border-purple-accent/20 pb-4">
                    <div>
                        <h1 className="text-3xl font-mono text-purple-glow tracking-widest uppercase">Protocol // About Me</h1>
                        <p className="text-text-muted text-sm mt-1 font-mono">&gt; ACCESSING EXPERIENCE RECORDS</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">

                    <div className="bento-card glass-card col-span-1 md:col-span-2 lg:col-span-3 p-6 flex flex-col md:flex-row items-center gap-8">
                        <div className="w-32 h-32 rounded-full border-2 border-purple-accent/50 overflow-hidden shrink-0 shadow-[0_0_30px_rgba(157,78,221,0.3)]">
                            <img src="./assets/profile.png" alt="Profile" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-display text-cloud-purple mb-2">Engineering Science &middot; Software &middot; Physics</h3>
                            <p className="text-text-secondary leading-relaxed">
                                I'm Mohamed, an Engineering Science student at the University of Toronto planning to pursue Engineering Physics. I love solving problems revolving around mathematics, and building tools that connect theory with real-world applications.
                            </p>
                            <div className="mt-4 flex gap-3 flex-wrap">
                                <span className="px-3 py-1 bg-purple-accent/10 border border-purple-accent/30 rounded font-mono text-xs text-purple-light">Applied Physics</span>
                                <span className="px-3 py-1 bg-purple-accent/10 border border-purple-accent/30 rounded font-mono text-xs text-purple-light">Number Theory</span>
                                <span className="px-3 py-1 bg-purple-accent/10 border border-purple-accent/30 rounded font-mono text-xs text-purple-light">Abstract Geometry</span>
                            </div>
                        </div>
                    </div>

                    <ExpCard
                        title="Technical Lead"
                        company="Al Mannar NGO"
                        date="Jul 2021 &ndash; Present"
                        desc="Lead tech strategy. Architected SQLite-backed data management system for beneficiary records, automating workflows with Python."
                        icon={Network}
                    />

                    <ExpCard
                        title="Undergrad Research"
                        company="AUC"
                        date="Jul 2025 &ndash; Sep 2025"
                        desc="Developed electronic control systems using microcontrollers to automate precision translation stages for optics experiments."
                        icon={Cpu}
                    />

                    <ExpCard
                        title="Backend Intern"
                        company="eVision"
                        date="Jul 2024 &ndash; Aug 2024"
                        desc="Built a scalable file-parsing automation system in Java processing structured financial documents, improving pipeline reliability."
                        icon={ServerCog}
                    />

                    <ExpCard
                        title="Software Dev"
                        company="Self-Employed"
                        date="Oct 2021 &ndash; Jul 2023"
                        desc="Collaborated with Roblox studios (1.7B+ visits). Engineered Lua gameplay systems and server logic optimizing high concurrency."
                        icon={Code}
                    />

                </div>

                <header className="mt-12 mb-6 flex items-center justify-between border-b border-purple-accent/20 pb-4">
                    <div>
                        <h1 className="text-3xl font-mono text-purple-glow tracking-widest uppercase">Protocol // Projects</h1>
                        <p className="text-text-muted text-sm mt-1 font-mono">&gt; LOADING PROJECT FILES...</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
                    {projects.map((project) => (
                        <ProjectCard
                            key={project.title}
                            title={project.title}
                            desc={project.desc}
                            tags={project.tags}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
