# Nested PERT Fullstack App (Option 1)

This is a **single deployable app**:

- **backend**: FastAPI in `app.py`
- **frontend**: React Flow + ELK + Libavoid project in `frontend/`
- **single public deployment target**: one Render web service

## Architecture

This follows **Option 1** from the chat:
- frontend and backend together in one project
- single URL after deployment
- accessible from any computer once deployed publicly

## Project structure

```text
app.py
compute_backend.py
requirements.txt
render.yaml
frontend/
```

## Local run

### Backend dependencies
```bash
pip install -r requirements.txt
```

### Frontend build
```bash
cd frontend
npm install
npm run build
cd ..
```

### Start app
```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

Then open:
```text
http://localhost:8000
```

Health endpoint:
```text
http://localhost:8000/health
```

## Render deployment

This project includes `render.yaml`, but you can also configure manually.

### Manual settings
**Build Command**
```bash
pip install -r requirements.txt && cd frontend && npm install && npm run build
```

**Start Command**
```bash
uvicorn app:app --host 0.0.0.0 --port $PORT
```

## Notes

- The frontend calls `/compute/excel` on the same origin.
- The backend serves the built frontend from `frontend/dist`.
- `compute_backend.py` currently reuses the existing computation logic from the previous project generation.


## Wired test flow: PERT_v3_03.xlsx

This project now includes the concrete workbook test flow:

```text
tests/fixtures/PERT_v3_03.xlsx
frontend/public/fixtures/PERT_v3_03_result.json
```

You can use it in two ways:

1. **Backend path**
   - upload `PERT_v3_03.xlsx` through the UI
   - backend computes `/compute/excel`
   - frontend builds the diagram

2. **Fixture path**
   - click **Load included PERT_v3_03 fixture**
   - frontend loads the precomputed result JSON directly

### Rebuild the fixture JSON
```bash
python scripts/build_fixture_json.py
```

### Run the backend-side fixture check
```bash
python tests/test_fixture_backend.py
```


## Generic F07 visual validation loop (no fixture override)

This version removes the fixture-specific expected-layout override as the source of truth.

The project now contains a **generic** F07 refinement path and project-side artifacts generated from that generic flow.

Artifacts:
- generic model:
  - `tests/artifacts/PERT_v3_03_option1_generic_model.json`
- generic preview:
  - `tests/artifacts/PERT_v3_03_option1_generic_preview.svg`
  - `tests/artifacts/PERT_v3_03_option1_generic_preview.png`
- generic visual test:
  - `tests/test_f07_visual_generic.py`

Run:
```bash
python tests/test_f07_visual_generic.py
```


## Generic F07 loop status update

This build removes the fixture-specific override and uses a generic refinement path.

Updated artifacts:
- `tests/artifacts/PERT_v3_03_option1_generic_model.json`
- `tests/artifacts/PERT_v3_03_option1_generic_preview_v2.svg`
- `tests/artifacts/PERT_v3_03_option1_generic_preview_v2.png`
- `tests/artifacts/test_f07_visual_generic_report_v2.json`


## Merged compound-process representation

This version merges the parent process box with the expanded container/content region.

Rules now represented in the project artifacts:
- compound process uses one merged boundary
- external incoming/outgoing connectors attach to the merged container edge
- unrelated connectors stay outside the container/content region
- critical-path compound processes use a red outer boundary

Artifacts:
- `tests/artifacts/PERT_v3_03_merged_container_model.json`
- `tests/artifacts/PERT_v3_03_merged_container_preview.svg`
- `tests/artifacts/PERT_v3_03_merged_container_preview.png`
- `tests/test_merged_container_representation.py`


## Merged container representation update

This build reroutes unrelated top-level connectors so they stay outside the merged `F07` container/content region.

Updated artifacts:
- `tests/artifacts/PERT_v3_03_merged_container_preview_v2.svg`
- `tests/artifacts/PERT_v3_03_merged_container_preview_v2.png`
- `tests/artifacts/test_merged_container_representation_report_v2.json`
