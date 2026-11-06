# GitHub Pages 流水线

`.github/workflows/ci.yml` 的主分支流水线先执行规则测试、构建、桌面/手机操作、离线包和 `/wx_game/` 子路径验证，再上传 Pages 构建产物并部署。

- PR 运行验证并只读检查 Pages 配置，不部署。未启用 Pages 或未选择 GitHub Actions 时，保留验证产物并在日志说明原因，部署任务跳过；配置好后重新运行整条流水线。
- 合入 `main` 后自动部署，也可在 Actions 的 `RPG checks and Pages deploy` 中手动运行。
- `deploy` 使用最小的 `pages: write`、`id-token: write` 权限；部署地址由 `actions/deploy-pages` 返回。
- 相对图片地址会按文档地址解析，因此根路径的 Sites、仓库子路径的 Pages 和单文件离线版均可使用。

首次启用 Pages 需要仓库管理设置（默认 `GITHUB_TOKEN` 不能自动启用）；请到仓库 **Settings → Pages → Build and deployment → Source → GitHub Actions** 设置。仓库目前是私有仓库，不会为了部署而更改公开性；GitHub 账号是否支持私有仓库 Pages 取决于其套餐。失败时先读取部署日志，不把惯用地址当成已经上线的事实。
