import { memo } from 'react';
import type { Node, NodeProps } from '@xyflow/react';

type ProcessNodeData = {
  label: string;
  es: number | string;
  ef: number | string;
  duration: number | string;
};

type ProcessFlowNode = Node<ProcessNodeData, 'process'>;

export default memo(function ProcessNode({ data }: NodeProps<ProcessFlowNode>) {
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
