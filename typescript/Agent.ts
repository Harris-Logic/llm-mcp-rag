// 导入必要的模块
import MCPClient from "./MCPClient"; // MCP客户端类，用于与MCP服务器通信
import ChatOpenAI from "./ChatOpenAI"; // OpenAI聊天模型封装类
import { logTitle } from "./utils"; // 工具函数，用于输出带标题的日志

// Agent类 - 负责协调MCP客户端和LLM的交互
export default class Agent {
    private mcpClients: MCPClient[]; // MCP客户端实例数组
    private llm: ChatOpenAI | null = null; // OpenAI聊天模型实例，初始为null
    private model: string; // 使用的模型名称
    private systemPrompt: string; // 系统提示词

    // 构造函数 - 初始化Agent实例
    constructor(mcpClients: MCPClient[], model: string, systemPrompt?: string) {
        this.mcpClients = mcpClients; // 设置MCP客户端数组
        this.model = model; // 设置模型名称
        this.systemPrompt = systemPrompt || ''; // 设置系统提示词，默认为空字符串
    }

    // 初始化方法 - 初始化所有MCP客户端并创建LLM实例
    async init() {
        logTitle('TOOLS'); // 输出工具初始化标题
        // 遍历所有MCP客户端并进行初始化
        for await (const client of this.mcpClients) {
            await client.init(); // 初始化单个MCP客户端
        }
        // 获取所有MCP客户端的工具列表并扁平化
        const tools = this.mcpClients.flatMap(client => client.getTools());
        // 创建ChatOpenAI实例，传入模型名称、系统提示词和工具列表
        this.llm = new ChatOpenAI(this.model, this.systemPrompt, tools);
    }

    // 关闭方法 - 关闭所有MCP客户端连接
    async close() {
        // 遍历所有MCP客户端并关闭连接
        for await (const client of this.mcpClients) {
            await client.close(); // 关闭单个MCP客户端
        }
    }

    // 调用方法 - 处理用户输入并协调工具调用
    async invoke(prompt: string) {
        // 检查LLM是否已初始化
        if (!this.llm) throw new Error('Agent not initialized');
        
        // 发送初始消息给LLM并获取响应
        let response = await this.llm.chat(prompt);
        
        // 主循环 - 处理工具调用和对话
        while (true) {
            // 检查响应中是否有工具调用
            if (response.toolCalls.length > 0) {
                // 遍历所有工具调用
                for (const toolCall of response.toolCalls) {
                    // 查找对应的MCP客户端
                    const mcp = this.mcpClients.find(client => 
                        client.getTools().some((t: any) => t.name === toolCall.function.name)
                    );
                    
                    if (mcp) {
                        // 找到对应的MCP客户端，执行工具调用
                        logTitle(`TOOL USE`); // 输出工具使用标题
                        console.log(`Calling tool: ${toolCall.function.name}`); // 输出工具名称
                        console.log(`Arguments: ${toolCall.function.arguments}`); // 输出工具参数
                        
                        // 调用工具并获取结果
                        const result = await mcp.callTool(
                            toolCall.function.name, 
                            JSON.parse(toolCall.function.arguments)
                        );
                        
                        console.log(`Result: ${JSON.stringify(result)}`); // 输出工具调用结果
                        // 将工具调用结果添加到LLM的上下文中
                        this.llm.appendToolResult(toolCall.id, JSON.stringify(result));
                    } else {
                        // 未找到对应的工具，返回错误信息
                        this.llm.appendToolResult(toolCall.id, 'Tool not found');
                    }
                }
                
                // 工具调用后，继续对话以处理后续响应
                response = await this.llm.chat();
                continue; // 继续循环处理可能的后续工具调用
            }
            
            // 没有工具调用，结束对话
            await this.close(); // 关闭所有MCP客户端连接
            return response.content; // 返回最终的响应内容
        }
    }
}
