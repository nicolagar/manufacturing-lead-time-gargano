import { useMemo, useState } from 'react';
import type { DiagramEdge, ProcessNode, ScopeGraph, UiDiagram } from './domain/model';
import { parseBackendResult, LayoutConstants } from './domain/parseBackend';
import { layoutScope } from './layout/elkLayout';
import { applyGenericNestedPertRefinement } from './layout/refineGenericNestedPert';
import { routeOrthogonalWithLibavoid } from './routing/libavoidRouter';
import { buildCorridors } from './routing/corridors';
import { validateNoForeignConnectorInsideNode } from './routing/validate';
import { useDiagramStore } from './state/useDiagramStore';
import { computeFromExcel, loadFixtureResult } from './utils/backend';
import { readWorkbookSummary } from './utils/xlsxLocal';
import DiagramCanvas from './components/DiagramCanvas';

function rectanglesOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export default function App() {
  const {
    uiDiagram,
    setUiDiagram,
    setBackendResult,
    status,
    setStatus,
    error,
    setError,
  } = useDiagramStore();

  const [sheetSummary, setSheetSummary] = useState<string>('');


async function buildDiagramFromResult(result: any, sourceLabel: string) {
  setStatus(`Building diagram from ${sourceLabel}…`);
  setError(null);

  const { processNodes, edgesByScope, nodesByScope } = parseBackendResult(result);

  const scopeGraphs: ScopeGraph[] = [];
  for (const [scopeId, scopeNodes] of nodesByScope) {
    const scopeEdges = edgesByScope.get(scopeId) ?? [];
    const { nodeRects } = await layoutScope({
      scopeId,
      nodes: scopeNodes,
      edges: scopeEdges,
    });

    for (const node of scopeNodes) {
      const rect = nodeRects.get(node.id);
      if (rect) node.rect = rect;
    }

    scopeGraphs.push({
      scopeId,
      nodes: scopeNodes,
      edges: scopeEdges,
      corridors: [],
    });
  }

  for (const node of processNodes.values()) {
    const childScope = nodesByScope.get(node.id);
    if (!childScope?.length) continue;

    const minX = Math.min(...childScope.map((n) => n.rect.x));
    const minY = Math.min(...childScope.map((n) => n.rect.y));
    const maxX = Math.max(...childScope.map((n) => n.rect.x + n.rect.w));
    const maxY = Math.max(...childScope.map((n) => n.rect.y + n.rect.h));

    node.rect = {
      x: node.rect.x,
      y: node.rect.y,
      w: Math.max(node.rect.w, maxX - minX + LayoutConstants.GROUP_PAD_X * 2),
      h: Math.max(node.rect.h + 140, maxY - minY + LayoutConstants.GROUP_HEADER_H + LayoutConstants.GROUP_PAD_Y * 2),
    };
  }

  const refinement = applyGenericNestedPertRefinement(result, processNodes, edgesByScope);

  for (const scope of scopeGraphs) {
    const obstacles = scope.nodes.map((n) => n.rect);

    const routed = await routeOrthogonalWithLibavoid({
      obstacles,
      edges: scope.edges.map((edge) => {
        const sourceNode = processNodes.get(edge.sourceNodeId)!;
        const targetNode = processNodes.get(edge.targetNodeId)!;

        const targetPort =
          refinement.preferredTargetPortByEdge.get(edge.id) ??
          (targetNode.pert.earliestStart < sourceNode.pert.earliestFinish ? 'NORTH' : 'WEST');

        return {
          id: edge.id,
          sourceRect: sourceNode.rect,
          targetRect: targetNode.rect,
          sourcePort: 'EAST',
          targetPort,
        };
      }),
    });

    for (const edge of scope.edges) {
      edge.points = routed.get(edge.id) ?? [];
    }

    scope.corridors = buildCorridors(
      Math.max(...scope.nodes.map((n) => n.depth), 0),
      scope.edges,
    );
  }

  const rfNodes: any[] = [];
  const rfEdges: any[] = [];
  const validationIssues: string[] = [];

  for (const node of processNodes.values()) {
    const hasChildren = (nodesByScope.get(node.id) ?? []).length > 0;

    rfNodes.push({
      id: node.id,
      type: hasChildren ? 'group' : 'process',
      position: { x: node.rect.x, y: node.rect.y },
      parentId: node.parentId ?? undefined,
      extent: node.parentId ? 'parent' : undefined,
      draggable: false,
      selectable: true,
      data: {
        label: node.label,
        width: node.rect.w,
        height: node.rect.h,
        duration: node.duration,
        es: node.pert.earliestStart,
        ef: node.pert.earliestFinish,
      },
      style: {
        width: node.rect.w,
        height: node.rect.h,
      },
    });
  }

  for (const scope of scopeGraphs) {
    validationIssues.push(...validateNoForeignConnectorInsideNode(scope.nodes, scope.edges));
    for (const edge of scope.edges) {
      rfEdges.push({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        type: 'straight',
        data: { points: edge.points },
        animated: false,
        style: {
          strokeWidth: 2,
        },
      });
    }
  }

  for (const scope of scopeGraphs) {
    const nodes = scope.nodes;
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        if (rectanglesOverlap(nodes[i].rect, nodes[j].rect)) {
          validationIssues.push(`Overlap detected between ${nodes[i].id} and ${nodes[j].id}`);
        }
      }
    }
  }

  const diagram: UiDiagram = {
    nodes: rfNodes,
    edges: rfEdges,
    scopeGraphs,
    validationIssues,
  };

  setUiDiagram(diagram);
  setStatus(validationIssues.length ? `Diagram built from ${sourceLabel} with validation issues` : `Diagram built from ${sourceLabel} successfully`);
  setError(validationIssues.length ? validationIssues.join('\n') : null);
}

  const formulaHelp = useMemo(
    () =>
      [
        'Fresh React front-end project using @xyflow/react + elkjs + libavoid-js.',
        'parentId is used for nested sub-flows / group nodes.',
        'ELK Layered does left-to-right scoped placement with fixed port order.',
        'Libavoid runs as final orthogonal obstacle-aware router.',
        'Data model, layout, and routing are kept in separate modules.',
      ].join('\n'),
    [],
  );

  async function handleFile(file: File) {
    setStatus('Uploading workbook and computing PERT model…');
    setError(null);

    try {
      const summary = await readWorkbookSummary(file);
      setSheetSummary(summary);

      const result = await computeFromExcel(file);
      setBackendResult(result);

      const { processNodes, edgesByScope, nodesByScope } = parseBackendResult(result);

      // 1) layout each scope with ELK
      const scopeGraphs: ScopeGraph[] = [];
      for (const [scopeId, scopeNodes] of nodesByScope) {
        const scopeEdges = edgesByScope.get(scopeId) ?? [];
        const { nodeRects } = await layoutScope({
          scopeId,
          nodes: scopeNodes,
          edges: scopeEdges,
        });

        for (const node of scopeNodes) {
          const rect = nodeRects.get(node.id);
          if (rect) node.rect = rect;
        }

        scopeGraphs.push({
          scopeId,
          nodes: scopeNodes,
          edges: scopeEdges,
          corridors: [],
        });
      }

      // 2) size parent group nodes from children
      for (const node of processNodes.values()) {
        const childScope = nodesByScope.get(node.id);
        if (!childScope?.length) continue;

        const minX = Math.min(...childScope.map((n) => n.rect.x));
        const minY = Math.min(...childScope.map((n) => n.rect.y));
        const maxX = Math.max(...childScope.map((n) => n.rect.x + n.rect.w));
        const maxY = Math.max(...childScope.map((n) => n.rect.y + n.rect.h));

        node.rect = {
          x: node.rect.x,
          y: node.rect.y,
          w: Math.max(node.rect.w, maxX - minX + LayoutConstants.GROUP_PAD_X * 2),
          h: Math.max(node.rect.h + 140, maxY - minY + LayoutConstants.GROUP_HEADER_H + LayoutConstants.GROUP_PAD_Y * 2),
        };
      }

      // 3) route each scope with libavoid against local obstacles
      for (const scope of scopeGraphs) {
        const obstacles = scope.nodes.map((n) => n.rect);

        const routed = await routeOrthogonalWithLibavoid({
          obstacles,
          edges: scope.edges.map((edge) => {
            const sourceNode = processNodes.get(edge.sourceNodeId)!;
            const targetNode = processNodes.get(edge.targetNodeId)!;

            const targetPort =
              targetNode.pert.earliestStart < sourceNode.pert.earliestFinish
                ? 'NORTH'
                : 'WEST';

            return {
              id: edge.id,
              sourceRect: sourceNode.rect,
              targetRect: targetNode.rect,
              sourcePort: 'EAST',
              targetPort,
            };
          }),
        });

        for (const edge of scope.edges) {
          edge.points = routed.get(edge.id) ?? [];
        }

        scope.corridors = buildCorridors(
          Math.max(...scope.nodes.map((n) => n.depth), 0),
          scope.edges,
        );
      }

      // 4) build React Flow nodes/edges
      const rfNodes: any[] = [];
      const rfEdges: any[] = [];
      const validationIssues: string[] = [];

      for (const node of processNodes.values()) {
        const hasChildren = (nodesByScope.get(node.id) ?? []).length > 0;

        rfNodes.push({
          id: node.id,
          type: hasChildren ? 'group' : 'process',
          position: { x: node.rect.x, y: node.rect.y },
          parentId: node.parentId ?? undefined,
          extent: node.parentId ? 'parent' : undefined,
          draggable: false,
          selectable: true,
          data: {
            label: node.label,
            width: node.rect.w,
            height: node.rect.h,
            duration: node.duration,
            es: node.pert.earliestStart,
            ef: node.pert.earliestFinish,
            critical: (result.dominant_path ?? []).includes(node.id),
          },
          style: {
            width: node.rect.w,
            height: node.rect.h,
          },
        });
      }

      for (const scope of scopeGraphs) {
        validationIssues.push(...validateNoForeignConnectorInsideNode(scope.nodes, scope.edges));
        for (const edge of scope.edges) {
          rfEdges.push({
            id: edge.id,
            source: edge.sourceNodeId,
            target: edge.targetNodeId,
            type: 'orthogonal',
            data: { points: edge.points },
            animated: false,
            style: {
              strokeWidth: 2,
            },
          });
        }
      }

      // prevent overlap for nodes with no preds / no succs inside same scope
      for (const scope of scopeGraphs) {
        const nodes = scope.nodes;
        for (let i = 0; i < nodes.length; i += 1) {
          for (let j = i + 1; j < nodes.length; j += 1) {
            if (rectanglesOverlap(nodes[i].rect, nodes[j].rect)) {
              validationIssues.push(`Overlap detected between ${nodes[i].id} and ${nodes[j].id}`);
            }
          }
        }
      }

      const diagram: UiDiagram = {
        nodes: rfNodes,
        edges: rfEdges,
        scopeGraphs,
        validationIssues,
      };

      setUiDiagram(diagram);
      setStatus(validationIssues.length ? 'Diagram built with validation issues' : 'Diagram built successfully');
      setError(validationIssues.length ? validationIssues.join('\n') : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('Failed');
    }
  }

  return (
    <div className="app-shell">
      <div className="sidebar">
        <div className="panel">
          <h1>Nested PERT Diagram</h1>
          <div className={`status ${error ? 'error' : ''}`}>{error || status}</div>

          <label>
            <strong>Upload workbook</strong>
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          <div className="small">
            Workbook sheets: {sheetSummary || '—'}
          </div>

          <button
            className="secondary"
            onClick={() => {
              void (async () => {
                try {
                  setStatus('Loading included PERT_v3_03 fixture…');
                  setError(null);
                  const result = await loadFixtureResult();
                  setBackendResult(result);
                  setSheetSummary('PERT (fixture)');
                  await buildDiagramFromResult(result, 'PERT_v3_03 fixture');
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                  setStatus('Failed');
                }
              })();
            }}
          >
            Load included PERT_v3_03 fixture
          </button>

          <div className="legend">
            <div className="legend-item"><span className="swatch" style={{ background: '#fff' }} /> Process node</div>
            <div className="legend-item"><span className="swatch" style={{ background: 'rgba(148,163,184,0.08)' }} /> Nested scope / group</div>
          </div>

          <div className="small">
            <strong>Architecture notes</strong>
          </div>
          <div className="code">{formulaHelp}</div>

          {uiDiagram?.validationIssues?.length ? (
            <>
              <div className="small"><strong>Validation issues</strong></div>
              <div className="code">{uiDiagram.validationIssues.join('\n')}</div>
            </>
          ) : null}
        </div>
      </div>

      <div className="canvas">
        <DiagramCanvas diagram={uiDiagram} />
      </div>
    </div>
  );
}
