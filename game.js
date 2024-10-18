import * as THREE from "three";
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


// Global variables
let scene, camera, renderer, sphere, sphereBody, world, spotLight;
let yaw = 0, pitch = 0;
let cameraMode = 'third-person'; // Initialize in third-person mode
let soccerField;
// Add new global variables
let isGameOver = false;
let obstacles = [];
let gameOverScreen = null;

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

    // Ball physics body - moved to center facing the goal
    const sphereShape = new CANNON.Sphere(1);
    sphereBody = new CANNON.Body({
        mass: 5,
        position: new CANNON.Vec3(0, 2, 0), // Center of field, slightly above ground
        shape: sphereShape,
        material: new CANNON.Material({ restitution: 0.5 })
    });
    sphereBody.linearDamping = 0.5;
    world.addBody(sphereBody);

    // Ground plane
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
        mass: 0,
        shape: groundShape,
        material: new CANNON.Material({ friction: 0.3 })
     });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

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

    // Add invisible walls around the field
    createBoundaryWalls();
    
    // Add obstacles
    //createObstacles();
}

// Function to create boundary walls
function createBoundaryWalls() {
    const wallMaterial = new CANNON.Material({ friction: 0.3, restitution: 0.3 });
    
    // Create boundary walls (invisible for physics)
    const wallShapes = [
        { pos: [0, 5, 62], size: [102, 10, 2] },  // Back wall
        { pos: [0, 5, -62], size: [102, 10, 2] }, // Front wall
        { pos: [102, 5, 0], size: [2, 10, 64] },  // Right wall
        { pos: [-102, 5, 0], size: [2, 10, 64] }  // Left wall
    ];

    wallShapes.forEach(wall => {
        const wallBody = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(...wall.pos),
            shape: new CANNON.Box(new CANNON.Vec3(...wall.size.map(s => s/2))),
            material: wallMaterial
        });
        world.addBody(wallBody);
    });
}

// Function to create visible and physical obstacles
function createObstacles() {
    const obstaclePositions = [
        { pos: [-30, 2, 20], size: [4, 4, 4] },
        { pos: [30, 2, -20], size: [4, 4, 4] },
        { pos: [0, 2, 30], size: [4, 4, 4] },
        { pos: [-20, 2, -15], size: [4, 4, 4] },
        { pos: [20, 2, 15], size: [4, 4, 4] }
    ];

    obstaclePositions.forEach(data => {
        // Physics body
        const obstacleShape = new CANNON.Box(
            new CANNON.Vec3(data.size[0]/2, data.size[1]/2, data.size[2]/2)
        );
        const obstacleBody = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(...data.pos),
            shape: obstacleShape,
            material: new CANNON.Material({ friction: 0.5, restitution: 0.3 })
        });
        world.addBody(obstacleBody);

        // Visual mesh
        const geometry = new THREE.BoxGeometry(...data.size);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff4444,
            metalness: 0.5,
            roughness: 0.5
        });
        const obstacle = new THREE.Mesh(geometry, material);
        obstacle.position.copy(obstacleBody.position);
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;
        scene.add(obstacle);
        obstacles.push({ mesh: obstacle, body: obstacleBody });
    });
}

// Function to check if ball is out of bounds
function checkBallOutOfBounds() {
    const pos = sphereBody.position;
    const fieldWidth = 100;
    const fieldLength = 60;
    
    if (Math.abs(pos.x) > fieldWidth || Math.abs(pos.z) > fieldLength || pos.y < -10) {
        if (!isGameOver) {
            gameOver("Ball out of bounds!");
        }
    }
}

// Function to create and show game over screen
function createGameOverScreen(message) {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    container.style.padding = '20px';
    container.style.borderRadius = '10px';
    container.style.color = 'white';
    container.style.textAlign = 'center';
    container.style.fontFamily = 'Arial, sans-serif';

    const gameOverText = document.createElement('h2');
    gameOverText.textContent = message;
    gameOverText.style.marginBottom = '20px';

    const restartButton = document.createElement('button');
    restartButton.textContent = 'Restart Game';
    restartButton.style.padding = '10px 20px';
    restartButton.style.fontSize = '16px';
    restartButton.style.cursor = 'pointer';
    restartButton.onclick = restartGame;

    container.appendChild(gameOverText);
    container.appendChild(restartButton);
    
    document.body.appendChild(container);
    return container;
}

