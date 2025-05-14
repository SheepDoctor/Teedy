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
    $scope.fabricCanvas = new fabric.Canvas(canvasEl, {
      isDrawingMode: false,
      backgroundColor: '#fff'
    });
  };

  // 图像加载到画布
  const loadImageToCanvas = () => {
    const canvas = $scope.fabricCanvas;
    const w = canvas.getWidth(), h = canvas.getHeight();

    fabric.Image.fromURL($scope.imageUrl, img => {
      const scale = Math.min(w / img.width, h / img.height, 1);
      img.set({
        left: (w - img.width * scale) / 2,
        top: (h - img.height * scale) / 2,
        scaleX: scale,
        scaleY: scale,
        selectable: false
      });
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
      canvas.renderAll();
      $scope.imageLoaded = true;
    });
  };

  // 保存状态（用于撤销/重做）
  const saveState = () => {
    if ($scope.currentStep < $scope.history.length - 1) {
      $scope.history = $scope.history.slice(0, $scope.currentStep + 1);
    }
    $scope.history.push($scope.fabricCanvas.toJSON());
    $scope.currentStep = $scope.history.length - 1;
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
      width: bgImg.getScaledWidth(),
      height: bgImg.getScaledHeight(),
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

  // 撤销操作
  $scope.undo = function() {
    if ($scope.currentStep > 0) {
      $scope.currentStep--;
      $scope.fabricCanvas.loadFromJSON($scope.history[$scope.currentStep], $scope.fabricCanvas.renderAll.bind($scope.fabricCanvas));
    }
  };

  // 旋转图片（90度）
  $scope.rotateImage = function () {
    const canvas = $scope.fabricCanvas;
    const bgImg = canvas.backgroundImage;
  
    if (!bgImg) return;
  
    // 获取当前角度
    const currentAngle = bgImg.get('angle') || 0;
    const newAngle = (currentAngle + 90) % 360;
  
    // 获取图片的宽高和缩放比例
    const width = bgImg.getScaledWidth();
    const height = bgImg.getScaledHeight();
  
    // 图片中心点（相对于画布）
    const centerX = bgImg.left + width / 2;
    const centerY = bgImg.top + height / 2;
  
    // 设置旋转中心为图片中心
    bgImg.set({
      angle: newAngle,
      originX: 'center',
      originY: 'center',
      left: centerX - (width / 2),
      top: centerY - (height / 2)
    });
  
    canvas.renderAll();
    saveState(); // 保存旋转状态到历史记录
  };

  // 处理图像（裁剪后导出或上传）
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

  // 按钮事件绑定
  $scope.onLoad = () => {
    initCanvas();
    loadImageToCanvas();
    saveState();
  };

  $scope.downloadImage = () => processImage(true);
  $scope.saveImage = () => processImage(false);
  $scope.cancel = () => $uibModalInstance.dismiss('cancel');
});