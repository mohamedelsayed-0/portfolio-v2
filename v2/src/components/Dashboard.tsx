import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ShieldAlert, ServerCog, Cpu, Globe, Database, Network } from 'lucide-react';

const MetricCard: React.FC<{ title: string; value: string; icon: React.FC<any>; delay?: number }> = ({ title, value, icon: Icon }) => (
    <div className="bento-card glass-card p-6 flex flex-col justify-between h-full relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-accent/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-purple-accent/20 transition-colors duration-500" />
        <div className="flex justify-between items-start z-10">
            <span className="text-text-muted font-mono text-sm uppercase tracking-wider">{title}</span>
            <Icon className="text-purple-accent w-5 h-5" />
        </div>
        <div className="mt-4 z-10">
            <span className="text-3xl font-display font-medium text-cloud-purple">{value}</span>
        </div>
        {/* Decorative Grid Line */}
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-accent/30 to-transparent" />
    </div>
);

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
        <div ref={containerRef} className="relative min-h-screen w-full bg-cyber-black pt-24 pb-12 px-4 md:px-8">
            {/* Background Grid Accent */}
            <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(157,78,221,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-6">

                <header className="mb-6 flex items-center justify-between border-b border-purple-accent/20 pb-4">
                    <div>
                        <h1 className="text-3xl font-mono text-purple-glow tracking-widest uppercase">Protocol Dashboard</h1>
                        <p className="text-text-muted text-sm mt-1 font-mono">&gt; ENCRYPTED METRICS // NODE 0x0A9F</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 bg-error-red/10 border border-error-red/30 px-3 py-1 rounded text-error-red font-mono text-xs">
                        <ShieldAlert className="w-4 h-4" />
                        SEC_LEVEL: MAXIMUM
                    </div>
                </header>

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[160px]">

                    {/* Large Main Widget (Global Map / Graph) */}
                    <div className="bento-card glass-card col-span-1 md:col-span-2 lg:col-span-3 row-span-2 p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                            <h3 className="font-mono text-sm text-text-muted flex items-center gap-2">
                                <Globe className="w-4 h-4" /> GLOBAL NODE ROUTING
                            </h3>
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-accent opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-glow"></span>
                            </span>
                        </div>
                        <div className="flex-1 w-full bg-[#08080C] rounded-lg border border-purple-accent/10 relative overflow-hidden flex items-center justify-center">
                            {/* Abstract Map Visualization */}
                            <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg')] bg-center bg-contain bg-no-repeat rotate-0 filter invert contrast-200 sepia hue-rotate-[250deg] saturate-[300%]" />
                            <div className="text-purple-accent/50 font-mono text-xs text-center z-10 relative bg-cyber-black/80 px-4 py-2 rounded">
                                [VISUALIZATION_FEED_OFFLINE]
                            </div>
                        </div>
                    </div>

                    {/* Small Metrics */}
                    <MetricCard title="CPU Core" value="38%" icon={Cpu} />
                    <MetricCard title="Memory Allocation" value="12.4 GB" icon={ServerCog} />

                    {/* Mid Widget (Network Traffic) */}
                    <div className="bento-card glass-card col-span-1 md:col-span-2 row-span-1 p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-mono text-sm text-text-muted flex items-center gap-2">
                                <Network className="w-4 h-4" /> NETWORK TRAFFIC
                            </h3>
                            <span className="text-xs text-purple-accent font-mono">+12% ms</span>
                        </div>
                        <div className="flex-1 w-full flex items-end gap-1 pt-2">
                            {/* Dummy Bar Chart */}
                            {[40, 60, 45, 80, 50, 90, 65, 30, 75, 55, 85, 45].map((h, i) => (
                                <div key={i} className="flex-1 bg-purple-accent/30 rounded-t-sm relative group overflow-hidden" style={{ height: `${h}%` }}>
                                    <div className="absolute inset-0 bg-purple-light opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detail Widgets */}
                    <MetricCard title="Active Connections" value="1,042" icon={Database} />

                    <div className="bento-card glass-card p-6 flex flex-col justify-center items-center text-center group cursor-pointer hover:bg-purple-accent/10">
                        <div className="w-12 h-12 rounded-full border border-purple-accent flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(157,78,221,0.3)]">
                            <ShieldAlert className="w-5 h-5 text-purple-glow" />
                        </div>
                        <span className="font-mono text-sm text-cloud-purple">RUN DIAGNOSTICS</span>
                    </div>

                </div>
            </div>
        </div>
    );
};
