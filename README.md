# Space of us

`Space of us` 是一套情侣共享空间网站，围绕两个人的回忆、约定、菜单、订单、纪念日和地点收藏展开。

当前仓库保留了网站版与桌面端构建能力；本轮整理重点放在网站版、云端同步和 V3 交付上。

## 当前分支说明

- `main` / `space-of-us`：保留原有基线
- `space-of-us-v3`：当前本地整理分支
- `origin/V3`：GitHub 上对应的 V3 远端分支

## 当前能力

- 普通用户注册、登录、找回密码
- 管理员后台登录、查看用户、重置密码
- 情侣绑定邀请
- 情侣菜单、订单、约定
- 地点收藏、纪念日、时光宝盒
- 登录页照片与站点展示文案配置
- 共享数据逐步迁移到 Supabase，支持多设备同步

## 本地运行

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://localhost:3002
```

## 质量检查

```bash
npm run lint
npm run build
```

## 线上依赖

当前线上版本使用：

- Vercel：站点部署
- Supabase：账号、共享数据、上传存储

需要的关键环境变量包括：

- `AUTH_COOKIE_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `SITE_PASSWORD`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

## 日志约定

从 V3 开始，所有有效改动都记录到 [CHANGELOG.md](C:\Users\31795\Documents\Map\map-of-us-template-main\CHANGELOG.md)。
