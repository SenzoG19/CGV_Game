import * as THREE from "three";
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { wallsData } from '/scripts/wallsData.js';

// Global variables
let scene, camera, renderer, physicsWorld;
let ball, ballBody;
let soccerGoal;
let firstPersonView = false;
let walls = [];
let orbitControls;
let requiredCollectibles;
let hiddenWall, buttonBody, buttonMesh;
let wallSlideTimeout;
let wallSlideSpeed = 0.1;
let hiddenWallBody;
let collectibles = [];
let collectedCount = 0; // Track collected items
let textureLoader;
let nightSky;

// Add target position for the end of the maze
const targetPosition = new THREE.Vector3(4, 1, 55);

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
const scaleFactor = 1; // Scale factor for walls
const raycaster = new THREE.Raycaster();

function initGame() {
    initScene();
    initPhysics();
    createFloor();
    createMaze(wallsData);
    createBall();
    loadModel();
    setupControls();
    // setupPointerLock(); 
    setupLights();
    addInteractiveElements();
    addCollectibles();
    updateCollectibleCounter();
    animate();
}

function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    textureLoader = new THREE.TextureLoader(); // Initialize texture loader
    nightSky = createNightSky();

    // Adjust scene background color
    scene.background = new THREE.Color(0x000000);

    // Adjust ambient light for night scene
    const ambientLight = new THREE.AmbientLight(0x101020, 0.2);
    scene.add(ambientLight);


    // Set initial camera position and rotation
    camera.position.set(0, 80, 0);
    camera.lookAt(0, 0, 0);

    // Set initial camera position and rotation
    // camera.position.copy(cameraOffset);
    // camera.lookAt(new THREE.Vector3(0, 0, 0));

    const canvasContainer = document.getElementById('canvasContainer');
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.physicallyCorrectLights = true; // Enable physically correct lighting
    canvasContainer.appendChild(renderer.domElement);

    // Add OrbitControls
    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.target.set(0, 0, 0);
    orbitControls.update();
}

function initPhysics() {
    physicsWorld = new CANNON.World();
    physicsWorld.gravity.set(0, -9.82, 0);
}

function createFloor() {
    const floorSize = 150;

    // Load textures
    const colorTexture = textureLoader.load('./textures/Sci-Fi_Wall_014_SD/Sci-Fi_Wall_014_basecolor.jpg');
    const normalTexture = textureLoader.load('./textures/Sci-Fi_Wall_014_SD/Sci-Fi_Wall_014_normal.jpg');
    const roughnessTexture = textureLoader.load('./textures/Sci-Fi_Wall_014_SD/Sci-Fi_Wall_014_roughness.jpg');

    // Set texture properties
    [colorTexture, normalTexture, roughnessTexture].forEach(texture => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        // Set how many times the texture repeats across the floor
        texture.repeat.set(20, 20);
        // Enable anisotropic filtering for better quality at angles
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
        map: colorTexture,
        normalMap: normalTexture,
        roughnessMap: roughnessTexture,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.2
    });

    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    floorMesh.castShadow = true;
    scene.add(floorMesh);

    // Physics remains the same
    const floorShape = new CANNON.Plane();
    const floorBody = new CANNON.Body({ mass: 0 });
    floorBody.addShape(floorShape);
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    physicsWorld.addBody(floorBody);
}

