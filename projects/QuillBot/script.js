"use strict";

const INLINE_TAGS = new Set([
  "STRONG",
  "EM",
  "U",
  "S",
  "CODE",
  "MARK",
  "SUP",
  "SUB",
  "SPAN",
]);
const BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "BLOCKQUOTE", "PRE"]);
const LIST_TAGS = new Set(["UL", "OL"]);
const VOID_TAGS = new Set(["BR", "HR", "IMG", "INPUT"]);
const ALIGN_PROPS = ["left", "center", "right", "justify"];

const COLOR_PALETTE = [
  "#E8E3D9",
  "#C8A96B",
  "#7CB88C",
  "#7EB8D8",
  "#E07070",
  "#C97BA8",
  "#A8C07B",
  "#F0C060",
  "#78B8D0",
  "#D088B8",
  "#88C8A8",
  "#E0A878",
];

let editorEl,
  historyStack = [],
  historyIndex = -1,
  maxHistory = 150;
let mutationObserver,
  isApplyingHistory = false;
let savedSelection = null,
  currentZoom = 100;
let findMatches = [],
  findIndex = 0,
  rawCssInput;
let lastSavedContent = "";
let pasteMode = "smart";

const INITIAL_HTML = `<h1>Welcome to Quill</h1><p>This editor is built entirely on the <strong>Selection &amp; Range API</strong> — no <code>execCommand</code>, ever. Every formatting operation directly manipulates the DOM.</p><h2>What makes it special</h2><p>Inline formatting works by programmatically <em>wrapping selected text nodes</em> in elements like <code>&lt;strong&gt;</code>, splitting text nodes at selection boundaries and handling partial overlaps, nested formats, and toggle-off correctly.</p><blockquote>Try selecting any text above and using the floating toolbar, or the main toolbar at the top.</blockquote><h3>Try these features</h3><ul><li>Select text → floating toolbar appears</li><li>Bold, italic, underline, code, highlight, links</li><li>Undo / Redo with full history (Ctrl+Z / Ctrl+Y)</li><li>Find &amp; Replace (Ctrl+F)</li><li>Clean HTML export — no inline styles mess</li></ul><p>The paste handler strips dangerous HTML while preserving meaningful formatting. Try pasting content from any web page.</p>`;

function getEl(id) {
  return document.getElementById(id);
}

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  });
  children
    .flat()
    .forEach(
      (c) =>
        c != null &&
        e.append(typeof c === "string" ? document.createTextNode(c) : c),
    );
  return e;
}

function getSelection() {
  return window.getSelection();
}

function getRange() {
  const sel = getSelection();
  if (!sel || !sel.rangeCount) return null;
  return sel.getRangeAt(0);
}

function restoreRange(range) {
  if (!range) return;
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function saveSelection() {
  const r = getRange();
  savedSelection = r ? r.cloneRange() : null;
}

function restoreSelection() {
  if (savedSelection) restoreRange(savedSelection);
}

function getTextNodes(container) {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
  );
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  return nodes;
}

function getTextNodesInRange(range) {
  const nodes = [];
  const walker = document.createTreeWalker(
    range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentNode
      : range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    null,
  );
  let n;
  while ((n = walker.nextNode())) {
    if (range.intersectsNode(n)) nodes.push(n);
  }
  return nodes;
}

function isNodeInEditor(node) {
  return editorEl && editorEl.contains(node);
}

function getBlockAncestor(node) {
  let n = node;
  while (n && n !== editorEl) {
    if (n.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(n.tagName)) return n;
    n = n.parentNode;
  }
  return null;
}

function getInlineAncestor(node, tagName) {
  let n = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (n && n !== editorEl) {
    if (n.nodeType === Node.ELEMENT_NODE && n.tagName === tagName.toUpperCase())
      return n;
    n = n.parentNode;
  }
  return null;
}

function isFormatActive(tagName) {
  const range = getRange();
  if (!range || range.collapsed) {
    const sel = getSelection();
    const anchor = sel?.anchorNode;
    if (!anchor) return false;
    return !!getInlineAncestor(anchor, tagName);
  }
  const textNodes = getTextNodesInRange(range);
  if (!textNodes.length) {
    const anchor = range.startContainer;
    return !!getInlineAncestor(anchor, tagName);
  }
  return textNodes.every((n) => {
    const { start, end } = getNodeRangeOverlap(n, range);
    if (start >= end) return true;
    return !!getInlineAncestor(n, tagName);
  });
}

function getNodeRangeOverlap(textNode, range) {
  const len = textNode.length;
  const start = textNode === range.startContainer ? range.startOffset : 0;
  const end = textNode === range.endContainer ? range.endOffset : len;
  return { start, end };
}

function splitTextNodeAt(textNode, offset) {
  if (offset === 0 || offset >= textNode.length) return textNode;
  return textNode.splitText(offset);
}

function wrapNodeInTag(node, tagName, attrs = {}) {
  const wrapper = document.createElement(tagName);
  Object.entries(attrs).forEach(([k, v]) => wrapper.setAttribute(k, v));
  node.parentNode.insertBefore(wrapper, node);
  wrapper.appendChild(node);
  return wrapper;
}

function unwrapElement(el) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function applyInlineFormat(tagName, attrs = {}) {
  const range = getRange();
  if (!range) return;
  if (!isNodeInEditor(range.commonAncestorContainer)) return;

  saveHistory();

  const wasActive = isFormatActive(tagName);

  if (range.collapsed) {
    if (wasActive) {
    } else {
      const marker = document.createElement(tagName);
      Object.entries(attrs).forEach(([k, v]) => marker.setAttribute(k, v));
      const zwsp = document.createTextNode("\u200B");
      marker.appendChild(zwsp);
      range.insertNode(marker);
      const newRange = document.createRange();
      newRange.setStart(zwsp, 1);
      newRange.collapse(true);
      restoreRange(newRange);
    }
    return;
  }

  if (wasActive) {
    removeInlineFormatFromRange(range, tagName);
  } else {
    applyInlineFormatToRange(range, tagName, attrs);
  }

  normalizeEditor();
  scheduleUpdate();
}

