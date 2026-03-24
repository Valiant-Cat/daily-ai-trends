[English](README.md) | [中文](README_CN.md)

# daily-ai-trends

一个每日 AI 热点数据 / feed 聚合层，当前覆盖：
- GitHub Trending
- Hugging Face Daily Papers
- X / Twitter builder 动态
- Reddit AI 趋势报告

## 项目简介

`daily-ai-trends` 是一个可复用的 AI 热点数据 / feed 层。
它的目标是服务网站、机器人、仪表盘、日报系统以及各类 agent workflow，为它们提供来自多个上游来源的标准化 AI 热点数据。

- **面向人类用户：** `echo.xbreak.ai` 是一个使用这些 feed 的消费端示例
- **面向 AI Agent：** 可以通过仓库内的 `SKILL.md` 以 skill 方式接入本项目

这个仓库的目标，是把**热点采集**和**热点展示**彻底拆开。
下游消费方只需要读取这里生成的标准化 JSON feed，而不需要自己维护每个上游来源的抓取、解析和聚合逻辑。

## 数据源

当前项目会从以下来源构建标准化 feed：

- **GitHub**：GitHub Trending 页面
- **Hugging Face**：Daily Papers API
- **X**：公开的 `follow-builders` feed
- **Reddit**：`liyedanpdx/reddit-ai-trends` 仓库生成的最新报告产物

这个仓库会尽量保持在“feed 生成与标准化”这一层。
产品级 fallback、展示方式、排序策略、UI 交互等，更适合由下游消费方自行实现。

## 署名 / Attribution

本项目基于或消费了以下上游开源项目的输出：

- **follow-builders** by Zara Zhang Rui  
  仓库：https://github.com/zarazhangrui/follow-builders
- **reddit-ai-trends** by Liyedan PDX  
  仓库：https://github.com/liyedanpdx/reddit-ai-trends

如果你复用本项目，或再次分发本项目生成的 feed，请保留适当署名，尤其是在保留了上游衍生数据的场景下。

## 开源协议

本项目采用 **MIT License** 开源。详见 [LICENSE](./LICENSE)。

请注意：上游数据源和被集成项目可能有其各自的许可证与署名要求。使用时应同时遵守本仓库的 MIT 协议，以及相关上游项目的适用许可。

## 输出文件

生成结果位于 `data/` 目录：

- `feed-github.json`
- `feed-huggingface.json`
- `feed-x.json`
- `feed-reddit.json`
- `feed-all.json`

## 本地使用

```bash
npm install
npm run generate
```

## GitHub Actions

仓库内已包含定时 workflow，会每天自动生成 feed，并将更新后的 JSON 文件提交回仓库。
