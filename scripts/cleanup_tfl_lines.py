import json
from pprint import pprint

with open("assets/tfl_lines.json", "r", encoding="utf-8") as json_data:
    data = json.load(json_data)

features = data["features"]

coordinates_by_line = {}

for feature in features:
    for line in feature["properties"]["lines"]:
        name = line["name"]
        new_feature = [
            {
                "type": "Feature",
                "properties": {},
                "geometry": feature["geometry"],
            }
        ]
        if name not in coordinates_by_line:
            coordinates_by_line[name] = new_feature
        else:
            coordinates_by_line[name] += new_feature

# pprint(coordinates_by_line)

with open("line_coordinates.json", "w", encoding="utf-8") as f:
    json.dump(coordinates_by_line, f)
