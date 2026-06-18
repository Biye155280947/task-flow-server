const db = require('../db');

// 获取任务列表（根据用户角色显示不同范围的任务
function handleGetTasks(user) {
  const tasks = db.getTasks();

  if (user.role === 'admin') {
    // 管理员可以看到所有任务
    return { tasks: tasks.map(formatTaskForDisplay) };
  }

  // 普通用户只能看到与自己相关的任务
  const myTasks = tasks.filter(t =>
    t.assignees && t.assignees.some(a => a.id === user.id)
  );
  return { tasks: myTasks.map(formatTaskForDisplay) };
}

// 创建任务（仅管理员）
function handleCreateTask(body, user) {
  if (user.role !== 'admin') {
    return { error: '仅管理员可以创建任务', code: 403 };
  }

  const { title, description, deadline, assignees } = body;

  if (!title || !title.trim()) {
    return { error: '请输入任务标题', code: 400 };
  }
  if (!assignees || assignees.length === 0) {
    return { error: '请选择至少一个执行人', code: 400 };
  }

  var newTask = db.createTask({
    title: title.trim(),
    description: (description || '').trim(),
    deadline: deadline || '',
    assignees,
    createdBy: { id: user.id, name: user.name },
    teamId: user.teamId || '',
  });

  // 为每个执行人创建通知
  assignees.forEach(function(a) {
    db.addNotification(a.id, 'task_assigned', '新任务分配',
      '你被分配了任务 ' + title.trim(), newTask.id);
  });

  return { task: newTask };
}

// 获取单个任务详情
function handleGetTask(taskId) {
  const task = db.getTaskById(taskId);
  if (!task) return { error: '任务不存在', code: 404 };
  return { task };
}

// 更新任务进度
function handleUpdateProgress(taskId, body, user) {
  const { progress } = body;

  if (typeof progress !== 'number' || progress < 0 || progress > 100 || !Number.isInteger(progress)) {
    return { error: '进度值必须是 0-100 的整数', code: 400 };
  }

  const task = db.getTaskById(taskId);
  if (!task) return { error: '任务不存在', code: 404 };

  // 检查用户是否为任务执行人
  const isAssignee = task.assignees && task.assignees.some(a => a.id === user.id);

  if (!isAssignee) {
    return { error: '你不是该任务的执行人', code: 403 };
  }

  const note = body.note || '';
  const updated = db.updateTaskProgress(taskId, user.id, progress, note);
  if (!updated) return { error: '更新失败', code: 500 };

  // 计算对外展示的进度
  const displayTask = formatTaskForDisplay(updated);
  return { task: displayTask };
}

// 删除任务（仅管理员）
function handleDeleteTask(taskId, user) {
  if (user.role !== 'admin') {
    return { error: '仅管理员可以删除任务', code: 403 };
  }

  const ok = db.deleteTask(taskId);
  if (!ok) return { error: '任务不存在', code: 404 };
  return { success: true };
}

// 格式化任务供前端展示
function formatTaskForDisplay(task) {
  if (!task) return null;

  const totalProgress = Math.round(
    task.progress.reduce((s, p) => s + p, 0) / Math.max(1, task.progress.length)
  );

  // 每个人单独的进度
    const assigneeProgress = task.assignees.map((a, i) => {
    const p = task.progress[i] || 0;
    const completed = p >= 100;
    return {
      id: a.id,
      name: a.name,
      progress: p,
      completed: completed,
      share: completed ? Math.round(100 / task.assignees.length) : 0,
    };
  });
  return {
    ...task,
    totalProgress,
    assigneeProgress,
  };
}

module.exports = {
  handleGetTasks,
  handleCreateTask,
  handleGetTask,
  handleUpdateProgress,
  handleDeleteTask,
  formatTaskForDisplay,
};

