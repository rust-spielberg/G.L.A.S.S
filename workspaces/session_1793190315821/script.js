const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('solarSystemCanvas') });
renderer.setSize(window.innerWidth, window.innerHeight);

const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

const planets = [
    { name: 'Mercury', geometry: new THREE.SphereGeometry(1, 32, 32), material: new THREE.MeshBasicMaterial({ color: 0x999999 }) },
    { name: 'Venus', geometry: new THREE.SphereGeometry(1.5, 32, 32), material: new THREE.MeshBasicMaterial({ color: 0xffaa00 }) },
    { name: 'Earth', geometry: new THREE.SphereGeometry(1.8, 32, 32), material: new THREE.MeshBasicMaterial({ color: 0x0077ff }) },
    { name: 'Mars', geometry: new THREE.SphereGeometry(1.6, 32, 32), material: new THREE.MeshBasicMaterial({ color: 0xff0000 }) },
    { name: 'Jupiter', geometry: new THREE.SphereGeometry(5, 32, 32), material: new THREE.MeshBasicMaterial({ color: 0xffaa00 }) },
    { name: 'Saturn', geometry: new THREE.SphereGeometry(4, 32, 32), material: new THREE.MeshBasicMaterial({ color: 0xffaa00 }) },
    { name: 'Uranus', geometry: new THREE.SphereGeometry(3, 32, 32), material: new THREE.MeshBasicMaterial({ color: 0x0077ff }) },
    { name: 'Neptune', geometry: new THREE.SphereGeometry(3, 32, 32), material: new THREE.MeshBasicMaterial({ color: 0x0000ff }) }
];

planets.forEach((planet, index) => {
    const planetMesh = new THREE.Mesh(planet.geometry, planet.material);
    planetMesh.position.set(10 * (index + 1), 0, 0);
    scene.add(planetMesh);
});

camera.position.z = 20;

let orbitSpeed = 1;
let isPaused = false;

function animate() {
    if (!isPaused) {
        planets.forEach((planet, index) => {
            planetMeshes[index].rotation.y += orbitSpeed * 0.01;
        });
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

const planetMeshes = planets.map(planet => planetMesh);

document.getElementById('pauseBtn').addEventListener('click', () => isPaused = true);
document.getElementById('resumeBtn').addEventListener('click', () => isPaused = false);
document.getElementById('zoomInBtn').addEventListener('click', () => camera.position.z -= 1);
document.getElementById('zoomOutBtn').addEventListener('click', () => camera.position.z += 1);
document.getElementById('orbitSpeed').addEventListener('input', (e) => orbitSpeed = e.target.value);

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const planetInfo = document.getElementById('planetInfo');
const planetName = document.getElementById('planetName');
const planetDesc = document.getElementById('planetDesc');

planetMeshes.forEach((planetMesh, index) => {
    planetMesh.addEventListener('click', () => {
        planetName.textContent = planets[index].name;
        planetDesc.textContent = `Key Facts: ${planets[index].name} is the ${index + 1}th planet from the Sun.`;
    });
});