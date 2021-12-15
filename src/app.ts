window.CANNON = require('cannon');
import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import {CannonJSPlugin} from "@babylonjs/core/Physics/Plugins/cannonJSPlugin"
import { SceneLoader, Quaternion, PhysicsImpostor, Texture, Color3, StandardMaterial, Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, SpritePackedManager, Space } from "@babylonjs/core";

class App {
    constructor() {
        // create the canvas html element and attach it to the webpage
        var canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100vh";
        canvas.style.display = "block"
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);

        // initialize babylon scene and engine
        var engine = new Engine(canvas, true);
        var scene: Scene = new Scene(engine);
        var gravityVector = new Vector3(0,-9.81, 0);
        scene.enablePhysics(gravityVector, new CannonJSPlugin());


        var camera: ArcRotateCamera = new ArcRotateCamera("camera", 0, Math.PI/3, 10,new Vector3(0,0,0),scene);
        camera.noRotationConstraint = false;
        var light1: HemisphericLight = new HemisphericLight("light1", new Vector3(1, 1, 0), scene);

        var sphereMaterial: StandardMaterial = new StandardMaterial("sphereMaterial", scene);
        sphereMaterial.diffuseColor = new Color3(1, 0, 1);
        var sphere: Mesh = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);  
        sphere.material = sphereMaterial
        sphere.physicsImpostor = new PhysicsImpostor(sphere, PhysicsImpostor.SphereImpostor, { mass: 1, restitution: 0.9, friction:0.5 }, scene);
        sphere.physicsImpostor.physicsBody.angularDamping = 0.7;
        sphere.physicsImpostor.physicsBody.linearDamping = 0.45;
        camera. lockedTarget = sphere;

        var wireframeMaterial: StandardMaterial = new StandardMaterial("carMaterial", scene);
        wireframeMaterial.wireframe = true;
        var debugCube: Mesh = MeshBuilder.CreateBox("debugCube", {size:1.3}, scene);
        debugCube.material = wireframeMaterial;
        debugCube.parent = sphere;
        var car: Mesh = MeshBuilder.CreateBox("car", {size:1}, scene);
        car.material = wireframeMaterial;

        SceneLoader.ImportMeshAsync("", "./", "sedanSports.glb", scene).then(res => {
            res.meshes[0].rotate(Vector3.Up(), Math.PI/2, Space.LOCAL);
            res.meshes[0].position.y -=0.5;
            res.meshes[0].parent = car;
        })

        var ground: Mesh = MeshBuilder.CreateTiledBox("ground",{width:50, depth:50,height:1, tileSize:15}, scene);
        var groundMaterial = new StandardMaterial("groundMaterial", scene);
        groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
        groundMaterial.diffuseTexture = new Texture("./aseets/amiga.jpg", scene);
        ground.material = groundMaterial;
        ground.scaling = new Vector3(1,.02,1);
        ground.position._y-=5;
        ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, {mass:0}, scene);

        // hide/show the Inspector
        window.addEventListener("keydown", (ev) => {
            // Shift+Ctrl+Alt+I
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
                if (scene.debugLayer.isVisible()) {
                    scene.debugLayer.hide();
                } else {
                    scene.debugLayer.show();
                }
            }
        });

        var direction = Vector3.Zero();
        var speed = 40;
        var forward = new Vector3(-speed, 0, 0);
        var backward = new Vector3(speed, 0, 0);
        var left = false;
        var right = false;
        var accelerate = false;
        var reverse = false;
        var jump = false;

        window.addEventListener("keydown", event => {
            let { code } = event;
            // Forward and Backward controls
            if (code === 'ArrowUp' || code === 'KeyW') {
                // direction = car.getDirection(forward)
                accelerate = true;
            } else if (code === 'ArrowDown' || code === 'KeyS') {
                // direction = car.getDirection(backward)
                reverse = true;
            }
            // Left and Right controls
            if (code === 'ArrowLeft' || code === 'KeyA') {
                left = true;
            } 
            if (code === 'ArrowRight' || code === 'KeyD') {
                right = true;
            }
            // Jump control
            if (code === 'Space') {
                jump = true;
            }
        });

        window.addEventListener("keyup", event => {
            let { code } = event;
            // Forward and Backward controls
            if (code === 'ArrowUp' || code === 'KeyW') {
                accelerate = false;
            } else if (code === 'ArrowDown' || code === 'KeyS') {
                reverse = false;
            }
            // Left and Right controls
            if (code === 'ArrowLeft' || code === 'KeyA') {
                left = false;
            } else if (code === 'ArrowRight' || code === 'KeyD') {
                right = false;
            }
            // Jump control
            if (code === 'Space') {
                jump = false;
            }
        });

        scene.registerBeforeRender(() => {
            var rotate = 0;
            if (left) rotate -= 1;
            if (right) rotate += 1;
            var pos = new Vector3(sphere.position.x, sphere.position.y, sphere.position.z); 
            car.position = sphere.position;

            var currentLinearVelocity = sphere.physicsImpostor.getLinearVelocity();
            var speed = currentLinearVelocity.length()
            if (speed < 1){
                speed = 0;
            }
            if (speed > 6){
                speed = 6;
            }
            var turnLimit = speed/6;
            var currentAngularVelocity = sphere.physicsImpostor.getAngularVelocity();
            sphere.physicsImpostor.setLinearVelocity(this.rotateVector(currentLinearVelocity, rotate*0.05*turnLimit));
            sphere.physicsImpostor.setAngularVelocity(this.rotateVector(currentAngularVelocity, rotate*0.05*turnLimit));
            car.rotation.y += rotate * 0.05 * turnLimit;

            if (accelerate) {
                direction = car.getDirection(forward);
            }
            if (reverse) {
                direction = car.getDirection(backward);
            }
            if (accelerate == reverse) direction = Vector3.Zero();
            sphere.physicsImpostor.applyForce(direction, pos);

            if (sphere.position.y < -5){
                sphere.position = new Vector3(0,5,0);
            }

        });

        // run the main render loop
        engine.runRenderLoop(() => {
            scene.render();
        });
    }

    rotateVector(v:Vector3, r:number){
        const quat = Quaternion.FromEulerAngles(0, r, 0);
        return v.rotateByQuaternionToRef(quat, Vector3.Zero());
    }
}
new App();
