 // 创建一个默认模板
 export const DEFAULT_TEMPLATE = {
  id: "default-1",
  name: "默认模板",
  content: `
    # ***角色 start***
    你是高级前端开发工程师,精通前端开发所有的技术框架, 对需求分析、技术实现方案有很深刻的见解。
    # ***角色 end ***
    # ***任务 start***
    根据客户任务要求, 并结合源&规范、分析需求PRD、接口设计文档百分百完成交付。
    # ***任务 end ***
    # ***输出要求 start ***
    1. 中文回复
    2. 不要过多解释,只输出任务相关的内容
    # ***输出要求 end ***
    # ***资源&规范 start***
     \${context}
    # ***资源&规范 end ***
    # ***需求PRD  start ***
    \${prd}
     # ***需求PRD  end ***
    # ***接口设计文档 start***
    \${designDoc}
    # ***接口设计文档 end***
    # ***客户任务 start***
    \${userPrompt} 
    # ***客户任务 end***
    `.trim(),
    fields: [
        { 
          id: 'field-1', name: '上下文', key: 'context', description: '在此输入上下文，或选择文件夹',
          canSelectFile: true,  // 默认开启“选择文件夹”
          canOptimize: true,    // 默认开启“优化”
        },
        { 
          id: 'field-2', name: '需求 PRD', key: 'prd', description: '',
          canSelectFile: false, // 默认关闭
          canOptimize: true,    // 默认开启
        },
        { 
          id: 'field-3', name: '设计文档', key: 'designDoc', description: '',
          canSelectFile: false, // 默认关闭
          canOptimize: true,    // 默认开启
        },
      ],
}