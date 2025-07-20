// sidepanel.tsx (最终完整版)

import { useLiveQuery } from "dexie-react-hooks"
import React, { useEffect, useRef, useState } from "react"
import toast, { Toaster } from "react-hot-toast"

import { useStorage } from "@plasmohq/storage/hook"

// 数据库服务和类型定义
import { db, populateDefaultTemplate } from "../lib/db"
// Mantine UI 框架和图标库
import "@mantine/core/styles.css"

import {
  ActionIcon,
  AppShell,
  Badge,
  Button,
  Card,
  createTheme,
  Divider,
  Drawer,
  Group,
  Loader,
  MantineProvider,
  Modal,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  Title
} from "@mantine/core"
import {
  IconArrowsMaximize,
  IconFolderOpen,
  IconHistory,
  IconSend,
  IconSettings,
  IconSparkles,
  IconX
} from "@tabler/icons-react"
import dayjs from "dayjs"

import { DEFAULT_TEMPLATE } from "~config"

import { EditableCard } from "./EditableCard" // 将 EditableCard 移至独立文件

// ========================================================================
// 辅助函数
// ========================================================================

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

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, "UTF-8")
  })
}

async function sendDataToAiTab(
  provider: "gemini" | "openai",
  data: string,
  userPrompt: string
): Promise<boolean> {
  const providerConfig = AI_PROVIDERS[provider]
  const tabs = await chrome.tabs.query({ url: providerConfig.url })
  let targetTab = null

  if (!targetTab) {
    targetTab = await chrome.tabs.create({ url: providerConfig.createUrl })
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

  return new Promise((resolve) => {
    setTimeout(() => {
      chrome.tabs
        .sendMessage(targetTab.id, {
          type: "FILL_AND_SUBMIT",
          data: data,
          title: userPrompt
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

// ========================================================================
// 主 UI 组件
// ========================================================================
function SidePanelContent() {
  // --- 状态管理 ---
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const templates = useLiveQuery(() => db.templates.toArray())
  const [activeTemplateId, setActiveTemplateId] = useStorage<string>(
    "active-template-id",
    DEFAULT_TEMPLATE.id
  )
  const [history, setHistory] = useStorage<any[]>("operation-history", [])
  const [aiProvider, setAiProvider] = useStorage<"gemini" | "openai">(
    "ai-provider",
    "gemini"
  )

  const [fieldValues, setFieldValues] = useState<{ [key: string]: string }>({})
  const [userPrompt, setUserPrompt] = useState("")

  const activeTemplate =
    templates?.find((t) => t.id === activeTemplateId) || templates?.[0]

  // 当模板切换时，重置字段的值
  useEffect(() => {
    if (activeTemplate) {
      const newFieldValues: { [key: string]: string } = {}
      activeTemplate.fields.forEach((field) => {
        newFieldValues[field.key] = ""
      })
      setFieldValues(newFieldValues)
    }
  }, [activeTemplateId, templates])

  // --- 事件处理函数 ---
  const handleFieldValueChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSend = async () => {
    const allInputs = [...Object.values(fieldValues), userPrompt]
      .join("")
      .trim()
    if (!allInputs) {
      toast.error("请输入至少一项内容后再发送。")
      return
    }

    let fullPrompt = activeTemplate.content
    for (const key in fieldValues) {
      fullPrompt = fullPrompt.replace(
        new RegExp(`\\$\\{${key}\\}`, "g"),
        fieldValues[key]
      )
    }
    fullPrompt = fullPrompt.replace(/\$\{userPrompt\}/g, userPrompt)

    const res = await sendDataToAiTab(aiProvider, fullPrompt, userPrompt)

    if (res) {
      const { url, title: userPrompt, data, mode } = res as any
      let title = data?.substring(0, 10)
      if (userPrompt) {
        title = userPrompt?.substring(0, 10)
      }
      setHistory(
        (per) =>
          [
            {
              title,
              timestamp: dayjs().format("YYYY-MM-DD HH:mm:ss"),
              mode,
              url
            },
            ...per
          ].slice(0, 50) as any[]
      )
    } else {
      toast.error("发送失败，请确保目标页面已打开并刷新。")
    }
  }

  const restoreFromHistory = (entry) => {
    /* ... */
    window.open(entry.url, "_blank")
  }

  useEffect(() => {
    populateDefaultTemplate()
  }, [])
  // --- 渲染 ---
  if (!templates || !activeTemplate) {
    return (
      <Group justify="center" p="xl">
        <Loader />
      </Group>
    )
  }

  return (
    <>
      <AppShell header={{ height: 60 }} padding="md">
        <AppShell.Header>
          <Group justify="space-between" h="100%" px="md">
            <Select
              data={templates.map((t) => ({
                value: t.id,
                label: t.name || "-"
              }))}
              value={activeTemplateId}
              onChange={(value) => setActiveTemplateId(value)}
            />
            <ActionIcon
              variant="default"
              size="lg"
              title="查看历史记录"
              onClick={() => setIsHistoryOpen(true)}>
              <IconHistory style={{ width: "70%", height: "70%" }} />
            </ActionIcon>
          </Group>
        </AppShell.Header>

        <AppShell.Main>
          <Stack gap="lg">
            {activeTemplate.fields.map((field) => (
              <EditableCard
                key={field.id}
                title={field.name}
                description={field.description}
                value={fieldValues[field.key] || ""}
                onValueChange={(newValue) =>
                  handleFieldValueChange(field.key, newValue)
                }
                onClear={() => handleFieldValueChange(field.key, "")}
                canSelectFile={field.canSelectFile ?? false}
                optimizing={field.canOptimize ?? false}
              />
            ))}

            <Divider my="xs" label="最终指令" labelPosition="center" />

            <Textarea
              label="用户指令 (userPrompt)"
              placeholder="请输入最终的指令..."
              autosize
              minRows={3}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.currentTarget.value)}
            />

            <Stack gap="xs" mt="md">
              <SegmentedControl
                fullWidth
                value={aiProvider}
                onChange={(value: "gemini" | "openai") => setAiProvider(value)}
                data={[
                  { label: "Gemini", value: "gemini" },
                  { label: "OpenAI", value: "openai" }
                ]}
              />

              <Button
                fullWidth
                size="lg"
                leftSection={<IconSend size={18} />}
                onClick={handleSend}>
                发送到 {AI_PROVIDERS[aiProvider].name}
              </Button>

              <Group grow>
                <Button
                  variant="default"
                  mt="auto"
                  onClick={() => chrome.runtime.openOptionsPage()}>
                  <IconSettings size={16} style={{ marginRight: "8px" }} />{" "}
                  管理模板
                </Button>
              </Group>
            </Stack>
          </Stack>

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
                      <Group>
                        {entry.mode && (
                          <Badge
                         
                            variant="gradient"
                            gradient={{ from: "blue", to: "cyan", deg: 90 }}>
                            {entry.mode}
                          </Badge>
                        )}
                        <Text truncate fw={500}>
                          {entry.title || "无提示词"}
                        </Text>
                      </Group>

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
        </AppShell.Main>
      </AppShell>
    </>
  )
}

// ========================================================================
// 最终的页面包装器
// ========================================================================
const theme = createTheme({})

const SidePanel = () => (
  <MantineProvider theme={theme} defaultColorScheme="auto">
    <Toaster position="top-right" />
    <SidePanelContent />
  </MantineProvider>
)

export default SidePanel
