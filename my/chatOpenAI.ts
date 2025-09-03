import OpenAI from "openai";
import { Tool } from "@modelcontextprotocol/sdk/types.js";//"openai/resources/responses/responses.mjs";
import 'dotenv/config';
import { logTitle } from "./utils";
/** 工具调用接口 - 表示AI模型调用的工具 */
export interface ToolCall{
    id:string, // 工具调用的唯一标识符
    function : { // 函数调用信息
        name: string, // 函数名称
        arguments: string, // 函数参数（JSON字符串格式）
    }
}

/** OpenAI聊天客户端类 - 封装与OpenAI API的交互，支持工具调用和流式响应 */
export default class ChatOpenAI{
    private llm: OpenAI // OpenAI客户端实例
    private model: string // 使用的模型名称
    private message: OpenAI.Chat.ChatCompletionMessageParam[] = [] // 消息历史记录
    private tools: Tool[] = [] // 可用的工具列表

    /**
     * 构造函数 - 初始化ChatOpenAI实例
     * @param model 模型名称 (如 "gpt-4", "gpt-3.5-turbo")
     * @param systemPrompt 系统提示词，用于设置AI的行为和角色
     * @param tools 可用工具列表，用于函数调用
     * @param context 初始上下文信息
     */
    constructor(model: string, systemPrompt: string = '', tools: Tool[] = [], context: string = ''){
        this.llm = new OpenAI({
            apiKey:process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL,
        });
        this.model = model
        this.tools = tools
        if(systemPrompt) this.message.push({ role:'system', content:systemPrompt })
        if(context) this.message.push({ role:'user', content:context })
    }

    /**
     * 发送聊天消息并获取AI响应
     * @param prompt 用户输入的消息内容（可选，如果不提供则继续之前的对话）
     * @returns 包含响应内容和工具调用信息的对象
     */
    async chat(prompt?: string){
        logTitle('CHAT')
        if(prompt) this.message.push({ role:'user', content: prompt })
        const stream = await this.llm.chat.completions.create({
            model: this.model,
            messages: this.message,
            stream: true,
            tools: this.getToolsDefinition(),
        })
        let content = ''
        let toolCalls: ToolCall[] = []
        logTitle('RESPONSE')
        for await (const chunk of stream){
            const delta = chunk.choices[0].delta
            //处理content
            if(delta.content){
                const contentChunk = delta.content || ''
                content += contentChunk
                // console.log(delta.content)
                process.stdout.write(contentChunk)                
            }
            //处理toolCalls，一般有不止一个toolCalls
            if(delta.tool_calls){
                //拼接出一个完整的链条
                for(const toolCallChunk of delta.tool_calls){
                    //第一次收到一个toolCall时
                    if(toolCalls.length <= toolCallChunk.index){
                        toolCalls.push({ id: '', function: {name: '', arguments: ''}})
                    }
                    //追加
                    let currentCall = toolCalls[toolCallChunk.index]
                    if(toolCallChunk.id) currentCall.id += toolCallChunk.id
                    if(toolCallChunk.function?.name) currentCall.function.name += toolCallChunk.function.name
                    if(toolCallChunk.function?.arguments) currentCall.function.arguments += toolCallChunk.function.arguments
                }
            }
        }
        this.message.push({ role: 'assistant', content, tool_calls: toolCalls.map(call => ({ type: 'function',id: call.id , function: call.function}))})
        return { content, toolCalls}
    }

    /**
     * 添加工具调用结果到消息历史
     * @param toolCallId 工具调用的ID
     * @param toolOutput 工具执行的结果
     */
    public appendToolResult(toolCallId: string, toolOutput: string){
        this.message.push({ role: 'tool', content: toolOutput, tool_call_id: toolCallId})
    }
    // private getToolsDefinition(){
    //     const toolsDef = this.tools.map(tool => {
    //         // 确保 inputSchema 有合理的默认值
    //         const inputSchema = tool.inputSchema || {
    //             type: "object",
    //             properties: {},
    //             required: []
    //         };
            
    //         return {
    //             type: 'function' as const,
    //             function: {
    //                 name: tool.name,
    //                 description: tool.description || "",
    //                 parameters: inputSchema,
    //             }
    //         };
    //     });
        
    //     return toolsDef;
    // }

    /**
     * 获取工具定义 - 将工具列表转换为OpenAI API所需的格式
     * @returns 格式化后的工具定义数组
     */
    private getToolsDefinition(){
        return this.tools.map(tool => ({
            type: 'function' as const,
            // function: tool,
            function:{
                name: tool.name,
                description: tool.description || "",
                parameters: tool.inputSchema || {
                        type: "object",
                        properties: {},
                        required: [],
                },
                // parameters: inputSchema,
            }
        }))
    }
}
