# 阿里云手动部署模板

适用项目：`Space of Us`  
本地项目目录：`C:\Users\31795\Documents\Map\map-of-us-template-main`  
服务器项目目录：`/var/www/space-of-us`  
部署分支：`V3`  
线上域名：`https://space-of-us.online`

## 1. 本地推送到 GitHub

先在本地进入项目：

```powershell
cd C:\Users\31795\Documents\Map\map-of-us-template-main
git status
```

如果只想提交指定代码文件，推荐手动添加：

```powershell
git add components/xxx.tsx app/xxx.tsx lib/xxx.ts
git commit -m "update: latest changes"
git push origin HEAD:V3
```

如果确认当前所有变更都应该提交，可以使用：

```powershell
git add .
git commit -m "update: latest changes"
git push origin HEAD:V3
```

注意：

- 不要把 `.env.production.local` 提交到 GitHub。
- 不要默认提交压缩包、临时文件、无关导出文件。
- 推送失败时先检查：

```powershell
git remote -v
ssh -T git@github.com
```

## 2. 阿里云部署固定流程

登录阿里云服务器后，按下面顺序逐条执行。不要把多条命令连在一行。

### 2.1 拉取最新代码

```bash
cd /var/www/space-of-us
git pull origin V3
```

### 2.2 停止旧服务

```bash
pm2 delete space-of-us
```

如果提示 `not found`，不用管，继续下一步。

```bash
pm2 kill
```

### 2.3 检查并释放 3000 端口

```bash
ss -ltnp | grep ':3000'
```

如果看到类似：

```bash
users:(("next-server",pid=2519,fd=21))
```

说明旧服务还占着端口，执行：

```bash
kill -9 2519
```

把 `2519` 换成你实际看到的 PID。

再次检查：

```bash
ss -ltnp | grep ':3000'
```

如果没有输出，说明端口已经释放。

### 2.4 清理旧构建并安装依赖

```bash
rm -rf .next
npm config set registry https://registry.npmmirror.com
npm install --no-audit --foreground-scripts
```

不要使用：

```bash
npm ci --prefer-offline --progress=false
```

这个命令输出很少，容易误以为卡死。

### 2.5 构建

```bash
npm run build
```

如果出现 `ENOTEMPTY`、`.next` 无法删除、server action 不匹配等问题，通常是旧进程没停干净。重新执行：

```bash
pm2 delete space-of-us
pm2 kill
ss -ltnp | grep ':3000'
kill -9 <PID>
rm -rf .next
npm run build
```

### 2.6 启动生产服务

```bash
PORT=3000 HOSTNAME=127.0.0.1 pm2 start npm --name space-of-us -- run start:production
pm2 save --force
systemctl reload nginx
```

### 2.7 验证部署

```bash
curl -I http://127.0.0.1:3000
curl -I https://space-of-us.online
pm2 describe space-of-us
```

成功标准：

- `curl` 返回 `HTTP/1.1 200 OK`
- `pm2 describe space-of-us` 显示 `online`
- 浏览器打开 `https://space-of-us.online` 能看到最新页面

## 3. 防卡住规则

### 3.1 每条命令单独执行

不要这样写：

```bash
pm2 delete space-of-us || true && npm run build && pm2 start ...
```

部署时要逐条执行，方便判断到底卡在哪一步。

### 3.2 依赖安装看起来没动时

如果 `npm install` 很久没输出，先等一会。确实长时间无响应时：

```bash
Ctrl + C
npm cache clean --force
npm install --no-audit --foreground-scripts
```

### 3.3 进入日志监听时

如果执行了：

```bash
pm2 logs space-of-us --lines 60
```

它不会自动结束。看完后按：

```bash
Ctrl + C
```

### 3.4 端口占用错误

如果日志出现：

```bash
EADDRINUSE: address already in use 127.0.0.1:3000
```

执行：

```bash
pm2 delete space-of-us
pm2 kill
ss -ltnp | grep ':3000'
kill -9 <PID>
PORT=3000 HOSTNAME=127.0.0.1 pm2 start npm --name space-of-us -- run start:production
```

### 3.5 浏览器显示旧页面

部署成功后，如果浏览器仍显示旧页面：

- 关闭旧标签页
- 重新打开 `https://space-of-us.online`
- 强制刷新
- 必要时换无痕窗口测试

这是 Next.js 页面缓存或旧 server action 壳子导致的常见现象。

## 4. 最短部署清单

确认没有端口残留时，可以按这个简版执行：

```bash
cd /var/www/space-of-us
git pull origin V3
pm2 delete space-of-us
pm2 kill
ss -ltnp | grep ':3000'
rm -rf .next
npm config set registry https://registry.npmmirror.com
npm install --no-audit --foreground-scripts
npm run build
PORT=3000 HOSTNAME=127.0.0.1 pm2 start npm --name space-of-us -- run start:production
pm2 save --force
systemctl reload nginx
curl -I http://127.0.0.1:3000
curl -I https://space-of-us.online
pm2 describe space-of-us
```

如果 `ss -ltnp | grep ':3000'` 有输出，先 `kill -9 <PID>`，再继续后续步骤。
