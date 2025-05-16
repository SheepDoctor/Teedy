'use strict';

angular.module('docs').controller('ImageEditor', function ($scope, $stateParams, $http, $uibModalInstance, file, $timeout) {

  // Initialize variables
  $scope.imageUrl = `../api/file/${file.id}/data`;
  $scope.isCropping = false;
  let canvas, ctx, imageData;
  let isDrawing = false, lastX = 0, lastY = 0;
  let cropStartX, cropStartY, cropEndX, cropEndY;

  // Get Canvas context
  function initCanvas() {
    return new Promise((resolve) => {
      $timeout(() => {
        canvas = document.getElementById('canvas');
        if (canvas) {
          ctx = canvas.getContext('2d');
          resolve(true);
        } else {
          console.error('Canvas not found');
          resolve(false);
        }
      }, 0);
    });
  }

  // Load image
  $scope.loadImageFromURL = function () {
    initCanvas().then((success) => {
      if (!success) return;
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = $scope.imageUrl;
      img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      };
      img.onerror = function () {
        console.error('Failed to load image from URL:', $scope.imageUrl);
      };
    });
  };

  // Rotate image
  $scope.rotateImage = function () {
    if (!canvas || !ctx) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.height;
    tempCanvas.height = canvas.width;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate(Math.PI / 2);
    tempCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    canvas.width = tempCanvas.width;
    canvas.height = tempCanvas.height;
    ctx.drawImage(tempCanvas, 0, 0);
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  };

  // Crop functionality
  $scope.enableCrop = function () {
    if (!canvas || $scope.isCropping) return;
    $scope.isCropping = true;
    document.getElementById('crop-options').style.display = 'block';
    canvas.addEventListener('mousedown', startCrop);
    canvas.addEventListener('mousemove', drawCropRect);
    canvas.addEventListener('mouseup', endCrop);
  };

  $scope.cancelCrop = function () {
    if (!canvas || !$scope.isCropping) return;
    $scope.isCropping = false;
    ctx.putImageData(imageData, 0, 0); // Restore original image
    document.getElementById('crop-options').style.display = 'none';
    canvas.removeEventListener('mousedown', startCrop);
    canvas.removeEventListener('mousemove', drawCropRect);
    canvas.removeEventListener('mouseup', endCrop);
    $scope.$apply(); // Ensure AngularJS updates the UI
  };

  function startCrop(e) {
    if (!$scope.isCropping) return;
    cropStartX = e.offsetX;
    cropStartY = e.offsetY;
  }

  function drawCropRect(e) {
    if (!$scope.isCropping || !ctx || !imageData) return;
    cropEndX = e.offsetX;
    cropEndY = e.offsetY;
    ctx.putImageData(imageData, 0, 0); // Restore original image
    ctx.strokeStyle = 'red';
    ctx.strokeRect(cropStartX, cropStartY, cropEndX - cropStartX, cropEndY - cropStartY);
  }

  function endCrop() {
    if (!$scope.isCropping) return;
    // Keep isCropping true until apply or cancel
    canvas.removeEventListener('mousemove', drawCropRect);
    canvas.removeEventListener('mouseup', endCrop);
  }

  $scope.applyCrop = function () {
    if (!canvas || !ctx || !imageData || !$scope.isCropping) return;
    const width = Math.abs(cropEndX - cropStartX);
    const height = Math.abs(cropEndY - cropStartY);
    const x = Math.min(cropStartX, cropEndX);
    const y = Math.min(cropStartY, cropEndY);
    // Use original imageData to avoid including red rectangle
    ctx.putImageData(imageData, 0, 0);
    const croppedData = ctx.getImageData(x, y, width, height);
    canvas.width = width;
    canvas.height = height;
    ctx.putImageData(croppedData, 0, 0);
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    $scope.isCropping = false;
    document.getElementById('crop-options').style.display = 'none';
    canvas.removeEventListener('mousedown', startCrop);
    canvas.removeEventListener('mousemove', drawCropRect);
    canvas.removeEventListener('mouseup', endCrop);
    $scope.$apply(); // Ensure AngularJS updates the UI
  };

  // Draw functionality
  $scope.enableDraw = function () {
    if (!canvas || $scope.isCropping) return;
    document.getElementById('draw-options').style.display = 'block';
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
  };

  function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
  }

  function draw(e) {
    if (!isDrawing || !ctx) return;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.strokeStyle = document.getElementById('brush-color').value;
    ctx.lineWidth = document.getElementById('brush-size').value;
    ctx.stroke();
    [lastX, lastY] = [e.offsetX, e.offsetY];
  }

  function stopDrawing() {
    isDrawing = false;
    if (ctx) {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  }

  // Save image
  $scope.saveImage = function () {
    if (!canvas || !ctx || !imageData) return;
    ctx.putImageData(imageData, 0, 0);
    const link = document.createElement('a');
    link.download = 'edited_image.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  // Save image to server with original filename
  $scope.saveToServer = function () {
    if (!canvas || !ctx || !imageData) return;
  
    ctx.putImageData(imageData, 0, 0);
  
    canvas.toBlob(function (blob) {
      var formData = new FormData();
      formData.append('id', $stateParams.id);
      formData.append('previousFileId', file.id); // 指定要替换的旧文件ID
      formData.append('file', blob, encodeURIComponent(file.name)); // 新文件内容
  
      // 使用 $http 发送 PUT 请求到 /file
      $http.put('../api/file', formData, {
        transformRequest: angular.identity,
        headers: { 'Content-Type': undefined }
      }).then(function (response) {
        const newFileId = response.data.id;
        console.log('File saved successfully:', newFileId);
        alert('Image saved to server successfully.');
        $scope.exitEditor();
      }, function (error) {
        console.error('Failed to save file:', error);
        alert('Error saving image to server.');
      }); 
    }, 'image/png');
  };

  // Initialize on page load
  $scope.init = function () {
    $scope.loadImageFromURL();
  };

  // Exit the image editor
  $scope.exitEditor = function () {
    $uibModalInstance.dismiss('cancel');
  };

  // Trigger initialization
  $scope.init();
});