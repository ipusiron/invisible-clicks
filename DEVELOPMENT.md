# 開発メモ

## 開発中の興味深い発見 🐛

開発中に、皮肉にも**クリックジャッキングを説明するデモツール自体がクリックジャッキング状態**になっていることを発見しました。デモ用の`invisible-overlay`要素が他のタブでも有効になっており、アコーディオンの操作を妨げていました。この問題は、タブ切り替え時に適切にオーバーレイを制御することで解決されました。

これは、セキュリティツールの開発において「自分自身が説明している脆弱性を持ってしまう」という教訓的な事例として記録しています。

## 技術メモ：アコーディオン実装の落とし穴 📝

アコーディオンの`<details>`要素で「開くが閉じない」問題が発生しました。原因は以下の通りです：

### 問題
- アコーディオンが開いた際、`.accordion-content`が`<summary>`要素のクリック領域に物理的に重なる
- 結果として`<summary>`要素がクリック不可能になり、アコーディオンを閉じられない

### 解決策
```css
/* summary要素を最上位レイヤーに確実に配置 */
.accordion summary { z-index: 101; pointer-events: auto; }
.accordion[open] summary { position: sticky; z-index: 102; }

/* コンテンツを下位レイヤーに配置 */
.accordion-content { z-index: 99; position: relative; }
```

### 教訓
HTMLの`<details>`要素はシンプルに見えて、CSS設計によっては予期しない動作をする。特にz-indexとposition設定でレイヤー構造を明確に分離することが重要。

## その他の技術的発見

### タブシステムとオーバーレイ制御
タブ切り替え機能の実装において、デモタブ以外では`invisible-overlay`要素を無効化する仕組みが必要でした：

```typescript
if (targetTab === "demo") {
  invisibleOverlay.style.pointerEvents = toggleOverlay.checked ? "auto" : "none";
} else {
  invisibleOverlay.style.pointerEvents = "none";
}
```

### セキュリティ配慮
GitHub Pages公開に際して、教材内の危険なURL例やスクリプト例を`[REDACTED]`に置換し、実際の攻撃に利用されないよう配慮しました。