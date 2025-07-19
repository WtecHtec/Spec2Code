// contents/gemini-automator.ts
import type { PlasmoCSConfig } from "plasmo"

// 配置 Content Script，指定它只在 Gemini 网站上运行
export const config: PlasmoCSConfig = {
  matches: ["https://gemini.google.com/*"]
}

console.log("Gemini Automator content script loaded!");

// 监听来自 Side Panel 或 Background Script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "FILL_AND_SUBMIT") {
    console.log("Received data to fill:", request.data);

    // 核心：查找 Gemini 的输入框和发送按钮
    // 注意：这些选择器可能会因为 Gemini 网站更新而失效，需要定期检查
    const inputElement = document.querySelector('.ql-editor.ql-blank, .ql-editor'); // Gemini 输入框的 CSS 选择器
    const sendButton = document.querySelector('button[aria-label="Send message"]'); // 发送按钮的选择器

    if (inputElement && sendButton) {
      // 模拟用户输入
      const p = inputElement.querySelector('p');
      if (p) {
        p.textContent = request.data
      } else {
        // 备用方案，如果内部结构变化
        (inputElement as HTMLElement).innerText = request.data;
      }

      // 模拟点击发送按钮
      // 注意：需要确保按钮是可点击状态
      setTimeout(() => {
        (sendButton as HTMLButtonElement).click();
        setTimeout(() => {
            sendResponse({ status: "success", data: request.data, title: request.title, mode: "gemini", url: window.location.href });
        }, 1000 * 10);
      }, 1000); // 短暂延迟确保输入事件被处理

    } else {
      console.error("Could not find Gemini input or send button.");
      sendResponse({ status: "error", message: "Elements not found" });
    }
  }
  return true; // 允许异步发送响应
});