function createWall(x, z, length, height, isAlignedWithZ) {
    const scaledX = x * scaleFactor;
    const scaledZ = z * scaleFactor;
    const scaledLength = length * scaleFactor;
    const scaledHeight = height * scaleFactor;

    // Load textures
    const colorTexture = textureLoader.load('./textures/Sci_fi_Metal_Panel_007_SD/Sci_fi_Metal_Panel_007_basecolor.png');  // Replace with your texture path
    const normalTexture = textureLoader.load('./textures/Sci_fi_Metal_Panel_007_SD/Sci_fi_Metal_Panel_007_normal.png'); // Replace with your normal map
    const roughnessTexture = textureLoader.load('./textures/Sci_fi_Metal_Panel_007_SD/Sci_fi_Metal_Panel_007_roughness.png'); // Replace with your roughness map


    // Set texture properties
    [colorTexture, normalTexture, roughnessTexture].forEach(texture => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        // Enable anisotropic filtering for better quality at angles
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    });

    // Calculate texture repeat based on real-world size
    // Assuming you want the texture to repeat every 2 units
    const textureScale = 2; // Adjust this value to change texture size
    let repeatX, repeatZ;

    if (isAlignedWithZ) {
        // For Z-aligned walls
        repeatX = wallThickness / textureScale;
        repeatZ = scaledLength / textureScale;
    } else {
        // For X-aligned walls
        repeatX = scaledLength / textureScale;
        repeatZ = wallThickness / textureScale;
    }

    const repeatY = scaledHeight / textureScale;

    const wallMaterial = new THREE.MeshStandardMaterial({
        map: colorTexture,
        normalMap: normalTexture,
        roughnessMap: roughnessTexture,
        roughness: 0.7,
        metalness: 0.3,
        side: THREE.DoubleSide
    });

    // Create geometry with custom UV mapping
    const wallGeometry = new THREE.BoxGeometry(
        isAlignedWithZ ? wallThickness : scaledLength,
        scaledHeight,
        isAlignedWithZ ? scaledLength : wallThickness
    );

    // Modify UV coordinates for each face
    const uvAttribute = wallGeometry.attributes.uv;
    const positions = wallGeometry.attributes.position;

    for (let i = 0; i < uvAttribute.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);

        let u = 0, v = 0;

        // Determine which face we're on and set UVs accordingly
        if (Math.abs(positions.getZ(i)) === wallThickness / 2) {
            // Front/Back faces
            u = (x / (isAlignedWithZ ? wallThickness : scaledLength)) * repeatX;
            v = (y / scaledHeight) * repeatY;
        } else if (Math.abs(positions.getX(i)) === (isAlignedWithZ ? wallThickness : scaledLength) / 2) {
            // Left/Right faces
            u = (z / (isAlignedWithZ ? scaledLength : wallThickness)) * repeatZ;
            v = (y / scaledHeight) * repeatY;
        } else {
            // Top/Bottom faces
            u = (x / (isAlignedWithZ ? wallThickness : scaledLength)) * repeatX;
            v = (z / (isAlignedWithZ ? scaledLength : wallThickness)) * repeatZ;
        }

        uvAttribute.setXY(i, u, v);
    }

    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    wallMesh.position.set(scaledX, scaledHeight / 2, scaledZ);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    scene.add(wallMesh);

    // Physics body creation remains the same
    const wallShape = new CANNON.Box(new CANNON.Vec3(
        isAlignedWithZ ? wallThickness / 2 : scaledLength / 2,
        scaledHeight / 2,
        isAlignedWithZ ? scaledLength / 2 : wallThickness / 2
    ));
    const wallBody = new CANNON.Body({ mass: 0 });
    wallBody.addShape(wallShape);
    wallBody.position.copy(wallMesh.position);
    physicsWorld.addBody(wallBody);

    walls.push({ mesh: wallMesh, body: wallBody });
}    // Load textures


function createMaze(wallsData) {
    for (const wall of wallsData) {
        createWall(wall.x, wall.z, wall.length, wall.height, wall.isAlignedWithZ);
    }
}


