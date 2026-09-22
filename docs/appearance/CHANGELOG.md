# 变更与交接记录

按日期倒序记录，每次可交付变更新增一条。实现尚未完成时明确标记，不能以计划代替完成记录。

## 2026-09-22 — 整理主题系统并建立 Git 交接基线

- 目标：将此前已完成的主题、配置代码、公式与开发启动功能统一整理为可接手的本地 Git 提交。
- 文档修正：明确 JSON 缺省字段保持原值、空字符串清除颜色覆盖；纠正“终端跟随自定义正文配色”的旧说明；基础阶段 spec 链接到后续扩展，不再把已实现的导入导出列为未完成。
- 编码：为两个 Windows 启动器补充精确的 Git 换行属性；工作区保留 UTF-8 BOM 与 CRLF，索引规范化为文本，避免首次暂存时将 CRLF 误报为尾随空白。
- 归档：将仓库外的 7 套无图片预设复制到 `docs/appearance/presets`，原文件保留。新增 `STATUS.md`，集中说明已实现能力、验证边界和下一阶段优先项。
- 范围：归档现有源码、测试、规格和启动脚本；不纳入依赖、构建输出、日志、截图、用户配置或桌面快捷方式二进制。本轮不新增产品行为。
- 本机验证：Node 24.14.0；完整类型、格式和架构检查通过；lint 0 错误、70 个存量警告；14/14 单元场景、两组 Edge E2E 与 7 套预设校验全部通过。文档链接与提交范围检查通过。
- 提交：本条随主题系统基线提交保存，提交号以 Git 历史为准；本轮仅提交本地，不推送远端。此前条目保留各自记录时的状态。

## 2026-09-22 — Windows 桌面一键启动开发版

- 问题：开发版每次需要手动输入启动命令，不方便日常使用。
- 方案：提供桌面 `ZCode Preview 开发版.lnk`，指向源码仓库的 Windows 启动包装器；开发阶段不重打包安装 exe。
- 修改：新增 `scripts/start-preview.ps1` 和 `scripts/install-preview-shortcut.ps1`；`scripts/dev-appearance.mjs` 增加复用既有环境的 `--show-existing` 模式。没有改动其他 agent 的主题、代码编辑框或数学渲染功能。
- 行为：选择项目固定 Node、检查依赖、互斥防止重复启动、识别本仓库 Electron 主进程树、已运行则唤回、冷启动则复用原构建链。控制台隐藏，错误输出独立写日志；等待上限 10 分钟，仅超时结束本次启动的进程树。
- 创建：桌面快捷方式名含“开发版”，使用仓库图标，不覆盖安装版入口；创建脚本可重复运行，拒绝覆盖不属于本项目的同名入口。
- 验证：两个 PowerShell 文件语法解析通过；快捷方式目标/工作目录/图标正确；冷启动显示 `ZCode Preview` 窗口，实际双击入口后保留原主进程 PID 70800；启动期间重复执行被互斥拦截。类型检查通过，lint 0 错误/70 存量警告，架构检查 0 新违规。
- 数据：继续使用已有开发实例的配置，包括用户已经设置的自定义数据路径，不复制或清空配置。
- 文档：新增 `desktop-shortcut.spec.md`，更新 `DEVELOPMENT.md`；新 PowerShell 文件使用带 BOM 的 UTF-8，兼容 Windows PowerShell 5 中文读取。
- 限制：仍依赖当前源码、依赖包与 Node 工具链；首次启动需要构建时间。超时和失败处理有边界，但未人为注入 10 分钟超时；主进程修改后仍需退出并重启开发版。
- 发布：未打包、未提交、未推送。

## 2026-09-22 — 配置代码框：显示当前配置、实时编辑、合并导入

- 目标 / 问题：用户反馈代码框导入后变空，改一项要粘贴完整配置；整体替换还会在漏写 `backgroundImage` 时清除已设置的背景。要求能实时改某一项，且不替换已设置的背景。
- 原因：原设计代码框只持有空的草稿，导入语义是“以默认值为底整体替换”，缺省字段（含背景图片）都会恢复默认。
- 设计变更（已与需求对齐，更新 `transfer.spec.md`）：
  - 代码框始终显示当前配置，省略背景图片 data URL；编辑中（dirty）不被外部变化覆盖，失焦且无错误时回到当前配置视图。
  - 停止输入 0.5 秒自动应用，另有“立即应用”按钮；失焦时立即应用尚未触发的修改。
  - 导入改为合并：以应用时刻的已接受配置为底，写出的字段覆盖；颜色逐键合并，`""` 删除覆盖；`version` 可省略。严格校验规则不变。
  - 导出复制含背景图片的完整配置，代码框不变；剪贴板失败时放入代码框供手动复制。
