Param(
  [string]$InputTsv = "..\data\cards.tsv",
  [string]$OutputJs = "..\data\data.js"
)
$ErrorActionPreference = "Stop"
if(!(Test-Path $InputTsv)){ throw "TSV not found: $InputTsv" }

# TSV を読み込んで JS 配列を書き出す
$rows = Import-Csv -Path $InputTsv -Delimiter "`t"
$objs = @()
foreach($r in $rows){
  $name = $r.name
  $yomi = $r.yomi
  $cat  = $r.category
  $id   = if([string]::IsNullOrWhiteSpace($r.id)) { "" } else { $r.id }
  $objs += [pscustomobject]@{ name=$name; yomi=$yomi; category=$cat; id=$id }
}
# JSを生成
$head = "window.CELEBS = ["
$tail = "];"
$body = ($objs | ForEach-Object {
  $n = $_.name.Replace("\","\\").Replace("'","\'")
  $y = ($_.yomi  ).Replace("\","\\").Replace("'","\'")
  $c = ($_.category).Replace("\","\\").Replace("'","\'")
  $i = ($_.id     ).Replace("\","\\").Replace("'","\'")
  "{name:'$n', yomi:'$y', category:'$c', id:'$i'}"
}) -join ",`n"
$js = $head + "`n" + $body + "`n" + $tail
Set-Content -Path $OutputJs -Value $js -Encoding UTF8
Write-Host "Generated $OutputJs"