function createCollectible(x, z) {

    const collectibleMaterial = new THREE.MeshStandardMaterial({
        color: "red",
        emissive: "red", // Set the emissive color to red
        emissiveIntensity: 1.5, // Adjust the glow intensity
        roughness: 0.2,
        metalness: 0.9
    });
    const collectibleGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const collectibleMesh = new THREE.Mesh(collectibleGeometry, collectibleMaterial);
    collectibleMesh.position.set(x, 0.5, z);
    collectibleMesh.castShadow = true;
    scene.add(collectibleMesh);

    const collectibleShape = new CANNON.Sphere(0.3);
    const collectibleBody = new CANNON.Body({ mass: 0 });
    collectibleBody.addShape(collectibleShape);
    collectibleBody.position.set(x, 0.5, z);
    physicsWorld.addBody(collectibleBody);

    const collectibleLight = new THREE.PointLight("red", 100, 4);
    collectibleMesh.add(collectibleLight);
    // Configure shadow properties
    collectibleLight.shadow.mapSize.width = 512;
    collectibleLight.shadow.mapSize.height = 512;
    collectibleLight.shadow.camera.near = 0.1;
    collectibleLight.shadow.camera.far = 10; // Reduced far plane to prevent light bleeding


    collectibles.push({ mesh: collectibleMesh, body: collectibleBody, collected: false });
    requiredCollectibles = collectibles.length; // Set the required amount

}


function checkCollectibleCollisions() {
    collectibles.forEach((collectible) => {
        if (!collectible.collected) {
            const distanceToCollectible = ballBody.position.distanceTo(collectible.body.position);
            if (distanceToCollectible < 1.0) { // Adjust distance threshold as needed
                collectible.mesh.visible = false; // Hide collectible
                collectible.collected = true; // Mark as collected
                collectedCount++; // Increment the count
                updateCollectibleCounter(); // Update collectible counter display
                console.log("Collected an item! Total collected:", collectedCount);

                // Remove the collectible's physics body
                physicsWorld.removeBody(collectible.body);
            }
        }
    });
}

function updateCollectibleCounter() {
    const collectibleCounter = document.getElementById('collectibleCounter');
    collectibleCounter.textContent = `Collectibles: ${collectedCount}/${requiredCollectibles}`;
}


function addCollectibles() {
    createCollectible(5, -4);
    createCollectible(46, 30);
    createCollectible(36, 12);
    createCollectible(29, 38);
    createCollectible(-5, 29);
    createCollectible(-12, -12);
    createCollectible(-29, -45.5);
    createCollectible(46, 47);
    createCollectible(-4, 4);
    createCollectible(-29, 12);
    createCollectible(-37, -21);
    createCollectible(-4, -20);
    //Test Collectible

    //createCollectible(5,45);

}


console.log(requiredCollectibles);
function isMazeCompletionAllowed() {
    return collectedCount >= requiredCollectibles;
}



function createHiddenWall() {
    // Wall properties
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: "blue",
        roughness: 0.7,
        metalness: 0.3,
    });
    const wallGeometry = new THREE.BoxGeometry(8, 10, 1.5); // Dimensions for the wall
    hiddenWall = new THREE.Mesh(wallGeometry, wallMaterial);
    hiddenWall.position.set(4, 5, 50); // Set the wall's position
    hiddenWall.castShadow = true;
    hiddenWall.receiveShadow = true;
    // hiddenWall.visible = true;
    scene.add(hiddenWall);

    const hiddenWallShape = new CANNON.Box(new CANNON.Vec3(2.5, 5, 0.5));
    hiddenWallBody = new CANNON.Body({ mass: 0 });
    hiddenWallBody.addShape(hiddenWallShape);
    hiddenWallBody.position.copy(hiddenWall.position);
    physicsWorld.addBody(hiddenWallBody);
}

function createButton() {
    // Button properties
    const buttonMaterial = new THREE.MeshStandardMaterial({ color: "red" });
    const buttonGeometry = new THREE.BoxGeometry(2, 0.5, 2); // Button as a small box
    buttonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);
    buttonMesh.position.set(-8, 0.25, -65); // Set the button’s position
    buttonMesh.castShadow = true;
    buttonMesh.receiveShadow = true;
    scene.add(buttonMesh);

    const buttonShape = new CANNON.Box(new CANNON.Vec3(1, 0.25, 1));
    buttonBody = new CANNON.Body({ mass: 0 });
    buttonBody.addShape(buttonShape);
    buttonBody.position.copy(buttonMesh.position);
    physicsWorld.addBody(buttonBody);
}

function addInteractiveElements() {
    createHiddenWall();
    createButton();
}

