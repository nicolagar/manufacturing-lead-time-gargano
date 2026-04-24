import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';

export default memo(function ProcessNode({ data }: NodeProps) {
  return (
    <div className="rf-node">
      <div className="title">{data.label}</div>
      <div className="meta">
        <span>Start {data.es}</span>
        <span>Dur {data.duration}</span>
        <span>End {data.ef}</span>
      </div>
    </div>
  );
});
