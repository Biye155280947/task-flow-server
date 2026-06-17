const crypto = require('crypto');
const CONFIG = require('../config');
const db = require('../db');

// 存储有效会话 { token: openid }
const sessions = {};

// 生成会话令牌
function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

// 微信 jscode2session（从微信服务器换取 openid）
function wxCode2Session(code) {
  return new Promise((resolve, reject) => {
    if (!CONFIG.WX_APPID || !CONFIG.WX_SECRET) {
      return reject(new Error('微信 AppID 或 AppSecret 未配置'));
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session` +
      `?appid=${CONFIG.WX_APPID}` +
      `&secret=${CONFIG.WX_SECRET}` +
      `&js_code=${code}` +
      `&grant_type=authorization_code`;

    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.errcode) {
            reject(new Error(`微信登录失败: ${data.errmsg || data.errcode}`));
          } else {
            resolve(data);
          }
        } catch {
          reject(new Error('解析微信响应失败'));
        }
      });
    }).on('error', reject);
  });
}

// 处理登录请求
async function handleLogin(body) {
  const { code, nickname, avatar: clientAvatar } = body;
  //console.log('DEV_MODE:', CONFIG.DEV_MODE, 'code received:', code);

  let openid, avatar, wxResult;

  if (CONFIG.DEV_MODE) {
    // 开发模式：生成模拟用户
    openid = 'dev_' + (code ? crypto.createHash('md5').update(code).digest('hex').slice(0, 8) : db.generateId());
    avatar = '';
    // 开发模式下所有用户自动成为管理员且激活（方便测试）
    db.setUserRole(openid, 'admin');
    db.setUserStatus(openid, 'active');
  } else {
    // 生产模式：调用微信 API
    wxResult = await wxCode2Session(code);
    openid = wxResult.openid;
    avatar = wxResult.avatarUrl || '';
  }

  // 创建或获取用户
  const user = db.createUser(openid, nickname || '', clientAvatar || '');
  let finalUser = user;

  // 开发模式：覆盖为管理员（方便测试）
  if (CONFIG.DEV_MODE) {
    finalUser = db.setUserRole(openid, 'admin') || user;
    db.setUserStatus(openid, 'active');
  }

  // 生成会话令牌
  const token = generateToken();
  sessions[token] = openid;

  return {
    token,
    user: { id: finalUser.id, name: finalUser.name, role: finalUser.role, avatar: finalUser.avatar },
    userStatus: finalUser.status || 'active',
    needsInit: !db.isInitialized(),
  };
}

// 从令牌获取用户
function getAuthenticatedUser(token) {
  if (!token || !sessions[token]) return null;
  const openid = sessions[token];
  const user = db.findUser(openid);
  if (!user) return null;

  // 延长会话有效期（每次访问刷新）
  return user;
}

// 开发模式下使用（方便测试）
function createDevSession(openid) {
  const token = generateToken();
  sessions[token] = openid;
  return token;
}

module.exports = {
  handleLogin,
  getAuthenticatedUser,
  createDevSession,
};
