'use strict';

/**
 * Login controller.
 */
angular.module('docs').controller('Login', function(Restangular, $scope, $rootScope, $state, $stateParams, $dialog, User, $translate, $uibModal) {
  $scope.codeRequired = false;

  // Get the app configuration
  Restangular.one('app').get().then(function(data) {
    $rootScope.app = data;
  });

  // Login as guest
  $scope.loginAsGuest = function() {
    $scope.user = {
      username: 'guest',
      password: ''
    };
    $scope.login();
  };
  
  // Login
  $scope.login = function() {
    User.login($scope.user).then(function() {
      User.userInfo(true).then(function(data) {
        $rootScope.userInfo = data;
      });

      if($stateParams.redirectState !== undefined && $stateParams.redirectParams !== undefined) {
        $state.go($stateParams.redirectState, JSON.parse($stateParams.redirectParams))
          .catch(function() {
            $state.go('document.default');
          });
      } else {
        $state.go('document.default');
      }
    }, function(data) {
      if (data.data.type === 'ValidationCodeRequired') {
        // A TOTP validation code is required to login
        $scope.codeRequired = true;
      } else {
        // Login truly failed
        var title = $translate.instant('login.login_failed_title');
        var msg = $translate.instant('login.login_failed_message');
        var btns = [{result: 'ok', label: $translate.instant('ok'), cssClass: 'btn-primary'}];
        $dialog.messageBox(title, msg, btns);
      }
    });
  };

  // Password lost
  $scope.openPasswordLost = function () {
    $uibModal.open({
      templateUrl: 'partial/docs/passwordlost.html',
      controller: 'ModalPasswordLost'
    }).result.then(function (username) {
      if (username === null) {
        return;
      }

      // Send a password lost email
      Restangular.one('user').post('password_lost', {
        username: username
      }).then(function () {
        var title = $translate.instant('login.password_lost_sent_title');
        var msg = $translate.instant('login.password_lost_sent_message', { username: username });
        var btns = [{result: 'ok', label: $translate.instant('ok'), cssClass: 'btn-primary'}];
        $dialog.messageBox(title, msg, btns);
      }, function () {
        var title = $translate.instant('login.password_lost_error_title');
        var msg = $translate.instant('login.password_lost_error_message');
        var btns = [{result: 'ok', label: $translate.instant('ok'), cssClass: 'btn-primary'}];
        $dialog.messageBox(title, msg, btns);
      });
    });
  };

  // register
  $scope.register = function() {
    console.log('【Register】开始执行注册流程'); // 🔍 调试提示：函数被调用
  
    User.register($scope.user).then(function(response) {
      console.log('【Register】注册成功，响应数据:', response.data); // 🔍 调试提示：查看后端返回结果
  
      // 注册成功提示并跳转
      var title = 'Success';
      var msg = 'Please Login';
      var btns = [{ result: 'ok', label: 'OK', cssClass: 'btn-primary' }];
      $dialog.messageBox(title, msg, btns).result.then(function() {
        console.log('【Register】用户点击 OK，准备跳转到登录页'); // 🔍 调试提示：用户点击确定
        $state.go('login');
      });
    }, function(error) {
      console.error('【Register】注册失败，错误详情:', error); // 🔍 调试提示：查看错误信息
  
      var title = 'Failed';
      var msg = 'Failed';
      var btns = [{ result: 'ok', label: 'OK', cssClass: 'btn-primary' }];
      $dialog.messageBox(title, msg, btns);
    });
  };
});