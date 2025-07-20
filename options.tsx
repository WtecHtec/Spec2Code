// options.tsx (最终完整版)

import { useLiveQuery } from "dexie-react-hooks"
import React, { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { v4 as uuidv4 } from "uuid"

import { useStorage } from "@plasmohq/storage/hook"

// 数据库服务和类型定义
import {
  db,
  populateDefaultTemplate,
  type PromptTemplate,
  type TemplateField
} from "./lib/db"
// Mantine UI 框架和图标库
import "@mantine/core/styles.css"

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  createTheme,
  Divider,
  Group,
  Loader,
  MantineProvider,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title
} from "@mantine/core"
import {
  IconDeviceFloppy,
  IconKey,
  IconPlus,
  IconTrash
} from "@tabler/icons-react"
import { DEFAULT_TEMPLATE } from "~config"

// ========================================================================
// 模板编辑器卡片组件 (负责单个模板的编辑)
// ========================================================================
function TemplateEditorCard({
  template,
  onSave,
  onDelete
}: {
  template: PromptTemplate
  onSave: (template: PromptTemplate) => void
  onDelete: (id: string) => void
}) {
  // 使用局部 state 暂存整个模板的编辑状态，实现显式保存
  const [draft, setDraft] = useState<PromptTemplate>(() =>
    JSON.parse(JSON.stringify(template))
  )

  // 当外部 template prop 更新时，同步内部 draft state (例如，在保存后)
  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(template)))
  }, [template])

  // 深度比较，检查是否有未保存的更改
  const hasUnsavedChanges = JSON.stringify(draft) !== JSON.stringify(template)

  const handleSave = () => {
    // 检查是否有重复或空的 key
    const keys = draft.fields.map((f) => f.key)
    const uniqueKeys = new Set(keys)
    if (uniqueKeys.size !== keys.length || keys.some((k) => !k)) {
      toast.error("模板中的字段“关键字(Key)”不能为空且不能重复！")
      return
    }
    onSave(draft)
  }

  const updateField = (
    fieldId: string,
    newFieldData: Partial<TemplateField>
  ) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      fields: currentDraft.fields.map((f) =>
        f.id === fieldId ? { ...f, ...newFieldData } : f
      )
    }))
  }

  const addField = () => {
    const newField: TemplateField = {
      id: uuidv4(),
      name: "新字段",
      key: `new_field_${Math.floor(Math.random() * 1000)}`,
      description: "",
      canSelectFile: false,
      canOptimize: true
    }
    setDraft((currentDraft) => ({
      ...currentDraft,
      fields: [...currentDraft.fields, newField]
    }))
  }

  const deleteField = (fieldId: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      fields: currentDraft.fields.filter((f) => f.id !== fieldId)
    }))
  }

  return (
    <Card withBorder p="xl" radius="md">
      <Stack>
        <Group justify="space-between" align="flex-end">
          <TextInput
            label="模板名称"
            value={draft.name}
            onChange={(e) =>
            {
                console.log( "模板名称::", e)
                setDraft((d) => ({ ...d, name: e.currentTarget?.value || e.target?.value }))
            }
             
            }
            style={{ flex: 1 }}
          />
          {hasUnsavedChanges && (
            <Badge color="yellow" variant="light">
              有未保存的更改
            </Badge>
          )}
          <Group gap="xs">
            <ActionIcon
              title="保存模板"
              variant="filled"
              size="lg"
              onClick={handleSave}
              disabled={!hasUnsavedChanges}>
              <IconDeviceFloppy size={20} />
            </ActionIcon>
            <ActionIcon
              title="删除模板"
              variant="filled"
              size="lg"
              color="red"
              onClick={() => onDelete(template.id)}>
              <IconTrash size={20} />
            </ActionIcon>
          </Group>
        </Group>

        <Divider my="md" label="自定义字段" />

        <Stack gap="lg">
          {draft.fields.map((field) => (
            <Card withBorder p="sm" key={field.id} radius="sm">
              <Stack>
                <Group grow align="flex-start">
                  <TextInput
                    label="字段名称"
                    value={field.name}
                    onChange={(e) =>
                      updateField(field.id, { name: e.currentTarget?.value || e.target?.value })
                    }
                  />
                  <TextInput
                    label="关键字 (Key)"
                    value={field.key}
                    onChange={(e) =>
                      updateField(field.id, {
                        key: e.currentTarget.value.trim().replace(/\s+/g, "_")
                      })
                    }
                    leftSection={<IconKey size={16} />}
                  />
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => deleteField(field.id)}
                    mt="auto"
                    title="删除字段">
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
                <TextInput
                  label="字段描述"
                  placeholder="输入框下的提示文字"
                  value={field.description}
                  onChange={(e) =>
                    updateField(field.id, {
                      description: e.currentTarget?.value
                    })
                  }
                />
                <Group mt="xs">
                  <Switch
                    label="允许选择文件夹"
                    checked={field.canSelectFile}
                    onChange={(e) =>
                      updateField(field.id, {
                        canSelectFile: e.currentTarget?.checked
                      })
                    }
                  />
                  <Switch
                    label="启用LLM优化"
                    checked={field.canOptimize}
                    onChange={(e) =>
                      updateField(field.id, {
                        canOptimize: e.currentTarget?.checked
                      })
                    }
                  />
                </Group>
              </Stack>
            </Card>
          ))}
          <Button
            fullWidth
            leftSection={<IconPlus size={16} />}
            onClick={addField}
            variant="light">
            添加字段
          </Button>
        </Stack>

        <Divider my="md" label="自定义模板内容" />
        <Textarea
          label="模板内容"
          description={`使用 \${key} 格式插入动态字段。可在字段自行配置: ${draft.fields.map((f) => `\${${f.key}}`).join(", ")}, \${userPrompt}`}
          autosize
          minRows={8}
          value={draft.content}
          onChange={(e) =>
            setDraft((d) => ({ ...d, content: e.currentTarget?.value || e.target?.value }))
          }
        />
      </Stack>
    </Card>
  )
}

