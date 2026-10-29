// ----- Core Three.js Setup -----
const canvas = document.getElementById('glCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000010);

// ----- Camera (spherical coordinates) -----
let camRadius = 80, camTheta = 0, camPhi = Math.PI / 6;
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
updateCamera();

function updateCamera() {
    const x = camRadius * Math.sin(camPhi) * Math.cos(camTheta);
    const y = camRadius * Math.cos(camPhi);
    const z = camRadius * Math.sin(camPhi) * Math.sin(camTheta);
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
}

// ----- Resize Handling -----
window.addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
});

// ----- Lighting -----
scene.add(new THREE.AmbientLight(0x404040, 0.5));
const sunLight = new THREE.PointLight(0xffffff, 1.5, 0);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// ----- Starfield Background -----
{
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
        const r = 400;
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
}

// ----- Sun -----
{
    const sunGeo = new THREE.SphereGeometry(5, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, emissive: 0xffaa00 });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sun);
}

// ----- Planet Definitions -----
const planetData = [
    { name: 'Mercury', size: 1, dist: 12, color: 0xaaaaaa, orbitSpeed: 4.15 },
    { name: 'Venus', size: 1.2, dist: 16, color: 0xffddaa, orbitSpeed: 1.62 },
    { name: 'Earth', size: 1.3, dist: 20, color: 0x2233ff, orbitSpeed: 1, hasMoon: true },
    { name: 'Mars', size: 1, dist: 26, color: 0xff5533, orbitSpeed: 0.53 },
    { name: 'Jupiter', size: 3, dist: 35, color: 0xffaa77, orbitSpeed: 0.08 },
    { name: 'Saturn', size: 2.5, dist: 45, color: 0xffdd77, orbitSpeed: 0.03, hasRing: true }
];
const planets = [];

// ----- Create Planets & Orbits -----
planetData.forEach(data => {
    const group = new THREE.Object3D(); // Handles orbital rotation
    scene.add(group);

    // Orbit path (LineLoop)
    const points = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * data.dist, 0, Math.sin(angle) * data.dist));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x555555 });
    const orbit = new THREE.LineLoop(orbitGeo, orbitMat);
    group.add(orbit);

    // Planet mesh
    const geo = new THREE.SphereGeometry(data.size, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ color: data.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(data.dist, 0, 0);
    mesh.userData = { name: data.name };
    group.add(mesh);

    const planetRecord = { mesh, data, group };

    // Moon (Earth)
    if (data.hasMoon) {
        const moonGroup = new THREE.Object3D();
        mesh.add(moonGroup);
        const moonGeo = new THREE.SphereGeometry(0.35, 16, 16);
        const moonMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const moon = new THREE.Mesh(moonGeo, moonMat);
        moon.position.set(2, 0, 0);
        moonGroup.add(moon);
        planetRecord.moonGroup = moonGroup;
    }

    // Ring (Saturn)
    if (data.hasRing) {
        const ringGeo = new THREE.RingGeometry(data.size + 0.2, data.size + 0.8, 64);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0xddddaa,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        mesh.add(ring);
    }

    planets.push(planetRecord);
});

// ----- Mouse Controls (Orbit Camera) -----
let isDragging = false, prevX = 0, prevY = 0;
canvas.addEventListener('mousedown', e => {
    isDragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
});
canvas.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const deltaX = e.clientX - prevX;
    const deltaY = e.clientY - prevY;
    prevX = e.clientX;
    prevY = e.clientY;
    camTheta -= deltaX * 0.005;
    camPhi -= deltaY * 0.005;
    camPhi = Math.max(0.1, Math.min(Math.PI - 0.1, camPhi));
    updateCamera();
});
canvas.addEventListener('mouseup', () => { isDragging = false; });
canvas.addEventListener('mouseleave', () => { isDragging = false; });
canvas.addEventListener('wheel', e => {
    camRadius += e.deltaY * 0.05;
    camRadius = Math.max(30, Math.min(200, camRadius));
    updateCamera();
});

// ----- UI Interactions -----
const speedSlider = document.getElementById('speedSlider');
const resetBtn = document.getElementById('resetCamBtn');
const infoDiv = document.getElementById('planetInfo');

resetBtn.addEventListener('click', () => {
    camTheta = 0;
    camPhi = Math.PI / 6;
    camRadius = 80;
    updateCamera();
});

// ----- Raycaster for Planet Info -----
const raycaster = new THREE.Raycaster();
canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planets.map(p => p.mesh));
    if (intersects.length > 0) {
        const name = intersects[0].object.userData.name;
        infoDiv.textContent = `Planet: ${name}`;
    } else {
        infoDiv.textContent = 'Click a planet';
    }
});

// ----- Animation Loop -----
function animate() {
    requestAnimationFrame(animate);
    const speed = parseFloat(speedSlider.value);
    planets.forEach(p => {
        p.group.rotation.y += (p.data.orbitSpeed * speed) * 0.001;
        p.mesh.rotation.y += 0.01;
        if (p.moonGroup) p.moonGroup.rotation.y += 0.03;
    });
    renderer.render(scene, camera);
}
animate();