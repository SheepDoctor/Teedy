'use strict';

angular.module('docs').controller('ImageEditor', ['$scope', '$routeParams', '$http', function($scope, $routeParams, $http) {
    const fileId = $routeParams.id;
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const image = new Image();
  
    // 根据文件 ID 获取图片数据
    $http.get(`../api/file/${fileId}/data`, { responseType: 'blob' }).then(response => {
      const reader = new FileReader();
      reader.onload = function() {
        image.src = reader.result;
        image.onload = function() {
          canvas.width = image.width;
          canvas.height = image.height;
          ctx.drawImage(image, 0, 0);
        };
      };
      reader.readAsDataURL(response.data);
    });
  }]);