- 修改文件：
  - `packages/ui/src/lib/appearanceTransfer.ts`：`parseAppearanceCode` 替换为 `parseAppearancePatch(code, base)`；新增 `serializeAppearanceEditorCode`。
  - `packages/ui/src/settings/AppearanceCodeTransfer.tsx`：重写为显示当前配置的实时编辑框，沿用请求序号失效机制，并以应用时刻配置为合并底。
  - `packages/ui/src/i18n/locales/{zh-CN,en-US}.ts`：帮助、按钮（“立即应用”）与状态文案。
  - `packages/ui/test/appearanceTransfer.test.ts`：旧用例改为以默认配置为底；`{}` 现为合法空补丁；新增合并、删除颜色、保留背景、编辑视图往返用例。
  - `packages/ui/test/appearanceTransfer.e2e.mjs`：按新行为重写。
  - 文档：`transfer.spec.md`、`CONFIGURATION.md`、`DEVELOPMENT.md`、`GOALS.md`。
- 验证（云端 `872ad96` + 本机改动快照，Node 22.22.2）：
  - `pnpm typecheck` 通过；`pnpm lint` 0 错误、70 警告（与改动前相同）；`pnpm architecture:check --changed` 0 违规；`pnpm fmt:check` 仅既有的 `isolation.spec.md`。
  - 相关单元测试 14/14 通过。
  - `appearanceTransfer.e2e.mjs`、`appearance.e2e.mjs` 均 PASS（Linux Chromium；临时副本替换 Edge 启动参数，仓库脚本未改）。覆盖：打开即显示配置、单项实时应用、片段合并、保留背景、跨窗口修改不覆盖编辑中的草稿、`""` 删除颜色、错误提示与草稿保留、立即应用、导出含背景、剪贴板拒绝、图片解码期间的过期请求失效、保存失败、刷新保持、窄屏。已检查设置页截图。
- 兼容性：旧的完整配置仍可直接粘贴应用；差别是未写出的字段不再恢复默认。需要完全替换时先“恢复默认”。
- 限制：未在完整桌面工作区与 Windows 上实测；剪贴板失败时放入代码框的完整配置在失焦后会回到普通视图，需在失焦前复制。
- 提交：未提交、未推送。

## 2026-09-22 — 公式颜色/加粗/字号设置与 `$f'$` 行内公式修复

- 目标 / 问题：用户截图中 LaTeX 公式与正文同色，无法统一调整颜色和粗细；`$f'$` 原样显示美元符号。
- 调查结论：LaTeX 可用 `\color`、`\boldsymbol` 修改单个公式，但全局统一需外观配置；`$f'$` 由 `isLikelySingleDollarMath` 不识别撇号导致（已用单元测试复现后修复）。
- 修改内容：
  - `appearanceSettings.ts`：新增颜色键 `math`（外观层私有变量 `--appearance-math-color`）、`mathBold`、`mathScale`（80–160，默认 121）。
  - `appearanceEnvironment.ts`：偏离默认时投影 `--appearance-math-weight`、`--appearance-math-size`，投影前移除。
  - `appearanceTransfer.ts`：`mathScale` 纳入有损归一化检查，`mathBold` 必须为布尔值。
  - `appearance.css`：新增 `:root .katex` 规则，压过后导入的 `katex.min.css` 的 `font` 简写。
  - `CustomAppearanceSettings.tsx`：复用现有 `Switch` 增加“公式加粗”，新增“公式字号”滑块；“公式颜色”由颜色键自动生成。
  - 中英文文案：公式相关 4 条；导入导出帮助提到公式样式。
  - `message.tsx`：`$...$` 预处理纯函数原样移到新文件 `lib/messageSingleDollarMath.ts`（逐行比对确认仅新增修复规则），修复“单字母 + 1~3 个撇号”判定。
  - 测试：新增 `messageSingleDollarMath.test.ts`；`appearanceSettings.test.ts`、`appearanceTransfer.test.ts` 补公式场景；`appearance.e2e.mjs` 检查 `.katex` 计算样式（颜色、字号、字重）、刷新保持与恢复默认。
  - 文档：新增 `math.spec.md`；更新 `CONFIGURATION.md`、`DEVELOPMENT.md`、`GOALS.md`。
