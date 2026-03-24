<div align="center">

# Rabbit v0.0.1

A multi-account bot framework

支持多账号，支持协议端：OneBotv11、ComWeChat、GSUIDCore、ICQQ、QQBot、QQ频道、微信、KOOK、Telegram、Discord、OPQBot、Lagrange

</div>

## 项目说明

本项目 **Rabbit** 是一个以 `0.0.1` 版本发布的 Bot 框架。

- 当前版本：`0.0.1`
- 开发文档：[docs 分支](开发文档.md)


项目仅供学习交流使用，严禁用于任何商业用途和非法行为

<div align="left" style="margin:16px 0;padding:16px 18px;border:1px solid #e74c3c;background:#1e1e2f;border-radius:12px;box-shadow:0 2px 8px rgba(231,76,60,.15);">
  <div style="display:flex;gap:12px;align-items:flex-start;">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="#e74c3c" d="M1 21h22L12 2 1 21zm12-3h-2v2h2v-2zm0-8h-2v6h2V10z"/></svg>
    <div>
      <div style="font-weight:700;color:#ff9f9f;font-size:16px;">Caution · 安全提示</div>
      <p style="margin:8px 0 6px;color:#ffdede;">从 0.0.1 开始默认启用多项安全加固，请务必完成以下配置，否则可能导致 Bot/WebUI 暴露风险。</p>
      <ul style="margin:0 0 6px 18px;color:#ffffff;">
        <li>为 OneBot v11 反向 WS 设置 <code>ONEBOTV11_TOKEN</code>，并在 go-cqhttp / Lagrange.OneBot 等客户端配置 <code>access_token/AccessToken</code> 保持一致。</li>
        <li>不要将 WebUI/HTTP 直接暴露公网；默认仅绑定 <code>127.0.0.1</code>，如需远程访问请设置 <code>WEBUI_HOST</code> / <code>SERVER_HOST</code> 并配合反向代理与鉴权。</li>
        <li>如需跨站访问 API/WS，请显式设置 <code>API_ALLOWED_ORIGINS</code> 与 <code>WS_ALLOWED_ORIGINS</code> 白名单。</li>
        <li>反向代理必须透传 <code>/ws</code> 并转发 <code>X-Forwarded-For</code> 以保证真实来访 IP 校验与白名单生效。</li>
      </ul>
      <div style="font-size:12px;color:#ffb9b9;">详见下文“安全加固（0.0.1 默认启用）”。</div>
    </div>
  </div>
</div>

## Rabbit 0.0.1 更新内容

- 新一代核心（0.0.1）：采用组件化设计，提供初始化/销毁/重启流程与健康检查，并在日志中输出各组件生命周期信息，便于排障与日常运维（core、common 目录）。
- 插件引擎：
  - 并行扫描与加载、依赖检查、目录级热重载；支持 JS/TS 运行时与构建双通道，失败时自动回退（lib/plugins/plugin-engine.js）。
  - 内置令牌桶限流与熔断，统计调用耗时与错误率，防止问题插件拖垮核心（rateLimit 与 breaker 机制）。
  - 支持 Python 单文件插件 Worker 与沙箱开关，保证安全隔离（lib/plugins/python-worker.py、plugin-worker.js）。
