
import * as THREE from 'three';

export function sampleTextPoints(text: string, count: number): THREE.Vector3[] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const width = 1024;
  const height = 512;
  canvas.width = width;
  canvas.height = height;

  // Background
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  // Text Style
  ctx.fillStyle = 'white';
  // Use a bold sans-serif font for better particle distribution
  ctx.font = 'bold 160px "Inter", "system-ui", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  const imageData = ctx.getImageData(0, 0, width, height).data;
  const points: { x: number; y: number }[] = [];

  // Sample white pixels
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const idx = (y * width + x) * 4;
      if (imageData[idx] > 128) {
        points.push({
          x: (x / width - 0.5) * 15,
          y: -(y / height - 0.5) * 8
        });
      }
    }
  }

  // Shuffle points to avoid linear filling
  for (let i = points.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [points[i], points[j]] = [points[j], points[i]];
  }

  const result: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const p = points[i % points.length];
    result.push(new THREE.Vector3(p.x, p.y, 0));
  }

  return result;
}
