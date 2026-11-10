function initExport(globals, globalsDrawing) {
  function textoreToPngBlob(renderTarget, cont) {
    var textureSize = globalsDrawing.textureSize;

    // # copy texture from gpu
    var textureBuffer = new Uint8Array(textureSize * textureSize * 4);

    globals.threeView.renderer.readRenderTargetPixels(
      renderTarget,
      0, 0, textureSize, textureSize,
      textureBuffer
    );

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

  function qTexturesToPngBlob(cont) {
    textoreToPngBlob(globalsDrawing.qRenderTargetFront, function (blobFront) {
      textoreToPngBlob(globalsDrawing.qRenderTargetBack, function (blobBack) {
        cont(blobFront, blobBack);
      });
    });
  }

  function saveTexturePng(callback) {
    qTexturesToPngBlob(function (blobFront, blobBack) {
      saveAs(blobFront, 'origami-texture-front.png');
      saveAs(blobBack, 'origami-texture-back.png');

      if (callback !== undefined) {
        callback();
      }
    });
  }

  function saveTexturePdf(callback) {
    qTexturesToPngBlob(function (blobFront, blobBack) {
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

  // exportTransform: 'none' | 'rotate'
  function setExportTransform(ehExportTransform) {
    if (!['none', 'rotate'].includes(ehExportTransform)) {
      throw new Error('transform paramter contains invalid value (valid values: \'none\', \'rotate\')');
    }

    exportTransform = ehExportTransform;
  }

  var exportTransform = undefined;

  return {
    saveTexturePng: saveTexturePng,
    saveTexturePdf: saveTexturePdf,
    setExportTransform: setExportTransform,
  };
}