// Function to handle game over state
function gameOver(message) {
    isGameOver = true;
    gameOverScreen = createGameOverScreen(message);
    
    // Optionally freeze the ball
    sphereBody.velocity.setZero();
    sphereBody.angularVelocity.setZero();
}

// Function to restart the game
function restartGame() {
    if (gameOverScreen) {
        document.body.removeChild(gameOverScreen);
        gameOverScreen = null;
    }
    
    // Reset ball position and velocity
    sphereBody.position.set(0, 2, 0);
    sphereBody.velocity.setZero();
    sphereBody.angularVelocity.setZero();
    
    // Reset camera position
    camera.position.set(0, 20, 50);
    camera.lookAt(0, 0, 0);
    
    // Reset game state
    isGameOver = false;
    yaw = 0;
    pitch = 0;
}

// Create a more realistic soccer ball
function createSoccerBall() {
    const radius = 1;
    const sphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
    
    // Create soccer ball texture pattern
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    // White background
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, 512, 512);
    
    // Black pentagons
    context.fillStyle = '#000000';
    const pentagonSize = 100;
    const positions = [
        [256, 128], [128, 256], [384, 256],
        [256, 384], [128, 128], [384, 384]
    ];
    
    positions.forEach(([x, y]) => {
        context.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
            const px = x + pentagonSize * Math.cos(angle);
            const py = y + pentagonSize * Math.sin(angle);
            if (i === 0) context.moveTo(px, py);
            else context.lineTo(px, py);
        }
        context.closePath();
        context.fill();
    });

    const texture = new THREE.CanvasTexture(canvas);
    
    const ballMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.4,
        metalness: 0.1,
        bumpMap: texture,
        bumpScale: 0.02
    });

    sphere = new THREE.Mesh(sphereGeometry, ballMaterial);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    scene.add(sphere);
}

