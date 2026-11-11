function initInteractivity(globals, globalsDrawing) {
  function setSpacing(ehSpacing) { spacing = ehSpacing; }
  function setStampingMode(ehStampingMode) { stampingMode = ehStampingMode; }
  function setFrontSideEnabled(ehFrontSideEnabled) { frontSideEnabled = ehFrontSideEnabled; }
  function getFrontSideEnabled() { return frontSideEnabled; }
  function setBackSideEnabled(ehBackSideEnabled) { backSideEnabled = ehBackSideEnabled; }
  function getBackSideEnabled() { return backSideEnabled; }
  function setClearColor(color) { clearColor = color; }
  function getClearColor() { return clearColor; }

  function setClearColorHex(colorHex) {
    var color = parseHexColor(colorHex);
    setClearColor(new THREE.Color(color.x, color.y, color.z));
  }

  function clear() {
    globalsDrawing.undo.makeStepClear(frontSideEnabled, backSideEnabled, clearColor);
  }

  function mouseToClip(mouse) {
    return new THREE.Vector2(
      2.0 * mouse.x / window.innerWidth - 1.0,
      -2.0 * mouse.y / window.innerHeight + 1.0
    );
  }

  function drawDrag(from, to) {
    var spacingPixel = 1.0;
    if (spacing !== 0.0) {
      spacingPixel = spacing * globalsDrawing.brush.getMaskingRadius() * 2.0;
    }

    var d = to.clone().sub(from);
    var l = d.length();
    var count = Math.round(l / spacingPixel);
    var step = d.clone().normalize().multiplyScalar(spacingPixel);

    var centers = [];

    for (var step_index = 1; step_index <= count; step_index++) {
      var center = from.clone().add(step.clone().multiplyScalar(step_index));
      centers.push(mouseToClip(center));
    }

    var brushUniforms = globalsDrawing.brush.getUniforms();

    globalsDrawing.undo.makeStepDrag(
      frontSideEnabled, backSideEnabled,
      centers,
      brushUniforms.radius, brushUniforms.depthEpsilon, brushUniforms.minAngleCos,
      brushUniforms.type, brushUniforms.color,
    );

    return from.clone().add(step.clone().multiplyScalar(count));
  }

  function drawStamp(mouse) {
    var brushUniforms = globalsDrawing.brush.getUniforms();
    var center = mouseToClip(mouse);

    globalsDrawing.undo.makeStepStamp(
      frontSideEnabled, backSideEnabled,
      center, brushUniforms.radius, brushUniforms.depthEpsilon, brushUniforms.minAngleCos,
      brushUniforms.type, brushUniforms.color,
    );
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
      lastMouse = drawDrag(lastMouse, mouse);
    }
  }

  function onMouseDown(event) {
    if (!globals.drawingActive) {
      return;
    }

    if (event.button === mouseButtonToDraw) {
      globalsDrawing.updateMVP();

      lastMouse = new THREE.Vector2(event.clientX, event.clientY);

      drawStamp(lastMouse);
    }
  }

  function onMouseUp(event) {
    if (event.button === mouseButtonToDraw) {
      lastMouse = undefined;
    }
  }

  var frontSideEnabled = undefined;
  var backSideEnabled = undefined;

  var spacing = undefined;
  var stampingMode = undefined;

  var clearColor = undefined;

  var mouseButtonToDraw = 2;
  var lastMouse = undefined;

  return {
    setSpacing: setSpacing,
    setStampingMode: setStampingMode,
    setFrontSideEnabled: setFrontSideEnabled,
    setBackSideEnabled: setBackSideEnabled,
    getFrontSideEnabled: getFrontSideEnabled,
    getBackSideEnabled: getBackSideEnabled,
    setClearColor: setClearColor,
    getClearColor: getClearColor,
    setClearColorHex: setClearColorHex,
    clear: clear,
    onMouseMove: onMouseMove,
    onMouseDown: onMouseDown,
    onMouseUp: onMouseUp,
  };
}