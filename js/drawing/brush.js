function initBrush(globals, globalsDrawing) {
  var DEPTH_TEST_DEFAULT = 0.00001;
  var DEPTH_TEST_DISABLE = -69.0;


  function fetchTexture(textureLoader, textureName) {
    return new Promise(function(resolve) {
      textureLoader.load(textureName, function (texture) {
        resolve(texture)
      });
    })
  }

  function getType() {
    return type;
  }

  // # brush setters
  function setType(ehType) {
    type = ehType;

    if (type === 6) { // eraser
      colorWithEraser = globalsDrawing.interactivity.getClearColor();
      typeWithEraser = 1;
    } else {
      colorWithEraser = color;
      typeWithEraser = type;
    }
  }

  // color: hexadecimal string wihtout leading hashtag (e.g.: 'eeaa33')
  function setColorHex(colorHex) {
    var ehColor = parseHexColor(colorHex);

    color = ehColor;

    // do not adjust color in eraser mode
    if (type !== 6) {
      colorWithEraser = color;
    }
  }

  function setTexture(textureUrl) {
    fetchTexture(textureLoader, textureUrl).then(function (brushTexture) {
      globalsDrawing.qMaterial.uniforms.brush_texture.value = brushTexture;
    })
  }

  function getMaskingRadius() { return radius; }

  // radius: in pixels
  function setMaskingRadius(ehRadius) {
    radius = ehRadius;
    radiusVector = new THREE.Vector2(2.0 * radius / window.innerWidth, 2.0 * radius / window.innerHeight);
  }

  // angle: in radians
  function setMaskingMinAngle(angle) {
    minAngleCos = Math.cos(angle);
  }

  function setMaskingDepthTest(depthTest) {
    depthEpsilon = depthTest ? DEPTH_TEST_DEFAULT : DEPTH_TEST_DISABLE;
  }

  function getUniforms() {
    return {
      type: typeWithEraser,
      color: colorWithEraser,
      radius: radiusVector,
      depthEpsilon: depthEpsilon,
      minAngleCos: minAngleCos,
    };
  }


  var textureLoader = new THREE.TextureLoader();

  var type = undefined;
  var color = undefined;

  var typeWithEraser = undefined;
  var colorWithEraser = undefined;

  var radius = undefined;
  var radiusVector = undefined;
  var minAngleCos = undefined;
  var depthEpsilon = undefined;


  return {
    getType: getType,
    setType: setType,
    setColorHex: setColorHex,
    setTexture: setTexture,
    setMaskingRadius: setMaskingRadius,
    getMaskingRadius: getMaskingRadius,
    setMaskingMinAngle: setMaskingMinAngle,
    setMaskingDepthTest: setMaskingDepthTest,
    getUniforms: getUniforms,
  }
}