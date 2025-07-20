import React, { useState } from 'react';
import toast from 'react-hot-toast';

// Mantine 和图标库的导入
import {
  Card,
  Group,
  Text,
  Textarea,
  ActionIcon,
  Loader, // 加载指示器
} from '@mantine/core';
import {
  IconSparkles,      // 优化图标
  IconArrowsMaximize,  // 缩放图标
  IconBackspace,
  IconArrowsMinimize,             // 清除图标
} from '@tabler/icons-react';

// 定义组件的 Props 接口
interface EditableCardProps {
  title: string;
  description?: string;
  value: string;
  onValueChange: (value: string) => void;
  onClear: () => void;
  optimizing: boolean;
  onZoom?: () => void;
  minRows?: number;
  children?: React.ReactNode; // 用于传递额外的按钮，如“选择文件夹”
}

/**
 * 一个功能齐全的可编辑卡片组件
 * @param {EditableCardProps} props
 * @returns {JSX.Element}
 */
export function EditableCard({
  title,
  description,
  value,
  onValueChange,
  onClear,
  onZoom,
  minRows = 4,
  optimizing = false,
  children,
 
}: EditableCardProps): JSX.Element {
  // 用于“优化”功能的加载状态
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [maxRows, setMaxRows] = useState(minRows);

  // 点击“优化”按钮的处理函数
  const handleOptimize = async () => {
    if (!value.trim()) {
      toast.error("输入框内容为空，无法优化。");
      return;
    }

    setIsOptimizing(true); // 开始加载

    try {
      // ⚠️ 请将这里的 URL 替换为您真实的 BFF 接口地址
      const response = await fetch("https://xujingyichang.top/bff-llmzp/chat", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 如果您的 API 需要授权，请在这里添加，例如:
          // 'Authorization': 'Bearer YOUR_API_KEY',
        },
        body: JSON.stringify({ content: value }),
      });

      if (!response.ok) {
        // 尝试解析错误信息
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || `API 请求失败，状态码: ${response.status}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // 根据您提供的响应结构，提取优化后的内容
      const optimizedContent = result?.choices?.[0]?.message?.content;

      if (optimizedContent) {
        onValueChange(optimizedContent); // 更新父组件的状态
        toast.success(`"${title}" 内容已优化！`);
      } else {
        throw new Error("API 响应格式不正确，未找到优化内容。");
      }

    } catch (error) {
      console.error("优化失败:", error);
      toast.error(`优化失败: ${error.message}`);
    } finally {
      setIsOptimizing(false); // 结束加载
    }
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Text fw={500}>{title}</Text>
          {/* 右上角的操作图标组 */}
          <Group gap="xs">
            {children} {/* 渲染父组件传递的额外按钮 */}
            
            {/* 优化按钮 */}
            { 
                optimizing &&   <ActionIcon
                title="优化内容"
                variant="default"
                size="sm"
                onClick={handleOptimize}
                disabled={isOptimizing}
              >
                {isOptimizing ? <Loader size={14} /> : <IconSparkles style={{ width: '70%' }} />}
              </ActionIcon>
            }
           

            {/* 缩放按钮 */}
            <ActionIcon variant="default" size="sm" title="缩放" onClick={(() => {
                setMaxRows(per => per === minRows ? 1000 : minRows)
            })}>
                {
                    maxRows === minRows ?   <IconArrowsMaximize style={{ width: '70%' }} />
                    :  <IconArrowsMinimize style={{ width: '70%' }}/>
                }
             
             
            </ActionIcon>

            {/* 清除按钮 */}
            <ActionIcon variant="default" size="sm" title="清除" onClick={onClear}>
              <IconBackspace style={{ width: '70%' }} />
            </ActionIcon>
          </Group>
        </Group>
        {description && <Text size="sm" c="dimmed" mt={3}>{description}</Text>}
      </Card.Section>
      <Textarea
        mt="md"
        autosize
        minRows={minRows}
        maxRows={maxRows}
        value={value}
        disabled={isOptimizing}
        onChange={(e) => onValueChange(e.currentTarget.value)}
      />
    </Card>
  );
}