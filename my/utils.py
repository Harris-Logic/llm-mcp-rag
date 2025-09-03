import math
from colorama import init, Fore, Style

# 初始化 colorama（Windows 需要这个）
init()

def log_title(message: str):
    total_length = 80
    message_length = len(message)
    padding = max(0, total_length - message_length -4 )
    padding_message = f"{'=' * math.floor(padding/2)} {message} {'=' * math.ceil(padding/2)}"
    # print(f"{padding_message}")
    print(Fore.CYAN + Style.BRIGHT + padding_message + Style.RESET_ALL)