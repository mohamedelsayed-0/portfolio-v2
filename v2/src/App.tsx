import React, { useState } from 'react';
import { Routes, Route, HashRouter } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { CinematicLoader } from './components/CinematicLoader';
import { NeuralNet } from './components/NeuralNet';
import { Dashboard } from './components/Dashboard';
import { Logs } from './components/Logs';

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
