function initDrawing(globals) {
  // # fns
  function fetchShader(url) {
    return fetch(url).then(function (response) {
      return response.text();
    });
  }

  function qPrepare() {
    Promise.all([
      fetchShader('shaders/drawing/draw-line.frag'),
      fetchShader('shaders/drawing/draw-line.vert'),
      textureLoaderP('horsee.png')
    ]).then(function (loaded) {
      var fragmentShader = loaded[0];
      var vertexShader = loaded[1];
      var horseeTexture = loaded[2];

      qPrepare1(fragmentShader, vertexShader, horseeTexture);
    });
  }

  function qPrepare1(fragmentShader, vertexShader, horseeTexture) {
    var hs = qTextureSize / 2;
    qCamera = new THREE.OrthographicCamera(-hs, hs, hs, -hs, 1, 10);

    qScene = new THREE.Scene();

    qTexture = new THREE.WebGLRenderTarget(qTextureSize, qTextureSize, { depthBuffer: false });

    qMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        type: { value: 3 },
        mouse: { value: new THREE.Vector2(0.0, 0.0) },
        r: { value: 0.05 },
        brush: { value: horseeTexture },
      },
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });

    var qPlane = new THREE.PlaneGeometry(qTextureSize, qTextureSize);

    var qQuad = new THREE.Mesh(qPlane, qMaterial);
    qQuad.position.z = -5;
    qScene.add(qQuad);

    globals.drawing.texture = qTexture.texture;

    qClear(); // TODO: where to put this
  }

  function withQ(qdo) {
    var renderer = globals.threeView.renderer;

    var originalAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    renderer.setRenderTarget(qTexture);
    qdo(renderer); // TODO: should renderer be param
    renderer.setRenderTarget(null);

    renderer.autoClear = originalAutoClear;
  }

  function qDraw() {
    withQ(function (renderer) {
      renderer.render(qScene, qCamera, qTexture);
    })
  }

  function qClear() {
    withQ(function (renderer) {
      renderer.setClearColor(new THREE.Color(1.0, 0.65, 0.9));
      renderer.clear();
    })
  }

  function qSetBrushType(type) {
    qMaterial.uniforms.type.value = type;
  }

  function qSetRadius(radius) {
    qMaterial.uniforms.r.value = radius;
  }

  // # raycaster
  var raycaster = new THREE.Raycaster();

  // // # textures
  var textureLoader = new THREE.TextureLoader();
  var textureLoaderP = function(textureName) {
    return new Promise(function(resolve) {
      textureLoader.load(textureName, function (texture) {
        resolve(texture)
      });
    })
  }

  // textureLoader.load('horsee.png', function (horseeTextureL) {
  //   // horseeTextureL.generateMipmaps = false;
  //   // horseeTextureL.magFilter = THREE.LinearFilter;
  //   // horseeTextureL.minFilter = THREE.LinearFilter;
  //   horseeTexture = horseeTextureL;
  // });
  // textureLoader.load('tma16.png', function (blackTextureL) {
  //   blackTexture = blackTextureL;
  // });

  // # draw line program
  var qTextureSize = 512;

  var qCamera = undefined;
  var qScene = undefined;
  var qTexture = undefined;
  var qMaterial = undefined;

  qPrepare();

  var mouseButtonToDraw = 2;
  var lastMouse = undefined;
  var mouseDown = false;

  // one pixel maybe
  // TODO: how to set spacing
  var spacingx = 1.0 / window.innerWidth;
  var spacingy = 1.0 / window.innerHeight;
  var spacing = Math.pow(spacingx * spacingx + spacingy * spacingy, 0.5) * 10.0;

  // # interactivity
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
    raycaster.setFromCamera(mouse, globals.threeView.camera);

    var intersections = raycaster.intersectObjects(globals.model.getMesh(), false);

    if (intersections.length > 0) {
      var closest = intersections[0];

      var uv_x = closest.uv.x;
      var uv_y = closest.uv.y;

      qMaterial.uniforms.mouse.value = new THREE.Vector2(uv_x, uv_y);

      qDraw(); // TODO: where to put this ?
    }
  }

  function mousePos(event) {
    return new THREE.Vector2(
      2.0 * event.clientX / window.innerWidth - 1.0,
      -2.0 * event.clientY / window.innerHeight + 1.0
    );
  }

  function onMouseMove(event) {
    if (!globals.drawingActive) {
      return;
    }

    if (lastMouse === undefined) {
      return;
    }

    var mouse = mousePos(event);

    lastMouse = drawFromTo(lastMouse, mouse);
  }

  function onMouseDown(event) {
    if (!globals.drawingActive) {
      return;
    }

    if (event.button === mouseButtonToDraw) {
      lastMouse = mousePos(event);

      drawAt(lastMouse);
    }
  }

  function onMouseUp(event) {
    if (event.button === mouseButtonToDraw) {
      lastMouse = undefined;
    }
  }

  function onKeyUp(event) {
    if (!globals.drawingActive) {
      return;
    }

    if (event.code === 'KeyC') {
      qClear(); // TODO: where to put this ?
    }
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('keyup', onKeyUp);

  function start() {
    globals.controls.setColorMode('texture');
  }

  function end() {
    // globals.model.setMeshMaterial();
  }


  // # return
  return {
    start: start,
    end: end,
    texture: undefined,
    controls: {
      clear: qClear,
      setBrushType: qSetBrushType,
      setRadius: qSetRadius,
    }
  };
}