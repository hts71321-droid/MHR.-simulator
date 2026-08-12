# 狩猟装備台帳 — MHWilds

モンハンワイルズ用の個人ツールです。HTML 1枚で完結していて、ビルドも npm も不要です。

公開URL: https://hts71321-droid.github.io/MHR.-simulator/

## 使い方

`index.html` をブラウザで開くだけです。3つのタブがあります。

| タブ | できること |
| --- | --- |
| アーティア工房 | 武器種と属性からテーブルを判定。復元ボーナスの選択肢・上限、攻撃力/会心率、武器種固有の仕様（弾追加・ビン・砲撃型・旋律）を表示。厳選記録をテーブル別に残せます |
| 未来視テーブル | 巨戟アーティアの再抽選表。武器種を複数選んで横並び、当たりスキルの指定（AND/OR）、Excel貼り付け取り込み、JSON書き出し／読み込み |
| 装備シミュレータ | スキルLvの集計、スロットに応じた装飾品の絞り込み、シリーズ2/4部位・グループ3部位の判定 |

未来視テーブルの内容と当たり条件は、ブラウザの localStorage に自動保存されます（キー: `mhw-artian-v1`）。
別の端末に移すときは「全部書き出す」で JSON を保存して、移動先で「読み込む」を使ってください。

## GitHub Pages で公開する手順

1. このリポジトリの **Settings** → **Pages** を開く
2. **Source** を `Deploy from a branch` にする
3. **Branch** を `main` / `/ (root)` にして **Save**
4. 数分待つと上記のURLで開けるようになります

`index.html` がリポジトリの直下にあるので、追加の設定は要りません。

## 開発するとき

- **1ファイル構成を維持してください。** 分割しないでください
- データ定義（`ARTIAN` / `SERIES_SKILLS` / `GROUP_SKILLS` / `DATA`）とロジックが分かれています。この分離は壊さないでください
- 変更したら構文チェックを通してください:

  ```bash
  node -e "const s=require('fs').readFileSync('index.html','utf8');
    new Function(s.split('<script>')[1].split('</'+'script>')[0]); console.log('OK')"
  ```

詳しい背景・ドメイン知識・未完のタスクは [HANDOFF.md](HANDOFF.md) にまとめてあります。
