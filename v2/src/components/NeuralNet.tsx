import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';

const CoreParticles: React.FC = () => {
    const pointsRef = useRef<THREE.Points>(null);
    const { mouse, viewport } = useThree();
    const particleCount = 400;

    // Generate sphere particles randomly distributed
    const { positions, originalPositions, colors } = useMemo(() => {
        const positions = new Float32Array(particleCount * 3);
        const originalPositions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        // Purple accent (#9d4edd -> 157, 78, 221) and Purple glow (#c77dff -> 199, 125, 255)
        const colorA = new THREE.Color('#9d4edd');
        const colorB = new THREE.Color('#c77dff');

        for (let i = 0; i < particleCount; i++) {
            // Random point on a sphere surface (Math.random) -> expanded to volume
            const r = 8 + Math.random() * 4; // radius 8 to 12
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            const i3 = i * 3;
            positions[i3] = x;
            positions[i3 + 1] = y;
            positions[i3 + 2] = z;

            originalPositions[i3] = x;
            originalPositions[i3 + 1] = y;
            originalPositions[i3 + 2] = z;

            const mixColor = colorA.clone().lerp(colorB, Math.random());
            colors[i3] = mixColor.r;
            colors[i3 + 1] = mixColor.g;
            colors[i3 + 2] = mixColor.b;
        }

        return { positions, originalPositions, colors };
    }, [particleCount]);

    useFrame((state) => {
        if (!pointsRef.current) return;
        const time = state.clock.elapsedTime;
        const positionsAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const posArray = positionsAttr.array as Float32Array;

        // Pulse core
        const pulse = Math.sin(time * 2) * 0.5 + 1; // 0.5 to 1.5

        // Map mouse to 3D world space approximately
        const mx = (mouse.x * viewport.width) / 2;
        const my = (mouse.y * viewport.height) / 2;

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;

            // Base coordinate with pulse expansion
            const bx = originalPositions[i3] * pulse;
            const by = originalPositions[i3 + 1] * pulse;
            const bz = originalPositions[i3 + 2] * pulse;

            // Interaction Repulsion
            const dx = bx - mx;
            const dy = by - my;
            // Assume z is depth
            const dz = bz - 0;

            const distSq = dx * dx + dy * dy + dz * dz;
            const maxDist = 200; // Hover effect radius

            if (distSq < maxDist) {
                const force = (maxDist - distSq) / maxDist;
                const dirX = dx / Math.sqrt(distSq);
                const dirY = dy / Math.sqrt(distSq);

                // Push away
                posArray[i3] = bx + dirX * force * 5;
                posArray[i3 + 1] = by + dirY * force * 5;
                posArray[i3 + 2] = bz;
            } else {
                // Noise drift
                const driftX = Math.sin(time + i) * 0.5;
                const driftY = Math.cos(time + i * 0.5) * 0.5;
                posArray[i3] = bx + driftX;
                posArray[i3 + 1] = by + driftY;
                posArray[i3 + 2] = bz;
            }
        }

        positionsAttr.needsUpdate = true;
        pointsRef.current.rotation.y = time * 0.2;
        pointsRef.current.rotation.x = time * 0.1;
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={particleCount}
                    args={[positions, 3]}
                />
                <bufferAttribute
                    attach="attributes-color"
                    count={particleCount}
                    args={[colors, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.4}
                vertexColors
                transparent
                opacity={0.8}
                blending={THREE.AdditiveBlending}
                sizeAttenuation
            />
        </points>
    );
};

export const NeuralNet: React.FC = () => {
    return (
        <div className="relative h-screen w-full bg-cyber-black pt-24 pb-8 px-8 flex flex-col items-center">
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 30], fov: 60 }}>
                    <ambientLight intensity={0.5} />
                    <CoreParticles />
                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
                </Canvas>
            </div>

            <div className="relative z-10 w-full max-w-5xl h-full flex flex-col justify-end pb-12 pointer-events-none">
                <div className="glass-card p-8 pointer-events-auto">
                    <h2 className="text-3xl font-mono text-purple-glow mb-4 tracking-widest uppercase flex items-center gap-3">
                        <div className="w-3 h-3 bg-purple-accent rounded-full animate-pulse" />
                        Sentient Core
                    </h2>
                    <p className="text-text-secondary font-sans leading-relaxed text-lg max-w-3xl">
                        This is the neural nexus of my knowledge graph. A constantly evolving structure of cross-disciplinary connections spanning Physics, Mathematics, and Computer Science. Hover over the nodes in the structure to view the disruption forces of real-time data flow.
                    </p>
                </div>
            </div>
        </div>
    );
};
