import os
from typing import List, Dict, Any, Optional, AsyncIterator
from dataclasses import dataclass
from openai import OpenAI, AsyncOpenAI
from dotenv import load_dotenv
from .utils import log_title

# 加载环境变量
load_dotenv()

@dataclass
class ToolCall:
    """工具调用接口 - 表示AI模型调用的工具"""
    id: str  # 工具调用的唯一标识符
    function: Dict[str, str]  # 函数调用信息

class ChatOpenAI:
    """OpenAI聊天客户端类 - 封装与OpenAI API的交互，支持工具调用和流式响应"""
    
    def __init__(self, model: str, system_prompt: str = '', tools: List[Dict] = None, context: str = ''):
        """
        构造函数 - 初始化ChatOpenAI实例
        
        Args:
            model: 模型名称 (如 "gpt-4", "gpt-3.5-turbo")
            system_prompt: 系统提示词，用于设置AI的行为和角色
            tools: 可用工具列表，用于函数调用
            context: 初始上下文信息
        """
        self.llm = OpenAI(
            api_key=os.getenv('OPENAI_API_KEY'),
            base_url=os.getenv('OPENAI_BASE_URL'),
        )
        self.async_llm = AsyncOpenAI(
            api_key=os.getenv('OPENAI_API_KEY'),
            base_url=os.getenv('OPENAI_BASE_URL'),
        )
        self.model = model
        self.tools = tools or []
        self.messages: List[Dict[str, Any]] = []
        
        # 如果有系统提示，添加到消息历史中
        if system_prompt:
            self.messages.append({"role": "system", "content": system_prompt})
        
        # 如果有上下文信息，添加到消息历史中
        if context:
            self.messages.append({"role": "user", "content": context})
    
    async def chat(self, prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        发送聊天消息并获取AI响应
        
        Args:
            prompt: 用户输入的消息内容（可选，如果不提供则继续之前的对话）
            
        Returns:
            包含响应内容和工具调用信息的对象
        """
        log_title('CHAT')
        
        # 如果有用户提示，添加到消息历史中
        if prompt:
            self.messages.append({"role": "user", "content": prompt})
        
        # 创建流式聊天完成请求
        stream = await self.async_llm.chat.completions.create(
            model=self.model,
            messages=self.messages,
            stream=True,
            tools=self._get_tools_definition(),
        )
        
        content = ""
        tool_calls: List[ToolCall] = []
        
        log_title('RESPONSE')
        
        # 处理流式响应的每个数据块
        async for chunk in stream:
            if not chunk.choices:
                continue
                
            delta = chunk.choices[0].delta
            
            # 处理普通文本内容
            if delta.content:
                content_chunk = delta.content or ""
                content += content_chunk
                print(content_chunk, end="", flush=True)
            
            # 处理工具调用
            if delta.tool_calls:
                for tool_call_chunk in delta.tool_calls:
                    # 如果是新的工具调用索引，创建一个新的工具调用对象
                    if len(tool_calls) <= tool_call_chunk.index:
                        tool_calls.append(ToolCall(
                            id="", 
                            function={"name": "", "arguments": ""}
                        ))
                    
                    current_call = tool_calls[tool_call_chunk.index]
                    
                    # 累积工具调用的各个部分
                    if tool_call_chunk.id:
                        current_call.id += tool_call_chunk.id
                    if tool_call_chunk.function and tool_call_chunk.function.name:
                        current_call.function["name"] += tool_call_chunk.function.name
                    if tool_call_chunk.function and tool_call_chunk.function.arguments:
                        current_call.function["arguments"] += tool_call_chunk.function.arguments
        
        # 将助手的响应添加到消息历史中
        assistant_message: Dict[str, Any] = {
            "role": "assistant", 
            "content": content
        }
        
        # 如果有工具调用，添加到消息中
        if tool_calls:
            assistant_message["tool_calls"] = [
                {
                    "id": call.id,
                    "type": "function",
                    "function": call.function
                }
                for call in tool_calls
            ]
        
        self.messages.append(assistant_message)
        
        # 返回响应内容和工具调用信息
        return {
            "content": content,
            "tool_calls": tool_calls
        }
    
    def append_tool_result(self, tool_call_id: str, tool_output: str):
        """
        添加工具调用结果到消息历史
        
        Args:
            tool_call_id: 工具调用的ID
            tool_output: 工具执行的结果
        """
        self.messages.append({
            "role": "tool",
            "content": tool_output,
            "tool_call_id": tool_call_id
        })
    
    def _get_tools_definition(self) -> List[Dict]:
        """
        获取工具定义 - 将工具列表转换为OpenAI API所需的格式
        
        Returns:
            格式化后的工具定义数组
        """
        tools_def = []
        
        for tool in self.tools:
            # 确保有合理的默认值
            input_schema = tool.get("inputSchema", {
                "type": "object",
                "properties": {},
                "required": []
            })
            
            tools_def.append({
                "type": "function",
                "function": {
                    "name": tool.get("name", ""),
                    "description": tool.get("description", ""),
                    "parameters": input_schema,
                }
            })
        
        return tools_def
    
    def get_messages(self) -> List[Dict]:
        """获取当前的消息历史"""
        return self.messages
    
    def clear_messages(self):
        """清空消息历史"""
        self.messages = []
        
        # 重新添加系统提示（如果有）
        system_prompt = next((msg["content"] for msg in self.messages if msg["role"] == "system"), None)
        if system_prompt:
            self.messages.append({"role": "system", "content": system_prompt})

# 示例用法
if __name__ == "__main__":
    import asyncio
    
    async def main():
        # 创建聊天客户端
        chat_client = ChatOpenAI(
            model="gpt-3.5-turbo",
            system_prompt="你是一个有帮助的AI助手",
            tools=[]  # 可以添加工具定义
        )
        
        # 发送消息
        response = await chat_client.chat("你好！")
        print(f"\nAI回复: {response['content']}")
        
        # 显示消息历史
        print("\n消息历史:")
        for i, msg in enumerate(chat_client.get_messages()):
            print(f"{i}. {msg['role']}: {msg['content'][:50]}...")
    
    asyncio.run(main())
