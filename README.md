# 任务流程管理系统（微信小程序）

一个用于团队任务分配的微信小程序，支持单人/双人任务分配、进度追踪、截止日期管理。

## 功能特性

- 微信一键登录 — 使用微信账号直接登录，无需注册
- 任务发布 — 管理员可发布任务，指定执行人和截止日期
- 双人协作 — 支持双人协作任务，每人进度各占 50%，均完成显示 100%
- 进度追踪 — 任务执行人可通过滑块更新个人完成进度
- 任务筛选 — 按全部/待处理/进行中/已完成筛选
- 截止日期 — 设置任务截止日期，逾期自动标红提醒
- 管理员功能 — 管理员可修改所有用户的昵称
- 数据持久化 — 基于 JSON 文件存储，无需数据库

## 项目结构

```
task-flow/
├── server/                    # 后端服务（Node.js，零依赖）
│   ├── app.js                # 服务入口
│   ├── config.js             # 配置（微信 AppID, Secret 等）
│   ├── db.js                 # JSON 文件数据库
│   ├── router.js             # API 路由分发
│   ├── handlers/
│   │   ├── auth.js           # 微信登录处理
│   │   ├── tasks.js          # 任务 CRUD
│   │   └── users.js          # 用户管理
│   └── data/                 # 数据存储（运行时生成）
│       ├── users.json
│       └── tasks.json
│
├── miniprogram/               # 微信小程序前端
│   ├── app.js / app.json / app.wxss
│   ├── project.config.json   # 微信开发者工具配置
│   ├── pages/
│   │   ├── index/            # 登录 / 个人中心
│   │   ├── tasks/            # 任务列表（首页 Tab）
│   │   ├── create/           # 创建任务
│   │   ├── detail/           # 任务详情 & 进度更新
│   │   └── admin/            # 用户管理（管理员）
│   └── utils/
│       └── api.js            # API 请求封装
│
└── README.md
```

## 快速开始

### 1. 启动后端服务

```bash
# 开发模式（无需微信配置，自动使用模拟登录）
node server/app.js

# 生产模式（设置微信小程序 AppID 和 Secret）
WX_APPID="你的AppID" WX_SECRET="你的AppSecret" DEV_MODE="false" node server/app.js
```

服务默认在 http://localhost:3000 启动。

### 2. 打开小程序

用微信开发者工具打开 `miniprogram/` 目录，修改 `miniprogram/app.js` 中的 `baseUrl` 指向后端地址（开发时用 `http://localhost:3000`）。

### 3. 配置微信小程序

编辑 `server/config.js` 或在环境变量中设置：

| 环境变量 | 说明 |
|---------|------|
| WX_APPID | 微信小程序 AppID |
| WX_SECRET | 微信小程序 AppSecret |
| DEV_MODE | 开发模式（默认 true），设为 false 使用真实微信登录 |
| PORT | 服务端口（默认 3000） |
| SESSION_SECRET | 会话加密密钥 |

## API 接口

| 方法 | 路径 | 说明 | 需要认证 |
|------|------|------|---------|
| POST | /api/auth/login | 微信登录 | 否 |
| GET | /api/auth/me | 获取当前用户信息 | 是 |
| GET | /api/users | 获取用户列表（管理员） | 是 |
| PUT | /api/users/:id/name | 修改用户名（管理员） | 是 |
| GET | /api/tasks | 获取任务列表 | 是 |
| POST | /api/tasks | 创建任务（管理员） | 是 |
| GET | /api/tasks/:id | 获取任务详情 | 是 |
| PUT | /api/tasks/:id/progress | 更新任务进度 | 是 |
| DELETE | /api/tasks/:id | 删除任务（管理员） | 是 |

## 进度规则

- 单人任务：进度 0-100%，直接拖动滑块设置
- 双人任务：每人进度 0-50%（滑块显示 0-100%，自动映射到 0-50%）
  - 两人各完成 50% → 总进度 100%
  - 一人完成 50%，另一人 0% → 总进度 50%
- 任务状态自动流转：待处理 → 进行中（有进度后） → 已完成（满 100%）

## 技术栈

- 后端：Node.js（内置 http 模块，零外部依赖）
- 前端：微信小程序原生框架（WXML + WXSS + JS）
- 存储：JSON 文件持久化
- 认证：微信 jscode2session / 开发模式模拟登录
