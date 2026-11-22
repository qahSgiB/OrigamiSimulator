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

  function mouseToClipPoint(mouse) {
    return mouseToClipVector(mouse).add(new THREE.Vector2(-1.0, 1.0));
  }

  function mouseToClipVector(mouse) {
    return new THREE.Vector2(
      2.0 * mouse.x / window.innerWidth,
      -2.0 * mouse.y / window.innerHeight
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

    if (count === 0) {
      return from;
    }

    var step = d.clone().normalize().multiplyScalar(spacingPixel);
    var delta = mouseToClipVector(step);

    var brushUniforms = globalsDrawing.brush.getUniforms();

    var maxInstanceCount = globalsDrawing.getMaxInstanceCount();

    var bigCount = Math.floor(count / maxInstanceCount);

    for (var i = 0; i < bigCount; i += 1) {
      var start = mouseToClipPoint(from.clone().add(step.clone().multiplyScalar(1 + i * maxInstanceCount)));

      globalsDrawing.undo.makeStepBrush(
        frontSideEnabled, backSideEnabled,
        maxInstanceCount, start, delta,
        brushUniforms.radius, brushUniforms.depthEpsilon, brushUniforms.minAngleCos,
        brushUniforms.type, brushUniforms.color, brushUniforms.texture,
      );
    }

    var smallCount = count % maxInstanceCount;

    if (smallCount > 0) {
      var start = mouseToClipPoint(from.clone().add(step.clone().multiplyScalar(1 + bigCount * maxInstanceCount)));

      globalsDrawing.undo.makeStepBrush(
        frontSideEnabled, backSideEnabled,
        smallCount, start, delta,
        brushUniforms.radius, brushUniforms.depthEpsilon, brushUniforms.minAngleCos,
        brushUniforms.type, brushUniforms.color, brushUniforms.texture,
      );
    }

    return from.clone().add(step.clone().multiplyScalar(count));
  }

  function drawStamp(mouse) {
    var brushUniforms = globalsDrawing.brush.getUniforms();

    var center = mouseToClipPoint(mouse);
    var delta = new THREE.Vector2();

    globalsDrawing.undo.makeStepBrush(
      frontSideEnabled, backSideEnabled,
      1, center, delta,
      brushUniforms.radius, brushUniforms.depthEpsilon, brushUniforms.minAngleCos,
      brushUniforms.type, brushUniforms.color, brushUniforms.texture,
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