'use strict';

/**
 * Settings user page controller.
 */
angular.module('docs').controller('SettingsUser', function($scope, $state, Restangular) {
  /**
   * Load users from server.
   */
  $scope.loadUsers = function() {
    Restangular.one('user/list').get({
      sort_column: 1,
      asc: true
    }).then(function(data) {
      $scope.users = data.users;
    });
  };
  
  $scope.loadUsers();
  
  /**
   * Edit a user.
   */
  $scope.editUser = function(user) {
    $state.go('settings.user.edit', { username: user.username });
  };

  /**
   * Approve user.
   */
  $scope.approveUser = function(user) {
    console.log(user);
    user.disabled = false;
    Restangular.one('user').post(user.username, user).then(function() {

      user.approved = true; // 更新前端状态
      $scope.alerts.push({ type: 'success', msg: $translate.instant('settings.user.approved') });
    }, function (e) {
      console.log(e);
    });
  };

  $scope.rejectUser = function(user) {
    Restangular.one('user', user.username).remove().then(function () {
      var index = $scope.users.indexOf(user);
      if (index !== -1) {
        $scope.users.splice(index, 1);
      }
    });
  };
});