- RFC 级 SDK/RPC 架构：
  - 插件宿主、Worker 线程、Python 子进程统一切换到基于消息的 RPC 协议，公共协议定义位于 `lib/plugins/rpc-protocol.js`，传输与请求响应匹配位于 `lib/plugins/rpc-transport.js`。
  - SDK 对外暴露的能力接口由 `lib/plugins/plugin-sdk.js` 统一生成，插件不再直接依赖宿主内部对象，而是通过受控能力集调用宿主方法，便于隔离、审计与后续协议演进。
  - 宿主端在插件加载后会主动完成一次 RFC 风格握手协商：插件上报 `sdkVersion`、协议版本、声明能力与权限，宿主返回最终授权的 `capabilities`、`permissions` 与握手元数据；握手结果会回写到插件实例元信息，供调试和运行期观测使用。
  - 能力注册与门控采用“声明权限 -> 宿主解析 -> 下发真实授权”的模式，避免插件通过伪造能力名越权访问；未授权调用会在 RPC 层被一致拒绝，而不是散落在各运行时中做不一致校验。
  - Worker 运行时与 Python 运行时已对齐同一套协议语义：二者都通过宿主统一处理能力请求、错误码、超时与返回格式，保证 JS 沙箱插件和 Python 插件在行为上尽可能一致。
  - 当前宿主已统一承接的核心能力包括存储、HTTP、消息发送、Bot 调用等，入口在 `plugin-engine.js` 的能力处理链中集中收敛，便于统计调用耗时、失败率与安全审计。
  - 对插件开发者而言，这意味着推荐通过 SDK API 与宿主交互，而不是假设某个运行时私有全局变量或直接访问主进程对象；后续兼容性将优先围绕 RFC 协议层保证。
  - 新架构下，插件声明的权限不会直接等于最终可用能力，宿主会根据能力注册表进行裁剪与授权；若插件出现“声明了权限但调用被拒绝”，请优先检查握手返回的最终 `capabilities/permissions`。
  - JS Worker 与 Python 插件现在共享统一的 RPC 语义，迁移时应避免分别为两种运行时维护两套调用约定；推荐将宿主交互收敛到统一 SDK 包装层，降低双运行时适配成本。

## 修复与兼容性

- 修复 server 配置 getter（lib/config/config.js）在设置 s.url 后返回字符串导致的类型不一致问题，现始终返回完整配置对象。
- WebUI/Socket.IO 路由规范化：后端对 /ws 做了专门透传处理，避免与 API 冲突；反代示例已同步（webui/docker）。

## 安全加固（0.0.1 默认启用）

- WebSocket 基础防护：
  - 若启用 HTTPS，强制仅允许 WSS 握手；对来源进行白名单校验（通过 WS_ALLOWED_ORIGINS 设置，支持逗号分隔，* 表示放行全部）；握手过于频繁时将返回 429（lib/bot.js）。
  - Socket.IO 固定使用路径 /ws，请在反向代理与防火墙放行该路径；后端对 /ws 的静态资源路由有特殊处理，避免与 API 冲突（lib/webui/webui-manager.js、webui 源码、lib/bot.js）。
- OneBot v11 反向 WS 防护：
  - 默认启用严格鉴权：本地回环放行，其它来源需提供有效的 ONEBOTV11_TOKEN 或命中 ONEBOTV11_TRUSTED_IPS；
  - 建议在 go-cqhttp/Lagrange.OneBot 等客户端同时配置 access_token/AccessToken 与 0.0.1 的 ONEBOTV11_TOKEN 一致。
- CORS/WS 白名单：
  - 未显式配置时，REST API 仅允许同源；建议按需设置 API_ALLOWED_ORIGINS 与 WS_ALLOWED_ORIGINS。
- 日志脱敏：
  - 0.0.1 对 Authorization/Token/Cookie 等字段默认脱敏，请避免在自定义日志中打印明文凭证。

## 配置与环境变量

- SERVER_HOST：服务监听地址，默认 127.0.0.1（仅本机）。
- SERVER_PORT / PORT：服务端口（默认见配置/日志），可与分片组合使用。
- WS_ALLOWED_ORIGINS：WebSocket Origin 白名单，逗号分隔；设置为 * 则放行全部。
- API_ALLOWED_ORIGINS：REST API 的 CORS 白名单，逗号分隔；不设置时仅允许同源。
- ONEBOTV11_PATH：OneBot v11 反向 WS 路径，默认 OneBotv11。
- ONEBOTV11_TOKEN：OneBot v11 反向 WS 连接令牌（建议设置）。
- ONEBOTV11_TRUSTED_IPS：OneBot v11 可信来源 IP 列表，逗号分隔。
- RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX：HTTP 基础限流窗口与最大请求数（默认 60 秒内 600 次）。
- VITE_WS_URL：前端在容器/反代中的 Socket.IO 连接地址（Docker 场景）。

提示：部署在反向代理后，请确保 /ws 已正确升级为 WebSocket，并转发 X-Forwarded-For 头部。

## 从云崽迁移到Rabbit bot（升级步骤与注意事项）

> 目的：帮助已有用户在确保安全的前提下，平滑升级到 0.0.1 内核与 WebUI。