function showWall() {
    // Check if all collectables have been collected
    if (collectedCount === requiredCollectibles) {
        // Set the wall to be visible
        // hiddenWall.visible = true;
        // isWallVisible = true;

        // Start the wall sliding animation
        wallSlideTimeout = setInterval(() => {
            // Move the wall down by the slide speed
            hiddenWall.position.y -= wallSlideSpeed;

            // Check if the wall has reached the bottom
            if (hiddenWall.position.y <= 0) {
                // Stop the sliding animation
                clearInterval(wallSlideTimeout);

                // Disable the wall's physics body
                hiddenWallBody.sleep();
                hiddenWallBody.collisionResponse = false;
            }
        }, 16); // 16 ms = ~60 FPS

        console.log("Wall appeared!");
    } else {
        console.log("Collect all items before the wall appears!");
    }
}

function createBall() {
    const sphereShape = new CANNON.Sphere(0.5);
    ballBody = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(5, 1, 35),
        shape: sphereShape,
        material: new CANNON.Material({ restitution: 0.6 })
    });
    ballBody.linearDamping = 0.5;
    physicsWorld.addBody(ballBody);

    const geometry = new THREE.SphereGeometry(0.4, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color: "yellow",
        emissive: "yellow",
        emissiveIntensity: 1.5,
        roughness: 0.4,
        metalness: 0.8,
        wireframe: false
    });

    ball = new THREE.Mesh(geometry, material);
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball);

    const ballLight = new THREE.PointLight("yellow", 100, 100);
    ball.add(ballLight);

    // const lightHelper = new THREE.PointLightHelper(ballLight, 2);
    // scene.add(lightHelper);
}

function loadModel() {
    const loader = new GLTFLoader();
    loader.load(
        './models/symmetrical_abstract_ball.glb',
        function (gltf) {
            console.log('Model loaded successfully:', gltf);
            soccerGoal = gltf.scene;

            // Scale the model to fit around the existing ball
            // Adjust scale to match your ball size (0.5 radius * 2.5 for padding)
            const modelScale = 0.025;
            soccerGoal.scale.set(modelScale, modelScale, modelScale);

            // Create a material that's slightly transparent to see the inner ball
            const modelMaterial = new THREE.MeshStandardMaterial({
                // color: 0xffffff,
                // emissive: 0xff0000,
                // emissiveIntensity: 0.5,
                roughness: 0.4,
                metalness: 0.8,
                transparent: true,
                opacity: 1,    // Adjust for desired transparency
                side: THREE.DoubleSide
            });

            // Apply the material to all mesh children
            soccerGoal.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.material = modelMaterial;
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Parent the model to the ball
            ball.add(soccerGoal);

            // Center the model on the ball
            soccerGoal.position.set(0, -0.5, 0);

            // Add a point light to the model
            // const modelLight = new THREE.PointLight(0xff0000, 1, 10);
            // modelLight.position.set(0, 0, 0);
            // soccerGoal.add(modelLight);

            // No need for physics body for the model since it will follow the ball
        },
        undefined,
        function (error) {
            console.error('An error happened while loading the GLTF model:', error);
        }
    );
}


function setupLights() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 20, 0);
    // directionalLight.castShadow = true;
    scene.add(directionalLight);
}


// function checkBallButtonCollision() {
//     const distanceToButton = ballBody.position.distanceTo(buttonBody.position);
//     if (distanceToButton < 1.5 && !isWallVisible) { // Collision threshold and wall visibility check
//         showWall();
//     }
// }


