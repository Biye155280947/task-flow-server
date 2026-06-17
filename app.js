const http = require('http');
const CONFIG = require('./config');
const { handleRequest } = require('./router');
const reminder = require('./reminder');

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(err => {
    console.error('[ERROR]', err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '服务器内部错误' }));
  });
});

const PORT = CONFIG.PORT;
server.listen(PORT, () => {
  // 启动提醒引擎
  reminder.start();
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║       任务流程管理系统 · 后端服务          ║
  ╠═══════════════════════════════════════════╣
  ║  服务地址: http://localhost:${PORT}        ║
  ║  开发模式: ${CONFIG.DEV_MODE ? '✅ 开启' : '❌ 关闭'}                    ║
  ║  微信配置: ${CONFIG.WX_APPID ? '✅ 已配置' : '⚠️  未配置'}                ║
  ╚═══════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\n正在关闭服务...');
  reminder.stop();
  server.close(() => process.exit(0));
});
