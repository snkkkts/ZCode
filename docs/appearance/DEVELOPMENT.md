# 开发、验证与交接

## 工作区与入口

- 工作区：`F:\Zcode-dev\ZCode`。
- 分支：`feat/appearance-system`。
- 起始提交：`872ad960de7ec172591f7e1952f7849229f94521`，版本 `3.14.0`；包版本相同不代表与安装包逐文件一致。
- Fork：`https://github.com/snkkkts/ZCode.git`。当前没有推送或创建 PR。
- 本次可接手基线：[STATUS.md](STATUS.md)；可导入预设：[presets/README.md](presets/README.md)。
- 文档顺序：`GOALS.md` → `phase-1.spec.md` → `extended-tokens.spec.md` → `math.spec.md` → `transfer.spec.md` → `isolation.spec.md` → `CHANGELOG.md`。

## 双击启动（Windows）

本机桌面已创建 **ZCode Preview 开发版** 快捷方式，双击即可。它引用当前源码工作区，不是另一个安装包。

- 未运行时自动选择项目 Node 工具链、执行原有开发启动流程；初次构建可能需要几分钟。
- 已运行时复用同一开发窗口，不再次构建；连续双击时不会并发启动。
- 启动不需要输入命令，控制台隐藏。失败会提示日志位置：`.run-logs/appearance-launcher/`。
- 仍使用 `dev-appearance.mjs` 的现有数据配置；若用户已在开发版中自定义数据路径，继续遵循该配置。
- 源码与 Node 工具链仍是运行依赖，不要删除开发目录。移动仓库后重新运行快捷方式创建脚本。

需要重建桌面入口时，在仓库根运行一次：

```powershell
powershell -NoProfile -File scripts/install-preview-shortcut.ps1
```

`scripts/start-preview.ps1` 是 Windows 入口包装器，`dev-appearance.mjs --show-existing` 是内部复用模式；环境变量仍集中在后者。包装器不修改系统执行策略或全局 Node。退出开发版后可再次双击启动；主进程代码变动仍需重启实例。

## 启动桌面开发实例

依赖按锁文件安装，使用 Node 24.14.0、pnpm 10.33.2。本机为项目单独下载了 Node，未修改系统 Node 配置。

```powershell
Set-Location F:\Zcode-dev\ZCode
$env:Path = 'F:\Zcode-dev\toolchains\node-v24.14.0-win-x64;' + $env:Path
pnpm dev:appearance
```

其他机器使用符合 `mise.toml` 的 Node 与 pnpm，执行 `pnpm install --frozen-lockfile` 后运行 `pnpm dev:appearance`。

新增入口使用 `.zcode-runtime/appearance-dev` 内的独立业务目录、设置目录、Electron 缓存与 session，并禁用协议和系统菜单注册。不要将日常账号数据复制进测试目录。这里的隔离仅指本地数据与系统集成，不表示应用完全离线；后端环境沿用 `dev:desktop:test`。

首次启动会准备本地搜索工具、构建 Agent 与 Electron main/host/preload。界面经 Vite 热更新；主进程源码虽由 tsup 监听重建，已有 `scripts/dev.mjs` 不负责自动重启正在运行的 Electron，需要重启开发命令。日常 UI 改动不需要打包安装 `.exe`。

完整桌面已验证到独立登录页；本次没有输入账号或 API key，未验证登录后的完整业务工作区。外观操作通过以下真实组件集成页验证。

## 无账号的外观组件集成页

```powershell
pnpm exec vite --config packages/ui/test/appearance-preview/vite.config.ts
```

访问 `http://127.0.0.1:5199/`。页面加载正式的外观设置组件、Zustand store、主题样式和窗口外壳；通过测试用 BroadcastChannel 代替桌面 RPC 广播传输，不连接业务后端。它用于功能检查，不是完整产品页面或最终布局。

```powershell
pnpm exec tsx --test packages/ui/test/appearanceSettings.test.ts packages/ui/test/appearanceTransfer.test.ts packages/ui/test/messageSingleDollarMath.test.ts packages/desktop/test/desktopDevelopmentIsolation.test.ts
node packages/ui/test/appearance.e2e.mjs
node packages/ui/test/appearanceTransfer.e2e.mjs
pnpm typecheck
pnpm lint
pnpm architecture:check --changed
```

