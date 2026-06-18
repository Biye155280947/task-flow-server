const http = require('http');
const CONFIG = require('./config');
const db = require('./db');
const { handleRequest } = require('./router');
const reminder = require('./reminder');

// 启动时迁移旧数据到多团队
db.migrateToTeam();

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
  console.log('Server started at http://localhost:' + PORT + ' (DEV_MODE=' + CONFIG.DEV_MODE + ')');
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  reminder.stop();
  server.close(() => process.exit(0));
});
