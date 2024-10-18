import * as THREE from "three";
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


// Global variables
let scene, camera, renderer, sphere, sphereBody, world, spotLight;
let yaw = 0, pitch = 0;
let cameraMode = 'third-person'; // Initialize in third-person mode
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    s: false,
    a: false,
    d: false,
    ' ': false,
    v: false
};
let mouseDown = false;

// Mouse sensitivity settings
const mouseSensitivity = 0.002;
const pitchLimit = Math.PI / 3;

// Initialize physics world and setup
function initPhysics() {
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0); // Gravity pointing downwards

    // Sphere physics body
    const sphereShape = new CANNON.Sphere(1);
    sphereBody = new CANNON.Body({
        mass: 5,
        position: new CANNON.Vec3(0, 10, 0), // Center above the ground
        shape: sphereShape,
        material: new CANNON.Material({ restitution: 0.5 }) // Bounce effect
    });

    // Apply linear damping to simulate friction
    sphereBody.linearDamping = 0.5;

    world.addBody(sphereBody);

    // Plane physics body
    const planeShape = new CANNON.Plane();
    const planeBody = new CANNON.Body({
        mass: 0, // Static object
        shape: planeShape
    });
    planeBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(planeBody);
}


function loadSoccerBall() {
    const loader = new GLTFLoader();
    loader.load(
        // Path to your 3D model file (relative or absolute URL)
        './Simple_soccer_football.glb', 
        (gltf) => {
            // Called when the resource is loaded
            const model = gltf.scene;
            model.castShadow = true;
            model.receiveShadow = true;

            // Position, scale, and rotation settings for the model
            model.position.set(0, 0, 0);
            model.scale.set(1, 1, 1); // Adjust scale if needed

            // Add the model to the scene
            scene.add(model);
        },
        (xhr) => {
            // Called while loading is progressing
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
            // Called if an error occurs
            console.error('An error occurred loading the model', error);
        }
    );
}


// Initialize Three.js scene
function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    loadSoccerBall();

    const canvasContainer = document.getElementById('canvasContainer');
    renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Better shadow quality
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    canvasContainer.appendChild(renderer.domElement);

    // Sphere setup
    const sphereGeometry = new THREE.SphereGeometry(1, 50, 50);
    const sphereMaterial = new THREE.MeshStandardMaterial({
        color: 'cyan',
        wireframe: false
    });
    sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);
    sphere.castShadow = true;

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

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);

    spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(-30, 60, 60);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.5;
    spotLight.decay = 2;
    spotLight.distance = 200;
    spotLight.intensity = 50000;
    spotLight.castShadow = true;
    scene.add(spotLight);

    const sLightHelper = new THREE.SpotLightHelper(spotLight);
    scene.add(sLightHelper);


    const gridHelper = new THREE.GridHelper(100, 100);
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(10);
    scene.add(axesHelper);

    // Camera initial position
    camera.position.set(0, 20, 50);
    camera.lookAt(0, 0, 0);
}

// Setup event listeners for keyboard and mouse controls
function setupControls() {
    window.addEventListener('keydown', (event) => {
        if (keys.hasOwnProperty(event.key)) {
            keys[event.key] = true;
        }
        if (event.key === 'v') {
            toggleCameraMode();
        }
    });

    window.addEventListener('keyup', (event) => {
        if (keys.hasOwnProperty(event.key)) {
            keys[event.key] = false;
        }
    });

    window.addEventListener('mousedown', () => { mouseDown = true; });
    window.addEventListener('mouseup', () => { mouseDown = false; });

    window.addEventListener('mousemove', (event) => {
        if (mouseDown) {
            yaw -= event.movementX * mouseSensitivity;
            pitch -= event.movementY * mouseSensitivity;

            // Clamp pitch to prevent flipping
            pitch = Math.max(-pitchLimit, Math.min(pitchLimit, pitch));
        }
    });
}

// Toggle between first-person and third-person camera modes
function toggleCameraMode() {
    if (cameraMode === 'third-person') {
        cameraMode = 'first-person';
    } else {
        cameraMode = 'third-person';
    }
}

// Animate function that updates the scene and physics
function animate() {
    world.step(1 / 60);

    // Update sphere position based on physics
    sphere.position.copy(sphereBody.position);
    sphere.quaternion.copy(sphereBody.quaternion);

    // Calculate movement based on keys pressed
    updateMovement();

    // Update the camera position and direction
    updateCamera();

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// Update movement logic for the sphere
function updateMovement() {
    const moveForward = keys.ArrowUp || keys.w;
    const moveBackward = keys.ArrowDown || keys.s;
    const moveLeft = keys.ArrowLeft || keys.a;
    const moveRight = keys.ArrowRight || keys.d;

    // Get the forward direction based on the camera orientation
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0; // Ignore the y-component for horizontal movement
    cameraDirection.normalize();

    // The right vector is perpendicular to the forward direction
    const rightVector = new THREE.Vector3().crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();

    // Apply velocity based on input
    if (moveForward) {
        sphereBody.velocity.x += cameraDirection.x * 20 * (1 / 60);
        sphereBody.velocity.z += cameraDirection.z * 20 * (1 / 60);
    }
    if (moveBackward) {
        sphereBody.velocity.x -= cameraDirection.x * 20 * (1 / 60);
        sphereBody.velocity.z -= cameraDirection.z * 20 * (1 / 60);
    }
    if (moveLeft) {
        sphereBody.velocity.x -= rightVector.x * 20 * (1 / 60);
        sphereBody.velocity.z -= rightVector.z * 20 * (1 / 60);
    }
    if (moveRight) {
        sphereBody.velocity.x += rightVector.x * 20 * (1 / 60);
        sphereBody.velocity.z += rightVector.z * 20 * (1 / 60);
    }

    // Jump action
    const isOnGround = Math.abs(sphereBody.position.y - 4) < 0.1 && sphereBody.velocity.y <= 0.01;
    if (keys[' '] && isOnGround) {
        sphereBody.velocity.y = 25;
    }
}


// Update camera to follow the sphere based on the current mode
function updateCamera() {
    if (cameraMode === 'third-person') {
        const cameraDistance = 30;
        const cameraX = sphere.position.x + cameraDistance * Math.sin(yaw) * Math.cos(pitch);
        const cameraY = sphere.position.y + cameraDistance * Math.sin(pitch);
        const cameraZ = sphere.position.z + cameraDistance * Math.cos(yaw) * Math.cos(pitch);
        camera.position.set(cameraX, cameraY, cameraZ);
    } else if (cameraMode === 'first-person') {
        // Position camera slightly above and behind the sphere for a first-person view
        const cameraX = sphere.position.x + 5 * Math.sin(yaw);
        const cameraY = sphere.position.y + 6;
        const cameraZ = sphere.position.z + 5 * Math.cos(yaw);
        camera.position.set(cameraX, cameraY, cameraZ);
    }

    camera.lookAt(sphere.position);
}

// Event listener for the start button
document.getElementById('startButton').addEventListener('click', () => {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('canvasContainer').style.display = 'block';

    initPhysics();
    initScene();
    setupControls();
    animate();
});

// Other menu options
document.getElementById('levelButton').addEventListener('click', () => {
    alert("Select Level clicked!");
});

document.getElementById('optionsButton').addEventListener('click', () => {
    alert("Options menu clicked!");
});

document.getElementById('quitButton').addEventListener('click', () => {
    alert("Quit option clicked!");
});
