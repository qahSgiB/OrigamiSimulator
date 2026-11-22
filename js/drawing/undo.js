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

  function applyStepBrush(step, frontSideEnable, backSideEnable) {
    globalsDrawing.qMaterial.uniforms.brush_center_start.value = step.centerStart;
    globalsDrawing.qMaterial.uniforms.brush_center_delta.value = step.centerDelta;

    globalsDrawing.qMaterial.uniforms.brush_radius.value = step.maskingRadius;
    globalsDrawing.qMaterial.uniforms.brush_type.value = step.brushType;
    globalsDrawing.qMaterial.uniforms.brush_color.value = step.brushColor;
    globalsDrawing.qMaterial.uniforms.brush_texture.value = globalsDrawing.brush.getTextureById(step.brushTexture); // TODO: id to three.Texture
    globalsDrawing.qMaterial.uniforms.brush_min_angle_cos.value = step.maskingMinAngleCos;
    globalsDrawing.qMaterial.uniforms.depth_epsilon.value = step.maskingDepthEpsilon;

    globalsDrawing.withAutoClearRestore(function () {
      if (frontSideEnable && step.frontSide) {
        globalsDrawing.qMaterial.uniforms.flip_normal.value = 1.0;
        globalsDrawing.drawFront(step.count); // TODO: where to put this ?
      }

      if (backSideEnable && step.backSide) {
        globalsDrawing.qMaterial.uniforms.flip_normal.value = -1.0;
        globalsDrawing.drawBack(step.count);
      }
    });
  }

  function applyStepSnapshot(step, frontSideEnable, backSideEnable) {
    globalsDrawing.withAutoClearRestore(function () {
      if (frontSideEnable && step.frontSide) {
        globalsDrawing.copyTextureFront(step.frontTexture);
      }

      if (backSideEnable && step.backSide) {
        globalsDrawing.copyTextureBack(step.backTexture);
      }
    });
  }

  function applyStep(step, frontSideEnable, backSideEnable) {
    if (step.type === 'brush') {
      applyStepBrush(step, frontSideEnable, backSideEnable);
    } else if (step.type === 'clear') {
      applyStepClear(step, frontSideEnable, backSideEnable);
    } else if (step.type === 'snapshot') {
      applyStepSnapshot(step, frontSideEnable, backSideEnable);
    }
  }

  function maybeUnuseTexture(step) {
    if (step.type === 'brush') {
      globalsDrawing.brush.textureUnuse(step.brushTexture);
    }
  }

  function historyAddStep(step) {
    if (currentStep !== history.length - 1) {
      for (var i = currentStep + 1; i < history.length; i += 1) {
        maybeUnuseTexture(history[i]);
      }

      history.splice(currentStep + 1, history.length - currentStep - 1);
    }

    history.push(step);
    currentStep += 1;
  }

  function makeStepClear(frontSide, backSide, color) {
    var step = {
      type: 'clear',
      frontSide: frontSide,
      backSide: backSide,
      color: color,
    };

    historyAddStep(step);
    applyStepClear(step, true, true);
    updateHarbors(frontSide, backSide);
  }

  // TODO: missing: positions, uvs, MV, P, depth texture
  function makeStepBrush(
    frontSide, backSide,
    count, centerStart, centerDelta,
    maskingRadius, maskingDepthEpsilon, maskingMinAngleCos,
    brushType, brushColor, brushTexture,
  ) {
    var step = {
      type: 'brush',
      frontSide: frontSide,
      backSide: backSide,
      count: count,
      centerStart: centerStart,
      centerDelta: centerDelta,
      maskingRadius: maskingRadius,
      maskingDepthEpsilon: maskingDepthEpsilon,
      maskingMinAngleCos: maskingMinAngleCos,
      brushType: brushType,
      brushColor: brushColor,
      brushTexture: brushTexture,
    };

    historyAddStep(step);
    applyStepBrush(step, true, true);
    globalsDrawing.brush.textureUse(brushTexture);
  }

  /**
   * The whole snapshot mechanism assumes that the snapshot texture is the same as the result of applying all the steps before the snapshot step.
   * Because of that it doesn't make sense to have two consecutive snapshot steps after each other.
   * This is also assumed.
   */
  function makeSnapshot(frontTexture, backTexture) {
    if (history[currentStep].type === 'snapshot') {
      throw new Error('makeSnapshot would result into two consecutive snapshots'); // TODO: error handling
    }

    var frontSide = frontTexture !== undefined;
    var backSide = backTexture !== undefined;

    var step = {
      type: 'snapshot',
      frontSide: frontSide,
      backSide: backSide,
      frontTexture: frontTexture,
      backTexture: backTexture,
    };

    currentStep += 1;
    history.splice(currentStep, 0, step);

    updateHarbors(frontSide, backSide);
  }

  function stepIsHarbor(stepType) {
    return stepType === 'clear' || stepType === 'snapshot';
  }

  function updateHarbors(frontSide, backSide) {
    if (frontSide) { lastFrontHarbor = currentStep; }
    if (backSide) { lastBackHarbor = currentStep; }
  }

  function canUndo() {
    return currentStep > 0;
  }

  /**
   * `undo` assumes that the very first step (undex 0) is a harbor step.
   *
   * `undo` (and also other history related functions) assumes that the `currentStep` never points to a step right before a snapshot step.
   * So we are either at an snapshot step or two steps before a snapshot, but never one step before a snapshot.
   * Functions altering the `currentStep` (specifically `undo`, `redo`) are implemented in a way that this condition is still upheld after they finish.
   * Assuming that it was true before they started.
   */
  function undo() {
    if (!canUndo()) {
      throw new Error('cannot undo'); // TODO: error handling
    }

    // TODO: debug for undo tracing
    // console.log('debug 1 undo start');
    // console.log(`currentStep before : ${currentStep}`);

    if (history[currentStep].type === 'snapshot') {
      currentStep -= 1;
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

    // console.log(`currentStep after : ${currentStep}`);

    // # update front harbor
    if (undoFront && lastFrontHarbor > currentStep) {
      lastFrontHarbor = currentStep;
      while (true) {
        var step = history[lastFrontHarbor];
        if (stepIsHarbor(step.type) && step.frontSide) { break; }

        lastFrontHarbor -= 1;
      }
    }

    // # update back harbor
    if (undoBack && lastBackHarbor > currentStep) {
      lastBackHarbor = currentStep;
      while (true) {
        var step = history[lastBackHarbor];
        if (stepIsHarbor(step.type) && step.backSide) { break; }

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

    // console.log(`front interval : <${fromFront}, ${currentStep}>`);
    // console.log(`back interval : <${fromBack}, ${currentStep}>`);

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

    // console.log('debug 1 undo end');
  }

  function canRedo() {
    return currentStep < history.length - 1;
  }

  function redo() {
    if (!canRedo()) {
      throw new Error('cannot redo'); // TODO: error handling
    }

    // TODO: debug for redo tracing
    // console.log('debug 2 redo start');
    // console.log(`currentStep before : ${currentStep}`);

    if (currentStep + 2 < history.length && history[currentStep + 2].type === 'snapshot') {
      // console.log(`currentStep after : ${currentStep + 2}`);

      var step1 = history[currentStep + 1];
      var step2 = history[currentStep + 2];

      // TODO: if step1 is one side only, apply the snapshot only on the one side even if it is double sided snapshot
      applyStep(step2, true, true);
      applyStep(step1, !step2.frontSide, !step2.backSide);

      var step1IsHarbor = step1.type === 'clear';

      if (step2.frontSide) {
        lastFrontHarbor = currentStep + 2;
      } else if (step1IsHarbor && step1.frontSide) {
        lastFrontHarbor = currentStep + 1;
      }

      if (step2.backSide) {
        lastBackHarbor = currentStep + 2;
      } else if (step1IsHarbor && step1.backSide) {
        lastBackHarbor = currentStep + 1;
      }

      currentStep += 2;
    } else {
      currentStep += 1;

      // console.log(`currentStep after : ${currentStep}`);

      var step = history[currentStep];

      applyStep(step, true, true);

      if (stepIsHarbor(step.type)) {
        updateHarbors(step.frontSide, step.backSide);
      }
    }

    // console.log('debug 2 redo end');
  }

  function totalDrawCalls() {
    var drawCalls = 0;
    var drawCallsInstanced = 0;

    for (var i = 0; i < history.length; i++) {
      var step = history[i];

      if (step.type === 'brush') {
        drawCalls += step.count;
        drawCallsInstanced += 1;
      }
    }

    return [drawCalls, drawCallsInstanced];
  }

  var currentStep = -1;

  var lastFrontHarbor = -1; // TODO: could use some optimal data structure
  var lastBackHarbor = -1;
  var history = [];

  return {
    makeStepClear: makeStepClear,
    makeStepBrush: makeStepBrush,
    makeSnapshot: makeSnapshot,
    undo: undo,
    redo: redo,
    history: history, // TODO: debug
    totalDrawCalls: totalDrawCalls, // TODO: debug
  }
}