function createNightSky() {
    // Create star field with improved point sprites
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 2000;
    const starsPositions = new Float32Array(starsCount * 3);
    const starsSizes = new Float32Array(starsCount);
    const starsColors = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount; i++) {
        const i3 = i * 3;
        // Create stars in a hemisphere above the scene
        const radius = 300;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.5; // Only create stars in upper hemisphere

        starsPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        starsPositions[i3 + 1] = radius * Math.cos(phi);
        starsPositions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

        // Random size for each star
        starsSizes[i] = Math.random() * 2 + 0.5;

        // Random color variations
        const colorTemp = Math.random();
        starsColors[i3] = 1.0;     // R
        starsColors[i3 + 1] = 0.8 + colorTemp * 0.2; // G
        starsColors[i3 + 2] = 0.6 + colorTemp * 0.4; // B
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(starsSizes, 1));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(starsColors, 3));

    // Create simpler shader material for better performance
    const starsMaterial = new THREE.PointsMaterial({
        size: 1,
        sizeAttenuation: true,
        map: createStarSprite(),
        alphaMap: createStarSprite(),
        transparent: true,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // Create darker gradient background
    const skyGeometry = new THREE.SphereGeometry(350, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.BackSide,
        fog: false
    });

    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);

    // Add a moon
    const moonGeometry = new THREE.SphereGeometry(10, 32, 32);
    const moonMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        emissive: 0xFFFFFF,
        emissiveIntensity: 1,
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(200, 100, -200);
    scene.add(moon);

    // Add moon glow
    const moonLight = new THREE.PointLight(0xFFFFFF, 2, 500);
    moon.add(moonLight);

    return {
        updateStars: function(time) {
            // Simple pulsing effect
            stars.rotation.y = time * 0.00005;
            const scale = 1 + Math.sin(time * 0.001) * 0.1;
            starsMaterial.size = scale;
        },
        stars,
        sky,
        moon
    };
}

// Helper function to create star texture
function createStarSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.8, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}


function animate() {
    requestAnimationFrame(animate);

    // Add this line to update stars
    if (nightSky) {
        nightSky.updateStars(performance.now());
    }

    physicsWorld.step(1 / 60);

    showWall();

    updateMovement();
    // checkBallButtonCollision();
    checkCollectibleCollisions();

    if (ball) {
        ball.position.copy(ballBody.position);
        ball.quaternion.copy(ballBody.quaternion);

        if (ball.position.distanceTo(targetPosition) < 2 && isMazeCompletionAllowed()) {
            showGameCompleted();
        }

        // updateCamera(); // Commented out camera update
    }



    orbitControls.update(); // Update the OrbitControls
    renderer.render(scene, camera);
}



// Show "Game Completed" when the ball reaches the end
function showGameCompleted() {
    if (isMazeCompletionAllowed()) {
        const gameCompletedDiv = document.getElementById('gameCompleted');
        gameCompletedDiv.style.display = 'block';
        ballBody.velocity.set(0, 0, 0);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        console.log("Congratulations! You've completed the maze!");
    } else {
        console.log("Collect all items before completing the maze!");
    }
}

function setupPointerLock() {
    const canvasContainer = document.getElementById('canvasContainer');

    // Request pointer lock when clicking on the canvas
    canvasContainer.addEventListener('click', function () {
        canvasContainer.requestPointerLock();
    });

    // Listen for pointer lock state change events
    document.addEventListener('pointerlockchange', function () {
        if (document.pointerLockElement === canvasContainer) {
            console.log('Pointer locked');
            document.addEventListener('mousemove', updateCameraRotation, false);
        } else {
            console.log('Pointer unlocked');
            document.removeEventListener('mousemove', updateCameraRotation, false);
        }
    });

    // Release pointer lock on Escape key
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            document.exitPointerLock();
        }
    });
}


let cameraOffset = new THREE.Vector3(0, 2, -2);
let cameraRotation = {
    yaw: 0,
    pitch: 0
};

function updateCameraRotation(event) {
    const sensitivity = 0.002;

    // Update rotation angles
    cameraRotation.yaw -= event.movementX * sensitivity;
    cameraRotation.pitch -= event.movementY * sensitivity;

    // Clamp the pitch to avoid camera flipping
    cameraRotation.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraRotation.pitch));
}

