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
  // 16 animated waveform bars
  const bars = Array.from({ length: 16 });

  return (
    <div className="flex items-center justify-center gap-1.5 h-16 w-full px-4 py-2 bg-slate-900/60 rounded-xl border border-slate-800/80">
      {bars.map((_, idx) => {
        let heightPercent = 15;
        let colorClass = 'bg-slate-700';

        if (isRecording) {
          // Dynamic heights based on index and audio level
          const offset = Math.sin((idx / 15) * Math.PI) * (audioLevel * 75 + 15);
          heightPercent = Math.min(100, Math.max(12, offset));
          colorClass = idx % 2 === 0 ? 'bg-emerald-400' : 'bg-teal-400';
        } else if (isProcessing) {
          // Pulsing wave pattern
          const animDelay = (idx * 0.08).toFixed(2);
          return (
            <div
              key={idx}
              className="w-1.5 bg-amber-400 rounded-full transition-all duration-300 animate-pulse"
              style={{
                height: `${25 + Math.sin(idx) * 20}%`,
                animationDelay: `${animDelay}s`,
              }}
            />
          );
        } else if (isSpeaking) {
          // Smooth sine wave
          const phase = Math.sin((idx / 15) * Math.PI * 2);
          heightPercent = 35 + phase * 25;
          colorClass = 'bg-cyan-400';
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

