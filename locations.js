/* ------------------------------------------------------------------ *
 *  locations.js
 *  Every place the globe can fly to. Edit coordinates / labels here.
 *  lat = degrees North (+) / South (-).  lon = degrees East (+) / West (-).
 * ------------------------------------------------------------------ */

window.LOCATIONS = {
  /* Opening shot — the UK / Western Europe from space */
  home:        { lat: 50,     lon: -8,      label: 'Earth',          sub: '' },

  /* Founding */
  sanFrancisco:{ lat: 37.7749, lon: -122.4194, label: 'San Francisco', sub: 'California, USA' },

  /* Travels — Central & South America */
  region:      { lat: 8,      lon: -78,     label: 'The Americas',   sub: 'Central & South' },
  mexico:      { lat: 19.4326, lon: -99.1332, label: 'Mexico',        sub: 'Mexico City' },
  belize:      { lat: 17.1899, lon: -88.4976, label: 'Belize',        sub: 'Belmopan' },
  guatemala:   { lat: 14.6349, lon: -90.5069, label: 'Guatemala',     sub: 'Guatemala City' },
  elSalvador:  { lat: 13.6929, lon: -89.2182, label: 'El Salvador',   sub: 'San Salvador' },
  nicaragua:   { lat: 12.1364, lon: -86.2514, label: 'Nicaragua',     sub: 'Managua' },
  costaRica:   { lat: 9.9281,  lon: -84.0907, label: 'Costa Rica',    sub: 'San José' },
  peru:        { lat: -12.0464, lon: -77.0428, label: 'Peru',         sub: 'Lima' },
  bolivia:     { lat: -16.4897, lon: -68.1193, label: 'Bolivia',      sub: 'La Paz' },
  brazil:      { lat: -15.7939, lon: -47.8828, label: 'Brazil',       sub: 'Brasília' },

  /* Experiences */
  edinburgh:   { lat: 55.9533, lon: -3.1883,  label: 'Edinburgh',     sub: 'Scotland, UK' },
  berkeley:    { lat: 37.8715, lon: -122.2730, label: 'Berkeley',     sub: 'California, USA' },
  newHaven:    { lat: 41.3083, lon: -72.9279, label: 'New Haven',     sub: 'Connecticut, USA' },
  fremont:     { lat: 37.5485, lon: -121.9886, label: 'Fremont',      sub: 'California, USA' },
};

/* The ordered list of countries in the Travels section (drives the chips
 * and the scroll sequence). */
window.TRAVEL_ORDER = [
  'mexico', 'belize', 'guatemala', 'elSalvador',
  'nicaragua', 'costaRica', 'peru', 'bolivia', 'brazil',
];
