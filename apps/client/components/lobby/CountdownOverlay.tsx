'use client';

interface Props {
  secondsLeft: number;
}

export function CountdownOverlay({ secondsLeft }: Props) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <p className="font-display text-xs tracking-[0.6em] text-ink-300">MATCH STARTING</p>
        <p
          key={secondsLeft}
          className="animate-pulseSlow font-display text-[12rem] leading-none tracking-widest text-accent-red drop-shadow-[0_0_24px_rgba(227,74,74,0.5)]"
        >
          {secondsLeft}
        </p>
      </div>
    </div>
  );
}
