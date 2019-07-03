/* Heavily Based on code from:
 * https://threejs.org/examples/?q=interac#webgl_interactive_draggablecubes
 * https://threejs.org/examples/?q=track#misc_controls_trackball
 */

/* Define here the variables for changing appearence */ 
var numberOfObjects = 5; /* Number of objects on the screen */
var backgroundColor = 0x000000; /* Background color */
var arcballColor = 0x808080 /* Arcball color */

/* Variables from the template */
var container, stats;
var camera, controls, scene, renderer;
var objects = [];

/* Global objects and group identifiers */
var arcball, plane, raycaster;
var arcballGroup, groupOfObjects, selectedObject, draggableObject;
var rotationMode, offset, firstClickPointPosition;

function init() {
	/* Three.js initialization */
	container = document.createElement('div');
	document.body.appendChild(container);

	/* Configure the renderer */
	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	container.appendChild(renderer.domElement);

	/* Window and camera controls */
	camera = new THREE.PerspectiveCamera(10, window.innerWidth / window.innerHeight, 100, 100000);
	camera.position.z = 10000;
	camera.lookAt(new THREE.Vector3(0,0,1));

	/* Create the scene */
	scene = new THREE.Scene();
	scene.background = new THREE.Color(backgroundColor);

	/* Create a plane to match the mouse clicks or touches */
	let planeGeometry = new THREE.PlaneBufferGeometry(5000, 5000, 8, 8);
	let planeMaterial = new THREE.MeshBasicMaterial({
		color: 0xffffff,
		opacity: 0.0,
		transparent: true,
		visible: false
	});
	plane = new THREE.Mesh(planeGeometry, planeMaterial);
	scene.add(plane);

	/* Set up arcball object: thebox object and the rounding sphere and create
	 * a group of arcball objects which contains everything.
	 */
	groupOfObjects = new THREE.Group();
	groupOfObjects.name = "World";
	arcballGroup = new THREE.Group();
	arcballGroup.add(groupOfObjects);
	scene.add(arcballGroup);
	
	/* Add some lightning */
	let ambientLight = new THREE.AmbientLight(0xffffff);
	let spotLight = new THREE.SpotLight(0xffffff, 1.5);
	spotLight.position.set(0, 0, 0);
	spotLight.target.position.set(0, 0, 1);
	spotLight.angle = 2 * Math.PI;
	spotLight.castShadow = false;
	scene.add(ambientLight);
	scene.add(spotLight);

	for (let i = 0 ; i < numberOfObjects; i++) {
		/* Using BoxGeometry instead of BoxBufferGeometry
		 * https://stackoverflow.com/questions/49956422/what-is-difference-between-boxbuffergeometry-vs-boxgeometry-in-three-js
		 */
		let geometry = new THREE.BoxGeometry(40, 40, 40);

		let geometryMaterial = new THREE.MeshLambertMaterial({
			color: 0xffffff,
			side: THREE.DoubleSide,
			vertexColors: THREE.FaceColors,
			visible: true
		});

		/* Set different colors on each side of the generated boxes */
		for (let i = 0; i < geometry.faces.length/2; i++) {
			let color = Math.random() * 0xffffff;
			geometry.faces[i*2].color.setHex(color);
			geometry.faces[1+i*2].color.setHex(color);
		}

		var object = new THREE.Mesh(geometry, geometryMaterial);

		object.position.x = (Math.random() * (1 - (-1)) -1) * 250;
		object.position.y = (Math.random() * (1 - (-1)) -1) * 250;
		object.position.z = 0; /* Must be zero to don't mess with the arcball */
		object.rotation.x = Math.random() * 2 * Math.PI;
		object.rotation.y = Math.random() * 2 * Math.PI;
		object.rotation.z = Math.random() * 2 * Math.PI;
		object.scale.x = Math.random() * 5 + 1;
		object.scale.y = Math.random() * 5 + 1;
		object.scale.z = Math.random() * 5 + 1;
		objects.push(object);
		groupOfObjects.add(object);
	}

	/* Compute the bouding sphere for the last generated object */
	object.geometry.computeBoundingSphere();
	var objectRadius = object.geometry.boundingSphere.radius * 1.66;

	/* Arcball definition */
	let arcballShape = new THREE.SphereGeometry(objectRadius, 32, 32);
	let arcballMaterial = new THREE.MeshLambertMaterial({ 
		color: arcballColor,
		transparent: true,
		opacity: 0.25
	}); /* Gray Arcball */
	arcball = new THREE.Mesh(arcballShape, arcballMaterial);
	arcball.visible = false;
	arcball.name = "Arcball";
	arcballGroup.add(arcball);

	/* Define a raycaster and a ancialliary vector for mouse positions */
	raycaster = new THREE.Raycaster();

	/* Initialize some data structures */
	offset = new THREE.Vector3();
	firstClickPointPosition = new THREE.Vector3();

	/* Set the Trackball controls */
	controls = new THREE.TrackballControls(camera, renderer.domElement);
	controls.rotateSpeed = 5.0;
	controls.zoomSpeed = 1.2;
	controls.panSpeed = 0.8;
	controls.noZoom = false;
	controls.enablePan = false;
	controls.dynamicDampingFactor = 0.3;
	/* Controls are disabled by default, they are enabled on demand */
	controls.enabled = false;

	/* Draw status on the screen */
	stats = new Stats();
	container.appendChild( stats.dom );

	/* Events */
	window.addEventListener('resize', onWindowResize, false);

	/* Mouse events */ //RENAME FUNCTIONS
	window.addEventListener('mousemove', onDocumentMouseMove);
	window.addEventListener('mousedown', onDocumentMouseDown);
	window.addEventListener('mouseup', onDocumentMouseUp);
	window.addEventListener('dblclick', onDocumentMouseDoubleClick);
	window.addEventListener('wheel', onDocumentMouseWheel);
	/* Trackpad is broken for reasons unknown */
	//window.addEventListener('mousewheel', onDocumentMouseWheel);
}