一、升级前准备（强烈建议）
- 备份以下目录与文件（至少拷贝到安全位置）：
  - config/ 与其中的所有子文件（自定义配置、账号、pm2.yaml 等）。
  - data/ 与其子目录（数据库/缓存/图片等业务数据）。
  - plugins/ 中你自行添加或修改过的插件目录（第三方插件、私有插件）。
  - resources/、renderers/ 里自定义过的模板或资源。
  - logs/（可选，仅用于排障比对）。
- 清理旧版残留（可选但推荐）：
  - 检查根目录下历史脚本、未使用的插件目录，避免影响 0.0.1 的插件扫描与热重载。
  - 如从 云崽 直接覆盖升级，建议先将旧目录另存为 backup_YYYYMMDD，再全新部署 0.0.1，将上述备份项按需迁回。

二、获取 0.0.1 程序
- 建议准备 0.0.1 版本程序，然后安装依赖并首次启动生成默认结构：
  - git clone（或从镜像拉取）
  - pnpm i
  - node .（或 pnpm start）

三、迁移配置
- 将旧版的必要配置逐项迁移：
  - 账号与连接：将 OneBot 客户端地址/端口等信息迁入 0.0.1 对应配置；注意 0.0.1 默认仅监听 127.0.0.1。
  - 环境变量：0.0.1 引入了更严格的环境变量与默认值，请重点设置：
    - ONEBOTV11_PATH（如自定义路径）
    - ONEBOTV11_TOKEN（强烈建议设置）
    - ONEBOTV11_TRUSTED_IPS（如有网关/反代的内网段）
    - WS_ALLOWED_ORIGINS / API_ALLOWED_ORIGINS（如需跨域访问）
    - SERVER_HOST / SERVER_PORT / WEBUI_HOST（如需非本机访问）
  - 分片/端口：如使用多分片，0.0.1 端口可能随分片偏移，请根据实际配置调整。

四、迁移插件
- Rabbit 的插件引擎支持热重载与沙箱隔离，迁移时请注意：
  - 将第三方插件逐个迁入 plugins/，优先迁入活跃维护的版本。
  - 若插件包含本地二进制/脚本依赖，请在新环境重新安装依赖。
  - 个别旧插件可能依赖已废弃的接口，若加载报错，请根据控制台日志调整，或等待插件作者适配 Rabbit。
  - Python Worker 插件需确认是否开启沙箱/隔离开关后再迁入。
  - 若插件原先直接访问宿主内部对象、使用非标准线程消息格式，或依赖历史私有桥接 API，升级到 0.0.1 时建议迁移到新的 SDK/RPC 调用方式；优先以 `plugin-sdk.js` 暴露的能力接口和握手结果为准。
  - 新架构下，插件声明的权限不会直接等于最终可用能力，宿主会根据能力注册表进行裁剪与授权；若插件出现“声明了权限但调用被拒绝”，请优先检查握手返回的最终 `capabilities/permissions`。
  - JS Worker 与 Python 插件现在共享统一的 RPC 语义，迁移时应避免分别为两种运行时维护两套调用约定；推荐将宿主交互收敛到统一 SDK 包装层，降低双运行时适配成本。

五、WebUI 与反向代理
- Rabbit WebUI 使用 Socket.IO 固定路径 /ws：
  - 确保反向代理正确升级并透传 /ws，设置 proxy_read_timeout 等长连接项，并转发 X-Forwarded-For 头。
  - 前端若在容器/反代下与后端不同源，请设置 VITE_WS_URL 指向正确的 ws(s) 地址。

六、安全必读（与旧版差异）
- 默认绑定 127.0.0.1：旧版可能默认 0.0.0.0，0.0.1 为避免误暴露改为仅本机.
- OneBot v11 反向 WS：
  - 默认启用严格鉴权：本地回环放行，其它来源需提供有效的 ONEBOTV11_TOKEN 或命中 ONEBOTV11_TRUSTED_IPS；
  - 建议在 go-cqhttp/Lagrange.OneBot 等客户端同时配置 access_token/AccessToken 与 0.0.1 的 ONEBOTV11_TOKEN 一致.
- CORS/WS 白名单：
  - 未显式配置时，REST API 仅允许同源；建议按需设置 API_ALLOWED_ORIGINS 与 WS_ALLOWED_ORIGINS.
