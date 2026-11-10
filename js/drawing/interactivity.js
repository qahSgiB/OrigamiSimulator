function initInteractivity(globals, globalsDrawing) {
  function setSpacing(ehSpacing) { spacing = ehSpacing; }

  function setStampingMode(ehStampingMode) { stampingMode = ehStampingMode; }

  function drawFromTo(from, to) {
    var spacingPixel = 1.0;
    if (spacing !== 0.0) {
      spacingPixel = spacing * globalsDrawing.brush.getMaskingRadius() * 2.0;
    }

    var d = to.clone().sub(from);
    var l = d.length();
    var count = Math.round(l / spacingPixel);
    var step = d.clone().normalize().multiplyScalar(spacingPixel);

    for (var step_index = 1; step_index <= count; step_index++) {
      var pos = from.clone().add(step.clone().multiplyScalar(step_index));

      drawAt(pos);
    }

    return from.clone().add(step.clone().multiplyScalar(count));
  }

  function drawAt(mouse) {
    var mouseClip = new THREE.Vector2(
      2.0 * mouse.x / window.innerWidth - 1.0,
      -2.0 * mouse.y / window.innerHeight + 1.0
    );

    globalsDrawing.qMaterial.uniforms.brush_center.value = mouseClip;

    globalsDrawing.draw(); // TODO: where to put this ?
  }

  function onMouseMove(event) {
    if (!globals.drawingActive) {
      return;
    }

    if (lastMouse === undefined) {
      return;
    }

    globalsDrawing.updateMVP();

    var mouse = new THREE.Vector2(event.clientX, event.clientY);

    if (stampingMode) {
      lastMouse = mouse;
    } else {
      lastMouse = drawFromTo(lastMouse, mouse);
    }
  }

  function onMouseDown(event) {
    if (!globals.drawingActive) {
      return;
    }

    if (event.button === mouseButtonToDraw) {
      globalsDrawing.updateMVP();

      lastMouse = new THREE.Vector2(event.clientX, event.clientY);
      drawAt(lastMouse);
    }
  }

  function onMouseUp(event) {
    if (event.button === mouseButtonToDraw) {
      lastMouse = undefined;
    }
  }

  var spacing = undefined;
  var stampingMode = undefined;

  var mouseButtonToDraw = 2;
  var lastMouse = undefined;

  return {
    setSpacing: setSpacing,
    setStampingMode: setStampingMode,
    onMouseMove: onMouseMove,
    onMouseDown: onMouseDown,
    onMouseUp: onMouseUp,
  };
}