function onDocumentMouseMove(event) {
	let mouseX = (event.clientX / window.innerWidth) * 2 - 1;
	let mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
	let vector = new THREE.Vector3(mouseX, mouseY, 1);

	if (!arcball.visible) {
		event.preventDefault();
		vector.unproject(camera);
		raycaster.set(camera.position, vector.sub( camera.position ).normalize());
		if (draggableObject) {
			var intersects = raycaster.intersectObject(plane);
			draggableObject.position.copy(intersects[0].point.sub(offset));
		} else {
			var intersects = raycaster.intersectObjects(objects);
			if (intersects.length > 0) {
				plane.position.copy(intersects[0].object.position);
				plane.lookAt(camera.position);
			}
		}
	} else {
		if (selectedObject) {
			let arcballCenter = arcball.position;
			let lastClickPointPosition = getArcballClickPosition(vector, plane, arcball);
			let tempLastClickPointPosition = new THREE.Vector3().copy(lastClickPointPosition);
			let tempFirstClickPointPosition = new THREE.Vector3().copy(firstClickPointPosition);
			let normal = new THREE.Vector3();

			vector.unproject(camera);
			tempLastClickPointPosition.sub(arcballCenter);
			tempFirstClickPointPosition.sub(arcballCenter);

			/* Disable the translation and begins the rotation algorithm */
			if (rotationMode) {
				normal.crossVectors(tempFirstClickPointPosition,tempLastClickPointPosition);
				normal.normalize();
				if (selectedObject.name == "World") {
					selectedObject.traverse(function (obj) {
						if (obj.name != "World") {
							obj.position.sub(new THREE.Vector3().copy(arcballCenter));
							obj.position.applyAxisAngle(
								normal, 
								tempFirstClickPointPosition.angleTo(tempLastClickPointPosition)
							);
							obj.position.add(arcballCenter);
							obj.rotateOnWorldAxis(
								normal, 
								tempFirstClickPointPosition.angleTo(tempLastClickPointPosition)
							);
						}
					});
				} else {
					selectedObject.rotateOnWorldAxis(
						new THREE.Vector3().copy(normal).normalize(),
						tempFirstClickPointPosition.angleTo(tempLastClickPointPosition)
					);
				}
			}
			firstClickPointPosition = lastClickPointPosition;
		}
	}
}

function onDocumentMouseDown(event) {
	let mouseX = (event.clientX / window.innerWidth) * 2 - 1;
	let mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
	let vector = new THREE.Vector3(mouseX, mouseY, 1);
	vector.unproject(camera);

	if (!arcball.visible) {
		raycaster.set(camera.position, vector.sub(camera.position).normalize());
		var intersects = raycaster.intersectObjects(objects);
		if (intersects.length > 0) {
			controls.enabled = false;
			draggableObject = intersects[0].object;
			var intersects = raycaster.intersectObject(plane);
			offset.copy(intersects[0].point).sub(plane.position);
		}
	} else {
		firstClickPointPosition.copy(getArcballClickPosition(vector, plane, arcball));
		rotationMode = true;
	}
}

/* No event handling is needed on mouseUp */
function onDocumentMouseUp() {
	draggableObject = null;
	rotationMode = false;
}

function onDocumentMouseDoubleClick(event) {
	event.preventDefault();
	var intersects = getIntersections(event.layerX, event.layerY);
	if (intersects.length > 0) {

		var res = intersects.filter(function (res) {
			return res && res.object;
		})[0];
		if (res && res.object) {
			if (selectedObject === res.object || arcball === res.object) {
				arcball.visible = false;
				selectedObject = null;
			} else {
				selectedObject = res.object;
				arcballSelectorHelper(selectedObject, true);
			}
		}
	} else {
		/* This selects the external arcball with all the group objects, the
		 * catchAll group is needed to get all the objects on the screen
		 */
		let catchAll = new THREE.Group();
		for (let i = 0; i < groupOfObjects.children.length; i++) {
			if (groupOfObjects.children[i].name !== "Arcball") {
				catchAll.add(groupOfObjects.children[i].clone(true));
			}
		}
		arcballSelectorHelper(catchAll);
		selectedObject = groupOfObjects;
	}
}

/* This should work with touchpad scroll
 * https://threejs.org/examples/misc_controls_trackball.html
 */
function onDocumentMouseWheel(event) {
	/* The ideia is to reenable zoom, but controls must be disabled after */
	//controls.enabled=true;

	/* Dirty workarround to turn back mouse support, this should be fixed */
	let interval = event.deltaY/100;
	if (camera.zoom > 0.1 || interval < 0) {
		camera.zoom = camera.zoom + (0.019 * interval * (-1));
		camera.updateProjectionMatrix();
	}
}

/* Resize callback */
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

/* Rendering loop functions */
function animate() {
	requestAnimationFrame(animate);
	render();
	stats.update();
}

function render() {
	controls.update();
	renderer.render(scene, camera);
}

/* Finally the "main" loop */
init();
animate();
