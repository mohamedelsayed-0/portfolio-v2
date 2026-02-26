import React, { useState } from 'react';
import { Routes, Route, HashRouter } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { CinematicLoader } from './components/CinematicLoader';

// Placeholder Pages (To be replaced with real components)
const HeroSection = () => <div className="h-screen flex items-center justify-center font-hero text-6xl text-purple-glow">INITIATED_</div>;
const NeuralNet = () => <div className="h-screen flex items-center justify-center font-mono text-4xl">NEURAL NET: ONLINE</div>;
const Dashboard = () => <div className="h-screen flex items-center justify-center font-mono text-4xl">PROTOCOL LOGS</div>;
const Logs = () => <div className="h-screen flex items-center justify-center font-mono text-4xl">SYSTEM LOGS</div>;

function App() {
  const [loading, setLoading] = useState(true);

  return (
    <HashRouter>
      <div className="relative min-h-screen">
        {loading && <CinematicLoader onComplete={() => setLoading(false)} />}

        {!loading && (
          <div className="opacity-0 animate-[fadeIn_1.5s_ease-in-out_forwards]">
            <Navigation />

            <main className="relative z-10">
              <Routes>
                <Route path="/" element={<HeroSection />} />
                <Route path="/core" element={<NeuralNet />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/logs" element={<Logs />} />
              </Routes>
            </main>
          </div>
        )}
      </div>
    </HashRouter>
  );
}

export default App;
