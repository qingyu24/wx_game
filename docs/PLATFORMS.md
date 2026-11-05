# 发布与后续平台接入

线上游戏：https://mist-lantern-qingyu24.zestychime6.chatgpt.site

GitHub：https://github.com/qingyu24/wx_game

当前发布是可离线运行的单机版本。浏览器自动存档、三个手动栏位和 JSON 导入导出均保留；尚未连接云数据库，换设备请导出再导入存档。

## 已有平台边界

- `content.mjs`：章节、人物、机关和结局数据。
- `engine.mjs`、`wilds.mjs`：纯状态操作、存档校验、资源与战斗规则，不依赖 React 或 DOM。
- `storage.mjs`：同步存储接口。浏览器使用 Web Storage；提供 `wx.getStorageSync / setStorageSync / removeStorageSync` 适配器，并有存档往返测试。
- `ActionWorld.jsx`：当前 Canvas 绘制与浏览器输入。迁移微信小游戏时可复用规则模块，把画布、触摸输入、资源加载与音频改接平台 API。普通小程序需使用 canvas 节点；不能把当前 React 网页直接当作原生小程序包发布。

## 数据库接入建议

先接云存档，再考虑活动、多人排行；单机战斗循环不依赖在线请求。可以选择微信云开发或独立 API，前端只通过存档服务读写，不暴露数据库管理凭据。

推荐契约：

- `GET /api/saves/current`：服务端通过登录身份确定玩家，返回 `{ revision, state, updatedAt }`。
- `PUT /api/saves/current`：提交 `{ expectedRevision, state }`；成功返回新 revision，冲突返回 409，界面允许选择云端进度或保留本地导出。不要静默覆盖较新的进度。
- `state` 先经 `validateSave` 校验，服务端还应限制体积、校验身份并原子更新版本号。本地位置检查点可合并上传，避免每次移动发请求。
- 云端奖励或排行榜必须由服务端校验事件，不能信任单机存档内的铜钱与击杀数。当前单机模式允许玩家备份与编辑存档，不宣称具有防作弊能力。

当前不提供未实现的“云端同步成功”按钮。完成登录、服务端持久化与跨设备测试后，再将云存档接进存档面板。
