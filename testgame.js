import * as THREE from "three";
import WebGL from 'three/addons/capabilities/WebGL.js';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from 'dat.gui';
import * as CANNON from 'cannon-es'; // Use cannon-es for better compatibility

// Setup Cannon.js physics world
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Gravity pointing downwards

// Key press tracking
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    s: false,
    a: false,
    d: false,
    ' ': false
};

window.addEventListener('keydown', (event) => {
    if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = true;
    }
});

window.addEventListener('keyup', (event) => {
    if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = false;
    }
});

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000); // Set background color to black
document.body.appendChild(renderer.domElement);

// Sphere setup
const sphereGeometry = new THREE.SphereGeometry(4, 50, 50);
const sphereMaterial = new THREE.MeshStandardMaterial({
    color: 'cyan',
    wireframe: false
});
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);
sphere.castShadow = true;

// Sphere physics body
const sphereShape = new CANNON.Sphere(4);
const sphereBody = new CANNON.Body({
    mass: 5,
    position: new CANNON.Vec3(0, 10, 0), // Center above the ground
    shape: sphereShape,
    material: new CANNON.Material({ restitution: 0.5 }) // Bounce effect
});
world.addBody(sphereBody);

// Plane setup
const planeGeometry = new THREE.PlaneGeometry(100, 100);
const planeMaterial = new THREE.MeshStandardMaterial({
    color: 'orange',
    side: THREE.DoubleSide
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
scene.add(plane);
plane.rotation.x = -0.5 * Math.PI;
plane.receiveShadow = true;

// Plane physics body
const planeShape = new CANNON.Plane();
const planeBody = new CANNON.Body({
    mass: 0, // Static object
    shape: planeShape
});
planeBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(planeBody);

// Lighting setup
const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffffff, 1);
spotLight.position.set(-100, 100, 0);
spotLight.angle = Math.PI / 6;
spotLight.castShadow = true;
scene.add(spotLight);

const sLightHelper = new THREE.SpotLightHelper(spotLight);
scene.add(sLightHelper);

// Grid and axes helpers
const gridHelper = new THREE.GridHelper(100, 100);
scene.add(gridHelper);

const axesHelper = new THREE.AxesHelper(10);
scene.add(axesHelper);

// Camera and orbit controls
const orbit = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 20, 50);
camera.lookAt(0, 0, 0);
orbit.update();

// GUI controls
const gui = new dat.GUI();
const options = {
    sphereColor: '#ffea00',
    wireframe: false,
    speed: 0.01
};

gui.addColor(options, 'sphereColor').onChange((e) => {
    sphere.material.color.set(e);
});

gui.add(options, 'wireframe').onChange((e) => {
    sphere.material.wireframe = e;
});

gui.add(options, 'speed', 0, 0.1);

let isJumping = false;

// Animation function
function animate() {
    // Update the physics world
    world.step(1 / 60);

    // Check if the sphere is on the ground
    const isOnGround = Math.abs(sphereBody.position.y - sphereShape.radius) < 0.1;

    // Apply movement based on key presses
    const speed = 5;
    if (keys.ArrowUp || keys.w) {
        sphereBody.velocity.z = -speed;
    } else if (keys.ArrowDown || keys.s) {
        sphereBody.velocity.z = speed;
    } else {
        sphereBody.velocity.z = 0; // Stop moving forward/backward
    }

    if (keys.ArrowLeft || keys.a) {
        sphereBody.velocity.x = -speed;
    } else if (keys.ArrowRight || keys.d) {
        sphereBody.velocity.x = speed;
    } else {
        sphereBody.velocity.x = 0; // Stop moving left/right
    }

    // Jump logic when space is pressed and sphere is on the ground
    if (keys[' '] && isOnGround && !isJumping) {
        sphereBody.velocity.y = 10; // Jump velocity
        isJumping = true;
    }

    // Reset jump state when sphere is on the ground again
    if (isOnGround && sphereBody.velocity.y === 0) {
        isJumping = false;
    }

    // Sync Three.js sphere with Cannon.js body
    sphere.position.copy(sphereBody.position);
    sphere.quaternion.copy(sphereBody.quaternion);

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
