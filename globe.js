/* ------------------------------------------------------------------ *
 *  globe.js  —  Interactive 3D Earth
 *  Renders a photoreal globe that can be oriented to any lat/lon so the
 *  location faces the camera (north up). Orientation is driven by scroll
 *  from main.js via setKey() / slerpBetween().
 * ------------------------------------------------------------------ */

const DEG = Math.PI / 180;
const ZAXIS = new THREE.Vector3(0, 0, 1);
const NORTH = new THREE.Vector3(0, 1, 0);

/* segments whose DESTINATION is one of these travel by bus (overland);
 * everything else (the intercontinental hops + Bolivia→Brazil→London) flies. */
const OVERLAND = new Set([
  'cancun', 'belizeCity', 'guatemala', 'nicaragua', 'cusco', 'laPaz',
]);

/* land waypoints [lat, lon] so the bus never crosses open water */
const BUS_WAYPOINTS = {
  'mexicoCity>cancun': [[18.1, -94.4], [20.97, -89.62]],
  'cancun>belizeCity': [[19.3, -88.05], [18.5, -88.35]],
  'belizeCity>guatemala': [[16.9, -89.6]],
  'guatemala>nicaragua': [[13.69, -89.22], [13.0, -87.2]],
  'nicaragua>cusco': [
    [9.93, -84.08], [8.98, -79.52], [3.45, -76.53],
    [-0.18, -78.47], [-2.9, -79.0], [-12.05, -77.04],
  ],
};

/* lat/lon (degrees) -> point on a unit sphere, matched to the standard
 * equirectangular earth texture used here. */
function latLonToVec3(lat, lon, r = 1) {
  const phi = (90 - lat) * DEG;          // polar angle from +Y
  const theta = (lon + 180) * DEG;       // azimuth
  return new THREE.Vector3(
    -(r * Math.sin(phi) * Math.cos(theta)),
      (r * Math.cos(phi)),
      (r * Math.sin(phi) * Math.sin(theta))
  );
}

class Globe {
  constructor(canvas, onReady) {
    this.canvas = canvas;
    this.onReady = onReady;
    this.quatCache = {};          // key -> Quaternion
    this.activeKey = null;
    this.manager = new THREE.LoadingManager();
    if (onReady) this.manager.onLoad = onReady;   // fires once textures finish

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      36, window.innerWidth / window.innerHeight, 0.1, 2000
    );
    this.camera.position.set(0, 0, 3.05);

    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.panFraction = 0.17;      // how far right of centre the globe sits

    this._buildStars();
    this._buildEarth();
    this._buildAtmosphere();
    this._buildLights();
    this._buildMarkers();
    this._buildVehicles();

    this.tmpVec = new THREE.Vector3();
    this.clock = new THREE.Clock();

