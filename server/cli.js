/**
 * 管理命令行工具
 * 用法：
 *   node server/cli.js list                   列出所有用户
 *   node server/cli.js promote <用户ID>       设为管理员
 *   node server/cli.js demote <用户ID>        取消管理员
 *   node server/cli.js rename <用户ID> <新名>  修改用户名
 */
const db = require('./db');

const [,, command, ...args] = process.argv;

function printUsers() {
  const users = db.getAllUsers();
  if (users.length === 0) {
    console.log('暂无用户');
    return;
  }
  console.log('\n用户列表：');
  console.log('='.repeat(60));
  users.forEach(u => {
    const badge = u.role === 'admin' ? '👑 [管理员]' : '     [成员]';
    console.log(`  ${badge}  ${u.name}`);
    console.log(`         ID: ${u.id}`);
    console.log(`         创建: ${u.createdAt}`);
    console.log('-'.repeat(60));
  });
}

switch (command) {
  case 'list':
    printUsers();
    break;

  case 'promote': {
    const id = args[0];
    if (!id) {
      console.log('用法: node server/cli.js promote <用户ID>');
      process.exit(1);
    }
    const user = db.findUser(id);
    if (!user) {
      console.log('未找到该用户，请先登录小程序');
      process.exit(1);
    }
    db.setUserRole(id, 'admin');
    console.log(`\n  👑 已将 "${user.name}" 设为管理员\n`);
    break;
  }

  case 'demote': {
    const id = args[0];
    if (!id) {
      console.log('用法: node server/cli.js demote <用户ID>');
      process.exit(1);
    }
    const user = db.findUser(id);
    if (!user) {
      console.log('未找到该用户');
      process.exit(1);
    }
    db.setUserRole(id, 'user');
    console.log(`\n  已将 "${user.name}" 取消管理员身份\n`);
    break;
  }

  case 'rename': {
    const id = args[0];
    const name = args.slice(1).join(' ');
    if (!id || !name) {
      console.log('用法: node server/cli.js rename <用户ID> <新名字>');
      process.exit(1);
    }
    const user = db.updateUserName(id, name);
    if (!user) {
      console.log('未找到该用户');
      process.exit(1);
    }
    console.log(`\n  已将用户改名为 "${name}"\n`);
    break;
  }

  default:
    console.log(`
  管理命令行工具
  ==============
  list                         列出所有用户
  promote <用户ID>             设为管理员
  demote <用户ID>              取消管理员
  rename <用户ID> <新名>       修改用户名
    `);
}
