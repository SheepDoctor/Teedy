'use strict';

angular.module('docs').controller('ImageEditor', function ($scope, $uibModalInstance, Restangular, file) {
  const canvasEl = 'canvas-editor';
  $scope.file = file;
  $scope.imageUrl = `../api/file/${file.id}/data`;
  $scope.imageLoaded = false;
  $scope.history = [];
  $scope.currentStep = -1;
  $scope.fabricCanvas = null;
  $scope.cropRect = null;

  // 初始化画布
  const initCanvas = () => {
    const canvasElement = document.getElementById(canvasEl);
    const width = canvasElement.parentElement.clientWidth;
    const height = canvasElement.parentElement.clientHeight * 3;
    $scope.fabricCanvas = new fabric.Canvas(canvasEl, {
      isDrawingMode: false,
      backgroundColor: '#fff',
      width,
      height
    });
  };

  // 图像加载到画布
  const loadImageToCanvas = () => {
    const canvas = $scope.fabricCanvas;
    const w = canvas.getWidth(), h = canvas.getHeight();
  
    fabric.Image.fromURL($scope.imageUrl, img => {
      const scale = Math.min(w / img.width, h / img.height, 1);
      img.set({
        originX: 'center',
        originY: 'center',
        left: w / 2,
        top: h / 2,
        scaleX: scale,
        scaleY: scale,
        selectable: false
      });
      canvas.setBackgroundImage(img, () => {
        canvas.renderAll();
        $scope.imageLoaded = true;
        saveState(); 
      }, {
        originX: 'center',
        originY: 'center',
        left: w / 2,
        top: h / 2
      });
    });
  };

  // 启用裁剪
  $scope.enableCrop = () => {
    $scope.isCropping = true;
    $scope.fabricCanvas.isDrawingMode = false;
    const bgImg = $scope.fabricCanvas.backgroundImage;
    if (!bgImg) return;

    if ($scope.cropRect) $scope.fabricCanvas.remove($scope.cropRect);

    const rect = new fabric.Rect({
      left: bgImg.left,
      top: bgImg.top,
      width: bgImg.getScaledWidth() * 0.5,
      height: bgImg.getScaledHeight() * 0.5,
      fill: 'rgba(0,0,0,0)',
      stroke: '#ff4081',
      strokeWidth: 2,
      hasControls: true,
      lockUniScaling: true,
      cornerColor: '#ff4081',
      cornerSize: 10,
      transparentCorners: false
    });

    $scope.fabricCanvas.add(rect);
    $scope.fabricCanvas.setActiveObject(rect);
    $scope.cropRect = rect;
    saveState();
  };

  // 旋转图片（90度）
  $scope.rotateImage = function () {
    const canvas = $scope.fabricCanvas;
    const bgImg = canvas.backgroundImage;
  
    if (!bgImg) return;
  
    const currentAngle = bgImg.get('angle') || 0;
    const newAngle = (currentAngle + 90) % 360;
  
    bgImg.set({
      angle: newAngle,
      originX: 'center',
      originY: 'center',
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2
    });
  
    canvas.renderAll();
    saveState();
  };


  const processImage = isDownload => {
    const canvas = $scope.fabricCanvas;
    const bgImg = canvas.backgroundImage;
    if (!bgImg) return;

    let { x = 0, y = 0, width = bgImg.width, height = bgImg.height } = $scope.cropRect ? {
      x: ($scope.cropRect.left - bgImg.left) / bgImg.scaleX,
      y: ($scope.cropRect.top - bgImg.top) / bgImg.scaleY,
      width: $scope.cropRect.width / bgImg.scaleX,
      height: $scope.cropRect.height / bgImg.scaleY
    } : {};

    const croppedCanvas = document.createElement('canvas');
    const ctx = croppedCanvas.getContext('2d');
    croppedCanvas.width = width;
    croppedCanvas.height = height;

    ctx.drawImage(bgImg.getElement(), x, y, width, height, 0, 0, width, height);

    if (isDownload) {
      const a = document.createElement('a');
      a.href = croppedCanvas.toDataURL('image/png');
      a.download = $scope.file.name || 'cropped-image.png';
      a.click();
    } else {
      croppedCanvas.toBlob(blob => {
        const formData = new FormData();
        formData.append('file', blob, $scope.file.name);
        Restangular.all('file').customPOST(formData, undefined, undefined, { 'Content-Type': undefined })
          .then(res => $uibModalInstance.close(res));
      }, 'image/png');
    }
  };
 
  $scope.color = '#000000';
  $scope.width = 5;
  $scope.enablePencil = function () {
    $scope.isCropping = false;
    $scope.fabricCanvas.isDrawingMode = true;
    $scope.fabricCanvas.freeDrawingBrush = new fabric.PencilBrush($scope.fabricCanvas);
    $scope.fabricCanvas.freeDrawingBrush.color = $scope.color;
    $scope.fabricCanvas.freeDrawingBrush.width = $scope.width;
    console.log('enablePencil', $scope.fabricCanvas.freeDrawingBrush.color, $scope.fabricCanvas.freeDrawingBrush.width);
  };

  $scope.updateBrush = function (color = -1, width = -1) {
    $scope.color = color !== -1 ? color : $scope.color;
    $scope.width = width !== -1 ? width : $scope.width;
    $scope.fabricCanvas.freeDrawingBrush.color = $scope.color;
    $scope.fabricCanvas.freeDrawingBrush.width = $scope.width;
  };

  $scope.onLoad = () => {
    initCanvas();
    loadImageToCanvas();
    saveState();
  };

  $scope.downloadImage = () => processImage(true);
  $scope.saveImage = () => processImage(false);
  $scope.cancel = () => $uibModalInstance.dismiss('cancel');
});