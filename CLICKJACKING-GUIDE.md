# クリックジャッキング攻撃 - 技術解説ガイド

## 🎯 クリックジャッキングとは

**クリックジャッキング**は、見えている操作と実際にクリックを受ける対象を食い違わせ、ユーザーの意図しない操作へ誘導する攻撃です。
典型的なiframe方式では、攻撃者の見せたい画面の上に、被害サイトを読み込んだ透明なiframeを重ねます。
ユーザーには下の画面が見えますが、クリックは上のiframeへ届きます。

成立には、対象ページを埋め込めること、操作対象をクリック位置へ合わせられること、対象側で操作を実行できることなどの条件があります。
認証が必要な操作では、埋め込まれたページに有効なログイン状態が引き継がれるかも関係します。
iframeがあるだけで攻撃が成立するわけではありません。

### Invisible Clicksで観察できる範囲

本ツールは同じHTML文書内の要素を使う模式デモです。
透明オーバーレイではクリック領域の重なりを観察できますが、「iframe埋め込み（模式デモ）」にも本物のiframeは使いません。
外部サイトの読込、実データの削除、カメラやマイクの利用許可要求は行わず、結果はログにだけ表示します。

別オリジンの制約、認証Cookie、埋め込み防御ヘッダーの成否は、このデモでは検証できません。
画面の300msの遅延とその取り消しも学習用の演出で、実際に成立した操作を元に戻す機能ではありません。

## 🔬 攻撃手法の詳細

### 1. 古典的クリックジャッキング

次は重なり方を説明する概念コードです。
`example.invalid`は説明用のURLで、実在サイトへの攻撃手順ではありません。
この断片だけでiframe内のボタンの位置が合うとは限りません。

```html
<!-- 攻撃者の画面に見立てた概念例 -->
<div class="attack-container">
  <button class="fake-button">無料プレゼントを受け取る</button>
  <iframe
    title="重なり方を説明するための例"
    src="https://victim.example.invalid/account"
    class="transparent-frame">
  </iframe>
</div>
```

```css
.attack-container {
  position: relative;
}

.transparent-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  z-index: 2;
}
```

