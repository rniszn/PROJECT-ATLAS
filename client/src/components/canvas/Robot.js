import React from "react";
import { Float, MeshDistortMaterial, Sphere } from "@react-three/drei";

const Robot = () => {
  return (
    <Float speed={4} rotationIntensity={1.5} floatIntensity={2}>
      {/* Robot Core Body */}
      <Sphere args={[0.4, 64, 64]} position={[1.5, 1.2, 0]}>
        <MeshDistortMaterial
          color="#00d4ff"
          speed={3}
          distort={0.3}
          radius={1}
          emissive="#005f73"
          emissiveIntensity={0.5}
        />
      </Sphere>

      {/* Holographic "Eye" */}
      <mesh position={[1.7, 1.2, 0.3]}>
        <boxGeometry args={[0.15, 0.05, 0.1]} />
        <meshStandardMaterial
          color="white"
          emissive="#00d4ff"
          emissiveIntensity={2}
        />
      </mesh>
    </Float>
  );
};

export default Robot;