// Enhanced function to create a more realistic soccer field
function createSoccerField() {
    const fieldGroup = new THREE.Group();

    // Increased field dimensions
    const fieldGeometry = new THREE.PlaneGeometry(200, 120); // Doubled size
    
    // Create detailed grass texture
    const grassTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(20, 12); // Adjust repeating pattern
    
    const fieldMaterial = new THREE.MeshStandardMaterial({
        color: 0x28a745, // Brighter green
        map: grassTexture,
        roughness: 0.6,
        metalness: 0.1,
        side: THREE.DoubleSide
    });

    soccerField = new THREE.Mesh(fieldGeometry, fieldMaterial);
    soccerField.rotation.x = -Math.PI / 2;
    soccerField.receiveShadow = true;
    fieldGroup.add(soccerField);

    // Create field lines with thicker material
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff,
        linewidth: 3 // Note: Line width may not work in WebGL
    });

    // Outer boundary (adjusted for new dimensions)
    const boundaryGeometry = new THREE.BufferGeometry();
    const boundaryVertices = new Float32Array([
        -100, 0, 60,  // Top left
        100, 0, 60,   // Top right
        100, 0, -60,  // Bottom right
        -100, 0, -60, // Bottom left
        -100, 0, 60   // Back to start
    ]);
    boundaryGeometry.setAttribute('position', new THREE.BufferAttribute(boundaryVertices, 3));
    const boundaryLines = new THREE.Line(boundaryGeometry, lineMaterial);
    fieldGroup.add(boundaryLines);

    // Center line (adjusted)
    const centerLineGeometry = new THREE.BufferGeometry();
    const centerLineVertices = new Float32Array([
        0, 0, 60,
        0, 0, -60
    ]);
    centerLineGeometry.setAttribute('position', new THREE.BufferAttribute(centerLineVertices, 3));
    const centerLine = new THREE.Line(centerLineGeometry, lineMaterial);
    fieldGroup.add(centerLine);

    // Larger center circle
    const centerCircleGeometry = new THREE.CircleGeometry(18, 64); // More segments for smoother circle
    centerCircleGeometry.rotateX(-Math.PI / 2);
    const centerCircleEdges = new THREE.EdgesGeometry(centerCircleGeometry);
    const centerCircle = new THREE.LineSegments(centerCircleEdges, lineMaterial);
    centerCircle.position.y = 0.01;
    fieldGroup.add(centerCircle);

    // Adjusted penalty areas
    function createPenaltyArea(x) {
        const penaltyGeometry = new THREE.BufferGeometry();
        const penaltyVertices = new Float32Array([
            x, 0, 40,          // Top
            x + (x > 0 ? -32 : 32), 0, 40,  // Top side
            x + (x > 0 ? -32 : 32), 0, -40, // Bottom side
            x, 0, -40          // Bottom
        ]);
        penaltyGeometry.setAttribute('position', new THREE.BufferAttribute(penaltyVertices, 3));
        return new THREE.Line(penaltyGeometry, lineMaterial);
    }

    const leftPenaltyArea = createPenaltyArea(-100);
    const rightPenaltyArea = createPenaltyArea(100);
    fieldGroup.add(leftPenaltyArea);
    fieldGroup.add(rightPenaltyArea);

    // Create larger goals
    function createGoal(x) {
        const goalGroup = new THREE.Group();
        const goalMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            metalness: 0.8,
            roughness: 0.2
        });

        // Thicker posts and longer crossbar
        const postGeometry = new THREE.CylinderGeometry(0.3, 0.3, 8, 16);
        const crossbarGeometry = new THREE.CylinderGeometry(0.3, 0.3, 12, 16);

        // Left post
        const leftPost = new THREE.Mesh(postGeometry, goalMaterial);
        leftPost.position.set(x + (x > 0 ? -2 : 2), 4, -6);
        leftPost.castShadow = true;

        // Right post
        const rightPost = new THREE.Mesh(postGeometry, goalMaterial);
        rightPost.position.set(x + (x > 0 ? -2 : 2), 4, 6);
        rightPost.castShadow = true;

        // Crossbar
        const crossbar = new THREE.Mesh(crossbarGeometry, goalMaterial);
        crossbar.position.set(x + (x > 0 ? -2 : 2), 8, 0);
        crossbar.rotation.z = Math.PI / 2;
        crossbar.castShadow = true;

        goalGroup.add(leftPost);
        goalGroup.add(rightPost);
        goalGroup.add(crossbar);

        return goalGroup;
    }

    const leftGoal = createGoal(-100);
    const rightGoal = createGoal(100);
    fieldGroup.add(leftGoal);
    fieldGroup.add(rightGoal);

    scene.add(fieldGroup);
}

