import type { BackendResult, DiagramEdge, Port, ProcessNode, ScopeGraph } from './model';

const NODE_W = 170;
const NODE_H = 76;
const GROUP_HEADER_H = 32;
const GROUP_PAD_X = 18;
const GROUP_PAD_Y = 18;

function makePorts(): Port[] {
  return [
    { id: 'west-0', side: 'WEST', order: 0 },
    { id: 'east-0', side: 'EAST', order: 0 },
    { id: 'north-0', side: 'NORTH', order: 0 },
    { id: 'south-0', side: 'SOUTH', order: 0 },
  ];
}

export function parseBackendResult(result: BackendResult): {
  processNodes: Map<string, ProcessNode>;
  edgesByScope: Map<string, DiagramEdge[]>;
  nodesByScope: Map<string, ProcessNode[]>;
} {
  const scheduleIndex = new Map(result.schedule.map((r) => [r.process, r]));
  const processNodes = new Map<string, ProcessNode>();

  for (const record of result.schedule) {
    const parentId = record.refines?.trim() ? record.refines!.trim() : null;
    const depth = record.depth ?? (parentId ? parentId.split('_').length : 0);
    processNodes.set(record.process, {
      id: record.process,
      parentId,
      depth,
      label: record.process,
      duration: record.duration,
      expanded: true,
      rect: { x: 0, y: 0, w: NODE_W, h: NODE_H },
      ports: makePorts(),
      pert: {
        earliestStart: record.earliest_start,
        earliestFinish: record.earliest_finish,
        latestStart: record.latest_start,
        latestFinish: record.latest_finish,
        slack: record.total_float,
        topoLevel: 0,
      },
    });
  }

  const nodesByScope = new Map<string, ProcessNode[]>();
  for (const node of processNodes.values()) {
    const scope = node.parentId ?? 'root';
    const arr = nodesByScope.get(scope) ?? [];
    arr.push(node);
    nodesByScope.set(scope, arr);
  }

  const edgesByScope = new Map<string, DiagramEdge[]>();
  for (const edge of result.graph.edges) {
    const source = processNodes.get(edge.from);
    const target = processNodes.get(edge.to);
    if (!source || !target) continue;
    const ownerScopeId = source.parentId ?? 'root';
    if ((target.parentId ?? 'root') !== ownerScopeId) continue;

    const arr = edgesByScope.get(ownerScopeId) ?? [];
    arr.push({
      id: `${edge.from}__${edge.to}`,
      sourceNodeId: edge.from,
      sourcePortId: 'east-0',
      targetNodeId: edge.to,
      targetPortId: 'west-0',
      ownerScopeId,
      points: [],
    });
    edgesByScope.set(ownerScopeId, arr);
  }

  for (const [scope, nodes] of nodesByScope) {
    nodes.sort((a, b) => {
      const sa = scheduleIndex.get(a.id)!;
      const sb = scheduleIndex.get(b.id)!;
      return sa.earliest_start - sb.earliest_start || a.id.localeCompare(b.id);
    });
  }

  return { processNodes, edgesByScope, nodesByScope };
}

export const LayoutConstants = {
  NODE_W,
  NODE_H,
  GROUP_HEADER_H,
  GROUP_PAD_X,
  GROUP_PAD_Y,
};
