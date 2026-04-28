import { useState, useEffect, useCallback } from "react";
import { Clock, AlertTriangle } from "lucide-react";

const MEETING_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_THRESHOLD_MS = 5 * 60 * 1000; // show warning at 5 min remaining

interface Props {
  /** Timestamp (ms) when the meeting connection started */
  startedAt: number;
  onTimeUp: () => void;
}

const formatTime = (ms: number) => {
  if (ms <= 0) return "00:00";
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const MeetingTimer = ({ startedAt, onTimeUp }: Props) => {
  const [remaining, setRemaining] = useState(MEETING_DURATION_MS);
  const isWarning = remaining <= WARNING_THRESHOLD_MS;
  const isCritical = remaining <= 60_000; // last 1 minute

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const left = Math.max(0, MEETING_DURATION_MS - elapsed);
      setRemaining(left);
      if (left <= 0) {
        onTimeUp();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, onTimeUp]);

  // Only show the timer when in warning zone (≤5 min)
  if (!isWarning) {
    // Show a subtle elapsed timer in the header
    return (
      <div className="flex items-center gap-1.5 text-white/50 text-xs font-mono">
        <Clock className="w-3 h-3" />
        <span>{formatTime(remaining)}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono transition-all ${
        isCritical
          ? "bg-red-500/30 text-red-300 animate-pulse"
          : "bg-amber-500/20 text-amber-300"
      }`}
    >
      <AlertTriangle className="w-3.5 h-3.5" />
      <span>{formatTime(remaining)}</span>
    </div>
  );
};

export default MeetingTimer;
