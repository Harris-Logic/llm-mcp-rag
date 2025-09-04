import MCPClient from "./MCPClient";
import ChatOpenAI from "./ChatOpenAI";
import { logTitle } from "./utils";

// Agent类 - 负责管理MCP客户端和LLM的交互
export default class Agent {
    private mcpClients: MCPClient[]; // MCP客户端列表
    private llm: ChatOpenAI | null = null; // LLM实例
    private model: string; // 模型名称
    private systemPrompt: string; // 系统提示词
    private context: string; // 上下文信息

    // 构造函数 - 初始化Agent
    constructor(model: string, mcpClients: MCPClient[], systemPrompt: string = '', context: string = '') {
        this.mcpClients = mcpClients;
        this.model = model;
        this.systemPrompt = systemPrompt;
        this.context = context;
    }

    // 初始化方法 - 设置工具和LLM
    async init() {
        logTitle('TOOLS'); // 打印工具标题
        // 初始化所有MCP客户端
        for await (const client of this.mcpClients) {
            await client.init();
        }
        // 获取所有客户端的工具列表
        const tools = this.mcpClients.flatMap(client => client.getTools());
        // 创建ChatOpenAI实例
        this.llm = new ChatOpenAI(this.model, this.systemPrompt, tools, this.context);
    }

    // 关闭方法 - 清理资源
    async close() {
        // 关闭所有MCP客户端
        for await (const client of this.mcpClients) {
            await client.close();
        }
    }

    // 调用方法 - 处理用户输入并返回响应
    async invoke(prompt: string) {
        if (!this.llm) throw new Error('Agent not initialized'); // 检查是否已初始化
        let response = await this.llm.chat(prompt); // 发送初始消息给LLM
        
        // 循环处理工具调用
        while (true) {
            if (response.toolCalls.length > 0) {
                // 处理每个工具调用
                for (const toolCall of response.toolCalls) {
                    // 查找对应的MCP客户端
                    const mcp = this.mcpClients.find(client => client.getTools().some((t: any) => t.name === toolCall.function.name));
                    if (mcp) {
                        logTitle(`TOOL USE`); // 打印工具使用标题
                        console.log(`Calling tool: ${toolCall.function.name}`); // 打印调用的工具名称
                        console.log(`Arguments: ${toolCall.function.arguments}`); // 打印工具参数
                        // 调用工具并获取结果
                        const result = await mcp.callTool(toolCall.function.name, JSON.parse(toolCall.function.arguments));
                        console.log(`Result: ${JSON.stringify(result)}`); // 打印工具调用结果
                        // 将工具结果附加到LLM上下文
                        this.llm.appendToolResult(toolCall.id, JSON.stringify(result));
                    } else {
                        // 工具未找到的处理
                        this.llm.appendToolResult(toolCall.id, 'Tool not found');
                    }
                }
                // 工具调用后,继续对话 - 获取LLM的下一步响应
                response = await this.llm.chat();
                continue; // 继续循环处理可能的工具调用
            }
            // 没有工具调用,结束对话 - 关闭连接并返回最终响应
            await this.close();
            return response.content;
        }
    }
}
