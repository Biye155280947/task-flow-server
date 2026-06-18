var api = require('../../utils/api');
var app = getApp();

Page({
  data: {
    title: '',
    description: '',
    deadlineDate: '',
    deadlineTime: '',
    userList: [],
    selectedIds: [],
    assignees: [],
    showAssigneeHint: false,
    submitting: false
  },

  onLoad: function() {
    this.loadUsers();
  },

  loadUsers: function() {
    var me = this;
    api.getUsers().then(function(result) {
      var currentUser = app.globalData.userInfo;
      var list = [];
      for (var i = 0; i < result.users.length; i++) {
        if (result.users[i].id !== currentUser.id) {
          list.push(result.users[i]);
        }
      }
      me.setData({ userList: list, showAssigneeHint: false });
    }).catch(function() {
      wx.showToast({ title: '加载用户列表失败', icon: 'none' });
    });
  },

  onTitleInput: function(e) {
    this.setData({ title: e.detail.value });
  },

  onDescInput: function(e) {
    this.setData({ description: e.detail.value });
  },

  onDeadlineDateChange: function(e) {
    this.setData({ deadlineDate: e.detail.value });
  },

  onDeadlineTimeChange: function(e) {
    this.setData({ deadlineTime: e.detail.value });
    },

  onAssigneeToggle: function(e) {
    var uid = e.currentTarget.dataset.userid;
if (!uid) return;
    var list = this.data.selectedIds.slice();
    var idx = list.indexOf(uid);
    if (idx === -1) {
      list.push(uid);
    } else {
      list.splice(idx, 1);
    }
    var assignees = [];
    for (var i = 0; i < this.data.userList.length; i++) {
      if (list.indexOf(this.data.userList[i].id) !== -1) {
        assignees.push(this.data.userList[i]);
      }
    }
    this.setData({ selectedIds: list, assignees: assignees, showAssigneeHint: false });
  },

  onCheckboxChange: function(e) {
    var vals = e.detail.value || [];
    var list = [];
    for (var i = 0; i < this.data.userList.length; i++) {
      for (var j = 0; j < vals.length; j++) {
        if (this.data.userList[i].id === vals[j]) {
          list.push(this.data.userList[i]);
          break;
        }
      }
    }
    this.setData({ assignees: list, showAssigneeHint: false });
  },

  handleCreate: function() {
    var me = this;
    var t = this.data.title;
    var dd = this.data.deadlineDate;
    var dt = this.data.deadlineTime;
    var as = this.data.assignees;

    if (!t.trim()) {
      wx.showToast({ title: '请输入任务标题', icon: 'none' });
      return;
    }
    if (as.length === 0) {
      this.setData({ showAssigneeHint: true });
      wx.showToast({ title: '请至少选择一位执行人', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    var deadline = dd ? dd + (dt ? 'T' + dt + ':00' : 'T23:59:00') : '';
    var assigneeData = [];
    for (var i = 0; i < as.length; i++) {
      assigneeData.push({ id: as[i].id, name: as[i].name });
    }

    api.createTask({
      title: t,
      description: me.data.description,
      deadline: deadline,
      assignees: assigneeData
    }).then(function() {
      wx.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(function() { wx.switchTab({ url: '/pages/tasks/tasks' }); }, 1500);
    }).catch(function(err) {
      wx.showToast({ title: err.message || '发布失败', icon: 'none' });
      me.setData({ submitting: false });
    });
  }
});
