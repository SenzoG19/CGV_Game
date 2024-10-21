import * as THREE from "three";
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MazeWorld } from './world_maze.js';

// Global variables
let modelMaze, mazeWorld, scene, camera, renderer, spotLight;
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

    const wallsData = [
        { x: 0, z: 50, length: 101.5, height: 7, isAlignedWithZ: 0 },
        { x: -50, z: 0, length: 101.5, height: 7, isAlignedWithZ: 1 },
        { x: 0, z: -50, length: 101.5, height: 7, isAlignedWithZ: 0 },
        { x: 50, z: 0, length: 101.5, height: 7, isAlignedWithZ: 1 },
        
        //Walls aligned with the X-axis
        { x: -41, z: -12, length: 8.5, height: 7, isAlignedWithZ: 1 },
        { x: -41, z: 21, length: 8.5, height: 7, isAlignedWithZ: 1 },
        { x: -33, z: -21, length: 8.5, height: 7, isAlignedWithZ: 1 },
        { x: -33, z: 4, length: 25.5, height: 7, isAlignedWithZ: 1 },
        { x: -25, z: -37, length: 24.5, height: 7, isAlignedWithZ: 1 },
        { x: -25, z: 25, length: 33.5, height: 7, isAlignedWithZ: 1 },
        { x: -16, z: 8, length: 16.5, height: 7, isAlignedWithZ: 1 },
        { x: -16, z: 8, length: 16.5, height: 7, isAlignedWithZ: 1 },
        { x: -16, z: -38, length: 8.5, height: 7, isAlignedWithZ: 1 },
        { x: -8, z: 12, length: 8.5, height: 7, isAlignedWithZ: 1 },
        { x: -8, z: -17, length: 33.5, height: 7, isAlignedWithZ: 1 },
        { x: -8, z: -46, length: 8.5, height: 7, isAlignedWithZ: 1 },
        { x: 0, z: 33, length: 34.5, height: 7, isAlignedWithZ: 1 },
        { x: 0, z: 4, length: 8.5, height: 7, isAlignedWithZ: 1 },
        { x: 0, z: -29, length: 24.5, height: 7, isAlignedWithZ: 1 },
        { x: 8, z: 37, length: 26.5, height: 7, isAlignedWithZ: 1 },
        { x: 8, z: 16, length: 17.5, height: 7, isAlignedWithZ: 0 },
        { x: 8, z: -13, length: 25.5, height: 7, isAlignedWithZ: 1 },
        { x: 8, z: -42, length: 17.5, height: 7, isAlignedWithZ: 1 },
        { x: 17, z: 17, length: 17.5, height: 7, isAlignedWithZ: 1 },
        { x: 17, z: -29, length: 8.5, height: 7, isAlignedWithZ: 1 },
        { x: 25, z: 33, length: 16.5, height: 7, isAlignedWithZ: 1 },
        { x: 25, z: 4, length: 8.5, height: 7, isAlignedWithZ: 1 },
        { x: 25, z: -29, length: 25.5, height: 7, isAlignedWithZ: 1 },
        { x: 33, z: -13, length: 24.5, height: 7, isAlignedWithZ: 1 },
        { x: 33, z: -46, length: 8.5, height: 7, isAlignedWithZ: 1 },
        { x: 33, z: 12, length: 8.5, height: 7, isAlignedWithZ: 1 },
        { x: 33, z: 37, length: 8.5, height: 7, isAlignedWithZ: 1 },
        { x: 42, z: 25, length: 16.5, height: 7, isAlignedWithZ: 1 },
        { x: 42, z: 46, length: 8.5, height: 7, isAlignedWithZ: 1 },
        { x: 42, z: -17, length: 50.5, height: 7, isAlignedWithZ: 1 },

        //Walls aligned with the Z-axis
        { x: -33, z: -41, length: 16.5, height: 7, isAlignedWithZ: 0 },
        { x: 21, z: -41, length: 8.5, height: 7, isAlignedWithZ: 0 },
        { x: -41, z: -33, length: 16.5, height: 7, isAlignedWithZ: 0 },
        { x: -12, z: -33, length: 9.5, height: 7, isAlignedWithZ: 0 },
        { x: 12.5, z: -33, length: 10.5, height: 7, isAlignedWithZ: 0 },
        { x: 34, z: -33, length: 17.5, height: 7, isAlignedWithZ: 0 },
        { x: -37, z: -25, length: 9.5, height: 7, isAlignedWithZ: 0 },
        { x: -21, z: -25, length: 9.5, height: 7, isAlignedWithZ: 0 },
        { x: -20.5, z: -17, length: 42.5, height: 7, isAlignedWithZ: 0 },
        { x: 16, z: -17, length: 16.5, height: 7, isAlignedWithZ: 0 },
        { x: 25, z: -8, length: 16.5, height: 7, isAlignedWithZ: 0 },
        { x: 4, z: -8, length: 8.5, height: 7, isAlignedWithZ: 0 },
        { x: -17, z: -8, length: 16.5, height: 7, isAlignedWithZ: 0 },
        { x: 29, z: 0, length: 9.5, height: 7, isAlignedWithZ: 0 },
        { x: 4, z: 0, length: 25.5, height: 7, isAlignedWithZ: 0 },
        { x: -20.25, z: 0, length: 10, height: 7, isAlignedWithZ: 0 },
        { x: -37, z: 0, length: 9.5, height: 7, isAlignedWithZ: 0 },
        { x: -46, z: 8, length: 8.5, height: 7, isAlignedWithZ: 0 },
        { x: -29, z: 8, length: 9.5, height: 7, isAlignedWithZ: 0 },
        { x: -4, z: 8, length: 9.5, height: 7, isAlignedWithZ: 0 },
        { x: 17, z: 8, length: 17.5, height: 7, isAlignedWithZ: 0 },
        { x: 37.5, z: 8, length: 10.5, height: 7, isAlignedWithZ: 0 },
        { x: -37, z: 16, length: 9.5, height: 7, isAlignedWithZ: 0 },
        { x: -12, z: 16, length: 9.5, height: 7, isAlignedWithZ: 0 },
        { x: 34, z: 16, length: 17.5, height: 7, isAlignedWithZ: 0 },
        { x: -17, z: 25, length: 32.5, height: 7, isAlignedWithZ: 0 },
        { x: 25, z: 25, length: 16.5, height: 7, isAlignedWithZ: 0 },
        { x: -42, z: 33, length: 17.5, height: 7, isAlignedWithZ: 0 },
        { x: -8, z: 33, length: 16.5, height: 7, isAlignedWithZ: 0 },
        { x: 45.5, z: 33, length: 8.5, height: 7, isAlignedWithZ: 0 },
        { x: 13, z: 33, length: 8.5, height: 7, isAlignedWithZ: 0 },
        { x: -25, z: 41.5, length: 33.5, height: 7, isAlignedWithZ: 0 },
        { x: 25, z: 41.5, length: 17.5, height: 7, isAlignedWithZ: 0 },
    ];

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

            // Create walls based on the loaded maze
            //createPhysicsForMaze(object);
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
            console.error('An error occurred loading the model', error);
        }
    );
}

// function createPhysicsForMaze(mazeObject) {
//     mazeObject.traverse((child) => {
//         if (child.isMesh) {
//             const geometry = child.geometry;

//             geometry.computeBoundingBox(); // Compute bounding box for the mesh
//             const boundingBox = geometry.boundingBox;

//             // Calculate dimensions based on bounding box
//             const dimensions = new THREE.Vector3(
//                 boundingBox.max.x - boundingBox.min.x,
//                 boundingBox.max.y - boundingBox.min.y,
//                 boundingBox.max.z - boundingBox.min.z
//             );

//             // Calculate the center position of the wall
//             const position = new THREE.Vector3();
//             boundingBox.getCenter(position);
//             child.localToWorld(position);

//             // Create a CANNON.js box shape and body
//             const halfExtents = new CANNON.Vec3(dimensions.x / 2, dimensions.y / 2, dimensions.z / 2);
//             const boxShape = new CANNON.Box(halfExtents);
//             const wallBody = new CANNON.Body({
//                 mass: 0, // Static body
//                 position: new CANNON.Vec3(position.x, position.y, position.z)
//             });

//             wallBody.addShape(boxShape);
//             mazeWorld.addBody(wallBody);
//         }
//     });
// }

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
