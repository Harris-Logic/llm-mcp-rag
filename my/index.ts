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
import Agent from "./Agent";
import ChatOpenAI from "./chatOpenAI";
import MCPClient from "./MCPClient"

const currentDir = process.cwd()

const fetchMCP = new MCPClient('fetch','uvx',['mcp-server-fetch'])
const fileMCP = new MCPClient('file','npx',["-y",
        "@modelcontextprotocol/server-filesystem",currentDir])

async function main() {
    // const agent = new Agent('openai/gpt-4o-mini',[fetchMCP, fileMCP])
    const agent = new Agent('deepseek-chat',[fetchMCP, fileMCP])
    await agent.init()
    const response = await agent.invoke(`爬取https://news.ycombinator.com/的内容，并总结后保存到${currentDir}的news.md文件中`)
    console.log(response)
}



main()