`opacity: 0`は要素を見えなくしますが、クリック対象から外しません。
iframeの中の文書と親ページは別の文書です。
攻撃者が親ページから別オリジンの中身を自由に読めなくても、配置でクリックを誘導できる場合があります。
成立条件と演習は[PortSwiggerのクリックジャッキング解説](https://portswigger.net/web-security/clickjacking)を参照してください。

### 2. ライクジャッキング

ライクジャッキングは、SNSなどの「いいね」を意図せず押させるクリックジャッキングです。
別の操作に見せたUIの上へ、本当に押させたい対象を重ねます。
本ツールでは見かけのボタンに「いいね」を使いますが、SNSへ接続せず、SNS上の「いいね」も変更しません。

```css
.transparent-target {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: auto;
}
```

このCSSは透明なクリック対象の概念例です。
`z-index`は同じ重なり順の文脈で評価されるため、大きな値を指定すれば別のiframeやブラウザーのUIより前に出られる、という意味ではありません。

### 3. カーソルジャッキング

カーソルジャッキングは、カーソルの見かけの位置などを偽装し、クリック先を誤認させる手法です。
本ツールにカーソルを偽装する操作はありません。
次は偽のカーソル画像そのものがクリックを受けないようにするCSSの断片です。

```css
.fake-cursor {
  position: absolute;
  pointer-events: none;
}
```

この指定だけではカーソル位置の偽装は完成せず、実際のクリック位置も移動しません。

### 4. 2段階操作とDoubleClickjackingの区別

同じボタンを2回押して処理を進めるコードは、2段階操作の概念例です。
別ウィンドウへクリック先を切り替えるDoubleClickjackingの再現ではありません。
DoubleClickjackingはiframeを使わない場合があるため、iframeへの埋め込み制限だけで防げるとは説明できません。
手法と対策の範囲は[OWASPのDoubleClickjacking解説](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html#defending-against-doubleclickjacking)を参照してください。

### 5. カメラやマイクに関する説明の条件

Webページ内の要素と、ブラウザーやOSが出す許可画面は別のものです。
`getUserMedia()`によるカメラやマイクの利用には、secure context、利用者の許可、iframeの場合はPermissions Policyなどの条件があります。
「透明なWeb要素を重ねれば、どのブラウザーでもカメラやマイクを許可させられる」とは言えません。
詳細は[MDNのgetUserMediaのプライバシーとセキュリティ要件](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#privacy_and_security)を参照してください。

## 🛡️ 防御策の詳細

### 1. HTTPレスポンスヘッダーによる埋め込み制限

`frame-ancestors`は「どの親ページから自分を埋め込めるか」を指定します。
次は、どこからも埋め込ませない場合の設定例です。

```http
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
```

同一オリジンからの埋め込みだけを許可するなら、方針をそろえて次のように設定します。
上の禁止例と同時に並べるのではなく、必要な方針を選びます。

```http
Content-Security-Policy: frame-ancestors 'self'
X-Frame-Options: SAMEORIGIN
```

特定の別オリジンも許可する場合は、CSPの`frame-ancestors`に許可するオリジンを列挙します。
設定例は埋め込み制限の部分だけなので、既存CSPをこの断片で置き換えず、`script-src`などの必要な設定を保持して統合してください。
X-Frame-Optionsの`ALLOW-FROM`は廃止された指定で、現行ブラウザー向けの設定例には使いません。
強制適用する`frame-ancestors`に対応したブラウザーでは、このディレクティブがX-Frame-Optionsより優先されます。

**`frame-ancestors`とX-Frame-OptionsはHTTPレスポンスヘッダーで設定します。**
HTMLのmetaに書いても埋め込み制限にはなりません。
サーバーや配信基盤で設定し、ブラウザーのNetworkパネルで対象HTMLの実際のレスポンスヘッダーを確認してください。
根拠：[MDN frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)、[MDN X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options)。

#### frame-srcとの違い

`frame-src`は、自分のページが「どの子iframeを読み込めるか」を指定します。
親を制限する`frame-ancestors`とは逆方向です。
本ツールのmeta CSPが外部読込を制限しても、他のページから本ツールが埋め込まれることまで禁止したとは判断できません。

### 2. SameSite Cookieの役割

セッションCookieの`SameSite=Lax`や`SameSite=Strict`は、クロスサイトのiframe要求へCookieを送らないため、認証状態を必要とする攻撃を制限できます。
ただし、ページの埋め込み自体を禁止する設定ではありません。
同一サイトで別オリジンのページや、認証が不要な操作まで一律に守るものではなく、埋め込み制限と使い分けます。
根拠：[OWASPのSameSite Cookieによる防御](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html#defending-with-samesite-cookies)。

### 3. CSRF対策との違い

CSRFトークンは、正当な要求に必要な値を検証するためのものです。
クリックジャッキングで埋め込まれた正規ページのフォームを押させる場合、そのページにある有効なトークンも送られ得ます。
**CSRFトークンだけでは、正規UIを使った意図しない操作への誘導を防げません。**
CSRF対策を省くという意味ではなく、埋め込み制限とは別の役割として実装します。
根拠：[PortSwiggerのCSRFトークンとクリックジャッキングの説明](https://portswigger.net/web-security/clickjacking)。

### 4. フレーム脱出コードの限界

Frame Bustingは、フレーム内のページが親ウィンドウへ遷移しようとする補助策です。
次は仕組みの説明用であり、推奨する単独の防御実装ではありません。

```javascript
if (window.top !== window.self) {
  // 親ウィンドウへの遷移が許可されるとは限らない。
  window.top.location = window.self.location;
}
```

JavaScriptが動かなければ実行されず、sandboxやブラウザーのナビゲーション制限によって遷移を阻止される場合もあります。
`top !== self`でわかるのはフレーム内であることだけで、悪意ある埋め込みの証明にはなりません。
詳細は[OWASPのフレーム脱出コードの限界](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html#insecure-non-working-scripts-do-not-use)を参照してください。

### 5. 確認画面と重要操作の認可

確認画面は、操作内容をユーザーへ示すための補助策です。
単にボタンを増やすだけでなく、実行する操作や対象を示し、必要な再認証と認可をサーバー側で検証します。
本ツールは認証処理を持たず、パスワードの入力も求めません。

```javascript
function confirmDemoAction() {
  if (!window.confirm('この模擬操作を続けますか？')) {
    return false;
  }
  // 本物の処理では、続いてサーバー側の認可が必要。
  return true;
}
```

ブラウザーは状況によって`confirm()`を表示しないことがあり、sandboxの設定も関係します。
`true`の結果を得た場合だけ処理へ進め、ダイアログが必ず表示されることや出所を見分けられることを前提にしません。
根拠：[OWASPのwindow.confirmの位置づけ](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html#windowconfirm-protection)、[WHATWGのSimple dialogs](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#simple-dialogs)。

ボタンの色や大きな`z-index`も、親ページによるiframe全体の透明化を解除しません。
見やすいUIは必要ですが、埋め込み防御の代わりにはなりません。

### 6. 実装チェックリスト

| 対策 | 確認すること | 守る範囲と限界 |
|---|---|---|
| CSP frame-ancestors | 対象HTMLのHTTPレスポンスに意図した方針があること | 許可する親オリジンを制限。metaでは無効 |
| X-Frame-Options | DENYまたはSAMEORIGINを必要な方針に合わせること | 埋め込み制限の補完。ALLOW-FROMは使わない |
| SameSite Cookie | 認証Cookieの属性と必要なサイト間連携 | クロスサイトiframeでの認証Cookie送信を制限。埋め込み禁止ではない |
| CSRF対策 | サーバー側で正当なトークンなどを検証すること | CSRFへの対策。有効なフォームへのクリック誘導は別問題 |
| 重要操作の認可 | 操作内容の確認と必要な再認証をサーバーで検証すること | クライアント側の確認ボタンだけでは代替不可 |
| フレーム脱出と確認ダイアログ | 実行できない場合の挙動を含めて確認すること | 補助策。HTTPヘッダーによる埋め込み制限の代替にはしない |

## 🔍 ブラウザーでの観察方法

許可された対象で、次の点を観察します。
目視だけで安全性を証明するものではありません。

1. 開発者ツールのElementsパネルでiframeとクリック対象を確認
2. Stylesパネルで`opacity`、`pointer-events`、位置、重なり順を確認
3. Networkパネルで対象HTMLのレスポンスヘッダーを確認
4. Consoleの実行対象フレームを確認してから`window.top === window.self`を評価

透明な要素を列挙するコードも、調査の手がかりにとどまります。
正当なUIにも透明要素があり、別オリジンのiframe内部を親のスクリプトから自由に走査することもできません。
次の例は現在の文書だけを調べ、攻撃の有無を判定しません。

```javascript
function inspectCurrentDocument() {
  const observations = [];
  if (window.top !== window.self) {
    observations.push('現在の文書はフレーム内にあります');
  }
  for (const element of document.querySelectorAll('*')) {
    const style = window.getComputedStyle(element);
    if (Number.parseFloat(style.opacity) < 0.1 &&
        style.pointerEvents !== 'none') {
      observations.push('透明で、pointer-eventsがnoneではない要素があります');
    }
  }
  return observations;
}
```

## 📚 参考資料

- [OWASP Clickjacking Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)
- [MDN X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options)
- [MDN CSP frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)
- [MDN iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)
- [PortSwigger Web Security Academyのクリックジャッキング教材](https://portswigger.net/web-security/learning-paths/clickjacking)
