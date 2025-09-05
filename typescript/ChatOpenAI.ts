// 导入必要的模块
import OpenAI from "openai"; // OpenAI SDK
import { Tool } from "@modelcontextprotocol/sdk/types.js"; // MCP 工具类型
import 'dotenv/config' // 加载环境变量
import { logTitle } from "./utils"; // 日志工具

// 工具调用接口定义
export interface ToolCall {
    id: string; // 工具调用ID
    function: {
        name: string; // 函数名称
        arguments: string; // 函数参数（JSON字符串格式）
    };
}

// OpenAI 聊天客户端类
export default class ChatOpenAI {
    private llm: OpenAI; // OpenAI 客户端实例
    private model: string; // 使用的模型名称
    private messages: OpenAI.Chat.ChatCompletionMessageParam[]; // 消息历史记录
    private tools: Tool[]; // 可用工具列表

    // 构造函数：初始化聊天客户端
    constructor(model: string, systemPrompt?: string, tools?: Tool[]) {
        // 创建 OpenAI 客户端实例，使用环境变量中的 API 密钥和基础 URL
        this.llm = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL,
        });
        this.model = model; // 设置模型名称
        // 如果有系统提示，添加到消息历史中
        this.messages = systemPrompt ? [{ role: "system", content: systemPrompt }] : [];
        this.tools = tools || []; // 设置可用工具列表，默认为空数组
    }

    // 主要的聊天方法：发送消息并获取响应
    async chat(prompt?: string): Promise<{ content: string, toolCalls: ToolCall[] }> {
        logTitle('CHAT'); // 记录聊天开始日志
        
        // 如果有用户提示，添加到消息历史中
        if (prompt) {
            this.messages.push({ role: "user", content: prompt });
        }
        
        // 创建流式聊天完成请求
        const stream = await this.llm.chat.completions.create({
            model: this.model, // 使用的模型
            messages: this.messages, // 消息历史
            stream: true, // 启用流式响应
            tools: this.getToolsDefinition(), // 可用的工具定义
        });
        
        let content = ""; // 存储累积的文本内容
        let toolCalls: ToolCall[] = []; // 存储工具调用信息
        
        logTitle('RESPONSE'); // 记录响应开始日志
        
        // 处理流式响应的每个数据块
        for await (const chunk of stream) {
            const delta = chunk.choices[0].delta; // 获取响应增量
            
            // 处理普通文本内容
            if (delta.content) {
                const contentChunk = chunk.choices[0].delta.content || "";
                content += contentChunk; // 累积内容
                process.stdout.write(contentChunk); // 实时输出到控制台
            }
            
            // 处理工具调用
            if (delta.tool_calls) {
                for (const toolCallChunk of delta.tool_calls) {
                    // 如果是新的工具调用索引，创建一个新的工具调用对象
                    if (toolCalls.length <= toolCallChunk.index) {
                        toolCalls.push({ id: toolCallChunk.index.toString(), function: { name: '', arguments: '' } });
                    }
                    
                    let currentCall = toolCalls[toolCallChunk.index];
                    
                    // 累积工具调用的各个部分
                    if (toolCallChunk.id) currentCall.id += toolCallChunk.id;
                    if (toolCallChunk.function?.name) currentCall.function.name += toolCallChunk.function.name;
                    if (toolCallChunk.function?.arguments) currentCall.function.arguments += toolCallChunk.function.arguments;
                }
            }
        }
        
        // 将助手的响应添加到消息历史中
        this.messages.push({ 
            role: "assistant", 
            content: content, 
            tool_calls: toolCalls.map(call => ({ 
                id: call.id, 
                type: "function", 
                function: call.function 
            })) 
        });
        
        // 返回响应内容和工具调用信息
        return {
            content: content,
            toolCalls: toolCalls,
        };
    }

    // 添加工具执行结果到消息历史
    public appendToolResult(toolCallId: string, toolOutput: string) {
        this.messages.push({
            role: "tool", // 角色为工具
            content: toolOutput, // 工具执行结果
            tool_call_id: toolCallId // 对应的工具调用ID
        });
    }

    // 私有方法：将工具列表转换为 OpenAI 所需的格式
    private getToolsDefinition(): OpenAI.Chat.Completions.ChatCompletionTool[] {
        return this.tools.map((tool) => ({
            type: "function", // 类型为函数
            function: {
                name: tool.name, // 工具名称
                description: tool.description, // 工具描述
                parameters: tool.inputSchema, // 工具输入参数模式
            },
        }));
    }
}
