import asyncio
import os
from Agent import Agent
from MCPClient import MCPClient

current_dir = os.getcwd()

# 创建 MCP 客户端实例
fetch_mcp = MCPClient('fetch', 'uvx', ['mcp-server-fetch'])
file_mcp = MCPClient('file', 'npx', [
    "-y", "@modelcontextprotocol/server-filesystem", current_dir
])

async def main():
    # 创建 AI 代理，使用 deepseek-chat 模型
    agent = Agent('')
    await agent.init()

    # 执行任务
    response = await agent.invoke()
    print(response)

if __name__ == "__main__":
    asyncio.run(main())