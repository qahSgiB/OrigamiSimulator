function initDrawing(globals) {
  function fetchText(url) {
    return fetch(url).then(function (response) {
      return response.text();
    });
  }

  function fetchTexture(textureLoader, textureName) {
    return new Promise(function(resolve) {
      textureLoader.load(textureName, function (texture) {
        resolve(texture)
      });
    })
  }

  function init() {
    // load resources parallelly
    Promise.all([
      fetchText('assets/shaders/brush-perspective.frag'),
      fetchText('assets/shaders/brush-perspective.vert'),
      fetchTexture(textureLoader, 'assets/hors.png')
    ]).then(function (loaded) {
      var fragmentShader = loaded[0];
      var vertexShader = loaded[1];
      var horseeTexture = loaded[2];

      init2(fragmentShader, vertexShader, horseeTexture);
    });
  }

  function init2(fragmentShader, vertexShader, horseeTexture) {
    qCamera = new THREE.OrthographicCamera(-1.0, 1.0, 1.0, -1.0, -1.0, 1.0);

    qScene = new THREE.Scene();

    qRenderTarget = new THREE.WebGLRenderTarget(textureSize, textureSize, { depthBuffer: false });

    qMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        real_model_view: { value: new THREE.Matrix4() },
        // real_normal: { value: new THREE.Matrix3() },
        real_projection: { value: new THREE.Matrix4() },
        brush_center: { value: THREE.Vector2(), },
        brush_radius: { value: THREE.Vector2(), },
        brush_type: { value: 0, },
        brush_texture: { value: horseeTexture, },
        depth: { value: globals.threeView.depthTexture },
        // depth_epsilon: { value: 0.00001 }
        depth_epsilon: { value: 69.0 }
      },
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendEquationAlpha: THREE.AddEquation,
      blendDstAlpha: THREE.OneFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      // blendSrc: THREE.OneFactor,
      // blendDst: THREE.ZeroFactor,
      side: THREE.DoubleSide,
    });

    var geometry = globals.model.getGeometry();
    qQuad = new THREE.Mesh(geometry, qMaterial);

    qScene.add(qQuad);

    globals.drawing.texture = qRenderTarget.texture;

    resetControlsValues();

    qClear();
  }

  function resetControlsValues() {
    setBrushSize(initRadius);
    setBrushType(initBrush);
    setSpacing(initSpacing);
  }

  function qDraw() {
    var renderer = globals.threeView.renderer;

    var originalAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    renderer.render(qScene, qCamera, qRenderTarget);

    renderer.autoClear = originalAutoClear;
  }

  function qClear() {
    var renderer = globals.threeView.renderer;

    renderer.setRenderTarget(qRenderTarget);

    renderer.setClearColor(new THREE.Color(1.0, 0.65, 0.9));
    // renderer.setClearColor(new THREE.Color(0.0, 0.0, 0.0));
    renderer.clear();
  }

  function saveTexture() {
    // # copy texture from gpu
    var textureBuffer = new Uint8Array(textureSize * textureSize * 4);

    globals.threeView.renderer.readRenderTargetPixels(qRenderTarget, 0, 0, textureSize, textureSize, textureBuffer);

    // # put the texture on canvas
    var canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;

    var context = canvas.getContext('2d');
    var imageData = context.createImageData(textureSize, textureSize);

    for (var i = 0; i < textureSize * textureSize * 4; i++) {
      imageData.data[i] = textureBuffer[i];
    }

    context.putImageData(imageData, 0, 0);

    // # export canvas to png
    canvas.toBlob(function (blob) {
      saveAs(blob, 'haha.png');
    }, 'image/png')
  }

  function updateGeometry(geometry) {
    if (qQuad !== undefined) {
      qQuad.geometry = geometry;
    }
  }

  function updateMVP() {
    var mesh = globals.model.getMesh()[0];

    qMaterial.uniforms.real_model_view.value = mesh.modelViewMatrix;
    // qMaterial.uniforms.real_normal.value = mesh.normalMatrix;
    qMaterial.uniforms.real_projection.value = globals.threeView.camera.projectionMatrix;
  }

  function getBrushType() {
    return qMaterial.uniforms.brush_type.value;
  }

  function setBrushType(type) {
    qMaterial.uniforms.brush_type.value = type;
  }

  // radius: in pixels
  function setBrushSize(radius) {
    qMaterial.uniforms.brush_radius.value = new THREE.Vector2(2.0 * radius / window.innerWidth, 2.0 * radius / window.innerHeight);
  }

  // spacing: in pixels
  function setSpacing(ehSpacing) {
    spacing = ehSpacing;
  }

  // # draw
  function drawFromTo(from, to) {
    var d = to.clone().sub(from);
    var l = d.length();
    var count = Math.round(l / spacing);
    var step = d.clone().normalize().multiplyScalar(spacing);

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

    qMaterial.uniforms.brush_center.value = mouseClip;

    qDraw(); // TODO: where to put this ?
  }

  // # interaction
  function onMouseMove(event) {
    if (!globals.drawingActive) {
      return;
    }

    if (lastMouse === undefined) {
      return;
    }

    updateMVP();

    var mouse = new THREE.Vector2(event.clientX, event.clientY);
    lastMouse = drawFromTo(lastMouse, mouse);
  }

  function onMouseDown(event) {
    if (!globals.drawingActive) {
      return;
    }

    if (event.button === mouseButtonToDraw) {
      updateMVP();

      lastMouse = new THREE.Vector2(event.clientX, event.clientY);
      drawAt(lastMouse);
    }
  }

  function onMouseUp(event) {
    if (event.button === mouseButtonToDraw) {
      lastMouse = undefined;
    }
  }

  // # texture loader
  var textureLoader = new THREE.TextureLoader();

  // # q
  var qCamera = undefined;
  var qScene = undefined;
  var qQuad = undefined;
  var qRenderTarget = undefined;
  var qMaterial = undefined;

  // # interaction
  var mouseButtonToDraw = 2;
  var lastMouse = undefined;

  // # params
  var textureSize = 2048;

  var initRadius = 50;
  var initBrush = 3;
  var initSpacing = 5;

  var spacing = initSpacing;

  // # start
  init();

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);

  function start() {
    globals.controls.setColorMode('texture');
  }

  function end() {
  }

  // # return
  return {
    start: start,
    end: end,
    updateGeometry: updateGeometry,
    texture: undefined,
    controls: {
      clear: qClear,
      resetControlsValues: resetControlsValues,
      getBrushType: getBrushType,
      setBrushType: setBrushType,
      setBrushSize: setBrushSize,
      setSpacing: setSpacing,
      saveTexture: saveTexture,
    }
  };
}