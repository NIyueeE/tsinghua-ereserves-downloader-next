# tsinghua-ereserves-lib-downloader-next

从清华大学电子教学参考书服务平台下载 PDF 的小工具。

> ⚠️ **本项目是 [A1phaN/tsinghua-ereserves-lib-downloader](https://github.com/A1phaN/tsinghua-ereserves-lib-downloader) 的继续维护版本。**

---

## 免责声明

**本工具仅供个人学习研究使用，严禁用于商业目的或任何恶意行为。**

使用本工具即表示您同意：
1. 仅将其用于个人非商业目的
2. 不对下载内容进行二次分发或演绎
3. 自行承担使用风险

本工具基于 [GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.txt) 许可证发布。

---

## 功能说明

在教参平台的阅读页面添加一个下载按钮，点击后自动将当前教参内容下载为 PDF 文件。

- 自动提取章节信息并生成 PDF 书签
- 支持并发下载，加快速度
- 支持取消下载
- 支持大文件处理

---

## 安装步骤

### 1. 安装 Tampermonkey

如果你的浏览器还没有安装 Tampermonkey（油猴）扩展，请先安装：

- Chrome/Edge: [Tampermonkey 官方商店](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- Firefox: [Tampermonkey 官方商店](https://addons.mozilla.org/firefox/addon/tampermonkey/)

### 2. 安装脚本

点击 [ereserves-lib.js](ereserves-lib.js) 查看脚本源码，然后在浏览器中：

1. 点击油猴扩展图标 → "添加新脚本"
2. 将 `ereserves-lib.js` 的内容粘贴进去
3. 按 `Ctrl + S` 保存

或者通过[油叉地址](https://greasyfork.org/zh-CN/scripts/571537-tsinghua-ereserves-lib-downloader-next)下载

---

## 使用方法

1. 登录[清华教参平台](https://ereserves.lib.tsinghua.edu.cn/)
2. 找到需要下载的教参，点击进入阅读页面
3. 页面加载完成后，点击右上角的下载图标
4. 等待下载完成，浏览器会自动保存 PDF 文件

---

## 常见问题

**Q: 点击下载按钮没有反应？**

A: 请确保你已登录教参平台，并且不是通过 WebVPN 访问。

**Q: 下载失败怎么办？**

A: 检查网络连接是否稳定，或者尝试刷新页面后重新下载。

**Q: 为什么下载的 PDF 很大？**

A: 教参内容本身是高清图片，PDF 体积较大是正常现象。

**Q: 如何取消下载？**

A: 点击下载中的取消按钮即可取消。

---

## 技术说明

- 仅匹配教参平台的阅读页面 URL
- 使用 jsPDF 库将图片转换为 PDF
- 不收集任何用户数据
- 动态加载 jsPDF 库

---

## 许可证

[GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.txt)

本程序为自由软件，您可以遵照 GNU 通用公共许可证（第 3 版）来分发和/或修改它。
