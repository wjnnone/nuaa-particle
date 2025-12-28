
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import ParticleSystem from './components/ParticleSystem';
import { HandTracker } from './services/handTracking';
import { HandData } from './types';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [leftGesture, setLeftGesture] = useState<number>(1);
  const [rightHand, setRightHand] = useState<{ x: number; y: number; z: number; isFist: boolean } | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [aiGreeting, setAiGreeting] = useState("Waiting for hands...");
  const [isUiExpanded, setIsUiExpanded] = useState(true);

  // Initialize Gemini for a welcoming insight
  useEffect(() => {
    const initGemini = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: "Welcome the user to the 'Celestial Hands' particle interaction system. Keep it poetic and short (max 15 words).",
        });
        if (response.text) setAiGreeting(response.text);
      } catch (err) {
        setAiGreeting("Connect your soul to the particles.");
      }
    };
    initGemini();
  }, []);

  const handleHandResults = useCallback((results: any) => {
    if (!results.multiHandLandmarks) {
      setRightHand(null);
      return;
    }

    let rightFound = false;

    results.multiHandLandmarks.forEach((landmarks: any, index: number) => {
      const label = results.multiHandedness[index].label; // MediaPipe mirrored
      const handData = HandTracker.processHand(landmarks, label);

      if (label === 'Right') { // MediaPipe label 'Right' is the user's Left hand when mirrored
        const count = Math.min(Math.max(handData.fingerCount, 1), 3);
        setLeftGesture(count);
      } else {
        rightFound = true;
        setRightHand({
          x: landmarks[9].x, // Middle finger base as anchor
          y: landmarks[9].y,
          z: landmarks[9].z,
          isFist: handData.isFist
        });
      }
    });

    if (!rightFound) setRightHand(null);
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      const tracker = new HandTracker();
      tracker.onResults(handleHandResults);
      tracker.start(videoRef.current).then(() => setCameraReady(true));
    }
  }, [handleHandResults]);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Immersive Camera Layer */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-30 scale-x-[-1]"
        playsInline
        muted
      />

      {/* 3D Interaction Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <Canvas shadowAlpha={0}>
          <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={45} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          
          <ParticleSystem 
            leftGesture={leftGesture} 
            rightHand={rightHand} 
          />

          <Environment preset="night" />
        </Canvas>
      </div>

      {/* Collapsible UI Overlay */}
      <div className={`absolute top-8 left-8 transition-all duration-300 ease-in-out ${isUiExpanded ? 'max-w-sm' : 'max-w-[60px]'}`}>
        <div className="relative bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 text-white overflow-hidden shadow-2xl">
          {/* Header / Toggle Area */}
          <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setIsUiExpanded(!isUiExpanded)}>
            {isUiExpanded ? (
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent truncate pr-4">
                Celestial Hands
              </h1>
            ) : null}
            <button className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
              {isUiExpanded ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              )}
            </button>
          </div>

          {/* Expandable Content */}
          <div className={`transition-all duration-300 ease-in-out ${isUiExpanded ? 'max-h-[600px] opacity-100 p-6 pt-0' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <p className="text-sm text-blue-200 opacity-80 italic">
              "{aiGreeting}"
            </p>
            
            <div className="mt-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${cameraReady ? 'bg-green-500 shadow-[0_0_10px_green]' : 'bg-red-500 animate-pulse'}`} />
                <span className="text-xs font-medium uppercase tracking-wider">{cameraReady ? 'Tracking Active' : 'Initializing Sensors...'}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-[10px] uppercase tracking-widest text-white/60">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <p className="mb-1 text-blue-400 font-bold">Left Hand</p>
                  <p>Gesture {leftGesture} Active</p>
                  <p className="mt-1 opacity-50">1: 我是None<br/>2: 我爱南航<br/>3: I LOVE YOU</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <p className="mb-1 text-purple-400 font-bold">Right Hand</p>
                  <p>{rightHand ? (rightHand.isFist ? 'Shrinking' : 'Expanding') : 'Searching...'}</p>
                  <p className="mt-1 opacity-50">Grip: Contract<br/>Open: Displace</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gesture Visualization for Right Hand */}
      {rightHand && (
        <div 
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
          style={{
            left: `${(1 - rightHand.x) * 100}%`,
            top: `${rightHand.y * 100}%`,
          }}
        >
          <div className={`w-8 h-8 rounded-full border-2 ${rightHand.isFist ? 'border-red-400 scale-75' : 'border-blue-400 scale-125'} blur-[1px] shadow-[0_0_15px_rgba(96,165,250,0.5)]`} />
        </div>
      )}

      {/* Interactive Helper Toast */}
      {!rightHand && cameraReady && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/10 backdrop-blur-xl rounded-full text-white text-sm font-light tracking-widest border border-white/10 animate-bounce">
          SHOW YOUR HANDS TO START
        </div>
      )}
    </div>
  );
};

export default App;
