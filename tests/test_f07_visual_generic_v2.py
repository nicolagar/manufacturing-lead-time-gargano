from pathlib import Path
import json
project_root = Path(__file__).resolve().parents[1]
model = json.loads((project_root / 'tests' / 'artifacts' / 'PERT_v3_03_option1_generic_model_v2.json').read_text(encoding='utf-8'))
f07 = model['containerCoords']['F07']
f0704 = model['containerCoords']['F07_04']
f08 = model['boxCoords']['F08']
f09 = model['boxCoords']['F09']
f10 = model['boxCoords']['F10']
f0705 = model['boxCoords']['F07_05']
f0704_box = model['boxCoords']['F07_04']
assert f08['y0'] >= f07['y2'], 'F08 must be below F07 container'
assert f09['y0'] >= f07['y2'], 'F09 must be below F07 container'
assert f10['x0'] > f07['x2'], 'F10 must be right of F07 container'
assert f0705['x0'] > f0704_box['x0'], 'F07_05 must be right of F07_04'
assert f0704['x0'] >= f07['x0'] and f0704['x2'] <= f07['x2'], 'F07_04 child container must stay inside F07'
for route in model['routeSegments']:
    if route['source'] == 'F07' and route['target'] == 'F10':
        for seg in route['segments']:
            if seg['y1'] == seg['y2']:
                assert seg['y1'] < f07['y0'] + 90, 'F07->F10 must stay in upper corridor'
print('Generic F07 visual test passed')
