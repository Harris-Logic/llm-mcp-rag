// 导入必要的模块
import MCPClient from "./MCPClient"; // MCP客户端类，用于与MCP服务器通信
import Agent from "./Agent"; // 智能代理类，用于处理任务执行
import path from "path"; // 路径处理模块
import EmbeddingRetriever from "./EmbeddingRetriever"; // 嵌入检索器，用于RAG功能
import fs from "fs"; // 文件系统模块
import { logTitle } from "./utils"; // 工具函数，用于格式化日志标题

// 定义常量配置
const URL = 'https://news.ycombinator.com/' // 目标URL（当前未使用）
const outPath = path.join(process.cwd(), 'output'); // 输出目录路径
const TASK = `
告诉我Antonette的信息,先从我给你的context中找到相关信息,总结后创作一个关于她的故事
把故事和她的基本信息保存到${outPath}/antonette.md,输出一个漂亮md文件
` // 任务描述：查找Antonette信息并生成故事

// 创建MCP客户端实例
const fetchMCP = new MCPClient("mcp-server-fetch", "uvx", ['mcp-server-fetch']); // 用于网络请求的MCP客户端
const fileMCP = new MCPClient("mcp-server-file", "npx", ['-y', '@modelcontextprotocol/server-filesystem', outPath]); // 用于文件操作的MCP客户端

async function main() {
    // 主函数：执行RAG和Agent任务
    
    // 第一步：RAG - 检索增强生成
    // 从知识库中检索与任务相关的上下文信息
    const context = await retrieveContext();

    // 第二步：Agent - 创建并执行智能代理
    // 使用GPT-4o-mini模型，配置MCP工具和检索到的上下文
    const agent = new Agent('openai/gpt-4o-mini', [fetchMCP, fileMCP], '', context);
    
    // 初始化代理
    await agent.init();
    
    // 执行任务：根据上下文生成Antonette的故事并保存到文件
    await agent.invoke(TASK);
    
    // 关闭代理，释放资源
    await agent.close();
}

// 执行主函数
main()

async function retrieveContext() {
    // 检索上下文函数：实现RAG（检索增强生成）功能
    
    // 第一步：初始化嵌入检索器
    // 使用BAAI/bge-m3模型进行文本嵌入
    const embeddingRetriever = new EmbeddingRetriever("BAAI/bge-m3");
    
    // 第二步：读取知识库目录
    // 获取knowledge目录中的所有文件
    const knowledgeDir = path.join(process.cwd(), 'knowledge');
    const files = fs.readdirSync(knowledgeDir);
    
    // 第三步：处理每个知识文件
    // 遍历所有文件，将内容嵌入到向量数据库中
    for await (const file of files) {
        const content = fs.readFileSync(path.join(knowledgeDir, file), 'utf-8');
        await embeddingRetriever.embedDocument(content); // 将文档内容嵌入到向量空间
    }
    
    // 第四步：检索相关上下文
    // 根据任务描述检索最相关的3个文档片段
    const context = (await embeddingRetriever.retrieve(TASK, 3)).join('\n');
    
    // 第五步：输出检索到的上下文
    // 使用格式化标题显示检索结果
    logTitle('CONTEXT');
    console.log(context);
    
    // 返回检索到的上下文信息
    return context
}
