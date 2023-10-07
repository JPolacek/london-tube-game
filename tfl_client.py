# pylint: disable=no-member, missing-timeout, missing-function-docstring
"""
Script containing all of the logic needed to interact with the TfL API
"""
import json
from pprint import pprint
import requests

BASE_URL = 'https://api-nile.tfl.gov.uk/'
with open('secrets.txt', 'r', encoding='utf-8') as f:
    APP_KEY = f.read()

def get_tube_lines():
    """
    Return json blob of tube lines
    """
    resp = requests.get(
        f'{BASE_URL}Line/Mode/tube',
        params={'app_key':APP_KEY},
    )

    if resp.status_code != requests.codes.ok:
        print("Not ok")
        return

    lines_json = resp.json()

    for line in lines_json:
        print(f'{line["name"]} ({line["id"]})')

    return lines_json

def get_stations_for_line(line_id):
    """
    Return json blob of stations for given line id
    """
    resp = requests.get(
        f'{BASE_URL}Line/{line_id}/StopPoints',
        params={'app_key':APP_KEY},
    )

    if resp.status_code != requests.codes.ok:
        print("Not ok")
        return

    return resp.json()

def raw_station_to_geojson_feature(raw_station):
    return {
        'type': 'Feature',
        'geometry': {
                'type': 'Point',
                'coordinates': [
                    raw_station['lon'],
                    raw_station['lat'],
                ]
            },
            'properties': {
                'name': raw_station['commonName'].split(' Underground Station')[0]
            }
    }

if __name__ == "__main__":
    tube_lines = get_tube_lines()
    line_station_map = {}
    for line in tube_lines:
        raw_stations = get_stations_for_line(line['id'])
        line_station_map[line['name']] = [
            raw_station_to_geojson_feature(raw_station)
            for raw_station in raw_stations
        ]

    features = [feature for feature_list in line_station_map.values() for feature in feature_list]

    # pprint(features)

    stations = []
    unique_features = []
    for feature in features:
        station = feature['properties']['name']
        if station not in stations:
            stations.append(station)
            unique_features.append(feature)

    with open('features.json', 'w', encoding='utf-8') as f:
        json.dump(unique_features, f)
        f.close()
