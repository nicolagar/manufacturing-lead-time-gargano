from __future__ import annotations

from pathlib import Path
import importlib.util

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

PROJECT_ROOT = Path(__file__).resolve().parent
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"

spec = importlib.util.spec_from_file_location("compute_backend", PROJECT_ROOT / "compute_backend.py")
if spec is None or spec.loader is None:
    raise RuntimeError("Failed to load compute backend module")
compute_backend = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compute_backend)

app = FastAPI(title="Nested PERT Fullstack App")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/compute/excel")
async def compute_from_excel(file: UploadFile = File(...)) -> JSONResponse:
    try:
        content = await file.read()
        df, _ = compute_backend.load_pert_excel_from_bytes(content)
        result = compute_backend.compute_hierarchical_schedule(df)
        return JSONResponse(result)
    except (compute_backend.PertDataError, compute_backend.CycleError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {exc}") from exc


@app.get("/{full_path:path}")
def serve_frontend(full_path: str = ""):
    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        requested = FRONTEND_DIST / full_path
        if full_path and requested.exists() and requested.is_file():
            return FileResponse(requested)
        return FileResponse(index_file)
    return JSONResponse(
        {
            "status": "frontend not built",
            "message": "Run the frontend build first: cd frontend && npm install && npm run build",
        },
        status_code=200,
    )
