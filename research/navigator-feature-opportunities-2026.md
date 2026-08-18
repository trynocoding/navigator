# Navigator 功能机会：Chrome 新标签页竞品调研（2026）

> 调研日期：2026-08-18  
> 范围：Momentum、Tabliss、Bonjourr、Infinity New Tab、start.me，以及补充样本 Mue、Speed Dial 2、FVD Speed Dial。  
> 证据规则：只采用 Chrome Web Store 官方详情页、产品官网/官方文档/官方隐私政策、官方开源仓库。商店版本、价格和披露会变化，本文记录的是调研时可见状态。矩阵中的“风险判断”和后文机会排序属于产品分析，不是竞品官方声明。

## 结论先行

Navigator 已经覆盖“手动快捷方式 + 访问频次推荐 + 搜索 + 主题 + Chrome Sync/JSON 备份”这条核心链路，现阶段不缺更多首页组件，缺的是三类能力：**大量链接的组织与检索、推荐功能的控制与解释、可逆且可信的数据管理**。现有能力可由项目 [README](https://github.com/trynocoding/navigator/blob/main/README.md)、[Manifest](https://github.com/trynocoding/navigator/blob/main/public/manifest.json)、[推荐模块](https://github.com/trynocoding/navigator/blob/main/src/newtab/modules/recommend.js) 和 [存储模块](https://github.com/trynocoding/navigator/blob/main/src/shared/storage.js) 直接核对。

因此最值得立即做的不是天气、待办或 AI，而是：

1. 推荐与隐私控制中心：查看/恢复已屏蔽网站、撤销历史权限、清除相关状态、解释推荐原因。
2. 快捷方式分组、站内检索和键盘快速打开。
3. 删除/屏蔽后的撤销、重复网址检测和更可靠的迁移体验。

## 1. 竞品矩阵

| 产品 | 核心定位与活跃信号 | 关键功能 | 权限与隐私 | 商业模式 |
|---|---|---|---|---|
| **Momentum** | “平静、专注、生产力”仪表盘；Chrome 商店显示 2.26.8、2026-06-09 更新。[CWS](https://chromewebstore.google.com/detail/momentum/laookkfknpbbblfpciffpaejjkokdgca?hl=en) | 每日背景/名言、Focus、待办、快捷方式、天气和搜索；Plus 增加 Pomodoro、声音、Tab Stash、任务集成、AI 笔记/问答等。[CWS](https://chromewebstore.google.com/detail/momentum/laookkfknpbbblfpciffpaejjkokdgca?hl=en) · [Plus](https://momentumdash.com/plus) | 商店披露处理个人身份与认证信息；隐私政策称不能也不会追踪浏览历史，并把书签/最常访问站点、打开标签页和主机权限列为按功能启用的可选权限。[CWS](https://chromewebstore.google.com/detail/momentum/laookkfknpbbblfpciffpaejjkokdgca?hl=en) · [Privacy](https://momentumdash.com/legal/privacy) | 免费 + Plus 订阅；官方页面显示年付折算 $3.33/月、月付 $4.95。[Plus](https://momentumdash.com/plus) |
| **Tabliss** | 以漂亮背景和可组合小组件为主；商店仍可安装，但版本 2.6.0、最后更新为 2022-04-25，应视为成熟但更新较慢的样本。[CWS](https://chromewebstore.google.com/detail/tabliss-a-beautiful-new-t/hipekcciheckooncpjeljhnekcoolahp) | Unsplash/GIPHY/本地图片/渐变背景；时钟、天气、名言、待办、笔记、Quick Links、搜索、GitHub 日历、自定义 CSS 等。[官网](https://tabliss.io/) · [CWS](https://chromewebstore.google.com/detail/tabliss-a-beautiful-new-t/hipekcciheckooncpjeljhnekcoolahp) | 商店称无需权限且不收集数据；隐私政策说明设置留在浏览器，但外部背景/组件会收到必要参数，错误报告由 Sentry 处理且可能包含 IP、系统和操作上下文。[CWS](https://chromewebstore.google.com/detail/tabliss-a-beautiful-new-t/hipekcciheckooncpjeljhnekcoolahp) · [Privacy](https://tabliss.io/privacy.html) | 官方称 100% 免费、无广告、无订阅，代码 GPL-3.0 开源。[官网](https://tabliss.io/) · [仓库](https://github.com/joelshepherd/tabliss) |
| **Bonjourr** | iOS 风格的极简、轻量、隐私导向起始页；官方仓库持续发布 22.x 版本。[仓库](https://github.com/victrme/Bonjourr) · [Releases](https://github.com/victrme/Bonjourr/releases) | 动态 4K 背景、搜索、时钟、天气、Quick Links、Pomodoro、问候、深色模式、自定义字体/CSS、多语言。[仓库](https://github.com/victrme/Bonjourr) | 必需权限为 storage；书签与 Top Sites 只在导入/添加最常访问站点时按需请求。设置默认通过浏览器账号同步；背景、天气、名言等会访问其开源 API 或外部服务。[Privacy](https://bonjourr.fr/docs/reference/privacy-policy/) | GPL-3.0 开源，以自愿捐赠支持；仓库未列付费功能层级。[仓库](https://github.com/victrme/Bonjourr) |
| **Infinity New Tab (Pro)** | 大而全的导航仪表盘；商店显示 11.0.41、2026-07-07 更新。[CWS](https://chromewebstore.google.com/detail/infinity-new-tab-pro/nnnkddnnlpamobajfibfdgfnbcnkgngh?hl=en-US) | Speed Dial、书签/Top Sites、壁纸和图标样式、天气/待办/笔记、可选 Gmail 未读、账号同步与备份。[CWS](https://chromewebstore.google.com/detail/infinity-new-tab-pro/nnnkddnnlpamobajfibfdgfnbcnkgngh?hl=en-US) | 商店称不收集或使用扩展数据，并称书签、历史、Gmail 访问按功能可选；其覆盖整个产品族的隐私政策同时列出账号信息、同步内容、日志、AI 输入等服务端处理。两者作用域不同，不能仅凭其中一页推断全部数据流。[CWS](https://chromewebstore.google.com/detail/infinity-new-tab-pro/nnnkddnnlpamobajfibfdgfnbcnkgngh?hl=en-US) · [Privacy](https://www.infinitytab.link/privacy/en/privacy) | 商店明确披露默认可删除的合作伙伴快捷方式和联盟佣金；未在该页给出统一订阅价格。[CWS](https://chromewebstore.google.com/detail/infinity-new-tab-pro/nnnkddnnlpamobajfibfdgfnbcnkgngh?hl=en-US) |
| **start.me** | 云端个人/团队起始页，核心是页面、列和小组件；2026 官方文档仍持续更新。[Introduction](https://support.start.me/en/articles/9182794-introduction-to-start-me) | 多页面、最多 7 列、书签/RSS/笔记/任务/天气/日历/嵌入组件、分享协作、社区页面、浏览器书签导入和保存当前页。[Introduction](https://support.start.me/en/articles/9182794-introduction-to-start-me) · [CWS](https://chromewebstore.google.com/detail/new-tab-page-by-startme/cfmnkhhioonhiehehedmnjibmampjiab) | 商店披露处理个人身份和位置；隐私政策称收集姓名、邮箱、IP、浏览器和使用数据，免费版涉及广告/联盟跟踪，PRO 移除广告及相关跟踪。[CWS](https://chromewebstore.google.com/detail/new-tab-page-by-startme/cfmnkhhioonhiehehedmnjibmampjiab) · [Privacy](https://start.me/privacy) | Free：最多 3 页、含广告；Personal PRO：$25/年、无限页面、无广告并含高级功能；另有 Team/Enterprise。[Pricing](https://start.me/pricing) |
| **Mue** | 免费、开源、社区化的新标签页；官方博客记录 7.6.0 于 2026-01-27 发布。[仓库](https://github.com/mue/mue) · [Blog](https://muetab.com/blog/) | 可定制布局，背景、名言、天气、笔记、书签、搜索及 Marketplace 内容包。[仓库](https://github.com/mue/mue) | 隐私政策称设置和背景存本机；天气、背景、名言、favicon 和 Marketplace 会产生对应 API 请求，Offline Mode 可阻止这些请求。[Privacy](https://muetab.com/privacy/) | BSD-3-Clause 开源，官方称免费；未列付费层级。[Introduction](https://muetab.com/docs/introduction/) · [仓库](https://github.com/mue/mue) |
| **Speed Dial 2** | 面向大量视觉书签的组织与效率工具；商店显示 4.0.0、2025-12-10 更新。[CWS](https://chromewebstore.google.com/detail/speed-dial-2-new-tab/jpfpebmajhhopeonhlcgidhclcccjcik) | 无限书签、分组、浏览器书签与最近关闭标签、主题/背景、跨设备同步、分组分享；支持 `/` 搜索、键盘导航和访问次数显示。[CWS](https://chromewebstore.google.com/detail/speed-dial-2-new-tab/jpfpebmajhhopeonhlcgidhclcccjcik) · [Groups](https://www.speeddial2.com/help/creating-groups) | 商店披露处理个人身份和认证信息；隐私政策说明账号相关数据处理并称不出售个人身份信息。[CWS](https://chromewebstore.google.com/detail/speed-dial-2-new-tab/jpfpebmajhhopeonhlcgidhclcccjcik) · [Privacy](https://www.speeddial2.com/privacy-policy) | 免费基础功能 + Pro；JSON 导入导出免费，自动云备份和多版本恢复属于 Pro。[Backups](https://www.speeddial2.com/help/backups) |
| **FVD Speed Dial** | 视觉书签、分组、Most Visited 和同步的一体化产品；商店显示 81.8.35、2026-06-10 更新。[CWS](https://chromewebstore.google.com/detail/speed-dial-fvd-new-tab-pa/llaficoajjainaijghjlofdfmbjpebpa?hl=en) | 视觉书签、分组、自动 Most Visited、站内搜索、布局定制与跨设备同步。[CWS](https://chromewebstore.google.com/detail/speed-dial-fvd-new-tab-pa/llaficoajjainaijghjlofdfmbjpebpa?hl=en) | 商店明确说明 History 用于在本机生成 Most Visited，并披露处理 Web history 与 Website content；还列出 storage、contextMenus 和可选 management 权限。[CWS](https://chromewebstore.google.com/detail/speed-dial-fvd-new-tab-pa/llaficoajjainaijghjlofdfmbjpebpa?hl=en) | 可选赞助快捷方式和 Premium 功能；商店称这些内容可控制或关闭。[CWS](https://chromewebstore.google.com/detail/speed-dial-fvd-new-tab-pa/llaficoajjainaijghjlofdfmbjpebpa?hl=en) |

### 矩阵解读

- **审美/专注型**：Momentum、Tabliss、Bonjourr、Mue 通过背景、问候和轻量组件创造情绪价值；其中后三者以开源或本地存储强化信任。[Tabliss](https://tabliss.io/) · [Bonjourr](https://github.com/victrme/Bonjourr) · [Mue](https://github.com/mue/mue)
- **视觉书签型**：Speed Dial 2、FVD、Infinity 的优势不是单个快捷卡片，而是分组、检索、导入和大规模管理。[Speed Dial 2](https://chromewebstore.google.com/detail/speed-dial-2-new-tab/jpfpebmajhhopeonhlcgidhclcccjcik) · [FVD](https://chromewebstore.google.com/detail/speed-dial-fvd-new-tab-pa/llaficoajjainaijghjlofdfmbjpebpa?hl=en) · [Infinity](https://chromewebstore.google.com/detail/infinity-new-tab-pro/nnnkddnnlpamobajfibfdgfnbcnkgngh?hl=en-US)
- **云端工作台型**：start.me 把新标签页扩展成跨设备内容门户和协作产品，功能强但账号、广告、云数据与复杂度显著增加。[Introduction](https://support.start.me/en/articles/9182794-introduction-to-start-me) · [Privacy](https://start.me/privacy)
- **Navigator 的独特点**：竞品常见的是 Top Sites 或 Most Visited 展示，而 Navigator 已实现近 30 天、按访问时间衰减的域名级推荐，并把 `history` 放在可选权限中。[README](https://github.com/trynocoding/navigator/blob/main/README.md) · [推荐算法](https://github.com/trynocoding/navigator/blob/main/src/shared/scorer.js) · [Manifest](https://github.com/trynocoding/navigator/blob/main/public/manifest.json)

## 2. 用户需求簇

以下是基于竞品能力分布形成的产品归纳，不是未经提供的用户调查结论。

1. **立即到达**：少思考、少点击地打开固定站点；站点多时需要搜索、键盘导航和稳定位置。Speed Dial 2 已把 `/` 搜索、方向键导航和分组做成完整链路。[CWS](https://chromewebstore.google.com/detail/speed-dial-2-new-tab/jpfpebmajhhopeonhlcgidhclcccjcik)
2. **整理与迁移**：把工作/个人/项目分开，批量导入书签，跨设备恢复，删除后可挽回。start.me、Speed Dial 2 和 Bonjourr 都提供了不同程度的分组、导入或同步。[start.me](https://support.start.me/en/articles/9182794-introduction-to-start-me) · [Speed Dial 2](https://www.speeddial2.com/help/creating-groups) · [Bonjourr Privacy](https://bonjourr.fr/docs/reference/privacy-policy/)
3. **自动发现但保持掌控**：用户希望找回常去网站，又不希望固定区持续跳动，也不希望权限含义模糊。FVD 明确以 History 生成 Most Visited；Bonjourr 则在使用 Top Sites 时才请求权限，体现两种信任路径。[FVD CWS](https://chromewebstore.google.com/detail/speed-dial-fvd-new-tab-pa/llaficoajjainaijghjlofdfmbjpebpa?hl=en) · [Bonjourr Privacy](https://bonjourr.fr/docs/reference/privacy-policy/)
4. **个性化但不臃肿**：主题、背景、密度和布局的需求普遍存在；并不等于所有用户都需要天气、RSS、待办和 AI。[Tabliss](https://tabliss.io/) · [Mue](https://muetab.com/) · [Momentum](https://www.momentumdash.com/)
5. **可信的数据边界**：用户需要知道数据保存在本机、Chrome Sync 还是产品服务器，以及哪些外部服务能看到域名、位置或搜索词。Tabliss、Bonjourr 和 Mue 的隐私文档都按外部服务拆分了数据流。[Tabliss Privacy](https://tabliss.io/privacy.html) · [Bonjourr Privacy](https://bonjourr.fr/docs/reference/privacy-policy/) · [Mue Privacy](https://muetab.com/privacy/)
6. **快速、离线、无惊扰**：新标签页打开频率极高，远程背景、组件和账号服务不应阻塞核心快捷入口；Mue 为外部请求提供 Offline Mode，是可借鉴的控制方式。[Mue Privacy](https://muetab.com/privacy/)

## 3. Navigator 明确缺口

| 缺口 | 当前证据 | 为什么值得补 |
|---|---|---|
| 快捷方式没有分组/文件夹/工作区 | 当前数据只有扁平 `shortcuts` 数组。[storage.js](https://github.com/trynocoding/navigator/blob/main/src/shared/storage.js) | 站点超过一屏后，拖拽排序无法替代结构化整理；分组是 Speed Dial 2、FVD、start.me 的共同能力。 |
| 无快捷方式站内搜索和命令面板 | 首页搜索只跳转 URL 或外部搜索引擎。[main.js](https://github.com/trynocoding/navigator/blob/main/src/newtab/main.js) | 用户明明已经保存站点，却仍需扫视卡片；Speed Dial 2 的 `/` 搜索和键盘导航提供了成熟参照。 |
| 推荐控制不完整 | 支持固定与屏蔽，但没有管理/恢复屏蔽项、切换时间范围、撤销权限或清除推荐状态的界面。[recommend.js](https://github.com/trynocoding/navigator/blob/main/src/newtab/modules/recommend.js) | `history` 能查询逐次访问时间和完整 URL，属于需要持续可见控制的敏感能力。[Chrome history API](https://developer.chrome.com/docs/extensions/reference/api/history) |
| 推荐解释仍偏弱 | 当前卡片只显示访问次数，算法还考虑时间衰减。[recommend.js](https://github.com/trynocoding/navigator/blob/main/src/newtab/modules/recommend.js) · [scorer.js](https://github.com/trynocoding/navigator/blob/main/src/shared/scorer.js) | “为什么出现/为什么排序靠前”可提升信任，也能让用户判断算法是否符合预期。 |
| 删除和屏蔽不可撤销 | 删除快捷方式直接持久化，屏蔽后立即刷新；没有回收站或 Undo。[shortcuts.js](https://github.com/trynocoding/navigator/blob/main/src/newtab/modules/shortcuts.js) · [recommend.js](https://github.com/trynocoding/navigator/blob/main/src/newtab/modules/recommend.js) | 高频操作中的误删成本高，且恢复 JSON 备份过重。 |
| 没有浏览器书签导入和当前页快速保存 | Manifest 未声明 `bookmarks`、`activeTab`、`contextMenus` 或 toolbar action。[Manifest](https://github.com/trynocoding/navigator/blob/main/public/manifest.json) | 迁移成本和“保存正在浏览的页面”是视觉书签产品的重要入口；应按用户动作请求最小权限。 |
| 数据披露仍不够精确 | README 将数据概括为本地并经 Chrome 账号同步；设置还允许 Google/DDG favicon 服务。[README](https://github.com/trynocoding/navigator/blob/main/README.md) · [favicon.js](https://github.com/trynocoding/navigator/blob/main/src/shared/favicon.js) | “本机”“Chrome Sync”“外部 favicon 请求”是三条不同数据路径，应分开说明。Chrome 官方也说明 `storage.sync` 会在启用同步时跨已登录浏览器同步，且约有 100 KB/单项 8 KB 配额。[Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage) |
| 视觉个性化只有主题色，没有背景与密度控制 | 当前提供 6 套主题、自动模式和强调色。[README](https://github.com/trynocoding/navigator/blob/main/README.md) | 本地图片、纯色/渐变和紧凑布局是 Tabliss、Bonjourr、Mue、Speed Dial 2 的高频共性，但应保持可选和本地优先。 |

## 4. 机会优先级

### P0：先补两项工程地基

> 实施状态：已于 2026-08-18 完成版本化分片/迁移与推荐候选采样校准，并加入自动化回归测试。

这两项不是首页可见功能，但应先于“分组”和“书签批量导入”实施：

1. **存储分片与版本迁移。** 当前所有快捷方式都写在单个 `nv_shortcuts` 条目中，而 Chrome `storage.sync` 约有 100 KB 总配额和 8 KB 单项配额；链接数量增长或导入书签后，单项限制会先成为真实故障点。应引入 schema 版本、分组/分片键、旧数据迁移、配额错误提示与回滚测试。[当前 storage.js](https://github.com/trynocoding/navigator/blob/main/src/shared/storage.js) · [Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage)
2. **推荐候选采样校准。** 当前逻辑先按最近访问时间截取 60 个 URL，再按 origin 聚合并评分；它可能偏向“最近打开过很多不同页面”的域名，也可能漏掉 30 天内高频但不够近期的域名。应先补可复现数据集和排序测试，再决定是否加入 7/30/90 天等可调参数。[当前 recommend.js](https://github.com/trynocoding/navigator/blob/main/src/newtab/modules/recommend.js) · [当前 scorer.js](https://github.com/trynocoding/navigator/blob/main/src/shared/scorer.js) · [Chrome history API](https://developer.chrome.com/docs/extensions/reference/api/history)

### Now：先把核心导航做深

| 机会 | 用户价值 | 复杂度 | 隐私风险 | 建议范围 |
|---|---|---:|---:|---|
| 推荐与隐私控制中心 | 高 | 中 | **降低风险** | 集中显示 History 权限状态、30 天窗口、仅本机计算说明；支持管理/恢复屏蔽项、清空屏蔽、暂停推荐并撤销 `history` 权限。权限应继续由明确用户动作触发；Chrome 官方支持运行时请求可选权限。[Permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions) |
| 快捷方式搜索/命令面板 | 高 | 低 | 无新增 | 在首页搜索中优先匹配已保存站点，或提供 `/`、`Ctrl/Cmd+K` 面板；支持方向键选择、Enter 打开、修饰键新标签打开。参照 Speed Dial 2 的官方键盘流程。[CWS](https://chromewebstore.google.com/detail/speed-dial-2-new-tab/jpfpebmajhhopeonhlcgidhclcccjcik) |
| 分组与折叠 | 高 | 中 | 无新增 | 先做单层分组、拖拽跨组、折叠和“全部”；不要一开始做无限嵌套。Speed Dial 2 和 start.me 都证明工作/个人/项目分区是成熟需求。[Speed Dial 2 Groups](https://www.speeddial2.com/help/creating-groups) · [start.me Introduction](https://support.start.me/en/articles/9182794-introduction-to-start-me) |
| Undo 与重复检测 | 中高 | 低 | 无新增 | 删除快捷方式、屏蔽推荐后提供短时撤销；新增/导入时按规范化 origin/URL 提醒重复。 |
| 数据流说明与“一键清除” | 高 | 低到中 | **降低风险** | 把“设备本地计算”“Chrome Sync 保存”“外部 favicon 请求”分栏；提供导出后清空全部数据。借鉴 Tabliss/Bonjourr/Mue 对外部服务逐项披露的方式。[Tabliss Privacy](https://tabliss.io/privacy.html) · [Bonjourr Privacy](https://bonjourr.fr/docs/reference/privacy-policy/) · [Mue Privacy](https://muetab.com/privacy/) |

### Next：降低迁移与日常维护成本

| 机会 | 用户价值 | 复杂度 | 隐私风险 | 建议范围 |
|---|---|---:|---:|---|
| 浏览器书签导入 | 高 | 中 | 中 | 仅在点击“从 Chrome 导入”时请求 `bookmarks`；先做选择性导入、预览、去重和目标分组。Bonjourr 的官方政策采用按功能请求书签权限。[Bonjourr Privacy](https://bonjourr.fr/docs/reference/privacy-policy/) |
| 当前页快速保存 | 高 | 中 | 低到中 | 增加 toolbar action 或右键菜单，用用户手势读取当前标签标题/URL并选择分组；不要申请全站常驻内容脚本。start.me 已把“浏览时保存当前页”作为扩展核心入口。[官方帮助](https://support.start.me/en/articles/15392260-save-bookmarks-while-you-browse) |
| 推荐解释与稳定性设置 | 中高 | 中 | 低增量 | 提供非侵入式“为何推荐”：访问次数、最近活跃区间、已排除固定项；允许 7/30/90 天和“更稳定/更灵敏”，不在首页重复堆文案。 |
| 本地背景与布局密度 | 中 | 中 | 低 | 优先纯色、渐变、本地图片、紧凑/舒展两档；默认不依赖远程图片。Tabliss 和 Mue 均提供本地或离线路径。[Tabliss CWS](https://chromewebstore.google.com/detail/tabliss-a-beautiful-new-t/hipekcciheckooncpjeljhnekcoolahp) · [Mue Privacy](https://muetab.com/privacy/) |
| 同步状态与冲突保护 | 中 | 中 | 低 | 显示最近保存状态、配额错误和导入前自动快照；避免两台设备编辑时静默覆盖。Chrome 官方指出 sync 有配额且写入异步。[Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage) |

### Later：有验证再扩展边界

| 机会 | 用户价值 | 复杂度 | 隐私风险 | 启动条件 |
|---|---|---:|---:|---|
| 多配置档/工作区 | 中 | 中高 | 低 | 单层分组使用率高，且用户明确需要“工作/个人场景整套切换”。Bonjourr 已提供 Profiles，start.me 以多页面实现类似价值。[Bonjourr Docs](https://bonjourr.fr/docs/) · [start.me Introduction](https://support.start.me/en/articles/9182794-introduction-to-start-me) |
| 链接健康检查 | 中 | 中高 | 中 | 用户积累大量链接后再做；默认手动触发，明确网站域名会产生网络请求，不要求宽泛常驻主机权限。start.me 将重复/失效链接检测作为高级书签工具。[Pricing](https://start.me/pricing) |
| 跨浏览器加密同步 | 中高 | 高 | 高 | Chrome Sync 明确无法满足跨浏览器需求且用户愿意建立账号时；默认只同步快捷方式/布局，不同步原始历史。 |
| 国际化与社区主题包 | 中 | 中高 | 中 | 有明确海外用户后再做；主题包只能是数据/静态资源，不引入远程可执行代码。Mue 的 Marketplace 可作为需求参照。[Mue Docs](https://muetab.com/docs/) |

## 5. 明确不建议做

1. **不做默认赞助快捷方式、联盟入口或搜索引擎接管。** Infinity 与 FVD 都披露了合作/赞助入口，这种模式会直接削弱 Navigator 的隐私定位和用户对推荐结果的信任。[Infinity CWS](https://chromewebstore.google.com/detail/infinity-new-tab-pro/nnnkddnnlpamobajfibfdgfnbcnkgngh?hl=en-US) · [FVD CWS](https://chromewebstore.google.com/detail/speed-dial-fvd-new-tab-pa/llaficoajjainaijghjlofdfmbjpebpa?hl=en)
2. **不做云端浏览历史画像或广告个性化。** Navigator 的推荐可在本机完成；Chrome `history` API 能暴露 URL、标题、访问次数和时间，把原始数据上传会显著放大风险。[Chrome history API](https://developer.chrome.com/docs/extensions/reference/api/history)
3. **不做通用 AI 助手、AI 笔记或对话框。** Momentum 和 start.me 已把 AI 放入付费生产力套件，但它与“更快打开网站”的核心任务关系弱，还会引入账号、费用和输入内容外发。[Momentum Plus](https://momentumdash.com/plus) · [start.me Privacy](https://start.me/privacy)
4. **暂不做天气、RSS、股票、日历、Gmail 未读等门户组件。** 这些能力在 Momentum、start.me、Infinity 等产品已高度同质化，还会增加网络依赖、位置/账号权限和首页噪声。[Momentum CWS](https://chromewebstore.google.com/detail/momentum/laookkfknpbbblfpciffpaejjkokdgca?hl=en) · [start.me CWS](https://chromewebstore.google.com/detail/new-tab-page-by-startme/cfmnkhhioonhiehehedmnjibmampjiab) · [Infinity CWS](https://chromewebstore.google.com/detail/infinity-new-tab-pro/nnnkddnnlpamobajfibfdgfnbcnkgngh?hl=en-US)
5. **不做站点拦截、完整标签页管理或最近关闭标签页中心。** 这些会把产品扩展成注意力管理/标签管理工具，并要求更多权限；Momentum 的 Site Blocker/Tab Stash 与 Speed Dial 2 的最近关闭标签均属于另一条产品路线。[Momentum Plus](https://momentumdash.com/plus) · [Speed Dial 2 CWS](https://chromewebstore.google.com/detail/speed-dial-2-new-tab/jpfpebmajhhopeonhlcgidhclcccjcik)
6. **不开放任意远程脚本或默认远程背景。** 个性化应先支持本地图片和纯 CSS 主题；所有外部请求都应可关闭、可解释，并且不能阻塞快捷入口。

## 6. 推荐产品定位

> **Navigator 是一个本地优先、可解释、可恢复的智能导航页：固定区保持稳定，推荐区帮用户找回常去网站，所有自动化和数据流都能看见、关闭与撤销。**

这条路线避开了与 Momentum/Tabliss/Bonjourr 比拼背景和小组件，也不复制 start.me 的云端门户；它把 Speed Dial 产品擅长的“组织与检索”补进 Navigator，同时保留现有“手动固定区与自动推荐区分离、History 按需授权、Chrome Sync/JSON 可迁移”的优势。[Navigator README](https://github.com/trynocoding/navigator/blob/main/README.md)
