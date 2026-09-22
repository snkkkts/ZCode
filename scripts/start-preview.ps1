param([switch]$NoDialogs)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$repoRoot = Split-Path -Parent $PSScriptRoot
$electronPath = Join-Path $repoRoot 'node_modules\electron\dist\electron.exe'
$logRoot = Join-Path $repoRoot '.run-logs\appearance-launcher'
$buildProcess = $null
$ownsMutex = $false
$mutex = $null

function Find-PreviewProcess {
    $processes = @(Get-CimInstance Win32_Process -Filter "Name = 'electron.exe'" | Where-Object {
        $_.ExecutablePath -eq $electronPath
    })
    $processIds = @($processes | Select-Object -ExpandProperty ProcessId)
    # Agent 也可能使用 Electron 的 Node 运行时；只保留进程树根，避免误认辅助进程。
    @($processes | Where-Object {
        $_.CommandLine -notmatch '\s--type=' -and $processIds -notcontains $_.ParentProcessId
    })
}

function Test-RendererPort {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $connecting = $client.ConnectAsync('127.0.0.1', 5174)
        return ($connecting.Wait(500) -and $client.Connected)
    } catch { return $false }
    finally { $client.Dispose() }
}

function Show-LauncherMessage([string]$message, [bool]$failure = $false) {
    if ($NoDialogs) { Write-Output $message; return }
    $shell = New-Object -ComObject WScript.Shell
    # 错误提示不自动消失，启动提示四秒后关闭；不向用户暴露需要输入的终端。
    $seconds = if ($failure) { 0 } else { 4 }
    $icon = if ($failure) { 16 } else { 64 }
    $null = $shell.Popup($message, $seconds, 'ZCode Preview 开发版', $icon)
}

try {
    New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
    $hash = [System.Security.Cryptography.SHA256]::Create()
    try { $key = ([BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($repoRoot.ToLowerInvariant())))).Replace('-', '') }
    finally { $hash.Dispose() }
    $mutex = [System.Threading.Mutex]::new($false, "Local\ZCodePreview-$key")
    try { $ownsMutex = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $ownsMutex = $true }
    if (-not $ownsMutex) { Show-LauncherMessage 'ZCode Preview 开发版正在启动，请稍候。'; exit 0 }

    $miseText = Get-Content -LiteralPath (Join-Path $repoRoot 'mise.toml') -Encoding UTF8 -Raw
    $nodeVersion = [regex]::Match($miseText, '(?m)^node\s*=\s*"([^"]+)"').Groups[1].Value
    if (-not $nodeVersion) { throw '无法从 mise.toml 读取 Node 版本。' }
    $nodePath = Join-Path (Split-Path -Parent $repoRoot) "toolchains\node-v$nodeVersion-win-x64\node.exe"
    if (-not (Test-Path -LiteralPath $nodePath)) { $nodePath = (Get-Command node.exe -ErrorAction Stop).Source }
    $env:Path = (Split-Path -Parent $nodePath) + ';' + $env:Path
    if ((& $nodePath --version).Trim() -ne "v$nodeVersion") { throw "需要 Node $nodeVersion，请按 docs/appearance/DEVELOPMENT.md 准备工具链。" }
    $null = Get-Command pnpm.cmd -ErrorAction Stop
    if (-not (Test-Path -LiteralPath $electronPath)) { throw '尚未安装开发依赖。请先按开发说明运行 pnpm install --frozen-lockfile。' }
    $runner = Join-Path $repoRoot 'scripts\dev-appearance.mjs'
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    $stdout = Join-Path $logRoot "$stamp.stdout.log"
    $stderr = Join-Path $logRoot "$stamp.stderr.log"
    $running = @(Find-PreviewProcess)
    if ($running.Count -gt 0) {
        if (-not (Test-RendererPort)) { throw '开发版进程存在，但页面服务未就绪；请稍后重试或检查启动日志。' }
        $activation = Start-Process -FilePath $nodePath -ArgumentList @(('"' + $runner + '"'), '--show-existing') -WorkingDirectory $repoRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
        Write-Output "REUSED preview PID=$($running[0].ProcessId); activation PID=$($activation.Id)"
        exit 0
    }
    if (Test-RendererPort) { throw '5174 端口已被占用，但未发现本仓库的开发版窗口。请检查已有开发服务，不要反复启动。' }
    $buildProcess = Start-Process -FilePath $nodePath -ArgumentList ('"' + $runner + '"') -WorkingDirectory $repoRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
    Show-LauncherMessage '正在准备 ZCode Preview 开发版。首次构建可能需要几分钟，就绪后会自动显示窗口。'
    $deadline = [DateTime]::UtcNow.AddMinutes(10)
    while ([DateTime]::UtcNow -lt $deadline) {
        if ($buildProcess.HasExited) { throw "开发进程已退出（$($buildProcess.ExitCode)）。日志：$stderr" }
        $ready = @(Find-PreviewProcess)
        if ($ready.Count -gt 0 -and (Test-RendererPort)) {
            Write-Output "STARTED preview PID=$($ready[0].ProcessId); log=$stdout"
            exit 0
        }
        Start-Sleep -Seconds 2
    }
    # 只结束本次启动的开发进程树，不能按名称关闭其他 Electron 或用户任务。
    if (-not $buildProcess.HasExited) { & "$env:SystemRoot\System32\taskkill.exe" /PID $buildProcess.Id /T /F | Out-Null }
    throw "启动等待超过 10 分钟，已停止本次启动。日志：$stdout"
} catch {
    $message = $_.Exception.Message + "`n`n日志目录：$logRoot"
    Show-LauncherMessage $message $true
    exit 1
} finally {
    if ($ownsMutex) { $mutex.ReleaseMutex() }
    if ($null -ne $mutex) { $mutex.Dispose() }
}
