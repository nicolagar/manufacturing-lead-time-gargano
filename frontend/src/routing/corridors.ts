import type { Corridor, DiagramEdge, Rect } from '../domain/model';

export function corridorRectsForEdge(edge: DiagramEdge, clearance = 16): Rect[] {
  const rects: Rect[] = [];
  for (let i = 0; i < edge.points.length - 1; i += 1) {
    const a = edge.points[i];
    const b = edge.points[i + 1];
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.max(1, Math.abs(a.x - b.x));
    const h = Math.max(1, Math.abs(a.y - b.y));
    rects.push({
      x: x - clearance,
      y: y - clearance,
      w: w + clearance * 2,
      h: h + clearance * 2,
    });
  }
  return rects;
}

export function buildCorridors(scopeDepth: number, edges: DiagramEdge[]): Corridor[] {
  return edges.map((edge) => ({
    edgeId: edge.id,
    scopeDepth,
    inflatedRects: corridorRectsForEdge(edge),
  }));
}
