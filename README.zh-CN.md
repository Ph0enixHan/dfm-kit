# dfm-kit

[English](./README.md) | **简体中文**

**面向代码驱动视频的零风格预设 Design-for-Motion 导演工具箱：OKLCH 色彩脚本引擎、13 组电影光学镜头箱、极速单板视觉显微镜与全时间轴防崩溃质检。**

> **核心理念**：把“画什么风格”的自由 100% 还给内容和创作者（2D 矢量、Canvas 手绘、WebGL、3D 微距界面、印刷拼贴、暗房光学或动态排版统统不限）。零固定视觉模板、零风格锁死、零 `npm install` 外部依赖。

---

## 渲染引擎支持

`dfm-kit` 定位为**跨渲染器的动态设计工艺与审片层**：

| 目标引擎 | 当前状态 | 说明 |
| :--- | :--- | :--- |
| **[OpenFilm](https://openfilm.dev)** | **已内置支持** | 确定性 `window.film.frame(t)`、`dfm to-openfilm`、Studio Skill 一键安装与原生 CC0 音效流 |
| **Hyperframes** | **规划中** | 渲染适配器与确定性时间轴桥接 |
| **Remotion** | **规划中** | React 合成帧检查器与 Q1–Q16 视觉质检适配器 |

---

## 为什么需要 `dfm-kit`？

AI 生成的动效视频常常带有明显的“PPT 感”：明暗发灰发平、廉价软件默认配色、角落分页页码与小数字眉标、和原生字幕撞车的双字幕，或者在某个边缘帧静默抛异常导致画面缺失。

`dfm-kit` 用 **5 块完全正交、零依赖的开源基础设施**系统性解决这些问题（仅需本机 **Node 22+** 与 Chrome/Edge）：

1. **极速 1 板视觉显微镜（`dfm check`）** — 仅需 ~2–6 秒即可渲染 **1 张高信息密度 `review-board.png`**，一张图看全英雄帧、黑白明度分离（`ΔVal`）、3 帧动效连拍（`MOTION Δ`）、全片与单镜电影色带（Movie Color Barcode）以及安全区越界框（需要 5 张独立高清分板时加 `--full`）。
2. **全时间轴防崩溃扫帧 + Q1–Q16 质检（`dfm audit`）** — 每次审片自动以 `0.25s` 步长扫完整个时间轴的 `frame(t)`，提前拦截隐藏运行时异常；同时自动检测确定性驱动、GPU 性能、黑白对比度、纯净银幕画幅（拦截 PPT 页码与小数字章节眉标）以及单轨字幕冲突（当挂载了原生 `.vtt` 字幕轨时自动拦截画面内重复手画的口播整句）。
3. **OKLCH 电影色彩脚本提取器（`dfm palette`）** — 从任意电影剧照、海报或色卡一键提取 OKLCH 色彩角色、60-30-10 饱和度分布、`*-palette.png` 色卡图与可直接引用的 `*-theme.css`。
4. **按需引入的电影光学与质感工具箱（`runtime/`）**：
   - `dfm-time.js` — 确定性时间与严格 `[0, 1]` 端点保护缓动（杜绝浮点负零点坑）、`defineShot()`、`seg()`、`hash()`、`lerpColor()`
   - `dfm-craft.css` — 零素材程序化胶片颗粒、半调网点、Halation 红晕、纸张纤维、暗角与扫描线
   - `dfm-lens.js` — 13 组直接作用于 DOM/SVG 的电影光学滤镜与机位工具（`fisheye` 鱼眼、`motionBlur` 方向动态模糊、`rgbSplit` 色散、`flutedGlass` 长虹玻璃、`tiltShift` 移轴、`anamorphicFlare` 变形宽银幕拉丝、`filmBurn` 胶片烧灼、`stepTime` 抽帧定格、`handheld`、`impactShake`、`gateWeave`、`dollyZoom`、`crashZoom`）
5. **可移植的 AI 导演 Skill（`skill/SKILL.md`）** — 一条命令即可装入 OpenFilm Studio 或其他 Agent 技能目录，并自动绑定本机仓库路径。

---

## 快速上手

### 环境要求
- **Node.js >= 22**（使用内置 `WebSocket` 与 `http`，**无需 `npm install`**）
- **Google Chrome** 或 **Microsoft Edge**（用于无头 CDP 渲染；可用环境变量 `DFM_BROWSER` 指定路径）
- **FFmpeg**（可选，仅在使用 `dfm preview` 或 `cli/textures-prep.mjs` 时需要）

### 1. 克隆并一键安装 Skill
```bash
git clone https://github.com/Ph0enixHan/dfm-kit.git
cd dfm-kit
node cli/dfm.mjs install-skill
```
该命令会自动将 `skill/SKILL.md` 写入本机 OpenFilm Studio 的 `Skills/dfm-kit/` 目录（也可通过 `DFM_OPENFILM_SKILLS` 或命令行参数指定任意技能目录），并自动绑定本地仓库路径。

### 2. 用 AI 导演成片
在你的项目里调用 `dfm-kit` 技能并描述视频内容（可选附带参考剧照或色卡），AI 会自动完成：
1. 提取参考配色（如有）并撰写零风格限制的 `brief.json` 导演简报
2. 优先采用单文件 `scene.html` + 时间轴文件（如 `film.html`）构建确定性动态画面
3. 运行 `dfm check`（~2–6 秒）查看 `review-board.png` 与 Q1–Q16 报告，并用 1–2 秒的 `dfm snap` 局部精修
4. 装配精准卡点的音效与克制配乐

---

## 全部 CLI 命令速查

| 命令 | 作用 |
| :--- | :--- |
| `node cli/dfm.mjs check <目录> [--full]` | 默认生成极速单板 `review-board.png` + 0.25s 全轴扫帧 + Q1–Q16 质检（`--full` 输出 5 张高清分板） |
| `node cli/dfm.mjs snap <html文件> <t1,t2,...>` | 1–2 秒指定时间点快查（输出 `dfm-out/snap.png` 与安全区数据） |
| `node cli/dfm.mjs palette <图片> [输出目录]` | 从剧照/色卡自动提取 OKLCH 色彩脚本、色卡图与 CSS 变量 |
| `node cli/dfm.mjs install-skill [技能目录]` | 一键安装 `dfm-kit` Skill 并绑定本地路径 |
| `node cli/dfm.mjs to-openfilm <目录> [草稿名]` | 将外部开发项目打包同步进 OpenFilm Studio `Projects/` |
| `node cli/dfm.mjs preview <目录>` | 导出 30fps H.264 MP4 预览视频（供无 Studio 的外部终端使用） |
| `node cli/dfm.mjs audit <目录>` | 仅运行 Q1–Q16 质检报告 |
| `node cli/dfm.mjs init <新目录>` | 初始化一份零风格限制的 `brief.json` 骨架 |

---

## 可选本地真实材质库

`runtime/dfm-craft.css` 内置的程序化质感开箱即用。如果你希望叠加真实手工纸纹、35mm 胶片齿孔或复古网点，可将自己的 CC0 材质包放入 `textures/` 目录，运行 `node cli/textures-prep.mjs` 一次性生成 `<=1200px` 轻量工作代理到 `textures/web/`（详见 [textures/README.md](./textures/README.md)）。

## 开源协议

[MIT](./LICENSE)