// ========================================================================
// 选项页主组件
// ========================================================================
function OptionsPage() {
  // 确保默认数据只在数据库为空时填充一次
  useEffect(() => {
    populateDefaultTemplate()
  }, [])

  // 使用 Dexie 的 useLiveQuery 响应式地从 IndexedDB 获取模板列表
  const templates = useLiveQuery(() => db.templates.toArray())

  // activeTemplateId 这种小数据继续使用 useStorage
  const [activeTemplateId, setActiveTemplateId] =
    useStorage<string>("active-template-id")

  // 保存模板 (更新或创建)
  const handleSaveTemplate = async (updatedTemplate: PromptTemplate) => {
    try {
      await db.templates.put(updatedTemplate)
    } catch (error) {
      toast.error("保存失败！")
      console.error(error)
    }
  }

  // 添加新模板
  const handleAddTemplate = async () => {
    const newTemplate: PromptTemplate = {
      id: uuidv4(),
      name: "新模板",
      content: DEFAULT_TEMPLATE.content,
      // 深拷贝默认字段，并为每个字段生成新ID
      fields: JSON.parse(JSON.stringify(DEFAULT_TEMPLATE.fields)).map((f) => ({
        ...f,
        id: uuidv4()
      }))
    }
    await db.templates.add(newTemplate)
  }

  // 删除模板
  const handleDeleteTemplate = async (id: string) => {
    if (!templates || templates.length <= 1) {
      toast.error("无法删除，至少需要保留一个模板。")
      return
    }
    await db.templates.delete(id)

    if (activeTemplateId === id) {
      const remaining = await db.templates.toArray()
      if (remaining.length > 0) {
        setActiveTemplateId(remaining[0].id)
      }
    }
    toast.success("模板已删除!")
  }

  // 在数据从数据库加载时显示加载状态
  if (!templates) {
    return (
      <Container size="md" py="xl" style={{ textAlign: "center" }}>
        <Loader />
        <Text mt="md">正在加载模板数据...</Text>
      </Container>
    )
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Title order={1}>管理提示词模板</Title>
        {templates.map((template) => (
          <TemplateEditorCard
            key={template.id}
            template={template}
            onSave={handleSaveTemplate}
            onDelete={handleDeleteTemplate}
          />
        ))}
        <Button
          fullWidth
          leftSection={<IconPlus size={18} />}
          onClick={handleAddTemplate}
          mt="md"
          size="lg">
          添加新模板
        </Button>
      </Stack>
    </Container>
  )
}

// ========================================================================
// 最终的页面包装器
// ========================================================================
const theme = createTheme({})

const OptionsPageWrapper = () => (
  <MantineProvider theme={theme} defaultColorScheme="auto">
    <Toaster position="top-center" />
    <OptionsPage />
  </MantineProvider>
)

export default OptionsPageWrapper
