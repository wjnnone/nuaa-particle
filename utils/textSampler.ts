
import * as THREE from 'three';

export function sampleTextPoints(
  text: string, 
  count: number, 
  aspectRatio: number = 2,
  isMobile: boolean = false
): THREE.Vector3[] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  // Higher resolution for cleaner sampling
  const width = 2048;
  const height = width / aspectRatio;
  canvas.width = width;
  canvas.height = height;

  // Background
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  // Dynamic Font Sizing: 
  // We need to fit text within the canvas while leaving a small margin.
  // Mobile needs even more aggressive margins to handle UI overlays.
  const marginFactor = isMobile ? 0.7 : 0.85;
  
  // 1. Calculate size based on width (prevent overflow for long strings)
  const widthConstrainedSize = (width * marginFactor) / text.length * 1.6;
  // 2. Calculate size based on height (prevent overflow for mobile landscape)
  const heightConstrainedSize = height * (isMobile ? 0.5 : 0.6);
  
  // Use the smaller of the two to ensure it fits in both directions
  const fontSize = Math.min(widthConstrainedSize, heightConstrainedSize, 400);
  
  ctx.fillStyle = 'white';
  ctx.font = `bold ${fontSize}px "Inter", "Segoe UI", "system-ui", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Draw text in the middle
  ctx.fillText(text, width / 2, height / 2);

  const imageData = ctx.getImageData(0, 0, width, height).data;
  const points: { x: number; y: number }[] = [];

  // Sampling step
  const step = 4;
  
  // Define 3D space limits based on viewport logic
  // On mobile, we shrink the entire coordinate space to 10 units max instead of 14
  const targetAreaWidth = isMobile ? 10 : 14;
  const targetAreaHeight = targetAreaWidth / aspectRatio;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      if (imageData[idx] > 128) {
        points.push({
          x: (x / width - 0.5) * targetAreaWidth,
          y: -(y / height - 0.5) * targetAreaHeight
        });
      }
    }
  }

  // Fallback
  if (points.length === 0) {
      return Array(count).fill(0).map(() => new THREE.Vector3(0,0,0));
  }

  // Shuffle points
  for (let i = points.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [points[i], points[j]] = [points[j], points[i]];
  }

  const result: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const p = points[i % points.length];
    // Add slight random z-depth for 3D feel
    result.push(new THREE.Vector3(p.x, p.y, (Math.random() - 0.5) * 0.2));
  }

  return result;
}