    this.resize();
    this.animate();
  }

  /* -------------------------------------------------- scene contents */

  _buildEarth() {
    const loader = new THREE.TextureLoader(this.manager);
    const day = loader.load('assets/earth-day.jpg');
    const spec = loader.load('assets/earth-specular.jpg');
    if ('SRGBColorSpace' in THREE) day.colorSpace = THREE.SRGBColorSpace;

    const geo = new THREE.SphereGeometry(1, 96, 96);
    const mat = new THREE.MeshPhongMaterial({
      map: day,
      specularMap: spec,
      specular: new THREE.Color(0x335577),
      shininess: 14,
    });
    this.earth = new THREE.Mesh(geo, mat);
    this.scene.add(this.earth);

    /* Clouds — share orientation with earth, with a faint independent drift */
    const clouds = loader.load('assets/earth-clouds.png');
    const cloudMat = new THREE.MeshPhongMaterial({
      map: clouds, transparent: true, opacity: 0.4, depthWrite: false,
    });
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 80, 80), cloudMat);
    this.scene.add(this.clouds);
  }

  _buildAtmosphere() {
    const mat = new THREE.ShaderMaterial({
      uniforms: { glowColor: { value: new THREE.Color(0x5b9bff) } },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 glowColor;
        void main() {
          float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.4);
          gl_FragColor = vec4(glowColor, 1.0) * clamp(intensity, 0.0, 1.0);
        }`,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    this.atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.0, 64, 64), mat);
    this.atmosphere.scale.setScalar(1.18);
    this.scene.add(this.atmosphere);
  }

  _buildLights() {
    const sun = new THREE.DirectionalLight(0xfff4e6, 1.45);
    sun.position.set(2.2, 0.7, 1.6);
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(0x2a3a5a, 0.9));
    /* faint cool rim from behind */
    const rim = new THREE.DirectionalLight(0x4466aa, 0.5);
    rim.position.set(-2, -0.5, -1.5);
    this.scene.add(rim);
  }

  _starSprite() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.85)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.Texture(c);
    t.needsUpdate = true;
    return t;
  }

  _buildStars() {
    const N = 2600;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const tint = [
      [1, 1, 1], [0.75, 0.85, 1], [1, 0.92, 0.78], [0.85, 0.9, 1],
    ];
    for (let i = 0; i < N; i++) {
      const r = 120 + Math.random() * 380;
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = r * s * Math.cos(a);
      pos[i * 3 + 1] = r * u;
      pos[i * 3 + 2] = r * s * Math.sin(a);
      const t = tint[(Math.random() * tint.length) | 0];
      const b = 0.55 + Math.random() * 0.45;
      col[i * 3] = t[0] * b; col[i * 3 + 1] = t[1] * b; col[i * 3 + 2] = t[2] * b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 2.4, map: this._starSprite(), vertexColors: true,
      transparent: true, depthWrite: false, sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  /* faint glowing dots at every location, + one bright pulsing marker */
  _buildMarkers() {
    this.dots = new THREE.Group();
    this.earth.add(this.dots);                 // children rotate with earth
    const dotGeo = new THREE.SphereGeometry(0.006, 10, 10);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x8fd3ff });
    Object.values(window.LOCATIONS).forEach((loc) => {
      if (loc.label === 'Earth' || loc.label === 'The Americas') return;
      const d = new THREE.Mesh(dotGeo, dotMat);
      d.position.copy(latLonToVec3(loc.lat, loc.lon, 1.004));
      this.dots.add(d);
    });

    /* active pin: a small sphere + halo ring */
    this.pin = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.013, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    this.halo = new THREE.Mesh(
      new THREE.RingGeometry(0.02, 0.03, 32),
      new THREE.MeshBasicMaterial({
        color: 0x7fc4ff, transparent: true, opacity: 0.9,
        side: THREE.DoubleSide, depthWrite: false,
      })
    );
    this.pin.add(core, this.halo);
    this.pin.visible = false;
    this.earth.add(this.pin);
  }

  /* ---- vehicle icons (drawn pointing "up", -y, so heading=0 means north) ---- */

  _planeSprite() {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const g = c.getContext('2d');
    g.translate(80, 80);
    g.shadowColor = 'rgba(127, 196, 255, 0.85)';
    g.shadowBlur = 6;
    g.fillStyle = '#eef4ff';
    const rr = (x, y, w, h, r) => {
      g.beginPath();
      if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
      g.fill();
    };
    const poly = (pts) => {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath();
      g.fill();
    };
    // 747 (top-down, nose up): spindle fuselage, swept wings, 4 engines,
    // swept tailplane and a vertical fin — traced from the reference icon.
    g.beginPath();
    g.moveTo(0, -64);
    g.bezierCurveTo(7, -57, 7.5, -30, 7, -4);
    g.bezierCurveTo(6.5, 22, 4.5, 46, 0, 60);
    g.bezierCurveTo(-4.5, 46, -6.5, 22, -7, -4);
    g.bezierCurveTo(-7.5, -30, -7, -57, 0, -64);
    g.closePath();
    g.fill();
    poly([[5, -8], [63, 30], [63, 37], [6, 16]]);       // wings (swept)
    poly([[-5, -8], [-63, 30], [-63, 37], [-6, 16]]);
    poly([[3, 34], [28, 53], [27, 58], [4, 45]]);        // tailplane (swept)
    poly([[-3, 34], [-28, 53], [-27, 58], [-4, 45]]);
    poly([[0, 44], [2.8, 64], [0, 68], [-2.8, 64]]);     // vertical fin
    [[23, 2], [44, 16], [-23, 2], [-44, 16]]             // 4 engine pods
      .forEach(([x, y]) => rr(x - 2.9, y - 6.5, 5.8, 14, 2.6));
    const t = new THREE.Texture(c);
    t.needsUpdate = true;
    return t;
  }

  _busSprite() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.translate(64, 64);
    g.shadowColor = 'rgba(255, 196, 120, 0.85)';
    g.shadowBlur = 8;
    const w = 26, h = 52;
    g.fillStyle = '#ffd166';                      // coach body (top-down)
    g.beginPath();
    if (g.roundRect) g.roundRect(-w / 2, -h / 2, w, h, 9); else g.rect(-w / 2, -h / 2, w, h);
    g.fill();
    g.fillStyle = 'rgba(15, 25, 45, 0.55)';       // windshield at the front
    g.beginPath();
    if (g.roundRect) g.roundRect(-w / 2 + 4, -h / 2 + 4, w - 8, 8, 3);
    else g.rect(-w / 2 + 4, -h / 2 + 4, w - 8, 8);
    g.fill();
    g.fillStyle = 'rgba(15, 25, 45, 0.22)';       // roof / window strips
    for (let i = 0; i < 3; i++) g.fillRect(-w / 2 + 4, -1 + i * 11, w - 8, 6);
    const t = new THREE.Texture(c);
    t.needsUpdate = true;
    return t;
  }

  _buildVehicles() {
    // flat icons laid ON the surface (not billboards) so they rotate with the
    // globe and stay locked to the route — no screen-space heading to flip.
    const mk = (tex, size) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
      );
      m.scale.setScalar(size);
      m.visible = false;
      this.earth.add(m);
      return m;
    };
    this.plane = mk(this._planeSprite(), 0.17);
    this.bus = mk(this._busSprite(), 0.10);

    // dashed route line drawn on the surface (occluded by the globe on the far side)
    this._pathN = 90;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this._pathN * 3), 3));
    this.pathLine = new THREE.Line(geo, new THREE.LineDashedMaterial({
      color: 0xbfe0ff, transparent: true, opacity: 0.85,
      dashSize: 0.05, gapSize: 0.035, depthWrite: false,
    }));
    this.pathLine.visible = false;
    this._curSeg = '';
    this.earth.add(this.pathLine);
  }

  _hideVehicles() {
    this.plane.visible = false;
    this.bus.visible = false;
    if (this.pathLine) this.pathLine.visible = false;
  }

  /* true great-circle interpolation between two unit vectors */
  _slerpVec(a, b, t) {
    const dot = Math.max(-1, Math.min(1, a.dot(b)));
    const theta = Math.acos(dot);
    if (theta < 1e-4) return a.clone();
    const s = Math.sin(theta);
    return a.clone().multiplyScalar(Math.sin((1 - t) * theta) / s)
      .add(b.clone().multiplyScalar(Math.sin(t * theta) / s));
  }

  /* the path for a segment: a straight great circle, or a land route for buses */
  _pathVecs(keyA, keyB) {
    const wps = BUS_WAYPOINTS[keyA + '>' + keyB] || [];
    const pts = [
      window.LOCATIONS[keyA],
      ...wps.map(([lat, lon]) => ({ lat, lon })),
      window.LOCATIONS[keyB],
    ];
    return pts.map((p) => latLonToVec3(p.lat, p.lon, 1).normalize());
  }

  /* point a fraction t along a multi-segment great-circle path (by arc length) */
  _pointOnVecs(vecs, t) {
    if (vecs.length === 2) return this._slerpVec(vecs[0], vecs[1], t);
    const segs = []; let total = 0;
    for (let i = 0; i < vecs.length - 1; i++) {
      const a = Math.acos(Math.max(-1, Math.min(1, vecs[i].dot(vecs[i + 1]))));
      segs.push(a); total += a;
    }
    let d = t * total, i = 0;
    while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; }
    return this._slerpVec(vecs[i], vecs[i + 1], segs[i] > 1e-6 ? d / segs[i] : 0);
  }

  _setPathLine(vecs) {
    const pos = this.pathLine.geometry.attributes.position.array;
    for (let i = 0; i < this._pathN; i++) {
      const p = this._pointOnVecs(vecs, i / (this._pathN - 1)).multiplyScalar(1.014);
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    }
    this.pathLine.geometry.attributes.position.needsUpdate = true;
    this.pathLine.geometry.computeBoundingSphere();
    this.pathLine.computeLineDistances();
  }

  /* move bus or plane along the route from A to B at progress t */
  _updateVehicle(keyA, keyB, t) {
    const A = window.LOCATIONS[keyA], B = window.LOCATIONS[keyB];
    if (!A || !B) { this._hideVehicles(); return; }
    const va = latLonToVec3(A.lat, A.lon, 1).normalize();
    const vb = latLonToVec3(B.lat, B.lon, 1).normalize();
    const span = Math.acos(Math.max(-1, Math.min(1, va.dot(vb))));
    if (span < 0.03 || t <= 0.02 || t >= 0.98) { this._hideVehicles(); return; }

    const bus = OVERLAND.has(keyB);
    const seg = keyA + '>' + keyB;
    const vecs = this._pathVecs(keyA, keyB);
    if (seg !== this._curSeg) { this._curSeg = seg; if (!bus) this._setPathLine(vecs); }
    this.pathLine.visible = !bus;                 // dashed route only for flights

    const veh = bus ? this.bus : this.plane;
    (bus ? this.plane : this.bus).visible = false;

    const cur = this._pointOnVecs(vecs, t);                  // unit, earth-local
    const curWorld = cur.clone().applyQuaternion(this.earth.quaternion);
    veh.visible = curWorld.z > 0.06;                         // hide on far side / steep limb
    if (!veh.visible) return;

    // forward tangent of the path at cur (earth-local)
    let fwd;
    if (vecs.length === 2) fwd = vecs[1].clone().addScaledVector(cur, -vecs[1].dot(cur));
    else fwd = this._pointOnVecs(vecs, Math.min(1, t + 0.02)).sub(cur);
    if (fwd.lengthSq() < 1e-9) fwd.copy(vecs[vecs.length - 1]).sub(cur);

    // lay the icon flat on the surface with its nose along the path
    const n = cur;                                           // surface normal (unit)
    fwd.addScaledVector(n, -fwd.dot(n)).normalize();         // tangent within surface plane
    const right = new THREE.Vector3().crossVectors(fwd, n);
    veh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, fwd, n));
    veh.position.copy(n).multiplyScalar(bus ? 1.012 : 1.02);
  }

  /* -------------------------------------------------- orientation math */

  /* Quaternion that brings (lat,lon) to face the camera with north up. */
  orientFor(lat, lon) {
    const n = latLonToVec3(lat, lon, 1).normalize();
    const q1 = new THREE.Quaternion().setFromUnitVectors(n, ZAXIS);
    const northAfter = NORTH.clone().applyQuaternion(q1);
    const roll = Math.PI / 2 - Math.atan2(northAfter.y, northAfter.x);
    const q2 = new THREE.Quaternion().setFromAxisAngle(ZAXIS, roll);
    return q2.multiply(q1);
  }

  quatFor(key) {
    if (!this.quatCache[key]) {
      const l = window.LOCATIONS[key];
      if (!l) { console.warn('Globe: unknown location key', key); return new THREE.Quaternion(); }
      this.quatCache[key] = this.orientFor(l.lat, l.lon);
    }
    return this.quatCache[key];
  }

  /* Snap orientation to a location. */
  setKey(key) {
    const q = this.quatFor(key);
    this.earth.quaternion.copy(q);
    this.clouds.quaternion.copy(q);
    this.setActive(key);
    if (this.plane) this._hideVehicles();
  }

  /* Interpolate orientation between two locations (t: 0..1). */
  slerpBetween(keyA, keyB, t) {
    const q = this.quatFor(keyA).clone().slerp(this.quatFor(keyB), t);
    this.earth.quaternion.copy(q);
    this.clouds.quaternion.copy(q);
    this.setActive(t < 0.5 ? keyA : keyB);
    this._updateVehicle(keyA, keyB, t);
  }

  /* mark which location is "current" (drives the pin + HTML label) */
  setActive(key) {
    if (key === this.activeKey) return;
    this.activeKey = key;
    const l = window.LOCATIONS[key];
    const showPin = l && l.label !== 'Earth' && l.label !== 'The Americas';
    this.pin.visible = !!showPin;
    if (showPin) this.pin.position.copy(latLonToVec3(l.lat, l.lon, 1.006));

    const label = document.getElementById('globe-label');
    if (label) {
      if (showPin) {
        label.querySelector('.gl-title').textContent = l.label;
        label.querySelector('.gl-sub').textContent = l.sub || '';
        label.classList.add('show');
      } else {
        label.classList.remove('show');
      }
    }
  }

  /* -------------------------------------------------- per-frame */

  _updateLabel() {
    const label = document.getElementById('globe-label');
    if (!label || !this.activeKey) return;
    const l = window.LOCATIONS[this.activeKey];
    if (!l) return;
    this.tmpVec.copy(latLonToVec3(l.lat, l.lon, 1.006)).applyQuaternion(this.earth.quaternion);
    const front = this.tmpVec.z > 0.05;
    label.classList.toggle('behind', !front);
    this.tmpVec.project(this.camera);
    const x = (this.tmpVec.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-this.tmpVec.y * 0.5 + 0.5) * window.innerHeight;
    label.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const dt = this.clock.getDelta();
    this.clouds.rotateY(0.006 * dt);          // gentle cloud drift
    this.stars.rotation.y += 0.002 * dt;
    const pulse = 1 + Math.sin(this.clock.elapsedTime * 2.2) * 0.18;
    this.halo.scale.setScalar(pulse);
    this.halo.material.opacity = 0.5 + Math.sin(this.clock.elapsedTime * 2.2) * 0.35;
    this._updateLabel();
    this.renderer.render(this.scene, this.camera);
  }

  /* -------------------------------------------------- layout */

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    const pan = w < 760 ? 0 : this.panFraction;   // centre globe on mobile
    this.camera.clearViewOffset();
    this.camera.setViewOffset(w, h, -w * pan, 0, w, h);
    this.camera.position.z = w < 760 ? 3.7 : 3.05; // pull back on small screens
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}

window.Globe = Globe;
