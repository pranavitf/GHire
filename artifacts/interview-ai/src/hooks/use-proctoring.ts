import { useState, useEffect } from 'react';

export function useProctoring() {
  const [isMicActive, setIsMicActive] = useState(true);
  const [isCamActive, setIsCamActive] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Mock audio/video state
  const toggleMic = () => setIsMicActive(!isMicActive);
  const toggleCam = () => setIsCamActive(!isCamActive);

  // Mock speaking indicator for UI realism
  useEffect(() => {
    if (!isMicActive) return;
    
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 2000);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isMicActive]);

  return {
    isMicActive,
    isCamActive,
    isSpeaking,
    toggleMic,
    toggleCam
  };
}
