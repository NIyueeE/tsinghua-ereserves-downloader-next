# AGENTS.md

**Generated:** 2026-03-28
**Project:**清华教参下载器 (Tsinghua E-Reserves Downloader)
**Type:** Tampermonkey single-file userscript

## OVERVIEW

Adds download button to Tsinghua e-reserves platform, fetches book chapters via internal API, streams images through canvas→jsPDF, outputs PDF with chapter bookmarks.

## STRUCTURE

```
./
├── ereserves-lib.js    # Main (only) source file
├── README.md           # User docs (Chinese)
├── CLAUDE.md           # Existing project guidance
├── .mcp.json           # Chrome DevTools MCP config
└── LICENSE             # GPL-3.0
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Modify download flow | `ereserves-lib.js:315-414` | `downloadPDF` inner function |
| Change API endpoints | `ereserves-lib.js:127-146` | `fetchChapters`, `fetchChapter` |
| Adjust concurrency | `ereserves-lib.js:20` | `CONCURRENCY: 3` |
| Modify retry logic | `ereserves-lib.js:17` | `MAX_RETRY: 10` |
| Change PDF output | `ereserves-lib.js:229-258` | `savePDF` with large-file fallback |

## CONVENTIONS

- **Section headers**: Chinese with equals separators (`// ========== xxx ==========`)
- **Chinese comments** for explanatory notes, English for technical terms
- **IIFE wrapper** with `'use strict'` (line 12)
- **No semicolons** in main code body
- **Async/await + generators** for streaming
- **Config constants** at top, grouped functions below

## ANTI-PATTERNS (THIS PROJECT)

1. **jsPDF private API** (`ereserves-lib.js:235-236`)
   - Uses `doc.__private__.resetCustomOutputDestination()` and `doc.__private__.out('')`
   - **Fragile**: Internal API, changes without notice. Fallback only.

2. **String-based error detection** (`ereserves-lib.js:234`)
   - `e.message === 'Invalid string length'` — breaks across JS engines
   - Should use broader `RangeError` handling

3. **Orphaned img element on failure** (`ereserves-lib.js:121`)
   - Image appended to DOM at line 121, removed only on success (line 108)
   - On permanent failure, img remains in DOM

4. **AbortError check by name** (`ereserves-lib.js:400`)
   - `e.name === 'AbortError'` instead of `instanceof` check

## UNIQUE PATTERNS

| Pattern | Location | Description |
|---------|----------|-------------|
| **Botureadkernel header** | Lines 130-131, 141-142 | `Botureadkernel` (note lowercase 'r') — inconsistent with cookie name |
| **Streaming generator** | Lines 61-90 | `downloadStream()` — concurrent downloads without memory accumulation |
| **Canvas reuse** | Lines 93-94, 103-106 | Single canvas, resized per image, never recreated |
| **Per-page PDF** | Lines 374-381 | `new jspdf.jsPDF()` + `addPage()` per image |
| **Chapter bookmarks** | Lines 388-390 | `doc.outline.add()` creates PDF outline |
| **AbortController cancel** | Lines 318, 416-421 | Stops stream via `shouldStop()` callback |
| **MutationObserver wait** | Lines 28-36 | Waits for `#scanid`, `#p_bookname` to appear |

## API ENDPOINTS

| Endpoint | Method | Params | Location |
|----------|--------|--------|----------|
| `/readkernel/KernelAPI/BookInfo/selectJgpBookChapters` | POST | `SCANID` | Line 127 |
| `/readkernel/KernelAPI/BookInfo/selectJgpBookChapter` | POST | `EMID`, `BOOKID` | Line 137 |
| `/readkernel/JPGFile/DownJPGJsNetPage?filePath={hfsKey}` | GET | (URL param) | Line 367 |

## ENTRY POINT

- **IIFE auto-executes** on Tampermonkey load (line 429: `main()`)
- **No DOMContentLoaded** — runs immediately
- `main()` (lines 261-427) orchestrates: element wait → metadata extract → UI creation → download handler

## NO BUILD SYSTEM

- Single `.js` file, no bundler, no package.json
- jsPDF loaded dynamically from CDN at runtime
- Install via: Tampermonkey → Add New Script → paste content