function applyInlineFormatToRange(range, tagName, attrs = {}) {
  const textNodes = getTextNodesInRange(range);
  if (!textNodes.length) return;

  const firstNode = textNodes[0];
  const lastNode = textNodes[textNodes.length - 1];

  if (textNodes.length === 1) {
    const node = firstNode;
    let startOffset = node === range.startContainer ? range.startOffset : 0;
    let endOffset = node === range.endContainer ? range.endOffset : node.length;

    if (startOffset > 0) splitTextNodeAt(node, startOffset);
    const targetNode = startOffset > 0 ? node.nextSibling || node : node;
    if (endOffset < targetNode.length)
      splitTextNodeAt(targetNode, endOffset - (startOffset > 0 ? 0 : 0));

    const actualEnd =
      node === range.endContainer ? range.endOffset : node.length;
    const actualStart = node === range.startContainer ? range.startOffset : 0;

    let workNode = node;
    if (actualStart > 0) {
      workNode = node.splitText(actualStart);
    }
    const remaining = workNode.length - (actualEnd - actualStart);
    if (remaining > 0) workNode.splitText(actualEnd - actualStart);
    wrapNodeInTag(workNode, tagName, attrs);
    return;
  }

  if (firstNode === range.startContainer && range.startOffset > 0)
    firstNode.splitText(range.startOffset);

  if (lastNode === range.endContainer && range.endOffset < lastNode.length)
    lastNode.splitText(range.endOffset);

  const freshTextNodes = getTextNodesInRange(range);

  freshTextNodes.forEach((n) => {
    const alreadyWrapped = getInlineAncestor(n, tagName);
    if (alreadyWrapped) return;

    let current = n.parentNode;
    while (
      current &&
      current !== editorEl &&
      INLINE_TAGS.has(current.tagName)
    ) {
      current = current.parentNode;
    }
    if (!n.parentNode) return;
    wrapNodeInTag(n, tagName, attrs);
  });
}

function removeInlineFormatFromRange(range, tagName) {
  const textNodes = getTextNodesInRange(range);
  const toUnwrap = new Set();

  textNodes.forEach((n) => {
    const ancestor = getInlineAncestor(n, tagName);
    if (ancestor) toUnwrap.add(ancestor);
  });

  toUnwrap.forEach((ancestor) => {
    const aRange = document.createRange();
    aRange.selectNode(ancestor);

    const startsBeforeRange =
      range.compareBoundaryPoints(Range.START_TO_START, aRange) > 0;
    const endsAfterRange =
      range.compareBoundaryPoints(Range.END_TO_END, aRange) < 0;

    if (startsBeforeRange || endsAfterRange) {
      splitWrappedElement(ancestor, range, tagName);
    } else {
      unwrapElement(ancestor);
    }
  });
}

function splitWrappedElement(wrapEl, range, tagName) {
  const textNodes = getTextNodes(wrapEl);
  const before = [],
    inside = [],
    after = [];

  textNodes.forEach((n) => {
    const startCmp = range.comparePoint(n, 0);
    const endCmp = range.comparePoint(n, n.length);

    if (startCmp < 0 && endCmp <= 0) {
      if (n === range.startContainer) {
        if (range.startOffset > 0) {
          const part1 = document.createTextNode(
            n.textContent.slice(0, range.startOffset),
          );
          const part2 = document.createTextNode(
            n.textContent.slice(range.startOffset),
          );
          before.push(part1);
          inside.push(part2);
        } else {
          inside.push(n.cloneNode());
        }
      } else {
        before.push(n.cloneNode());
      }
    } else if (startCmp >= 0 && endCmp <= 0) {
      if (n === range.endContainer && range.endOffset < n.length) {
        const part1 = document.createTextNode(
          n.textContent.slice(0, range.endOffset),
        );
        const part2 = document.createTextNode(
          n.textContent.slice(range.endOffset),
        );
        inside.push(part1);
        after.push(part2);
      } else {
        inside.push(n.cloneNode());
      }
    } else {
      after.push(n.cloneNode());
    }
  });

  const parent = wrapEl.parentNode;
  if (!parent) return;

  const makeWrap = (nodes) => {
    const w = document.createElement(tagName);
    nodes.forEach((n) => w.appendChild(n));
    return w;
  };

  if (before.length) parent.insertBefore(makeWrap(before), wrapEl);
  inside.forEach((n) => parent.insertBefore(n, wrapEl));
  if (after.length) parent.insertBefore(makeWrap(after), wrapEl);
  parent.removeChild(wrapEl);
}

function applyColorFormat(color) {
  if (!color) {
    removeColorFormat();
    return;
  }
  const range = getRange();
  if (!range || range.collapsed) return;
  if (!isNodeInEditor(range.commonAncestorContainer)) return;
  saveHistory();
  applyInlineFormatToRange(range, "SPAN", { style: `color: ${color}` });
  normalizeEditor();
  scheduleUpdate();
  getEl("colorSwatch").style.background = color;
}

function removeColorFormat() {
  const range = getRange();
  if (!range || range.collapsed) return;
  saveHistory();
  const textNodes = getTextNodesInRange(range);
  textNodes.forEach((n) => {
    let ancestor = n.parentNode;
    while (ancestor && ancestor !== editorEl) {
      if (ancestor.tagName === "SPAN" && ancestor.style.color) {
        unwrapElement(ancestor);
        return;
      }
      ancestor = ancestor.parentNode;
    }
  });
  normalizeEditor();
  scheduleUpdate();
}

function applyBlockFormat(type) {
  const range = getRange();
  if (!range) return;
  saveHistory();

  let targetBlock = getBlockAncestor(range.startContainer);
  if (!targetBlock) {
    targetBlock = editorEl.querySelector("p, h1, h2, h3, h4, blockquote, pre");
    if (!targetBlock) {
      targetBlock = document.createElement("p");
      editorEl.prepend(targetBlock);
    }
  }

  if (type === "pre") {
    const pre = document.createElement("pre");
    pre.textContent = targetBlock.textContent;
    targetBlock.parentNode.replaceChild(pre, targetBlock);
    placeCaretIn(pre);
    scheduleUpdate();
    return;
  }

  if (type === "blockquote") {
    const bq = document.createElement("blockquote");
    while (targetBlock.firstChild) bq.appendChild(targetBlock.firstChild);
    targetBlock.parentNode.replaceChild(bq, targetBlock);
    placeCaretIn(bq);
    scheduleUpdate();
    return;
  }

  const newBlock = document.createElement(type);
  while (targetBlock.firstChild) newBlock.appendChild(targetBlock.firstChild);
  if (targetBlock.style?.textAlign)
    newBlock.style.textAlign = targetBlock.style.textAlign;
  targetBlock.parentNode.replaceChild(newBlock, targetBlock);
  placeCaretIn(newBlock);
  scheduleUpdate();
}

function applyAlignment(align) {
  const range = getRange();
  if (!range) return;
  saveHistory();

  const blocks = getSelectedBlocks(range);
  blocks.forEach((block) => {
    block.style.textAlign = align;
  });
  scheduleUpdate();
}

function getSelectedBlocks(range) {
  const blocks = new Set();
  const findBlock = (node) => {
    let n = node;
    while (n && n !== editorEl) {
      if (
        n.nodeType === Node.ELEMENT_NODE &&
        (BLOCK_TAGS.has(n.tagName) ||
          LIST_TAGS.has(n.tagName) ||
          n.tagName === "LI")
      )
        return n;
      n = n.parentNode;
    }
    return null;
  };
  const startBlock = findBlock(range.startContainer);
  const endBlock = findBlock(range.endContainer);
  if (startBlock) blocks.add(startBlock);
  if (endBlock) blocks.add(endBlock);
  if (startBlock && endBlock && startBlock !== endBlock) {
    let node = startBlock.nextSibling;
    while (node && node !== endBlock) {
      if (node.nodeType === Node.ELEMENT_NODE) blocks.add(node);
      node = node.nextSibling;
    }
  }
  return [...blocks];
}

