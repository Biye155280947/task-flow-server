/**
 * 提醒引擎
 * 每隔 CONFIG.REMINDER_INTERVAL 检查一次任务截止时间，生成提醒
 * 小程序端通过 GET /api/reminders 获取待提醒列表
 */
const db = require('./db');
const CONFIG = require('./config');

let timerId = null;

function start() {
  if (timerId) return;
  console.log('  ⏰ 提醒引擎已启动（每30分钟检查一次任务截止时间）');
  timerId = setInterval(runCheck, CONFIG.REMINDER_INTERVAL);
}

function stop() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function runCheck() {
  try {
    const users = db.getUsers();
    const tasks = db.getTasks();
    const now = new Date();
    let remindedCount = 0;

    tasks.forEach(task => {
      if (task.status === 'completed' || !task.deadline) return;

      const deadline = new Date(task.deadline);
      const msUntilDeadline = deadline - now;
      const hoursUntilDeadline = msUntilDeadline / (1000 * 60 * 60);
      const lastReminder = task.lastReminderAt ? new Date(task.lastReminderAt) : null;
      const hoursSinceLastReminder = lastReminder ? (now - lastReminder) / (1000 * 60 * 60) : Infinity;
      const currentHour = now.getHours();

      let shouldRemind = false;

      if (hoursUntilDeadline <= 0) {
        // 已逾期：标记状态 + 通知执行人
        if (task.status === 'in_progress' || task.status === 'pending') {
          task.status = 'overdue';
        }
        // 每12小时提醒一次逾期（避免重复通知）
        var lastOverdueNotif = task._lastOverdueNotif || 0;
        if (Date.now() - lastOverdueNotif > 12 * 60 * 60 * 1000) {
          task.assignees.forEach(function(a) {
            db.addNotification(a.id, 'task_overdue', '任务已逾期',
              '任务 "' + task.title + '" 已超过截止日期！', task.id);
          });
          task._lastOverdueNotif = Date.now();
        }
        return;
      }

      if (hoursUntilDeadline <= 24) {
        // 1 天内：每 2 小时提醒
        if (hoursSinceLastReminder >= 2) {
          shouldRemind = true;
        }
      } else {
        // 2 天以上：每天 9:00 提醒
        if (currentHour >= 9 && currentHour < 10 && hoursSinceLastReminder >= 20) {
          shouldRemind = true;
        }
      }

      if (shouldRemind) {
        task.lastReminderAt = now.toISOString();
        remindedCount++;
      }
    });

    db.saveTasks(tasks);

    if (remindedCount > 0) {
      console.log(`  ⏰ 提醒引擎：已标记 ${remindedCount} 个任务待提醒`);
    }
  } catch (err) {
    console.error('[提醒引擎错误]', err.message);
  }
}

module.exports = { start, stop };
