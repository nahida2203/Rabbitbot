import sys
import json
import importlib.util
import traceback
import os
import threading
import time
from queue import Queue

# 简单的行协议读写（主->子：stdin，子->主：stdout），采用逐行 JSON
lock = threading.Lock()


def send(msg):
    try:
        with lock:
            sys.stdout.write(json.dumps(msg, ensure_ascii=False) + "\n")
            sys.stdout.flush()
    except Exception as e:
        # 尽量将错误也写到 stderr
        sys.stderr.write(f"send error: {e}\n")
        sys.stderr.flush()


class PluginRuntime:
    def __init__(self):
        self.plugin = None
        self.plugin_id = os.environ.get('PLUGIN_ID')
        self.plugin_path = os.environ.get('PLUGIN_PATH')
        self.plugin_entry = os.environ.get('PLUGIN_ENTRY')
        self.plugin_config = {}
        self.protocol_version = os.environ.get('PLUGIN_PROTOCOL_VERSION') or '1.0.0'
        self.sdk_version = os.environ.get('PLUGIN_SDK_VERSION') or '1.0.0'
        self.capabilities = []
        self.permissions = []
        # 请求-响应等待表
        self._pending = {}
        self._pending_lock = threading.Lock()
        # 处理消息的队列与线程
        self._queue = Queue()
        self._processor = threading.Thread(target=self._process_loop, name="py-worker-processor", daemon=True)
        self._processor.start()
        # 默认超时（与主进程保持一致，默认为 30s）
        try:
            self.timeout_ms = int(os.environ.get('PLUGIN_TIMEOUT_MS') or 30000)
        except Exception:
            self.timeout_ms = 30000
        try:
            cfg = os.environ.get('PLUGIN_CONFIG')
            if cfg:
                self.plugin_config = json.loads(cfg)
        except Exception:
            self.plugin_config = {}
        try:
            caps = os.environ.get('PLUGIN_CAPABILITIES')
            if caps:
                self.capabilities = json.loads(caps)
        except Exception:
            self.capabilities = []
        try:
            perms = os.environ.get('PLUGIN_PERMISSIONS')
            if perms:
                self.permissions = json.loads(perms)
        except Exception:
            self.permissions = []

    def log(self, level, *args):
        send({"type": "log", "data": {"level": level, "args": [str(a) for a in args]}})

    # ---------------- 插件装载 ----------------
    def load(self):
        # 动态加载入口模块
        spec = importlib.util.spec_from_file_location("plugin_entry", self.plugin_entry)
        if spec is None:
            raise RuntimeError("无法创建模块 spec")
        module = importlib.util.module_from_spec(spec)
        loader = spec.loader
        if loader is None:
            raise RuntimeError("模块 loader 不存在")
        loader.exec_module(module)
        # 期望入口提供 Plugin 类或 plugin 对象
        if hasattr(module, 'Plugin'):
            self.plugin = module.Plugin(self.plugin_config)
        elif hasattr(module, 'plugin'):
            self.plugin = module.plugin
        else:
            raise RuntimeError("Python 插件入口需导出 Plugin 类或 plugin 实例")
        # 注入 runtime，便于插件内调用受限能力等
        try:
            setattr(self.plugin, 'runtime', self)
        except Exception:
            pass

    def get_names(self):
        events = []
        commands = []
        if hasattr(self.plugin, 'events') and isinstance(self.plugin.events, dict):
            events = list(self.plugin.events.keys())
        if hasattr(self.plugin, 'commands') and isinstance(self.plugin.commands, dict):
            commands = list(self.plugin.commands.keys())
        return events, commands

    # ---------------- 受限能力封装（同步等待主进程响应） ----------------
    def _request_and_wait(self, typ, payload):
        req_id = f"req_{int(time.time()*1000)}_{id(self)}_{os.getpid()}_{threading.get_ident()}"
        event = threading.Event()
        container = {"event": event, "result": None, "error": None}
        with self._pending_lock:
            self._pending[req_id] = container
        data = dict(payload or {})
        data["requestId"] = req_id
        send({"type": typ, "data": data})
        # 等待回包
        ok = event.wait(self.timeout_ms / 1000.0)
        with self._pending_lock:
            c = self._pending.pop(req_id, None)
        if not ok or not c:
            raise TimeoutError(f"等待能力响应超时: {typ}")
        if c.get("error"):
            raise RuntimeError(str(c.get("error")))
        return c.get("result")

    # 存储与 HTTP 便捷方法（插件内可通过 self.runtime.* 调用）
    def storage_get(self, key, cache_name='default'):
        return self._request_and_wait('storage-get', {"key": key, "cacheName": cache_name})

    def storage_set(self, key, value, options=None, cache_name='default'):
        return self._request_and_wait('storage-set', {"key": key, "value": value, "options": options or {}, "cacheName": cache_name})

    def storage_delete(self, key, cache_name='default'):
        return self._request_and_wait('storage-delete', {"key": key, "cacheName": cache_name})

    def http_get(self, url, options=None):
        return self._request_and_wait('http-get', {"url": url, "options": options or {}})

    def http_post(self, url, data=None, options=None):
        return self._request_and_wait('http-post', {"url": url, "data": data, "options": options or {}})

    # 发送消息能力：由主进程调用 Bot 实例发送（支持 Guild/频道）
    def send_message(self, message=None, message_type=None, bot_id=None, user_id=None, group_id=None,
                     quote_id=None, forward=None, image=None, file=None, guild_id=None, channel_id=None):
        payload = {
            "message": message,
            "messageType": message_type,
            "botId": bot_id,
            "userId": user_id,
            "groupId": group_id,
        }
        # 频道定位信息（存在则透传，由主进程组装 groupId）
        if guild_id is not None:
            payload["guild_id"] = guild_id
        if channel_id is not None:
            payload["channel_id"] = channel_id
        if quote_id is not None:
            payload["quoteId"] = quote_id
        if forward is not None:
            payload["forward"] = forward
        if image is not None:
            payload["image"] = image
        if file is not None:
            payload["file"] = file
        return self._request_and_wait('send-message', payload)

    # 新增：Bot 调用能力（受限白名单，支持 Guild/频道）
    def bot_call(self, scope, method, args=None, *, bot_id=None, user_id=None, group_id=None, guild_id=None, channel_id=None):
        """调用主进程的 Bot 对象或其派生对象的受限方法。
        - scope: 'bot' | 'friend'|'user' | 'group' | 'member'|'group-member'
        - method: 被调用的方法名，例如 'sendMsg'、'recall'、'poke' 等（受白名单限制）
        - args: 传给方法的位置参数列表
        - bot_id/user_id/group_id: 定位目标的辅助参数
        - guild_id/channel_id: 当 group_id 未提供时用于定位 Guild 子频道
        返回方法执行结果（若无返回值则为 True）。
        """
        payload = {
            "scope": scope,
            "method": method,
            "args": list(args or []),
            "botId": bot_id,
            "userId": user_id,
            "groupId": group_id,
        }
        # 频道定位信息（存在则透传，由主进程在缺失 groupId 时自动拼接）
        if guild_id is not None:
            payload["guild_id"] = guild_id
        if channel_id is not None:
            payload["channel_id"] = channel_id
        return self._request_and_wait('bot-call', payload)

    # 新增：segment 构造辅助（与JS端约定保持一致）
    class segment:
        @staticmethod
        def text(text):
            return text if isinstance(text, str) else str(text)

        @staticmethod
        def at(user_id):
            return {"type": "at", "qq": str(user_id)}

        @staticmethod
        def reply(message_id):
            return {"type": "reply", "id": str(message_id)}

        @staticmethod
        def image(file, name=None):
            # file可为本地路径或URL
            seg = {"type": "image", "file": file}
            if name:
                seg["name"] = name
            return seg

        @staticmethod
        def file(file, name=None):
            seg = {"type": "file", "file": file}
            if name:
                seg["name"] = name
            return seg

        @staticmethod
        def node(data):
            # data 为转发节点数组 [{message, nickname?, user_id?, time?}, ...]
            return {"type": "node", "data": data}

        # ===== 扩展的消息段类型 =====
        @staticmethod
        def face(id):
            # QQ表情/表情ID
            return {"type": "face", "id": id}

        @staticmethod
        def emoji(id_or_name):
            # 兼容可能的emoji定义（具体由适配层决定是否支持）
            return {"type": "emoji", "id": id_or_name, "name": id_or_name}

        @staticmethod
        def record(file, name=None):
            # 语音（oicq使用record类型）
            seg = {"type": "record", "file": file}
            if name:
                seg["name"] = name
            return seg

        @staticmethod
        def voice(file, name=None):
            # 语音的别名，映射为record
            return PluginRuntime.segment.record(file, name)

        @staticmethod
        def audio(file, name=None):
            # 语音的别名，映射为record
            return PluginRuntime.segment.record(file, name)

        @staticmethod
        def video(file, name=None):
            seg = {"type": "video", "file": file}
            if name:
                seg["name"] = name
            return seg

        @staticmethod
        def markdown(data):
            # md卡片/markdown富文本
            return {"type": "markdown", "data": data}

        @staticmethod
        def button(*data):
            # 自定义按钮；支持传入多个参数或单对象
            if len(data) == 1 and isinstance(data[0], (dict, list, tuple)):
                payload = data[0]
            else:
                payload = list(data)
            return {"type": "button", "data": payload}

        @staticmethod
        def raw(data):
            # 透传原始数据，由适配层决定如何处理
            return {"type": "raw", "data": data}

        @staticmethod
        def custom(type_name, data=None):
            # 自定义类型：例如 'ark'、'keyboard'、'xml'、'json' 等
            base = {"type": type_name}
            if isinstance(data, dict):
                base.update(data)
            elif data is not None:
                base["data"] = data
            return base

        @staticmethod
        def ark(data):
            # ark 卡片（具体字段依适配层/平台）
            return {"type": "ark", "data": data}

        @staticmethod
        def keyboard(data):
            # 自定义按钮/键盘布局
            return {"type": "keyboard", "data": data}

        @staticmethod
        def xml(data):
            return {"type": "xml", "data": data}

        @staticmethod
        def json(data):
            return {"type": "json", "data": data}

        @staticmethod
        def share(url, title=None, content=None, image=None):
            seg = {"type": "share", "url": url}
            if title is not None:
                seg["title"] = title
            if content is not None:
                seg["content"] = content
            if image is not None:
                seg["image"] = image
            return seg

    def reply(self, event, text=None, *, quote=True, at=False,
              forward=None, image=None, file=None,
              bot_id=None, user_id=None, group_id=None, message_type=None):
        """更顺手的回复工具，默认引用原消息。
        - event: toSafeArgs 传来的事件对象(dict 或具备属性的对象)
        - text: 文本或消息段，None 代表只发引用/媒体
        - quote: 是否引用回复（需要 event.message_id）
        - at: 是否 @ 用户（暂不在能力层处理，建议在 text 构建时自行包含）
        - forward: 转发节点数组，形如 [{"message": ["文本"], "nickname": "xx", "user_id": 123456, "time": 0}]
        - image: 图片路径/URL 或 {file/url,name}
        - file: 文件路径/URL 或 {file/url,name}
        - bot_id/user_id/group_id/message_type: 可覆盖从 event 中提取到的目标
        """
        # 从事件自动提取上下文
        ev = event or {}
        def _get(obj, key):
            if isinstance(obj, dict):
                return obj.get(key)
            return getattr(obj, key, None)
    
        message_type = message_type or _get(ev, 'message_type')
        bot_id = bot_id or _get(ev, 'self_id')
        group_id = group_id or _get(ev, 'group_id')
        user_id = user_id or _get(ev, 'user_id')
        quote_id = _get(ev, 'message_id') if quote else None
    
        return self.send_message(
            message=text,
            message_type=message_type,
            bot_id=bot_id,
            user_id=user_id,
            group_id=group_id,
            quote_id=quote_id,
            forward=forward,
            image=image,
            file=file,
        )

    # ---------------- 消息处理 ----------------
    def on_response(self, request_id, result, error):
        with self._pending_lock:
            c = self._pending.get(request_id)
        if c:
            c["result"] = result
            c["error"] = error
            c["event"].set()

    def submit(self, msg):
        # 非阻塞：将除 response 以外的消息提交到处理线程
        self._queue.put(msg)

    def _process_loop(self):
        while True:
            try:
                msg = self._queue.get()
                if msg is None:
                    break
                self._handle_control_message(msg)
            except Exception:
                err = traceback.format_exc()
                send({"type": "error", "data": err})

    def _handle_control_message(self, msg):
        t = msg.get('type')
        data = msg.get('data') or {}

        if t == 'init':
            try:
                self.load()
                events, commands = self.get_names()
                send({
                    "type": "loaded",
                    "data": {
                        "instance": {
                            "eventNames": events,
                            "commandNames": commands
                        },
                        "handshake": {
                            "pluginId": self.plugin_id,
                            "hostPluginId": self.plugin_id,
                            "sdkVersion": self.sdk_version,
                            "protocolVersion": self.protocol_version,
                            "client": {
                                "pluginId": self.plugin_id,
                                "sdkVersion": self.sdk_version,
                                "protocolVersion": self.protocol_version,
                                "capabilities": list(self.capabilities),
                                "permissions": list(self.permissions)
                            },
                            "grantedCapabilities": list(self.capabilities),
                            "grantedPermissions": list(self.permissions)
                        }
                    }
                })
            except Exception:
                err = traceback.format_exc()
                send({"type": "error", "data": err})
        elif t == 'start':
            def _run_start():
                try:
                    if hasattr(self.plugin, 'start'):
                        self.plugin.start()
                    send({"type": "started", "data": {}})
                except Exception:
                    err = traceback.format_exc()
                    send({"type": "error", "data": err})
            threading.Thread(target=_run_start, daemon=True).start()
        elif t == 'stop':
            def _run_stop():
                try:
                    if hasattr(self.plugin, 'stop'):
                        self.plugin.stop()
                    send({"type": "stopped", "data": {}})
                except Exception:
                    err = traceback.format_exc()
                    send({"type": "error", "data": err})
            threading.Thread(target=_run_stop, daemon=True).start()
        elif t == 'destroy':
            def _run_destroy():
                try:
                    if hasattr(self.plugin, 'destroy'):
                        self.plugin.destroy()
                    send({"type": "destroyed", "data": {}})
                except Exception:
                    err = traceback.format_exc()
                    send({"type": "error", "data": err})
            threading.Thread(target=_run_destroy, daemon=True).start()
        elif t == 'call':
            # {kind, name, args, callId}
            kind = data.get('kind')
            name = data.get('name')
            args = data.get('args') or []
            call_id = data.get('callId')

            def _invoke():
                try:
                    func = None
                    if kind == 'event':
                        if hasattr(self.plugin, 'events') and isinstance(self.plugin.events, dict):
                            func = self.plugin.events.get(name)
                    elif kind == 'command':
                        if hasattr(self.plugin, 'commands') and isinstance(self.plugin.commands, dict):
                            func = self.plugin.commands.get(name)
                    else:
                        func = getattr(self.plugin, name, None)
                    if callable(func):
                        result = func(*args)
                        send({"type": "call-result", "data": {"callId": call_id, "result": result}})
                    else:
                        raise RuntimeError(f"未找到可调用的处理器: {kind}:{name}")
                except Exception as e:
                    send({"type": "call-error", "data": {"callId": call_id, "error": str(e)}})
            threading.Thread(target=_invoke, daemon=True).start()
        else:
            # 未知消息直接忽略
            pass


runtime = PluginRuntime()


def read_loop():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except Exception:
            err = traceback.format_exc()
            send({"type": "error", "data": err})
            continue

        # response 类消息：唤醒等待者；其余交由处理线程
        t = msg.get('type')
        data = msg.get('data') or {}
        if t == 'response':
            req_id = data.get('requestId')
            runtime.on_response(req_id, data.get('result'), data.get('error'))
        else:
            runtime.submit(msg)


if __name__ == '__main__':
    try:
        read_loop()
    except KeyboardInterrupt:
        pass
    except Exception:
        err = traceback.format_exc()
        send({"type": "error", "data": err})