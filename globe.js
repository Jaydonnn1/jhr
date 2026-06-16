/* ------------------------------------------------------------------ *
 *  globe.js  —  Interactive 3D Earth
 *  Renders a photoreal globe that can be oriented to any lat/lon so the
 *  location faces the camera (north up). Orientation is driven by scroll
 *  from main.js via setKey() / slerpBetween().
 * ------------------------------------------------------------------ */

const DEG = Math.PI / 180;
const ZAXIS = new THREE.Vector3(0, 0, 1);
const NORTH = new THREE.Vector3(0, 1, 0);

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
  constructor(canvas) {
    this.canvas = canvas;
    this.quatCache = {};          // key -> Quaternion
    this.activeKey = null;

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
    this._buildPlane();

    this.tmpVec = new THREE.Vector3();
    this.clock = new THREE.Clock();

    this.resize();
    this.animate();
  }

  /* -------------------------------------------------- scene contents */

  _buildEarth() {
    const loader = new THREE.TextureLoader();
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

  /* a little airliner that flies between stops as you scroll */
  _planeSprite() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.translate(64, 64);
    g.shadowColor = 'rgba(127, 196, 255, 0.95)';
    g.shadowBlur = 9;
    g.fillStyle = '#f3f8ff';
    // top-down airliner silhouette, nose pointing up (-y)
    const P = [
      [0, -46], [3.5, -30], [4, -8], [44, 12], [44, 20], [4, 8], [4, 26],
      [15, 38], [15, 43], [2, 38], [2, 47], [-2, 47], [-2, 38], [-15, 43],
      [-15, 38], [-4, 26], [-4, 8], [-44, 20], [-44, 12], [-4, -8], [-3.5, -30],
    ];
    g.beginPath();
    g.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]);
    g.closePath();
    g.fill();
    const t = new THREE.Texture(c);
    t.needsUpdate = true;
    return t;
  }

  _buildPlane() {
    const mat = new THREE.SpriteMaterial({
      map: this._planeSprite(), transparent: true,
      depthTest: false, depthWrite: false,
    });
    this.plane = new THREE.Sprite(mat);
    this.plane.scale.set(0.11, 0.11, 1);
    this.plane.visible = false;
    this.earth.add(this.plane);         // child of earth -> rides the surface
  }

  /* position the plane along the great circle from A to B at progress t */
  _updatePlane(keyA, keyB, t) {
    const A = window.LOCATIONS[keyA], B = window.LOCATIONS[keyB];
    if (!A || !B || t <= 0.03 || t >= 0.97) { this.plane.visible = false; return; }
    const va = latLonToVec3(A.lat, A.lon, 1).normalize();
    const vb = latLonToVec3(B.lat, B.lon, 1).normalize();
    const cur = va.clone().lerp(vb, t).normalize();
    const curWorld = cur.clone().applyQuaternion(this.earth.quaternion);
    if (curWorld.z <= 0.03) { this.plane.visible = false; return; }   // far side
    const alt = 1.05 + Math.sin(t * Math.PI) * 0.08;                  // arc up then land
    this.plane.position.copy(cur).multiplyScalar(alt);
    this.plane.visible = true;
    // heading: face the direction of travel in screen space
    const ahead = va.clone().lerp(vb, Math.min(1, t + 0.03)).normalize()
      .applyQuaternion(this.earth.quaternion).project(this.camera);
    const here = curWorld.clone().project(this.camera);
    this.plane.material.rotation = Math.atan2(ahead.y - here.y, ahead.x - here.x) - Math.PI / 2;
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
    if (this.plane) this.plane.visible = false;
  }

  /* Interpolate orientation between two locations (t: 0..1). */
  slerpBetween(keyA, keyB, t) {
    const q = this.quatFor(keyA).clone().slerp(this.quatFor(keyB), t);
    this.earth.quaternion.copy(q);
    this.clouds.quaternion.copy(q);
    this.setActive(t < 0.5 ? keyA : keyB);
    this._updatePlane(keyA, keyB, t);
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
