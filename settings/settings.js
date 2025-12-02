document.getElementById("save").addEventListener("click", () => {
  chrome.storage.sync.set({
    title: document.getElementById("title").value || "Confirmation",
    message: document.getElementById("message").value || "Are you sure you want to continue?",
    count: Number(document.getElementById("count").value) || 1,
    selector: document.getElementById("selector").value || "button",
    theme: document.getElementById("theme").value || "default"
  }, () => {
    alert("Settings saved!");
  });
});

// 初期値を読み込む
chrome.storage.sync.get(
  ["title", "message", "count", "selector", "theme"],
  (data) => {
    document.getElementById("title").value = data.title || "Confirmation";
    document.getElementById("message").value = data.message || "Are you sure?";
    document.getElementById("count").value = data.count || 1;
    document.getElementById("selector").value = data.selector || "button";
    document.getElementById("theme").value = data.theme || "default";
  }
);