function applyList(type) {
  const range = getRange();
  if (!range) return;
  saveHistory();

  const block = getBlockAncestor(range.startContainer);
  const listTag = type === "unorderedList" ? "UL" : "OL";

  if (block && block.parentNode && LIST_TAGS.has(block.parentNode.tagName)) {
    if (block.parentNode.tagName === listTag) {
      const textContent = block.innerHTML;
      const p = document.createElement("p");
      p.innerHTML = textContent;
      block.parentNode.parentNode.insertBefore(p, block.parentNode.nextSibling);
      if (!block.parentNode.firstChild)
        block.parentNode.parentNode.removeChild(block.parentNode);
      else block.parentNode.removeChild(block);
      placeCaretIn(p);
      scheduleUpdate();
      return;
    }
  }

  if (block) {
    const existingList =
      block.parentNode && LIST_TAGS.has(block.parentNode.tagName)
        ? block.parentNode
        : null;
    if (existingList) {
      const newList = document.createElement(listTag.toLowerCase());
      const li = document.createElement("li");
      li.innerHTML = block.innerHTML;
      newList.appendChild(li);
      existingList.parentNode.insertBefore(newList, existingList.nextSibling);
      existingList.parentNode.removeChild(existingList);
      placeCaretIn(li);
    } else {
      const list = document.createElement(listTag.toLowerCase());
      const li = document.createElement("li");
      li.innerHTML = block.innerHTML;
      list.appendChild(li);
      block.parentNode.replaceChild(list, block);
      placeCaretIn(li);
    }
  }
  scheduleUpdate();
}

function applyIndent(direction) {
  const range = getRange();
  if (!range) return;
  saveHistory();

  let li = range.startContainer;
  while (li && li !== editorEl && li.tagName !== "LI") li = li.parentNode;

  if (!li || li === editorEl) {
    const block = getBlockAncestor(range.startContainer);
    if (block) {
      const current = parseInt(block.style.paddingLeft || "0");
      const delta = direction === "indent" ? 24 : -24;
      block.style.paddingLeft = Math.max(0, current + delta) + "px";
    }
    return;
  }

  if (direction === "indent") {
    const prevLi = li.previousElementSibling;
    if (!prevLi) return;
    let subList = prevLi.querySelector("ul, ol");
    if (!subList) {
      subList = document.createElement(li.parentNode.tagName.toLowerCase());
      prevLi.appendChild(subList);
    }
    subList.appendChild(li);
    placeCaretIn(li);
  } else {
    const parentList = li.parentNode;
    const grandParentLi = parentList.parentNode;
    if (!grandParentLi || grandParentLi === editorEl) return;
    grandParentLi.parentNode.insertBefore(li, grandParentLi.nextSibling);
    if (!parentList.hasChildNodes())
      parentList.parentNode.removeChild(parentList);
    placeCaretIn(li);
  }
  scheduleUpdate();
}

function insertLink(url, text, newTab) {
  if (!url) return;
  const range = savedSelection || getRange();
  if (!range) return;
  saveHistory();
  restoreRange(range);

  const a = document.createElement("a");
  a.href = url;
  if (newTab) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }

  if (range.collapsed) {
    a.textContent = text || url;
    range.insertNode(a);
    const newRange = document.createRange();
    newRange.setStartAfter(a);
    newRange.collapse(true);
    restoreRange(newRange);
  } else {
    const textNodes = getTextNodesInRange(range);
    if (textNodes.length === 1) {
      const n = textNodes[0];
      const start = n === range.startContainer ? range.startOffset : 0;
      const end = n === range.endContainer ? range.endOffset : n.length;
      let workNode = n;
      if (start > 0) workNode = n.splitText(start);
      if (end - start < workNode.length) workNode.splitText(end - start);
      wrapNodeInTag(workNode, "A", {
        href: url,
        ...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {}),
      });
    } else {
      const fragment = range.extractContents();
      a.appendChild(fragment);
      range.insertNode(a);
    }
    if (text) a.textContent = text;
  }

  normalizeEditor();
  scheduleUpdate();
}

function removeLink() {
  const range = getRange();
  if (!range) return;
  saveHistory();

  const anchor = getInlineAncestor(range.startContainer, "A");
  if (anchor) {
    unwrapElement(anchor);
    normalizeEditor();
    scheduleUpdate();
    return;
  }

  const textNodes = getTextNodesInRange(range);
  const toUnwrap = new Set();
  textNodes.forEach((n) => {
    const a = getInlineAncestor(n, "A");
    if (a) toUnwrap.add(a);
  });
  toUnwrap.forEach(unwrapElement);
  normalizeEditor();
  scheduleUpdate();
}

function insertImage(url, alt, caption) {
  if (!url) return;
  const range = savedSelection || getRange();
  if (!range) return;
  saveHistory();
  restoreRange(range);

  const figure = document.createElement("figure");
  const img = document.createElement("img");
  img.src = url;
  img.alt = alt || "";
  figure.appendChild(img);
  if (caption) {
    const cap = document.createElement("figcaption");
    cap.textContent = caption;
    figure.appendChild(cap);
  }

  const block = getBlockAncestor(range.startContainer);
  if (block && block.parentNode) {
    block.parentNode.insertBefore(figure, block.nextSibling);
  } else {
    editorEl.appendChild(figure);
  }

  const p = document.createElement("p");
  figure.parentNode.insertBefore(p, figure.nextSibling);
  placeCaretIn(p);
  scheduleUpdate();
}

function insertHR() {
  const range = getRange();
  if (!range) return;
  saveHistory();

  const block =
    getBlockAncestor(range.startContainer) || editorEl.lastElementChild;
  const hr = document.createElement("hr");
  const p = document.createElement("p");
  p.innerHTML = "<br/>";
  if (block && block.parentNode) {
    block.parentNode.insertBefore(hr, block.nextSibling);
    block.parentNode.insertBefore(p, hr.nextSibling);
  } else {
    editorEl.append(hr, p);
  }
  placeCaretIn(p);
  scheduleUpdate();
}

