# Chrono X · X/Twitter 双时区扩展

![Chrono X](icons/icon128.png)

> 让不同国家的帖子更容易理解：同时显示**你的本地时间**和**作者时区对应的时间**。无需后端、无第三方 API、无账号登录或付费服务。

一个开源的、免编译的 Chrome / Edge Manifest V3 浏览器扩展。

## 安装（Chrome / Edge）

1. 下载 `chrono-x-extension-v1.1.0.zip`，解压到固定目录。
2. 打开 `chrome://extensions` 或 `edge://extensions`。
3. 开启右上方「开发者模式」。
4. 点击「加载已解压的扩展程序」，选中**包含 `manifest.json` 的目录**。
5. 打开或刷新 `https://x.com/`，帖子的操作栏上方出现时间标签；点击工具栏上的 Chrono X 图标进行设置。

> Chrome / Edge 不能直接「加载 zip」，必须先解压。此项目不需要 `npm install` / build。

## 已实现

- ✅ 读取帖子 `time[datetime]` 时间戳，准确换算为本地时间（不使用估计发布分钟数）。
- ✅ 配套的浅色、深色 X 帖子时间胶囊，支持紧凑模式。
- ✅ 根据浏览器系统时区或指定 IANA 时区显示「我的时间」。
- ✅ 自动识别公开个人资料里的可判定时区城市/国家（当访问主页、打开用户悬浮卡片时）。
- ✅ 点击「作者时区待确认」，通过弹窗输入城市自动匹配时区，或手动选时区；手动设置优先于自动推断。
- ✅ 扩展弹窗内集中管理手动配置、设置 12/24 小时制、关闭提示或整插件。
- ✅ 时区转换基于浏览器 `Intl`/IANA 规则，处理历史日期与夏令时。
- ✅ DOM 动态监听，面向 X 无限滚动 / 前端路由；可从弹窗关闭，不改动原帖数据。
- ✅ 所有设置保存在 `chrome.storage.local`，不联网传数据，未调用任何 X 私有 API。
- ✅ Chrome / Edge MV3；权限只申请 `storage` 与 X / Twitter 页面内容脚本权限。

## 关于作者当地时间的准确性

**X 不向扩展稳定公开每篇帖子的作者“真实发帖地理位置/时区”。** 所以不要将推测当作事实。

- 如果作者账号已手动设置时区，标记来源为「手动指定」。
- 当你打开作者资料页或悬浮卡片，并且有 `data-testid="UserLocation"` 的公开位置，扩展尝试匹配内置城市和时区；标记「推测」。
- 同一个账号在不同时间和地点发帖，插件仍会按当前缓存/手动时区换算；不代表发帖时的实际地理位置。
- 美国、加拿大、澳大利亚、俄罗斯等多时区国家不按国家名强行猜测；作者资料位置未包含明确城市时会显示「未知」。
- 作者未填写城市 / 网页不提供位置 / X 页面 DOM 改版时，作者时区可能无法自动得到。弹窗会解释可能原因，并提供访问资料页的入口；可输入城市或手动指定时区。
- **不会自动访问每个陌生作者的主页**，不发起后台批量抓取，也不依赖 IP 地理定位。因此信息流首次出现的作者通常显示「待确认」，这不是代码运行失败。
- 「Based in United States」只能说明账号主要活动国家，**无法确定作者的具体时区**；不会臆测纽约或洛杉矶。

## 文件结构

```text
manifest.json                # MV3 清单
icons/                       # 本地品牌图标
shared/timezones.js          # 城市映射、IANA 时区验证与日期格式化
src/content.js               # X 帖子发现、动态注入、位置提取和作者时区弹窗
src/content.css              # X 页面的双时区胶囊及弹窗样式
popup/popup.html             # 设置面板
popup/popup.css              # 设置面板视觉设计
popup/popup.js               # 本地设置读写、实时示例时钟、账号时区管理
tests/                       # 无第三方依赖的 Node.js 单元测试
LICENSE                      # MIT
```

## 升级到 v1.1.0

解压新版后，在 `chrome://extensions` 或 `edge://extensions` 中重新加载已解压目录，并刷新 X.com。已有的 `chrome.storage.local` 手动账号配置会保留（保持相同扩展 ID / 原目录）。

## 调试与测试

```bash
node --test tests/*.test.js
# 如果安装了 Python Playwright 和 Chromium，还可运行模拟页面端到端测试：
python tests/smoke.py
```

目前的功能测试基于模拟的 X 页面结构，未在实时 X.com 页面完成联网实测。

X DOM 改版可能会影响选择器。优先检查 `src/content.js` 中 `postTimestamp`、`authorFromPost`、`insertionTarget` 和 `detectPublicLocations`。欢迎提交 Issue / PR。

## 隐私

- 不收集 X 密码、Cookie、发帖内容，也不向第三方传输。
- `chrome.storage.local` 仅用于保存设置、作者时区映射和已在页面上看到的公开位置匹配结果。
- 源码可直接审核，无压缩、混淆及远程脚本。

## 许可证

MIT，见 [LICENSE](LICENSE)。
