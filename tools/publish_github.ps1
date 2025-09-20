Param(
  [Parameter(Mandatory=$true)][string]$RepoOwner,
  [string]$RepoName = "jp-celebs-cards",
  [switch]$Private,
  [switch]$IncludeImages
)
$ErrorActionPreference = "Stop"

function Ensure-Tool($name){
  if(-not (Get-Command $name -ErrorAction SilentlyContinue)){ throw "$name が見つかりません" }
}

# ルートへ移動
$root = Join-Path $env:USERPROFILE 'Downloads\jp-celebs-cards'
Set-Location $root

Ensure-Tool git
git --version | Out-Null

# .gitignore を安全デフォルトで
$baseIgnore = @"
data/data.js
logs/
*.log
.DS_Store
"@
if(-not (Test-Path .gitignore)){ $baseIgnore | Set-Content .gitignore -Encoding UTF8 }
if($IncludeImages){
  # 画像を含める場合は ignore から除外
  (Get-Content .gitignore) | Where-Object {$_ -ne 'images/'} | Set-Content .gitignore -Encoding UTF8
} else {
  if(-not (Select-String -Path .gitignore -Pattern '^images/$' -SimpleMatch -ErrorAction SilentlyContinue)){
    Add-Content .gitignore 'images/' -Encoding UTF8
  }
}

# README / LICENSE を用意（なければ）
if(-not (Test-Path README.md)){
@"
# jp-celebs-cards
ローカルで芸能人暗記カードを作るツール。  
- \`index.html\`（フロント）
- \`data/cards.tsv\`（名簿・タブ区切り）
- \`tools/*.ps1\`（ビルド/画像取得/公開）

> 画像は既定で公開しません（\`images/\`を .gitignore）。公開したい場合は Git LFS を使ってください。
"@ | Set-Content README.md -Encoding UTF8
}
if(-not (Test-Path LICENSE)){
@"
MIT License

Copyright (c) $(Get-Date -Format yyyy)
"@ | Set-Content LICENSE -Encoding UTF8
}

# Git 初期化
if(-not (Test-Path .git)){ git init | Out-Null }

# LFS（必要時）
if($IncludeImages){
  if(Get-Command git -ErrorAction SilentlyContinue){
    try{
      git lfs install | Out-Null
      git lfs track "images/*" | Out-Null
    }catch{ Write-Warning "git-lfs の初期化に失敗: $($_.Exception.Message)" }
  }
}

# すべてステージ（.gitignore が効く）
git add -A

# 変更があるときだけコミット
if(git status --porcelain){
  git commit -m "publish: base app & scripts" | Out-Null
}

git branch -M main

# リモート設定（gh があれば自動作成）
$remoteUrl = "https://github.com/$RepoOwner/$RepoName.git"
$hasOrigin = (git remote) -contains 'origin'
if(-not $hasOrigin){
  if(Get-Command gh -ErrorAction SilentlyContinue){
    try{
      gh auth status 2>$null | Out-Null
      gh repo view "$RepoOwner/$RepoName" 2>$null | Out-Null
      if($LASTEXITCODE -ne 0){
        $vis = if($Private){ "--private" } else { "--public" }
        gh repo create "$RepoOwner/$RepoName" $vis --source "." --remote origin --push | Out-Null
        Write-Host "✅ GitHubに作成＆初回push完了: $remoteUrl"
        exit 0
      } else {
        git remote add origin $remoteUrl
      }
    }catch{
      git remote add origin $remoteUrl
    }
  } else {
    git remote add origin $remoteUrl
  }
}

git push -u origin main
Write-Host "✅ push 完了: $remoteUrl"
