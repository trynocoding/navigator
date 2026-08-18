# Navigator 导航页

一个 Chrome（Manifest V3）新标签页扩展：自定义快捷方式 + 按访问频次自动推荐 + 多主题。Navigator 不使用自有服务器；同步数据交给 Chrome，自定义图标和浏览分析留在本机。

## 功能

- **自定义快捷方式**：单层分组、折叠、跨组拖拽、右键管理和自定义图标；删除支持撤销，所有添加入口统一校验并拦截重复网址
- **随手保存与迁移**：点击扩展图标可把当前网页直接存入指定分组；Chrome 书签支持按文件夹预览、选择性导入、去重，并可整体撤销上一次导入
- **常用推荐**：在本机分析浏览记录，支持近 7 / 30 / 90 天与「更稳定 / 更灵敏」两种排序；每项可查看推荐依据、固定或屏蔽，权限按需申请且可随时撤销
- **搜索与命令入口**：优先匹配已保存快捷方式，支持 `/`、`Ctrl/Cmd + K`、方向键、回车和修饰键新标签打开；也支持 Google / Bing / 百度 / 自定义搜索引擎
- **主题**：6 套预设（云白 / 暖沙 / 石墨 / 深空蓝 / 莫兰迪绿 / 暗紫）+ 跟随系统亮暗 + 自定义主题色
- **数据与隐私**：快捷方式和分组使用版本化分片同步，可从旧版数据自动迁移；设置页明确区分本机计算、Chrome 同步和外部图标请求，并提供备份、屏蔽恢复、撤销权限与一键清空

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
npm run dev    # 本地起 Vite 开发服务器（自动启用开发 API 模拟层，可完整交互）
npm test       # 运行存储迁移与推荐排序测试
npm run build  # 产出可加载的 dist/
node scripts/gen-icons.mjs   # 重新生成扩展图标
```

## 目录结构

```
├── index.html              # 新标签页入口
├── popup.html              # 工具栏“保存当前页”入口
├── public/manifest.json    # MV3 清单
├── src/
│   ├── newtab/
│   │   ├── main.js         # 装配入口
│   │   ├── modules/        # shortcuts / recommend / settings / edit-dialog / toast
│   │   └── styles/         # base.css（布局）、themes.css（主题变量）
│   ├── popup/              # 当前页快速保存界面
│   └── shared/
│       ├── storage.js      # chrome.storage.sync 分片、迁移与导入导出
│       ├── shortcut-model.js # 分组、排序、去重与搜索模型
│       ├── chrome-shim.js  # 仅在本地预览启用的扩展 API 模拟层
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
| `activeTab` | 必需 | 仅在点击扩展图标时读取当前网页标题与网址，用于快速保存 |
| `history` | 可选 | 「常用推荐」功能，开启时才请求 |
| `bookmarks` | 可选 | 「从 Chrome 导入」时读取书签树；不会修改 Chrome 原书签 |
