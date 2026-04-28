import { useState } from "react";
import {
  useLocalParticipant,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { GripVertical, Minimize2, Maximize2 } from "lucide-react";

/**
 * Floating thumbnail grid that shows other participants' cameras
 * when the local user is sharing their screen.
 */
const FloatingParticipants = () => {
  const { localParticipant } = useLocalParticipant();
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 72 });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Check if local participant is sharing screen
  const isScreenSharing = localParticipant.isScreenShareEnabled;

  // Get all camera tracks (excluding screen share tracks)
  const cameraTracks = useTracks([Track.Source.Camera], {
    onlySubscribed: true,
  });

  // Filter to only remote participants' cameras
  const remoteCameraTracks = cameraTracks.filter(
    (t) => t.participant.identity !== localParticipant.identity
  );

  if (!isScreenSharing || remoteCameraTracks.length === 0) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => setDragging(false);

  const cols = remoteCameraTracks.length === 1 ? 1 : 2;
  const trackWidth = minimized ? 120 : 160;
  const containerWidth = cols * trackWidth + (cols - 1) * 8 + 16;

  return (
    <div
      className="fixed z-50 select-none"
      style={{ left: position.x, top: position.y }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="rounded-xl border border-white/20 bg-black/80 backdrop-blur-md shadow-2xl overflow-hidden"
        style={{ width: containerWidth }}
      >
        {/* Drag handle + controls */}
        <div
          className="flex items-center justify-between px-2 py-1.5 cursor-grab active:cursor-grabbing bg-white/5"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-1 text-white/50">
            <GripVertical className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium">
              Participantes ({remoteCameraTracks.length})
            </span>
          </div>
          <button
            onClick={() => setMinimized(!minimized)}
            className="p-0.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            {minimized ? (
              <Maximize2 className="w-3 h-3" />
            ) : (
              <Minimize2 className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Video grid */}
        {!minimized && (
          <div
            className="p-2 gap-2"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
            }}
          >
            {remoteCameraTracks.slice(0, 4).map((track) => (
              <div
                key={track.participant.identity}
                className="relative rounded-lg overflow-hidden bg-white/5 aspect-video"
              >
                <VideoTrack
                  trackRef={track}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
                  <span className="text-[9px] text-white/90 font-medium truncate block">
                    {track.participant.name || track.participant.identity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingParticipants;
