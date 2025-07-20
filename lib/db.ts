// lib/db.ts (新文件)

import Dexie, { type Table } from 'dexie';
import { DEFAULT_TEMPLATE } from '~config';

// 复制模板接口定义
export interface TemplateField {
  id: string;
  name: string;
  key: string;
  description?: string;
  canSelectFile: boolean;
  canOptimize: boolean;
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  fields: TemplateField[];
}

// 1. 创建一个 Dexie 的子类来定义数据库
export class MySubClassedDexie extends Dexie {
  // 'templates' 是我们的表名。
  // Table<PromptTemplate, string> 定义了表中存储的对象类型和主键类型。
  templates!: Table<PromptTemplate, string>; 

  constructor() {
    super('myCopilotDatabase'); // 'myCopilotDatabase' 是数据库的名称
    this.version(1).stores({
      // "++id" 表示自增主键。我们用模板自己的 id，所以这里直接写 "id"
      // 定义了一个名为 'templates' 的表，它的主键是 'id' 字段
      templates: 'id',
    });
  }
}

// 2. 创建并导出一个数据库实例
export const db = new MySubClassedDexie();

// 3. (可选但推荐) 添加一个函数来初始化默认数据
export async function populateDefaultTemplate() {
    const count = await db.templates.count();
    if (count === 0) {
        console.log("Database is empty, populating with default template.");

        await db.templates.add(DEFAULT_TEMPLATE);
    }
}
