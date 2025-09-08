#!/usr/bin/env python3
"""
测试 ChatOpenAI Python 实现的脚本
"""

import asyncio
import os
from dotenv import load_dotenv

# 确保环境变量已加载
load_dotenv()

# 检查必要的环境变量
if not os.getenv('OPENAI_API_KEY'):
    print("警告: OPENAI_API_KEY 环境变量未设置")
    print("请设置 OPENAI_API_KEY 环境变量或创建 .env 文件")

async def test_basic_chat():
    """测试基本的聊天功能"""
    try:
        from ChatOpenAI import ChatOpenAI
        
        print("创建 ChatOpenAI 实例...")
        chat_client = ChatOpenAI(
            model="gpt-3.5-turbo",
            system_prompt="你是一个有帮助的AI助手，请用中文回答",
            tools=[]
        )
        
        print("发送测试消息...")
        response = await chat_client.chat("你好！请介绍一下你自己。")
        
        print(f"\nAI回复: {response['content']}")
        
        # 显示消息历史
        print("\n消息历史:")
        for i, msg in enumerate(chat_client.get_messages()):
            role = msg['role']
            content_preview = msg['content'][:100] + "..." if len(msg['content']) > 100 else msg['content']
            print(f"{i}. {role}: {content_preview}")
            
        print("\n测试完成！")
        
    except ImportError as e:
        print(f"导入错误: {e}")
        print("请确保 ChatOpenAI.py 文件存在且路径正确")
    except Exception as e:
        print(f"测试过程中出现错误: {e}")

async def test_message_management():
    """测试消息管理功能"""
    try:
        from ChatOpenAI import ChatOpenAI
        
        print("\n测试消息管理功能...")
        chat_client = ChatOpenAI(
            model="gpt-3.5-turbo",
            system_prompt="你是一个数学助手",
            tools=[]
        )
        
        # 测试消息添加
        print("初始消息数量:", len(chat_client.get_messages()))
        
        # 发送消息
        await chat_client.chat("2 + 2 等于多少？")
        print("发送消息后消息数量:", len(chat_client.get_messages()))
        
        # 测试清空消息（但保留系统提示）
        chat_client.clear_messages()
        print("清空消息后数量:", len(chat_client.get_messages()))
        
        print("消息管理测试完成！")
        
    except Exception as e:
        print(f"消息管理测试错误: {e}")

if __name__ == "__main__":
    print("开始测试 ChatOpenAI Python 实现")
    print("=" * 50)
    
    # 运行测试
    asyncio.run(test_basic_chat())
    asyncio.run(test_message_management())
    
    print("\n所有测试完成！")
