import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class MazeWorld {
    constructor() {
        this.scene = new THREE.Scene();
        this.physicsWorld = new CANNON.World();
        this.physicsWorld.gravity.set(0, -9.82, 0);

        this.cellSize = 5;
        this.wallThickness = 1.5;

        this.createFloor();
        this.walls = [];
    }

    createFloor() {
        const floorSize = 100; // Adjust as needed
        const floorMaterial = new THREE.MeshLambertMaterial({
            color: "orange",
            side: THREE.DoubleSide
        });

        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.rotation.x = -Math.PI / 2;
        this.scene.add(floorMesh);

        const gridHelper = new THREE.GridHelper(100, 100);
        this.scene.add(gridHelper);

        // Create floor physics
        const floorShape = new CANNON.Plane();
        const floorBody = new CANNON.Body({ mass: 0 });
        floorBody.addShape(floorShape);
        floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.physicsWorld.addBody(floorBody);
    }

    createWall(x, z, length, height, isAlignedWithZ) {
        const wallMaterial = new THREE.MeshLambertMaterial({ color: "cyan" });

        // Create wall mesh
        const wallGeometry = new THREE.BoxGeometry(
            isAlignedWithZ ? this.wallThickness : length,
            height,
            isAlignedWithZ ? length : this.wallThickness
        );
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
        wallMesh.position.set(x, height / 2, z);
        this.scene.add(wallMesh);

        // Create wall physics
        const wallShape = new CANNON.Box(new CANNON.Vec3(
            isAlignedWithZ ? this.wallThickness / 2 : length / 2,
            height / 2,
            isAlignedWithZ ? length / 2 : this.wallThickness / 2
        ));
        const wallBody = new CANNON.Body({ mass: 0 });
        wallBody.addShape(wallShape);
        wallBody.position.copy(wallMesh.position);
        this.physicsWorld.addBody(wallBody);

        this.walls.push({ mesh: wallMesh, body: wallBody });
    }

    createMaze(wallsData) {
        for (const wall of wallsData) {
            this.createWall(wall.x, wall.z, wall.length, wall.height, wall.isAlignedWithZ);
        }
    }

    update() {
        this.physicsWorld.step(1 / 60);
    }

    getStartPosition() {
        // You may want to implement a method to find a valid start position
        // based on your custom maze layout
        return new THREE.Vector3(0, 1, 0);
    }

    addToScene(object) {
        this.scene.add(object);
    }

    addBody(body) {
        this.physicsWorld.addBody(body);
    }
}