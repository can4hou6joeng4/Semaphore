<div align="center">
  <img src="docs/images/logo.svg" width="120" alt="Semaphore logo" />
  <h1>Semaphore</h1>
  <p><em>🚩 在浏览器里把任意图片打成字符旗语 —— 不上传,不注册。</em></p>
</div>

<p align="center">
  <a href="https://github.com/can4hou6joeng4/Semaphore/actions/workflows/deploy.yml?branch=main"><img src="https://img.shields.io/github/actions/workflow/status/can4hou6joeng4/Semaphore/deploy.yml?branch=main&style=for-the-badge" alt="Build status"></a>
  <a href="https://github.com/can4hou6joeng4/Semaphore/releases"><img src="https://img.shields.io/github/v/release/can4hou6joeng4/Semaphore?include_prereleases&style=for-the-badge" alt="GitHub release"></a>
  <a href="https://github.com/can4hou6joeng4/Semaphore/stargazers"><img src="https://img.shields.io/github/stars/can4hou6joeng4/Semaphore?style=for-the-badge" alt="Stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="License"></a>
  <a href="https://semaphore.bobochang.cn"><img src="https://img.shields.io/badge/live-open-2ea44f?style=for-the-badge" alt="Live site"></a>
</p>

<p align="center"><a href="README.md">English</a> · 简体中文</p>

![Semaphore hero](docs/images/hero.gif)

## 功能

- **拖入即转**:PNG / JPG / WebP / GIF 拖进浏览器,即可在本地实时预览并调节字符画
- **绝不上传**:像素在本地 `<canvas>` 上采样,线上还下发 `connect-src 'none'`,页面**根本无法**往外发请求
- **六套字符集**:从经典亮度梯度到**抖动 2×4 盲文点阵**,同宽度下 8 倍像素密度
- **实时调参**:列数、亮度、对比度、反色,以及绿 / 灰度 / 原色三种配色——**每帧重新转换**
- **多种导出**:复制纯文本、下载 `.txt` 或 `.png`,或生成一张带参数的**分享卡**
- **CRT 终端质感**:扫描线、荧光辉光、vim 状态栏——**整个站点就是一台终端**

## 快速开始

打开 **[semaphore.bobochang.cn/tool](https://semaphore.bobochang.cn/tool)** 拖一张图进去,就这样。不用注册,不排队,没有水印。需要保留照片细节时,可以先看[图片转盲文 ASCII 指南](https://semaphore.bobochang.cn/charsets/braille),再使用预设直接转换。

想自己跑:

```bash
git clone https://github.com/can4hou6joeng4/Semaphore.git
cd Semaphore
npm install
npm run dev        # 开发服务器
```

```bash
npm test           # 单元测试(vitest)
npm run build      # 类型检查 + 构建到 dist/
npm run preview    # 预览构建产物
```

## 字符集

六套字符集,六种质感——每条梯度都是暗到亮,引擎按亮度映射每个字符格:

| 字符集 | 梯度 | 适合 |
|---|---|---|
| `standard` | ` .:-=+*#%@` | 经典款,在任何等宽环境都稳 |
| `detailed` | 70 级灰阶(` .'^",:;Il!i~+…#MW&8%B@$`) | 人像与照片 |
| `blocks` | ` ░▒▓█` | 像素画、低分辨率海报 |
| `minimal` | ` .:*#` | 极简 logo、小尺寸头像 |
| `binary` | ` 01` | 赛博朋克、代码雨质感 |
| [`braille`](https://semaphore.bobochang.cn/charsets/braille) | 盲文 2×4 点阵 + 抖动 | 同宽度下 8 倍像素密度,细节之王 |

## 隐私

图片用 `<canvas>` 在本地逐像素采样,转换、渲染、导出全部发生在你的浏览器进程里。本站没有后端接口、**页面里没有统计脚本**、不设 Cookie,也没有任何第三方请求——字体同样是自托管的。

这不只是承诺,而是强制约束:线上页面下发 `Content-Security-Policy: … connect-src 'none'`,页面**无法**向任何地址发起 fetch / XHR / WebSocket(客户端分析 beacon 会被故意拦住)。打开 devtools 看着 network 面板保持沉默,然后关掉标签页——图片从未离开过这台设备。

运营者仍能在 Cloudflare Pages 上看到**边缘侧的聚合请求计数**(哪些路径被访问过)。那是静态文件自身的 HTTP 流量,不是浏览器再打一次外线,更不包含图片字节。详见 [FAQ](https://semaphore.bobochang.cn/faq)。

## 工作原理

```text
  图片 ──▶ canvas 采样 ──▶ 亮度网格 ──▶ 字符映射 ──▶ ASCII
           (cover 裁剪)    (逐格均值)   (梯度/盲文)    └─▶ .txt / .png / 分享卡
```

Vite 8 · TypeScript 7(strict)· 原生 DOM,零框架 · Cloudflare Pages。

页面都在仓库根目录——`index.html`(落地页)、`tool.html`(转换器)、`usecases.html`、`faq.html`,各页行为在 `src/main-*.ts` 入口里。转换引擎是 `src/ascii-engine.ts`,分享卡是 `src/sharecard.ts`,设计契约见 [STYLEGUIDE.md](STYLEGUIDE.md)。仓库维护规则,以及那些光看代码看不出来的坑,记在 [AGENTS.md](AGENTS.md)。

## 为什么叫 "Semaphore"

Semaphore 是水手隔水通话的方式:没有电报,没有网络,只有一双手臂和两面旗子,把一句话一个字符一个字符地打向远处。这个工具对图片做同样的事——把图像拆成字符,于是它能去到任何纯文本能去的地方:终端、代码注释、README、聊天窗口。

[Harbor](https://github.com/can4hou6joeng4/Harbor) 收容知识,[Beacon](https://github.com/can4hou6joeng4/Beacon) 预警风险,[Atlas](https://github.com/can4hou6joeng4/Atlas) 记录航程——**Semaphore** 打出图像的旗语。

![转换工具](docs/images/tool.webp)

## 致谢

- 示例照片来自 [Wikimedia Commons](https://commons.wikimedia.org)(公有领域 / CC0)
- 等宽字体 [JetBrains Mono](https://www.jetbrains.com/lp/mono/)——自托管的 15 KB 可变子集([SIL OFL 1.1](public/fonts/OFL.txt))
- 托管于 [Cloudflare Pages](https://pages.cloudflare.com)

## 支持

- 如果 Semaphore 帮你省下了一趟"先上传再转换"的路,点个 star 或者[分享出去](https://twitter.com/intent/tweet?url=https://github.com/can4hou6joeng4/Semaphore&text=Semaphore%20-%20turn%20any%20image%20into%20ASCII%20art%2C%20right%20in%20your%20browser.)。
- 发现 bug,或者想要一套还不存在的字符集?[提个 issue](https://github.com/can4hou6joeng4/Semaphore/issues/new/choose)——先看一眼 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 提问和想法请走 [Discussions](https://github.com/can4hou6joeng4/Semaphore/discussions)。

## 许可证

Semaphore 以 MIT 开源,见 [LICENSE](LICENSE)。你用它做出来的字符画归你自己——海报、README、周边、商业项目,随便用。
