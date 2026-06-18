const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    users: [],
    loading: true,
    editingId: null,
    editName: '',
    userRole: '',
    currentUserId: '',
    pendingUsers: [],
    teamInfo: null,
    newTeamName: '',
    creatingTeam: false,
    renamingTeam: false,
    teamNameNew: '',
  },

  onShow() {
    this.setData({
      userRole: app.globalData.userInfo.role,
      currentUserId: app.globalData.userInfo.id,
    });
    this.loadUsers();
    this.loadPendingUsers();
    this.loadTeamInfo();
  },

  loadPendingUsers: function() {
    if (this.data.userRole !== 'admin') return;
    var me = this;
    api.getUsers().then(function(result) {
      var pending = [];
      for (var i = 0; i < result.users.length; i++) {
        if (result.users[i].status === 'pending') pending.push(result.users[i]);
      }
      me.setData({ pendingUsers: pending });
    }).catch(function() {});
  },

  handleApprove: function(e) {
    var me = this;
    var id = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name;
    wx.showModal({
      title: '审核通过',
      content: '通过\u300c' + name + '\u300d的加入申请？',
      success: function(res) {
        if (res.confirm) {
          api.approveUser(id).then(function() {
            wx.showToast({ title: '已通过', icon: 'success' });
            me.loadPendingUsers();
            me.loadUsers();
          }).catch(function(err) {
            wx.showToast({ title: err.message, icon: 'none' });
          });
        }
      }
    });
  },

  handleReject: function(e) {
    var me = this;
    var id = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name;
    wx.showModal({
      title: '拒绝加入',
      content: '拒绝\u300c' + name + '\u300d的加入申请？',
      success: function(res) {
        if (res.confirm) {
          api.rejectUser(id).then(function() {
            wx.showToast({ title: '已拒绝', icon: 'success' });
            me.loadPendingUsers();
            me.loadUsers();
          }).catch(function(err) {
            wx.showToast({ title: err.message, icon: 'none' });
          });
        }
      }
    });
  },

  async loadUsers() {
    this.setData({ loading: true });
    try {
      const result = await api.getUsers();
      this.setData({ users: result.users, loading: false });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },

  startEdit(e) {
    const { id, name } = e.currentTarget.dataset;
    this.setData({ editingId: id, editName: name });
  },

  onEditNameInput(e) {
    this.setData({ editName: e.detail.value });
  },

  cancelEdit() {
    this.setData({ editingId: null, editName: '' });
  },

  async saveEdit(e) {
    const userId = e.currentTarget.dataset.id;
    const newName = this.data.editName.trim();
    if (!newName) { wx.showToast({ title: '用户名不能为空', icon: 'none' }); return; }
    if (newName.length > 20) { wx.showToast({ title: '用户名不能超过20个字符', icon: 'none' }); return; }
    try {
      await api.updateUserName(userId, newName);
      wx.showToast({ title: '修改成功', icon: 'success' });
      this.setData({ editingId: null, editName: '' });
      this.loadUsers();
      if (userId === app.globalData.userInfo.id) {
        app.globalData.userInfo.name = newName;
        wx.setStorageSync('userInfo', app.globalData.userInfo);
      }
    } catch (err) {
      wx.showToast({ title: err.message, icon: 'none' });
    }
  },

  async handlePromote(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认提升',
      content: '确定将\u300c' + name + '\u300d设为管理员吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.promoteUser(id);
            wx.showToast({ title: '已提升为管理员', icon: 'success' });
            this.loadUsers();
          } catch (err) {
            wx.showToast({ title: err.message, icon: 'none' });
          }
        }
      },
    });
  },

  handleDeleteMember: function(e) {
    var me = this;
    var id = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除\u300c' + name + '\u300d吗？此操作不可恢复？',
      success: function(res) {
        if (res.confirm) {
          api.deleteUser(id).then(function() {
            wx.showToast({ title: '已删除', icon: 'success' });
            me.loadUsers();
            me.loadPendingUsers();
          }).catch(function(err) {
            wx.showToast({ title: err.message, icon: 'none' });
          });
        }
      }
    });
  },

  async handleDemote(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认降级',
      content: '确定取消\u300c' + name + '\u300d的管理员身份吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.demoteUser(id);
            wx.showToast({ title: '已取消管理员', icon: 'success' });
            this.loadUsers();
          } catch (err) {
            wx.showToast({ title: err.message, icon: 'none' });
          }
        }
      },
    });
  },

  loadTeamInfo: function() {
    var me = this;
    api.getMyTeam().then(function(result) {
      me.setData({ teamInfo: result.team || null });
    }).catch(function() {});
  },

  onNewTeamNameInput: function(e) {
    this.setData({ newTeamName: e.detail.value });
  },

  handleCreateTeam: function() {
    var me = this;
    var name = this.data.newTeamName.trim();
    if (!name) { wx.showToast({ title: '请输入团队名称', icon: 'none' }); return; }
    me.setData({ creatingTeam: true });
    api.createTeam(name).then(function(result) {
      if (result.team) {
        me.setData({ teamInfo: result.team, newTeamName: '', creatingTeam: false });
        wx.showToast({ title: '团队已创建', icon: 'success' });
      }
    }).catch(function(err) {
      wx.showToast({ title: err.message, icon: 'none' });
      me.setData({ creatingTeam: false });
    });
  },


  startRenameTeam: function() {
    this.setData({ renamingTeam: true, teamNameNew: this.data.teamInfo.name });
  },

  onRenameTeamInput: function(e) {
    this.setData({ teamNameNew: e.detail.value });
  },

  cancelRenameTeam: function() {
    this.setData({ renamingTeam: false, teamNameNew: '' });
  },

  handleRenameTeam: function() {
    var me = this;
    var name = this.data.teamNameNew.trim();
    if (!name || name === this.data.teamInfo.name) {
      me.setData({ renamingTeam: false });
      return;
    }
    me.setData({ renamingTeam: false });
    api.renameTeam(me.data.teamInfo.id, name).then(function(result) {
      if (result.team) {
        me.setData({ teamInfo: result.team });
        wx.showToast({ title: '名称已修改', icon: 'success' });
      }
    }).catch(function(err) {
      wx.showToast({ title: err.message, icon: 'none' });
    });
  },

  handleDeleteTeam: function() {
    var me = this;
    wx.showModal({
      title: '确认解散',
      content: '确定要解散 ' + me.data.teamInfo.name + ' 吗？所有成员将失去团队关联，此操作不可恢复！',
      success: function(res) {
        if (res.confirm) {
          api.deleteTeam(me.data.teamInfo.id).then(function() {
            wx.showToast({ title: '团队已解散', icon: 'success' });
            me.setData({ teamInfo: null });
            setTimeout(function() { wx.reLaunch({ url: '/pages/init/init' }); }, 1500);
          }).catch(function(err) {
            wx.showToast({ title: err.message, icon: 'none' });
          });
        }
      }
    });
  }
});
