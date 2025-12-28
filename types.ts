
export interface HandData {
  label: 'Left' | 'Right';
  landmarks: Array<{ x: number; y: number; z: number }>;
  gesture: string;
  isFist: boolean;
  fingerCount: number;
}

export interface ParticleState {
  leftGesture: number; // 1, 2, or 3
  rightHandPos: { x: number; y: number; z: number } | null;
  rightHandFist: boolean;
}
