// ==UserScript==
// @name         tsinghua-ereserves-lib-downloader-next
// @namespace    tsinghua-ereserves
// @version      1.0.0
// @license      GPL-3.0
// @description  从清华大学电子教学参考书服务平台下载PDF (个人学习用途，禁止商业和恶意使用)
// @author       Tsinghua E-Reserves Contributors
// @match        https://ereserves.lib.tsinghua.edu.cn/readkernel/ReadJPG/JPGJsNetPage/*
// @grant        none
// ==/UserScript==

/**
 * tsinghua-ereserves-lib-downloader-next
 *
 * 版权所有 (C) 2024 Tsinghua E-Reserves Contributors
 *
 * 本程序为自由软件，您可以遵照 GNU 通用公共许可证（第 3 版）来分发和/或修改它。
 *
 * 分发时必须保留此版权声明。
 *
 * 本程序按"原样"分发，不提供任何明示或暗示的保证，包括但不限于对适销性、
 * 特定用途适用性和非侵权性的保证。
 *
 * 详情见 https://www.gnu.org/licenses/gpl-3.0.txt
 *
 * 本项目是 https://github.com/A1phaN/tsinghua-ereserves-lib-downloader 的继续维护版本。
 */

/* global jspdf */

(function () {
  "use strict";

  // ========== 配置常量 ==========
  const CONFIG = {
    MAX_RETRY: 10,
    QUERY_INTERVAL: 100,
    ELEMENT_TIMEOUT: 5000,
    CONCURRENCY: 3, // 并发下载数
  };

  // ========== 工具函数 ==========
  const waitForElement = (selector, timeout = CONFIG.ELEMENT_TIMEOUT) =>
    new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`等待元素超时: ${selector}`));
      }, timeout);
    });

  // 获取Cookie值
  const getCookie = (name) => {
    return document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(name + "="))
      ?.split("=")[1];
  };

  // 带错误处理的fetch
  const fetchAPI = async (url, options) => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("API请求失败:", e);
      throw e;
    }
  };

  // 流式下载生成器 - 边下载边产出，不累积内存
  async function* downloadStream(items, concurrency, handler, shouldStop) {
    const queue = [...items];
    const executing = new Set();
    const pending = new Map();

    while (queue.length > 0 || executing.size > 0) {
      // 填充并发槽
      while (executing.size < concurrency && queue.length > 0) {
        const idx = items.length - queue.length;
        const item = queue.shift();
        const promise = handler(item, idx).then((result) => {
          executing.delete(promise);
          pending.set(idx, result);
          return { idx, result };
        });
        executing.add(promise);
      }

      // 等待任意一个完成并产出
      if (executing.size > 0) {
        await Promise.race(executing);
        // 产出已完成的（按顺序）
        for (const [idx, result] of pending) {
          if (shouldStop()) return;
          pending.delete(idx);
          yield result;
        }
      }
    }
  }

  // 获取图片并转为DataURL（复用canvas减少内存分配）
  const canvasCache = document.createElement("canvas");
  const ctxCache = canvasCache.getContext("2d");

  const getImage = async (url, retry = CONFIG.MAX_RETRY) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.style.display = "none";
      img.decoding = "async"; // 异步解码不阻塞主线程

      img.onload = () => {
        // 复用canvas，只调整尺寸
        canvasCache.width = img.width;
        canvasCache.height = img.height;
        ctxCache.drawImage(img, 0, 0);
        const dataURL = canvasCache.toDataURL("image/jpeg");
        document.body.removeChild(img);
        resolve([img, dataURL]);
      };

      img.onerror = () => {
        document.body.removeChild(img);
        if (retry > 0) {
          resolve(getImage(url, retry - 1));
        } else {
          reject(new Error("图片加载失败"));
        }
      };

      img.src = url;
      document.body.appendChild(img);
    });
  };

  // ========== API 函数 ==========
  const fetchChapters = async (scanId, BotuReadKernel) => {
    return fetchAPI("/readkernel/KernelAPI/BookInfo/selectJgpBookChapters", {
      body: `SCANID=${scanId}`,
      headers: {
        Botureadkernel: BotuReadKernel,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      method: "POST",
    });
  };

  const fetchChapter = async (bookId, emId, BotuReadKernel) => {
    return fetchAPI("/readkernel/KernelAPI/BookInfo/selectJgpBookChapter", {
      body: `EMID=${emId}&BOOKID=${bookId}`,
      headers: {
        Botureadkernel: BotuReadKernel,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      method: "POST",
    });
  };

  // ========== UI 函数 ==========
  // 下载图标 SVG
  const DOWNLOAD_SVG = `
      <svg viewBox="0 0 1024 1024" width="20" height="20" style="vertical-align: middle;">
        <path d="M896 672c-17.066667 0-32 14.933333-32 32v128c0 6.4-4.266667 10.666667-10.666667 10.666667H170.666667c-6.4 0-10.666667-4.266667-10.666667-10.666667v-128c0-17.066667-14.933333-32-32-32s-32 14.933333-32 32v128c0 40.533333 34.133333 74.666667 74.666667 74.666667h682.666666c40.533333 0 74.666667-34.133333 74.666667-74.666667v-128c0-17.066667-14.933333-32-32-32z" fill="#ddd"></path>
        <path d="M488.533333 727.466667c6.4 6.4 14.933333 8.533333 23.466667 8.533333s17.066667-2.133333 23.466667-8.533333l213.333333-213.333334c12.8-12.8 12.8-32 0-44.8-12.8-12.8-32-12.8-44.8 0l-157.866667 157.866667V170.666667c0-17.066667-14.933333-32-32-32s-34.133333 14.933333-34.133333 32v456.533333L322.133333 469.333333c-12.8-12.8-32-12.8-44.8 0-12.8 12.8-12.8 32 0 44.8l211.2 213.333334z" fill="#ddd"></path>
      </svg>`;

  // 取消图标 SVG（浅灰色圆形 + 干净X线段）
  const CANCEL_SVG = `
      <svg viewBox="0 0 1024 1024" width="22" height="22" style="vertical-align: middle;">
        <circle cx="512" cy="512" r="480" fill="#d0d0d0"/>
        <line x1="300" y1="300" x2="724" y2="724" stroke="#555" stroke-width="80" stroke-linecap="round"/>
        <line x1="724" y1="300" x2="300" y2="724" stroke="#555" stroke-width="80" stroke-linecap="round"/>
      </svg>`;

  // 更新按钮图标
  const setButtonIcon = (buttonEl, svg) => {
    buttonEl.innerHTML = svg;
  };

  // 轻量 Toast 通知（非阻塞）
  const toast = (msg, type = "info") => {
    const el = document.createElement("div");
    const bgColor =
      type === "error" ? "#e74c3c" : type === "success" ? "#27ae60" : "#333";
    el.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${bgColor};
      color: #fff;
      border-radius: 4px;
      font-size: 14px;
      z-index: 99999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease;
    `;
    el.textContent = msg;

    // 添加动画样式（只添加一次）
    if (!document.getElementById("toast-style")) {
      const style = document.createElement("style");
      style.id = "toast-style";
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(el);
    setTimeout(() => {
      el.style.animation = "slideOut 0.3s ease";
      setTimeout(() => el.remove(), 300);
    }, 3000);
  };

  // 更新进度显示
  const updateProgress = (progressEl, completed, total) => {
    if (!progressEl) return;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    progressEl.textContent = `${percent}%`;
  };

  // ========== jsPDF 加载 ==========
  const loadJsPDF = () =>
    new Promise((resolve) => {
      if (window.jspdf) return resolve();
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = resolve;
      document.body.appendChild(script);
    });

  // ========== PDF 保存 ==========
  const savePDF = (doc, filename) => {
    try {
      doc.save(filename);
    } catch (e) {
      // 处理大文件导出失败的情况
      if (e instanceof RangeError) {
        doc.__private__.resetCustomOutputDestination();
        const content = doc.__private__.out("");
        content.pop();
        const blob = new Blob(
          content.map((line, idx) => {
            const str = idx === content.length - 1 ? line : line + "\n";
            const buffer = new ArrayBuffer(str.length);
            const uint8 = new Uint8Array(buffer);
            for (let i = 0; i < str.length; i++) {
              uint8[i] = str.charCodeAt(i);
            }
            return buffer;
          }),
          { type: "application/pdf" },
        );
        const a = document.createElement("a");
        a.download = filename;
        a.href = URL.createObjectURL(blob);
        a.click();
      } else {
        toast(`保存PDF失败: ${e.message}`, "error");
      }
    }
  };

  // ========== 主函数 ==========
  async function main() {
    let abortController = null;
    let isDownloading = false;

    try {
      // 等待必要元素加载
      const [scanIdEl, bookNameEl] = await Promise.all([
        waitForElement("#scanid"),
        waitForElement("#p_bookname"),
      ]);

      const scanId = scanIdEl?.value;
      const bookName = bookNameEl?.innerText;
      const bookId = location.href.split("/").at(-1);
      if (!bookId) {
        console.error("无法从URL提取bookId");
        return;
      }
      const BotuReadKernel = getCookie("BotuReadKernel");

      if (!scanId || !BotuReadKernel || !bookName) {
        console.error("获取必要信息失败");
        return;
      }

      // 动态加载jsPDF
      await loadJsPDF();
      if (!window.jspdf) {
        toast("jsPDF加载失败", "error");
        return;
      }

      // 创建按钮和进度条容器
      const buttonWrapper = document.createElement("span");
      buttonWrapper.style.cssText =
        "display: inline-flex; align-items: center; gap: 8px; margin-left: 8px;";

      // 按钮（使用原生 button 元素）
      const actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.className = "fucBtn icon iconfont";
      actionBtn.style.cssText =
        "background: none; border: none; padding: 4px 8px; cursor: pointer;";
      actionBtn.innerHTML = DOWNLOAD_SVG;

      // 进度显示
      const progressEl = document.createElement("span");
      progressEl.style.cssText = `
        font-size: 12px;
        color: #4a90e2;
        margin-left: 8px;
        min-width: 32px;
        display: inline-block;
      `;

      buttonWrapper.appendChild(actionBtn);
      buttonWrapper.appendChild(progressEl);
      document.querySelector(".option-list")?.appendChild(buttonWrapper);

      // 下载PDF
      const downloadPDF = async () => {
        if (isDownloading) return;
        isDownloading = true;
        abortController = new AbortController();

        // 切换为取消按钮
        setButtonIcon(actionBtn, CANCEL_SVG);
        actionBtn.onclick = cancelDownload;

        let totalPages = 0;
        let completedPages = 0;
        try {
          let doc = null;

          // 获取章节列表
          const chapters = await fetchChapters(scanId, BotuReadKernel);
          if (chapters.code !== 1 || !Array.isArray(chapters.data)) {
            toast("获取章节列表失败", "error");
            return;
          }

          // 收集所有图片
          const allImages = [];
          const chapterInfo = [];

          for (const chapter of chapters.data) {
            const chapterData = await fetchChapter(
              bookId,
              chapter.EMID,
              BotuReadKernel,
            );
            if (
              chapterData.code !== 1 ||
              !Array.isArray(chapterData.data.JGPS)
            ) {
              toast(`获取章节 "${chapter.EFRAGMENTNAME}" 失败`, "error");
              return;
            }
            chapterInfo.push({
              name: chapter.EFRAGMENTNAME,
              startPage: allImages.length + 1,
              count: chapterData.data.JGPS.length,
            });
            for (const jpg of chapterData.data.JGPS) {
              allImages.push(jpg.hfsKey);
            }
          }

          totalPages = allImages.length;
          if (totalPages === 0) {
            toast("没有找到可下载的页面", "error");
            return;
          }

          // 流式下载：边下载边生成PDF，不保存全部图片
          for await (const [img, dataURL] of downloadStream(
            allImages,
            CONFIG.CONCURRENCY,
            async (hfsKey) => {
              return getImage(
                `/readkernel/JPGFile/DownJPGJsNetPage?filePath=${hfsKey}`,
              );
            },
            () => !isDownloading,
          )) {
            // 即时生成PDF页面
            if (!doc) {
              doc = new jspdf.jsPDF({
                format: [img.width, img.height],
                unit: "px",
              });
            } else {
              doc.addPage([img.width, img.height]);
            }
            doc.addImage(dataURL, "JPEG", 0, 0, img.width, img.height);

            completedPages++;
            updateProgress(progressEl, completedPages, totalPages);
          }

          // 保存PDF（只有未取消时才保存）
          if (doc && isDownloading) {
            // 添加目录书签
            for (const info of chapterInfo) {
              doc.outline.add(null, info.name, { pageNumber: info.startPage });
            }
            savePDF(doc, `${bookName}.pdf`);
            updateProgress(progressEl, totalPages, totalPages);
            toast("PDF下载完成", "success");
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") {
            updateProgress(progressEl, completedPages, totalPages);
            toast("下载已取消", "info");
            return;
          }
          toast(`下载失败: ${e.message}`, "error");
          console.error(e);
        } finally {
          // 恢复下载按钮
          setButtonIcon(actionBtn, DOWNLOAD_SVG);
          actionBtn.onclick = downloadPDF;
          isDownloading = false;
          abortController = null;
        }
      };

      const cancelDownload = () => {
        if (abortController) {
          abortController.abort();
          isDownloading = false;
          // 清理取消下载时残留的隐藏img元素
          document
            .querySelectorAll('img[style="display: none"]')
            .forEach((img) => img.remove());
        }
      };

      actionBtn.onclick = downloadPDF;
    } catch (e) {
      console.error("初始化失败:", e);
    }
  }

  main();
})();