function insertTable(rows = 3, cols = 3) {
  const range = getRange();
  if (!range) return;
  saveHistory();

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  const headerRow = document.createElement("tr");
  for (let c = 0; c < cols; c++) {
    const th = document.createElement("th");
    th.setAttribute("contenteditable", "true");
    th.textContent = `Column ${c + 1}`;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);

  for (let r = 0; r < rows - 1; r++) {
    const tr = document.createElement("tr");
    for (let c = 0; c < cols; c++) {
      const td = document.createElement("td");
      td.setAttribute("contenteditable", "true");
      td.innerHTML = "<br/>";
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.append(thead, tbody);
  const p = document.createElement("p");
  const block =
    getBlockAncestor(range.startContainer) || editorEl.lastElementChild;
  if (block && block.parentNode) {
    block.parentNode.insertBefore(table, block.nextSibling);
    block.parentNode.insertBefore(p, table.nextSibling);
  } else {
    editorEl.append(table, p);
  }
  placeCaretIn(p);
  scheduleUpdate();
}

function clearFormat() {
  const range = getRange();
  if (!range || range.collapsed) return;
  saveHistory();

  const textNodes = getTextNodesInRange(range);
  textNodes.forEach((n) => {
    let node = n;
    while (node.parentNode && node.parentNode !== editorEl) {
      const parent = node.parentNode;
      if (INLINE_TAGS.has(parent.tagName)) {
        if (parent.childNodes.length === 1 && parent.firstChild === node) {
          parent.parentNode.insertBefore(node, parent);
          parent.parentNode.removeChild(parent);
        }
        node = node;
      }
      break;
    }
  });

  normalizeEditor();
  scheduleUpdate();
}

function placeCaretIn(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  restoreRange(range);
  el.focus && el.focus();
}

function placeCaretAtEnd(el) {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function normalizeEditor() {
  const processNode = (node) => {
    const children = [...node.childNodes];
    children.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        if (child.textContent === "\u200B" && child.parentNode !== editorEl) {
          if (
            child.parentNode.tagName === "STRONG" ||
            child.parentNode.tagName === "EM"
          ) {
          }
        }
        return;
      }
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (
          INLINE_TAGS.has(child.tagName) &&
          child.childNodes.length === 0 &&
          child.tagName !== "BR"
        ) {
          child.parentNode.removeChild(child);
          return;
        }
        if (child.tagName !== "A" && INLINE_TAGS.has(child.tagName)) {
          let next = child.nextSibling;
          while (next && next.tagName === child.tagName) {
            while (next.firstChild) child.appendChild(next.firstChild);
            const toRemove = next;
            next = next.nextSibling;
            toRemove.parentNode.removeChild(toRemove);
          }
        }
        processNode(child);
      }
    });
  };
  processNode(editorEl);
}

function saveHistory() {
  if (isApplyingHistory) return;
  const content = editorEl.innerHTML;
  if (historyStack[historyIndex]?.content === content) return;
  historyStack = historyStack.slice(0, historyIndex + 1);
  historyStack.push({ content, timestamp: Date.now() });
  if (historyStack.length > maxHistory) historyStack.shift();
  historyIndex = historyStack.length - 1;
  updateHistoryButtons();
}

function undo() {
  if (historyIndex <= 0) return;
  isApplyingHistory = true;
  historyIndex--;
  editorEl.innerHTML = historyStack[historyIndex].content;
  isApplyingHistory = false;
  updateHistoryButtons();
  updateStats();
  scheduleUpdate();
}

function redo() {
  if (historyIndex >= historyStack.length - 1) return;
  isApplyingHistory = true;
  historyIndex++;
  editorEl.innerHTML = historyStack[historyIndex].content;
  isApplyingHistory = false;
  updateHistoryButtons();
  updateStats();
  scheduleUpdate();
}

function updateHistoryButtons() {
  const undoBtn = getEl("btnUndo");
  const redoBtn = getEl("btnRedo");
  if (undoBtn) undoBtn.disabled = historyIndex <= 0;
  if (redoBtn) redoBtn.disabled = historyIndex >= historyStack.length - 1;
  const histEl = getEl("statHistory");
  const idxEl = getEl("statHistIdx");
  if (histEl) histEl.textContent = historyStack.length;
  if (idxEl) idxEl.textContent = historyIndex + 1;
}

let scheduleTimer;
function scheduleUpdate() {
  clearTimeout(scheduleTimer);
  scheduleTimer = setTimeout(() => {
    updateToolbarState();
    updateStats();
    updateBlockSelect();
    updateStatusBar();
  }, 50);
}

function updateStats() {
  const text = editorEl.innerText || "";
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const sentences = (text.match(/[.!?]+/g) || []).length;
  const readTime = Math.ceil(words / 200) + "m";

  const safe = (id) => {
    const e = getEl(id);
    if (e) e.textContent = arguments[0];
  };

  const wordEl = getEl("statWords");
  if (wordEl) wordEl.textContent = words;
  const charEl = getEl("statChars");
  if (charEl) charEl.textContent = chars;
  const sentEl = getEl("statSentences");
  if (sentEl) sentEl.textContent = sentences;
  const rtEl = getEl("statReadTime");
  if (rtEl) rtEl.textContent = readTime;
  const wcPill = getEl("wordCountPill");
  if (wcPill) wcPill.textContent = `${words} words`;

  updateFormatMap();

  const savedEl = getEl("savedIndicator");
  if (savedEl) {
    const isDirty = editorEl.innerHTML !== lastSavedContent;
    savedEl.classList.toggle("unsaved", isDirty);
    savedEl.title = isDirty ? "Unsaved changes" : "All changes saved";
  }
}

function updateFormatMap() {
  const fmtMap = getEl("fmtMap");
  if (!fmtMap) return;
  const presentTags = new Set();
  const walk = (node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName;
      if (INLINE_TAGS.has(tag) || tag === "A") presentTags.add(tag);
      node.childNodes.forEach(walk);
    }
  };
  walk(editorEl);
  fmtMap.innerHTML = "";
  presentTags.forEach((tag) => {
    const span = document.createElement("span");
    span.className = `fmt-tag fmt-${tag}`;
    span.textContent = `<${tag.toLowerCase()}>`;
    fmtMap.appendChild(span);
  });
}

function updateToolbarState() {
  const cmds = {
    bold: "STRONG",
    italic: "EM",
    underline: "U",
    strikethrough: "S",
    code: "CODE",
    mark: "MARK",
    superscript: "SUP",
    subscript: "SUB",
  };
  document.querySelectorAll(".tool-btn[data-cmd]").forEach((btn) => {
    const cmd = btn.dataset.cmd;
    const tag = cmds[cmd];
    if (tag) btn.classList.toggle("active", isFormatActive(tag));
  });
  document.querySelectorAll(".ft-btn[data-cmd]").forEach((btn) => {
    const cmd = btn.dataset.cmd;
    const tag = cmds[cmd];
    if (tag) btn.classList.toggle("active", isFormatActive(tag));
  });
  updateBlockSelect();
}

function updateBlockSelect() {
  const select = getEl("blockSelect");
  if (!select) return;
  const range = getRange();
  if (!range) return;
  const block = getBlockAncestor(range.startContainer);
  if (block) {
    const tag = block.tagName.toLowerCase();
    select.value = tag === "div" ? "p" : tag;
    const cbInfo = getEl("currentBlockInfo");
    if (cbInfo) cbInfo.textContent = `<${tag}>`;
  }
}

