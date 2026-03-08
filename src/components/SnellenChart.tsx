import React from "react";
import { motion } from "motion/react";

interface SnellenChartProps {
  distance: number; // in feet
  onLineSelect: (acuity: string) => void;
  selectedAcuity?: string;
}

const snellenLines = [
  { acuity: "20/200", letters: "E", size: 88 },
  { acuity: "20/100", letters: "F P", size: 44 },
  { acuity: "20/70", letters: "T O Z", size: 31 },
  { acuity: "20/50", letters: "L P E D", size: 22 },
  { acuity: "20/40", letters: "P E C F D", size: 18 },
  { acuity: "20/30", letters: "E D F C Z P", size: 13 },
  { acuity: "20/25", letters: "F E L O P Z D", size: 11 },
  { acuity: "20/20", letters: "D E F P O T E C", size: 9 },
];

export default function SnellenChart({ distance, onLineSelect, selectedAcuity }: SnellenChartProps) {
  // Simple scaling factor based on distance (standard is 20ft)
  const scale = distance / 20;

  return (
    <div className="bg-white p-8 rounded-xl shadow-inner flex flex-col items-center space-y-4 overflow-hidden">
      <div className="mb-4 text-slate-900 font-bold text-xs uppercase tracking-widest border-b border-slate-200 pb-2 w-full text-center">
        Standard Snellen Chart (Distance: {distance}ft)
      </div>
      <div className="flex flex-col items-center space-y-2 w-full">
        {snellenLines.map((line) => (
          <motion.button
            key={line.acuity}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onLineSelect(line.acuity)}
            className={`w-full py-2 px-4 rounded-lg transition-all flex items-center justify-between group ${
              selectedAcuity === line.acuity 
                ? "bg-cyan-50 border-2 border-cyan-500" 
                : "hover:bg-slate-50 border-2 border-transparent"
            }`}
          >
            <span className="text-[10px] font-mono text-slate-400 group-hover:text-cyan-600 font-bold">
              {line.acuity}
            </span>
            <span 
              className="text-slate-900 font-serif font-bold tracking-[0.5em] leading-none"
              style={{ fontSize: `${line.size * scale}px` }}
            >
              {line.letters}
            </span>
            <div className={`w-4 h-4 rounded-full border-2 ${
              selectedAcuity === line.acuity ? "bg-cyan-500 border-cyan-500" : "border-slate-200"
            }`} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
