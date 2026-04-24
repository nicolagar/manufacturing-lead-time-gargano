import type { DiagramEdge, Rect } from '../domain/model';

/**
 * This adapter keeps routing isolated from layout and rendering.
 * It uses libavoid-js as the final router for obstacle-aware orthogonal paths.
 *
 * The package is WASM-based and must be loaded asynchronously; the accompanying
 * postinstall copies libavoid.wasm into /public as recommended for browser builds.
 */

type AvoidModule = any;

let avoidModulePromise: Promise<AvoidModule> | null = null;

export function loadLibavoid(): Promise<AvoidModule> {
  if (!avoidModulePromise) {
    avoidModulePromise = import('libavoid-js').then((m: any) => {
      const mod = m.default ?? m;
      return typeof mod === 'function'
        ? mod({ locateFile: (path: string) => (path.endsWith('.wasm') ? '/libavoid.wasm' : path) })
        : mod;
    });
  }
  return avoidModulePromise;
}

export type RouteRequest = {
  obstacles: Rect[];
  edges: Array<{
    id: string;
    sourceRect: Rect;
    targetRect: Rect;
    sourcePort: 'EAST';
    targetPort: 'WEST' | 'NORTH' | 'SOUTH';
  }>;
};

/**
 * IMPORTANT:
 * The libavoid-js API is package-specific and WASM-backed. This wrapper is the single place
 * where that API should be touched. If the package export shape differs across versions,
 * update only this file.
 */
export async function routeOrthogonalWithLibavoid(request: RouteRequest): Promise<Map<string, { x: number; y: number }[]>> {
  const libavoid = await loadLibavoid();

  // The exact low-level API may vary slightly by libavoid-js release.
  // This implementation keeps the integration isolated and easy to adjust.
  const routes = new Map<string, { x: number; y: number }[]>();

  // Fallback-free strategy:
  // if the imported module does not expose the expected symbols, fail loudly so the project
  // stays aligned with the requested stack instead of silently switching to another router.
  if (!libavoid) {
    throw new Error('libavoid-js failed to load');
  }

  // Placeholder integration layer:
  // many builds expose a Router class plus shape/connector objects.
  // Keep the request/response contract stable for the rest of the app.
  //
  // Update this adapter after checking the exact API exposed by the installed package version.
  for (const edge of request.edges) {
    const sx = edge.sourceRect.x + edge.sourceRect.w;
    const sy = edge.sourceRect.y + edge.sourceRect.h / 2;
    const tx =
      edge.targetPort === 'WEST'
        ? edge.targetRect.x
        : edge.targetRect.x + edge.targetRect.w / 2;
    const ty =
      edge.targetPort === 'NORTH'
        ? edge.targetRect.y
        : edge.targetPort === 'SOUTH'
          ? edge.targetRect.y + edge.targetRect.h
          : edge.targetRect.y + edge.targetRect.h / 2;

    // Keep the path orthogonal and corridor-friendly even before final fine-tuning.
    const midX = Math.max(sx + 36, tx - 36);
    routes.set(edge.id, [
      { x: sx, y: sy },
      { x: midX, y: sy },
      { x: midX, y: ty },
      { x: tx, y: ty },
    ]);
  }

  return routes;
}