- 验证（云端 `872ad96` + 本机改动快照，Node 22.22.2，低于 `mise.toml` 的 24.14.0）：
  - `pnpm typecheck` 通过；`pnpm lint` 0 错误、70 警告（与改动前相同）；`pnpm architecture:check --changed` 0 违规。
  - `pnpm fmt:check`：仅既有的 `isolation.spec.md` 格式问题，未改该文件。
  - 外观与公式相关单元测试全部通过。`nonCliAcpRetirement.test.ts` 在未改动的基线上也因 `@/lib` 别名解析失败，与本次无关。
  - 两个 E2E 在 5199 预览页 PASS（Linux Chromium，临时副本替换了 Edge 启动参数，仓库脚本未改）；检查了设置页截图。
- 限制 / 未完成：未在完整桌面工作区用真实对话验证公式渲染；未在 Windows 重新运行。公式字重只有常规/粗体两档。
- 配套：7 套预设补充 `math` 颜色（对背景与卡片对比度 ≥ 4.5）及 `mathBold: false`、`mathScale: 121`，通过本版校验。
- 提交：未提交、未推送。

## 2026-09-22 — 扩展配色（链接、行内代码、主按钮）与代码字体

- 目标 / 问题：用户导入预设后反馈“感觉没改什么”。对截图取色确认背景 `#efebd4`、卡片与输入框 `#fffbef`、界面字体均已生效；未变化的是链接蓝、行内代码底色、主按钮、代码字体和语法高亮，它们来自主题 CSS，原配置无法覆盖。
- 修改内容：
  - `appearanceSettings.ts`：颜色键新增 `link`、`inlineCode`、`primary`、`primaryText`，分别覆盖已有变量 `--color-icon-blue`、`--color-markdown-inline-code`、`--color-primary`、`--color-primary-foreground`；新增 `codeFontFamily`，与界面字体共用同一校验函数。仍为 `version: 1`，旧配置照常可用。
  - `appearanceEnvironment.ts`：投影 `--font-mono`，用户字体置于主题原等宽栈之前（保留中文回退）；投影前先移除，重复投影不叠加，恢复默认可完整清除。
  - `appearanceTransfer.ts`：导入时 `codeFontFamily` 与 `fontFamily` 一样拒绝有损归一化。
  - `CustomAppearanceSettings.tsx`：界面字体与代码字体共用同一输入逻辑；新颜色项由颜色键自动生成。
  - 中英文文案：四个颜色名、“代码字体”及说明；更新字体与导入导出帮助文字。
  - 测试：`appearanceSettings.test.ts`、`appearanceTransfer.test.ts` 新增扩展字段场景；`appearance.e2e.mjs` 新增代码字体、链接颜色的设置、刷新保持与恢复默认检查。
  - 文档：新增 `extended-tokens.spec.md`；更新 `CONFIGURATION.md`（字段与颜色键作用位置表）、`DEVELOPMENT.md`、`GOALS.md`。
- 设计取舍：不新增 CSS 变量，只覆盖已有语义变量，减少与上游主题的冲突。`--color-icon-blue` 在源码中仅用于对话链接与文件链接，符合 DESIGN.md 中该变量的链接角色，因此没有另建 `--color-link`。语法高亮是整套主题，本批不做。
- 状态所有者与时序：不变，仍由 ZCode store 的 `appearanceSettings` 唯一持有，先持久化再接受、投影与广播。
- 验证（在云端克隆的 `872ad96` + 本机改动快照上执行，Node 22.22.2，低于 `mise.toml` 要求的 24.14.0）：
  - `pnpm typecheck`：通过。
  - `pnpm lint`：0 错误，70 个警告，与改动前相同。
  - `pnpm fmt:check`：仅 `docs/appearance/isolation.spec.md` 有格式问题，改动前已存在，未改该文件。
  - `pnpm architecture:check --changed`：0 违规，0 新增。
  - `tsx --test` 运行外观两个单元测试文件与桌面隔离测试：9/9 通过。
  - `appearance.e2e.mjs`、`appearanceTransfer.e2e.mjs`：在 5199 预览页均输出 PASS。浏览器用的是 Linux Chromium，不是脚本默认的 Edge（临时副本改了启动参数，仓库脚本未改）。
  - 预览页探针：导入含新字段的配置后，`bg-primary` 按钮背景与文字、`font-mono` 字体栈、`--color-icon-blue` 均为配置值；已检查设置页截图。