function updateCamera() {
    if (!ball) return;

    if (firstPersonView) {
        // Position camera inside or slightly above the ball
        camera.position.copy(ball.position).add(new THREE.Vector3(0, 0.5, 0));

        // Look in the direction of the current camera yaw and pitch
        const lookDirection = new THREE.Vector3(
            Math.sin(cameraRotation.yaw),
            Math.tan(cameraRotation.pitch),
            Math.cos(cameraRotation.yaw)
        );
        const lookTarget = camera.position.clone().add(lookDirection);
        camera.lookAt(lookTarget);
    } else {
        // Calculate new potential camera position
        const rotatedOffset = new THREE.Vector3(
            Math.sin(cameraRotation.yaw) * cameraOffset.z,
            cameraOffset.y,
            Math.cos(cameraRotation.yaw) * cameraOffset.z
        );
        const targetPosition = ball.position.clone().add(rotatedOffset);

        // Set raycaster from the ball position towards the new camera position
        const directionToCamera = new THREE.Vector3().subVectors(targetPosition, ball.position).normalize();
        raycaster.set(ball.position, directionToCamera);

        // Check if any walls are in the path
        const intersects = raycaster.intersectObjects(walls.map(wall => wall.mesh));
        const collisionDistance = 1; // Define minimum distance from wall

        // If no intersections or the closest one is beyond collisionDistance, move the camera
        if (intersects.length === 0 || intersects[0].distance > collisionDistance) {
            camera.position.lerp(targetPosition, 0.1);
        }

        // Create a look target slightly above the ball
        const lookTarget = ball.position.clone().add(new THREE.Vector3(0, 2, 0));
        camera.lookAt(lookTarget);

        // Apply pitch rotation
        camera.rotateX(cameraRotation.pitch);
    }
}



function updateMovement() {
    const moveForward = keys.ArrowUp || keys.w;
    const moveBackward = keys.ArrowDown || keys.s;
    const moveLeft = keys.ArrowLeft || keys.a;
    const moveRight = keys.ArrowRight || keys.d;

    const acceleration = 20 * (1 / 60);
    const maxSpeed = 10;

    // Get the camera's forward and right vectors
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);  // Forward direction of the camera

    const cameraRight = new THREE.Vector3();
    cameraRight.crossVectors(camera.up, cameraDirection).normalize();  // Right direction

    // Compute the direction of movement relative to the camera
    let moveDirection = new CANNON.Vec3();

    if (moveForward) {
        moveDirection.x += cameraDirection.x;
        moveDirection.z += cameraDirection.z;
    }
    if (moveBackward) {
        moveDirection.x -= cameraDirection.x;
        moveDirection.z -= cameraDirection.z;
    }
    if (moveLeft) {
        moveDirection.x += cameraRight.x;
        moveDirection.z += cameraRight.z;
    }
    if (moveRight) {
        moveDirection.x -= cameraRight.x;
        moveDirection.z -= cameraRight.z;
    }

    if (moveDirection.length() > 0) {
        moveDirection.normalize();  // Normalize direction to ensure uniform speed
        ballBody.velocity.x += moveDirection.x * acceleration;
        ballBody.velocity.z += moveDirection.z * acceleration;
    }

    // Apply maximum speed clamp
    const horizontalVelocity = new CANNON.Vec3(ballBody.velocity.x, 0, ballBody.velocity.z);
    if (horizontalVelocity.length() > maxSpeed) {
        horizontalVelocity.normalize();
        horizontalVelocity.scale(maxSpeed, horizontalVelocity);
        ballBody.velocity.x = horizontalVelocity.x;
        ballBody.velocity.z = horizontalVelocity.z;
    }

    // Jumping logic (unchanged)
    const isOnGround = Math.abs(ballBody.position.y - 0.5) < 0.05;
    if (keys[' '] && isOnGround) {
        ballBody.velocity.y = 10;  // Jump velocity
    }
}



function setupControls() {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
}

function handleKeyDown(event) {
    if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = true;
    }
    if (event.key === 'v' || event.key === 'V') {
        firstPersonView = !firstPersonView; // Toggle first-person view
    }
}

function handleKeyUp(event) {
    if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = false;
    }
}

initGame();
