import ELK from 'elkjs/lib/elk.bundled.js';
import type { DiagramEdge, ProcessNode, Rect, ScopeGraph } from '../domain/model';
import { LayoutConstants } from '../domain/parseBackend';

const elk = new ELK();

const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.layered.mergeHierarchyCrossingEdges': 'true',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  'elk.layered.spacing.nodeNodeBetweenLayers': '120',
  'elk.spacing.nodeNode': '60',
  'elk.layered.spacing.edgeNodeBetweenLayers': '32',
  'elk.spacing.edgeNode': '24',
};

type LayoutInput = {
  scopeId: string;
  nodes: ProcessNode[];
  edges: DiagramEdge[];
};

type LayoutOutput = {
  nodeRects: Map<string, Rect>;
  edgePoints: Map<string, { x: number; y: number }[]>;
};

export async function layoutScope(input: LayoutInput): Promise<LayoutOutput> {
  const graph = {
    id: input.scopeId,
    layoutOptions: elkOptions,
    children: input.nodes.map((node) => ({
      id: node.id,
      width: node.rect.w,
      height: node.rect.h,
      ports: node.ports.map((port) => ({
        id: `${node.id}:${port.id}`,
        properties: {
          'org.eclipse.elk.port.side': port.side,
        },
      })),
      layoutOptions: {
        'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
      },
    })),
    edges: input.edges.map((edge) => ({
      id: edge.id,
      sources: [`${edge.sourceNodeId}:${edge.sourcePortId}`],
      targets: [`${edge.targetNodeId}:${edge.targetPortId}`],
    })),
  };

  const result = await elk.layout(graph as any);

  const nodeRects = new Map<string, Rect>();
  const edgePoints = new Map<string, { x: number; y: number }[]>();

  for (const child of result.children ?? []) {
    nodeRects.set(child.id, {
      x: child.x ?? 0,
      y: child.y ?? 0,
      w: child.width ?? LayoutConstants.NODE_W,
      h: child.height ?? LayoutConstants.NODE_H,
    });
  }

  for (const edge of result.edges ?? []) {
    const section = edge.sections?.[0];
    const points: { x: number; y: number }[] = [];
    if (section?.startPoint) points.push(section.startPoint);
    for (const bp of section?.bendPoints ?? []) points.push(bp);
    if (section?.endPoint) points.push(section.endPoint);
    edgePoints.set(edge.id, points);
  }

  return { nodeRects, edgePoints };
}
