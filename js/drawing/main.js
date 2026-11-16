// TODO: global function, name conflicts
function parseHexColor(hex) {
  var r;
  var g;
  var b;

  if (hex.length === 3) {
    r = parseInt(hex[0], 16) / 15;
    g = parseInt(hex[1], 16) / 15;
    b = parseInt(hex[2], 16) / 15;
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  } else {
    throw new Error('hex color string has invalid length (valid lengths: 3, 6)');
  }

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    throw new Error('hex color string digits couldn\'t be parsed (using parseInt)');
  }

  return new THREE.Vector3(r, g, b);
}


function initDrawing(globals) {
  function fetchText(url) {
    return fetch(url).then(function (response) {
      return response.text();
    });
  }

  function initPreload() {
    // load resources parallelly
    Promise.all([
      fetchText('assets/shaders/brush-perspective.frag'),
      fetchText('assets/shaders/brush-perspective.vert'),
    ]).then(function (loaded) {
      var fragmentShader = loaded[0];
      var vertexShader = loaded[1];

      init(fragmentShader, vertexShader);
    });
  }

  function init(fragmentShader, vertexShader) {
    qCamera = new THREE.OrthographicCamera(-1.0, 1.0, 1.0, -1.0, -1.0, 1.0);

    qScene = new THREE.Scene();

    qRenderTargetFront = new THREE.WebGLRenderTarget(textureSize, textureSize, { depthBuffer: false });
    qRenderTargetBack = new THREE.WebGLRenderTarget(textureSize, textureSize, { depthBuffer: false });

    qMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        real_model_view: { value: new THREE.Matrix4() },
        real_projection: { value: new THREE.Matrix4() },
        brush_center: { value: new THREE.Vector2(), },
        brush_radius: { value: new THREE.Vector2(), },
        brush_type: { value: 0, },
        brush_color: { value: new THREE.Vector3(), },
        brush_texture: { value: undefined, },
        brush_min_angle_cos: { value: 0.0, },
        depth: { value: globals.threeView.depthTexture },
        depth_epsilon: { value: 0.0, },
        flip_normal: { value: 1.0, }
      },
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendEquationAlpha: THREE.AddEquation,
      blendDstAlpha: THREE.OneFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      side: THREE.DoubleSide,
    });

    var geometry = globals.model.getGeometry();
    qQuad = new THREE.Mesh(geometry, qMaterial);

    qScene.add(qQuad);

    globalsDrawing.qMaterial = qMaterial;
    globalsDrawing.qRenderTargetFront = qRenderTargetFront;
    globalsDrawing.qRenderTargetBack = qRenderTargetBack;
    globalsDrawing.textureFront = qRenderTargetFront.texture;
    globalsDrawing.textureBack = qRenderTargetBack.texture;

    resetControlsValues();

    globalsDrawing.undo.makeStepClear(true, true, globalsDrawing.interactivity.getClearColor());
  }

  function updateGeometry(geometry) {
    if (qQuad !== undefined) {
      qQuad.geometry = geometry;
    }
  }

  function updateMVP() {
    var mesh = globals.model.getMesh()[0];

    qMaterial.uniforms.real_model_view.value = mesh.modelViewMatrix;
    qMaterial.uniforms.real_projection.value = globals.threeView.camera.projectionMatrix;
  }

  function withAutoClearRestore(callback) {
    var renderer = globals.threeView.renderer;

    var originalAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    callback();

    renderer.autoClear = originalAutoClear;
  }

  function drawFront() {
    var renderer = globals.threeView.renderer;

    renderer.render(qScene, qCamera, qRenderTargetFront);
  }

  function drawBack() {
    var renderer = globals.threeView.renderer;

    renderer.render(qScene, qCamera, qRenderTargetBack);
  }

  function resetControlsValues() {
    globalsDrawing.brush.setType(initBrushType);
    globalsDrawing.brush.setColorHex(initBrushColor);
    globalsDrawing.brush.setTexture(initBrushTexture);
    globalsDrawing.brush.setMaskingRadius(initBrushRadius);
    globalsDrawing.brush.setMaskingMinAngle(initBrushMinAngle);
    globalsDrawing.brush.setMaskingDepthTest(initBrushDepthTest);

    globalsDrawing.interactivity.setSpacing(initSpacing);
    globalsDrawing.interactivity.setStampingMode(initStampingMode);
    globalsDrawing.interactivity.setFrontSideEnabled(initFrontSideEnabled);
    globalsDrawing.interactivity.setBackSideEnabled(initBackSideEnabled);
    globalsDrawing.interactivity.setClearColor(initClearColor);

    globalsDrawing.export.setExportTransform(initExportTransform);
  }

  function start() {
    globals.controls.setColorMode('texture');
  }

  function end() {}


  var qCamera = undefined;
  var qScene = undefined;
  var qQuad = undefined;
  var qRenderTargetFront = undefined;
  var qRenderTargetBack = undefined;
  var qMaterial = undefined;

  var textureSize = 2048;

  var initBrushType = 3;
  var initBrushColor = '000000';
  var initBrushTexture = 'assets/hors.png';
  var initBrushRadius = 50;
  var initBrushMinAngle = Math.PI / 2.0;
  var initBrushDepthTest = false;
  var initSpacing = 0.05;
  var initStampingMode = false;
  var initExportTransform = 'none';
  var initClearColor = new THREE.Color(1.0, 0.65, 0.9); // 'ffa6e6'
  var initFrontSideEnabled = true;
  var initBackSideEnabled = false;


  var globalsDrawing = {
    textureFront: undefined,
    textureBack: undefined,
    qMaterial: undefined,
    qRenderTargetFront: undefined,
    qRenderTargetFront: undefined,
    textureSize: textureSize,
    updateGeometry: updateGeometry,
    updateMVP: updateMVP,
    withAutoClearRestore: withAutoClearRestore,
    drawFront: drawFront,
    drawBack: drawBack,
    resetControlsValues: resetControlsValues,
    start: start,
    end: end,
  }

  globalsDrawing.brush = initBrush(globals, globalsDrawing);
  globalsDrawing.export = initExport(globals, globalsDrawing);
  globalsDrawing.interactivity = initInteractivity(globals, globalsDrawing);
  globalsDrawing.undo = initUndo(globals, globalsDrawing);

  initPreload();

  document.addEventListener('mousemove', globalsDrawing.interactivity.onMouseMove);
  document.addEventListener('mousedown', globalsDrawing.interactivity.onMouseDown);
  document.addEventListener('mouseup', globalsDrawing.interactivity.onMouseUp);

  return globalsDrawing;
}