// import { logTitle } from "./utils"
// logTitle(
//     'hello'
// )

// async function main(){
//     const llm = new ChatOpenAI('openai/gpt-4o-mini')
//     const { content, toolCalls } = await llm.chat('你好')
//     console.log(content)
//     console.log(toolCalls)
// }

// async function main(){
//     const fetchMCP = new MCPClient('fetch','uvx',['mcp-server-fetch'])
//     await fetchMCP.init()
//     const tools = fetchMCP.gettools()
//     console.log(tools)
//     await fetchMCP.close()
// }
import Agent from "./Agent";        // AI 代理类
import ChatOpenAI from "./chatOpenAI"; // OpenAI 聊天客户端
import MCPClient from "./MCPClient"   // MCP 客户端

const currentDir = process.cwd()  // 获取当前工作目录

// 创建 fetch MCP 客户端（用于网络请求）
const fetchMCP = new MCPClient('fetch','uvx',['mcp-server-fetch'])

// 创建 file MCP 客户端（用于文件系统操作）
const fileMCP = new MCPClient('file','npx',[
    "-y", "@modelcontextprotocol/server-filesystem", currentDir
])

async function main() {
    // 创建 AI 代理，使用 deepseek-chat 模型，并传入两个 MCP 客户端
    const agent = new Agent('deepseek-chat', [fetchMCP, fileMCP])
    // const agent = new Agent('openai/gpt-4o-mini',[fetchMCP, fileMCP])
    
    await agent.init()  // 初始化代理
    // 执行任务：爬取网页内容，总结并保存到文件
    const response = await agent.invoke(
        `爬取https://news.ycombinator.com/的内容，并总结后保存到${currentDir}的news.md文件中`
    )
    
    console.log(response)  // 输出结果
}



main()