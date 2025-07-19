// 当点击插件图标时，打开 Side Panel
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ tabId: tab.id })
})



// 1. 右键菜单功能
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "prd-from-selection",
      title: "将选中内容作为 PRD",
      contexts: ["selection"] // 只在用户选中文本时出现
    });
  
    chrome.contextMenus.create({
      id: "design-doc-from-selection",
      title: "将选中内容作为设计文档",
      contexts: ["selection"]
    });
  });
  
  // 监听右键菜单点击事件
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    // 当右键菜单被点击时，打开侧边栏
    chrome.sidePanel.open({ windowId: tab.windowId });
  
    // 并发送消息给 Side Panel 更新内容
    // 注意：Side Panel 需要监听这些消息
    if (info.menuItemId === "prd-from-selection") {
      chrome.runtime.sendMessage({
        type: "UPDATE_FROM_CONTEXT_MENU",
        field: "prd",
        data: info.selectionText
      });
    } else if (info.menuItemId === "design-doc-from-selection") {
      chrome.runtime.sendMessage({
        type: "UPDATE_FROM_CONTEXT_MENU",
        field: "designDoc",
        data: info.selectionText
      });
    }
  });
  
