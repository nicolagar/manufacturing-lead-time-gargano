import { Background, Controls, MiniMap, ReactFlow } from '@xyflow/react';
import OrthogonalEdge from './OrthogonalEdge';
import type { UiDiagram } from '../domain/model';
import ProcessNode from './ProcessNode';
import GroupNode from './GroupNode';

const nodeTypes = {
  process: ProcessNode,
  group: GroupNode,
};

const edgeTypes = {
  orthogonal: OrthogonalEdge,
};

export default function DiagramCanvas({ diagram }: { diagram: UiDiagram | null }) {
  return (
    <ReactFlow
      fitView
      nodes={diagram?.nodes ?? []}
      edges={diagram?.edges ?? []}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{ zIndex: 1 }}
      panOnScroll
      panOnDrag
      zoomOnScroll
    >
      <Background gap={24} size={1} />
      <Controls />
      <MiniMap pannable zoomable />
    </ReactFlow>
  );
}
