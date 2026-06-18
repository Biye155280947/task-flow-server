App({
  globalData: {
    // 后端 API 地址（开发时用本地地址，上线后改为你的服务器地址）
    baseUrl: 'https://task-flow-server-production-7f6d.up.railway.app',
    // baseUrl: 'https://your-domain.com',
    userInfo: null,
    token: '',
  },

  onLaunch() {
    // 检查是否有缓存的登录信息
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (token && userInfo) {
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
    }
  },

  // 检查登录状态
  isLoggedIn() {
    return !!(this.globalData.token && this.globalData.userInfo);
  },

  // 退出登录
  logout() {
    this.globalData.token = '';
    this.globalData.userInfo = null;
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
  },
});
