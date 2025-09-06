# クリックジャッキング攻撃 - 技術解説ガイド

## 🎯 クリックジャッキングとは

クリックジャッキング（Clickjacking）は、Webサイトのユーザーインターフェイスを悪用する攻撃手法です。攻撃者は透明または不透明なレイヤーを使用して、ユーザーが意図しない操作を実行させます。

### 攻撃の基本原理

1. **透明なレイヤーの重ね合わせ**: CSSのz-indexやopacityを悪用
2. **視覚的欺瞞**: ユーザーには無害なUIが見える
3. **意図しないクリック**: 実際には危険な操作が実行される

## 🔬 攻撃手法の詳細

### 1. 古典的クリックジャッキング（Classic Clickjacking）

透明なiframeを使用した最も基本的な攻撃手法：

```html
<!-- 攻撃者のページ -->
<div class="attack-container">
  <!-- 偽のコンテンツ -->
  <button class="fake-button">無料プレゼントを受け取る</button>
  
  <!-- 透明なiframe（被害サイト） -->
  <iframe 
    src="https://victim-site.com/delete-account"
    style="
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      z-index: 2;
    ">
  </iframe>
</div>
```

### 2. ライクジャッキング（Likejacking）

SNSの「いいね」ボタンを悪用した攻撃：

```css
.malicious-overlay {
  position: absolute;
  z-index: 999;
  opacity: 0.0001; /* ほぼ透明だがクリック可能 */
  width: 100px;
  height: 30px;
  cursor: pointer;
}
```

### 3. カーソルジャッキング（Cursorjacking）

マウスカーソルの位置を偽装する攻撃：

```css
.fake-cursor {
  position: absolute;
  pointer-events: none;
  z-index: 9999;
  /* カーソル画像の表示 */
}

.real-clickable-area {
  opacity: 0;
  position: absolute;
  /* 実際のクリック領域 */
}
```

## 🛡️ 防御策の詳細

### 1. HTTPヘッダーによる防御

#### X-Frame-Options
```http
X-Frame-Options: DENY
X-Frame-Options: SAMEORIGIN
X-Frame-Options: ALLOW-FROM https://trusted-site.com
```

#### Content Security Policy (CSP)
```http
Content-Security-Policy: frame-ancestors 'none'
Content-Security-Policy: frame-ancestors 'self'
Content-Security-Policy: frame-ancestors https://trusted-site.com
```

### 2. JavaScriptによるFrame Busting

```javascript
// 基本的なFrame Busting
if (top !== self) {
  top.location = self.location;
}

// より堅牢な実装
(function() {
  if (top !== self) {
    try {
      if (top.location.hostname !== self.location.hostname) {
        throw new Error('Clickjacking detected');
      }
    } catch (e) {
      top.location = self.location;
    }
  }
})();
```

### 3. UI/UX レベルでの対策

#### 確認ダイアログの実装
```javascript
function criticalAction() {
  const confirmation = confirm(
    '重要な操作を実行しようとしています。本当に続行しますか？'
  );
  
  if (!confirmation) {
    return false;
  }
  
  // 追加の認証を要求
  const password = prompt('パスワードを入力してください：');
  return validatePassword(password);
}
```

#### CSRFトークンの活用
```html
<form method="POST" action="/delete-account">
  <input type="hidden" name="csrf_token" value="abc123xyz">
  <input type="hidden" name="confirmation" value="DELETE_ACCOUNT">
  <button type="submit" onclick="return criticalAction()">
    アカウントを削除
  </button>
</form>
```

### 4. 実装チェックリスト

| 優先度 | 対策項目 | 技術的実装 | 効果 |
|--------|----------|------------|------|
| ⭐⭐⭐ | X-Frame-Options | `X-Frame-Options: DENY` | 高 |
| ⭐⭐⭐ | CSP frame-ancestors | `frame-ancestors 'none'` | 高 |
| ⭐⭐ | 重要操作の再認証 | パスワード再入力、2FA | 中 |
| ⭐⭐ | CSRFトークン | フォームトークン検証 | 中 |
| ⭐ | Frame Busting | JavaScript検出 | 低 |
| ⭐ | UI強化 | 確認ダイアログ | 低 |

## ⚠️ 注意事項

### Frame Bustingの限界
- JavaScriptが無効な環境では機能しない
- サンドボックス化されたiframeでは動作が制限される
- 巧妙な回避手法が存在する

### 過信は禁物
```javascript
// 回避可能なFrame Busting例
if (top !== self) {
  // この処理は攻撃者によってブロックされる可能性がある
  top.location = self.location;
}
```

### 多層防御の重要性
単一の対策に依存せず、複数の防御策を組み合わせることが重要です：

1. **サーバーサイド**: HTTPヘッダーの設定
2. **クライアントサイド**: JavaScript検出
3. **UI/UX**: ユーザー確認の強化
4. **運用**: 定期的な脆弱性検査

## 🔍 攻撃の検出方法

### ブラウザーの開発者ツールでの確認
1. F12で開発者ツールを開く
2. Elementsタブで怪しいiframe要素を探す
3. Stylesタブでopacityやz-indexの値を確認
4. Consoleで`top === self`を実行

### 自動検出スクリプト
```javascript
function detectClickjacking() {
  const warnings = [];
  
  // iframe内での実行チェック
  if (top !== self) {
    warnings.push('このページはiframe内で実行されています');
  }
  
  // 透明要素の検出
  const elements = document.querySelectorAll('*');
  elements.forEach(el => {
    const style = window.getComputedStyle(el);
    if (parseFloat(style.opacity) < 0.1 && 
        style.pointerEvents !== 'none') {
      warnings.push('透明なクリック可能要素が検出されました');
    }
  });
  
  return warnings;
}
```

## 📚 参考資料

- [OWASP Clickjacking Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)
- [MDN - X-Frame-Options](https://developer.mozilla.org/docs/Web/HTTP/Headers/X-Frame-Options)
- [MDN - CSP frame-ancestors](https://developer.mozilla.org/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors)