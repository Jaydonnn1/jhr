/* ------------------------------------------------------------------ *
 *  locations.js
 *  Every place the globe can fly to. Edit coordinates / labels here.
 *  lat = degrees North (+) / South (-).  lon = degrees East (+) / West (-).
 * ------------------------------------------------------------------ */

window.LOCATIONS = {
  /* Opening shot — the UK / Western Europe from space */
  home:        { lat: 50,      lon: -8,       label: 'Earth',        sub: '' },

  /* Founding */
  sanFrancisco:{ lat: 37.7749, lon: -122.4194, label: 'San Francisco', sub: 'California, USA' },

  /* Experiences */
  edinburgh:   { lat: 55.9533, lon: -3.1883,  label: 'Edinburgh',    sub: 'Scotland, UK' },
  berkeley:    { lat: 37.8715, lon: -122.2730, label: 'Berkeley',    sub: 'California, USA' },
  newHaven:    { lat: 41.3083, lon: -72.9279, label: 'New Haven',    sub: 'Yale · Connecticut' },
  fremont:     { lat: 37.5485, lon: -121.9886, label: 'Fremont',     sub: 'Tesla · California' },

  /* Travels — establishing shot, then the route */
  region:      { lat: 14,      lon: -88,      label: 'The Americas', sub: 'overland' },
  mexicoCity:  { lat: 19.4326, lon: -99.1332, label: 'Mexico City',  sub: 'Mexico' },
  cancun:      { lat: 21.1619, lon: -86.8515, label: 'Cancún',       sub: 'Mexico' },
  belizeCity:  { lat: 17.5046, lon: -88.1962, label: 'Belize City',  sub: 'Belize' },
  guatemala:   { lat: 14.6349, lon: -90.5069, label: 'Guatemala',    sub: 'Guatemala City' },
  nicaragua:   { lat: 12.1364, lon: -86.2514, label: 'Nicaragua',    sub: 'Managua' },
  cusco:       { lat: -13.5319, lon: -71.9675, label: 'Cusco',       sub: 'Machu Picchu, Peru' },
  laPaz:       { lat: -16.4897, lon: -68.1193, label: 'Bolivia',     sub: 'La Paz' },
  saoPaulo:    { lat: -23.5505, lon: -46.6333, label: 'São Paulo',   sub: 'Brazil' },

  /* Home base — the journey returns here */
  london:      { lat: 51.5074, lon: -0.1278,  label: 'London',       sub: 'Home base' },
};

/* The ordered list of travel stops (drives the chips + scroll sequence). */
window.TRAVEL_ORDER = [
  'mexicoCity', 'cancun', 'belizeCity', 'guatemala',
  'nicaragua', 'cusco', 'laPaz', 'saoPaulo',
];
