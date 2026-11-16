function initUndo(globals, globalsDrawing) {
  function applyStepClear(step) {
    var renderer = globals.threeView.renderer;

    renderer.setClearColor(step.color);

    if (step.frontSide) {
      renderer.setRenderTarget(globalsDrawing.qRenderTargetFront);
      renderer.clear();
    }

    if (step.backSide) {
      renderer.setRenderTarget(globalsDrawing.qRenderTargetBack);
      renderer.clear();
    }
  }

  function setCommonUniforms(step) {
    globalsDrawing.qMaterial.uniforms.brush_radius.value = step.maskingRadius;
    globalsDrawing.qMaterial.uniforms.brush_type.value = step.brushType;
    globalsDrawing.qMaterial.uniforms.brush_color.value = step.brushColor;
    globalsDrawing.qMaterial.uniforms.brush_texture.value = globalsDrawing.brush.getTextureById(step.brushTexture); // TODO: id to three.Texture
    globalsDrawing.qMaterial.uniforms.brush_min_angle_cos.value = step.maskingMinAngleCos;
    globalsDrawing.qMaterial.uniforms.depth_epsilon.value = step.maskingDepthEpsilon;
  }

  function applyStepStamp(step) {
    setCommonUniforms(step);

    globalsDrawing.qMaterial.uniforms.brush_center.value = step.maskingCenter;

    globalsDrawing.withAutoClearRestore(function () {
      if (step.frontSide) {
        globalsDrawing.qMaterial.uniforms.flip_normal.value = 1.0;
        globalsDrawing.drawFront(); // TODO: where to put this ?
      }

      if (step.backSide) {
        globalsDrawing.qMaterial.uniforms.flip_normal.value = -1.0;
        globalsDrawing.drawBack();
      }
    });
  }

  function applyStepDrag(step) {
    setCommonUniforms(step);

    globalsDrawing.withAutoClearRestore(function () {
      if (step.frontSide) {
        globalsDrawing.qMaterial.uniforms.flip_normal.value = 1.0;

        // TODO: use instanced rendering
        for (var center of step.centers) {
          globalsDrawing.qMaterial.uniforms.brush_center.value = center;
          globalsDrawing.drawFront();
        }
      }

      if (step.backSide) {
        globalsDrawing.qMaterial.uniforms.flip_normal.value = -1.0;

        for (var center of step.centers) {
          globalsDrawing.qMaterial.uniforms.brush_center.value = center;
          globalsDrawing.drawBack();
        }
      }
    });
  }

  function applyStep(step) {
    if (step.type === 'clear') {
      applyStepClear(step);
    } else if (step.type === 'stamp') {
      applyStepStamp(step);
    } else if (step.type === 'drag') {
      applyStepDrag(step);
    }
  }

  function useTexture(step) {
    if (step.type === 'stamp' || step.type === 'drag') {
      globalsDrawing.brush.textureUse(step.brushTexture);
    }
  }

  function unuseTexture(step) {
    if (step.type === 'stamp' || step.type === 'drag') {
      globalsDrawing.brush.textureUnuse(step.brushTexture);
    }
  }

  function addStep(step) {
    if (currentStep !== history.length - 1) {
      for (var i = currentStep + 1; i < history.length; i += 1) {
        unuseTexture(history[i]);
      }

      history.splice(currentStep + 1, history.length - currentStep - 1);
    }

    useTexture(step);

    history.push(step);
    currentStep += 1;

    applyStep(step);
  }

  function makeStepClear(frontSide, backSide, color) {
    addStep({
      type: 'clear',
      frontSide: frontSide,
      backSide: backSide,
      color: color,
    });
  }

  // TODO: missing: positions, uvs, MV, P, depth texture
  function makeStepStamp(
    frontSide, backSide,
    maskingCenter, maskingRadius, maskingDepthEpsilon, maskingMinAngleCos,
    brushType, brushColor, brushTexture,
  ) {
    addStep({
      type: 'stamp',
      frontSide: frontSide,
      backSide: backSide,
      maskingCenter: maskingCenter,
      maskingRadius: maskingRadius,
      maskingDepthEpsilon: maskingDepthEpsilon,
      maskingMinAngleCos: maskingMinAngleCos,
      brushType: brushType,
      brushColor: brushColor,
      brushTexture: brushTexture,
    });
  }

  // TODO: missing: positions, uvs, MV, P, depth texture
  function makeStepDrag(
    frontSide, backSide,
    centers,
    maskingRadius, maskingDepthEpsilon, maskingMinAngleCos,
    brushType, brushColor, brushTexture,
  ) {
    addStep({
      type: 'drag',
      frontSide: frontSide,
      backSide: backSide,
      centers: centers,
      maskingRadius: maskingRadius,
      maskingDepthEpsilon: maskingDepthEpsilon,
      maskingMinAngleCos: maskingMinAngleCos,
      brushType: brushType,
      brushColor: brushColor,
      brushTexture: brushTexture,
    });
  }

  function canUndo() {
    return currentStep > 0;
  }

  // undo assumes that the very first step (undex 0) is a step with type clear
  function undo() {
    if (!canUndo()) {
      throw new Error('cannot undo'); // TODO: error handling
    }

    var fromStep = currentStep - 1; // TODO: cache fromStep
    while (history[fromStep].type !== 'clear') { fromStep -= 1; }

    currentStep -= 1;

    for (var step = fromStep; step <= currentStep; step += 1) {
      applyStep(history[step]);
    }
  }

  function canRedo() {
    return currentStep < history.length - 1;
  }

  function redo() {
    if (!canRedo()) {
      throw new Error('cannot redo'); // TODO: error handling
    }

    currentStep += 1;

    applyStep(history[currentStep]);
  }

  var currentStep = -1;

  var history = [];

  return {
    makeStepClear: makeStepClear,
    makeStepStamp: makeStepStamp,
    makeStepDrag: makeStepDrag,
    undo: undo,
    redo: redo,
  }
}