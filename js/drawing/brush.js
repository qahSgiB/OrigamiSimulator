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
      globalsDrawing.qMaterial.uniforms.brush_color.value = globalsDrawing.getClearColor();
      globalsDrawing.qMaterial.uniforms.brush_type.value = 1;
    } else {
      globalsDrawing.qMaterial.uniforms.brush_color.value = color;
      globalsDrawing.qMaterial.uniforms.brush_type.value = type;
    }
  }

  // color: hexadecimal string wihtout leading hashtag (e.g.: 'eeaa33')
  function setColorHex(colorHex) {
    var ehColor = parseHexColor(colorHex);

    color = ehColor;

    // do not adjust color in eraser mode
    if (type !== 6) {
      globalsDrawing.qMaterial.uniforms.brush_color.value = color;
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
    globalsDrawing.qMaterial.uniforms.brush_radius.value = new THREE.Vector2(2.0 * radius / window.innerWidth, 2.0 * radius / window.innerHeight);
  }

  // angle: in radians
  function setMaskingMinAngle(angle) {
    globalsDrawing.qMaterial.uniforms.brush_min_angle_cos.value = Math.cos(angle);
  }

  function setMaskingDepthTest(depthTest) {
    globalsDrawing.qMaterial.uniforms.depth_epsilon.value = depthTest ? DEPTH_TEST_DEFAULT : DEPTH_TEST_DISABLE;
  }


  var textureLoader = new THREE.TextureLoader();

  var type = undefined;
  var radius = undefined;
  var color = undefined;


  return {
    getType: getType,
    setType: setType,
    setColorHex: setColorHex,
    setTexture: setTexture,
    setMaskingRadius: setMaskingRadius,
    getMaskingRadius: getMaskingRadius,
    setMaskingMinAngle: setMaskingMinAngle,
    setMaskingDepthTest: setMaskingDepthTest,
  }
}