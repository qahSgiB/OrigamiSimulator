function initUndo(globals, globalsDrawing) {
  function applyStepClear(step, frontSideEnable, backSideEnable) {
    var renderer = globals.threeView.renderer;

    renderer.setClearColor(step.color);

    if (frontSideEnable && step.frontSide) {
      renderer.setRenderTarget(globalsDrawing.qRenderTargetFront);
      renderer.clear();
    }

    if (backSideEnable && step.backSide) {
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

  function applyStepStamp(step, frontSideEnable, backSideEnable) {
    setCommonUniforms(step);

    globalsDrawing.qMaterial.uniforms.brush_center.value = step.maskingCenter;

    globalsDrawing.withAutoClearRestore(function () {
      if (frontSideEnable && step.frontSide) {
        globalsDrawing.qMaterial.uniforms.flip_normal.value = 1.0;
        globalsDrawing.drawFront(); // TODO: where to put this ?
      }

      if (backSideEnable && step.backSide) {
        globalsDrawing.qMaterial.uniforms.flip_normal.value = -1.0;
        globalsDrawing.drawBack();
      }
    });
  }

  function applyStepDrag(step, frontSideEnable, backSideEnable) {
    setCommonUniforms(step);

    globalsDrawing.withAutoClearRestore(function () {
      if (frontSideEnable && step.frontSide) {
        globalsDrawing.qMaterial.uniforms.flip_normal.value = 1.0;

        // TODO: use instanced rendering
        for (var center of step.centers) {
          globalsDrawing.qMaterial.uniforms.brush_center.value = center;
          globalsDrawing.drawFront();
        }
      }

      if (backSideEnable && step.backSide) {
        globalsDrawing.qMaterial.uniforms.flip_normal.value = -1.0;

        for (var center of step.centers) {
          globalsDrawing.qMaterial.uniforms.brush_center.value = center;
          globalsDrawing.drawBack();
        }
      }
    });
  }

  function applyStep(step, frontSideEnable, backSideEnable) {
    if (step.type === 'clear') {
      applyStepClear(step, frontSideEnable, backSideEnable);
    } else if (step.type === 'stamp') {
      applyStepStamp(step, frontSideEnable, backSideEnable);
    } else if (step.type === 'drag') {
      applyStepDrag(step, frontSideEnable, backSideEnable);
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

    updateHarbors();

    applyStep(step, true, true);
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

  function updateHarbors() {
    var step = history[currentStep];

    if (step.type === 'clear') {
      if (step.frontSide) {
        lastFrontHarbor = currentStep;
      }

      if (step.backSide) {
        lastBackHarbor = currentStep;
      }
    }
  }

  function canUndo() {
    return currentStep > 0;
  }

  /**
   * `undo` assumes that the very first step (undex 0) is a step with type clear.
   */
  function undo() {
    if (!canUndo()) {
      throw new Error('cannot undo'); // TODO: error handling
    }

    /// If the step we are undoing is affecting only one side we do not want to perform any unnecessary work on the other side.
    ///
    /// For example if the step we are undoing is affecting only front side we do not:
    ///  - update the back side harbor
    ///  - apply any steps on back side
    /// If some step is affecting both front side and back side, we ignore the back side part of the step.
    /// We can ignore the back side step because we know that the back side haven't changed between current step and the step before.
    var undoFront = history[currentStep].frontSide;
    var undoBack = history[currentStep].backSide;

    currentStep -= 1;

    // # update front harbor
    if (undoFront && lastFrontHarbor > currentStep) {
      lastFrontHarbor = currentStep;
      while (true) {
        var step = history[lastFrontHarbor];
        if (step.type === 'clear' && step.frontSide) { break; }

        lastFrontHarbor -= 1;
      }
    }

    // # update back harbor
    if (undoBack && lastBackHarbor > currentStep) {
      while (true) {
        var step = history[lastBackHarbor];
        if (step.type === 'clear' && step.backSide) { break; }

        lastBackHarbor -= 1;
      }
    }

    // # apply one side steps

    /// <fromFront, currentStep> is interval of steps which need to be applied on frontside.
    /// <fromBack, currentStep> is a same interval for back side.
    ///
    /// If we are updating only front side (`frontSide` is true and `backSide` is false) we do not need to apply any back side steps.
    /// We set `fromBack = currentStep + 1`, which makes the back side interval empty.
    /// This results in the application of only steps from interval <lastFrontHarbor, currentStep> and only their front side portion will be applied.
    /// (Only the first `for` loop, responsible for front side only application, will be run.)
    var fromFront = undoFront ? lastFrontHarbor : currentStep + 1;
    var fromBack = undoBack ? lastBackHarbor : currentStep + 1;

    var maxHarbor = fromBack;

    if (fromFront < fromBack) {
      for (var tStep = fromFront; tStep < fromBack; tStep += 1) {
        applyStep(history[tStep], true, false);
      }
    } else if (fromFront > fromBack) {
      for (var tStep = fromBack; tStep < fromFront; tStep += 1) {
        applyStep(history[tStep], false, true);
      }

      maxHarbor = fromFront;
    }

    // # apply both side steps
    for (var tStep = maxHarbor; tStep <= currentStep; tStep += 1) {
      applyStep(history[tStep], true, true);
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

    updateHarbors();

    applyStep(history[currentStep], true, true);
  }

  var currentStep = -1;

  var lastFrontHarbor = -1; // TODO: could use some optimal data structure
  var lastBackHarbor = -1;
  var history = [];

  return {
    makeStepClear: makeStepClear,
    makeStepStamp: makeStepStamp,
    makeStepDrag: makeStepDrag,
    undo: undo,
    redo: redo,
  }
}