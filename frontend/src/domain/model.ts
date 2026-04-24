export type Rect = { x: number; y: number; w: number; h: number };

export type PortSide = 'WEST' | 'EAST' | 'NORTH' | 'SOUTH';

export type ProcessNode = {
  id: string;
  parentId: string | null;
  depth: number;
  label: string;
  duration: number;
  expanded: boolean;
  rect: Rect;
  ports: Port[];
  pert: {
    earliestStart: number;
    earliestFinish: number;
    latestStart?: number;
    latestFinish?: number;
    slack?: number;
    topoLevel: number;
  };
};

export type Port = {
  id: string;
  side: PortSide;
  order: number;
  offset?: number;
};

export type DiagramEdge = {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  ownerScopeId: string;
  points: { x: number; y: number }[];
};

export type Corridor = {
  edgeId: string;
  scopeDepth: number;
  inflatedRects: Rect[];
};

export type ScopeGraph = {
  scopeId: string;
  nodes: ProcessNode[];
  edges: DiagramEdge[];
  corridors: Corridor[];
};

export type ComputeScheduleRecord = {
  process: string;
  duration: number;
  earliest_start: number;
  earliest_finish: number;
  latest_start?: number;
  latest_finish?: number;
  total_float?: number;
  critical?: boolean;
  predecessors?: string[];
  successors?: string[];
  refines?: string;
  depth?: number;
};

export type BackendResult = {
  lead_time: number;
  schedule: ComputeScheduleRecord[];
  critical_edges?: { from: string; to: string }[];
  dominant_path?: string[];
  graph: {
    nodes: { id: string; duration: number; depth?: number; refines?: string }[];
    edges: { from: string; to: string }[];
  };
};

export type UiDiagram = {
  nodes: any[];
  edges: any[];
  scopeGraphs: ScopeGraph[];
  validationIssues: string[];
};
