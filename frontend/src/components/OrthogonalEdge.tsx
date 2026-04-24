import { BaseEdge, type EdgeProps } from '@xyflow/react';

export default function OrthogonalEdge(props: EdgeProps) {
  const pts = (props.data as any)?.points as Array<{ x: number; y: number }> | undefined;
  const fallback = `M ${props.sourceX} ${props.sourceY} L ${props.targetX} ${props.targetY}`;
  const d = pts && pts.length
    ? pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : fallback;

  return (
    <BaseEdge
      id={props.id}
      path={d}
      style={{
        stroke: props.style?.stroke ?? '#6b7c93',
        strokeWidth: props.style?.strokeWidth ?? 2,
      }}
      markerEnd={props.markerEnd}
    />
  );
}
