import type { BackendResult, DiagramEdge, ProcessNode } from '../domain/model';

type RefinementOutput = {
  preferredTargetPortByEdge: Map<string, 'WEST' | 'NORTH' | 'SOUTH'>;
};

function scopeOf(node: ProcessNode): string {
  return node.parentId ?? 'root';
}

function buildScopeEdges(edgesByScope: Map<string, DiagramEdge[]>, scopeId: string) {
  return edgesByScope.get(scopeId) ?? [];
}

function buildChildren(processNodes: Map<string, ProcessNode>) {
  const byParent = new Map<string, ProcessNode[]>();
  for (const node of processNodes.values()) {
    const key = node.parentId ?? 'root';
    const arr = byParent.get(key) ?? [];
    arr.push(node);
    byParent.set(key, arr);
  }
  return byParent;
}

function descendantsOf(nodeId: string, childrenByParent: Map<string, ProcessNode[]>): Set<string> {
  const out = new Set<string>();
  const stack = [...(childrenByParent.get(nodeId) ?? [])];
  while (stack.length) {
    const node = stack.pop()!;
    if (out.has(node.id)) continue;
    out.add(node.id);
    stack.push(...(childrenByParent.get(node.id) ?? []));
  }
  return out;
}

export function applyGenericNestedPertRefinement(
  result: BackendResult,
  processNodes: Map<string, ProcessNode>,
  edgesByScope: Map<string, DiagramEdge[]>,
): RefinementOutput {
  const preferredTargetPortByEdge = new Map<string, 'WEST' | 'NORTH' | 'SOUTH'>();
  const childrenByParent = buildChildren(processNodes);
  const dominant = new Set(result.dominant_path ?? []);

  // Generic refinement 1:
  // Keep dominant top-level continuation in the upper band for nodes with descendants.
  for (const node of processNodes.values()) {
    const descendants = descendantsOf(node.id, childrenByParent);
    if (!descendants.size || node.parentId !== null || !dominant.has(node.id)) continue;

    const scopeEdges = buildScopeEdges(edgesByScope, 'root');
    const successors = scopeEdges
      .filter((e) => e.sourceNodeId === node.id)
      .map((e) => processNodes.get(e.targetNodeId))
      .filter(Boolean) as ProcessNode[];

    // Direct dominant successor stays on the upper band.
    for (const succ of successors) {
      if (dominant.has(succ.id)) {
        succ.rect.y = node.rect.y;
      }
    }
  }

  // Recompute group-like parent boxes from descendants and reserve a corridor band.
  for (const node of processNodes.values()) {
    const children = childrenByParent.get(node.id) ?? [];
    if (!children.length) continue;

    const descIds = Array.from(descendantsOf(node.id, childrenByParent));
    const desc = descIds.map((id) => processNodes.get(id)!).filter(Boolean);
    const minX = Math.min(node.rect.x, ...desc.map((n) => n.rect.x));
    const maxX = Math.max(node.rect.x + node.rect.w, ...desc.map((n) => n.rect.x + n.rect.w));
    const maxY = Math.max(node.rect.y + node.rect.h, ...desc.map((n) => n.rect.y + n.rect.h));

    node.rect.x = minX - 12;
    node.rect.y = node.rect.y - 10;
    node.rect.w = (maxX - minX) + 24;
    node.rect.h = Math.max((maxY - node.rect.y) + 12, node.rect.h + 90);
  }

  // Generic refinement 2:
  // For a top-level merge where a dominant branch from a compound node meets a lower branch,
  // move the lower branch nodes below the compound container.
  const rootEdges = buildScopeEdges(edgesByScope, 'root');
  const incoming = new Map<string, string[]>();
  for (const edge of rootEdges) {
    const arr = incoming.get(edge.targetNodeId) ?? [];
    arr.push(edge.sourceNodeId);
    incoming.set(edge.targetNodeId, arr);
  }

  for (const [targetId, preds] of incoming.entries()) {
    if (preds.length < 2) continue;

    const dominantPred = preds.find((id) => dominant.has(id) && (childrenByParent.get(id)?.length ?? 0) > 0);
    if (!dominantPred) continue;

    const dominantNode = processNodes.get(dominantPred);
    if (!dominantNode) continue;

    const containerBottom = dominantNode.rect.y + dominantNode.rect.h;
    const lowerPreds = preds.filter((id) => id !== dominantPred);

    for (const predId of lowerPreds) {
      const predNode = processNodes.get(predId);
      if (!predNode) continue;

      predNode.rect.y = Math.max(predNode.rect.y, containerBottom + 120);
      preferredTargetPortByEdge.set(`${predId}__${targetId}`, 'SOUTH');
    }

    preferredTargetPortByEdge.set(`${dominantPred}__${targetId}`, 'WEST');
  }

  // Generic refinement 3:
  // Within nested scopes, if a leaf sibling sits next to a merge/longer branch sibling on the same level,
  // push the leaf successor one extra column to the right.
  for (const [scopeId, edges] of edgesByScope) {
    if (scopeId === 'root') continue;

    const bySource = new Map<string, string[]>();
    const incomingCount = new Map<string, number>();
    const outgoingCount = new Map<string, number>();

    for (const edge of edges) {
      const s = bySource.get(edge.sourceNodeId) ?? [];
      s.push(edge.targetNodeId);
      bySource.set(edge.sourceNodeId, s);
      incomingCount.set(edge.targetNodeId, (incomingCount.get(edge.targetNodeId) ?? 0) + 1);
      outgoingCount.set(edge.sourceNodeId, (outgoingCount.get(edge.sourceNodeId) ?? 0) + 1);
    }

    for (const [sourceId, targets] of bySource) {
      if (targets.length < 2) continue;

      const mergeLike = targets.filter((id) => (incomingCount.get(id) ?? 0) > 1 || (childrenByParent.get(id)?.length ?? 0) > 0);
      const leafLike = targets.filter((id) => (outgoingCount.get(id) ?? 0) === 0);

      if (!mergeLike.length || !leafLike.length) continue;

      const rightmostMerge = Math.max(...mergeLike.map((id) => {
        const n = processNodes.get(id)!;
        return n.rect.x;
      }));

      for (const leafId of leafLike) {
        const leaf = processNodes.get(leafId);
        if (!leaf) continue;
        leaf.rect.x = Math.max(leaf.rect.x, rightmostMerge + 320);
      }
    }
  }

  // Generic refinement 4:
  // Keep non-descendant top-level nodes out of a compound node's occupied region.
  const topLevelNodes = Array.from(processNodes.values()).filter((n) => n.parentId === null);
  for (const compound of topLevelNodes.filter((n) => (childrenByParent.get(n.id)?.length ?? 0) > 0)) {
    const desc = descendantsOf(compound.id, childrenByParent);
    const cx0 = compound.rect.x;
    const cy0 = compound.rect.y;
    const cx1 = compound.rect.x + compound.rect.w;
    const cy1 = compound.rect.y + compound.rect.h;

    for (const node of topLevelNodes) {
      if (node.id === compound.id || desc.has(node.id)) continue;

      const nx0 = node.rect.x;
      const ny0 = node.rect.y;
      const nx1 = node.rect.x + node.rect.w;
      const ny1 = node.rect.y + node.rect.h;

      const overlaps = nx0 < cx1 && nx1 > cx0 && ny0 < cy1 && ny1 > cy0;
      if (overlaps) {
        node.rect.y = cy1 + 120;
      }
    }
  }

  return { preferredTargetPortByEdge };
}

// anti-alignment safety rule for branch siblings