function updateStatusBar() {
  const range = getRange();
  if (!range) return;
  const sbBlock = getEl("sbBlock");
  const sbPos = getEl("sbPos");
  const sbSel = getEl("sbSel");
  const sbFmt = getEl("sbFormat");
  const sbSepFmt = getEl("sbSepFmt");

  const block = getBlockAncestor(range.startContainer);
  if (sbBlock)
    sbBlock.textContent = block ? `<${block.tagName.toLowerCase()}>` : "—";

  const anchor = range.startContainer;
  const offset = range.startOffset;
  const text = editorEl.innerText || "";
  const before = editorEl.innerText.substring(
    0,
    getAbsoluteOffset(range.startContainer, offset),
  );
  const lines = before.split("\n");
  const ln = lines.length;
  const col = lines[lines.length - 1].length + 1;
  if (sbPos) sbPos.textContent = `Ln ${ln}, Col ${col}`;

  if (!range.collapsed) {
    const selText = range.toString();
    const wc = selText.trim().split(/\s+/).filter(Boolean).length;
    if (sbSel)
      sbSel.textContent = `${selText.length} chars, ${wc} words selected`;
  } else {
    if (sbSel) sbSel.textContent = "No selection";
  }

  const activeFormats = [];
  ["STRONG", "EM", "U", "S", "CODE", "MARK"].forEach((tag) => {
    if (isFormatActive(tag)) activeFormats.push(tag.toLowerCase());
  });
  if (sbFmt) sbFmt.textContent = activeFormats.join(" · ");
  if (sbSepFmt) sbSepFmt.style.display = activeFormats.length ? "" : "none";
}

function getAbsoluteOffset(node, offset) {
  const range = document.createRange();
  range.setStart(editorEl, 0);
  range.setEnd(node.nodeType === Node.TEXT_NODE ? node : editorEl, offset);
  return range.toString().length;
}

function updateFloatingToolbar() {
  const ft = getEl("floatingToolbar");
  if (!ft) return;
  const sel = getSelection();
  if (
    !sel ||
    sel.isCollapsed ||
    !sel.rangeCount ||
    !isNodeInEditor(sel.anchorNode)
  ) {
    ft.classList.add("hidden");
    return;
  }
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (!rect.width) {
    ft.classList.add("hidden");
    return;
  }

  ft.classList.remove("hidden");
  const top = rect.top + window.scrollY - ft.offsetHeight - 12;
  const left = rect.left + window.scrollX + rect.width / 2;
  ft.style.top = Math.max(10, top) + "px";
  ft.style.left =
    Math.max(
      ft.offsetWidth / 2,
      Math.min(window.innerWidth - ft.offsetWidth / 2, left),
    ) + "px";
}

function handleLinkTooltip(e) {
  const lt = getEl("linkTooltip");
  if (!lt) return;
  const anchor = e?.target?.closest?.("a") || null;
  if (!anchor || !editorEl.contains(anchor)) {
    lt.classList.add("hidden");
    return;
  }
  const href = anchor.href || anchor.getAttribute("href") || "";
  getEl("ltUrl").textContent = href;
  const openLink = getEl("ltOpen");
  if (openLink) openLink.href = href;

  const rect = anchor.getBoundingClientRect();
  lt.classList.remove("hidden");
  lt.style.top = rect.bottom + window.scrollY + 8 + "px";
  lt.style.left = rect.left + "px";

  const editBtn = getEl("ltEdit");
  const removeBtn = getEl("ltRemove");
  if (editBtn)
    editBtn.onclick = () => {
      lt.classList.add("hidden");
      showLinkModal(anchor);
    };
  if (removeBtn)
    removeBtn.onclick = () => {
      saveHistory();
      unwrapElement(anchor);
      normalizeEditor();
      scheduleUpdate();
      lt.classList.add("hidden");
    };
}

function showLinkModal(existingAnchor) {
  saveSelection();
  const modal = getEl("linkModal");
  const urlInput = getEl("linkUrl");
  const txtInput = getEl("linkText");
  const newTabChk = getEl("linkNewTab");
  if (!modal) return;

  if (existingAnchor) {
    urlInput.value = existingAnchor.getAttribute("href") || "";
    txtInput.value = existingAnchor.textContent || "";
    if (newTabChk) newTabChk.checked = existingAnchor.target === "_blank";
  } else {
    const range = savedSelection || getRange();
    txtInput.value = range && !range.collapsed ? range.toString() : "";
    urlInput.value = "";
    if (newTabChk) newTabChk.checked = true;
  }

  modal.classList.remove("hidden");
  urlInput.focus();

  const confirm = () => {
    const url = urlInput.value.trim();
    if (!url) return;
    if (existingAnchor) {
      existingAnchor.href = url;
      existingAnchor.textContent = txtInput.value || url;
      if (newTabChk?.checked) {
        existingAnchor.target = "_blank";
        existingAnchor.rel = "noopener noreferrer";
      } else {
        existingAnchor.removeAttribute("target");
        existingAnchor.removeAttribute("rel");
      }
      saveHistory();
      scheduleUpdate();
    } else {
      insertLink(url, txtInput.value, newTabChk?.checked);
    }
    modal.classList.add("hidden");
  };

  const cancel = () => modal.classList.add("hidden");
  const confirmBtn = getEl("btnLinkConfirm");
  const cancelBtn = getEl("btnLinkCancel");
  if (confirmBtn) {
    confirmBtn.onclick = null;
    confirmBtn.onclick = confirm;
  }
  if (cancelBtn) {
    cancelBtn.onclick = null;
    cancelBtn.onclick = cancel;
  }

  urlInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirm();
    }
    if (e.key === "Escape") cancel();
  };
}

