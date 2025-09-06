const fakeLike = document.getElementById("fake-like") as HTMLButtonElement;
const invisibleOverlay = document.getElementById("invisible-overlay") as HTMLButtonElement;
const attackOverlay = document.getElementById("attackOverlay") as HTMLInputElement;
const attackFrame = document.getElementById("attackFrame") as HTMLInputElement;
const attackOff = document.getElementById("attackOff") as HTMLInputElement;
const dangerBtn = document.getElementById("danger") as HTMLButtonElement;
const logEl = document.getElementById("log") as HTMLDivElement;
const frameWrap = document.getElementById("frameWrap") as HTMLDivElement;
const attackerCard = document.getElementById("attackerCard") as HTMLDivElement;

// タブ切り替え機能
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach(button => {
  button.addEventListener("click", () => {
    const targetTab = button.getAttribute("data-tab");
    
    // すべてのタブボタンとパネルからactiveクラスを削除
    tabButtons.forEach(btn => btn.classList.remove("active"));
    tabPanels.forEach(panel => panel.classList.remove("active"));
    
    // クリックされたボタンと対応するパネルにactiveクラスを追加
    button.classList.add("active");
    const targetPanel = document.getElementById(targetTab!);
    if (targetPanel) {
      targetPanel.classList.add("active");
    }
    
    // invisible-overlayの制御：デモタブ以外では無効化
    if (targetTab === "demo") {
      updateAttackMode();
    } else {
      attackerCard.classList.remove("hidden");
      invisibleOverlay.style.pointerEvents = "none";
      frameWrap.classList.add("hidden");
    }
  });
});

function log(line: string){
  const now = new Date().toLocaleTimeString();
  logEl.innerHTML = `[${now}] ${line}<br>` + logEl.innerHTML;
}

// 見せかけの「いいね」
fakeLike.addEventListener("click", () => {
  if (attackFrame.checked) {
    // iframe攻撃の場合：いいねを押すとiframe内の危険操作が実行される
    log("👤 ユーザーは『いいね！』を押したつもりですが...");
    setTimeout(() => {
      performDanger("（iframe 内の重ね合わせから）");
    }, 300);
  } else {
    // 攻撃が無効な場合：通常の見かけのログ
    log("ユーザーは『いいね！』を押したつもり（見かけのUI）");
  }
});

// 攻撃方法の更新
function updateAttackMode() {
  if (attackOverlay.checked) {
    // 透明オーバーレイ攻撃
    attackerCard.classList.remove("hidden");
    invisibleOverlay.style.pointerEvents = "auto";
    frameWrap.classList.add("hidden");
    log("🔴 透明オーバーレイ攻撃を有効化");
  } else if (attackFrame.checked) {
    // iframe埋め込み攻撃
    attackerCard.classList.remove("hidden");
    invisibleOverlay.style.pointerEvents = "none";
    frameWrap.classList.remove("hidden");
    log("📺 iframe埋め込み攻撃を有効化");
  } else {
    // 攻撃を無効化：偽UIを隠して正規UIのみ表示
    attackerCard.classList.add("hidden");
    invisibleOverlay.style.pointerEvents = "none";
    frameWrap.classList.add("hidden");
    log("⚫ 攻撃を無効化：正規UIのみ表示");
  }
}

// 攻撃方法切り替え
[attackOverlay, attackFrame, attackOff].forEach(radio => {
  radio.addEventListener("change", updateAttackMode);
});

// 透明オーバーレイ（実際は危険操作へ誘導）
invisibleOverlay.addEventListener("click", () => {
  if (!attackOverlay.checked) return;
  log("👤 ユーザーは『いいね！』を押したつもりですが...");
  setTimeout(() => {
    performDanger("（透過オーバーレイ経由）");
  }, 300);
});

// 正規UIから危険操作
dangerBtn.addEventListener("click", () => {
  performDanger("（正規UIから）");
});

// iframe 内の危険操作ボタン
frameWrap.addEventListener("click", (ev) => {
  const el = ev.target as HTMLElement;
  if (el && el.getAttribute("data-frame") === "danger"){
    performDanger("（iframe 内の重ね合わせから）");
  }
});

// 危険操作（ここではログ表示のみ）
function performDanger(from: string){
  log(`⚠ 秘密情報が『削除』されました ${from}`);
}

// 初期状態: 基礎学習タブがアクティブなのでinvisible-overlayを無効化
invisibleOverlay.style.pointerEvents = "none";

// デモタブがアクティブな場合のみイベントリスナーを有効化
const demoTab = document.getElementById("demo");
if (demoTab && demoTab.classList.contains("active")) {
  updateAttackMode();
}
