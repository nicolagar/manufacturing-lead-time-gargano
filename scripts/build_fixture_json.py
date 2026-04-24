from pathlib import Path
import importlib.util
import json
import sys

project_root = Path(__file__).resolve().parents[1]
xlsx_path = project_root / "tests" / "fixtures" / "PERT_v3_03.xlsx"
out_path = project_root / "frontend" / "public" / "fixtures" / "PERT_v3_03_result.json"

spec = importlib.util.spec_from_file_location("compute_backend", project_root / "compute_backend.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

content = xlsx_path.read_bytes()
df, _ = mod.load_pert_excel_from_bytes(content)
result = mod.compute_hierarchical_schedule(df)
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(result), encoding="utf-8")
print(f"Wrote {out_path}")
