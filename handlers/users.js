const db = require('../db');

// 获取所有用户列表（仅管理员）
function handleGetUsers(user) {
  if (user.role !== 'admin') {
    return { error: '仅管理员可以查看用户列表', code: 403 };
  }

  const users = db.getUsers().map(u => ({
    id: u.id,
    name: u.name,
    role: u.role,
    avatar: u.avatar,
    createdAt: u.createdAt,
  }));

  return { users };
}

// 修改用户名字（仅管理员）
function handleUpdateUserName(userId, body, user) {
  if (user.role !== 'admin') {
    return { error: '仅管理员可以修改用户名', code: 403 };
  }

  const { name } = body;
  if (!name || !name.trim()) {
    return { error: '用户名不能为空', code: 400 };
  }
  if (name.length > 20) {
    return { error: '用户名不能超过20个字符', code: 400 };
  }

  const updated = db.updateUserName(userId, name.trim());
  if (!updated) return { error: '用户不存在', code: 404 };

  return {
    user: {
      id: updated.id,
      name: updated.name,
      role: updated.role,
      avatar: updated.avatar,
    },
  };
}

// 获取当前用户信息
function handleGetCurrentUser(user) {
  return {
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
    },
  };
}

module.exports = {
  handleGetUsers,
  handleUpdateUserName,
  handleGetCurrentUser,
};
