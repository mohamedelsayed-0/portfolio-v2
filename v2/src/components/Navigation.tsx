import React from 'react';
import { NavLink } from 'react-router-dom';
import { Terminal, Brain, LayoutDashboard, Activity } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { path: '/', label: 'Interface', icon: Terminal },
    { path: '/core', label: 'Neural Net', icon: Brain },
    { path: '/dashboard', label: 'Protocol', icon: LayoutDashboard },
    { path: '/logs', label: 'Logs', icon: Activity },
];

export const Navigation: React.FC = () => {
    return (
        <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
            <div className="glass-card px-2 py-2 flex items-center gap-2 rounded-2xl">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            cn(
                                "relative group flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300",
                                isActive
                                    ? "bg-purple-accent/20 text-cloud-purple shadow-[0_0_15px_rgba(157,78,221,0.2)]"
                                    : "text-text-muted hover:text-cloud-purple hover:bg-white/5",
                            )
                        }
                    >
                        <item.icon className="w-4 h-4" />
                        <span className="font-mono text-sm tracking-widest uppercase">
                            {item.label}
                        </span>

                        {/* Terminal Cursor on hover */}
                        <span className="absolute opacity-0 group-hover:opacity-100 transition-opacity -left-2 text-purple-accent font-mono text-xs">
                            &gt;
                        </span>
                    </NavLink>
                ))}

                <div className="w-[1px] h-6 bg-purple-accent/30 mx-2" />

                <a
                    href="https://github.com/mohamedelsayed-0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm font-mono tracking-widest uppercase bg-purple-accent/10 border border-purple-accent/50 rounded-xl hover:bg-purple-accent hover:text-white transition-all shadow-[0_0_10px_rgba(157,78,221,0.2)] hover:shadow-[0_0_20px_rgba(157,78,221,0.6)]"
                >
                    Initialize
                </a>
            </div>
        </nav>
    );
};
