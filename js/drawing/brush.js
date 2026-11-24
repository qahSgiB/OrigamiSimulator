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

  function getTextureId(){
    return textureId;
  }

  function setTextureNew(textureUrl) {
    textureId = nextTextureId;
    nextTextureId += 1;

    fetchTexture(textureLoader, textureUrl).then(function (brushTexture) {
      textures[textureId] = {
        usageCount: 1, // 1 because it is already available in the UI
        texture: brushTexture,
      };
    });

    return textureId;
  }

  function setTextureById(ehTextureId) {
    textureId = ehTextureId;
  }

  function getMaskingRadius() { return radius; }

  // radius: in pixels
  function setMaskingRadius(ehRadius) {
    radius = ehRadius;
  }

  // angle: in radians
  function setMaskingMinAngle(angle) {
    minAngleCos = Math.cos(angle);
  }

  function setMaskingDepthTest(depthTest) {
    depthEpsilon = depthTest ? DEPTH_TEST_DEFAULT : DEPTH_TEST_DISABLE;
  }

  function getTextureById(textureId) {
    return textures[textureId].texture;
  }

  // increases textures usage count by one
  function textureUse(textureId) {
    textures[textureId].usageCount += 1;
  }

  // increases textures usage count by one
  function textureUnuse(textureId) {
    var texture = textures[textureId];

    if (texture.usageCount > 1) {
      texture.usageCount -= 1;
    } else {
      texture.texture.dispose();
      delete textures[textureId];
    }
  }

  function getUniforms() {
    return {
      type: typeWithEraser,
      color: colorWithEraser,
      radius: new THREE.Vector2(2.0 * radius / window.innerWidth, 2.0 * radius / window.innerHeight), // TODO: not remembered because window size may change, better solution
      depthEpsilon: depthEpsilon,
      minAngleCos: minAngleCos,
      texture: textureId,
    };
  }


  var textureLoader = new THREE.TextureLoader();

  var type = undefined;
  var color = undefined;

  var typeWithEraser = undefined;
  var colorWithEraser = undefined;

  var textures = {};
  var nextTextureId = 0;
  var textureId = undefined;

  var radius = undefined;
  var minAngleCos = undefined;
  var depthEpsilon = undefined;


  return {
    getType: getType,
    setType: setType,
    setColorHex: setColorHex,
    getTextureId: getTextureId,
    setTextureNew: setTextureNew,
    setTextureById: setTextureById,
    setMaskingRadius: setMaskingRadius,
    getMaskingRadius: getMaskingRadius,
    setMaskingMinAngle: setMaskingMinAngle,
    setMaskingDepthTest: setMaskingDepthTest,
    getTextureById: getTextureById,
    textureUse: textureUse,
    textureUnuse: textureUnuse,
    getUniforms: getUniforms,
  }
}