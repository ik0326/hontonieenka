// ============================
// 初期設定
// ============================
let settings = {
  title: "Confirmation",
  message: "Are you sure you want to proceed?",
  count: 1,
  selector: "button",
  theme: "default"
};

// クリック済みボタンの管理（無限ループ防止）
let activeHandlers = new WeakSet();

// モーダル要素保持
let modal, backdrop, okBtn, cancelBtn;

// ============================
// 設定を読み込む
// ============================
chrome.storage.sync.get(
  ["title", "message", "count", "selector", "theme"],
  (data) => {
    settings = { ...settings, ...data };
    attachListeners();
  }
);

// 設定変更時も反映
chrome.storage.onChanged.addListener((changes) => {
  for (let key in changes) settings[key] = changes[key].newValue;
});

// ============================
// モーダル生成・スタイル
// ============================
function createModal() {
  if (modal) return; // 再利用

  const container = document.createElement("div");
  container.innerHTML = `
    <div id="bw-modal-backdrop"></div>
    <div id="bw-modal">
      <div id="bw-title"></div>
      <div id="bw-message"></div>
      <div id="bw-progress"></div>
      <div id="bw-buttons">
        <button id="bw-cancel">Cancel</button>
        <button id="bw-ok">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  modal = document.getElementById("bw-modal");
  backdrop = document.getElementById("bw-modal-backdrop");
  okBtn = document.getElementById("bw-ok");
  cancelBtn = document.getElementById("bw-cancel");

  injectStyles();
}

function injectStyles() {
  if (document.getElementById("bw-style")) return;
  const style = document.createElement("style");
  style.id = "bw-style";
  style.textContent = `
    #bw-modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(4px);
      z-index: 999998;
      display: none;
    }
    #bw-modal {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      min-width: 320px;
      background: #ffffff11;
      backdrop-filter: blur(12px);
      border-radius: 12px;
      padding: 20px;
      color: white;
      text-align: center;
      z-index: 999999;
      display: none;
      border: 1px solid rgba(255,255,255,0.2);
    }
    #bw-title { font-size: 1.2rem; margin-bottom: 10px; font-weight: bold; }
    #bw-message { margin-bottom: 10px; font-size: 0.95rem; white-space: pre-wrap; }
    #bw-progress { margin-bottom: 20px; font-size: 0.9rem; color: #aaa; }
    #bw-buttons { display: flex; justify-content: space-between; gap: 12px; }
    #bw-buttons button {
      flex: 1; padding: 8px; font-size: 1rem;
      border-radius: 6px; cursor: pointer; border: none; color: white;
    }
  `;
  document.head.appendChild(style);
}

// ============================
// テーマカラー
// ============================
const themeStyles = {
  default: { ok: "#3b82f6", cancel: "#6b7280" },
  danger: { ok: "#ef4444", cancel: "#6b7280" },
  warning: { ok: "#f59e0b", cancel: "#6b7280" },
  info: { ok: "#0ea5e9", cancel: "#6b7280" }
};

// ============================
// モーダル表示
// ============================
function showModal({ title, message, theme, progress }) {
  return new Promise((resolve) => {
    createModal();

    document.getElementById("bw-title").innerText = title;
    document.getElementById("bw-message").innerText = message;
    document.getElementById("bw-progress").innerText = progress;

    const { ok, cancel } = themeStyles[theme] || themeStyles.default;
    okBtn.style.background = ok;
    cancelBtn.style.background = cancel;

    modal.style.display = "block";
    backdrop.style.display = "block";

    const cleanup = () => {
      modal.style.display = "none";
      backdrop.style.display = "none";
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    okBtn.onclick = () => {
      cleanup();
      resolve(true);
    };
    cancelBtn.onclick = () => {
      cleanup();
      resolve(false);
    };
  });
}

// ============================
// ボタンクリック監視
// ============================
function attachListeners() {
  document.addEventListener("click", handler, true);
}

async function handler(e) {
  const btn = e.target.closest(settings.selector);
  if (!btn) return;

  // モーダル内クリックは無視
  if (e.target.closest("#bw-modal")) return;

  if (activeHandlers.has(btn)) return;
  activeHandlers.add(btn);

  e.preventDefault();
  e.stopImmediatePropagation();

  if (settings.count === 1) {
    // N=1 の場合
    const result = await showModal({
      title: settings.title + " (1/1)",
      message: settings.message,
      theme: settings.theme
    });

    if (result) {
      const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true, view: window });
      btn.removeEventListener("click", handler, false);
      btn.dispatchEvent(clickEvent);
      btn.addEventListener("click", handler, false);
    }
  } else {
    // N>1 の場合
    for (let i = 0; i < settings.count - 1; i++) {
      const displayCount = i + 1;
      const result = await showModal({
        title: `${settings.title} (${displayCount}/${settings.count})`,
        message: settings.message,
        theme: settings.theme
      });

      if (!result) {
        activeHandlers.delete(btn);
        return;
      }
    }

    // 最後のクリック処理
    const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true, view: window });
    btn.removeEventListener("click", handler, false);
    btn.dispatchEvent(clickEvent);
    btn.addEventListener("click", handler, false);
  }

  activeHandlers.delete(btn);
}
