# 开发实例隔离补充规格

背景：首次桌面冒烟启动中，早期 bootstrap 从真实用户目录读取 `dataBaseDir`，覆盖了启动时提供的 `ZCODE_DATA_BASE_DIR`；设置服务本身已支持 `ZCODE_DESKTOP_HOME_DIR`，但早期 bootstrap 未遵循。开发进程已停止。

目标：为本项目提供显式、可重复的隔离开发入口，不修改系统 HOME、系统 Node 或正式版数据配置。

- 新入口 `pnpm dev:appearance` 为子进程设置独立的 `ZCODE_DESKTOP_HOME_DIR`、`ZCODE_DATA_BASE_DIR`、Electron userData 和 sessionData。
- 早期 bootstrap 的默认读取路径尊重现有 `ZCODE_DESKTOP_HOME_DIR`，与设置服务一致；未设置时保持原行为。
- 可选 `ZCODE_DESKTOP_DISABLE_SHELL_INTEGRATION=1` 禁止注册 URL 协议、Explorer 右键菜单和 Finder 服务；默认行为不变。隔离入口开启该开关。
- 首次启动使用独立空配置，不迁移真实用户设置。测试环境与生产环境的服务选择仍由原有开发命令负责。
- 本次首次启动已发生设置文件写入和系统集成注册，原始内容未预先快照，不能声称已逐字恢复；不猜测覆盖用户设置。该事实须在交接记录说明。

验收：路径解析单测覆盖显式 home 与默认 home；隔离入口创建的目录均位于仓库 `.zcode-runtime/appearance-dev`；启动日志中的 crash、设置与工作区路径应位于隔离目录；启动前后相关 Windows 注册表键一致。

模块：`desktop`；环境参数是唯一输入，路径选择不引入新的持久状态。操作系统注册入口统一判断 opt-in 开关。

## Preview 身份显示

源码开发实例与安装版必须明确区分。renderer HTML 标题随现有构建期 product flavor 显示：Preview 为 `ZCode Preview`，正式版保持 `ZCode`；资源管理器和权限面板的独立标题不改动。隔离开发入口的应用名明确为 `ZCode Preview Dev`。验收以开发进程路径、构建身份及实际页面标题为准，不仅看 exe 名称。
