import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, type EdgeProps } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { useState } from "react";

export default function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [hovered, setHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEdges((eds) => eds.filter((edge) => edge.id !== id));
  };

  return (
    <>
      {/* Invisible wider path for easier hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: "pointer" }}
      />
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          opacity: hovered ? 1 : 0.7,
          strokeWidth: hovered ? 3 : 2,
          transition: "opacity 0.15s, stroke-width 0.15s",
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <button
            onClick={onDelete}
            className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive text-destructive-foreground shadow-md hover:scale-110 transition-transform"
            title="Apagar conexão"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
