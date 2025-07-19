// options.tsx (新文件)

import React, { useState } from 'react';
import { useStorage } from '@plasmohq/storage/hook';
import toast, { Toaster } from 'react-hot-toast';

import '@mantine/core/styles.css';
import {
  MantineProvider,
  createTheme,
  Stack,
  Card,
  Group,
  TextInput,
  Textarea,
  Button,
  ActionIcon,
  Badge,
  Title,
  Container,
} from '@mantine/core';
import { IconDeviceFloppy, IconPlus, IconTrash } from '@tabler/icons-react';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_TEMPLATE } from '~config';

// 复制接口定义和默认模板
interface PromptTemplate {
  id: string;
  name: string;
  content: string;
}



// 复制 TemplateEditorCard 组件
function TemplateEditorCard({ template, onSave, onDelete }: {
  template: PromptTemplate,
  onSave: (id: string, newName: string, newContent: string) => void,
  onDelete: (id: string) => void
}) {
    const [name, setName] = useState(template.name);
    const [content, setContent] = useState(template.content);
    const hasUnsavedChanges = name !== template.name || content !== template.content;

    const handleSave = () => {
        onSave(template.id, name, content);
        // Manually reset dirty state after save
        // This is a visual trick, the parent state handles the real data
        // To be truly robust, the parent would need to pass down the new template object
        // But for this UI, just showing it's saved is enough.
        // A better way is to re-render from parent, but this is simpler.
        toast.success(`模板 "${name}" 已保存!`);
    }

    return (
        <Card withBorder>
            <Stack>
                <Group justify="space-between">
                    <TextInput
                        label="模板名称"
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
                        style={{ flex: 1 }}
                    />
                    <Group gap="xs" mt="auto">
                        <ActionIcon title="保存更改" variant="filled" size="lg" onClick={handleSave} disabled={!hasUnsavedChanges}>
                            <IconDeviceFloppy size={20} />
                        </ActionIcon>
                        <ActionIcon title="删除模板" variant="filled" size="lg" color="red" onClick={() => onDelete(template.id)}>
                            <IconTrash size={20} />
                        </ActionIcon>
                    </Group>
                </Group>
                {hasUnsavedChanges && <Badge color="yellow" variant="light" size="sm">有未保存的更改</Badge>}
                <Textarea
                    label="模板内容"
                    description="可用占位符: ${context}, ${prd}, ${designDoc}, ${userPrompt}"
                    autosize
                    minRows={8}
                    value={content}
                    onChange={(e) => setContent(e.currentTarget.value)}
                />
            </Stack>
        </Card>
    );
}


function OptionsPage() {
  // 使用和 sidepanel 中完全相同的 key 来访问 useStorage
  const [templates, setTemplates] = useStorage<PromptTemplate[]>('prompt-templates', [DEFAULT_TEMPLATE]);
  const [activeTemplateId, setActiveTemplateId] = useStorage<string>('active-template-id');

  const handleSaveTemplate = (id: string, newName: string, newContent: string) => {
    setTemplates(currentTemplates => currentTemplates.map(t => t.id === id ? { ...t, name: newName, content: newContent } : t));
  };
  
  const handleAddTemplate = () => {
    const newTemplate: PromptTemplate = { id: uuidv4(), name: '新模板', content: DEFAULT_TEMPLATE.content };
    setTemplates(currentTemplates => [...currentTemplates, newTemplate]);
  };

  const handleDeleteTemplate = (id: string) => {
    if (templates.length <= 1) {
      toast.error('无法删除，至少需要保留一个模板。');
      return;
    }
    setTemplates(currentTemplates => currentTemplates.filter(t => t.id !== id));
    if (activeTemplateId === id) {
      // 如果删除了当前激活的，就自动激活剩下的第一个
      const remainingTemplates = templates.filter(t => t.id !== id);
      if(remainingTemplates.length > 0) {
        setActiveTemplateId(remainingTemplates[0].id);
      }
    }
    toast.success('模板已删除!');
  };

  return (
    <Container size="md" py="xl">
        <Stack>
            <Title order={1}>管理提示词模板</Title>
            {templates.map((template) => (
                <TemplateEditorCard
                    key={template.id}
                    template={template}
                    onSave={handleSaveTemplate}
                    onDelete={handleDeleteTemplate}
                />
            ))}
            <Button leftSection={<IconPlus size={16}/>} onClick={handleAddTemplate} mt="md" size="md">
                添加新模板
            </Button>
        </Stack>
    </Container>
  );
}

const theme = createTheme({});

// 选项页也需要自己的 Provider 和 Toaster
const OptionsPageWrapper = () => (
  <MantineProvider theme={theme} defaultColorScheme="auto">
    <Toaster position="top-right" />
    <OptionsPage />
  </MantineProvider>
);

export default OptionsPageWrapper;