import React, { useRef, useEffect, useState } from 'react';
import './App.css';
import { ACCESS_TOKEN, STYLE_URI, ROUNDEL_BASE64 } from './components/consts';
import { allStations, stationsByLine } from "./components/stationsInfo.js";
import { coordinates } from "./components/coordinates.js";
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax

mapboxgl.accessToken = ACCESS_TOKEN;

function App() {

  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(-0.12574);
  const [lat, setLat] = useState(51.50853);
  const [zoom, setZoom] = useState(10);
  const [hoveredPolygonId, setHoveredPolygonId] = useState(null);
  const [correctGuessesList, setCorrectGuessesList] = useState([]);
  const [remainingStationsList, setRemainingStationsList] = useState([...allStations]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const adjust = (s) => {
    return s
      .replace(/[^\w\s&]/g, "")
      .replace("saint", "st")
      .replace(/\band\b/g, "&")
      .toLowerCase();
  }

  const layerName = (s) => {
    return s.toLowerCase().replace(/\s/g, "-").replace("&", "and");
  }

  const moveBlobs = () => {
    const guessInput = document.getElementById("guessInput").value.toLowerCase();
    const adjustedGuessInput = adjust(guessInput);
  
    // Iterate through all stations
    for (const blob of allStations) {
      const itemName = blob.properties.name.toLowerCase();
  
      // Check if the guess matches
      if (adjust(itemName) === adjustedGuessInput) {
        // Focus on the guessed station
        map.current.easeTo({
          center: blob.geometry.coordinates,
          zoom: 13,
          speed: 0.2,
          duration: 3000,
        });

        setCorrectGuessesList((prevCorrectGuessesList) => {
          const alreadyGuessed = prevCorrectGuessesList.some((item) => {
            console.log("Comparing:", adjust(item.properties.name), adjustedGuessInput);
            return adjust(item.properties.name) === adjustedGuessInput;
          });
      
          if (alreadyGuessed) {
            console.log("Already guessed");
            return prevCorrectGuessesList; // Return the previous state if already guessed
          }

          // Handle new correct guess
          const newBlob = findBlobByName(adjustedGuessInput);
          if (!newBlob) {
            console.log("Blob not found");
            return prevCorrectGuessesList;
          }

          // Clear input after a correct guess
          document.getElementById("guessInput").value = "";
      
          const updatedCorrectGuessesList = [...prevCorrectGuessesList, newBlob];
          console.log("Updating Correct Guesses List:", updatedCorrectGuessesList.map(
            (item) => item.properties.name
          ));
      
          map.current.getSource("pointsLocations").setData({
            type: "FeatureCollection",
            features: updatedCorrectGuessesList,
          });
      
          return updatedCorrectGuessesList;
        });
  
        // If the station is not guessed yet, update the state
        setRemainingStationsList((prevRemainingStationsList = []) => {
          if (
            prevRemainingStationsList.some(
              (item) => adjust(item.properties.name) === adjustedGuessInput
            )
          ) {
            // Add ID and mark as guessed
            blob.id = correctGuessesList.length;
  
            // Filter the guessed station from the remaining stations list
            return prevRemainingStationsList.filter(
              (item) => adjust(item.properties.name) !== adjustedGuessInput
            );
          }
          return prevRemainingStationsList; // Always return something
        });
  
        // Check for complete line guesses
        for (const line of stationsByLine) {
          if (line.not_guessed.length !== 0) {
            line.not_guessed = line.not_guessed.filter(
              (stationName) => adjust(stationName) !== adjustedGuessInput
            );
            line.guessed.push(blob);
  
            if (line.not_guessed.length === 0) {
              const lineCoordinates = coordinates.find(
                (item) => item.name === line.name
              );
  
              if (lineCoordinates) {
                map.current.addSource(layerName(lineCoordinates.name), {
                  type: "geojson",
                  data: {
                    type: "FeatureCollection",
                    features: lineCoordinates.features,
                  },
                });
  
                map.current.addLayer({
                  id: layerName(lineCoordinates.name),
                  type: "line",
                  source: layerName(lineCoordinates.name),
                  layout: {
                    "line-join": "round",
                    "line-cap": "round",
                  },
                  paint: {
                    "line-color": lineCoordinates.lineColor,
                    "line-width": 4,
                  },
                });
  
                map.current.moveLayer(layerName(lineCoordinates.name), "points");
              }
            }
          }
        }
  
        break; // Exit the loop after a correct guess
      }
    }
  };
  
  // Helper function to find a blob by its adjusted name
  const findBlobByName = (adjustedName) => {
    return allStations.find((blob) => adjust(blob.properties.name) === adjustedName);
  };

  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/" + STYLE_URI,
      center: [lng, lat],
      zoom: zoom
    });
    
    map.current.on("load", () => {
      map.current.addSource("pointsLocations", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: correctGuessesList,
        },
      });

      // Add an image to use as a custom marker
      map.current.loadImage(
        ROUNDEL_BASE64,
        (error, image) => {
        if (error) throw error;
        map.current.addImage("roundel", image);

        // Add a symbol layer
        map.current.addLayer({
          id: "points",
          type: "symbol",
          source: "pointsLocations",
          layout: {
            "icon-image": "roundel",
            "icon-size": 0.05,
            "text-anchor": "top",
            "text-field": ["get", "name"],
            "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
            "text-offset": [0, 1],
            "text-optional": true,
            "text-size": 15,
          },
          paint: {
            "text-color": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              "#000",
              "#FFF",
            ],
            "text-halo-color": "#FFF",
            "text-halo-blur": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              1,
              0,
            ],
            "text-halo-width": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              2,
              0,
            ],
          },
        });
      });

      // When the mouse moves over a correctly guessed station on the map, highlight it
      // TODO: Consider highlighting it on the sidebar too
      map.current.on("mousemove", "points", (e) => {
        if (e.features.length > 0) {
          if (hoveredPolygonId !== null) {
            map.current.setFeatureState(
              { source: "pointsLocations", id: hoveredPolygonId },
              { hover: false }
            );
          }
          
          const newHoveredPolygonId = e.features[0].id;
          setHoveredPolygonId(newHoveredPolygonId);
          map.current.setFeatureState(
            { source: "pointsLocations", id: newHoveredPolygonId },
            { hover: true }
          );
        }
      });

      // When the mouse leaves the state-fill layer, update the feature state of the
      // previously hovered feature.
      map.current.on("mouseleave", "points", () => {
        if (hoveredPolygonId !== null) {
          map.current.setFeatureState(
            { source: "pointsLocations", id: hoveredPolygonId },
            { hover: false }
          );
        }
        setHoveredPolygonId(null);
      });

      // When the mouse clicks on a correctly guessed station on the map, center it and zoom in
      // TODO: Consider highlighting it on the sidebar (but moving over would probably cover that)
      map.current.on("click", "points", (e) => {
        if (e.features.length > 0) {
          map.current.easeTo({
            center: correctGuessesList.find(function (station) {
              return station.properties.name === e.features[0].properties.name;
            }).geometry.coordinates,
            zoom: 17,
            speed: 0.2,
            duration: 3000,
          });
        }
      });
    });

    map.current.on("idle", () => {
      const textbox = document.getElementById("guessInput");
      textbox.addEventListener("input", function () {
        // Get the current input value
        let inputText = this.value;

        // Ensure that the input does not start with a space
        if (inputText[0] !== " ") {
          // Replace consecutive spaces with a single space
          inputText = inputText.replace(/\s+/g, " ");

          // Update the input value with the cleaned text
          this.value = inputText;
        } else {
          // The first character is a space, remove it
          this.value = inputText.substring(1);
        }

        moveBlobs();
      });
    });
  }, []);

  return (
    <div>
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}  id="mySidebar">
        <div className="top-container">
          <p>
            Guessed Stations:
            <br />
            <span id="guessCount">
              {`${correctGuessesList.length}`}
            </span> of <span id="totalStationsCount">
              {`${allStations.length}`}
            </span>
          </p>
        </div>

        <div className="right-column">
          <ul id="correctGuessesList">
          {
            correctGuessesList.map((station, index) => (
              <li 
                key={index} 
                onClick={() => {
                  map.current.easeTo({
                    center: station.geometry.coordinates,
                    zoom: 17,
                    speed: 0.2,
                    duration: 3000,
                  });
                }}
              >
                {station.properties.name}
              </li>
            ))
          }
          </ul>
        </div>

        {/* <div className="bottom-container">
          <button>Help Point</button>
        </div> */}
      </div>

      <div className="page-content">
        <div ref={mapContainer} className="map-container" />
        <div className="header">
          <button id="sidebarButtonId" onClick={toggleSidebar}>&#9776;</button>
          <input type="text" id="guessInput" placeholder="Guess a station..." />
        </div>
      </div>

      <div className="message-box">
        <i className="fas fa-info-circle message-icon"></i>
        <div className="message-content">
          This site is not affiliated in anyway with Transport for London (TfL) or
          the London Underground.
        </div>
      </div>
    </div>
  );
}

export default App;