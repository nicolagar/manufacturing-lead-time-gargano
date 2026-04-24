from pathlib import Path
import importlib.util

project_root = Path(__file__).resolve().parents[1]
xlsx_path = project_root / "tests" / "fixtures" / "PERT_v3_03.xlsx"

spec = importlib.util.spec_from_file_location("compute_backend", project_root / "compute_backend.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

content = xlsx_path.read_bytes()
df, _ = mod.load_pert_excel_from_bytes(content)
result = mod.compute_hierarchical_schedule(df)

assert result["lead_time"] > 0
assert any(row["process"] == "F07" for row in result["schedule"])
assert any(row["process"] == "F10" for row in result["schedule"])
assert any(edge["from"] == "F07" and edge["to"] == "F10" for edge in result["graph"]["edges"])

print("Backend fixture test passed")
