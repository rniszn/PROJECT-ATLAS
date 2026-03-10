import React from 'react';
import { 
  OrbitControls, 
  ContactShadows, 
  MeshReflectorMaterial, 
  Text
} from '@react-three/drei';
import Robot from './Robot';

const Experience = ({ setActiveModule }) => {
  return (
    <>
      {/* 1. CAMERA CONTROLS */}
      <OrbitControls 
        makeDefault 
        minPolarAngle={0} 
        maxPolarAngle={Math.PI / 1.75} 
        enablePan={false}
      />
      
      {/* 2. STYLED LIGHTING SETUP */}
      <ambientLight intensity={0.4} />
      <spotLight 
        position={[10, 10, 10]} 
        angle={0.15} 
        penumbra={1} 
        intensity={2} 
        castShadow 
      />
      <pointLight position={[-5, 5, -5]} intensity={1.5} color="#00d4ff" />

      {/* 3. THE VIRTUAL ROBOT GUIDE (AI MODULE TRIGGER) */}
      <group 
        onClick={(e) => { 
          e.stopPropagation(); 
          setActiveModule('ai'); 
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <Robot />
      </group>

      {/* 4. THE INTERACTIVE STUDY DESK (STUDY MODULE TRIGGER) */}
      <group 
        position={[0, -0.5, 0]} 
        onClick={(e) => { 
          e.stopPropagation(); 
          setActiveModule('study'); 
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4, 0.1, 2.5]} />
          <MeshReflectorMaterial
            blur={[300, 100]}
            resolution={2048}
            mixBlur={1}
            mixStrength={40}
            roughness={1}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#151515"
            metalness={0.5}
          />
        </mesh>
        
        {/* Subtle Label for the Desk */}
        <Text
          position={[0, 0.1, 0.8]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.15}
          color="#00d4ff"
          font="https://fonts.gstatic.com/s/raleway/v14/1Ptrg8zYS_SKggPNwK4vaqI.woff"
        >
          STUDY WORKSPACE
        </Text>
      </group>

      {/* 5. ENVIRONMENT POLISH */}
      {/* Floor Shadows for depth */}
      <ContactShadows 
        opacity={0.6} 
        scale={10} 
        blur={2} 
        far={1} 
        resolution={256} 
        color="#000000" 
      />
      
      {/* Background Aesthetic */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.51, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#050505" />
      </mesh>
    </>
  );
};

export default Experience;