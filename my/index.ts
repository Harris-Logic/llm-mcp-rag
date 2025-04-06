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

import ChatOpenAI from "./chatOpenAI";
import MCPClient from "./MCPClient"

async function main(){
    const fetchMCP = new MCPClient('fetch','uvx',['mcp-server-fetch'])
    await fetchMCP.init()
    const tools = fetchMCP.gettools()
    console.log(tools)
    await fetchMCP.close()
}

main()