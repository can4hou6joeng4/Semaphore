<div align="center">
  <img src="docs/images/logo.svg" width="120" alt="Semaphore logo" />
  <h1>Semaphore</h1>
  <p><em>把任何图片,变成一面字符旗语。</em></p>
</div>

<p align="center">
  <img src="docs/images/statusline.svg" alt="semaphore v1.0.0 · MIT · TypeScript strict · Vite 8 · 0 upload" />
</p>

<p align="center"><a href="https://semaphore.bobochang.cn"><strong>semaphore.bobochang.cn</strong></a> — 免费 · 无上传 · 无账号,全程在你的浏览器里完成</p>

![Semaphore hero](docs/images/hero.png)

## 为什么叫 Semaphore

Semaphore(旗语)是水手的通信术:不借助电报与网络,只靠一双手、两面旗,把消息拆成一个个字符打给远方。这个工具做的是同一件事——把一张图片拆成一个个字符,让它能去往任何纯文本能到达的地方:终端、代码注释、README、聊天窗口。[Harbor](https://github.com/can4hou6joeng4/Harbor) 停泊知识,[Beacon](https://github.com/can4hou6joeng4/Beacon) 预警风险,[Atlas](https://github.com/can4hou6joeng4/Atlas) 丈量航程,**Semaphore** 把图像打成旗语。

## 上手即见

落地页的照片会在你眼前被逐字符"擦"成 ASCII;工具页则是完整的转换工作台:

![转换工具](docs/images/tool.png)

## 快速开始

打开 [semaphore.bobochang.cn/tool](https://semaphore.bobochang.cn/tool),把图片拖进去,就这么简单——没有注册、没有排队、没有水印。转出来的字符画可以:

- **复制纯文本**,粘进终端、代码注释、聊天窗口
- 下载 **`.txt`**(原始字符)或 **`.png`**(带主题渲染的位图)
- 生成一张**分享卡片**,附带转换参数

## 字符集一览

六套字符集对应六种质感,梯度从暗到亮(引擎按亮度逐格映射):

| 字符集 | 梯度 | 适合 |
|---|---|---|
| `standard` | ` .:-=+*#%@` | 经典缩略,兼容一切等宽场景 |
| `detailed` | 70 级灰阶(` .'^",:;Il!i~+…#MW&8%B@$`) | 人像与照片 |
| `blocks` | ` ░▒▓█` | 像素风、低分辨率海报 |
| `minimal` | ` .:*#` | 极简 logo、小尺寸头像 |
| `binary` | ` 01` | 赛博朋克、代码雨质感 |
| `braille` | 盲文 2×4 点阵 + 抖动 | 同宽度下 8 倍像素密度,细节之王 |

## 隐私

图片用 `<canvas>` 在本地逐像素采样,转换、渲染、导出全部发生在你的浏览器进程里。本站没有后端接口、没有统计脚本、不设 Cookie——关掉标签页,一切了无痕迹。

## 致谢

- 示例照片来自 [Wikimedia Commons](https://commons.wikimedia.org)(公有领域 / CC0)
- 等宽字体 [JetBrains Mono](https://www.jetbrains.com/lp/mono/)
- 托管于 [Cloudflare Pages](https://pages.cloudflare.com)

## 功能

- 🖼️ **拖入即转**:PNG / JPG / WebP / GIF,拖进浏览器立刻出结果
- 🔒 **绝不上传**:Canvas 逐像素采样,数据不离开你的设备
- ✳️ **六套字符集**:从经典明暗梯度到盲文点阵(Braille 抖动)
- 🎛️ **实时调参**:列数、亮度、对比度、反相、绿光 / 灰度 / 原色
- 📤 **多种导出**:复制纯文本、下载 `.txt` / `.png`、生成分享卡片
- 📟 **CRT 终端美学**:扫描线、辉光,整站就是一台绿光终端

## 工作原理

```text
  图片 ──▶ Canvas 采样 ──▶ 亮度矩阵 ──▶ 字符映射 ──▶ ASCII
           (cover 裁切)     (逐格平均)    (梯度/盲文)     └─▶ .txt / .png / 分享卡
```

## 技术栈

Vite 8 · TypeScript 7(strict)· 原生 DOM,零框架 · Cloudflare Pages

## 本地开发

```bash
npm install
npm run dev        # 开发服务器
npm run build      # 类型检查 + 产物构建到 dist/
npm run preview    # 预览构建产物
```

页面结构:`index.html`(落地页)/ `tool.html`(转换工具)/ `usecases.html` / `faq.html`,页面行为在 `src/main-*.ts` 入口;转换引擎在 `src/ascii-engine.ts`,分享卡在 `src/sharecard.ts`,设计令牌见 `STYLEGUIDE.md`。

## License

[MIT](LICENSE)