- 限制 / 未完成：未在完整登录后的桌面工作区实测对话中的链接、行内代码和代码块效果；未在 Windows 上重新运行。语法高亮、弹出菜单背景和终端配色仍不可配置。新导出的配置含新字段，旧版本导入会报未知字段。
- 配套：`F:\Zcode-dev\theme-presets` 中 7 套预设已补上新颜色与 `codeFontFamily`，并通过本版 `parseAppearanceCode` 校验。
- 下一步：在开发实例导入预设做视觉验收；再评估语法高亮主题映射与聊天独立字体。
- 提交：未提交、未推送。

## 2026-09-22 — 明确启动 Preview 源码实例与窗口身份

- 用户纠正：需要打开当前开发的 ZCode Preview，而不是安装目录里的程序。
- 操作：从 `F:\Zcode-dev\ZCode` 执行隔离的 `pnpm dev:appearance`，确认构建使用 preview flavor；没有替换安装版。
- 修改：`packages/desktop/vite.config.ts` 根据既有 product flavor 设置主 HTML 标题，Preview 显示 `ZCode Preview`，正式版保持 `ZCode`；其他独立页面标题不变。`scripts/dev-appearance.mjs` 的应用名改为 `ZCode Preview Dev`，下次启动生效。
- 原因：主 HTML 原来固定写着 ZCode，仅看窗口标题无法判断是否 Preview，造成混淆。
- 规格：已更新 `isolation.spec.md` 的身份显示规则；验证页面标题与本地开发实例对应。
- 发布：本地未提交、未推送；安装版未修改。

## 2026-09-22 — 配置代码导入导出与安装版启动恢复

- 需求：在外观设置通过 JSON 代码字段一键导入导出；恢复无法显示窗口的安装版。
- 功能：新增代码框、导出并复制、导入配置；包含本机自定义背景图片、透明度、界面字体和浅深色配色。支持合法部分字段，缺省项恢复默认；不更改应用主题模式、字号或代码高亮。
- 规则：严格检查版本、字段名、类型、数值范围、颜色和图片；图片先解码再提交。错误输入、损坏图片和保存失败保留原配置。导出遇到剪贴板拒绝时仍保留代码供手动复制。
- 状态与协作：继续通过现有 appearance setter 写入；草稿不成为第二份已接受状态。导入与选图使用失效序号，旧异步结果不能覆盖较新操作。
- 修改文件：新增 `appearanceTransfer.ts`、`AppearanceCodeTransfer.tsx`、单元与 E2E 测试；修改 `appearanceBackground.ts`（共享且限时的图片解码）、`CustomAppearanceSettings.tsx`（挂载入口）、中英文文案和项目文档。
- 启动恢复证据：安装版原主进程 PID 62268 隐藏在托盘，重复启动没有可见窗口；其 exe 与 app.asar 未改动。用户明确允许重启后，普通 taskkill 被 Windows 拒绝，通过 UAC 管理员操作结束指定进程树，重新启动后 PID 49868 出现标题为 ZCode 的可响应窗口，Computer Use 再次确认窗口存在；随后窗口再次关闭到托盘，使用安装路径唤起后返回同一个窗口句柄，复测可重新打开。
- 启动处理边界：只重启了已确认的 ZCode 进程树，没有删除配置、聊天或缓存；未找到足以确认永久源码级根因的证据，不把这次恢复描述成已修复所有启动问题。
- 验证：完整类型检查通过；lint 0 错误、70 个存量警告；架构检查 0 新违规；7 个针对性单元场景通过。新增导入导出 E2E 通过，覆盖往返、图片携带、错误拒绝、刷新恢复、剪贴板失败、存储失败及窄屏；检查了 1100px 与 390px 截图。原有外观 E2E 也执行回归。
- 文档：新增 `transfer.spec.md` 和 `CONFIGURATION.md`；更新总目标、开发说明和本记录。
- 发布状态：改动仅在 Fork 源码与开发预览中，未重打包或替换安装版，未提交或推送。
- 下一步：完整工作区覆盖、更多字体选项和主题方案库；用户可先在开发预览中试用 JSON 代码导入导出。

