from pathlib import Path
import json

project_root = Path(__file__).resolve().parents[1]
model = json.loads((project_root / 'tests' / 'artifacts' / 'PERT_v3_03_merged_container_model.json').read_text(encoding='utf-8'))

f07 = model['containerCoords']['F07']
f0704 = model['containerCoords']['F07_04']
critical = set(model.get('criticalEdges', []))

def inside(pt, rect):
    return rect['x0'] < pt[0] < rect['x2'] and rect['y0'] < pt[1] < rect['y2']

# merged box equals container for compound nodes
assert model['boxCoords']['F07'] == model['containerCoords']['F07']
assert model['boxCoords']['F07_04'] == model['containerCoords']['F07_04']

# external connector touching F07 must use container edges
for route in model['routeSegments']:
    if route['source'] == 'F07' and route['target'] == 'F10':
        first = route['segments'][0]
        assert first['x1'] == f07['x2'], 'Outgoing from F07 must start on merged container east edge'
    if route['source'] == 'F05' and route['target'] == 'F07':
        last = route['segments'][-1]
        assert last['x2'] == f07['x0'], 'Incoming to F07 must end on merged container west edge'
    if route['source'] == 'F07_04' and route['target'] == 'F07_05':
        first = route['segments'][0]
        assert first['x1'] == f0704['x2'], 'Outgoing from F07_04 must start on merged container east edge'
    if route['source'] == 'F07_02' and route['target'] == 'F07_04':
        last = route['segments'][-1]
        assert last['x2'] == f0704['x0'], 'Incoming to F07_04 must end on merged container west edge'

# unrelated route points must stay outside F07 content region
for route in model['routeSegments']:
    key = f"{route['source']}__{route['target']}"
    owned = route['source'].startswith('F07') or route['target'].startswith('F07')
    if owned:
        continue
    for seg in route['segments']:
        for pt in [(seg['x1'], seg['y1']), (seg['x2'], seg['y2'])]:
            assert not inside(pt, f07), f'Unrelated connector {key} enters F07 container'

print('Merged container representation test passed')