function showImageModal() {
  saveSelection();
  const modal = getEl("imageModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  getEl("imageUrl")?.focus();

  const confirm = () => {
    const url = getEl("imageUrl")?.value.trim();
    const alt = getEl("imageAlt")?.value.trim();
    const cap = getEl("imageCaption")?.value.trim();
    if (!url) return;
    insertImage(url, alt, cap);
    modal.classList.add("hidden");
  };
  const cancel = () => modal.classList.add("hidden");
  const confirmBtn = getEl("btnImageConfirm");
  const cancelBtn = getEl("btnImageCancel");
  if (confirmBtn) {
    confirmBtn.onclick = null;
    confirmBtn.onclick = confirm;
  }
  if (cancelBtn) {
    cancelBtn.onclick = null;
    cancelBtn.onclick = cancel;
  }
}

function cleanPastedHTML(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  const allowedTags = new Set([
    "P",
    "H1",
    "H2",
    "H3",
    "H4",
    "BLOCKQUOTE",
    "PRE",
    "CODE",
    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "S",
    "UL",
    "OL",
    "LI",
    "A",
    "BR",
    "HR",
    "IMG",
    "FIGURE",
    "FIGCAPTION",
    "TABLE",
    "THEAD",
    "TBODY",
    "TR",
    "TH",
    "TD",
    "MARK",
    "SPAN",
  ]);
  const allowedAttrs = {
    A: ["href", "target", "rel"],
    IMG: ["src", "alt", "width", "height"],
    TD: ["colspan", "rowspan"],
    TH: ["colspan", "rowspan"],
    SPAN: ["style"],
    P: ["style"],
    DIV: ["style"],
    H1: ["style"],
    H2: ["style"],
    H3: ["style"],
    H4: ["style"],
  };
  const allowedStyleProps = [
    "text-align",
    "color",
    "font-weight",
    "font-style",
  ];

  const sanitize = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        return;
      }
      if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName;
        if (!allowedTags.has(tag)) {
          if (tag === "DIV" || tag === "SECTION" || tag === "ARTICLE") {
            const p = document.createElement("p");
            while (child.firstChild) p.appendChild(child.firstChild);
            child.parentNode.replaceChild(p, child);
            sanitize(p);
          } else {
            while (child.firstChild)
              child.parentNode.insertBefore(child.firstChild, child);
            child.remove();
          }
          return;
        }
        const allowed = allowedAttrs[tag] || [];
        [...child.attributes].forEach((attr) => {
          if (!allowed.includes(attr.name)) child.removeAttribute(attr.name);
        });
        if (child.style) {
          const allowedStyles = allowedStyleProps.filter(
            (p) =>
              child.style[p.replace(/-([a-z])/g, (_, c) => c.toUpperCase())],
          );
          const styleStr = allowedStyles
            .map(
              (p) =>
                `${p}: ${child.style[p.replace(/-([a-z])/g, (_, c) => c.toUpperCase())]}`,
            )
            .join("; ");
          if (styleStr) child.setAttribute("style", styleStr);
          else child.removeAttribute("style");
        }
        sanitize(child);
      }
    });
  };
  sanitize(div);
  return div.innerHTML;
}

function smartPaste(html, text) {
  if (!html.trim()) return text;
  const hasRichContent = /<(strong|em|h[1-4]|ul|ol|blockquote|code|a\s)/i.test(
    html,
  );
  return hasRichContent ? cleanPastedHTML(html) : text;
}

function toMarkdown() {
  const clone = editorEl.cloneNode(true);
  const convert = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const inner = [...node.childNodes].map(convert).join("");
    switch (node.tagName) {
      case "H1":
        return `\n# ${inner}\n`;
      case "H2":
        return `\n## ${inner}\n`;
      case "H3":
        return `\n### ${inner}\n`;
      case "H4":
        return `\n#### ${inner}\n`;
      case "STRONG":
      case "B":
        return `**${inner}**`;
      case "EM":
      case "I":
        return `_${inner}_`;
      case "CODE":
        return `\`${inner}\``;
      case "S":
        return `~~${inner}~~`;
      case "U":
        return inner;
      case "A":
        return `[${inner}](${node.getAttribute("href") || ""})`;
      case "IMG":
        return `![${node.alt || ""}](${node.src || ""})`;
      case "BLOCKQUOTE":
        return `\n> ${inner.trim()}\n`;
      case "PRE":
        return `\n\`\`\`\n${inner}\n\`\`\`\n`;
      case "UL":
        return `\n${[...node.children].map((li) => `- ${[...li.childNodes].map(convert).join("")}`).join("\n")}\n`;
      case "OL":
        return `\n${[...node.children].map((li, i) => `${i + 1}. ${[...li.childNodes].map(convert).join("")}`).join("\n")}\n`;
      case "HR":
        return "\n---\n";
      case "BR":
        return "\n";
      case "P":
        return `\n${inner}\n`;
      case "MARK":
        return `==${inner}==`;
      default:
        return inner;
    }
  };
  return [...clone.childNodes]
    .map(convert)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toCleanHTML() {
  const clone = editorEl.cloneNode(true);
  clone.querySelectorAll("[style]").forEach((el) => {
    if (el.style.textAlign) el.setAttribute("align", el.style.textAlign);
  });
  return `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"/><title>${getEl("docTitle")?.value || "Document"}</title></head>\n<body>\n${clone.innerHTML}\n</body>\n</html>`;
}

function initFindBar() {
  const findBar = getEl("findBar");
  const findInput = getEl("findInput");
  const replInput = getEl("replaceInput");
  const findCount = getEl("findCount");

  let highlights = [];

  const clearHighlights = () => {
    highlights.forEach((h) => {
      if (h.parentNode) {
        h.parentNode.insertBefore(document.createTextNode(h.textContent), h);
        h.parentNode.removeChild(h);
      }
    });
    highlights = [];
    findMatches = [];
  };

  const doFind = () => {
    clearHighlights();
    const q = findInput.value.trim();
    if (!q) {
      if (findCount) findCount.textContent = "";
      return;
    }

    const textNodes = getTextNodes(editorEl);
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    let totalMatches = 0;

    textNodes.forEach((n) => {
      if (!n.textContent.match(re)) return;
      const parts = n.textContent.split(re);
      const parent = n.parentNode;
      const frag = document.createDocumentFragment();
      let matchIdx = 0;
      parts.forEach((part, i) => {
        if (part) frag.appendChild(document.createTextNode(part));
        if (i < parts.length - 1) {
          const span = document.createElement("span");
          span.className = "find-highlight";
          span.textContent = n.textContent.match(re)[matchIdx++] || q;
          highlights.push(span);
          findMatches.push(span);
          totalMatches++;
          frag.appendChild(span);
        }
      });
      parent.replaceChild(frag, n);
    });

    if (findCount)
      findCount.textContent = `${totalMatches} match${totalMatches !== 1 ? "es" : ""}`;
    findIndex = 0;
    if (highlights.length) jumpToMatch(0);
  };

  const jumpToMatch = (idx) => {
    highlights.forEach((h) => h.classList.remove("current"));
    if (!highlights.length) return;
    findIndex =
      ((idx % highlights.length) + highlights.length) % highlights.length;
    const cur = highlights[findIndex];
    cur.classList.add("current");
    cur.scrollIntoView({ block: "center", behavior: "smooth" });
    if (findCount)
      findCount.textContent = `${findIndex + 1} / ${highlights.length}`;
  };

  const doReplace = (all) => {
    const q = findInput.value.trim();
    const rep = replInput.value;
    if (!q) return;
    saveHistory();
    clearHighlights();
    if (all) {
      editorEl.innerHTML = editorEl.innerHTML.replace(
        new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
        rep,
      );
    } else {
      const first = highlights[findIndex];
      if (first) {
        first.textContent = rep;
        first.classList.remove("find-highlight", "current");
      }
    }
    doFind();
    scheduleUpdate();
  };

  if (findInput) {
    findInput.addEventListener("input", doFind);
    findInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        jumpToMatch(findIndex + (e.shiftKey ? -1 : 1));
      }
      if (e.key === "Escape") {
        clearHighlights();
        findBar.classList.add("hidden");
      }
    });
  }

  getEl("btnFindPrev")?.addEventListener("click", () =>
    jumpToMatch(findIndex - 1),
  );
  getEl("btnFindNext")?.addEventListener("click", () =>
    jumpToMatch(findIndex + 1),
  );
  getEl("btnReplace")?.addEventListener("click", () => doReplace(false));
  getEl("btnReplaceAll")?.addEventListener("click", () => doReplace(true));
  getEl("btnFindClose")?.addEventListener("click", () => {
    clearHighlights();
    if (findBar) findBar.classList.add("hidden");
  });

  return {
    show: () => {
      if (findBar) {
        findBar.classList.remove("hidden");
        findInput?.focus();
        findInput?.select();
      }
    },
    hide: () => {
      clearHighlights();
      if (findBar) findBar.classList.add("hidden");
    },
  };
}

