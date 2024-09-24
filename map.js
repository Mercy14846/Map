// Initialize the map
const map = L.map('map').setView([0, 20], 3);

// Add OSM base layer
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Add Google Satellite base layer
const googleSatelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '© Google'
});

// Layer control
const baseLayers = {
    "OpenStreetMap": osmLayer,
    "Google Satellite": googleSatelliteLayer
};

const markersLayer = L.layerGroup();

// Add search control
const geocoder = L.Control.geocoder({
    defaultMarkGeocode: false
})
.on('markgeocode', function(e) {
    const bbox = e.geocode.bbox;
    const poly = L.polygon([
        bbox.getSouthEast(),
        bbox.getNorthEast(),
        bbox.getNorthWest(),
        bbox.getSouthWest()
    ])
    map.fitBounds(poly.getBounds());
})
.addTo(map);

// Add custom markers for African stations from a CSV
const customMarkerIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconSize: [15, 24],
    iconAnchor: [7.5, 24],
    popupAnchor: [0, -20],
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    shadowSize: [24, 32],
    shadowAnchor: [7.5, 32]
});

fetch('../public/african_stations_positions_addresses.csv')
.then(response => response.text())
.then(csvText => {
    const result = Papa.parse(csvText, {
        header: true,
        dynamicTyping: true
    });

    const stations = result.data;
    stations.forEach(station => {
        const coords = [station.lat, station.lon];
        const name = station.ID;
        L.marker(coords, { icon: customMarkerIcon }).bindPopup(name).addTo(markersLayer);
    });
})
.catch(error => console.error('Error fetching the CSV file:', error));

markersLayer.addTo(map);

// Add Leaflet Draw control for drawing features
const drawControl = new L.Control.Draw({
    draw: {
        polyline: true, // Enable drawing polylines
        polygon: true,  // Enable drawing polygons
        marker: true,   // Enable drawing markers
        circle: false,  // Disable drawing circles
        circlemarker: false
    },
    edit: {
        featureGroup: markersLayer
    }
});
map.addControl(drawControl);

// Add event listeners for drawing events
map.on(L.Draw.Event.CREATED, function (event) {
    const layer = event.layer;
    markersLayer.addLayer(layer);
});

// Load GeoJSON for African country boundaries
let countryLayer;
fetch('../public/africa_countries.geojson') // Adjust the path to your GeoJSON file
.then(response => response.json())
.then(data => {
    countryLayer = L.geoJSON(data, {
        style: {
            color: "#3388ff",
            weight: 2
        }
    }).addTo(map);
})
.catch(error => console.error('Error loading GeoJSON:', error));

// Event listener to show boundaries when zooming in
map.on('zoomend', function() {
    const currentZoom = map.getZoom();
    if (currentZoom > 5 && countryLayer) {
        map.addLayer(countryLayer); // Add boundaries when zoomed in
    } else if (currentZoom <= 5 && countryLayer) {
        map.removeLayer(countryLayer); // Remove boundaries when zoomed out
    }
});

// Layer control with base layers and overlays
const overlayLayers = {
    "Weather Stations": markersLayer,
    "Country Boundaries": countryLayer
};
L.control.layers(baseLayers, overlayLayers).addTo(map);

// Display coordinates when moving the mouse
map.on('mousemove', function (e) {
    document.getElementsByClassName('coordinate')[0].innerHTML = 'Lat: ' + e.latlng.lat.toFixed(5) + ', Lng: ' + e.latlng.lng.toFixed(5);
});