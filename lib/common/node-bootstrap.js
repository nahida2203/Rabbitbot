import fs from "node:fs/promises"
import path from "node:path"
import { createWriteStream } from "node:fs"
import http from "node:http"
import https from "node:https"
import { spawn } from "node:child_process"

const MIN_NODE_VERSION = "18.20.0"
const RELEASE_INDEX_URL = "https://nodejs.org/dist/index.json"
const NODE_RUNTIME_DIR = path.join(process.cwd(), ".runtime", "node")

function request(url, options = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const client = String(url).startsWith("https:") ? https : http
    const req = client.request(url, options, res => {
      const statusCode = res.statusCode || 0
      if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
        if (redirectCount >= 5) {
          reject(new Error(`请求重定向过多: ${url}`))
          return
        }
        const redirectUrl = new URL(res.headers.location, url).toString()
        res.resume()
        resolve(request(redirectUrl, options, redirectCount + 1))
        return
      }
      resolve(res)
    })
    req.once("error", reject)
    req.end()
  })
}

async function requestJson(url, headers = {}) {
  const res = await request(url, { headers })
  const statusCode = res.statusCode || 0
  if (statusCode < 200 || statusCode >= 300) {
    res.resume()
    throw new Error(`获取 JSON 失败: ${statusCode}`)
  }
  const chunks = []
  for await (const chunk of res) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

function parseVersion(version) {
  const normalized = String(version || "").trim().replace(/^v/, "")
  const [major = "0", minor = "0", patch = "0"] = normalized.split(".")
  return {
    raw: normalized,
    major: Number(major) || 0,
    minor: Number(minor) || 0,
    patch: Number((patch.match(/^\d+/)?.[0]) || 0),
  }
}

function compareVersion(a, b) {
  const A = parseVersion(a)
  const B = parseVersion(b)
  if (A.major !== B.major) return A.major - B.major
  if (A.minor !== B.minor) return A.minor - B.minor
  return A.patch - B.patch
}

function isNodeVersionSupported(version = process.versions?.node) {
  return compareVersion(version, MIN_NODE_VERSION) >= 0
}

function getEnvironmentInfo() {
  return {
    platform: process.platform,
    arch: process.arch,
    currentVersion: process.versions?.node || process.version?.replace(/^v/, "") || "0.0.0",
    minimumVersion: MIN_NODE_VERSION,
    runtimeDir: NODE_RUNTIME_DIR,
  }
}

function getNodeDistInfo(platform = process.platform, arch = process.arch) {
  const map = {
    win32: {
      x64: { ext: "zip", fileArch: "x64", releaseKey: "win-x64", binaryRelativePath: ["node.exe"] },
      arm64: { ext: "zip", fileArch: "arm64", releaseKey: "win-arm64", binaryRelativePath: ["node.exe"] },
    },
    linux: {
      x64: { ext: "tar.xz", fileArch: "x64", releaseKey: "linux-x64", binaryRelativePath: ["bin", "node"] },
      arm64: { ext: "tar.xz", fileArch: "arm64", releaseKey: "linux-arm64", binaryRelativePath: ["bin", "node"] },
    },
    darwin: {
      x64: { ext: "tar.gz", fileArch: "x64", releaseKey: "osx-x64", binaryRelativePath: ["bin", "node"] },
      arm64: { ext: "tar.gz", fileArch: "arm64", releaseKey: "osx-arm64-tar", binaryRelativePath: ["bin", "node"] },
    },
  }
  return map[platform]?.[arch] || null
}

async function fetchStableRelease(distInfo) {
  const releases = await requestJson(RELEASE_INDEX_URL, {
    "User-Agent": `Rabbit-NodeBootstrap/${process.versions?.node || "unknown"}`,
  })
  const stable = releases
    .filter(item => item?.lts && Array.isArray(item?.files))
    .find(item => item.files.includes(distInfo.releaseKey))
  if (!stable?.version) {
    throw new Error(`未找到适用于 ${process.platform}/${process.arch} 的稳定版 Node.js`)
  }
  return stable
}

async function fileExists(target) {
  try {
    await fs.stat(target)
    return true
  } catch {
    return false
  }
}

async function ensureDir(target) {
  await fs.mkdir(target, { recursive: true })
}

async function downloadToFile(url, targetFile) {
  const response = await request(url, {
    headers: {
      "User-Agent": `Rabbit-NodeBootstrap/${process.versions?.node || "unknown"}`,
    },
  })
  const statusCode = response.statusCode || 0
  if (statusCode < 200 || statusCode >= 300) {
    response.resume()
    throw new Error(`下载 Node.js 失败: ${statusCode}`)
  }
  await ensureDir(path.dirname(targetFile))
  await new Promise((resolve, reject) => {
    const stream = createWriteStream(targetFile)
    response.pipe(stream)
    response.once("error", reject)
    stream.once("error", reject)
    stream.once("finish", resolve)
  })
}

function spawnCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      windowsHide: true,
    })
    child.once("error", reject)
    child.once("exit", code => {
      if (code === 0) resolve()
      else reject(new Error(`命令执行失败: ${command} ${args.join(" ")} (${code})`))
    })
  })
}

