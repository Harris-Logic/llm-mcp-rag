import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SetLevelRequest, Tool } from "@modelcontextprotocol/sdk/types.js";

export default class MCPClient{
    private mcp: Client;
    private transport: StdioClientTransport | null = null;
    private tools: Tool[] = []
    private command: string
    private args: string[]

    constructor(name: string, command: string, args: string[], version?: string){
        this.mcp = new Client({ name, version: version || '1.0.0'})
        this.command = command
        this.args = args
    }
    // 创建 MCP 客户端实例
    // 存储服务器启动命令和参数
    // 初始化工具列表为空数组

    public async close(){
        await this.mcp.close()
    }//清理资源，关闭与服务器的连接
    public async init(){
        await this.connectToServer()
    }//公开的初始化方法，启动服务器连接
    public gettools(){
        return this.tools
    }//返回从服务器获取的工具列表
    
    public async callTool(name: string, params: Record<string, any>){
        return await this.mcp.callTool({name, arguments: params})
    }
    // 调用服务器上的特定工具
    // 传递工具名称和参数

    private async connectToServer() {//私有方法 - 服务器连接
        try {
            this.transport = new StdioClientTransport({// 创建标准输入输出传输通道
                command: this.command,
                args: this.args,
            });
            
            // 连接到 MCP 服务器
            //避免初始化之前就调用mcp功能，这里return的是一个promise
            await this.mcp.connect(this.transport);

            // 获取服务器提供的工具列表
            const toolsResult = await this.mcp.listTools();
            this.tools = toolsResult.tools.map((tool) => {// 将工具信息存储在本地
                return {
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema,
                };
            });
            console.log(
            "Connected to server with tools:",
            this.tools.map(({ name }) => name)
            );
            
        } catch (error) {// 处理连接错误
            console.log("Failed to connect to MCP server: ", error);
            throw error;
        }
    }
}