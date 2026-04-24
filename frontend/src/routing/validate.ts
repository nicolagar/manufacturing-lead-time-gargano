import type { DiagramEdge, ProcessNode, Rect } from '../domain/model';

function pointInsideRect(p: { x: number; y: number }, r: Rect) {
  return p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;
}

export function validateNoForeignConnectorInsideNode(
  nodes: ProcessNode[],
  edges: DiagramEdge[],
): string[] {
  const nodeIndex = new Map(nodes.map((n) => [n.id, n]));
  const issues: string[] = [];

  for (const edge of edges) {
    for (const point of edge.points) {
      for (const node of nodes) {
        const sameOwner =
          node.id === edge.sourceNodeId ||
          node.id === edge.targetNodeId ||
          node.parentId === nodeIndex.get(edge.sourceNodeId)?.parentId;

        if (!sameOwner && pointInsideRect(point, node.rect)) {
          issues.push(`Edge ${edge.id} enters foreign node ${node.id}`);
        }
      }
    }
  }

  return issues;
}