function initSourceView() {
  let isSourceMode = false;
  const srcPane = getEl("sourcePane");
  const srcEditor = getEl("sourceEditor");
  const scrollArea = editorEl?.parentElement;

  return {
    toggle: () => {
      isSourceMode = !isSourceMode;
      getEl("btnSource")?.classList.toggle("active", isSourceMode);
      if (srcPane) srcPane.classList.toggle("hidden", !isSourceMode);
      if (scrollArea) scrollArea.style.display = isSourceMode ? "none" : "";
      if (isSourceMode && srcEditor) {
        srcEditor.value = editorEl.innerHTML;
        srcEditor.focus();
      } else if (!isSourceMode && srcEditor) {
        saveHistory();
        editorEl.innerHTML = srcEditor.value;
        editorEl.focus();
        scheduleUpdate();
      }
    },
  };
}

function initZoom() {
  const editorScroll = document.querySelector(".editor-scroll");
  const setZoom = (z) => {
    currentZoom = Math.max(50, Math.min(200, z));
    if (editorEl) editorEl.style.fontSize = (18 * currentZoom) / 100 + "px";
    const sbZoom = getEl("sbZoom");
    if (sbZoom) sbZoom.textContent = currentZoom + "%";
  };
  getEl("btnZoomIn")?.addEventListener("click", () =>
    setZoom(currentZoom + 10),
  );
  getEl("btnZoomOut")?.addEventListener("click", () =>
    setZoom(currentZoom - 10),
  );
}

function dispatchCommand(cmd) {
  const cmdMap = {
    bold: () => applyInlineFormat("STRONG"),
    italic: () => applyInlineFormat("EM"),
    underline: () => applyInlineFormat("U"),
    strikethrough: () => applyInlineFormat("S"),
    code: () => applyInlineFormat("CODE"),
    mark: () => applyInlineFormat("MARK"),
    superscript: () => applyInlineFormat("SUP"),
    subscript: () => applyInlineFormat("SUB"),
    alignLeft: () => applyAlignment("left"),
    alignCenter: () => applyAlignment("center"),
    alignRight: () => applyAlignment("right"),
    alignJustify: () => applyAlignment("justify"),
    unorderedList: () => applyList("unorderedList"),
    orderedList: () => applyList("orderedList"),
    indent: () => applyIndent("indent"),
    outdent: () => applyIndent("outdent"),
    link: () => showLinkModal(null),
    unlink: () => removeLink(),
    image: () => showImageModal(),
    hr: () => insertHR(),
    table: () => insertTable(),
    clearFormat: () => clearFormat(),
    undo: () => undo(),
    redo: () => redo(),
  };
  const fn = cmdMap[cmd];
  if (fn) fn();
}