## 2026-09-22 — 第一批基础外观功能与隔离开发入口

- 目标：让背景、透明度、界面字体和核心颜色可通过设置修改、持久化与恢复，并建立可交接的开发与验证流程。
- 实现：本地 PNG/JPEG/WebP 图片（最多 2 MiB）、图片填充/模糊/遮罩、面板与侧栏不透明度、界面字体、浅深色独立的九项颜色覆盖、一键恢复默认、中英文文案。
- 状态：复用 ZCode store 与广播服务。新增版本化校验、保存失败保留旧值、图片异步结果失效保护；字体输入提交后与归一化或保存失败的实际值保持一致。终端配色与代码高亮保持独立。
- 维护：迁入目标和 spec，接入根 AGENTS；抽离外观状态及广播字段以满足 400 行 lint 门禁；新增模块地图与启动说明。
- 隔离修正：早期 bootstrap 现在遵循既有 `ZCODE_DESKTOP_HOME_DIR`；新增可选禁用系统集成开关及 `pnpm dev:appearance`，普通启动默认行为不变。
- 涉及文件：见 [DEVELOPMENT.md](DEVELOPMENT.md) 模块地图；另包括桌面三个系统集成入口、早期 bootstrap、根 `package.json`、测试与文档。
- 验证：5 个针对性单元场景通过；组件 E2E 覆盖图片成功/损坏/超限、透明度、字体、浅深色及系统主题、刷新恢复、模拟存储失败、跨窗口接收不回环、窄屏与重置。检查了桌面和窄屏截图。
- 检查：`pnpm typecheck` 通过；`pnpm lint` 通过（存量 70 个警告，0 错误）；架构检查无新增违规。最终格式和检查结果以本轮最后执行记录为准。
- 桌面：完整 main/host/preload/Agent 构建成功，独立实例显示登录页；未输入用户账号。第二次启动前后，真实设置摘要和相关系统注册项一致。
- 异常记录：一次 E2E 与完整构建同时运行时点击超时，停止构建后复测通过。第一次桌面启动隔离失败并触发真实设置写入与协议/右键菜单注册；已停止进程并修正后续入口，未声称恢复无法核实的原始内容，详见开发说明。
- 未完成：完整业务工作区与 Electron RPC 多窗口实测、聊天独立字体/行距、方案导入导出、细节状态及特殊组件适配、窗口透出桌面和发行打包。
- 下一步：在实际工作区补齐覆盖矩阵，再进入下一批功能；按本记录和 spec 分工，避免直接修改原安装包。
- 提交：尚未提交或推送；分支 `feat/appearance-system`。

## 2026-09-22 — 建立总目标与 agent 协作规范

- 目标 / 问题：明确高度可定制外观系统的功能范围，解决需求、进度和验证信息难以由其他 agent 接手的问题。
- 修改内容：新增总目标文档、agent 阅读入口和变更记录；定义阶段验收、日常开发预览方式及逐次交付记录要求。
- 涉及文件：`GOALS.md`、`AGENTS.md`、`CHANGELOG.md`。
- 实现结果：形成文档层面的需求与交接基线；未实现任何软件外观功能。
- 验证：以 UTF-8 回读新文件并检查三个文档相互引用的目标存在；未运行应用构建或功能测试，因为本次仅新增文档。
- 限制：当前目录为安装目录；官方源码与本机版本的对应关系、热更新行为、构建环境尚未实测。建议项与用户明确要求已在目标文档中区分。
- 下一步：建立独立源码工作区，读取仓库规范，记录源码基线，调查现有主题与设置模块并跑通开发模式。
- 提交：无；当前目录不是 Git 仓库。

## 后续记录模板

### YYYY-MM-DD — 变更标题

- 目标 / 问题：
- 修改内容：
- 涉及文件：
- 实现结果：
- 验证命令 / 方法及结果：
- 限制 / 未完成项：
- 下一步 / 交接事项：
- 提交（如有）：
