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
        this.llm = new ChatOpenAI(this.model, this.systemPrompt, tools)
    }
}