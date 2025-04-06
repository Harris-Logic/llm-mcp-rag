from Client from @modelcontextprotocol/sdk/client/index.js
from StdioClientTransport from @modelcontextprotocol/sdk/client/stdio.js
from SetLevelRequest, Tool from @modelcontextprotocol/sdk/types.js

class MCPClient:
    private mcp: Client
    private transport: StdioClientTransport | None = None
    private tools: list[Tool] = []
    private command: str
    private args: list[str]

    constructor(name: str, command: str, args: list[str], version: str = '1.0.0'):
        self.mcp = Client({name, version: version|'1.0.0'})
        self.command = command
        self.args = args

    # def __init__(self, name: str, command: str, args: list[str], version: str = '1.0.0'):
    #     self.mcp = Client({name, version})
    #     self.command = command
    #     self.args = args

    def async close(self):
        await self.mcp.close()

    def async init(self):
        await self.connectToServer()

    def gettools(self):
        return self.tools

    def async connectToServer(self):
        self.transport = StdioClientTransport({command: self.command, args: self.args})
        await self.mcp.connect(self.transport)
        self.tools = await self.mcp.listTools()