# jp-celebs-cards

日本の芸能人を暗記するためのローカル学習ツール。  
- \index.html\: 単一ファイルのフロントエンド  
- \data/cards.tsv\: 名簿（タブ区切り）  
- \	ools/*.ps1\: ビルド＆画像取得＆公開スクリプト  

> 画像は既定ではリポジトリに含めません（\images/\は .gitignore）。  
> 必要なら Git LFS で追跡してください（\	ools/publish_github.ps1 -IncludeImages\）。

## 画像が表示されない問題の解決策（inline loader + filename map）

このサイトでは「カードの id と実ファイル名（拡張子違い・ゼロ埋め差など）」が一致しないことで
`画像なし` になるケースがあります。  
**対策**として、次の2点を導入しています。

1. `images/` をスキャンして `data/attr_map.json` を自動生成（`{ id: "ファイル名" }` の辞書）  
2. `index.html` に **画像ローダのインラインパッチ** を自動挿入  
   - まず `data/attr_map.json` を読み込む  
   - 表示したい **id** が来たら `map[id]` でファイル名を取得して `#face` に表示  
   - map に無ければ `id.jpg → id.png` の順で HEAD で存在確認（フォールバック）  
   - `#noimg` の表示/非表示を自動切替  
   - 強制キャッシュバスト `?v=<timestamp>`

> パッチは `<!-- images patch: loader + map -->` というマーカー付きで注入され、
> 二重挿入されないようになっています（idempotent）。

### 使い方（フロー）

1. **スクリプトを実行**（下の「ターミナル一発実行」の章を参照）
   - `images/` から `data/attr_map.json` を再生成  
   - `index.html` にローダを注入（未挿入のときだけ）  
   - 変更があれば `commit & push`  
   - 公開サイトでランダムサンプルを HEAD=200 で検証
2. ページ側の **「現在のカード id」をローダへ伝える** ために、どちらかを呼ぶ
   - 方式A（イベント）：  
     `document.dispatchEvent(new CustomEvent('cards:show', { detail:{ id } }))`
   - 方式B（属性監視）：  
     `document.body.setAttribute('data-id', id)`
3. 以降はカード切替のたびにローダが自動で画像を解決して表示します。


### 前提/前置き

- 画像は `images/` に置く（`.jpg` / `.png` 対応）
- GitHub Pages は `https://<user>.github.io/<repo>/` で公開
- 画像を LFS 管理にしていない（LFS のままでも動くが HEAD 200 の検証で注意）

### 動作確認のしかた

- コンソールにて（任意）：  
  `document.dispatchEvent(new CustomEvent('cards:show',{detail:{id:'0001'}}))`
- または：  
  `document.body.setAttribute('data-id','0001')`

### ロールバック

- `index.html` はバックアップ `index.html.bak-YYYYMMDDhhmmss` を作ってから上書きします。
- 何かあればそのバックアップで戻せます。
