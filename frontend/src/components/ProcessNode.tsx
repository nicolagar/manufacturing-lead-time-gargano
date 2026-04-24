import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';

type ProcessNodeData = {
  label: string;
  es: number | string;
  ef: number | string;
  duration: number | string;
};

export default memo(function ProcessNode({ data }: NodeProps<{ label: string; es: number | string; ef: number | string; duration: number | string }>) {
  const d = data as ProcessNodeData;

  return (
    <div className="rf-node">
      <div className="title">{d.label}</div>
      <div className="meta">
        <span>Start {d.es}</span>
        <span>Dur {d.duration}</span>
        <span>End {d.ef}</span>
      </div>
    </div>
  );
});
