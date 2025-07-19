// contents/openai-automator.ts

import type { PlasmoCSConfig } from "plasmo"

// 1. 配置此脚本只在 chat.openai.com 网站上运行
export const config: PlasmoCSConfig = {
  matches: ["https://chat.openai.com/*", "https://chatgpt.com/*"]
}

console.log("OpenAI Automator content script loaded!")

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "FILL_AND_SUBMIT") {
    console.log("Received data for OpenAI:", request.data)

    // 2. 查找 OpenAI 的输入框和发送按钮
    // 注意：这些选择器可能会因为网站更新而失效
    const textArea = document.querySelector(
      "#prompt-textarea"
    ) as HTMLTextAreaElement
    

    if (textArea) {
      const p = textArea.querySelector("p")
      if (p) {
        p.textContent = request.data
      } else {
        // 备用方案，如果内部结构变化
        ;(textArea as HTMLElement).innerText = request.data
      }
      // 3. 模拟用户输入
      textArea.value = request.data?.data
      textArea.dispatchEvent(new Event("input", { bubbles: true })) // 触发 input 事件，告知 React 状态已更新
      textArea.focus()

      // 等待一小段时间，确保输入后发送按钮变为可用状态
      setTimeout(() => {
        const sendButton = document.querySelector(
            'button[data-testid="send-button"]'
          ) as HTMLButtonElement
        sendButton.click()
        setTimeout( () => {
            sendResponse({ status: "success", data: request.data, title: request.title, mode: "gemini", url: window.location.href })
        }, 1000 * 10)
       
      }, 1000)
    } else {
      console.error("Could not find OpenAI textarea or send button.")
      if (!textArea) console.error("Textarea not found!")
        const sendButton = document.querySelector(
            'button[data-testid="send-button"]'
          ) as HTMLButtonElement
      if (!sendButton) console.error("Send button not found!")
      sendResponse({ status: "error", message: "Elements not found" })
    }
  }
  return true // 允许异步发送响应
})
