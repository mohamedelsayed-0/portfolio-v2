import React, { useState } from 'react';
import { Routes, Route, HashRouter, useLocation } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { CinematicLoader } from './components/CinematicLoader';
import { HeroSection } from './components/HeroSection';
import { NeuralNet } from './components/NeuralNet';
import { Dashboard } from './components/Dashboard';
import { Logs } from './components/Logs';

const AppContent: React.FC = () => {
    const location = useLocation();

    return (
        <main className="relative z-10">
            <div
                key={location.key}
                className="animate-[routeFadeIn_0.5s_ease-in-out_forwards]"
            >
                <Routes location={location}>
                    <Route path="/" element={<HeroSection />} />
                    <Route path="/core" element={<NeuralNet />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/logs" element={<Logs />} />
                </Routes>
            </div>
        </main>
    );
};

function App() {
    const [loading, setLoading] = useState(true);

    return (
        <HashRouter>
            <div className="relative min-h-screen">
                {loading && <CinematicLoader onComplete={() => setLoading(false)} />}

                {!loading && (
                    <div className="opacity-0 animate-[fadeIn_1.5s_ease-in-out_forwards]">
                        <Navigation />
                        <AppContent />
                    </div>
                )}
            </div>
        </HashRouter>
    );
}

export default App;