async function extractArchive(archiveFile, extractDir, distInfo) {
  await ensureDir(extractDir)
  if (process.platform === "win32") {
    await spawnCommand("powershell", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -Path '${archiveFile.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force`,
    ], process.cwd())
    return
  }
  if (distInfo.ext === "tar.xz") {
    await spawnCommand("tar", ["-xJf", archiveFile, "-C", extractDir], process.cwd())
    return
  }
  if (distInfo.ext === "tar.gz") {
    await spawnCommand("tar", ["-xzf", archiveFile, "-C", extractDir], process.cwd())
    return
  }
  throw new Error(`不支持的压缩格式: ${distInfo.ext}`)
}

async function resolveInstalledNodeBinary(version) {
  const distInfo = getNodeDistInfo()
  if (!distInfo) return ""
  const installRoot = path.join(NODE_RUNTIME_DIR, `node-${version}-${process.platform}-${process.arch}`)
  const directBinary = path.join(installRoot, ...distInfo.binaryRelativePath)
  if (await fileExists(directBinary)) return directBinary

  const extractedRootName = `node-v${version}-${process.platform}-${distInfo.fileArch}`
  const nestedBinary = path.join(installRoot, extractedRootName, ...distInfo.binaryRelativePath)
  if (await fileExists(nestedBinary)) return nestedBinary
  return ""
}

async function installStableNodeRuntime() {
  const distInfo = getNodeDistInfo()
  if (!distInfo) {
    throw new Error(`当前环境暂不支持自动准备 Node.js: ${process.platform}/${process.arch}`)
  }

  const stable = await fetchStableRelease(distInfo)
  const version = stable.version.replace(/^v/, "")
  const existingBinary = await resolveInstalledNodeBinary(version)
  if (existingBinary) {
    return { version, nodeBinary: existingBinary, reused: true }
  }

  const fileName = `node-v${version}-${process.platform}-${distInfo.fileArch}.${distInfo.ext}`
  const downloadUrl = `https://nodejs.org/dist/v${version}/${fileName}`
  const downloadDir = path.join(NODE_RUNTIME_DIR, "downloads")
  const archiveFile = path.join(downloadDir, fileName)
  const installRoot = path.join(NODE_RUNTIME_DIR, `node-${version}-${process.platform}-${process.arch}`)

  await downloadToFile(downloadUrl, archiveFile)
  await extractArchive(archiveFile, installRoot, distInfo)

  const nodeBinary = await resolveInstalledNodeBinary(version)
  if (!nodeBinary) {
    throw new Error(`Node.js 已下载但未找到可执行文件: v${version}`)
  }

  return { version, nodeBinary, reused: false }
}

export async function ensureSupportedNodeRuntime() {
  const envInfo = getEnvironmentInfo()
  if (process.env.RABBIT_SKIP_NODE_BOOTSTRAP === "1") {
    return { ...envInfo, action: "skipped" }
  }
  if (process.env.RABBIT_NODE_BOOTSTRAPPED === "1") {
    return { ...envInfo, action: "already-bootstrapped" }
  }
  if (isNodeVersionSupported(envInfo.currentVersion)) {
    return { ...envInfo, action: "current-ok" }
  }

  const installed = await installStableNodeRuntime()
  return {
    ...envInfo,
    action: "reexec",
    targetVersion: installed.version,
    nodeBinary: installed.nodeBinary,
    reused: installed.reused,
  }
}

export async function reexecWithNodeRuntime(nodeBinary) {
  return new Promise((resolve, reject) => {
    const child = spawn(nodeBinary, process.argv.slice(1), {
      cwd: process.cwd(),
      stdio: "inherit",
      windowsHide: true,
      env: {
        ...process.env,
        RABBIT_NODE_BOOTSTRAPPED: "1",
      },
    })
    child.once("error", reject)
    child.once("exit", code => resolve(code ?? 0))
  })
}

export { MIN_NODE_VERSION, getEnvironmentInfo, isNodeVersionSupported }
