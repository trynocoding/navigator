# Navigator 导航页

一个 Chrome（Manifest V3）新标签页扩展：自定义快捷方式 + 按访问频次自动推荐 + 多主题。数据仅存本地并通过 Chrome 账号同步，不上传任何服务器。

## 功能

- **自定义快捷方式**：增删改、右键菜单（打开 / 新窗口 / 编辑 / 置顶 / 删除）、拖拽排序，可上传自定义图标，favicon 自动获取（失败降级为首字母徽标）
- **常用推荐**：基于近 30 天浏览记录，按「频次 × 时间衰减」（7 天半衰期）评分，自动推荐常去网站；可 📌 固定到快捷区、🚫 屏蔽域名；权限按需申请，默认不开启
- **搜索框**：输入即搜（回车跳转），支持 Google / Bing / 百度 / 自定义，自动识别网址直达
- **主题**：6 套预设（云白 / 暖沙 / 石墨 / 深空蓝 / 莫兰迪绿 / 暗紫）+ 跟随系统亮暗 + 自定义主题色
- **数据**：快捷方式使用版本化分片通过 `chrome.storage.sync` 跨设备同步，可从旧版单键数据自动迁移；自定义图标因同步空间限制保存在本机，并可随 JSON 一键导入 / 导出

## 安装（开发者模式）

```bash
npm install
npm run build
```

1. 打开 `chrome://extensions`，右上角开启「开发者模式」
2. 点「加载已解压的扩展程序」，选择本项目的 `dist/` 目录
3. 新开一个标签页即可看到效果；改代码后重新 `npm run build`，再在扩展卡片上点「刷新」

## 开发

```bash
npm run dev    # 本地起 Vite 开发服务器（chrome.* API 不可用，仅供调样式）
npm test       # 运行存储迁移与推荐排序测试
npm run build  # 产出可加载的 dist/
node scripts/gen-icons.mjs   # 重新生成扩展图标
```

## 目录结构

```
├── index.html              # 新标签页入口
├── public/manifest.json    # MV3 清单
├── src/
│   ├── newtab/
│   │   ├── main.js         # 装配入口
│   │   ├── modules/        # shortcuts / recommend / settings / edit-dialog
│   │   └── styles/         # base.css（布局）、themes.css（主题变量）
│   └── shared/
│       ├── storage.js      # chrome.storage.sync 分片、迁移与导入导出
│       ├── scorer.js       # 频次评分算法（纯函数）
│       ├── favicon.js      # 图标获取与降级链
│       └── constants.js    # 引擎表、主题表、默认配置
└── scripts/gen-icons.mjs   # PNG 图标生成（无依赖）
```

## 权限说明

| 权限 | 类型 | 用途 |
|---|---|---|
| `storage` | 必需 | 存配置与快捷方式 |
| `favicon` | 必需 | 读取浏览器缓存的网站图标 |
| `history` | 可选 | 「常用推荐」功能，开启时才请求 |
