$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $PSScriptRoot 'start-preview.ps1'
$desktop = [Environment]::GetFolderPath('Desktop')
$linkPath = Join-Path $desktop 'ZCode Preview 开发版.lnk'
$shell = New-Object -ComObject WScript.Shell
if (Test-Path -LiteralPath $linkPath) {
    $existing = $shell.CreateShortcut($linkPath)
    if (-not $existing.Arguments.Contains($launcher)) { throw '同名快捷方式不属于本项目，未覆盖。' }
}
$shortcut = $shell.CreateShortcut($linkPath)
$shortcut.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$shortcut.Arguments = '-NoProfile -WindowStyle Hidden -File "' + $launcher + '"'
$shortcut.WorkingDirectory = $repoRoot
$shortcut.IconLocation = (Join-Path $repoRoot 'packages\desktop\build\icon.ico') + ',0'
$shortcut.Description = '启动当前源码的 ZCode Preview 开发版，使用独立数据目录'
$shortcut.Save()
Write-Output $linkPath
