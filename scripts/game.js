import * as THREE from "three";
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { wallsData } from '/scripts/wallsData.js';

// Global variables
let scene, camera, renderer, physicsWorld;
let soccerBall, soccerBallBody;
let orbitControls;
let walls = [];

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
};

const cellSize = 5;
const wallThickness = 1.5;

function initGame() {
    initScene();
    initPhysics();
    createFloor();
    createMaze(wallsData);
    createSoccerBall();
    setupControls();
    setupLights();
    animate();
}

function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 80, 0);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    const canvasContainer = document.getElementById('canvasContainer');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    canvasContainer.appendChild(renderer.domElement);

    // Add OrbitControls for camera control
    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.enableZoom = true;
    orbitControls.minDistance = 10;
    orbitControls.maxDistance = 100;
}

function initPhysics() {
    physicsWorld = new CANNON.World();
    physicsWorld.gravity.set(0, -9.82, 0);
}

function createFloor() {
    const floorSize = 100;
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: "orange",
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.2
    });

    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const gridHelper = new THREE.GridHelper(100, 100);
    scene.add(gridHelper);

    const floorShape = new CANNON.Plane();
    const floorBody = new CANNON.Body({ mass: 0 });
    floorBody.addShape(floorShape);
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    physicsWorld.addBody(floorBody);
}

function createWall(x, z, length, height, isAlignedWithZ) {
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: "cyan",
        roughness: 0.7,
        metalness: 0.3
    });

    const wallGeometry = new THREE.BoxGeometry(
        isAlignedWithZ ? wallThickness : length,
        height,
        isAlignedWithZ ? length : wallThickness
    );
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    wallMesh.position.set(x, height / 2, z);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    scene.add(wallMesh);

    const wallShape = new CANNON.Box(new CANNON.Vec3(
        isAlignedWithZ ? wallThickness / 2 : length / 2,
        height / 2,
        isAlignedWithZ ? length / 2 : wallThickness / 2
    ));
    const wallBody = new CANNON.Body({ mass: 0 });
    wallBody.addShape(wallShape);
    wallBody.position.copy(wallMesh.position);
    physicsWorld.addBody(wallBody);

    walls.push({ mesh: wallMesh, body: wallBody });
}

function createMaze(wallsData) {
    for (const wall of wallsData) {
        createWall(wall.x, wall.z, wall.length, wall.height, wall.isAlignedWithZ);
    }
}

function createSoccerBall() {
    // Create Cannon.js physics body for the ball
    const sphereShape = new CANNON.Sphere(1);
    soccerBallBody = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0, 5, 0),
        shape: sphereShape,
        material: new CANNON.Material({ restitution: 0.6 })
    });
    soccerBallBody.linearDamping = 0.5;
    physicsWorld.addBody(soccerBallBody);

    // Create a Three.js material with emissive glow
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0xff0000,   // Red color for the ball
        emissive: 0xff0000, // Emissive glow in red
        emissiveIntensity: 1.5, // Glow strength
        roughness: 0.4,
        metalness: 0.2,
        wireframe: false
    });

    // Create the soccer ball mesh
    soccerBall = new THREE.Mesh(geometry, material);
    soccerBall.castShadow = true;
    soccerBall.receiveShadow = true;
    soccerBall.position.copy(soccerBallBody.position);
    scene.add(soccerBall);

    // Create a point light attached to the soccer ball
// Add this after creating the PointLight
const ballLight = new THREE.PointLight(0xffffff, 100, 100);  // Light intensity 2, range 10
soccerBall.add(ballLight);  // Attach the light to the soccer ball

// Create a light helper to visualize the light's range
const lightHelper = new THREE.PointLightHelper(ballLight, 2); // Adjust size as needed
scene.add(lightHelper);
  // Attach the light to the ball
}


function setupLights() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    scene.add(ambientLight);

    // const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    // directionalLight.position.set(10, 20, 10);
    // directionalLight.castShadow = true;
    // scene.add(directionalLight);

    // const pointLight = new THREE.PointLight(0xffffff, 20, 100);
    // pointLight.position.set(0, 10, 0);
    // pointLight.castShadow = true;
    // scene.add(pointLight);
}

function animate() {
    requestAnimationFrame(animate);
    physicsWorld.step(1 / 60);

    updateMovement();

    if (soccerBall) {
        soccerBall.position.copy(soccerBallBody.position);
        soccerBall.quaternion.copy(soccerBallBody.quaternion);
    }

    orbitControls.update();
    renderer.render(scene, camera);
}

function updateMovement() {
    const moveForward = keys.ArrowUp || keys.w;
    const moveBackward = keys.ArrowDown || keys.s;
    const moveLeft = keys.ArrowLeft || keys.a;
    const moveRight = keys.ArrowRight || keys.d;

    const force = 10;
    const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);

    if (moveForward) {
        soccerBallBody.applyForce(new CANNON.Vec3(forwardVector.x * force, 0, forwardVector.z * force), soccerBallBody.position);
    }
    if (moveBackward) {
        soccerBallBody.applyForce(new CANNON.Vec3(-forwardVector.x * force, 0, -forwardVector.z * force), soccerBallBody.position);
    }
    if (moveLeft) {
        soccerBallBody.applyForce(new CANNON.Vec3(-rightVector.x * force, 0, -rightVector.z * force), soccerBallBody.position);
    }
    if (moveRight) {
        soccerBallBody.applyForce(new CANNON.Vec3(rightVector.x * force, 0, rightVector.z * force), soccerBallBody.position);
    }
}

function setupControls() {
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
}

initGame();