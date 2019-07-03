/* Helper functions:
 * getIntersections();
 * getArcballClickPosition();
 * arcballSelectorHelper();
 */

function getIntersections(x, y) {
	let mouse = new THREE.Vector3();

	x = (x / window.innerWidth) * 2 - 1;
	y = -(y / window.innerHeight) * 2 + 1;
	mouse.set(x, y, 0.5);
	raycaster.setFromCamera(mouse, camera);
	return raycaster.intersectObject(groupOfObjects, true);
}

function getArcballClickPosition(vector, plane, arcball) {
	raycaster.set(camera.position, vector.sub(camera.position).normalize());
	let intersects = raycaster.intersectObject(arcball);
	if (intersects != null && intersects[0] != null) {
		return intersects[0].point;
	} else {
		let intersects = raycaster.intersectObject(plane);
		return intersects[0].point;
	}
}

function arcballSelectorHelper (group, visibilityOverride) {
	let tempBox = new THREE.Box3().setFromObject(group)

	let center = new THREE.Vector3();
	tempBox.getCenter(center);
	arcball.position.x = center.x;
	arcball.position.y = center.y;
	arcball.position.z = center.z;

	let tempSphere = new THREE.Sphere();
	tempBox.getBoundingSphere(tempSphere);
	arcball.scale.x = tempSphere.radius / 50;
	arcball.scale.y = tempSphere.radius / 50;
	arcball.scale.z = tempSphere.radius / 50;

	if (visibilityOverride) {
		arcball.visible = true;
	} else {
		arcball.visible = !arcball.visible;
	}
}
