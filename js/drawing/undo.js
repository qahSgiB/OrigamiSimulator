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

  function applyLastStep() {
    applyStep(history[history.length - 1]);
  }

  function makeStepClear(frontSide, backSide, color) {
    history.push({
      type: 'clear',
      frontSide: frontSide,
      backSide: backSide,
      color: color,
    });

    applyLastStep();
  }

  // TODO: missing: positions, uvs, MV, P, depth texture, brush texture
  function makeStepStamp(
    frontSide, backSide,
    maskingCenter, maskingRadius, maskingDepthEpsilon, maskingMinAngleCos,
    brushType, brushColor,
  ) {
    history.push({
      type: 'stamp',
      frontSide: frontSide,
      backSide: backSide,
      maskingCenter: maskingCenter,
      maskingRadius: maskingRadius,
      maskingDepthEpsilon: maskingDepthEpsilon,
      maskingMinAngleCos: maskingMinAngleCos,
      brushType: brushType,
      brushColor: brushColor,
    });

    applyLastStep();
  }

  // TODO: missing: positions, uvs, MV, P, depth texture, brush texture
  function makeStepDrag(
    frontSide, backSide,
    centers,
    maskingRadius, maskingDepthEpsilon, maskingMinAngleCos,
    brushType, brushColor,
  ) {
    history.push({
      type: 'drag',
      frontSide: frontSide,
      backSide: backSide,
      centers: centers,
      maskingRadius: maskingRadius,
      maskingDepthEpsilon: maskingDepthEpsilon,
      maskingMinAngleCos: maskingMinAngleCos,
      brushType: brushType,
      brushColor: brushColor,
    });

    applyLastStep();
  }

  var history = [];

  return {
    makeStepClear: makeStepClear,
    makeStepStamp: makeStepStamp,
    makeStepDrag: makeStepDrag,
  }
}