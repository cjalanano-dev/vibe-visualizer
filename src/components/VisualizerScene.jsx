import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Box, Torus, Stars } from '@react-three/drei';
import * as THREE from 'three';

const VisualizerScene = ({ getAudioData }) => {
    const meshRef = useRef();
    const bassMeshRef = useRef();
    const midMeshRef = useRef();
    const trebleMeshRef = useRef();

    // FIX: Create color object once
    const tempColor = useMemo(() => new THREE.Color(), []);

    useFrame((state, delta) => {
        const { bass, mid, treble } = getAudioData();

        // Bass - Central Sphere
        const scale = 1 + bass * 2.0;
        if (bassMeshRef.current) {
            bassMeshRef.current.scale.setScalar(scale);
            bassMeshRef.current.rotation.x += delta * 0.2;
            bassMeshRef.current.rotation.y += delta * 0.3;

            // Color shift without creating new objects per frame
            // HSL: Hue (0.6 + bass*0.4), Saturation 0.8, Lightness 0.5
            tempColor.setHSL(0.6 + bass * 0.4, 0.8, 0.5);
            bassMeshRef.current.material.color.lerp(tempColor, 0.1);
            bassMeshRef.current.material.emissive.lerp(tempColor, 0.1);
        }

        // Mid - Rotating Torus Ring
        if (midMeshRef.current) {
            const midScale = 1 + mid * 0.5;
            midMeshRef.current.scale.setScalar(midScale);
            midMeshRef.current.rotation.z += delta * (0.5 + mid * 2);
            midMeshRef.current.rotation.x += delta * 0.2;
        }

        // Treble - Floating Cubes/Background
        if (trebleMeshRef.current) {
            trebleMeshRef.current.rotation.y -= delta * (0.2 + treble * 3);
            // We could also scale them or pulse color for treble if we wanted
        }
    });

    return (
        <>
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />
            <spotLight position={[-10, -10, -10]} angle={0.3} />

            {/* Central Bass Sphere */}
            <Sphere ref={bassMeshRef} args={[1, 64, 64]} position={[0, 0, 0]}>
                <meshStandardMaterial
                    roughness={0.1}
                    metalness={0.8}
                    emissiveIntensity={0.5}
                />
            </Sphere>

            {/* Mid Frequency Ring */}
            <Torus ref={midMeshRef} args={[2.5, 0.1, 16, 100]} position={[0, 0, 0]}>
                <meshStandardMaterial color="#00ffcc" wireframe emissive="#00ffcc" emissiveIntensity={0.8} />
            </Torus>

            {/* Treble Group */}
            <group ref={trebleMeshRef}>
                <Box args={[0.3, 0.3, 0.3]} position={[3, 2, 0]}>
                    <meshStandardMaterial color="hotpink" />
                </Box>
                <Box args={[0.3, 0.3, 0.3]} position={[-3, -2, 1]}>
                    <meshStandardMaterial color="yellow" />
                </Box>
                <Box args={[0.3, 0.3, 0.3]} position={[1, 3, -1]}>
                    <meshStandardMaterial color="cyan" />
                </Box>
                <Box args={[0.3, 0.3, 0.3]} position={[-2, 1, 3]}>
                    <meshStandardMaterial color="orange" />
                </Box>
            </group>

            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        </>
    );
};

export default VisualizerScene;
