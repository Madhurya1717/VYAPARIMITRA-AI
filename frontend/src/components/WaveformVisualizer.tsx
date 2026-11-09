import React from 'react';

interface WaveformProps {
  isRecording: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  audioLevel?: number; // 0.0 to 1.0
}

export const WaveformVisualizer: React.FC<WaveformProps> = ({
  isRecording,
  isProcessing,
  isSpeaking,
  audioLevel = 0.3,
}) => {
  const bars = Array.from({ length: 18 });

  return (
    <div className="flex items-center justify-center gap-1.5 h-14 w-full px-4 py-2 bg-white rounded-xl border border-[#E5E9E3] shadow-xs">
      {bars.map((_, idx) => {
        let heightPercent = 14;
        let colorClass = 'bg-[#789B82]/30';

        if (isRecording) {
          const offset = Math.sin((idx / 17) * Math.PI) * (audioLevel * 85 + 15);
          heightPercent = Math.min(100, Math.max(12, offset));
          colorClass = idx % 2 === 0 ? 'bg-[#C77B52]' : 'bg-[#52745F]';
        } else if (isProcessing) {
          const animDelay = (idx * 0.07).toFixed(2);
          return (
            <div
              key={idx}
              className="w-1.5 rounded-full transition-all duration-300 animate-pulse bg-[#52745F]"
              style={{
                height: `${25 + Math.sin(idx * 0.8) * 35}%`,
                animationDelay: `${animDelay}s`,
              }}
            />
          );
        } else if (isSpeaking) {
          const animDelay = (idx * 0.05).toFixed(2);
          return (
            <div
              key={idx}
              className="w-1.5 rounded-full transition-all duration-150 animate-pulse bg-[#3C9970]"
              style={{
                height: `${40 + Math.sin(idx * 0.9) * 40}%`,
                animationDelay: `${animDelay}s`,
              }}
            />
          );
        }

        return (
          <div
            key={idx}
            className={`w-1.5 rounded-full transition-all duration-150 ${colorClass}`}
            style={{
              height: `${heightPercent}%`,
            }}
          />
        );
      })}
    </div>
  );
};

export default WaveformVisualizer;
