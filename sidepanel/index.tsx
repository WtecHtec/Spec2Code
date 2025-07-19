// sidepanel.tsx

import React, { useEffect, useRef, useState } from "react"

import { useStorage } from "@plasmohq/storage/hook"

// 1. 导入 Mantine 组件和样式
import "@mantine/core/styles.css"

import {
  ActionIcon,
  AppShell,
  Button,
  Card,
  createTheme,
  Divider,
  Drawer,
  Group,
  MantineProvider,
  Modal,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title
} from "@mantine/core"
// 2. 导入图标
import {
  IconBackspace,
  IconFile,
  IconHistory,
  IconPlus,
  IconSend,
  IconTrash
} from "@tabler/icons-react"
import toast, { Toaster } from "react-hot-toast"

import dayjs from "dayjs"

import { DEFAULT_TEMPLATE } from "~config"

// 定义历史记录条目的类型
interface HistoryEntry {
  context?: string
  prd?: string
  designDoc?: string
  title: string
  timestamp: string
  mode: string
  url: string
}

// 创建一个基础主题
const theme = createTheme({})

// 用于向 Content Script 发送消息的辅助函数
async function sendDataToAiTab(
  provider: "gemini" | "openai",
  data: string,
  userPrompt: string
) {
  const providerConfig = AI_PROVIDERS[provider]
  if (!providerConfig) {
    console.error("Invalid AI provider selected")
    return
  }
  let targetTab = null

  if (!targetTab) {
    targetTab = await chrome.tabs.create({ url: providerConfig.createUrl })
    // 等待新标签页加载完成
    await new Promise((resolve) => {
      const listener = (tabId, info) => {
        if (info.status === "complete" && tabId === targetTab.id) {
          chrome.tabs.onUpdated.removeListener(listener)
          resolve(true)
        }
      }
      chrome.tabs.onUpdated.addListener(listener)
    })
  } else {
    await chrome.tabs.update(targetTab.id, { active: true })
  }

  // 确保脚本已注入再发送消息
  return new Promise((resolve) => {
    setTimeout(() => {
      chrome.tabs
        .sendMessage(targetTab.id, {
          type: "FILL_AND_SUBMIT",
          data: data,
          title:  userPrompt
        })
        .then((res) => {
          console.log("data::", res)
          resolve(res)
        })
        .catch(() => {
          resolve(null)
        })
    }, 500)
  })
}

const AI_PROVIDERS = {
  gemini: {
    name: "Gemini",
    url: "https://gemini.google.com/*",
    createUrl: "https://gemini.google.com/"
  },
  openai: {
    name: "OpenAI",
    url: "https://chat.openai.com/*",
    createUrl: "https://chat.openai.com/"
  }
}