- 日志脱敏：
  - 0.0.1 对 Authorization/Token/Cookie 等字段默认脱敏，请避免在自定义日志中打印明文凭证.

七、验证与回退
- 验证：
  - 启动后确认日志无明显错误，WebUI 可登录，OneBot 客户端能成功握手并收发消息.
  - 在反向代理场景，使用外网与内网来源分别测试，确认白名单与 Token 生效.
- 回退：
  - 若出现兼容性问题，可停止 Rabbit，恢复备份目录到 云崽 并回滚依赖.


## 安装教程

<details><summary>脚本安装</summary>

-无.

</details>

<details><summary>手动安装</summary>

> 环境准备：Windows/Linux/MacOS/Android  
> [Node.js(>=v23.11)](https://nodejs.org), [Valkey](https://valkey.io), [Git](https://git-scm.com), [Chrome(可选)](https://google.cn/chrome)

1. Git Clone 项目

```sh
git clone 
cd 
```

2. 安装 [pnpm](https://pnpm.io/zh/installation) 和依赖

```sh
npm i -g pnpm
pnpm i
```

3. 前台运行

| 操作 | 命令 |
| ---- | ---- |
| 启动 | node . |
| 停止 | node . stop |
| 守护 | node . daemon |

4. 使用 [pm2](https://pm2.keymetrics.io) 后台运行

| 操作 | 命令 |
| ---- | ---- |
| 启动 | pnpm start |
| 停止 | pnpm stop |
| 日志 | pnpm log |

5. 开机自启

```sh
pnpm start
pnpm pm2 save
pnpm pm2 startup
```

</details>



## 使用教程

1. 安装插件(可选)


2. 启动协议端

3. 设置主人：发送 `#设置主人`，日志获取验证码并发送

## 插件作者：如何接入新 SDK/RPC

### 设计目标

- 新插件推荐通过 SDK 暴露的能力接口与宿主交互，而不是直接访问主进程对象、全局变量或私有桥接对象.
- JS Worker 插件与 Python 插件共享同一套宿主能力语义，便于在不同运行时之间保持行为一致.

### 核心文件

- `lib/plugins/rpc-protocol.js`：RPC 消息格式、协议版本、错误码.
- `lib/plugins/rpc-transport.js`：请求/响应匹配、方法注册、消息收发封装.
- `lib/plugins/plugin-sdk.js`：插件侧 SDK Client 与宿主侧 SDK Host.
- `lib/plugins/plugin-worker.js`：JS Worker 运行时接入与握手初始化.
- `lib/plugins/python-worker.py`：Python 子进程运行时与宿主能力桥接.
- `lib/plugins/plugin-engine.js`：宿主能力注册、权限解析、握手结果回写与统一能力处理.

### 推荐接入流程

1. 在插件元信息中声明你需要的 `capabilities` 与 `permissions`.
2. 在插件启动后，通过 SDK 调用 `meta.handshake()` 与宿主完成握手.
3. 读取握手结果中的 `grantedCapabilities` 与 `grantedPermissions`，不要假设声明即授权.
4. 仅通过 SDK 暴露的能力接口访问日志、事件、存储、HTTP、Bot 调用等宿主能力.
5. 对可能被拒绝的能力调用做好降级与错误处理，避免插件因未授权能力直接崩溃.

### 当前可用能力

`plugin-sdk.js` 当前已经内置并统一暴露以下能力常量：

- `logger`
- `events`
- `storage`
- `http`
- `bot`

对应 API 大致包括：

- `sdk.logger.*`
- `sdk.events.emit`
- `sdk.storage.get/set/delete`
- `sdk.http.get/post`
- `sdk.bot.sendMessage`
- `sdk.bot.call`

若插件未获得某项能力，SDK 会直接抛出 `PERMISSION_DENIED`，而不是静默失败。

### 握手与授权

插件启动后，建议第一时间执行一次握手：

```js
const meta = await sdk.meta.handshake()

console.log(meta.protocolVersion)
console.log(meta.grantedCapabilities)
console.log(meta.grantedPermissions)
```

握手响应里通常包含：

- 宿主 `sdkVersion`
- `protocolVersion`
- 插件上报的客户端信息
- 宿主最终授予的 `grantedCapabilities`
- 宿主最终授予的 `grantedPermissions`

插件应以这些返回值作为运行期真实授权依据。

### JS Worker 插件示例

下面是一个推荐的最小接入思路：

```js
export default class ExamplePlugin {
  constructor(config = {}) {
    this.config = config
  }

  async onLoad(ctx) {
    this.sdk = ctx?.sdk
    const meta = await this.sdk.meta.handshake()

    await this.sdk.logger.info('handshake ok', meta.grantedCapabilities)

    if (meta.grantedCapabilities.includes('storage')) {
      await this.sdk.storage.set('boot_time', Date.now())
    }
  }

  async onMessage(event) {
    if (!this.sdk.capabilities.includes('bot')) return

    await this.sdk.bot.sendMessage({
      message: 'pong',
      groupId: event.group_id,
      userId: event.user_id
    })
  }
}
```

实践建议：

- 不要把宿主对象缓存为“可任意调用的全局句柄”。
- 所有外部调用都走 SDK，便于协议升级和宿主统一审计。
- 启动阶段先握手，再决定启用哪些功能分支。

### Python 插件示例

Python 运行时同样支持通过统一桥接访问宿主能力。当前 `python-worker.py` 会将运行时注入到插件实例的 `runtime` 字段，可直接使用：

```python
class Plugin:
    def __init__(self, config=None):
        self.config = config or {}

    def on_load(self):
        self.runtime.log('info', 'python plugin loaded')
        self.runtime.storage_set('boot_time', 'ok')

    def on_message(self, event):
        group_id = event.get('group_id')
        user_id = event.get('user_id')
        self.runtime.send_message(
            message='pong',
            group_id=group_id,
            user_id=user_id,
            message_type='group'
        )
```

当前 Python 运行时已经统一支持的常用桥接包括：

- `runtime.log()`
- `runtime.storage_get/set/delete()`
- `runtime.http_get/http_post()`
- `runtime.send_message()`
- `runtime.bot_call()`

对于 Python 插件，建议同样遵循“只通过 runtime/SDK 暴露接口与宿主交互”的原则，不要直接假设主进程内部结构。

### 能力声明与迁移建议

- 旧插件若直接使用线程消息、子进程 stdin/stdout 私有格式，建议迁移到统一 RPC 方法名与 SDK 包装层。
- 旧插件若直接访问 Bot、缓存、HTTP 客户端实例，建议改为通过 `sdk.bot`、`sdk.storage`、`sdk.http` 访问。
- 若同一个插件同时维护 JS 与 Python 两个版本，建议将宿主交互抽象到同一层能力语义，避免分别维护两套协议。
- 如果某项能力在握手结果中未被授权，插件应主动禁用相关功能，而不是在运行中不断重试未授权调用。

### 调试建议

- 启动时打印一次握手结果，确认宿主实际授予的能力集合。
- 对 `PERMISSION_DENIED`、超时、RPC 返回错误码做分类处理，不要统一吞错。
- 优先检查插件声明权限、宿主授权结果与运行期调用的能力名是否一致。
- 如需定位运行时差异，可对比 JS Worker 与 Python 插件拿到的最终 `capabilities/permissions` 是否一致。

### 向后兼容建议

- 新功能优先基于 SDK/RPC 层扩展，避免继续引入新的私有桥接接口。
- 若必须兼容旧插件，可在插件内部保留一层适配器，把旧调用方式映射到新的 SDK API。
- 对外发布插件时，建议在 README 中明确声明所需能力和最低协议/SDK 版本。

## 班级群(¿

2. [开发者()]()
3. [机器人()]()

## 致谢

| Nickname | Contribution |
| -------- | ------------ |
| [Yunzai-Bot](https://github.com/Le-niao/Yunzai-Bot) | 乐神的 Yunzai-Bot |
| [Miao-Yunzai](https://github.com/yoimiya-kokomi/Miao-Yunzai) | 喵喵的 Miao-Yunzai |
| [TRSS-Yunzai](https://github.com/TimeRainStarSky/Yunzai) | 本项目基于 TRSS-Yunzai 魔改，感谢原作者 TimeRainStarSky 的贡献 |
