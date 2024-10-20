import * as THREE from "three";
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MazeWorld } from './world_maze.js';

// Global variables
let modelMaze, mazeWorld, scene, camera, renderer, soccerBall, soccerBallBody, spotLight;
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
    v: false
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
    mazeWorld = new MazeWorld();

    const wallsData = [
        { x: 0, z: 50, length: 100.5, height: 7, isAlignedWithZ: 0 },
        { x: -50, z: 0, length: 100.5, height: 7, isAlignedWithZ: 1 },
        { x: 0, z: -50, length: 100.5, height: 7, isAlignedWithZ: 0 },
        { x: 50, z: 0, length: 100.5, height: 7, isAlignedWithZ: 1 },

    ];

    mazeWorld.createMaze(wallsData);

    scene = mazeWorld.scene;

    // Soccer ball setup commented out as we won't control it anymore
    /*
    const sphereShape = new CANNON.Sphere(0.5);
    soccerBallBody = new CANNON.Body({
        mass: 5,
        position: mazeWorld.getStartPosition(),
        shape: sphereShape,
        material: new CANNON.Material({ restitution: 0.5 })
    });

    soccerBallBody.linearDamping = 0.5;
    mazeWorld.addBody(soccerBallBody);
    */
}

function loadSoccerBall() {
    const loader = new GLTFLoader();
    loader.load(
        './models/soccer_ball.glb',
        (gltf) => {
            soccerBall = gltf.scene;
            soccerBall.castShadow = true;
            soccerBall.receiveShadow = true;

            // Position the soccer ball in the scene
            // soccerBall.position.copy(soccerBallBody.position);
            soccerBall.scale.set(0.5, 0.5, 0.5);

            mazeWorld.addToScene(soccerBall);
            // camera.lookAt(soccerBall.position);
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
            console.error('An error occurred loading the model', error);
        }
    );
}

function loadMaze() {
    const loader = new OBJLoader();
    loader.load(
        './models/modelMaze.obj',
        (object) => {
            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            object.scale.set(5, 1, 5); // Adjust the scale as needed
            object.position.set(0, 0, 0); // Adjust the position as needed
            scene.add(object); // Add the loaded object to the scene
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
            console.error('An error occurred loading the model', error);
        }
    );
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

    loadSoccerBall();
    loadMaze();

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

    // Commented out soccer ball position updates
    /*
    if (soccerBall) {
        soccerBall.position.copy(soccerBallBody.position);
        soccerBall.quaternion.copy(soccerBallBody.quaternion);
    }
    */

    // Update controls
    orbitControls.update();

    // Rendering the scene
    renderer.render(scene, camera);
}

// Commented out the updateMovement function
/*
function updateMovement() {
    const moveForward = keys.ArrowUp || keys.w;
    const moveBackward = keys.ArrowDown || keys.s;
    const moveLeft = keys.ArrowLeft || keys.a;
    const moveRight = keys.ArrowRight || keys.d;

    const forwardVector = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    const rightVector = new THREE.Vector3().crossVectors(forwardVector, new THREE.Vector3(0, 1, 0)).normalize();

    const force = 10;
    if (moveForward) {
        soccerBallBody.applyForce(new CANNON.Vec3(-forwardVector.x * force, 0, -forwardVector.z * force), soccerBallBody.position);
    }
    if (moveBackward) {
        soccerBallBody.applyForce(new CANNON.Vec3(forwardVector.x * force, 0, forwardVector.z * force), soccerBallBody.position);
    }
    if (moveLeft) {
        soccerBallBody.applyForce(new CANNON.Vec3(rightVector.x * force, 0, rightVector.z * force), soccerBallBody.position);
    }
    if (moveRight) {
        soccerBallBody.applyForce(new CANNON.Vec3(-rightVector.x * force, 0, -rightVector.z * force), soccerBallBody.position);
    }

    const isOnGround = Math.abs(soccerBallBody.position.y - 0.5) < 0.1 && soccerBallBody.velocity.y <= 0.01;
    if (keys[' '] && isOnGround) {
        soccerBallBody.velocity.y = 5;
    }
}
*/

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
// Event listener for the start button
// document.getElementById('startButton').addEventListener('click', () => {
//     document.getElementById('menu').style.display = 'none';
//     document.getElementById('canvasContainer').style.display = 'block';
//     initGame();
// });

// // Other menu options
// document.getElementById('levelButton').addEventListener('click', () => {
//     alert("Select Level clicked!");
// });

// document.getElementById('optionsButton').addEventListener('click', () => {
//     alert("Options menu clicked!");
// });

// document.getElementById('quitButton').addEventListener('click', () => {
//     alert("Quit option clicked!");
// });
