import * as THREE from "three";
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MazeWorld } from './world_maze.js';
import { wallsData } from '/scripts/wallsData.js';

// Global variables
let mazeWorld, scene, camera, renderer, spotLight;
let soccerBall, soccerBallBody;
let orbitControls;

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

let mouseDown = false;

const mouseSensitivity = 0.002;
const pitchLimit = Math.PI / 3;

function initGame() {
    initPhysics();
    initScene();
    setupControls();
    animate();
}

function initPhysics() {

    // Initialize MazeWorld and set up physics
    mazeWorld = new MazeWorld();
    mazeWorld.createMaze(wallsData);
    scene = mazeWorld.scene;

    // Soccer ball setup
    const sphereShape = new CANNON.Sphere(1); // Radius of the ball
    soccerBallBody = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0, 5, 0), // Start position of the ball
        shape: sphereShape,
        material: new CANNON.Material({ restitution: 0.6 }) // Bounciness
    });

    soccerBallBody.linearDamping = 0.5; // Damping to slow down over time
    mazeWorld.addBody(soccerBallBody);

    createSoccerBall(); // Create the visual representation of the ball

}

function createSoccerBall() {
    
    const geometry = new THREE.SphereGeometry(1, 32, 32); // Radius = 1, detail = 32
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red ball
    soccerBall = new THREE.Mesh(geometry, material);
    soccerBall.castShadow = true;
    soccerBall.receiveShadow = true;

    // Initial positioning of the ball in the scene
    soccerBall.position.copy(soccerBallBody.position);
    scene.add(soccerBall);
}

function initScene() {
    
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    const canvasContainer = document.getElementById('canvasContainer');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x87CEEB);
    canvasContainer.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff);
    mazeWorld.addToScene(ambientLight);

    spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(-30, 60, 60);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.5;
    spotLight.decay = 2;
    spotLight.distance = 200;
    spotLight.intensity = 2;
    spotLight.castShadow = true;
    mazeWorld.addToScene(spotLight);

    camera.position.set(0, 80, 0);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Add OrbitControls for camera control
    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.enableZoom = true;
    orbitControls.minDistance = 10;
    orbitControls.maxDistance = 100;
}

function animate() {
    
    requestAnimationFrame(animate);
    mazeWorld.update();

    updateMovement();

    if (soccerBall) {
        soccerBall.position.copy(soccerBallBody.position);
        soccerBall.quaternion.copy(soccerBallBody.quaternion);
    }

    // Update controls
    orbitControls.update();

    // Render the scene
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
