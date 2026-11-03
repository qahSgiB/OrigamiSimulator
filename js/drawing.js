function initDrawing(globals) {
  // constants
  var DEPTH_TEST_DEFAULT = 0.00001;
  var DEPTH_TEST_DISABLE = -69.0;

  // TODO: where to put this
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

    globals.drawing.textureFront = qRenderTargetFront.texture;
    globals.drawing.textureBack = qRenderTargetBack.texture;

    resetControlsValues();

    qClear();
  }

  function resetControlsValues() {
    setBrushSize(initRadius);
    setBrushType(initBrushType);
    setSpacing(initSpacing);
    setBrushColorHex(initColor);
    setBrushMinAngle(initMinBrushAngle);
    setBrushDepthTest(initDepthTest);
    setExportTransform(initExportTransform);
    setClearColor(initClearColor);
    setStampingMode(initStampingMode);
    setBrushTexture(initBrushTexture);
    setFrontSideEnabled(initFrontSideEnabled);
    setBackSideEnabled(initBackSideEnabled);
  }

  function qDraw() {
    var renderer = globals.threeView.renderer;

    var originalAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    if (frontSideEnabled) {
      qMaterial.uniforms.flip_normal.value = 1.0;
      renderer.render(qScene, qCamera, qRenderTargetFront);
    }

    if (backSideEnabled) {
      qMaterial.uniforms.flip_normal.value = -1.0;
      renderer.render(qScene, qCamera, qRenderTargetBack);
    }

    renderer.autoClear = originalAutoClear;
  }

  function qClear() {
    var renderer = globals.threeView.renderer;

    renderer.setClearColor(clearColor);

    renderer.setRenderTarget(qRenderTargetFront);
    renderer.clear();

    renderer.setRenderTarget(qRenderTargetBack);
    renderer.clear();
  }

  function textoreToPngBlob(renderTarget, cont) {
    // # copy texture from gpu
    var textureBuffer = new Uint8Array(textureSize * textureSize * 4);

    globals.threeView.renderer.readRenderTargetPixels(renderTarget, 0, 0, textureSize, textureSize, textureBuffer);

    // # put the texture on canvas
    var canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;

    var context = canvas.getContext('2d');
    var imageData = context.createImageData(textureSize, textureSize);

    for (var y = 0; y < textureSize; y++) {
      for (var x = 0; x < textureSize; x++) {
        var origX;
        var origY;

        if (exportTransform === 'none') {
          origX = x;
          origY = y;
        } else if (exportTransform === 'rotate') {
          origX = y;
          origY = textureSize - x - 1;
        }

        var index = (y * textureSize + x) * 4;
        var origIndex = (origY * textureSize + origX) * 4;

        for (var i = 0; i < 4; i++) {
          imageData.data[index + i] = textureBuffer[origIndex + i];
        }
      }
    }

    context.putImageData(imageData, 0, 0);

    // # export canvas to png
    canvas.toBlob(cont, 'image/png');
  }

  function qTextureToPngBlob(cont) {
    textoreToPngBlob(qRenderTargetFront, function (blobFront) {
      textoreToPngBlob(qRenderTargetBack, function (blobBack) {
        cont(blobFront, blobBack);
      });
    });
  }

  // callback: function to call after export is complete
  function saveQTexturePng(callback) {
    qTextureToPngBlob(function (blobFront, blobBack) {
      saveAs(blobFront, 'origami-texture-front.png');
      saveAs(blobBack, 'origami-texture-back.png');

      if (callback !== undefined) {
        callback();
      }
    });
  }

  // callback: function to call after export is complete
  function saveQTexturePdf(callback) {
    qTextureToPngBlob(function (blobFront, blobBack) {
      blobFront.arrayBuffer().then(function (pngBufferFront) {
        blobBack.arrayBuffer().then(function (pngBufferBack) {
          var pdf = new PDFDocument({ size: 'A4' });
          var pdfStream = pdf.pipe(blobStream());

          var widthA4 = 595.28;
          var heightA4 = 841.89;

          var aspectRatio = globals.model.getAspectRatio();
          if (exportTransform === 'rotate') {
            aspectRatio = 1.0 / aspectRatio;
          }

          // check if when streching to full width would fit height-wise
          var imagePdfSizing;
          if (aspectRatio * widthA4 <= heightA4) {
            imagePdfSizing = { width: widthA4, height: widthA4 * aspectRatio };
          } else {
            imagePdfSizing = { width: heightA4 / aspectRatio, height: heightA4 };
          }

          pdf.image(pngBufferFront, 0, 0, imagePdfSizing);
          pdf.addPage();
          pdf.image(pngBufferBack, 0, 0, imagePdfSizing);
          pdf.end();

          pdfStream.on('finish', function () {
            var pdfBlob = pdfStream.toBlob('application/pdf');
            saveAs(pdfBlob, 'haha.pdf');

            if (callback !== undefined) {
              callback();
            }
          });
        });
      });
    });
  }

  function updateQGeometry(geometry) {
    if (qQuad !== undefined) {
      qQuad.geometry = geometry;
    }
  }

  function updateQMVP() {
    var mesh = globals.model.getMesh()[0];

    qMaterial.uniforms.real_model_view.value = mesh.modelViewMatrix;
    qMaterial.uniforms.real_projection.value = globals.threeView.camera.projectionMatrix;
  }

  function getBrushType() {
    return brushType;
  }

  function setBrushType(type) {
    brushType = type;

    if (type === 6) { // eraser
      qMaterial.uniforms.brush_color.value = clearColor;
      qMaterial.uniforms.brush_type.value = 1;
    } else {
      qMaterial.uniforms.brush_color.value = brushColor;
      qMaterial.uniforms.brush_type.value = type;
    }
  }

  // radius: in pixels
  function setBrushSize(radius) {
    brushRadius = radius;
    qMaterial.uniforms.brush_radius.value = new THREE.Vector2(2.0 * radius / window.innerWidth, 2.0 * radius / window.innerHeight);
  }

  // color: hexadecimal string wihtout leading hashtag (e.g.: 'eeaa33')
  function setBrushColorHex(colorHex) {
    var color = parseHexColor(colorHex);

    brushColor = color;

    // do not adjust color in eraser mode
    if (brushType !== 6) {
      qMaterial.uniforms.brush_color.value = color;
    }
  }

  // spacing: in pixels
  function setSpacing(ehSpacing) {
    spacing = ehSpacing;
  }

  function setStampingMode(ehStampingMode) {
    stampingMode = ehStampingMode;
  }

  // angle: in radians
  function setBrushMinAngle(angle) {
    qMaterial.uniforms.brush_min_angle_cos.value = Math.cos(angle);
  }

  function setBrushDepthTest(depthTest) {
    qMaterial.uniforms.depth_epsilon.value = depthTest ? DEPTH_TEST_DEFAULT : DEPTH_TEST_DISABLE;
  }

  // exportTransform: 'none' | 'rotate'
  function setExportTransform(ehExportTransform) {
    if (!['none', 'rotate'].includes(ehExportTransform)) {
      throw new Error('transform paramter contains invalid value (valid values: \'none\', \'rotate\')');
    }

    exportTransform = ehExportTransform;
  }

  function setClearColor(color) {
    clearColor = color;
  }

  function setClearColorHex(colorHex) {
    var color = parseHexColor(colorHex);
    setClearColor(new THREE.Color(color.x, color.y, color.z));
  }

  function setBrushTexture(textureUrl) {
    fetchTexture(textureLoader, textureUrl).then(function (brushTexture) {
      qMaterial.uniforms.brush_texture.value = brushTexture;
    })
  }

  function setFrontSideEnabled(ehFrontSideEnabled) {
    frontSideEnabled = ehFrontSideEnabled;
  }

  function setBackSideEnabled(ehBackSideEnabled) {
    backSideEnabled = ehBackSideEnabled;
  }

  function getFrontSideEnabled() {
    return frontSideEnabled;
  }

  function getBackSideEnabled() {
    return backSideEnabled;
  }

  // # draw
  function drawFromTo(from, to) {
    var spacingPixel = 1.0;
    if (spacing !== 0.0) {
      spacingPixel = spacing * brushRadius * 2.0;
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

    updateQMVP();

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
      updateQMVP();

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
  var qRenderTargetFront = undefined;
  var qRenderTargetBack = undefined;
  var qMaterial = undefined;

  // # interaction
  var mouseButtonToDraw = 2;
  var lastMouse = undefined;

  // # export
  var exportTransform = undefined;

  // # sides
  var frontSideEnabled = undefined;
  var backSideEnabled = undefined;

  // # drawing
  var textureSize = 2048;

  var brushType = undefined;
  var brushRadius = undefined;
  var brushColor = undefined;
  var spacing = undefined;
  var stampingMode = undefined;
  var clearColor = undefined;

  // # init values
  var initFrontSideEnabled = true;
  var initBackSideEnabled = false;
  var initRadius = 50;
  var initBrushType = 3;
  var initSpacing = 0.05;
  var initColor = '000000';
  var initMinBrushAngle = Math.PI / 2.0;
  var initDepthTest = false;
  var initExportTransform = 'none';
  var initClearColor = new THREE.Color(1.0, 0.65, 0.9); // 'ffa6e6'
  var initStampingMode = false;
  var initBrushTexture = 'assets/hors.png';

  // # start
  initPreload();

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);

  function start() {
    globals.controls.setColorMode('texture');
  }

  function end() {}

  // # return
  return {
    start: start,
    end: end,
    updateGeometry: updateQGeometry,
    textureFront: undefined,
    textureBack: undefined,
    controls: {
      clear: qClear,
      resetControlsValues: resetControlsValues,
      getBrushType: getBrushType,
      setBrushType: setBrushType,
      setBrushSize: setBrushSize,
      setBrushColorHex: setBrushColorHex,
      setSpacing: setSpacing,
      setBrushMinAngle: setBrushMinAngle,
      setBrushDepthTest: setBrushDepthTest,
      saveTexturePng: saveQTexturePng,
      saveTexturePdf: saveQTexturePdf,
      setExportTransform: setExportTransform,
      setClearColorHex: setClearColorHex,
      setStampingMode: setStampingMode,
      setBrushTexture: setBrushTexture,
      setFrontSideEnabled: setFrontSideEnabled,
      setBackSideEnabled: setBackSideEnabled,
      getFrontSideEnabled: getFrontSideEnabled,
      getBackSideEnabled: getBackSideEnabled,
    }
  };
}