const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    loggedIn: false,
    logging: false,
    userInfo: null,
    newMemberCount: 0,
    teamInfo: null,
    joinCode: '',
    joining: false,
    isPending: false,
  },

  onShow() {
    // 每次显示页面时刷新登录状态
    this.checkLoginStatus();
  },

  checkLoginStatus() {
    var me = this;
    var isLoggedIn = app.isLoggedIn();
    if (isLoggedIn) {
      // 从服务器刷新当前用户信息（管理员改名字后生效）
      api.getCurrentUser().then(function(result) {
        if (result.user) {
          app.globalData.userInfo = result.user;
          wx.setStorageSync('userInfo', result.user);
          me.setData({ loggedIn: true, userInfo: result.user });
          // 如果没有团队，跳转到初始化页
          if (!result.user.teamId) {
            wx.navigateTo({ url: '/pages/init/init' });
          }
        }
      }).catch(function() {
        me.setData({ loggedIn: false, userInfo: null });
      });
      if (app.globalData.userInfo.role === 'admin') {
        me.checkNewMembers();
      }
    } else {
      me.setData({ loggedIn: false, userInfo: null });
    }
  },

  // 微信登录
  async handleLogin() {
    this.setData({ logging: true });

    try {
      // 调用 wx.login 获取临时 code
      const loginResult = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject,
        });
      });

      // 发送 code 到后端
      const result = await api.login(loginResult.code);

      // 保存登录信息
      app.globalData.token = result.token;
      app.globalData.userInfo = result.user;
      wx.setStorageSync('token', result.token);
      wx.setStorageSync('userInfo', result.user);

      this.setData({
        loggedIn: true,
        userInfo: result.user,
        logging: false,
      });

      // 检查是否需要初始化设置
      if (result.needsTeam) {
        wx.showToast({ title: '首次使用，请完成设置', icon: 'none' });
        setTimeout(() => {
          wx.navigateTo({ url: '/pages/init/init' });
        }, 800);
      } else {
        wx.showToast({ title: '登录成功', icon: 'success' });
      }
    } catch (err) {
      this.setData({ logging: false });
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    }
  },

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.logout();
          this.setData({
            loggedIn: false,
            userInfo: null,
          });
          wx.showToast({ title: '已退出', icon: 'success' });
        }
      },
    });
  },

  goToTasks() {
    wx.switchTab({ url: '/pages/tasks/tasks' });
  },

  loadTeamInfo: function() {
    var me = this;
    api.getMyTeam().then(function(result) {
      if (result.team) me.setData({ teamInfo: result.team, joinCode: '' });
    }).catch(function() {});
  },

  onJoinCodeInput: function(e) {
    this.setData({ joinCode: e.detail.value });
  },

  handleJoinTeam: function() {
    var me = this;
    var code = this.data.joinCode.trim().toUpperCase();
    if (!code) { wx.showToast({ title: '请输入邀请码', icon: 'none' }); return; }
    me.setData({ joining: true });
    api.joinTeam(code).then(function(result) {
      if (result.team) {
        me.setData({ teamInfo: result.team, joinCode: '', joining: false });
        wx.showToast({ title: '已加入团队', icon: 'success' });
      }
    }).catch(function(err) {
      wx.showToast({ title: err.message, icon: 'none' });
      me.setData({ joining: false });
    });
  },

  checkNewMembers: function() {
    var me = this;
    var lastSeen = wx.getStorageSync('newMemberLastCheck') || '';
    api.getUsers().then(function(result) {
      var count = 0;
      for (var i = 0; i < result.users.length; i++) {
        if (result.users[i].createdAt > lastSeen && 
            result.users[i].role === 'user' &&
            result.users[i].id.indexOf('member_') === 0) {
          count++;
        }
      }
      me.setData({ newMemberCount: count });
      wx.setStorageSync('newMemberLastCheck', new Date().toISOString());
    }).catch(function() {});
  },

  goToAdmin() {
    this.setData({ newMemberCount: 0 });
    wx.navigateTo({ url: '/pages/admin/admin' });
  },

  goToCreate() {
    wx.navigateTo({ url: '/pages/create/create' });
  },
});
