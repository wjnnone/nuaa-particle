
import { HandData } from '../types';

export class HandTracker {
  private hands: any;
  private camera: any;
  private onResultsCallback: (results: any) => void = () => {};

  constructor() {
    // Accessing globals via window to avoid ReferenceError in ES modules
    const HandsClass = (window as any).Hands;
    if (!HandsClass) {
      console.error("MediaPipe Hands not found on window. Ensure scripts in index.html are loaded.");
      return;
    }

    this.hands = new HandsClass({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults((results: any) => this.onResultsCallback(results));
  }

  public async start(videoElement: HTMLVideoElement) {
    const CameraClass = (window as any).Camera;
    if (!CameraClass || !this.hands) return;

    this.camera = new CameraClass(videoElement, {
      onFrame: async () => {
        await this.hands.send({ image: videoElement });
      },
      width: 1280,
      height: 720,
    });
    return this.camera.start();
  }

  public onResults(callback: (results: any) => void) {
    this.onResultsCallback = callback;
  }

  public static processHand(landmarks: any[], label: 'Left' | 'Right'): HandData {
    const fingerTips = [8, 12, 16, 20];
    const fingerBases = [5, 9, 13, 17];
    
    let fingerCount = 0;
    fingerTips.forEach((tip, idx) => {
      if (landmarks[tip].y < landmarks[fingerBases[idx]].y - 0.05) {
        fingerCount++;
      }
    });

    if (label === 'Left') {
      if (landmarks[4].x > landmarks[3].x + 0.05) fingerCount++;
    } else {
      if (landmarks[4].x < landmarks[3].x - 0.05) fingerCount++;
    }

    const wrist = landmarks[0];
    const dists = fingerTips.map(t => {
      const dx = landmarks[t].x - wrist.x;
      const dy = landmarks[t].y - wrist.y;
      return Math.sqrt(dx * dx + dy * dy);
    });
    const avgDist = dists.reduce((a, b) => a + b, 0) / 4;
    const isFist = avgDist < 0.15;

    return {
      label,
      landmarks,
      gesture: `Finger Count: ${fingerCount}`,
      isFist,
      fingerCount
    };
  }
}
