import React from 'react';
import { Canvas } from '@react-three/fiber';
import { ParticleField } from './ParticleField';
import { Link } from 'react-router-dom';

export const HeroSection: React.FC = () => {
    return (
        <div className="relative h-screen w-full overflow-hidden bg-cyber-black flex flex-col justify-center items-center">
            {/* 3D Background */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 50], fov: 75 }}>
                    <ParticleField />
                </Canvas>
            </div>

            {/* Hero Interace & Typography */}
            <div className="relative z-10 flex flex-col items-center text-center p-8 max-w-4xl opacity-0 animate-[fadeIn_1.5s_ease-in-out_0.5s_forwards]">

                {/* Glow behind text */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-purple-accent/20 blur-[100px] -z-10 rounded-full mix-blend-screen pointer-events-none" />

                <h1 className="font-hero text-6xl md:text-8xl font-bold tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white via-cloud-purple to-purple-accent shadow-purple-accent drop-shadow-[0_0_15px_rgba(157,78,221,0.5)]">
                    Engineering,<br /> Supercharged.
                </h1>

                <p className="font-mono text-text-secondary text-lg md:text-xl max-w-2xl mb-8 tracking-wide">
                    <span className="text-purple-accent">&gt;</span> Initialize kernel // Mohamed Elsayed <br />
                    Building physics, math, and software for the next century.
                </p>

                <div className="flex flex-wrap gap-4 justify-center">
                    <Link
                        to="/core"
                        className="px-8 py-3 bg-gradient-to-r from-purple-mid to-purple-light text-white font-sans font-bold rounded-xl shadow-[0_4px_25px_rgba(123,44,191,0.5)] hover:shadow-[0_12px_40px_rgba(123,44,191,0.7)] hover:-translate-y-1 transition-all duration-300"
                    >
                        Access Core
                    </Link>
                    <a
                        href="/assets/Resume-current.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-8 py-3 bg-glass-bg border border-purple-mid text-cloud-purple font-sans font-bold rounded-xl backdrop-blur-md hover:bg-purple-mid hover:text-white hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(123,44,191,0.3)] transition-all duration-300"
                    >
                        Read Protocol_
                    </a>
                </div>
            </div>
        </div>
    );
};