E2E 需要本机 Edge（或把脚本中的 `channel: "msedge"` 换成本机 Chromium 的 `executablePath`）和正在运行的 5199 测试页，使用无界面的独立浏览器上下文。测试有 150 秒总保护时限，截图保存到 `.run-logs/appearance/`，产物不入 Git。将完整桌面首次构建与浏览器 E2E 分开执行，避免资源竞争；一次并行运行发生点击超时，停止构建后相同场景通过。

## 模块地图与责任

| 文件                                                       | 责任                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| `packages/ui/src/lib/appearanceSettings.ts`                | 版本化配置、默认值、数值/字体/颜色/图片数据校验        |
| `packages/ui/src/lib/appearanceEnvironment.ts`             | 本地持久化和 CSS 变量投影；明确返回保存失败            |
| `packages/ui/src/lib/appearanceBackground.ts`              | 图片类型、大小检查和浏览器解码                         |
| `packages/ui/src/store/appearanceState.ts`                 | 外观配置 setter，先保存成功再接受状态                  |
| `packages/ui/src/store/index.ts`                           | 原有全局 store 接入、主题变更、现有广播回环保护        |
| `packages/ui/src/store/broadcastFields.ts`                 | 跨窗口广播字段声明，避免 store 超过行数门禁            |
| `packages/ui/src/settings/CustomAppearanceSettings.tsx`    | 设置交互、导入请求失效控制、错误反馈                   |
| `packages/ui/src/settingsCodePreview.tsx`                  | 原有外观页面挂载点                                     |
| `packages/ui/src/appearance.css`                           | 外壳装饰背景层；`.katex` 公式颜色/字重/字号覆盖        |
| `packages/ui/src/lib/messageSingleDollarMath.ts`           | 对话 `$...$` 行内公式判定与转义（从 message.tsx 抽出） |
| `packages/ui/src/i18n/locales/{zh-CN,en-US}.ts`            | 中英文设置文案                                         |
| `packages/desktop/src/main/desktopDevelopmentIsolation.ts` | 早期设置路径规则与禁用系统集成开关                     |
| `scripts/dev-appearance.mjs`                               | 独立开发实例启动参数                                   |

不要新增第二份已接受外观状态。第一版图片 data URL 存于 `zcode-appearance-v1`（最大 2 MiB）；进一步支持大图片时，应先设计资产存储与广播引用协议，不直接放宽 localStorage 限制。

## 当前已知边界

- 字体控制界面无衬线栈与代码等宽栈（`codeFontFamily`）；聊天独立字体、独立行距尚未实现，终端字体仍由终端设置管理。
- 颜色覆盖共 14 项，含链接、行内代码底色、主按钮与主按钮文字、公式颜色；公式另有加粗与字号设置；语法高亮、弹出菜单背景与终端配色尚未开放。
- 颜色覆盖按浅深色分开保存，主面板与侧栏透明度是全局偏好。
- 卡片、弹窗、输入框不随面板一起降低透明度；设置页可保持清晰。
- 保留代码高亮和终端现有配色；更完整的终端、Diff、独立窗口适配属于下一阶段。
- 已提供 JSON 代码框：显示当前配置、实时编辑、按字段合并应用、导出含背景的完整配置，见 `CONFIGURATION.md` 与 `transfer.spec.md`。尚无主题方案库、窗口透出桌面或任意 CSS。
- 跨窗口沿用现有广播机制，完整配置最后到达者覆盖；没有新建 Web 跨标签页同步机制。集成测试验证了接收路径与无回环，不等于实测 Electron RPC 传输。
- 多窗口共享配置、移动端和全部业务页面仍需在完整工作区补充验收；本次截图覆盖隔离组件页的 1280px 和 390px 布局。

## 启动隔离事件记录

首次直接使用 `ZCODE_DATA_BASE_DIR + pnpm dev:desktop:test` 时，既有早期 bootstrap 读取真实 home 的设置，重新指向安装版数据目录。日志确认该次进程触发了真实设置文件写入、`zcode` 协议注册和 Explorer 菜单注册。发现后终止了本次启动的进程树。

没有启动前快照，不能还原或宣称未改动原始设置、注册项；没有猜测性覆盖或删除用户数据。随后修正早期 home 规则并增加隔离入口。第二次启动前后，对真实设置文件摘要与相关注册项做了比较，均未变化。该验证证明新入口隔离有效，不表示第一次启动造成的注册变化已回滚。

后续若处理首次启动的注册变化，先检查当前目标和安装版实际注册规则，明确变更范围，不凭猜测覆盖用户偏好。
