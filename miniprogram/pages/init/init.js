const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    settingUp: false,
    joining: false,
    teamName: '',
    inviteCode: '',
  },

  // 创建团队
  async handleSetup() {
    this.setData({ settingUp: true });
    try {
      var t = this.data.teamName.trim();
      if (!t) { wx.showToast({ title: '请输入团队名称', icon: 'none' }); this.setData({ settingUp: false }); return; }
      const result = await api.initSystem(t);
      app.globalData.userInfo = result.user;
      wx.setStorageSync('userInfo', result.user);
      wx.switchTab({ url: '/pages/tasks/tasks' });
    } catch (err) {
      wx.showToast({ title: err.message, icon: 'none' });
      this.setData({ settingUp: false });
    }
  },

  onTeamNameInput: function(e) {
    this.setData({ teamName: e.detail.value });
  },

  // 加入团队
  onInviteCodeInput: function(e) {
    this.setData({ inviteCode: e.detail.value.toUpperCase() });
  },

  async handleJoinTeam() {
    var code = this.data.inviteCode.trim();
    if (!code) { wx.showToast({ title: '请输入邀请码', icon: 'none' }); return; }
    this.setData({ joining: true });
    try {
      const result = await api.joinTeam(code);
      // 更新用户信息（含 teamId）
      if (result.user) {
        app.globalData.userInfo = result.user;
        wx.setStorageSync('userInfo', result.user);
      }
      wx.switchTab({ url: '/pages/tasks/tasks' });
    } catch (err) {
      wx.showToast({ title: err.message, icon: 'none' });
      this.setData({ joining: false });
    }
  },
});
