import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, Html, Line } from '@react-three/drei';

const courses = [
    { id: 'ESC180', title: 'Intro to Programming' },
    { id: 'ESC103', title: 'Engineering Math' },
    { id: 'CIV102', title: 'Structures' },
    { id: 'ESC194', title: 'Calculus I' },
    { id: 'PHY180', title: 'Classical Mechanics' },
    { id: 'ESC101', title: 'Praxis I' },
    { id: 'MAT185', title: 'Linear Algebra' },
    { id: 'ESC195', title: 'Calculus II' },
    { id: 'MSE160', title: 'Materials' },
    { id: 'ECE159', title: 'Electric Circuits' },
    { id: 'ESC190', title: 'Data Structures' },
];

const coursePdfMap: Record<string, string | null> = {
    ESC180: './assets/ESC180_Exam_Review.pdf',
    ESC103: './assets/ESC103_Exam_Review.pdf',
    CIV102: './assets/CIV102_Notes.pdf',
    ESC194: './assets/ESC194_Exam_Review.pdf',
    PHY180: './assets/PHY180_Exam_Review.pdf',
    ESC101: null,
    MAT185: './assets/MAT185_Lecture_Notes.pdf',
    ESC195: './assets/ESC195_Exam_Review.pdf',
    MSE160: './assets/MSE160_Lecture_Notes.pdf',
    ECE159: './assets/ECE159_Lecture_Notes.pdf',
    ESC190: './assets/ESC190_Exam_Review.pdf',
};

const KnowledgeGraph: React.FC = () => {
    const groupRef = useRef<THREE.Group>(null);
    const edgesRef = useRef<THREE.Group>(null);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    const nodes = useMemo(() => {
        return courses.map((course, i) => {
            const phi = Math.acos(-1 + (2 * i) / courses.length);
            const theta = Math.sqrt(courses.length * Math.PI) * phi;
            const r = 10;
            return {
                ...course,
                pos: new THREE.Vector3(
                    r * Math.cos(theta) * Math.sin(phi),
                    r * Math.sin(theta) * Math.sin(phi),
                    r * Math.cos(phi)
                )
            };
        });
    }, []);

    const edges = useMemo(() => {
        const lines: [THREE.Vector3, THREE.Vector3][] = [];
        nodes.forEach((node, i) => {
            for (let j = 0; j < 2; j++) {
                const targetIdx = (i + j + 1) % nodes.length;
                lines.push([node.pos, nodes[targetIdx].pos]);
            }
        });
        return lines;
    }, [nodes]);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += 0.001;
            groupRef.current.rotation.x += 0.0005;
        }

        if (edgesRef.current) {
            const pulse = 0.085 + Math.sin(state.clock.elapsedTime * 1.5) * 0.035;
            edgesRef.current.children.forEach((child) => {
                const mesh = child as THREE.Mesh;
                if (mesh.material && 'opacity' in mesh.material) {
                    (mesh.material as THREE.Material).opacity = pulse;
                }
            });
        }
    });

    return (
        <group ref={groupRef}>
            <group ref={edgesRef}>
                {edges.map((pts, i) => (
                    <Line key={i} points={pts} color="#9d4edd" opacity={0.08} transparent lineWidth={1} />
                ))}
            </group>

            {nodes.map((node) => (
                <group key={node.id} position={node.pos}>
                    <mesh
                        onPointerOver={(e) => {
                            e.stopPropagation();
                            setHoveredNode(node.id);
                            document.body.style.cursor = coursePdfMap[node.id] ? 'pointer' : 'default';
                        }}
                        onPointerOut={() => {
                            setHoveredNode(null);
                            document.body.style.cursor = 'default';
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            const pdf = coursePdfMap[node.id];
                            if (pdf) window.open(pdf, '_blank');
                        }}
                    >
                        <sphereGeometry args={[hoveredNode === node.id ? 0.5 : 0.35, 32, 32]} />
                        <meshBasicMaterial
                            color={hoveredNode === node.id ? '#ffffff' : '#9d4edd'}
                            transparent
                            opacity={hoveredNode === node.id ? 1.0 : 0.7}
                            blending={THREE.AdditiveBlending}
                        />
                    </mesh>

                    <Html distanceFactor={15} center>
                        <div className={`transition-all duration-300 font-mono text-center pointer-events-none
                            ${hoveredNode === node.id ? 'opacity-100 scale-110 text-white z-50' : 'opacity-60 text-purple-light text-xs'}`}
                        >
                            <div className="font-bold">{node.id}</div>
                            {hoveredNode === node.id && (
                                <div className="text-[10px] whitespace-nowrap bg-black/80 px-2 py-1 border border-purple-accent/50 rounded mt-1">
                                    {node.title}
                                </div>
                            )}
                        </div>
                    </Html>
                </group>
            ))}
        </group>
    );
};

export const NeuralNet: React.FC = () => {
    return (
        <div className="relative h-screen w-full bg-cyber-black pt-24 pb-12 px-8 flex flex-col items-center overflow-hidden">
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 25], fov: 60 }}>
                    <ambientLight intensity={0.5} />
                    <KnowledgeGraph />
                    <OrbitControls enableZoom={true} enablePan={false} autoRotate={true} autoRotateSpeed={0.3} minDistance={15} maxDistance={35} />
                </Canvas>
            </div>

            <div className="relative z-10 w-full max-w-5xl h-full flex flex-col justify-end pb-12 pointer-events-none">
                <div className="glass-card p-6 pointer-events-auto max-w-lg">
                    <h2 className="text-2xl font-mono text-purple-glow mb-2 tracking-widest uppercase flex items-center gap-3">
                        <div className="w-2 h-2 bg-purple-accent rounded-full animate-pulse" />
                        Knowledge Graph
                    </h2>
                    <p className="text-text-secondary font-sans leading-relaxed text-sm max-w-2xl">
                        University notes and course materials. Rotate and zoom the 3D graph to explore connections between Engineering Science concepts. Click a node to view notes.
                    </p>
                </div>
            </div>
        </div>
    );
};