// 主 UI 组件
function SidePanelContent() {
  //   const [context, setContext] = useStorage<string>("persistent-context", "");
  const [context, setContext] = useState<string>("")
  const [prd, setPrd] = useState("")
  const [designDoc, setDesignDoc] = useState("")
  const [userPrompt, setUserPrompt] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [aiProvider, setAiProvider] = useStorage<"gemini" | "openai">(
    "ai-provider",
    "gemini" // 默认选项
  )

  const [history, setHistory] = useStorage<HistoryEntry[]>(
    "operation-history",
    []
  )
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  // --- 模板 State ---
  const [templates, setTemplates] = useStorage("prompt-templates", [
    DEFAULT_TEMPLATE
  ])
  const [activeTemplateId, setActiveTemplateId] = useStorage<string>(
    "active-template-id",
    DEFAULT_TEMPLATE.id
  )

  // ... 其他业务逻辑函数 (handleFolderSelect, handleSend, restoreFromHistory) 保持不变 ...
  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return
    let allContent = context
    let pending = files.length
    for (const file of files) {
      const reader = new FileReader()
      reader.onload = (e) => {
        allContent += `--- File: ${file.name} ---\n${e.target.result}\n\n`
        pending--
        if (pending === 0) {
          fileInputRef.current.value = ""
          setContext(allContent)
        }
      }
      reader.onerror = () => {
        console.error(`Error reading file: ${file.name}`)
        pending--
        if (pending === 0) {
          fileInputRef.current.value = ""
          setContext(allContent)
        }
      }
      reader.readAsText(file)
    }
  }
  const handleSend = async () => {
    if (
      !context?.trim() &&
      !prd?.trim() &&
      !designDoc?.trim() &&
      !userPrompt?.trim()
    ) {
      toast.error("请输入至少一项内容后再发送。")
      return
    }
    // 功能 3: 使用模板生成 fullPrompt
    const activeTemplate =
      templates.find((t) => t.id === activeTemplateId) || DEFAULT_TEMPLATE
    const fullPrompt = activeTemplate.content
      .replace(/\$\{context\}/g, context)
      .replace(/\$\{prd\}/g, prd)
      .replace(/\$\{designDoc\}/g, designDoc)
      .replace(/\$\{userPrompt\}/g, userPrompt)

    console.log("Sending data...", fullPrompt)
    const res = (await sendDataToAiTab(
      aiProvider,
      fullPrompt,
      userPrompt
    )) as any
    if (res) {
      const { url, title: userPrompt, data, mode } = res
      let title = data?.substring(0, 10)
      if (userPrompt) {
        title = userPrompt?.substring(0, 10)
      }
      setHistory(( per ) => [ {
        title,
        timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        mode,
        url,
      }, ...per].slice(0, 50) as any[])
    }
  }
  const restoreFromHistory = (entry: HistoryEntry) => {
    /* ... */
    window.open(entry.url, "_blank")
  }

  useEffect(() => {
    const messageListener = (request, sender, sendResponse) => {
      if (request.type === "UPDATE_FROM_CONTEXT_MENU") {
        if (request.field === "prd") {
          setPrd(request.data)
        } else if (request.field === "designDoc") {
          setDesignDoc(request.data)
        }
      }
    }
    chrome.runtime.onMessage.addListener(messageListener)
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [])

  return (
    <>
      <AppShell header={{ height: 60 }} padding="md">
        <AppShell.Header>
          <Group justify="space-between" h="100%" px="md">
            {/* <Title order={3}>Gemini Copilot</Title> */}
            <SegmentedControl
              value={aiProvider}
              onChange={(value: "gemini" | "openai") => setAiProvider(value)}
              data={[
                { label: "Gemini Copilot", value: "gemini" },
                { label: "OpenAI Copilot", value: "openai" }
              ]}
            />
            <Group>
              <Select
                data={templates.map((t) => ({ value: t.id, label: t.name }))}
                value={activeTemplateId}
                onChange={(value) => setActiveTemplateId(value)}
              />
              <ActionIcon
                variant="default"
                size="lg"
                onClick={() => setIsHistoryOpen(true)}
                title="查看历史记录">
                <IconHistory style={{ width: "70%", height: "70%" }} />
              </ActionIcon>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Main>
          <Stack gap="lg">
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Card.Section withBorder inheritPadding py="xs">
                <Group justify="space-between">
                  <Text fw={500}>资源&规范(CONTEXT)</Text>
                  <Group gap="xs">
                    <ActionIcon
                      variant="default"
                      size="sm"
                      title="清除"
                      onClick={() => setContext("")}>
                      <IconBackspace style={{ width: "70%" }} />
                    </ActionIcon>
                    <ActionIcon
                      variant="default"
                      onClick={() => fileInputRef.current?.click()}>
                      <IconFile />
                    </ActionIcon>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      multiple
                      onChange={handleFolderSelect}
                    />
                  </Group>
                </Group>
              </Card.Section>
              <Textarea
                mt="md"
                placeholder="在此输入上下文，或选择文件"
                autosize
                minRows={4}
                maxRows={4}
                value={context}
                onChange={(e) => setContext(e.currentTarget.value)}
              />
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between">
                <Text fw={500}>需求 (PRD)</Text>
                <ActionIcon
                  variant="default"
                  size="sm"
                  title="清除"
                  onClick={() => setPrd("")}>
                  <IconBackspace style={{ width: "70%" }} />
                </ActionIcon>
              </Group>
              <Textarea
                mt="sm"
                autosize
                minRows={4}
                maxRows={4}
                value={prd}
                onChange={(e) => setPrd(e.currentTarget.value)}
              />
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between">
                <Text fw={500}>接口设计 (API)</Text>
                <ActionIcon
                  variant="default"
                  size="sm"
                  title="清除"
                  onClick={() => setDesignDoc("")}>
                  <IconBackspace style={{ width: "70%" }} />
                </ActionIcon>
              </Group>
              <Textarea
                mt="sm"
                autosize
                minRows={4}
                maxRows={4}
                value={designDoc}
                onChange={(e) => setDesignDoc(e.currentTarget.value)}
              />
            </Card>

            <Divider my="xs" label="客户任务(TASK)" labelPosition="center" />

            <Textarea
              autosize
              minRows={3}
              maxRows={3}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.currentTarget.value)}
            />

            <Button
              fullWidth
              size="lg"
              leftSection={<IconSend size={18} />}
              onClick={handleSend}>
              发送到 {AI_PROVIDERS[aiProvider].name}
            </Button>
            <Divider my="xs" label="配置" labelPosition="center" />
            {/* 功能 3: 模板选择器 */}
            <Button
              variant="default"
              onClick={() => {
                chrome.runtime.openOptionsPage()
              }}>
              管理模板
            </Button>
          </Stack>
        </AppShell.Main>

        <Drawer
          opened={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          title="操作历史"
          position="right">
          <ScrollArea h="calc(100vh - 60px)">
            {history?.length > 0 ? (
              <Stack>
                {history?.map((entry, index) => (
                  <Card
                    withBorder
                    key={index}
                    p="sm"
                    radius="md"
                    component="button"
                    onClick={() => restoreFromHistory(entry)}
                    style={{ textAlign: "left", width: "100%" }}>
                    <Text truncate fw={500}>
                      {entry.title || "无提示词"}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {entry.timestamp}
                    </Text>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" ta="center">
                暂无历史记录
              </Text>
            )}
          </ScrollArea>
        </Drawer>
      </AppShell>
    </>
  )
}

// 这是包装器组件，用于提供 Mantine 的上下文
const SidePanel = () => {
  return (
    <>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <Toaster position="top-right" />
        <SidePanelContent />
      </MantineProvider>
    </>
  )
}

export default SidePanel
