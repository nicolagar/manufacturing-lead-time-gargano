# Nested PERT Diagram Front-End

Fresh React front-end project built around the PDF-recommended stack:

- `@xyflow/react` for rendering nested graphs and interaction
- `elkjs` (`org.eclipse.elk.layered`) for left-to-right hierarchical placement
- `libavoid-js` for final obstacle-aware orthogonal routing

## Why this structure

The PDF recommends a **compound graph** with recursive layout, protected corridors, and separated concerns. This project keeps those concerns in separate folders:

- `src/domain/*` — data model + backend parsing
- `src/layout/*` — scoped ELK layout
- `src/routing/*` — libavoid adapter, corridor creation, validation
- `src/components/*` — React Flow nodes and canvas

## Current backend expectation

This front-end expects an existing backend endpoint:

- `POST /compute/excel`

that returns the previously used schedule + graph payload.

Configure it with:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

If omitted, the project uses the same origin.

## Install

```bash
npm install
npm run dev
```

## Notes

- `parentId` is used for nested sub-flows as documented by React Flow.
- ELK layered is configured for `RIGHT` direction and orthogonal routing.
- `libavoid-js` is WASM-based; `postinstall` copies `libavoid.wasm` to `public/`.

## Important implementation note

The exact low-level API exposed by `libavoid-js` may vary slightly across releases.  
All such integration is isolated to:

- `src/routing/libavoidRouter.ts`

If the installed package shape changes, only that file should need adjustment.


## Option 1 integration
This frontend is intended to be built and served by the root FastAPI app in the parent project.
