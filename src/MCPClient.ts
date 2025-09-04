// 导入 MCP SDK 相关模块
import { Client } from "@modelcontextprotocol/sdk/client/index.js"; // MCP 客户端核心类
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"; // 标准输入输出传输层
import { Tool } from "@modelcontextprotocol/sdk/types.js"; // 工具类型定义

// MCP 客户端类，用于与 MCP 服务器进行通信
export default class MCPClient {
    private mcp: Client; // MCP 客户端实例
    private command: string; // 要执行的 MCP 服务器命令
    private args: string[] // MCP 服务器命令的参数
    private transport: StdioClientTransport | null = null; // 传输层实例
    private tools: Tool[] = []; // 从服务器获取的工具列表

    // 构造函数，初始化 MCP 客户端
    constructor(name: string, command: string, args: string[], version?: string) {
        // 创建新的 MCP 客户端实例
        this.mcp = new Client({ name, version: version || "0.0.1" });
        // 设置要执行的 MCP 服务器命令
        this.command = command;
        // 设置命令参数
        this.args = args;
    }

    // 初始化方法，连接到 MCP 服务器
    public async init() {
        await this.connectToServer(); // 建立与服务器的连接
    }

    // 关闭方法，断开与 MCP 服务器的连接
    public async close() {
        await this.mcp.close(); // 关闭客户端连接
    }

    // 获取从服务器获取的工具列表
    public getTools() {
        return this.tools; // 返回所有可用的工具
    }

    // 调用指定的工具
    public callTool(name: string, params: Record<string, any>) {
        // 通过 MCP 客户端调用工具
        return this.mcp.callTool({
            name, // 工具名称
            arguments: params, // 工具参数
        });
    }

    // 私有方法：连接到 MCP 服务器
    private async connectToServer() {
        try {
            // 创建标准输入输出传输层
            this.transport = new StdioClientTransport({
                command: this.command, // 服务器命令
                args: this.args, // 命令参数
            });
            
            // 连接到 MCP 服务器
            await this.mcp.connect(this.transport);

            // 获取服务器提供的工具列表
            const toolsResult = await this.mcp.listTools();
            
            // 映射工具信息到本地存储
            this.tools = toolsResult.tools.map((tool) => {
                return {
                    name: tool.name, // 工具名称
                    description: tool.description, // 工具描述
                    inputSchema: tool.inputSchema, // 工具输入模式
                };
            });
            
            // 打印连接成功信息和可用工具列表
            console.log(
                "Connected to server with tools:",
                this.tools.map(({ name }) => name)
            );
        } catch (e) {
            // 连接失败时打印错误信息并重新抛出异常
            console.log("Failed to connect to MCP server: ", e);
            throw e;
        }
    }
}
