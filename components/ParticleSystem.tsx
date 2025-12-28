
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
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
}

const PARTICLE_COUNT = 8000;
const DAMPING = 0.65; // Lower damping for a snappy, high-precision arrival
const RETURN_SPEED = 0.8; // Max speed for near-instant formation
const HAND_INTERACTION_RADIUS = 3.5;
const PUSH_STRENGTH = 0.4;
const PULL_STRENGTH = 0.3;

const ParticleSystem: React.FC<ParticleSystemProps> = ({ leftGesture, rightHand }) => {
  const meshRef = useRef<THREE.Points>(null);
  const targetPositions = useRef<THREE.Vector3[]>([]);
  
  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const velocities = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const sizes = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) arr[i] = Math.random() * 0.15 + 0.05;
    return arr;
  }, []);

  useEffect(() => {
    let text = "我是None";
    if (leftGesture === 2) text = "我爱南航";
    if (leftGesture === 3) text = "I LOVE YOU";
    targetPositions.current = sampleTextPoints(text, PARTICLE_COUNT);
  }, [leftGesture]);

  useEffect(() => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
  }, []);

  useFrame(() => {
    if (!meshRef.current || targetPositions.current.length === 0) return;

    const attr = meshRef.current.geometry.attributes.position;
    const posArr = attr.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const target = targetPositions.current[i];

      // 1. High-Speed Snap to Target
      velocities[i3] += (target.x - posArr[i3]) * RETURN_SPEED;
      velocities[i3 + 1] += (target.y - posArr[i3 + 1]) * RETURN_SPEED;
      velocities[i3 + 2] += (target.z - posArr[i3 + 2]) * RETURN_SPEED;

      // 2. Right Hand Interaction
      if (rightHand) {
        const hx = (1 - rightHand.x - 0.5) * 20;
        const hy = -(rightHand.y - 0.5) * 12;
        const hz = rightHand.z * -10;

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

      // 3. Apply physics with snapping damping
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
        size={0.15}
        color="#8ab4f8"
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default ParticleSystem;
