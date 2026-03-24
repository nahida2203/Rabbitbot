#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
示例 Python 插件（目录型）
注意：Yunzai 插件引擎的 Python Worker 期望插件入口导出 `Plugin` 类或 `plugin` 实例，
并且 commands / events 必须为「字典」类型，键为命令/事件名称，值为可调用的处理函数。
处理函数建议为同步函数（def），否则返回协程对象将不会被等待执行。
"""

import sys
from typing import Any, Dict


class Plugin:
    def __init__(self, config: Dict[str, Any] | None = None):
        # 基本信息
        self.name = "示例Python插件"
        self.version = "1.0.0"
        self.config = config or {}

        # 将命令与事件以「字典」形式暴露给引擎
        # 键为精确匹配到的命令/事件名，值为处理函数
        self.commands = {
            "#测试py": self.cmd_test_py,
            "#python测试": self.cmd_python_test,
        }
        self.events = {
            # 可选：提供 message 事件，若其他模块有通过事件总线分发，可在此处理
            "message": self.on_message,
        }

    # 事件处理（可选）
    def on_message(self, event: Dict[str, Any]):
        msg = (event or {}).get("msg", "")
        # 如果消息正好是其中一个命令，直接调用对应命令处理
        if msg in self.commands:
            return self.commands[msg](event)
        return None

    # 命令处理：必须为同步函数（def），Python Worker 使用线程异步调用，不会 await 协程
    def cmd_test_py(self, event: Dict[str, Any]):
        # 使用 runtime.reply 由主进程统一发送消息（推荐）
        try:
            self.runtime.reply(event, f"Python插件响应成功！插件名称：{self.name}，版本：{self.version}")
        except Exception:
            # 兜底：直接返回文本（通常不会被上层处理为消息，仅用于调试）
            return f"Python插件响应成功！插件名称：{self.name}，版本：{self.version}"
        return "ok"

    def cmd_python_test(self, event: Dict[str, Any]):
        try:
            self.runtime.reply(event, f"Python插件测试命令执行成功！当前Python版本：{sys.version}")
        except Exception:
            return f"Python插件测试命令执行成功！当前Python版本：{sys.version}"
        return "ok"