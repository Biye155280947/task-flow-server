var api = require('../../utils/api');
var app = getApp();

Page({
  data: {
    tasks: [],
    filteredTasks: [],
    reminders: [],
    inboxNotifs: [],
    currentFilter: 'all',
    loading: false,
    refreshing: false,
    userInfo: null
  },

  onShow: function() {
    this.setData({ userInfo: app.globalData.userInfo });
    if (!app.isLoggedIn()) {
      wx.switchTab({ url: '/pages/index/index' });
      return;
    }

    this.loadTasks();
    this.checkReminders();
    
  },

  loadTasks: function() {
    var me = this;
    me.setData({ loading: true });
    api.getTasks().then(function(result) {
      var tasks = result.tasks;
      for (var i = 0; i < tasks.length; i++) {
        var t = tasks[i];
        t.statusName = t.status === 'pending' ? '待处理' : t.status === 'in_progress' ? '进行中' : '已完成';
        t._overdue = t.deadline ? new Date(t.deadline) < new Date() : false;
        // 计算剩余时间
        t._remaining = '';
        // 标记每个执行人的完成状态
        for (var j = 0; j < t.assignees.length; j++) {
          t.assignees[j]._isDone = t.progress && t.progress[j] >= 100;
        }
        // 拼接总显示文本（含灰色标记）
        t.assigneeDisplay = '';
        for (var j = 0; j < t.assignees.length; j++) {
          if (j > 0) t.assigneeDisplay += '、';
          t.assigneeDisplay += t.assignees[j].name;
          if (t.assignees[j]._isDone) t.assigneeDisplay += '[已完成]';
        }
        if (t.deadline && t.status !== 'completed') {
          var now = new Date();
          var dead = new Date(t.deadline);
          var diff = dead - now;
          if (diff > 0) {
            var days = Math.floor(diff / (1000 * 60 * 60 * 24));
            var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            if (days > 0) t._remaining = '剩余' + days + '天' + hours + '小时';
            else t._remaining = '剩余' + hours + '小时';
          } else {
            var past = Math.abs(Math.floor(diff / (1000 * 60 * 60 * 24)));
            t._remaining = '已超' + past + '天';
          }
        }
      }
      me.setData({ tasks: tasks, loading: false, refreshing: false });
      me.applyFilter();
    }).catch(function(err) {
      me.setData({ loading: false, refreshing: false });
      wx.showToast({ title: err.message, icon: 'none' });
    });
  },

  applyFilter: function() {
    var tasks = this.data.tasks;
    var filter = this.data.currentFilter;
    if (filter === 'all') {
      this.setData({ filteredTasks: tasks });
    } else {
      var filtered = [];
      for (var i = 0; i < tasks.length; i++) {
        if (tasks[i].status === filter) filtered.push(tasks[i]);
      }
      this.setData({ filteredTasks: filtered });
    }
  },

  switchFilter: function(e) {
    this.setData({ currentFilter: e.currentTarget.dataset.filter });
    this.applyFilter();
  },

  onRefresh: function() {
    this.setData({ refreshing: true });
    this.loadTasks();
  },

  loadMore: function() {},

  goToDetail: function(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id });
  },

  goToCreate: function() {
    wx.navigateTo({ url: '/pages/create/create' });
  },

  checkReminders: function() {
    var me = this;
    api.getReminders().then(function(result) {
      me.setData({ reminders: result.reminders });
    }).catch(function() {});
  },

  loadNotifications: function() {
    var me = this;
    api.getNotifications().then(function(result) {
      if (result.notifications && result.notifications.length > 0) {
        me.setData({ inboxNotifs: result.notifications });
      }
    }).catch(function() {});
  },

  dismissNotifications: function() {
    var me = this;
    api.readAllNotifications().then(function() {
      me.setData({ inboxNotifs: [] });
    }).catch(function() {});
  },

  dismissAllReminders: function() {
    this.setData({ reminders: [] });
  },

  onReminderTap: function(e) {
    var id = e.currentTarget.dataset.taskid;
    if (id) wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
  }
});
