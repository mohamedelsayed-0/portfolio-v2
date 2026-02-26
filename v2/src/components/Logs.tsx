import React, { useState, useEffect, useRef } from 'react';
import { TerminalSquare } from 'lucide-react';

const initialLogs = [
    { type: 'INFO', time: '00:00:01', msg: 'System initialization started...' },
    { type: 'INFO', time: '00:00:02', msg: 'Loading kernel modules [OK]' },
    { type: 'INFO', time: '00:00:03', msg: 'Mounting virtual file systems...' },
    { type: 'WARN', time: '00:00:04', msg: 'Legacy memory sector not responding. Ignoring.' },
    { type: 'INFO', time: '00:00:05', msg: 'Neural Net link established' },
];

const generatedMessages = [
    { type: 'INFO', msg: 'Syncing with global clock node...' },
    { type: 'INFO', msg: 'Garbage collection cycle complete. Freed 24MB.' },
    { type: 'WARN', msg: 'Latency spike detected on Sector 7G.' },
    { type: 'SEC', msg: 'Unauthorized access attempt blocked from IP 192.168.x.x' },
    { type: 'INFO', msg: 'Routine diagnostic: All systems nominal.' },
    { type: 'SEC', msg: 'Firewall rules updated.' },
    { type: 'INFO', msg: 'Downloading matrix packet...' },
];

export const Logs: React.FC = () => {
    const [logs, setLogs] = useState(initialLogs);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            const newMsg = generatedMessages[Math.floor(Math.random() * generatedMessages.length)];
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

            setLogs((prev) => {
                const updated = [...prev, { ...newMsg, time: timeStr }];
                if (updated.length > 50) updated.shift(); // Keep max 50 logs to prevent memory leak
                return updated;
            });
        }, 2500);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="relative h-screen w-full bg-cyber-black pt-24 pb-8 px-4 md:px-8 flex items-center justify-center">
            {/* Background scanlines */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />

            <div className="relative z-10 w-full max-w-4xl h-[70vh] glass-card flex flex-col overflow-hidden border border-purple-accent/30 shadow-[0_0_30px_rgba(157,78,221,0.15)]">

                {/* Terminal Header */}
                <div className="bg-purple-dark/80 px-4 py-3 border-b border-purple-accent/30 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-cloud-purple font-mono text-sm uppercase tracking-wider">
                        <TerminalSquare className="w-4 h-4 text-purple-accent" />
                        System Terminal // Root
                    </div>
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-error-red/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                </div>

                {/* Terminal Body */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-sm md:text-base scroll-smooth custom-scrollbar"
                >
                    {logs.map((log, idx) => (
                        <div key={idx} className="mb-2 leading-tight flex flex-col md:flex-row md:items-start gap-1 md:gap-4 group">
                            <span className="text-purple-accent/60 shrink-0 w-24">[{log.time}]</span>

                            <span className={`shrink-0 w-16 font-bold
                ${log.type === 'INFO' ? 'text-cloud-purple' : ''}
                ${log.type === 'WARN' ? 'text-yellow-400' : ''}
                ${log.type === 'SEC' ? 'text-error-red' : ''}
              `}>
                                [{log.type}]
                            </span>

                            <span className={`flex-1 break-words
                ${log.type === 'INFO' ? 'text-text-secondary' : ''}
                ${log.type === 'WARN' ? 'text-yellow-400/80' : ''}
                ${log.type === 'SEC' ? 'text-error-red/80' : ''}
              `}>
                                {log.msg}
                            </span>
                        </div>
                    ))}

                    {/* Active Cursor Outline */}
                    <div className="flex items-center gap-2 mt-4 text-purple-glow">
                        <span>root@mcp-2099:~#</span>
                        <span className="inline-block w-2.5 h-5 bg-purple-glow animate-[blink_1s_infinite]" />
                    </div>
                </div>
            </div>
        </div>
    );
};
