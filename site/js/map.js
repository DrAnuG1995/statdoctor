/* =============================================
   StatDoctor — Interactive Australia Map (Leaflet + OpenStreetMap)
   ============================================= */
(function () {
  var container = document.getElementById('australiaMap');
  if (!container || typeof L === 'undefined') return;

  // Initialize map centered on Australia
  var map = L.map('australiaMap', {
    center: [-28.5, 134],
    zoom: 4,
    zoomControl: false,
    scrollWheelZoom: false,
    dragging: true,
    attributionControl: false
  });

  // Add zoom control to bottom-right
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Add attribution separately (smaller)
  L.control.attribution({ position: 'bottomleft', prefix: false })
    .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>')
    .addTo(map);

  // Use CartoDB Positron tiles for a clean, light look
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(map);

  // Custom dot icon
  function createDotIcon(size) {
    return L.divIcon({
      className: 'map-marker-dot',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2 - 4]
    });
  }

  // Hospital data with real coordinates
  var hospitals = [
    { name: 'Royal Melbourne Hospital', city: 'Melbourne, VIC', shifts: 12, lat: -37.80, lon: 144.96 },
    { name: 'Portland District Health', city: 'Portland, VIC', shifts: 8, lat: -38.34, lon: 141.60 },
    { name: 'Alexandra District Hospital', city: 'Alexandra, VIC', shifts: 5, lat: -37.19, lon: 145.71 },
    { name: 'Echuca Regional Health', city: 'Echuca, VIC', shifts: 6, lat: -36.13, lon: 144.75 },
    { name: 'BRHS Ballarat', city: 'Ballarat, VIC', shifts: 9, lat: -37.56, lon: 143.85 },
    { name: 'Healthscope Melbourne', city: 'Melbourne, VIC', shifts: 7, lat: -37.82, lon: 145.00 },
    { name: 'Ramsay Health Care', city: 'Melbourne, VIC', shifts: 10, lat: -37.85, lon: 144.98 },
    { name: 'Kingston Plaza Medical', city: 'Moorabbin, VIC', shifts: 4, lat: -37.94, lon: 145.05 },
    { name: 'CBD Doctors Melbourne', city: 'Melbourne CBD, VIC', shifts: 3, lat: -37.81, lon: 144.97 },
    { name: 'HEAL Urgent Care', city: 'Geelong, VIC', shifts: 6, lat: -38.15, lon: 144.36 },
    { name: 'Everlab Medical', city: 'Frankston, VIC', shifts: 4, lat: -38.14, lon: 145.13 },
    { name: 'Royal Brisbane Hospital', city: 'Brisbane, QLD', shifts: 11, lat: -27.45, lon: 153.03 },
    { name: 'Cairns Base Hospital', city: 'Cairns, QLD', shifts: 7, lat: -16.92, lon: 145.77 },
    { name: 'Townsville University Hospital', city: 'Townsville, QLD', shifts: 5, lat: -19.32, lon: 146.76 },
    { name: 'Gold Coast University Hospital', city: 'Gold Coast, QLD', shifts: 8, lat: -28.00, lon: 153.41 },
    { name: 'Royal Prince Alfred Hospital', city: 'Sydney, NSW', shifts: 14, lat: -33.89, lon: 151.18 },
    { name: 'St Vincent\'s Hospital Sydney', city: 'Sydney, NSW', shifts: 6, lat: -33.88, lon: 151.22 },
    { name: 'Royal Adelaide Hospital', city: 'Adelaide, SA', shifts: 9, lat: -34.92, lon: 138.59 },
    { name: 'Flinders Medical Centre', city: 'Adelaide, SA', shifts: 5, lat: -35.02, lon: 138.57 },
    { name: 'Royal Perth Hospital', city: 'Perth, WA', shifts: 7, lat: -31.95, lon: 115.86 },
    { name: 'Sir Charles Gairdner Hospital', city: 'Perth, WA', shifts: 4, lat: -31.94, lon: 115.80 },
    { name: 'Royal Hobart Hospital', city: 'Hobart, TAS', shifts: 3, lat: -42.88, lon: 147.33 },
    { name: 'Royal Darwin Hospital', city: 'Darwin, NT', shifts: 4, lat: -12.43, lon: 130.84 },
  ];

  // Add markers
  hospitals.forEach(function (h) {
    var size = Math.min(10 + h.shifts, 20);
    var marker = L.marker([h.lat, h.lon], {
      icon: createDotIcon(size)
    }).addTo(map);

    // Popup content
    var popupContent =
      '<div style="font-family:Inter,sans-serif;padding:4px 2px;">' +
      '<div style="font-weight:700;font-size:14px;color:#1a1a2e;margin-bottom:2px;">' + h.name + '</div>' +
      '<div style="font-size:12px;color:#667085;margin-bottom:4px;">' + h.city + '</div>' +
      '<div style="font-size:12px;font-weight:600;color:#3232ff;">' + h.shifts + ' shifts available</div>' +
      '</div>';

    marker.bindPopup(popupContent, {
      closeButton: false,
      className: 'map-custom-popup',
      offset: [0, -4]
    });

    marker.on('mouseover', function () { this.openPopup(); });
    marker.on('mouseout', function () { this.closePopup(); });
  });
})();
