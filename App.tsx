
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera } from '@react-three/drei';
import ParticleSystem from './components/ParticleSystem';
import { HandTracker } from './services/handTracking';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [leftGesture, setLeftGesture] = useState<number>(1);
  const [rightHand, setRightHand] = useState<{ x: number; y: number; z: number; isFist: boolean } | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [aiGreeting, setAiGreeting] = useState("Initializing system...");
  const [isUiExpanded, setIsUiExpanded] = useState(true);

  // Custom texts for gestures
  const [texts, setTexts] = useState<string[]>(() => {
      const saved = localStorage.getItem('celestial-texts');
      return saved ? JSON.parse(saved) : ["HELLO", "南航", "I LOVE YOU"];
  });

  useEffect(() => {
      localStorage.setItem('celestial-texts', JSON.stringify(texts));
  }, [texts]);

  useEffect(() => {
    const initGemini = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: "Poetic 1-sentence welcome for a customizable particle app. Max 10 words.",
        });
        if (response.text) setAiGreeting(response.text);
      } catch (err) {
        setAiGreeting("Shape the stars with your will.");
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
      const label = results.multiHandedness[index].label; 
      const handData = HandTracker.processHand(landmarks, label);

      if (label === 'Right') { 
        const count = Math.min(Math.max(handData.fingerCount, 1), 3);
        setLeftGesture(count);
      } else {
        rightFound = true;
        setRightHand({
          x: landmarks[9].x, 
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

  const updateText = (index: number, val: string) => {
      const newTexts = [...texts];
      newTexts[index] = val;
      setTexts(newTexts);
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden touch-none font-sans">
      {/* Immersive Camera Layer */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-25 scale-x-[-1]"
        playsInline
        muted
      />

      {/* 3D Interaction Layer */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <Canvas dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={45} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          
          <ParticleSystem 
            leftGesture={leftGesture} 
            rightHand={rightHand} 
            customTexts={texts}
          />

          <Environment preset="night" />
        </Canvas>
      </div>

      {/* Collapsible UI Overlay */}
      <div className={`absolute top-4 left-4 md:top-8 md:left-8 transition-all duration-500 ease-out z-50 ${isUiExpanded ? 'w-[calc(100%-2rem)] md:max-w-sm' : 'w-14'}`}>
        <div className="relative bg-black/50 backdrop-blur-2xl rounded-2xl md:rounded-3xl border border-white/10 text-white shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="p-3 md:p-4 flex items-center justify-between cursor-pointer select-none" onClick={() => setIsUiExpanded(!isUiExpanded)}>
            {isUiExpanded ? (
              <h1 className="text-sm md:text-lg font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent truncate uppercase tracking-widest">
                Celestial Hands
              </h1>
            ) : null}
            <button className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
              <svg 
                className={`transition-transform duration-300 ${isUiExpanded ? 'rotate-180' : ''}`}
                xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
          </div>

          {/* Expandable Content with Scroll for Mobile Landscape */}
          <div className={`transition-all duration-500 ease-in-out overflow-y-auto overflow-x-hidden ${isUiExpanded ? 'max-h-[70vh] md:max-h-[600px] opacity-100 p-4 md:p-6 pt-0' : 'max-h-0 opacity-0'}`}>
            <p className="text-[10px] md:text-xs text-blue-200 opacity-60 italic mb-6 leading-relaxed">
              "{aiGreeting}"
            </p>
            
            <div className="space-y-6">
              {/* Settings Section */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2">Customize Gestures</p>
                {texts.map((t, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border transition-colors ${leftGesture === idx + 1 ? 'bg-blue-500/10 border-blue-500/50' : 'bg-white/5 border-white/5'}`}>
                        <label className="block text-[9px] mb-1 opacity-50 uppercase tracking-widest">Gesture {idx + 1} (Fingers)</label>
                        <input 
                            type="text" 
                            value={t} 
                            onChange={(e) => updateText(idx, e.target.value)}
                            className="w-full bg-transparent border-none outline-none text-xs font-bold text-white placeholder-white/20 pointer-events-auto"
                            placeholder={`Enter text for gesture ${idx + 1}...`}
                            maxLength={30}
                        />
                    </div>
                ))}
              </div>

              {/* Status Section */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                <div className="space-y-1">
                  <p className="text-[8px] uppercase tracking-widest opacity-40 font-bold">L-Hand Mode</p>
                  <p className="text-[10px] font-bold text-cyan-400">Word Trigger</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[8px] uppercase tracking-widest opacity-40 font-bold">R-Hand Mode</p>
                  <p className={`text-[10px] font-bold ${rightHand?.isFist ? 'text-pink-400' : 'text-blue-400'}`}>
                    {rightHand ? (rightHand.isFist ? 'Attracting' : 'Repelling') : 'Idle'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Visual Cursor */}
      {rightHand && (
        <div 
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 z-10"
          style={{
            left: `${(1 - rightHand.x) * 100}%`,
            top: `${rightHand.y * 100}%`,
          }}
        >
          <div className={`
            w-12 h-12 md:w-20 md:h-20 rounded-full border-2 
            ${rightHand.isFist ? 'border-pink-500 scale-75' : 'border-cyan-400 scale-125'} 
            blur-[1px] shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all duration-300
          `} />
        </div>
      )}

      {/* Dynamic Instruction Helper */}
      {!rightHand && cameraReady && (
        <div className="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/20 backdrop-blur-3xl rounded-full text-white text-[9px] md:text-xs font-black tracking-[0.3em] border border-white/5 animate-pulse whitespace-nowrap uppercase">
          Raise hands to sculpt light
        </div>
      )}
    </div>
  );
};

export default App;
