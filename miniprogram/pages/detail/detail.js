var api = require('../../utils/api');
var app = getApp();

Page({
  data: {
    task: null,
    taskId: '',
    loading: true,
    updating: false,
    showNoteInput: false,
    note: '',
    isMyTask: false,
    userRole: ''
  },

  onLoad: function(options) {
    this.setData({ taskId: options.id, userRole: app.globalData.userInfo.role });
    this.loadDetail();
  },

  loadDetail: function() {
    var me = this;
    me.setData({ loading: true });
    api.getTask(me.data.taskId).then(function(result) {
      var task = result.task;

      // 本地计算总进度
      if (task.progress && task.progress.length > 0) {
        var sum = 0;
        for (var i = 0; i < task.progress.length; i++) sum += task.progress[i];
        task.totalProgress = Math.round(sum / task.progress.length);
      } else {
        task.totalProgress = 0;
      }

      // 计算剩余时间
      if (task.deadline && task.status !== 'completed') {
        var now = new Date();
        var dead = new Date(task.deadline);
        var diff = dead - now;
        if (diff > 0) {
          var days = Math.floor(diff / (1000 * 60 * 60 * 24));
          var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          task._remaining = days > 0 ? '剩余' + days + '天' + hours + '小时' : '剩余' + hours + '小时';
        } else {
          task._remaining = '已超' + Math.abs(Math.floor(diff / (1000 * 60 * 60 * 24))) + '天';
        }
      }
      me.setData({ task: task, loading: false, isMyTask: false, sliderValue: 0 });
      // After data is loaded, check if user is an assignee
      var userId = app.globalData.userInfo.id;
      var isMy = false;
      if (task.assignees) {
        for (var i = 0; i < task.assignees.length; i++) {
          if (task.assignees[i].id === userId) {
            isMy = true;
            break;
          }
        }
      }
      var initVal = 0;
      if (isMy && task.assigneeProgress) {
        for (var i = 0; i < task.assigneeProgress.length; i++) {
          if (task.assigneeProgress[i].id === userId) {
            initVal = task.assigneeProgress[i].progress;
            break;
          }
        }
      }
      task.alreadyCompleted = false;
      if (isMy && task.assigneeProgress) {
        for (var i = 0; i < task.assigneeProgress.length; i++) {
          if (task.assigneeProgress[i].id === userId && task.assigneeProgress[i].completed) {
            task.alreadyCompleted = true; break;
          }
        }
      }
      me.setData({ task: task, isMyTask: isMy, showNoteInput: false,
    note: '' });
    }).catch(function(err) {
      me.setData({ loading: false });
      wx.showToast({ title: err.message, icon: 'none' });
    });
  },

  onNoteInput: function(e) {
    this.setData({ note: e.detail.value });
  },

  showNote: function() {
    this.setData({ showNoteInput: true });
  },

  handleComplete: function() {
    var me = this;
    me.setData({ updating: true });
    api.updateProgress(me.data.taskId, 100, me.data.note).then(function() {
      me.setData({ note: '', showNoteInput: false });
      wx.showToast({ title: '任务已完成!', icon: 'success' });
      setTimeout(function() { wx.switchTab({ url: '/pages/tasks/tasks' }); }, 1200);
    }).catch(function(err) {
      wx.showToast({ title: err.message, icon: 'none' });
      me.setData({ updating: false });
    });
  },

  handleDelete: function() {
    var me = this;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个任务吗？',
      success: function(res) {
        if (res.confirm) {
          api.deleteTask(me.data.taskId).then(function() {
            wx.showToast({ title: '已删除', icon: 'success' });
            setTimeout(function() { wx.navigateBack(); }, 1500);
          }).catch(function(err) {
            wx.showToast({ title: err.message, icon: 'none' });
          });
        }
      }
    });
  },

  isOverdue: function(deadline) {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  },

  formatDate: function(isoStr) {
    if (!isoStr) return '';
    var d = new Date(isoStr);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + ' ' + d.getHours() + ':' + d.getMinutes();
  }
});
