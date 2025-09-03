from ast import arg
import asyncio
import json
# from model_context_protocol.client import Client\
from mcp import client
# from mcp.client.stdio import 
from mcp import ClientSession, StdioServerParameters, Tool
from mcp.client.stdio import stdio_client
# from mcp.types import Tool

from typing import Optional
from contextlib import AsyncExitStack
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
    ):
        # self.mcp = client(name=name, version=version)
        self.session: 
        self.transport = None
        self.tools: list[Tool] = []
        self.command = command
        self.args = args

    async def close(self):
        """清理资源，关闭与服务器的连接"""
        await self.mcp.

    async def init(self):
        """公开的初始化方法，启动服务器连接"""
        await self.__connect_to_server()
