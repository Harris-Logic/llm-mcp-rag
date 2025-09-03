import ChatOpenAI from "./chatOpenAI";
import MCPClient from "./MCPClient";
import { logTitle } from "./utils";

export default class Agent{
    private mcpClients: MCPClient[]
    private llm: ChatOpenAI | null = null
    private model: string
    private systemPrompt: string
    private context: string

    constructor(model: string, mcpClients: MCPClient[], systemPrompt: string = '', context: string = ''){
        this.mcpClients = mcpClients
        this.model = model
        this.systemPrompt = systemPrompt
        this.context = context
    }
    public async init(){
        logTitle('INIT LLM AND TOOLS')
        this.llm = new ChatOpenAI(this.model, this.systemPrompt)
        for(const mcpClient of this.mcpClients){
            await mcpClient.init()
        }   
        const tools = this.mcpClients.flatMap(mcpClient => mcpClient.gettools())
        this.llm = new ChatOpenAI(this.model, this.systemPrompt, tools, this.context)
    }

    public async close(){
        logTitle('CLOSE MCP CLIENTS')
        for await (const client of this.mcpClients){
            await client.close()
        }
    }

    async invoke(prompt: string){
        if(!this.llm) throw new Error('LLM not initialized')
        let response = await this.llm.chat(prompt)
        while(true){
            //如果有toolCalls，则调用tool
            if(response.toolCalls.length > 0){
                for(const toolCall of response.toolCalls){
                    const mcp = this.mcpClients.find(mcpClient => mcpClient.gettools().find(tool => tool.name === toolCall.function.name))
                    if(mcp){
                        logTitle('TOOL USE' + toolCall.function.name)
                        console.log(`Calling tool: ${toolCall.function.name}` )
                        console.log(toolCall.function.arguments)
                        const result = await mcp.callTool(toolCall.function.name, JSON.parse(toolCall.function.arguments))
                        console.log(`Result: ${JSON.stringify(result)}`)
                        this.llm.appendToolResult(toolCall.id, JSON.stringify(result))
                    }else{
                        this.llm.appendToolResult(toolCall.id, 'Tool not found')
                    }
                }
                //有调用tool后，继续对话
                response = await this.llm.chat()
                continue
            }
            //如果没有toolCalls，则结束对话
            await this.close()
            return response.content
        }
    }




        // this.llm = new ChatOpenAI(this.model, this.systemPrompt, tools)
    
}