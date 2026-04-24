import { memo } from 'react';
import type { Node, NodeProps } from '@xyflow/react';

type GroupNodeData = {
  label: string;
  width: number;
  height: number;
  critical?: boolean;
  es: number | string;
  ef: number | string;
  duration: number | string;
};

type GroupFlowNode = Node<GroupNodeData, 'group'>;

export default memo(function GroupNode({ data, selected }: NodeProps<GroupFlowNode>) {
  const critical = Boolean(data.critical);

  return (
    <div
      className={`group-node ${critical ? 'critical' : ''}`}
      style={{
        width: data.width,
        height: data.height,
        borderColor: critical ? '#dc2626' : '#cbd5e1',
        boxShadow: selected ? '0 0 0 2px rgba(37,99,235,0.25)' : 'none',
      }}
    >
      <div className="header">
        <div>{data.label}</div>
        <div className="meta">
          <span>Start {data.es}</span>
          <span>Dur {data.duration}</span>
          <span>End {data.ef}</span>
        </div>
      </div>
    </div>
  );
});