document.addEventListener("DOMContentLoaded", () => {
  editorEl = getEl("editor");
  if (!editorEl) return;

  editorEl.innerHTML = INITIAL_HTML;
  saveHistory();
  lastSavedContent = editorEl.innerHTML;

  const findControl = initFindBar();
  const sourceView = initSourceView();
  initZoom();

  editorEl.addEventListener("input", () => {
    if (!isApplyingHistory) saveHistory();
    scheduleUpdate();
    const savedEl = getEl("savedIndicator");
    if (savedEl) savedEl.classList.add("unsaved");
  });

  editorEl.addEventListener("keydown", (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === "b") {
      e.preventDefault();
      dispatchCommand("bold");
    }
    if (ctrl && e.key === "i") {
      e.preventDefault();
      dispatchCommand("italic");
    }
    if (ctrl && e.key === "u") {
      e.preventDefault();
      dispatchCommand("underline");
    }
    if (ctrl && e.key === "k") {
      e.preventDefault();
      showLinkModal(null);
    }
    if (ctrl && e.key === "`") {
      e.preventDefault();
      dispatchCommand("code");
    }
    if (ctrl && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
      e.preventDefault();
      redo();
    }
    if (ctrl && e.key === "f") {
      e.preventDefault();
      findControl.show();
    }
    if (ctrl && e.shiftKey && e.key === "L") {
      e.preventDefault();
      dispatchCommand("alignLeft");
    }
    if (ctrl && e.shiftKey && e.key === "E") {
      e.preventDefault();
      dispatchCommand("alignCenter");
    }
    if (ctrl && e.shiftKey && e.key === "R") {
      e.preventDefault();
      dispatchCommand("alignRight");
    }
    if (ctrl && e.shiftKey && e.key === "J") {
      e.preventDefault();
      dispatchCommand("alignJustify");
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const range = getRange();
      if (range) {
        let li = range.startContainer;
        while (li && li !== editorEl && li.tagName !== "LI") li = li.parentNode;
        if (li && li !== editorEl) {
          applyIndent(e.shiftKey ? "outdent" : "indent");
        } else {
          document.execCommand("insertHTML", false, "  ");
        }
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      const range = getRange();
      if (!range) return;
      const block = getBlockAncestor(range.startContainer);
      if (block && block.tagName === "PRE") {
        e.preventDefault();
        const r = document.createRange();
        r.setStart(range.startContainer, range.startOffset);
        r.deleteContents();
        r.insertNode(document.createTextNode("\n"));
        r.setStart(range.startContainer, range.startOffset + 1);
        r.collapse(true);
        restoreRange(r);
      }
    }
  });

  editorEl.addEventListener("paste", (e) => {
    e.preventDefault();
    const cd = e.clipboardData;
    const html = cd.getData("text/html");
    const plain = cd.getData("text/plain");

    const mode =
      document.querySelector("input[name='paste']:checked")?.value || "smart";
    let content;
    if (mode === "plain") content = plain;
    else if (mode === "rich") content = html ? cleanPastedHTML(html) : plain;
    else content = smartPaste(html, plain);

    saveHistory();
    const range = getRange();
    if (!range) return;
    if (!range.collapsed) range.deleteContents();

    if (mode === "plain" || !html.trim()) {
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        if (i > 0) {
          const br = document.createElement("br");
          range.insertNode(br);
          range.setStartAfter(br);
          range.collapse(true);
        }
        if (line) {
          const tn = document.createTextNode(line);
          range.insertNode(tn);
          range.setStartAfter(tn);
          range.collapse(true);
        }
      });
    } else {
      const div = document.createElement("div");
      div.innerHTML = content;
      const frag = document.createDocumentFragment();
      while (div.firstChild) frag.appendChild(div.firstChild);
      range.insertNode(frag);
      range.collapse(false);
    }

    restoreRange(range);
    normalizeEditor();
    saveHistory();
    scheduleUpdate();
  });

  editorEl.addEventListener("selectionchange", () => {});
  document.addEventListener("selectionchange", () => {
    if (!document.hasFocus()) return;
    updateFloatingToolbar();
    scheduleUpdate();
  });

  editorEl.addEventListener("mouseup", () => {
    setTimeout(updateFloatingToolbar, 50);
  });
  editorEl.addEventListener("touchend", () => {
    setTimeout(updateFloatingToolbar, 50);
  });
  editorEl.addEventListener("keyup", () => {
    updateFloatingToolbar();
    scheduleUpdate();
  });
  editorEl.addEventListener("click", (e) => handleLinkTooltip(e));
  editorEl.addEventListener("mouseover", (e) => {
    if (e.target.tagName === "A") handleLinkTooltip(e);
  });
  document.addEventListener("mousedown", (e) => {
    const ft = getEl("floatingToolbar");
    const lt = getEl("linkTooltip");
    if (ft && !ft.contains(e.target) && !editorEl.contains(e.target))
      ft.classList.add("hidden");
    if (lt && !lt.contains(e.target) && e.target.tagName !== "A")
      lt.classList.add("hidden");
  });

  document
    .querySelectorAll(".tool-btn[data-cmd], .ft-btn[data-cmd]")
    .forEach((btn) => {
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const cmd = btn.dataset.cmd;
        if (cmd) dispatchCommand(cmd);
      });
    });

  getEl("blockSelect")?.addEventListener("change", (e) => {
    applyBlockFormat(e.target.value);
  });

  getEl("btnSource")?.addEventListener("click", () => sourceView.toggle());
  getEl("btnFind")?.addEventListener("click", () => findControl.show());
  getEl("btnUndo")?.addEventListener("click", () => undo());
  getEl("btnRedo")?.addEventListener("click", () => redo());

  const colorSwatches = COLOR_PALETTE.map((c) => {
    const s = document.createElement("div");
    s.className = "cs-swatch";
    s.style.background = c;
    s.title = c;
    s.addEventListener("click", () => {
      applyColorFormat(c);
      getEl("colorDropdown")?.classList.add("hidden");
    });
    return s;
  });
  const swatchRow = getEl("colorSwatchRow");
  if (swatchRow) colorSwatches.forEach((s) => swatchRow.appendChild(s));

  getEl("btnTextColor")?.addEventListener("click", (e) => {
    e.stopPropagation();
    getEl("colorDropdown")?.classList.toggle("hidden");
  });

  getEl("customColorInput")?.addEventListener("input", (e) => {
    const col = e.target.value;
    applyColorFormat(col);
    const swatch = getEl("colorSwatch");
    if (swatch) swatch.style.background = col;
    const icon = getEl("colorIcon");
    if (icon) icon.style.color = col;
  });

  getEl("btnRemoveColor")?.addEventListener("click", () => {
    removeColorFormat();
    getEl("colorDropdown")?.classList.add("hidden");
  });

  document.addEventListener("click", (e) => {
    const cd = getEl("colorDropdown");
    if (
      cd &&
      !cd.classList.contains("hidden") &&
      !getEl("colorPickerWrap")?.contains(e.target)
    ) {
      cd.classList.add("hidden");
    }
    const em = getEl("exportMenu");
    if (
      em &&
      !em.classList.contains("hidden") &&
      !getEl("exportDropdown")?.contains(e.target)
    ) {
      em.classList.add("hidden");
    }
  });

  getEl("btnExport")?.addEventListener("click", (e) => {
    e.stopPropagation();
    getEl("exportMenu")?.classList.toggle("hidden");
  });

  getEl("emHTML")?.addEventListener("click", () => {
    navigator.clipboard.writeText(editorEl.innerHTML).then(() => {});
    getEl("exportMenu")?.classList.add("hidden");
  });
  getEl("emMarkdown")?.addEventListener("click", () => {
    navigator.clipboard.writeText(toMarkdown()).then(() => {});
    getEl("exportMenu")?.classList.add("hidden");
  });
  getEl("emPlain")?.addEventListener("click", () => {
    navigator.clipboard.writeText(editorEl.innerText).then(() => {});
    getEl("exportMenu")?.classList.add("hidden");
  });
  getEl("emDownload")?.addEventListener("click", () => {
    const html = toCleanHTML();
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (getEl("docTitle")?.value || "document") + ".html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    getEl("exportMenu")?.classList.add("hidden");
  });

  document.querySelectorAll("input[name='paste']").forEach((inp) => {
    inp.addEventListener("change", () => {
      pasteMode = inp.value;
    });
  });

  getEl("ftAIBtn")?.addEventListener("click", () => {
    const range = getRange();
    if (!range || range.collapsed) return;
    const sel = range.toString();
    const suggestions = [
      "Make this more concise.",
      "This is great — well phrased!",
      "Consider varying sentence length here.",
    ];
    const msg = suggestions[Math.floor(Math.random() * suggestions.length)];
    alert(`✦ AI Suggestion for "${sel.slice(0, 40)}…":\n\n${msg}`);
  });

  mutationObserver = new MutationObserver((mutations) => {
    const relevant = mutations.some(
      (m) =>
        m.type === "childList" ||
        (m.type === "characterData" &&
          m.target.parentNode !== getEl("docTitle")),
    );
    if (relevant && !isApplyingHistory) {
      scheduleUpdate();
    }
  });
  mutationObserver.observe(editorEl, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: false,
  });

  setInterval(() => {
    const content = editorEl.innerHTML;
    if (content !== lastSavedContent) {
      lastSavedContent = content;
      const savedEl = getEl("savedIndicator");
      if (savedEl) savedEl.classList.remove("unsaved");
      try {
        localStorage.setItem(
          "quill_autosave",
          JSON.stringify({
            title: getEl("docTitle")?.value,
            content,
            ts: Date.now(),
          }),
        );
      } catch {}
    }
  }, 3000);

  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem("quill_autosave"));
    } catch {
      return null;
    }
  })();
  if (saved?.content && saved.content !== INITIAL_HTML) {
    if (confirm("Restore your previous session?")) {
      editorEl.innerHTML = saved.content;
      if (saved.title && getEl("docTitle"))
        getEl("docTitle").value = saved.title;
      saveHistory();
    }
  }

  window.addEventListener("keydown", (e) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      e.key === "z" &&
      !editorEl.contains(document.activeElement)
    ) {
      e.preventDefault();
      undo();
    }
    if (
      (e.ctrlKey || e.metaKey) &&
      e.key === "y" &&
      !editorEl.contains(document.activeElement)
    ) {
      e.preventDefault();
      redo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "f") {
      e.preventDefault();
      findControl.show();
    }
  });

  updateStats();
  updateToolbarState();
  updateHistoryButtons();
  scheduleUpdate();
  editorEl.focus();
  placeCaretAtEnd(editorEl);
});