// Create a skybox using geometry
function createSkybox() {
    // Create a large sphere instead of a box for a seamless sky
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    // Use vertex colors for gradient effect
    const skyMaterial = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vWorldPosition;
            void main() {
                float y = normalize(vWorldPosition).y;
                vec3 skyColor = mix(
                    vec3(0.4, 0.6, 1.0),  // Bottom color (lighter blue)
                    vec3(0.2, 0.3, 0.8),  // Top color (darker blue)
                    max(0.0, y)
                );
                gl_FragColor = vec4(skyColor, 1.0);
            }
        `,
        side: THREE.BackSide
    });

    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);
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
    //loadSoccerBall();

    const canvasContainer = document.getElementById('canvasContainer');
    renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Better shadow quality
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    canvasContainer.appendChild(renderer.domElement);

    // Sphere setup
    /* const sphereGeometry = new THREE.SphereGeometry(1, 50, 50);
    const sphereMaterial = new THREE.MeshStandardMaterial({
        color: 'cyan',
        wireframe: false
    });
    sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);
    sphere.castShadow = true; */
    
     // Create soccer field and skybox
    // Replace the cyan sphere with the soccer ball
     createSoccerBall();
     createSoccerField();
     createSkybox();
     const obstaclePositions = [
        { pos: [-30, 2, 20], size: [4, 4, 4] },
        { pos: [30, 2, -20], size: [4, 4, 4] },
        { pos: [0, 2, 30], size: [4, 4, 4] },
        { pos: [-20, 2, -15], size: [4, 4, 4] },
        { pos: [20, 2, 15], size: [4, 4, 4] }
    ];

    obstaclePositions.forEach(data => {
        // Physics body
        const obstacleShape = new CANNON.Box(
            new CANNON.Vec3(data.size[0]/2, data.size[1]/2, data.size[2]/2)
        );
        const obstacleBody = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(...data.pos),
            shape: obstacleShape,
            material: new CANNON.Material({ friction: 0.5, restitution: 0.3 })
        });
        world.addBody(obstacleBody);

        // Visual mesh
        const geometry = new THREE.BoxGeometry(...data.size);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff4444,
            metalness: 0.5,
            roughness: 0.5
        });
        const obstacle = new THREE.Mesh(geometry, material);
        obstacle.position.copy(obstacleBody.position);
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;
        scene.add(obstacle);
        obstacles.push({ mesh: obstacle, body: obstacleBody });
    });

    // Lighting setup
    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Main sunlight with softer shadows
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
    sunLight.position.set(100, 200, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 600;
    sunLight.shadow.camera.left = -200;
    sunLight.shadow.camera.right = 200;
    sunLight.shadow.camera.top = 200;
    sunLight.shadow.camera.bottom = -200;
    sunLight.shadow.radius = 2;
    scene.add(sunLight);

    // Additional fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-100, 100, -100);
    scene.add(fillLight);

    // Ground light for better visibility
    const groundLight = new THREE.HemisphereLight(0xffffff, 0x2e8b57, 0.7);
    scene.add(groundLight);

    // Keep these helpers for development
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
    if (!isGameOver) {
        world.step(1 / 60);
        
        // Update sphere position based on physics
        sphere.position.copy(sphereBody.position);
        sphere.quaternion.copy(sphereBody.quaternion);
        
        // Check for game over conditions
        checkBallOutOfBounds();
        
        // Update movement and camera only if game is not over
        if (!isGameOver) {
            updateMovement();
            updateCamera();
        }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// Update movement logic for the sphere
function updateMovement() {
    if (isGameOver) return;


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


// Modify the updateCamera function to prevent ground clipping:
function updateCamera() {
    const minCameraHeight = 2; // Minimum height above ground
    
    if (cameraMode === 'third-person') {
        const cameraDistance = 30;
        let cameraX = sphere.position.x + cameraDistance * Math.sin(yaw) * Math.cos(pitch);
        let cameraY = sphere.position.y + cameraDistance * Math.sin(pitch);
        let cameraZ = sphere.position.z + cameraDistance * Math.cos(yaw) * Math.cos(pitch);
        
        // Prevent camera from going below minimum height
        cameraY = Math.max(cameraY, minCameraHeight);
        
        // Adjust pitch if camera would go below ground
        if (cameraY === minCameraHeight && pitch < 0) {
            // Calculate the maximum allowed pitch for current position
            const maxPitchDown = Math.asin((minCameraHeight - sphere.position.y) / cameraDistance);
            pitch = Math.max(pitch, maxPitchDown);
            
            // Recalculate camera position with corrected pitch
            cameraX = sphere.position.x + cameraDistance * Math.sin(yaw) * Math.cos(pitch);
            cameraY = sphere.position.y + cameraDistance * Math.sin(pitch);
            cameraZ = sphere.position.z + cameraDistance * Math.cos(yaw) * Math.cos(pitch);
        }
        
        camera.position.set(cameraX, cameraY, cameraZ);
    } else if (cameraMode === 'first-person') {
        const cameraX = sphere.position.x + 5 * Math.sin(yaw);
        // Ensure minimum height in first-person mode
        const cameraY = Math.max(sphere.position.y + 6, minCameraHeight);
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
