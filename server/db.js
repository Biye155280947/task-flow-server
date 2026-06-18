const fs = require('fs');
const path = require('path');
const CONFIG = require('./config');

// 确保数据目录存在
function ensureDataDir() {
  const dir = path.resolve(CONFIG.DATA_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 读取 JSON 文件
function readJSON(filename) {
  ensureDataDir();
  const filepath = path.resolve(CONFIG.DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return [];
  }
  try {
    const data = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 写入 JSON 文件
function writeJSON(filename, data) {
  ensureDataDir();
  const filepath = path.resolve(CONFIG.DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

// -------------------- 用户操作 --------------------

function getUsers() {
  return readJSON('users.json');
}

function saveUsers(users) {
  writeJSON('users.json', users);
}

function findUser(openid) {
  return getUsers().find(u => u.id === openid) || null;
}

// 检查系统是否已初始化（是否有管理员
function isInitialized() {
  const users = getUsers();
  return users.some(u => u.role === 'admin');
}

// 初始化系统：将指定用户设为管理员
function initSystem(openid) {
  const users = getUsers();
  const user = users.find(u => u.id === openid);
  if (!user) return null;
  // 将所有用户设为非管理员，再将这个用户设为管理员
  users.forEach(u => { u.role = 'user'; });
  user.role = 'admin';
  saveUsers(users);
  return user;
}

function createUser(openid, name, avatar) {
  const users = getUsers();
  const existing = users.find(u => u.id === openid);
  if (existing) return existing;

  // 不再自动设置管理员，需通过初始化流程或命令行设置
  const isAdmin = false;

  const user = {
    id: openid,
    name: name || '用户' + openid.slice(-4),
    role: isAdmin ? 'admin' : 'user',
    status: 'active',
    avatar: avatar || '',
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  saveUsers(users);
  return user;
}

// 审核通过/拒绝成员
function approveUser(openid) {
  return setUserStatus(openid, 'active');
}

function rejectUser(openid) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === openid);
  if (idx === -1) return false;
  users.splice(idx, 1);
  saveUsers(users);
  return true;
}

function setUserStatus(openid, status) {
  const users = getUsers();
  const user = users.find(u => u.id === openid);
  if (!user) return null;
  user.status = status;
  saveUsers(users);
  return user;
}

// 获取待审核成
function getPendingUsers() {
  return getUsers().filter(u => u.status === 'pending');
}

// -------------------- 通知操作 --------------------

// -------------------- 团队操作 --------------------

function getTeams() {
  return readJSON('teams.json');
}

function createTeam(name, createdBy) {
  const teams = getTeams();
  const team = {
    id: 'team_' + generateId(),
    name: name,
    inviteCode: generateInviteCode(),
    createdBy: createdBy,
    createdAt: new Date().toISOString(),
  };
  teams.push(team);
  writeJSON('teams.json', teams);
  return team;
}

function getTeamByCode(code) {
  return getTeams().find(t => t.inviteCode === code) || null;
}

function getTeam(teamId) {
  return getTeams().find(t => t.id === teamId) || null;
}

function deleteTeam(teamId) {
  const teams = getTeams();
  const idx = teams.findIndex(t => t.id === teamId);
  if (idx === -1) return false;
  teams.splice(idx, 1);
  writeJSON('teams.json', teams);
  return true;
}

function renameTeam(teamId, newName) {
  const teams = getTeams();
  const team = teams.find(t => t.id === teamId);
  if (!team) return null;
  team.name = newName;
  writeJSON('teams.json', teams);
  return team;
}

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  // 确保不重复
  if (getTeams().some(t => t.inviteCode === code)) {
    return generateInviteCode();
  }
  return code;
}

function setUserTeam(openid, teamId) {
  const users = getUsers();
  const user = users.find(u => u.id === openid);
  if (!user) return null;
  user.teamId = teamId;
  saveUsers(users);
  return user;
}

// 迁移旧数据：给没?teamId 的用户和任务分配团队
function migrateToTeam() {
  const users = getUsers();
  const tasks = getTasks();
  const teams = getTeams();

  // 已有团队，不需要迁移
  if (teams.length > 0) return;

  // 有用户但没有团队：创建默认团队
  if (users.length > 0) {
    const team = createTeam('默认团队', users[0].id);
    // 给所有用户分配团队
    users.forEach(u => { u.teamId = team.id; });
    // 给所有任务分配团队
    tasks.forEach(t => { t.teamId = team.id; });
    saveUsers(users);
    saveTasks(tasks);
  }
}


function addNotification(userId, type, title, message, taskId) {
  const notifs = readJSON('notifications.json');
  notifs.push({
    id: generateId(),
    userId: userId,
    type: type,
    title: title,
    message: message,
    taskId: taskId || '',
    read: false,
    createdAt: new Date().toISOString()
  });
  writeJSON('notifications.json', notifs);
}

function getNotifications(userId) {
  return readJSON('notifications.json')
    .filter(n => n.userId === userId && !n.read)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function markNotificationRead(notifId) {
  const notifs = readJSON('notifications.json');
  notifs.forEach(function(n) {
    if (n.userId === notifId || n.id === notifId) n.read = true;
  });
  writeJSON('notifications.json', notifs);
}

function updateUserName(openid, newName) {
  const users = getUsers();
  const user = users.find(u => u.id === openid);
  if (!user) return null;
  user.name = newName;
  saveUsers(users);
  return user;
}

function setUserRole(openid, role) {
  const users = getUsers();
  const user = users.find(u => u.id === openid);
  if (!user) return null;
  user.role = role;
  saveUsers(users);
  return user;
}

function getAllUsers() {
  return getUsers();
}

// -------------------- 任务操作 --------------------

function getTasks() {
  return readJSON('tasks.json');
}

function saveTasks(tasks) {
  writeJSON('tasks.json', tasks);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function createTask(data) {
  const tasks = getTasks();
  const assignees = data.assignees || [data.assignee1, data.assignee2].filter(Boolean);
  if (assignees.length === 0) return null;

  const task = {
    id: generateId(),
    title: data.title,
    description: data.description || '',
    deadline: data.deadline || '',
    assignees,
    progress: assignees.map(() => 0),
    status: 'pending',
    createdBy: data.createdBy,
        teamId: data.teamId || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.unshift(task);
  saveTasks(tasks);
  return task;
}

function updateTaskProgress(taskId, userId, progress, note) {
  const tasks = getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;

  // 找到该用户在 assignees 中的索引
  const idx = task.assignees.findIndex(a => a.id === userId);
  if (idx === -1) return null;

  // 单人任务：progress 直接 0-100；多人：每人也是 0-100
  task.progress[idx] = Math.max(0, Math.min(100, progress));
  task.updatedAt = new Date().toISOString();

  // 更新状态：总进度= 各人进度平均值
  const total = task.progress.reduce((s, p) => s + p, 0) / task.progress.length;
  if (total >= 100) {
    task.status = 'completed';
  } else if (total > 0) {
    task.status = 'in_progress';
  } else {
    task.status = 'pending';
  }

  // 保存完成备注
  if (progress >= 100) {
    if (!task.comments) task.comments = {};
    task.comments[userId] = {
      note: note || '',
      completedAt: new Date().toISOString()
    };
  }

  saveTasks(tasks);
  return task;
}

function deleteTask(taskId) {
  const tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return false;
  tasks.splice(idx, 1);
  saveTasks(tasks);
  return true;
}

function getTaskById(taskId) {
  return getTasks().find(t => t.id === taskId) || null;
}

// -------------------- 提醒相关操作 --------------------

function getPendingReminders(userId) {
  const tasks = getTasks();
  const now = new Date();
  const reminders = [];

  tasks.forEach(task => {
    // 只检查与自己相关的未完成任务
    const isMyTask = task.assignees && task.assignees.some(a => a.id === userId);
    if (!isMyTask || task.status === 'completed') return;
    if (!task.deadline) return;

    const deadline = new Date(task.deadline);
    const msUntilDeadline = deadline - now;
    const hoursUntilDeadline = msUntilDeadline / (1000 * 60 * 60);
    const lastReminder = task.lastReminderAt ? new Date(task.lastReminderAt) : null;
    const hoursSinceLastReminder = lastReminder ? (now - lastReminder) / (1000 * 60 * 60) : Infinity;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    let shouldRemind = false;
    let reason = '';

    if (hoursUntilDeadline <= 24 && hoursUntilDeadline > 0) {
      // 1 天内任务：每 2 小时提醒一次
      if (hoursSinceLastReminder >= 2) {
        shouldRemind = true;
        reason = 'urgent';
      }
    } else if (hoursUntilDeadline > 24) {
      // 2 天以上任务：每天 9:00-9:30 提醒
      if (currentHour === 9 && currentMinute < 30 && hoursSinceLastReminder >= 20) {
        shouldRemind = true;
        reason = 'daily';
      }
    }

    if (shouldRemind) {
      reminders.push({
        taskId: task.id,
        taskTitle: task.title,
        deadline: task.deadline,
        hoursUntilDeadline: Math.round(hoursUntilDeadline * 10) / 10,
        reason,
      });
    }
  });

  return reminders;
}

function markReminded(taskId) {
  const tasks = getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  task.lastReminderAt = new Date().toISOString();
  saveTasks(tasks);
}

module.exports = {
  getUsers,
  findUser,
  createUser,
  updateUserName,
  setUserRole,
  setUserStatus,
  createTask,
  getTasks,
  getTaskById,
  updateTaskProgress,
  deleteTask,
  generateId,
  getAllUsers,
  getTeams,
  createTeam,
  getTeam,
  getTeamByCode,
  generateInviteCode,
  renameTeam,
  deleteTeam,
  setUserTeam,
  migrateToTeam,
  isInitialized,
  initSystem,
  approveUser,
  rejectUser,
  getPendingUsers,
  getNotifications,
  addNotification,
  markNotificationRead,
  getPendingReminders,
  markReminded,
};

