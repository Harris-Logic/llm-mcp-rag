from ast import arg
import asyncio
from typing import Optional
from contextlib import AsyncExitStack

import json
# from model_context_protocol.client import Client\
# from mcp import client
# from mcp.client.stdio import 
from mcp import ClientSession, StdioServerParameters, Tool
from mcp.client.stdio import stdio_client
# from mcp.types import Tool

from rich import print as rprint
from utils.pretty import RICH_CONSOLE
from utils.info import PROJECT_ROOT_DIR
from utils.mcp_tools import PresetMcpTools

# from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv() # load environment variables from .env

class MCPClient:
    def __init__(
        self,
        name: str,
        command: str,
        args: list[str],
        version: str = "1.0.0"
    ) -> None:
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
        # self.anthropic 
        self.name = name
        self.version = version
        self.command = command
        self.args = args
        self.tools: list[Tool] = []

    async def init(self)-> None:
        await self.connect_to_server()
    
    async def cleanup(self)-> None:
        try:
            await self.exit_stack.aclose()
        except Exception:
            rprint("Error during MCP client cleanup, traceback and continue!")
            RICH_CONSOLE.print_exception()
            
    def get_tools(self) -> list[Tool]:
        return self.tools
    
    async def connect_to_server(
        self, 
        # server_script_path: str,
    ):
        # """Connect to an MCP server
        # Args:
        #     server_script_path: Path to the server script (.py or .js)
        # """
        # is_python = server_script_path.endswith('.py')
        # is_js = server_script_path.endswith('.js')
        # if not (is_python or is_js):
        #     raise ValueError("Server script must be a .py or .js file")

        # command = "python" if is_python else "node"
        server_params = StdioServerParameters(
            command=self.command,
            # args=[server_script_path],
            args=self.args
            # env=None
        )

        stdio_transport = await self.exit_stack.enter_async_context(stdio_client(server_params))
        self.stdio, self.write = stdio_transport
        self.session = await self.exit_stack.enter_async_context(ClientSession(self.stdio, self.write))

        await self.session.initialize()

        # List available tools
        response = await self.session.list_tools()
        tools = response.tools
        rprint("\nConnected to server with tools:", [tool.name for tool in tools])

    async def call_tool(self, name:str, params: dict[str, Any]):
        return await self.session.call_tool(name, params)

async def example() -> None:
    for mcp_tool in [
        PresetMcpTools.filesystem.append_mcp_params(f" {PROJECT_ROOT_DIR!s}"),
        PresetMcpTools.fetch,
    ]:
        rprint(mcp_tool.shell_cmd)
        mcp_client = MCPClient(**mcp_tool.to_common_params())
        await mcp_client.init()
        tools = mcp_client.get_tools()
        rprint(tools)
        await mcp_client.cleanup()


if __name__ == "__main__":
    asyncio.run(example())