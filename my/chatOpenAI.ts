import OpenAI from "openai";
import { Tool } from "@modelcontextprotocol/sdk/types.js";//"openai/resources/responses/responses.mjs";
import 'dotenv/config';
import { logTitle } from "./utils";
export interface ToolCall{
    id:string,
    function : {
        name: string,
        arguments: string,
    }
}

export default class ChatOpenAI{
    private llm: OpenAI
    private model: string
    private message: OpenAI.Chat.ChatCompletionMessageParam[] = []
    private tools: Tool[] = []

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