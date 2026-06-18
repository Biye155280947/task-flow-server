const app = getApp();

/**
 * API 请求封装
 */
function request(method, path, data) {
  const baseUrl = app.globalData.baseUrl;
  const token = app.globalData.token;

  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + path,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? 'Bearer ' + token : '',
      },
      success(res) {
        if (res.statusCode === 401) {
          app.logout();
          wx.reLaunch({ url: '/pages/index/index' });
          reject(new Error('登录已过期'));
          return;
        }
        if (res.data.error) {
          reject(new Error(res.data.error));
        } else {
          resolve(res.data);
        }
      },
      fail(err) {
        reject(new Error('网络错误: ' + (err.errMsg || '请求失败')));
      },
    });
  });
}

// -------- 认证 API --------
function login(code) {
  return request('POST', '/api/auth/login', { code: code, nickname: arguments.length > 1 ? arguments[1] : '', avatar: arguments.length > 2 ? arguments[2] : '' });
}
function getCurrentUser() { return request('GET', '/api/auth/me'); }
function initSystem(teamName) { return request('POST', '/api/init', { teamName: teamName || '' }); }
function getReminders() { return request('GET', '/api/reminders'); }

// -------- 用户 API --------
function getUsers() { return request('GET', '/api/users'); }
function updateUserName(userId, name) { return request('PUT', '/api/users/' + userId + '/name', { name }); }
function promoteUser(userId) { return request('PUT', '/api/users/' + userId + '/promote'); }
function demoteUser(userId) { return request('PUT', '/api/users/' + userId + '/demote'); }
function approveUser(userId) { return request('POST', '/api/users/' + userId + '/approve'); }
function rejectUser(userId) { return request('POST', '/api/users/' + userId + '/reject'); }
function deleteUser(userId) { return request('POST', '/api/users/' + userId + '/delete'); }

// -------- 任务 API --------
function getTasks() { return request('GET', '/api/tasks'); }
function getTask(taskId) { return request('GET', '/api/tasks/' + taskId); }
function createTask(data) { return request('POST', '/api/tasks', data); }
function updateProgress(taskId, progress) { return request('PUT', '/api/tasks/' + taskId + '/progress', { progress: progress, note: arguments.length > 2 ? arguments[2] : '' }); }
function deleteTask(taskId) { return request('DELETE', '/api/tasks/' + taskId); }

// -------- 团队 API --------
function createTeam(name) { return request('POST', '/api/teams', { name: name }); }
function deleteTeam(teamId) { return request('DELETE', '/api/teams/' + teamId); }
function renameTeam(teamId, name) { return request('PUT', '/api/teams/' + teamId + '/name', { name: name }); }
function getMyTeam() { return request('GET', '/api/teams/my'); }
function joinTeam(code) { return request('POST', '/api/teams/join', { code: code }); }

// -------- 通知 API --------
function getNotifications() { return request('GET', '/api/notifications'); }
function readAllNotifications() { return request('POST', '/api/notifications/read-all'); }

module.exports = {
  login, getCurrentUser, initSystem, getReminders,
  getUsers, updateUserName, promoteUser, demoteUser, approveUser, rejectUser, deleteUser,
  getTasks, getTask, createTask, updateProgress, deleteTask,
  createTeam, getMyTeam, joinTeam, renameTeam, deleteTeam,
  getNotifications, readAllNotifications,
};
