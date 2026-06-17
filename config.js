// 微信小程序配置
// 在正式部署前，请填写你的微信小程序 AppID 和 AppSecret
const CONFIG = {
  // 服务端口
  PORT: process.env.PORT || 3000,

  // 微信小程序配置（从环境变量读取，避免硬编码）
  WX_APPID: process.env.WX_APPID || 'wx4f1977822eb11c46',
  WX_SECRET: process.env.WX_SECRET || '719c0364792da5d9cdabeb147152196d',

  // 是否为开发模式（开发模式下无需真实微信凭证即可登录）
  DEV_MODE: process.env.DEV_MODE !== 'false',

  // 会话密钥（生产环境请修改）
  SESSION_SECRET: process.env.SESSION_SECRET || 'task-flow-secret-key-2024',

  // 管理员列表（设置为管理员的用户 ID 列表，用逗号分隔）
  // 或通过 environment ADMIN_IDS=id1,id2 设置
  ADMIN_IDS: (process.env.ADMIN_IDS || '').split(',').filter(Boolean),
  INIT_TOKEN: process.env.INIT_TOKEN || 'setup2024',

  // 数据文件路径
  DATA_DIR: process.env.DATA_DIR || './server/data',

  // 提醒配置
  REMINDER_INTERVAL: 30 * 60 * 1000,  // 提醒引擎运行间隔（30分钟）
};

module.exports = CONFIG;
