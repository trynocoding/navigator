# Chrome 导航页扩展：竞品与可行能力调研

> 调研日期：2026-08-18  
> 范围：Chrome 新标签页（New Tab）扩展，重点关注自定义快捷页、按访问频次自动推荐、主题配色与美化。  
> 证据原则：优先使用 Chrome Web Store 详情页、Chrome Extensions 官方文档和产品官方页面。本文没有把用户评论或媒体文章作为事实依据；Chrome Web Store 的评分、用户数等动态信息也不作为产品判断的核心证据。

## 一、结论摘要

1. **“自定义快捷页 + 主题美化”已经是成熟红海**。Momentum、Bonjourr、Tabliss、Infinity New Tab、Speed Dial 2、FVD 和 start.me 都覆盖了其中大部分能力，差异主要在审美风格、生产力组件、云同步、商业化和隐私取舍。
2. **“按访问频次自动推荐”是明显的技术/信任分水岭**。Chrome 原生 `topSites` 能提供“最常访问站点”的 URL 和标题，但不提供明确的访问次数或时间戳；若要自行计算更精细的频次、衰减和趋势，需要 `history` 权限，权限提示会显著增加认知成本。见 [topSites API](https://developer.chrome.com/docs/extensions/reference/api/topSites)、[history API](https://developer.chrome.com/docs/extensions/reference/api/history) 和 [权限列表](https://developer.chrome.com/docs/extensions/reference/permissions-list)。
3. **最值得切入的差异化不是“再做一个漂亮壁纸页”**，而是“可解释、可控、隐私优先的智能导航”：手动固定项与自动推荐分层；默认只根据用户在扩展内点击产生的本地信号；用户主动开启后才使用 `topSites`，把完整历史作为更后置的实验能力。
4. **MVP 可以不申请浏览历史、书签或主机权限**：用 `chrome_url_overrides.newtab` 接管新标签页，用 `chrome.storage` 保存快捷项、主题和扩展内点击计数。只有导入浏览器书签、读取 Chrome 原生 Top Sites 或读取全局历史时才逐级增加权限。

## 二、竞品地图

### 2.1 重点竞品矩阵

| 产品 | 定位与核心功能 | 频次/自动推荐 | 免费/付费信息 | 隐私与权限信息（仅写有来源者） |
|---|---|---|---|---|
| [Momentum](https://chromewebstore.google.com/detail/momentum/laookkfknpbbblfpciffpaejjkokdgca?hl=en) | 以“平静、专注、生产力”为核心的仪表盘；每日背景/名言、Focus Mode、待办、快捷方式、天气、搜索；Plus 增加无限 Focus Mode、Vision Board、Tab Stash、AI 笔记/问答和第三方任务集成等。 | 详情页重点是用户创建快捷方式和生产力组件，没有把全局访问频次推荐作为核心卖点。 | CWS 标注“提供内购”；页面明确区分 FREE 与 PLUS 功能，但未在详情页给出统一价格。 | CWS 的数据披露为个人身份信息、认证信息；官方隐私政策说明可选权限包括书签/最常访问网站、打开的标签页和主机权限，并说明用途。来源：[CWS](https://chromewebstore.google.com/detail/momentum/laookkfknpbbblfpciffpaejjkokdgca?hl=en)、[Momentum 隐私政策](https://momentumdash.com/legal/privacy)。 |
| [Bonjourr](https://chromewebstore.google.com/detail/bonjourr-%C2%B7-minimalist-new/dlnejlppicbjfcfedcflplfjajinajd) | 极简、iOS 风格、重视审美与轻量；动态 4K/视频背景、Quick Links、搜索、Markdown 笔记/清单、Pomodoro、天气、名言、自定义字体/CSS、深色模式。 | 默认是手动 Quick Links；官方隐私文档将“Top sites”列为可选能力，用户在启用“把最常访问站点加入链接”时才请求。 | 官方站点称免费，主要依靠捐赠；开源。来源：[官网](https://bonjourr.fr/)。 | CWS 声称不收集数据、不要求账号、只请求最小权限；官方隐私文档说明必需的是 `storage`，书签和 Top Sites 为可选，页面设置保存在浏览器扩展存储中，且该存储不加密。来源：[CWS](https://chromewebstore.google.com/detail/bonjourr-%C2%B7-minimalist-new/dlnejlppicbjfcfedcflplfjajinajd)、[隐私文档](https://bonjourr.fr/docs/reference/privacy-policy/)。 |
| [Tabliss](https://chromewebstore.google.com/detail/tabliss-a-beautiful-new-t/hipekcciheckooncpjeljhnekcoolahp) | “漂亮的新标签页”代表；背景提供 Unsplash、GIPHY、纯色/渐变和本地上传；时钟、问候、天气、名言、待办、笔记、快速链接、搜索、GitHub 日历、自定义 CSS 等。 | 快速链接为手动维护；详情页没有把全局访问频次推荐作为主要功能。 | CWS 和官网均称 100% 免费、开源、无广告；CWS 描述为不需要权限。 | CWS 披露“不收集或使用数据”；官方隐私政策补充说明设置只保存在浏览器，外部背景/组件服务会收到实现该组件所需的查询信息；自身会收集错误报告。来源：[CWS](https://chromewebstore.google.com/detail/tabliss-a-beautiful-new-t/hipekcciheckooncpjeljhnekcoolahp)、[官网](https://tabliss.io/)、[隐私政策](https://tabliss.io/privacy.html)。 |
| [Infinity New Tab (Pro)](https://chromewebstore.google.com/detail/infinity-new-tab-pro/nnnkddnnlpamobajfibfdgfnbcnkgngh?hl=en) | 大而全的导航仪表盘；快捷方式、书签与 Top Sites、壁纸/布局/图标、天气/待办/笔记、可选 Gmail 未读、可选跨设备同步与备份。支持删除或替换默认伙伴快捷方式。 | 明确展示“frequently visited sites/Top Sites”；更像把原生 Top Sites 与手动快捷方式放到同一页，而不是公开完整的频次算法。 | CWS 详情页未明确给出价格层级；不要据此假设免费或付费。 | CWS 声明开发者“不收集或使用你的数据”；同时详情页说明书签、历史、Gmail 通知和同步均为可选，另有伙伴/联盟快捷方式披露。来源：[CWS](https://chromewebstore.google.com/detail/infinity-new-tab-pro/nnnkddnnlpamobajfibfdgfnbcnkgngh?hl=en)、[开发者官网](https://infinitytab.link/)。 |
| [Speed Dial 2](https://chromewebstore.google.com/detail/speed-dial-2-new-tab/jpfpebmajhhopeonhlcgidhclcccjcik?hl=en) | 视觉书签和分组管理；收藏站点、最近关闭标签页、搜索、主题/背景/字体/颜色/布局、自定义缩略图、Focus Mode、导入导出。 | 产品定位包含“most visited websites”，并有“显示书签访问次数”的版本记录；核心仍是用户保存、分组和整理视觉书签。 | 官方页面称基础功能免费；Speed Dial 2 Pro 为可选付费升级，提供跨设备同步、自动云备份、自定义缩略图等。来源：[官网](https://www.speeddial2.com/)、[备份说明](https://www.speeddial2.com/help/backups)。 | CWS 数据披露为个人身份信息、认证信息；官方隐私政策写明账号服务会处理邮箱、哈希密码、位置、IP 等信息，并使用分析工具。来源：[CWS](https://chromewebstore.google.com/detail/speed-dial-2-new-tab/jpfpebmajhhopeonhlcgidhclcccjcik?hl=en)、[隐私政策](https://www.speeddial2.com/privacy-policy)。 |
| [Speed Dial FVD](https://chromewebstore.google.com/detail/speed-dial-fvd-new-tab-pa/llaficoajjainaijghjlofdfmbjpebpa?hl=en) | 覆盖面很完整的视觉 Speed Dial；3D/预设图片、书签分组、Most Visited、搜索、同步、布局与设计控制。 | 详情页明确写出“自动显示最常访问站点”；并说明浏览历史用于本地生成 Most Visited tiles。 | 详情页披露可选赞助/推荐 Speed Dial tiles、可选 Premium 功能；没有在页面中给出统一价格。 | CWS 说明权限包括 Tabs & New Tab Override、History、Storage、Context Menus，`management` 可选；数据披露包括 Web history 和 Website content，并声明可关闭同步、搜索及可选内容。来源：[CWS](https://chromewebstore.google.com/detail/speed-dial-fvd-new-tab-pa/llaficoajjainaijghjlofdfmbjpebpa?hl=en)、[隐私政策](https://everhelper.pro/privacy.php)。 |
| [start.me](https://chromewebstore.google.com/detail/new-tab-page-by-startme/cfmnkhhioonhiehehedmnjibmampjiab) | 云端个人/团队起始页；书签、RSS、笔记、待办、日历/股票/天气等小组件、嵌入内容、分享协作、浏览器书签导入。 | 重点是云端整理、同步和协作，不是按访问频次自动推荐。 | 官方定价：Free 为 $0、最多 3 个 start pages、基础小组件、有广告；Personal PRO 为每年 $25，去广告/跟踪并增加无限页面、专业小组件、AI 等；团队方案另计。来源：[定价](https://start.me/pricing)。 | CWS 披露个人身份信息、位置；官方隐私政策说明会收集姓名、邮箱、IP、浏览器类型和使用数据，免费计划依靠广告，Pro 去除广告及广告跟踪。来源：[CWS](https://chromewebstore.google.com/detail/new-tab-page-by-startme/cfmnkhhioonhiehehedmnjibmampjiab)、[隐私政策](https://start.me/privacy)。 |
| [Mue](https://chromewebstore.google.com/detail/mue/bngmbednanpcfochchhgbkookpiaiaid?hl=en) | 免费、开源、社区化的新标签页；背景、名言、笔记、快速链接、天气、问候、Marketplace 和多语言。 | 快速链接以用户自定义为主，详情页没有把全局频次推荐作为核心能力。 | 官方文档称免费、开源，BSD-3-Clause；无付费层级信息。来源：[官方介绍](https://muetab.com/docs/introduction/)、[许可证](https://muetab.com/license/)。 | 官方隐私政策称设置与背景等本地存储、不向第三方分享个人信息；天气可能发送位置，背景可能向 Mapbox 发送图片信息，快速链接可能向 DuckDuckGo favicon API 发送用户填写的 URL；可启用 Offline Mode。来源：[隐私政策](https://muetab.com/privacy/)。 |

### 2.2 直接覆盖“自动按频次推荐”的轻量竞品

| 产品 | 观察 |
|---|---|
| [Most Visited (Top Sites)](https://chromewebstore.google.com/detail/most-visited-top-sites/obbnkbhoknnlndofpoikddaompgmiioc) | 极窄的工具：使用 Chrome Top Sites API，在下拉列表展示最常访问页面；没有复杂仪表盘，CWS 披露不收集或使用数据。它证明“原生 Top Sites 入口”可以成为单一功能，但仅有推荐列表很难形成完整的新标签页体验。 |
| [New tab page（自动计数型）](https://chromewebstore.google.com/detail/new-tab-page/ndglbjbchiifeadhllmempmkblgafglb) | CWS 描述为对扩展内快捷方式点击计数并按使用频率动态排序。它更接近“低权限的扩展内行为统计”，而不是读取全局浏览历史；该产品规模与成熟度信息不作为本报告判断依据。 |
| [TabMark](https://chromewebstore.google.com/detail/tabmark-your-bookmarks-re/kbljljplfgejfgdfgldadaplppjbpmpi) | CWS 描述同时使用 Bookmarks、History 和 Top Sites API，提供最近/频繁访问、书签和搜索；适合观察“把浏览器原生数据集中到导航页”的完整路线，但也意味着权限和隐私解释成本更高。 |

## 三、Chrome 新标签页能力与限制

### 3.1 接管 New Tab

- Chrome 官方支持通过 Manifest 的 `chrome_url_overrides` 注册 `newtab` 页面，页面会在创建新标签或新窗口时出现；官方示例使用 `"chrome_url_overrides": { "newtab": "myPage.html" }`。来源：[Override Chrome pages](https://developer.chrome.com/docs/extensions/develop/ui/override-chrome-pages)。
- 一个扩展只能覆盖 Bookmark Manager、History、New Tab 三类页面中的一种；对本项目而言只需要 `newtab`。
- **隐身窗口限制**：扩展不能在 Incognito 窗口覆盖 New Tab。产品应接受降级到 Chrome 默认页。来源：[Override Chrome pages — Incognito window behavior](https://developer.chrome.com/docs/extensions/develop/ui/override-chrome-pages#incognito_window_behavior)。
- 新标签页应当“快速、小而轻”；官方建议避免同步访问数据库，网络请求优先使用 `fetch()`。地址栏默认先获得键盘焦点，UI 不应假设页面中的搜索框自动获得焦点。来源：[Override Chrome pages — Best practices](https://developer.chrome.com/docs/extensions/develop/ui/override-chrome-pages#best_practices)。
- Chrome Web Store 政策要求使用已有 Chrome API；通过 URL Overrides 以外的方式覆盖 New Tab 不被允许。Manifest V3 的逻辑应包含在扩展包中，不能通过远程脚本动态执行逻辑；远程图片等非逻辑资源可以使用，但需配合隐私披露。来源：[Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)。

### 3.2 自定义快捷方式、书签与同步

- **仅做扩展内快捷方式**：用 `chrome.storage` 保存 URL、标题、图标、排序、主题和点击计数即可。`storage` 是扩展专用的持久化 API，支持 `local`、`sync`、`session` 等区域。来源：[chrome.storage](https://developer.chrome.com/docs/extensions/reference/api/storage)。
- **导入/同步 Chrome 原生书签**：需要 `bookmarks` 权限；书签 API 能读取完整书签树、搜索和监听变化。若 MVP 只是添加自定义链接，不应为了“以后可能导入书签”而提前申请该权限。来源：[chrome.bookmarks](https://developer.chrome.com/docs/extensions/reference/api/bookmarks)。
- `storage.sync` 适合保存少量配置：官方给出的限制约为 100 KB、单项 8 KB；本地 `storage.local` 默认上限为 10 MB。建议同步 URL/标题/主题 token，不同步大图。来源：[chrome.storage — quotas](https://developer.chrome.com/docs/extensions/reference/api/storage#storage_areas)。
- Chrome 官方提醒扩展存储不加密，不要把密码等敏感信息当作普通设置存放。导航页应避免提供“保存密码”类功能，并提供导出/清空数据入口。来源：[Protect user privacy](https://developer.chrome.com/docs/extensions/develop/security-privacy/user-privacy)。

### 3.3 访问频次数据：三条路线

| 路线 | 能得到什么 | 权限与代价 | 适合的产品阶段 |
|---|---|---|---|
| **只统计扩展内点击** | 对用户在导航页点击过的快捷方式做计数、最近访问、时间衰减；可以完全由产品自行定义排序算法。 | 只需 `storage`；不会看到用户在其他页面直接访问的站点。这里的“无需历史权限”是基于实现路径的产品推断：统计对象是扩展自身产生的点击事件，而不是 Chrome 全局历史。 | MVP 首选；可提供“按我在导航页里的使用习惯自动排序”。 |
| **`chrome.topSites`** | Chrome 提供的最常访问站点列表，返回 `title` 和 `url`；官方明确说它不包含用户自定义快捷方式。 | 必须声明 `topSites`；权限警告是“读取你最常访问的网站”。它没有在返回对象中提供 visit count、last visit time 等字段，因此不适合单独实现自定义频次模型。来源：[topSites API](https://developer.chrome.com/docs/extensions/reference/api/topSites)、[permissions API 示例](https://developer.chrome.com/docs/extensions/reference/api/permissions)。 | V1 可选功能；在用户点击“开启浏览器推荐”后请求。 |
| **`chrome.history`** | `HistoryItem` 具有 URL、标题、`visitCount`、`lastVisitTime`、`typedCount`；可用 `history.search()` 查询、`onVisited` 监听新访问。来源：[history API](https://developer.chrome.com/docs/extensions/reference/api/history)。 | 必须声明 `history`；权限列表显示的警告是“读取并更改所有已登录设备上的浏览历史”。这会显著增加信任、商店隐私披露和安全责任；即使只读，也不能把它当作低成本权限。来源：[permissions list](https://developer.chrome.com/docs/extensions/reference/permissions-list)。 | V2 或经过用户验证的实验能力；应做成可选权限，并坚持本地聚合、短保留、可删除。 |

### 3.4 权限、隐私与商店可行性

- Chrome 官方建议只请求当前功能所需的最小权限，不要为了未来功能“预先申请”；非核心功能可放入 `optional_permissions`，在用户手势中解释后再请求。来源：[chrome.permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions)、[Protect user privacy](https://developer.chrome.com/docs/extensions/develop/security-privacy/user-privacy)。
- Chrome Web Store 的 Limited Use 政策要求：浏览活动只能用于产品页面和界面中明确披露的用户功能；不能将其用于个性化广告、转卖或与单一目的无关的用途。来源：[Chrome Web Store Program Policies — Limited Use](https://developer.chrome.com/docs/webstore/program-policies/policies#limited_use)。
- 即使数据只在本地处理或存储，也不能因此省略披露；Chrome Web Store 的用户数据 FAQ 明确把“网页浏览活动”列为用户数据，并要求披露本地处理方式。来源：[User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/)。
- 若使用远程壁纸、天气、名言或 favicon 服务，真正离开设备的可能是请求参数、URL、位置或 IP；应在隐私页逐项说明，提供离线/关闭外部服务选项。Mue、Tabliss、Bonjourr 的官方隐私页面展示了这种拆分披露方式，见其各自竞品条目。

## 四、从竞品归纳的用户痛点与差异化机会

以下是基于上述产品能力与平台约束的产品推断，不是对未提供原始数据的用户调查结论。

### 痛点 1：漂亮与有用经常割裂

Momentum、Bonjourr、Tabliss、Mue 的价值在于氛围、专注与审美；Speed Dial 2、FVD、Infinity 的价值在于密度、整理和快速入口；start.me 则进一步走向云端小组件和协作。用户常见的权衡是：页面越漂亮越可能缺少高密度导航，功能越多越容易变成拥挤的“工作台”。

**机会**：以“少量核心快捷方式 + 可折叠的推荐区 + 一套明确的主题系统”为默认，而不是一开始堆时钟、天气、名言、待办、RSS、AI 等模块。让每个模块可关闭，首屏保持可扫读。

### 痛点 2：自动推荐有价值，但读取历史让人犹豫

FVD、Infinity 和部分轻量扩展展示 Most Visited；Chrome 本身也提供 `topSites`。但 `topSites` 仍需权限，完整频次模型则需要 `history`。这造成典型的“推荐越聪明，权限越敏感”矛盾。

**机会**：分三层呈现自动化：

1. 默认用扩展内点击计数，零历史权限；
2. 用户主动开启后，使用 `topSites` 产生“浏览器推荐”；
3. 只有明确选择“智能频次”时才申请 `history`，并展示示例、数据范围、处理位置、保留周期和一键关闭/删除。

### 痛点 3：自动排序可能破坏用户的稳定布局

纯频次排序会让入口不断跳动，用户难以形成肌肉记忆；而纯手动排序又无法适应工作流变化。

**机会**：把“固定区”和“推荐区”分离。固定区永不被自动排序；推荐区使用时间衰减、最小样本数和稳定性阈值，只有明显变化才调整。每个推荐项提供“为什么出现”（例如“最近 7 天打开 8 次”），但不要在未获授权时展示历史细节。

### 痛点 4：商业化和默认外部服务会削弱信任

Momentum、start.me 明确有付费层；Infinity、FVD 等详情页披露伙伴/赞助入口或可选商业能力。对于导航页，用户天然会担心搜索引擎被替换、快捷方式被注入、浏览数据用于广告。

**机会**：默认不修改 Chrome 搜索设置，使用用户现有搜索引擎或让用户显式选择；默认不放伙伴/赞助快捷方式；公开“数据流面板”，把本地数据、同步数据、可选外部请求分别列出。Chrome Web Store 也特别指出，改变搜索体验且不尊重现有设置的新标签页属于质量风险。来源：[Quality Guidelines](https://developer.chrome.com/docs/webstore/program-policies/policies#quality_guidelines)。

### 痛点 5：同步、导入和迁移容易被低估

Speed Dial 2、Infinity、start.me 等把跨设备、云端账号或导入导出作为重要价值；但同步会引入账号、认证和服务器隐私责任，`storage.sync` 也有容量限制。

**机会**：MVP 先做 JSON 导入/导出和 Chrome Sync 的轻量元数据同步，不建立账号、不上传浏览历史；后续若用户确实需要跨浏览器云同步，再单独设计账号与加密模型。

### 痛点 6：新标签页最怕慢和“被接管后不可预测”

Chrome 官方建议 New Tab 快速、轻量；用户还可能遇到扩展被默认页替换、多个扩展竞争接管、隐身窗口不生效等情况。

**机会**：离线可用的首屏骨架、本地主题资源、网络资源懒加载、加载失败回退、显式显示“本扩展正在接管 New Tab”的设置页，并提供一键恢复默认页的指引。

## 五、产品建议：MVP 与后续版本

### MVP：低权限、可控、可用

**目标**：验证用户是否愿意在每次新标签页中使用“快捷方式 + 轻量自动排序 + 主题配色”。

**建议范围**：

- Manifest V3，使用 `chrome_url_overrides.newtab`。
- 权限仅申请 `storage`；不申请 `history`、`topSites`、`bookmarks`、主机权限。
- 快捷方式：添加、编辑、删除、拖拽排序、固定/取消固定、打开当前页后手动添加。
- 自动排序：只统计扩展内点击；提供“手动排序 / 最近使用 / 高频使用”三种模式；默认不改变固定区。
- 主题：预置浅色/深色/高对比度三套主题，调色板、背景纯色/渐变、本地图片上传；首屏不依赖远程壁纸才能正常工作。
- 轻量搜索：不改 Chrome 默认搜索设置；若提供搜索框，让用户显式选择搜索引擎 URL 模板，并在设置中说明。
- 数据：快捷方式与主题元数据写入 `storage.sync`；点击计数和本地图片引用写入 `storage.local`；提供 JSON 导出、导入、重置。
- 隐私：首次使用页说明“当前只统计本扩展内点击，不读取浏览历史”；设置页提供数据清除和权限状态。
- 质量：首屏本地渲染、网络资源懒加载、无远程 JavaScript、加载失败时仍能打开快捷方式。

### V1：可选的浏览器推荐

- 增加“从 Chrome 最常访问网站生成推荐”开关。
- 用户点击开关时，通过 `chrome.permissions.request()` 请求 `topSites`，在授权前解释权限和数据处理方式。
- 推荐区与固定区分离，允许隐藏、固定和恢复；不要把 `topSites` 返回结果伪装成用户自己添加的快捷方式。
- 推荐结果只使用 API 返回的 URL/标题；不向服务器发送浏览列表。
- 增加推荐反馈：不感兴趣、隐藏域名、恢复全部推荐。

### V2：谨慎验证完整频次模型

只有当 V1 证明用户确实需要“更准确的频次排序”时，再考虑 `history`：

- 使用可选 `history` 权限，必须由用户手势触发并展示具体用途。
- 默认只在本地计算聚合指标，不上传原始 URL；优先保留域名级别或匿名化的统计结果，但不要把“哈希 URL”简单当成天然匿名。
- 设计时间范围，例如最近 7/30 天；提供清除记录、暂停统计、排除域名、隐身不记录。
- 遵守 Chrome 对隐身数据的处理建议：不保存隐身窗口浏览历史。来源：[Protect user privacy — Incognito](https://developer.chrome.com/docs/extensions/develop/security-privacy/user-privacy#saving_data_and_incognito_mode)。
- 在 Chrome Web Store 列表和扩展界面中显著说明：收集什么、为何需要、是否离开设备、如何删除。

### V3：可选的云同步与生态能力

- 如果用户需要跨浏览器同步，再引入账号/服务端；先做快捷方式、主题和布局，默认不上传历史。
- 建立端到端加密或至少服务端加密、删除和导出机制，并将账号、认证、支付等数据与本地导航能力分开。
- 再评估天气、壁纸、favicon、AI 或小组件；每一个外部服务都应有单独的网络请求说明和关闭选项。
- 可做主题包/社区模板，但主题逻辑和扩展执行逻辑应随扩展包发布；远程内容只作为数据或图片资源，不作为远程可执行代码。

## 六、推荐的产品定位

> **一个本地优先、低权限、可解释的 Chrome 导航页：固定你真正重要的站点，把你最近使用的入口放到推荐区，并让每一次自动化都可以关闭、解释和恢复。**

这个定位避开了与 Momentum/Bonjourr/Tabliss 单纯比拼壁纸和小组件，也避开了与 FVD/Speed Dial 2 比拼复杂视觉书签系统；核心差异是：低权限默认可用；“快捷方式”和“自动推荐”明确分层；自动排序不破坏用户的固定布局；不改变默认搜索设置、不塞入默认伙伴入口；先做扩展内行为，再逐级开放 Top Sites/History；本地数据优先、可解释、可导出、可删除。

## 七、主要一手来源索引

### Chrome 官方

- [Override Chrome pages](https://developer.chrome.com/docs/extensions/develop/ui/override-chrome-pages)
- [chrome.topSites API](https://developer.chrome.com/docs/extensions/reference/api/topSites)
- [chrome.history API](https://developer.chrome.com/docs/extensions/reference/api/history)
- [chrome.bookmarks API](https://developer.chrome.com/docs/extensions/reference/api/bookmarks)
- [chrome.storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [chrome.permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions)
- [Permissions list](https://developer.chrome.com/docs/extensions/reference/permissions-list)
- [Protect user privacy](https://developer.chrome.com/docs/extensions/develop/security-privacy/user-privacy)
- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [Chrome Web Store User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/)

### 竞品官方页面与 Chrome Web Store 详情页

- [Momentum CWS](https://chromewebstore.google.com/detail/momentum/laookkfknpbbblfpciffpaejjkokdgca?hl=en) · [Momentum Privacy](https://momentumdash.com/legal/privacy)
- [Infinity New Tab Pro CWS](https://chromewebstore.google.com/detail/infinity-new-tab-pro/nnnkddnnlpamobajfibfdgfnbcnkgngh?hl=en) · [Infinity 官网](https://infinitytab.link/)
- [Bonjourr CWS](https://chromewebstore.google.com/detail/bonjourr-%C2%B7-minimalist-new/dlnejlppicbjfcfedcflplfjajinajd) · [Bonjourr 官网](https://bonjourr.fr/) · [Bonjourr Privacy](https://bonjourr.fr/docs/reference/privacy-policy/)
- [Tabliss CWS](https://chromewebstore.google.com/detail/tabliss-a-beautiful-new-t/hipekcciheckooncpjeljhnekcoolahp) · [Tabliss 官网](https://tabliss.io/) · [Tabliss Privacy](https://tabliss.io/privacy.html)
- [Speed Dial 2 CWS](https://chromewebstore.google.com/detail/speed-dial-2-new-tab/jpfpebmajhhopeonhlcgidhclcccjcik?hl=en) · [Speed Dial 2 官网](https://www.speeddial2.com/) · [Speed Dial 2 Privacy](https://www.speeddial2.com/privacy-policy)
- [FVD Speed Dial CWS](https://chromewebstore.google.com/detail/speed-dial-fvd-new-tab-pa/llaficoajjainaijghjlofdfmbjpebpa?hl=en) · [FVD Privacy](https://everhelper.pro/privacy.php)
- [start.me CWS](https://chromewebstore.google.com/detail/new-tab-page-by-startme/cfmnkhhioonhiehehedmnjibmampjiab) · [start.me Pricing](https://start.me/pricing) · [start.me Privacy](https://start.me/privacy)
- [Mue CWS](https://chromewebstore.google.com/detail/mue/bngmbednanpcfochchhgbkookpiaiaid?hl=en) · [Mue Introduction](https://muetab.com/docs/introduction/) · [Mue Privacy](https://muetab.com/privacy/)
- [Most Visited (Top Sites) CWS](https://chromewebstore.google.com/detail/most-visited-top-sites/obbnkbhoknnlndofpoikddaompgmiioc)
- [New tab page（自动计数型）CWS](https://chromewebstore.google.com/detail/new-tab-page/ndglbjbchiifeadhllmempmkblgafglb)
- [TabMark CWS](https://chromewebstore.google.com/detail/tabmark-your-bookmarks-re/kbljljplfgejfgdfgldadaplppjbpmpi)
