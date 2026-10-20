import React, { useEffect, useRef, useState } from 'react';
import { DetectionData, DetectionFrame } from '../../types';

interface DetectionOverlayProps {
  detectionData: DetectionData | null;
  currentTime: number;
  videoWidth?: number;
  videoHeight?: number;
  showMotionBoxes?: boolean;
  showPersonBoxes?: boolean;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  detectionData,
  currentTime,
  showMotionBoxes = true,
  showPersonBoxes = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeFrame, setActiveFrame] = useState<DetectionFrame | null>(null);

  useEffect(() => {
    if (!detectionData || !detectionData.frames || detectionData.frames.length === 0) {
      setActiveFrame(null);
      return;
    }

    // Find the closest detection frame for currentTime (within a 2.5s tolerance)
    let closest: DetectionFrame | null = null;
    let minDiff = 2.5;

    for (const frame of detectionData.frames) {
      const diff = Math.abs((frame.t_seconds || 0) - currentTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = frame;
      }
    }

    setActiveFrame(closest);
  }, [detectionData, currentTime]);

  if (!activeFrame) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden z-10 transition-opacity duration-150"
    >
      {/* Render Person Boxes */}
      {showPersonBoxes && (activeFrame.person_boxes || []).map((box, idx) => {
        const [x, y, w, h] = box;
        const leftPercent = `${Math.max(0, Math.min(100, x * 100))}%`;
        const topPercent = `${Math.max(0, Math.min(100, y * 100))}%`;
        const widthPercent = `${Math.min(100, w * 100)}%`;
        const heightPercent = `${Math.min(100, h * 100)}%`;

        return (
          <div
            key={`person_${idx}`}
            className="absolute border-2 border-emerald-400 bg-emerald-500/10 rounded-sm shadow-sm transition-all duration-100 animate-pulse"
            style={{
              left: leftPercent,
              top: topPercent,
              width: widthPercent,
              height: heightPercent
            }}
          >
            <span className="absolute -top-5 left-0 bg-emerald-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded shadow">
              PERSON ({Math.round(0.88 * 100)}%)
            </span>
          </div>
        );
      })}

      {/* Render Motion Region Boxes */}
      {showMotionBoxes && (activeFrame.motion_boxes || []).map((box, idx) => {
        const [x, y, w, h] = box;
        const leftPercent = `${Math.max(0, Math.min(100, x * 100))}%`;
        const topPercent = `${Math.max(0, Math.min(100, y * 100))}%`;
        const widthPercent = `${Math.min(100, w * 100)}%`;
        const heightPercent = `${Math.min(100, h * 100)}%`;

        return (
          <div
            key={`motion_${idx}`}
            className="absolute border border-dashed border-amber-400 bg-amber-400/10 rounded-sm"
            style={{
              left: leftPercent,
              top: topPercent,
              width: widthPercent,
              height: heightPercent
            }}
          >
            <span className="absolute -top-4 right-0 bg-amber-500 text-slate-950 text-[10px] font-semibold px-1 rounded shadow">
              MOTION
            </span>
          </div>
        );
      })}
    </div>
  );
};
