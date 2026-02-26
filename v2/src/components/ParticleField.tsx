import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const ParticleField: React.FC = () => {
    const pointsRef = useRef<THREE.Points>(null);
    const linesRef = useRef<THREE.LineSegments>(null);

    const particleCount = 200;
    const maxConnections = 80;
    const connectionDistance = 15;

    // Generate Initial Particles
    const { positions, originalPositions, sizes } = useMemo(() => {
        const positions = new Float32Array(particleCount * 3);
        const originalPositions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 120;
            positions[i3 + 1] = (Math.random() - 0.5) * 120;
            positions[i3 + 2] = (Math.random() - 0.5) * 80 - 10;

            originalPositions[i3] = positions[i3];
            originalPositions[i3 + 1] = positions[i3 + 1];
            originalPositions[i3 + 2] = positions[i3 + 2];

            sizes[i] = Math.random() * 2.5 + 1.0;
        }
        return { positions, originalPositions, sizes };
    }, [particleCount]);

    // Pre-allocate lines geometry
    const linePositions = useMemo(() => {
        return new Float32Array(maxConnections * 6); // 2 vertices * 3 coords
    }, [maxConnections]);

    useFrame((state) => {
        const time = state.clock.elapsedTime * 0.5;

        if (!pointsRef.current || !linesRef.current) return;

        const pointsGeo = pointsRef.current.geometry as THREE.BufferGeometry;
        const linesGeo = linesRef.current.geometry as THREE.BufferGeometry;
        const currentPositions = pointsGeo.attributes.position.array as Float32Array;
        const currentLinePositions = linesGeo.attributes.position.array as Float32Array;

        // 1. Float Animation
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const phase = i * 0.13;

            currentPositions[i3] = originalPositions[i3] + Math.sin(time * 1.5 + phase) * 1.2;
            currentPositions[i3 + 1] = originalPositions[i3 + 1] + Math.cos(time * 2.0 + phase * 0.7) * 0.8;
            currentPositions[i3 + 2] = originalPositions[i3 + 2] + Math.sin(time * 1.0 + phase * 1.3) * 0.6;
        }
        pointsGeo.attributes.position.needsUpdate = true;

        // 2. Slow rotation
        pointsRef.current.rotation.y += 0.00025;
        pointsRef.current.rotation.x += 0.00012;

        // Stronger parallax via mouse if needed (ignoring mouse for a simpler background)
        pointsRef.current.rotation.y += (state.pointer.x * 0.05 - pointsRef.current.rotation.y) * 0.02;
        pointsRef.current.rotation.x += (-state.pointer.y * 0.05 - pointsRef.current.rotation.x) * 0.02;

        // 3. Update Connections
        let lineIndex = 0;
        const distSq = connectionDistance * connectionDistance;

        for (let i = 0; i < particleCount && lineIndex < maxConnections; i++) {
            const i3 = i * 3;
            for (let j = i + 1; j < particleCount && lineIndex < maxConnections; j++) {
                const j3 = j * 3;
                const dx = currentPositions[i3] - currentPositions[j3];
                const dy = currentPositions[i3 + 1] - currentPositions[j3 + 1];
                const dz = currentPositions[i3 + 2] - currentPositions[j3 + 2];
                const d = dx * dx + dy * dy + dz * dz;

                if (d < distSq) {
                    const li = lineIndex * 6;
                    currentLinePositions[li] = currentPositions[i3];
                    currentLinePositions[li + 1] = currentPositions[i3 + 1];
                    currentLinePositions[li + 2] = currentPositions[i3 + 2];
                    currentLinePositions[li + 3] = currentPositions[j3];
                    currentLinePositions[li + 4] = currentPositions[j3 + 1];
                    currentLinePositions[li + 5] = currentPositions[j3 + 2];
                    lineIndex++;
                }
            }
        }

        linesGeo.setDrawRange(0, lineIndex * 2);
        linesGeo.attributes.position.needsUpdate = true;
        linesRef.current.rotation.copy(pointsRef.current.rotation);
    });

    return (
        <group>
            <points ref={pointsRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={positions.length / 3}
                        args={[positions, 3]}
                    />
                    <bufferAttribute
                        attach="attributes-size"
                        count={sizes.length}
                        args={[sizes, 1]}
                    />
                </bufferGeometry>
                <pointsMaterial
                    size={2.5}
                    color="#9d4edd"
                    transparent
                    opacity={0.55}
                    sizeAttenuation
                    blending={THREE.AdditiveBlending}
                />
            </points>

            <lineSegments ref={linesRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={linePositions.length / 3}
                        args={[linePositions, 3]}
                    />
                </bufferGeometry>
                <lineBasicMaterial
                    color="#9d4edd"
                    transparent
                    opacity={0.12}
                    blending={THREE.AdditiveBlending}
                />
            </lineSegments>
        </group>
    );
};
