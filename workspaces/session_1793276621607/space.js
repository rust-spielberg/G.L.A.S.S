window.addEventListener('DOMContentLoaded', () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  // Camera spherical coordinates
  let radius = 120, theta = 0, phi = Math.PI / 2;
  const updateCamera = () => {
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
  };
  updateCamera();

  // Lights
  const sunLight = new THREE.PointLight(0xffffff, 2, 0);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0x404040, 0.5));

  // Starfield
  const starGeo = new THREE.BufferGeometry();
  const starCount = 1000;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 400;
    const thetaS = Math.random() * Math.PI * 2;
    const phiS = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phiS) * Math.cos(thetaS);
    positions[i * 3 + 1] = r * Math.sin(phiS) * Math.sin(thetaS);
    positions[i * 3 + 2] = r * Math.cos(phiS);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 });
  scene.add(new THREE.Points(starGeo, starMat));

  // Sun
  const sunGeo = new THREE.SphereGeometry(10, 32, 32);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd27f, emissive: 0xffa500 });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  scene.add(sun);

  // Planet definitions
  const planets = [
    { name: 'Mercury', color: 0xaaaaaa, size: 2, distance: 20, speed: 0.04 },
    { name: 'Venus',   color: 0xffc870, size: 3, distance: 30, speed: 0.015 },
    { name: 'Earth',   color: 0x2a75ff, size: 3.2, distance: 40, speed: 0.01, hasMoon: true },
    { name: 'Mars',    color: 0xff4500, size: 2.5, distance: 50, speed: 0.008 },
    { name: 'Jupiter', color: 0xd2b48c, size: 7, distance: 70, speed: 0.004 },
    { name: 'Saturn',  color: 0xf5deb3, size: 6, distance: 90, speed: 0.003 }
  ];

  const planetGroup = new THREE.Group();
  const orbitGroup = new THREE.Group();
  const moonGroup = new THREE.Group();
  scene.add(planetGroup, orbitGroup, moonGroup);

  planets.forEach(p => {
    const geo = new THREE.SphereGeometry(p.size, 24, 24);
    const mat = new THREE.MeshStandardMaterial({ color: p.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(p.distance, 0, 0);
    mesh.userData = { name: p.name, distance: p.distance };
    planetGroup.add(mesh);

    // Orbit line
    const orbitGeo = new THREE.CircleGeometry(p.distance, 64);
    orbitGeo.rotateX(-Math.PI / 2);
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x555555 });
    const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
    orbitGroup.add(orbitLine);

    // Moon (Earth only)
    if (p.hasMoon) {
      const moonGeo = new THREE.SphereGeometry(0.8, 16, 16);
      const moonMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
      const moon = new THREE.Mesh(moonGeo, moonMat);
      moon.userData = { name: 'Moon' };
      moonGroup.add(moon);
    }

    // Saturn ring
    if (p.name === 'Saturn') {
      const ringGeo = new THREE.RingGeometry(p.size + 0.5, p.size + 2, 32);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xc2b280,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      mesh.add(ring);
    }
  });

  // Mouse controls
  let isDragging = false, prevX = 0, prevY = 0;
  const onMouseDown = e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; };
  const onMouseMove = e => {
    if (!isDragging) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    theta -= dx * 0.005;
    phi = Math.min(Math.max(phi + dy * 0.005, 0.1), Math.PI - 0.1);
    prevX = e.clientX; prevY = e.clientY;
    updateCamera();
  };
  const onMouseUp = () => { isDragging = false; };
  const onWheel = e => {
    radius = Math.min(Math.max(radius + e.deltaY * 0.05, 30), 300);
    updateCamera();
  };
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('mouseup', onMouseUp);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

  // UI elements
  const speedSlider = document.getElementById('speedSlider');
  const resetBtn = document.getElementById('resetCamBtn');
  const infoDiv = document.getElementById('planetInfo');
  resetBtn.addEventListener('click', () => {
    radius = 120; theta = 0; phi = Math.PI / 2;
    updateCamera();
  });

  // Raycaster for hover info
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const onMouseHover = e => {
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersectObjs = planetGroup.children.concat(moonGroup.children);
    const intersects = raycaster.intersectObjects(intersectObjs);
    if (intersects.length > 0) {
      infoDiv.textContent = intersects[0].object.userData.name;
    } else {
      infoDiv.textContent = 'Hover over a planet';
    }
  };
  renderer.domElement.addEventListener('mousemove', onMouseHover);

  // Animation loop
  const clock = new THREE.Clock();
  const animate = () => {
    const delta = clock.getDelta();
    const speedFactor = parseFloat(speedSlider.value);
    planetGroup.children.forEach((planet, i) => {
      const data = planets[i];
      const angle = delta * data.speed * speedFactor;
      planet.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    });
    // Moon orbit (Earth is index 2)
    const earth = planetGroup.children[2];
    moonGroup.children.forEach(moon => {
      const angle = delta * 0.05 * speedFactor;
      const dir = new THREE.Vector3().subVectors(moon.position, earth.position);
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      dir.setLength(5);
      moon.position.copy(earth.position).add(dir);
    });
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  animate();

  // Resize handling
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
});