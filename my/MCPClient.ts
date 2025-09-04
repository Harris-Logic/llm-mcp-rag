// 导入MCP SDK的相关模块
import { Client } from "@modelcontextprotocol/sdk/client/index.js";          // 导入MCP客户端核心类
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"; // 导入标准输入输出传输类
import { SetLevelRequest, Tool } from "@modelcontextprotocol/sdk/types.js"; // 导入MCP类型定义

/**
 * MCP客户端类 - TypeScript版本
 * 用于连接和管理与MCP服务器的通信
 */
export default class MCPClient{
    // 私有属性定义
    private mcp: Client;                           // MCP客户端核心实例
    private transport: StdioClientTransport | null = null; // 传输通道实例，初始为null
    private tools: Tool[] = []                     // 存储从服务器获取的工具列表，初始为空数组
    private command: string                        // 服务器启动命令
    private args: string[]                         // 命令参数数组

    /**
     * 构造函数 - 初始化MCP客户端
     * @param name 客户端名称，用于标识当前客户端实例
     * @param command 启动MCP服务器的命令路径（如："node", "python", "npx"等）
     * @param args 传递给服务器命令的参数数组（如：["server.js", "--port", "3000"]）
     * @param version 客户端版本号，可选参数，默认为"1.0.0"
     */
    constructor(name: string, command: string, args: string[], version?: string){
        // 步骤1: 创建MCP客户端核心实例
        // 使用提供的名称和版本号（如果未提供版本号则使用默认值"1.0.0"）
        this.mcp = new Client({ name, version: version || '1.0.0'})
        
        // 步骤2: 存储服务器启动命令和参数
        this.command = command  // 存储服务器启动命令
        this.args = args        // 存储命令参数数组
        
        // 步骤3: 工具列表已在类定义时初始化为空数组
        // 将在连接服务器后从服务器获取实际的工具列表
    }

    /**
     * 清理资源，关闭与服务器的连接
     * 异步方法，需要等待连接完全关闭
     */
    public async close(){
        await this.mcp.close()  // 调用MCP客户端的close方法关闭连接
    }

    /**
     * 公开的初始化方法，启动服务器连接
     * 异步方法，内部调用私有连接方法
     */
    public async init(){
        await this.connectToServer()  // 调用私有连接方法建立服务器连接
    }

    /**
     * 返回从服务器获取的工具列表
     * @returns 可用工具数组
     */
    public gettools(){
        return this.tools  // 返回存储的工具列表
    }
    
    /**
     * 调用服务器上的特定工具
     * @param name 工具名称
     * @param params 工具参数对象
     * @returns 工具调用结果
     */
    public async callTool(name: string, params: Record<string, any>){
        // 步骤1: 调用MCP客户端的callTool方法
        // 传递工具名称和参数字典
        return await this.mcp.callTool({name, arguments: params})
    }

    /**
     * 私有方法 - 建立服务器连接
     * 内部使用，处理与MCP服务器的连接和工具获取
     */
    private async connectToServer() {
        try {
            // 步骤1: 创建标准输入输出传输通道
            // 使用存储的命令和参数配置传输通道
            this.transport = new StdioClientTransport({
                command: this.command,  // 服务器启动命令
                args: this.args,        // 命令参数数组
            });
            
            // 步骤2: 连接到MCP服务器
            // 使用配置好的传输通道建立连接
            // 这是一个异步操作，返回Promise，需要await等待连接完成
            await this.mcp.connect(this.transport);

            // 步骤3: 获取服务器提供的工具列表
            // 调用listTools方法获取服务器上所有可用的工具
            const toolsResult = await this.mcp.listTools();
            
            // 步骤4: 处理并存储工具信息
            // 使用map方法转换工具对象，只保留需要的属性
            this.tools = toolsResult.tools.map((tool) => {
                return {
                    name: tool.name,            // 工具名称
                    description: tool.description, // 工具描述
                    inputSchema: tool.inputSchema, // 工具输入模式（参数定义）
                };
            });
            
            // 步骤5: 输出连接成功信息和可用工具名称
            console.log(
                "Connected to server with tools:",
                this.tools.map(({ name }) => name)  // 提取所有工具的名称并输出
            );
            
        } catch (error) {
            // 错误处理：连接失败时的处理逻辑
            console.log("Failed to connect to MCP server: ", error);
            throw error;  // 重新抛出错误，让调用方能够处理
        }
    }
}
