
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { sampleTextPoints } from '../utils/textSampler';

interface ParticleSystemProps {
  leftGesture: number;
  rightHand: {
    x: number;
    y: number;
    z: number;
    isFist: boolean;
  } | null;
  customTexts: string[];
}

const PARTICLE_COUNT = 8000;
const DAMPING = 0.65;
const RETURN_SPEED = 0.8;
const HAND_INTERACTION_RADIUS = 3.5;
const PUSH_STRENGTH = 0.45;
const PULL_STRENGTH = 0.35;

const ParticleSystem: React.FC<ParticleSystemProps> = ({ leftGesture, rightHand, customTexts }) => {
  const meshRef = useRef<THREE.Points>(null);
  const targetPositions = useRef<THREE.Vector3[]>([]);
  const { viewport } = useThree();
  
  const isMobile = useMemo(() => viewport.width < 12, [viewport.width]);

  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const velocities = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const sizes = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) arr[i] = Math.random() * 0.12 + 0.04;
    return arr;
  }, []);

  // Sync particle targets to viewport and custom text
  useEffect(() => {
    const activeText = customTexts[leftGesture - 1] || "NONE";
    // Detect if we're in a mobile-like constrained view and shrink accordingly
    targetPositions.current = sampleTextPoints(activeText, PARTICLE_COUNT, viewport.aspect, isMobile);
  }, [leftGesture, customTexts, viewport.aspect, isMobile]);

  // Initial random cloud
  useEffect(() => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * viewport.width;
      positions[i * 3 + 1] = (Math.random() - 0.5) * viewport.height;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
  }, [viewport.width, viewport.height]);

  useFrame(() => {
    if (!meshRef.current || targetPositions.current.length === 0) return;

    const attr = meshRef.current.geometry.attributes.position;
    const posArr = attr.array as Float32Array;

    // Responsive interaction mapping
    // We constrain the hand influence to slightly inside the viewport edges
    const scaleX = viewport.width * 0.9; 
    const scaleY = viewport.height * 0.9;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const target = targetPositions.current[i];

      // 1. Particle movement toward target
      velocities[i3] += (target.x - posArr[i3]) * RETURN_SPEED;
      velocities[i3 + 1] += (target.y - posArr[i3 + 1]) * RETURN_SPEED;
      velocities[i3 + 2] += (target.z - posArr[i3 + 2]) * RETURN_SPEED;

      // 2. Right Hand Interaction (mapped to screen)
      if (rightHand) {
        const hx = (1 - rightHand.x - 0.5) * scaleX;
        const hy = -(rightHand.y - 0.5) * scaleY;
        const hz = rightHand.z * -8;

        const dx = posArr[i3] - hx;
        const dy = posArr[i3 + 1] - hy;
        const dz = posArr[i3 + 2] - hz;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);

        if (dist < HAND_INTERACTION_RADIUS) {
          const force = (1 - dist / HAND_INTERACTION_RADIUS);
          if (rightHand.isFist) {
            velocities[i3] -= dx * force * PULL_STRENGTH;
            velocities[i3 + 1] -= dy * force * PULL_STRENGTH;
            velocities[i3 + 2] -= dz * force * PULL_STRENGTH;
          } else {
            velocities[i3] += dx * force * PUSH_STRENGTH;
            velocities[i3 + 1] += dy * force * PUSH_STRENGTH;
            velocities[i3 + 2] += dz * force * PUSH_STRENGTH;
          }
        }
      }

      // 3. Physics update
      velocities[i3] *= DAMPING;
      velocities[i3 + 1] *= DAMPING;
      velocities[i3 + 2] *= DAMPING;

      posArr[i3] += velocities[i3];
      posArr[i3 + 1] += velocities[i3 + 1];
      posArr[i3 + 2] += velocities[i3 + 2];
    }

    attr.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={isMobile ? 0.1 : 0.12}
        color="#a5f3fc" // Bright cyan
        transparent
        opacity={0.85}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default ParticleSystem;
