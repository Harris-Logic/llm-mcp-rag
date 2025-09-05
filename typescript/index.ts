import MCPClient from "./MCPClient";
import Agent from "./Agent";
import path from "path";

const URL = 'https://jsonplaceholder.typicode.com/todos/1'
const outPath = path.join(process.cwd(), 'src');
const TASK = `
Summarize the content of ${URL} and save it as a markdown file to ${outPath}. You can choose the file name.
`

async function main() {
    const fetchMCP = new MCPClient("mcp-server-fetch", "uvx", ['mcp-server-fetch']);
    const fileMCP = new MCPClient("mcp-server-file", "npx", ['-y', '@modelcontextprotocol/server-filesystem', outPath]);

    const agent = new Agent([fetchMCP, fileMCP], 'gpt-4o-mini', 'You are a helpful assistant.');
    await agent.init();
    await agent.invoke(TASK);
    await agent.close();
}

main()