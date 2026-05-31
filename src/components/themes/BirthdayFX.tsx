import { useId, type CSSProperties } from "react";

/* ============== CONFETTI ============== */
const CONFETTI_COLORS = [
  "oklch(0.78 0.18 25)",
  "oklch(0.82 0.17 60)",
  "oklch(0.78 0.18 145)",
  "oklch(0.7 0.2 220)",
  "oklch(0.72 0.22 320)",
];

export function Confetti({ count = 40 }: { count?: number }) {
  const pieces = Array.from({ length: count });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes bday-fall {
          0%   { transform: translateY(-20px) rotate(0deg); }
          100% { transform: translateY(110vh) rotate(720deg); }
        }
      `}</style>
      {pieces.map((_, i) => {
        const left = (i * 37) % 100;
        const delay = (i % 8) * 0.5;
        const dur = 5 + (i % 5);
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const size = 6 + (i % 4) * 2;
        const rot = (i * 23) % 360;
        return (
          <span
            key={i}
            className="absolute block"
            style={{
              left: `${left}%`,
              top: "-20px",
              width: size,
              height: size * 1.6,
              background: color,
              transform: `rotate(${rot}deg)`,
              borderRadius: "2px",
              animation: `bday-fall ${dur}s linear ${delay}s infinite`,
              opacity: 0.85,
            }}
          />
        );
      })}
    </div>
  );
}

/* ============== BALLOONS ============== */
const BALLOON_COLORS = [
  "oklch(0.72 0.22 25)",
  "oklch(0.78 0.18 60)",
  "oklch(0.72 0.2 145)",
  "oklch(0.7 0.2 220)",
  "oklch(0.72 0.22 320)",
  "oklch(0.8 0.18 90)",
];

export function Balloons({ count = 9 }: { count?: number }) {
  const balloons = Array.from({ length: count });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes bday-rise {
          0%   { transform: translate3d(0, 0, 0) rotate(-2deg); opacity: 0; }
          8%   { opacity: 1; }
          50%  { transform: translate3d(var(--sway, 10px), -55vh, 0) rotate(3deg); }
          100% { transform: translate3d(0, -115vh, 0) rotate(-2deg); opacity: 0.9; }
        }
      `}</style>
      {balloons.map((_, i) => {
        const left = (i * 53 + 7) % 95;
        const delay = (i % 6) * 0.8;
        const dur = 9 + (i % 5) * 1.5;
        const color = BALLOON_COLORS[i % BALLOON_COLORS.length];
        const size = 46 + (i % 3) * 14;
        const sway = (i % 2 === 0 ? 1 : -1) * (6 + (i % 3) * 3);
        return (
          <div
            key={i}
            className="absolute"
            style={
              {
                left: `${left}%`,
                bottom: "-160px",
                animation: `bday-rise ${dur}s ease-in ${delay}s infinite`,
                "--sway": `${sway}px`,
              } as CSSProperties & { "--sway": string }
            }
          >
            <div
              style={{
                width: size,
                height: size * 1.2,
                borderRadius: "50% 50% 48% 48% / 55% 55% 45% 45%",
                background: `radial-gradient(circle at 32% 30%, oklch(0.97 0.05 90 / 0.85), ${color} 55%, oklch(0.35 0.12 320) 110%)`,
                boxShadow: `0 10px 30px ${color.replace(")", " / 0.35)")}, inset -6px -10px 20px oklch(0.2 0.1 280 / 0.35)`,
              }}
            />
            <div
              className="mx-auto"
              style={{
                width: 0,
                height: 0,
                borderLeft: `${size * 0.1}px solid transparent`,
                borderRight: `${size * 0.1}px solid transparent`,
                borderTop: `${size * 0.14}px solid ${color}`,
                marginTop: -2,
              }}
            />
            <div
              className="mx-auto"
              style={{
                width: 1.5,
                height: size * 1.5,
                background:
                  "linear-gradient(to bottom, oklch(0.9 0.02 320 / 0.7), oklch(0.9 0.02 320 / 0.1))",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ============== BIRTHDAY HAT ============== */
export function BirthdayHat({
  size = 80,
  color = "oklch(0.72 0.22 25)",
  accent = "oklch(0.85 0.2 60)",
  className = "",
}: {
  size?: number;
  color?: string;
  accent?: string;
  className?: string;
}) {
  const gradId = useId().replace(/:/g, "");
  const w = size;
  const h = size * 1.25;
  return (
    <div
      className={className}
      style={{
        width: w,
        height: h,
        position: "relative",
        animation: "bday-hat-bob 3s ease-in-out infinite",
      }}
    >
      <style>{`
        @keyframes bday-hat-bob {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          50%      { transform: translateY(-4px) rotate(6deg); }
        }
        @keyframes bday-hat-pop {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.25); }
        }
      `}</style>

      <svg width={w} height={h} viewBox="0 0 100 125" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.97 0.05 90 / 0.6)" />
            <stop offset="40%" stopColor={color} />
            <stop offset="100%" stopColor="oklch(0.35 0.12 320)" />
          </linearGradient>
        </defs>

        <polygon
          points="50,5 90,110 10,110"
          fill={`url(#${gradId})`}
          stroke="oklch(0.2 0.1 280 / 0.4)"
          strokeWidth="1.5"
        />

        <circle cx="50" cy="40" r="4" fill={accent} />
        <circle cx="35" cy="65" r="3.5" fill="oklch(0.78 0.18 145)" />
        <circle cx="65" cy="70" r="3.5" fill="oklch(0.7 0.2 220)" />
        <circle cx="45" cy="90" r="3" fill="oklch(0.82 0.17 60)" />
        <circle cx="62" cy="95" r="3" fill="oklch(0.72 0.22 320)" />

        <ellipse cx="50" cy="112" rx="44" ry="6" fill={accent} opacity="0.9" />
      </svg>

      <div
        style={{
          position: "absolute",
          top: -size * 0.12,
          left: "50%",
          transform: "translateX(-50%)",
          width: size * 0.28,
          height: size * 0.28,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, oklch(0.97 0.05 90), ${accent})`,
          boxShadow: `0 0 14px ${accent.replace(")", " / 0.6)")}`,
          animation: "bday-hat-pop 1.4s ease-in-out infinite",
        }}
      />
    </div>
  );
}
