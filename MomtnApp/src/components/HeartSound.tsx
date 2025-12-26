
import { createContext, useContext, useRef, useState } from "react";

interface HeartSoundContextType {
  playHeartSound: () => void;
}

const HeartSoundContext = createContext<HeartSoundContextType | undefined>(undefined);

export function HeartSoundProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const playHeartSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.error("Error playing sound:", err));
    }
  };

  return (
    <HeartSoundContext.Provider value={{ playHeartSound }}>
      {children}
      <audio 
        ref={audioRef} 
        src="https://assets.mixkit.co/active_storage/sfx/214/214-preview.mp3"
        preload="auto"
      />
    </HeartSoundContext.Provider>
  );
}

export function useHeartSound() {
  const context = useContext(HeartSoundContext);
  if (context === undefined) {
    throw new Error("useHeartSound must be used within a HeartSoundProvider");
  }
  return context;
}
