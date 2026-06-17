const url = require('url');
const authHandler = require('./handlers/auth');
const tasksHandler = require('./handlers/tasks');
const usersHandler = require('./handlers/users');
const db = require('./db');

// 解析请求 body
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

// 从 Authorization 头提取用户
function authenticate(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return authHandler.getAuthenticatedUser(token);
}

// 发送 JSON 响应
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

// 路由分发
async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();
  const body = await parseBody(req);

  // 预检请求
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  // -------- 公开接口 --------

  // POST /api/auth/login - 微信登录
  if (pathname === '/api/auth/login' && method === 'POST') {
    try {
      const result = await authHandler.handleLogin(body);
      return sendJSON(res, 200, result);
    } catch (err) {
      return sendJSON(res, 401, { error: err.message });
    }
  }

  // -------- 需要认证的接口 --------
  const user = authenticate(req);
  if (!user) {
    return sendJSON(res, 401, { error: '未登录或会话已过期' });
  }

  // POST /api/init - 初始化系统（首个管理员设置）
  if (pathname === '/api/init' && method === 'POST') {
    if (db.isInitialized()) {
      return sendJSON(res, 400, { error: '系统已初始化' });
    }
    const result = db.initSystem(user.id);
    if (!result) return sendJSON(res, 400, { error: '初始化失败' });
    return sendJSON(res, 200, { user: { id: result.id, name: result.name, role: result.role } });
  }

  // GET /api/reminders - 获取当前用户的待提醒任务
  if (pathname === '/api/reminders' && method === 'GET') {
    const reminders = db.getPendingReminders(user.id);
    return sendJSON(res, 200, { reminders });
  }

  // GET /api/auth/me - 获取当前用户信息
  if (pathname === '/api/auth/me' && method === 'GET') {
    const result = usersHandler.handleGetCurrentUser(user);
    return sendJSON(res, 200, result);
  }

  // -------- 用户管理 --------

  // GET /api/users - 获取用户列表
  if (pathname === '/api/users' && method === 'GET') {
    const result = usersHandler.handleGetUsers(user);
    return sendJSON(res, result.code || 200, result);
  }

  // PUT /api/users/:id/name - 修改用户名
  const updateNameMatch = pathname.match(/^\/api\/users\/([^/]+)\/name$/);
  if (updateNameMatch && method === 'PUT') {
    const userId = updateNameMatch[1];
    const result = usersHandler.handleUpdateUserName(userId, body, user);
    return sendJSON(res, result.code || 200, result);
  }

  // PUT /api/users/:id/promote - 提升为管理员
  const promoteMatch = pathname.match(/^\/api\/users\/([^/]+)\/promote$/);
  if (promoteMatch && method === 'PUT') {
    if (user.role !== 'admin') return sendJSON(res, 403, { error: '仅管理员可操作' });
    const targetId = promoteMatch[1];
    const result = db.setUserRole(targetId, 'admin');
    if (!result) return sendJSON(res, 404, { error: '用户不存在' });
    return sendJSON(res, 200, { user: { id: result.id, name: result.name, role: result.role } });
  }

  // PUT /api/users/:id/demote - 取消管理员
  const demoteMatch = pathname.match(/^\/api\/users\/([^/]+)\/demote$/);
  if (demoteMatch && method === 'PUT') {
    if (user.role !== 'admin') return sendJSON(res, 403, { error: '仅管理员可操作' });
    const targetId = demoteMatch[1];
    if (targetId === user.id) return sendJSON(res, 400, { error: '不能取消自己的管理员身份' });
    const result = db.setUserRole(targetId, 'user');
    if (!result) return sendJSON(res, 404, { error: '用户不存在' });
    return sendJSON(res, 200, { user: { id: result.id, name: result.name, role: result.role } });
  }

  // POST /api/users/:id/approve - 审核通过成员
  var approveMatch = pathname.match(/^\/api\/users\/([^\/]+)\/approve$/);
  if (approveMatch && method === 'POST') {
    if (user.role !== 'admin') return sendJSON(res, 403, { error: '仅管理员可操作' });
    var result = db.approveUser(approveMatch[1]);
    if (!result) return sendJSON(res, 404, { error: '用户不存在' });
    return sendJSON(res, 200, { user: { id: result.id, name: result.name, role: result.role, status: result.status } });
  }

  // POST /api/users/:id/reject - 拒绝成员
  var rejectMatch = pathname.match(/^\/api\/users\/([^\/]+)\/reject$/);
  if (rejectMatch && method === 'POST') {
    if (user.role !== 'admin') return sendJSON(res, 403, { error: '仅管理员可操作' });
    var ok = db.rejectUser(rejectMatch[1]);
    if (!ok) return sendJSON(res, 404, { error: '用户不存在' });
    return sendJSON(res, 200, { success: true });
  }

  // GET /api/notifications - 获取未读通知
  if (pathname === '/api/notifications' && method === 'GET') {
    var notifs = db.getNotifications(user.id);
    return sendJSON(res, 200, { notifications: notifs });
  }

  // POST /api/notifications/read-all - 全部标记已读
  if (pathname === '/api/notifications/read-all' && method === 'POST') {
    db.markNotificationRead(user.id);
    return sendJSON(res, 200, { success: true });
  }

  // -------- 任务管理 --------

  // GET /api/tasks - 获取任务列表
  if (pathname === '/api/tasks' && method === 'GET') {
    const result = tasksHandler.handleGetTasks(user);
    return sendJSON(res, 200, result);
  }

  // POST /api/tasks - 创建任务
  if (pathname === '/api/tasks' && method === 'POST') {
    const result = tasksHandler.handleCreateTask(body, user);
    return sendJSON(res, result.code || 200, result);
  }

  // GET /api/tasks/:id - 获取任务详情
  const taskDetailMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskDetailMatch && method === 'GET') {
    const taskId = taskDetailMatch[1];
    const result = tasksHandler.handleGetTask(taskId);
    return sendJSON(res, result.code || 200, result);
  }

  // PUT /api/tasks/:id/progress - 更新进度
  const progressMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/progress$/);
  if (progressMatch && method === 'PUT') {
    const taskId = progressMatch[1];
    const result = tasksHandler.handleUpdateProgress(taskId, body, user);
    return sendJSON(res, result.code || 200, result);
  }

  // DELETE /api/tasks/:id - 删除任务
  const taskDeleteMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskDeleteMatch && method === 'DELETE') {
    const taskId = taskDeleteMatch[1];
    const result = tasksHandler.handleDeleteTask(taskId, user);
    return sendJSON(res, result.code || 200, result);
  }

  // 未匹配的路由
  sendJSON(res, 404, { error: '接口不存在' });
}

module.exports = { handleRequest };
