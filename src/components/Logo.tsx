import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  hideText?: boolean;
}

export function Logo({ className, size = "md", hideText = false }: LogoProps) {
  const sizeClasses = {
    sm: {
      box: "w-9 h-9",
      text: "text-base mt-0.5",
    },
    md: {
      box: "w-16 h-16",
      text: "text-xl mt-1.5",
    },
    lg: {
      box: "w-24 h-24",
      text: "text-2xl mt-2.5",
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className={cn("relative flex items-center justify-center", currentSize.box)}>
        {/* Vector SVG representing PayClickFocus Logo */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-sm select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Purple Royal Gradient */}
            <linearGradient id="phoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7e22ce" /> {/* purple-700 */}
              <stop offset="50%" stopColor="#9333ea" /> {/* purple-600 */}
              <stop offset="100%" stopColor="#a855f7" /> {/* purple-500 */}
            </linearGradient>

            {/* Gold/Orange Wave & Naira Gradient */}
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#facc15" /> {/* yellow-400 */}
              <stop offset="60%" stopColor="#f97316" /> {/* orange-500 */}
              <stop offset="100%" stopColor="#ea580c" /> {/* orange-600 */}
            </linearGradient>
            
            {/* Glow Filter */}
            <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#f97316" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* 1. Phone Body (slightly rotated matching the logo) */}
          <g transform="rotate(-6, 50, 55)">
            {/* Phone Outer Chassis */}
            <rect
              x="26"
              y="28"
              width="36"
              height="58"
              rx="6"
              fill="url(#phoneGrad)"
              stroke="#ffffff"
              strokeWidth="2"
            />
            {/* Phone Screen Inner Border */}
            <rect
              x="29"
              y="32"
              width="30"
              height="48"
              rx="3"
              fill="#0f172a" /* Dark screen */
            />
            
            {/* Ear Speaker & Home Indicator line */}
            <line x1="41" y1="30" x2="47" y2="30" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <line x1="40" y1="83" x2="48" y2="83" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

            {/* 2. Naira Symbol ₦ Inside Screen */}
            <text
              x="44"
              y="59"
              fill="url(#goldGrad)"
              fontSize="19"
              fontFamily="Inter, system-ui, sans-serif"
              fontWeight="900"
              textAnchor="middle"
            >
              ₦
            </text>
          </g>

          {/* 3. Wifi Radiating Waves in Top Right (yellow/orange) */}
          <g transform="translate(14, 5)" filter="url(#glow)">
            {/* Small Wave */}
            <path
              d="M38 18 A 12 12 0 0 1 54 34"
              fill="none"
              stroke="url(#goldGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Medium Wave */}
            <path
              d="M38 10 A 20 20 0 0 1 64 36"
              fill="none"
              stroke="url(#goldGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Large Wave */}
            <path
              d="M38 2 A 28 28 0 0 1 74 38"
              fill="none"
              stroke="url(#goldGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>

          {/* 4. White Hand Clicking Phone overlay bottom-right */}
          <g transform="translate(48, 52)">
            {/* Click Ripple Indicator lines */}
            <path d="M12 -3 L15 -6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
            <path d="M18 3 L22 3" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
            <path d="M14 9 L17 12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />

            {/* Hand Silhouette */}
            {/* A pointing finger hand: wrist, knuckles, extended index finger pointing top-left */}
            <path
              d="M 12 16 
                 C 14 11, 10 7, 7 4 
                 C 5 2, 3 4, 5 6 
                 L 8 10 
                 C 5 9, 3 11, 5 13 
                 C 4 13, 2 15, 4 17 
                 C 2 17, 1 19, 3 21 
                 C 4 23, 7 24, 11 23 
                 C 14 22, 17 21, 15 17 
                 Z"
              fill="#ffffff"
              stroke="#9333ea"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="rotate(-25, 10, 15)"
            />
          </g>
        </svg>
      </div>

      {!hideText && (
        <div className={cn("font-bold tracking-tight flex items-center justify-center", currentSize.text)}>
          <span className="text-slate-900 dark:text-white font-extrabold">PayClick</span>
          <span className="text-[#f97316] font-black italic ml-0.5">Focus</span>
        </div>
      )}
    </div>
  );
}
