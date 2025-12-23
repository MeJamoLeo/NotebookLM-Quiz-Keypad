(() => {
  const LOG_PREFIX = "[NBLM-EXT]";
  const DEBUG = true;
  const FRAME_ID = Math.random().toString(36).slice(2);
  const STATE = {
    detected: false,
    lastDetectionHash: "",
    loggedKeydown: false,
    focusPrepared: false
  };

  function log(...args) {
    console.log(LOG_PREFIX, ...args);
  }

  function isVisible(el) {
    if (!el || !(el instanceof Element)) return false;
    const style = window.getComputedStyle(el);
    if (!style || style.display === "none" || style.visibility === "hidden") return false;
    if (parseFloat(style.opacity) === 0) return false;
    const rects = el.getClientRects();
    return rects && rects.length > 0;
  }

  function getLabel(el) {
    const aria = (el.getAttribute("aria-label") || "").trim();
    if (aria) return aria;
    const text = (el.innerText || el.textContent || "").trim();
    return text;
  }

  function collectCandidates() {
    const items = [];
    const visited = new Set();

    function collectFromRoot(root, sourceHref) {
      if (!root || !root.querySelectorAll) return;
      const nodes = root.querySelectorAll("button, [role='button'], [tabindex]");
      for (const el of nodes) {
        if (visited.has(el)) continue;
        visited.add(el);
        if (!isVisible(el)) continue;
        const label = getLabel(el);
        if (!label) continue;
        const role = (el.getAttribute("role") || "").toLowerCase();
        const tag = el.tagName ? el.tagName.toLowerCase() : "";
        const ariaLabel = (el.getAttribute("aria-label") || "").trim();
        items.push({
          el,
          label,
          sourceHref,
          role,
          tag,
          ariaLabel,
          hasOnclick: typeof el.onclick === "function"
        });
      }
      const all = root.querySelectorAll("*");
      for (const el of all) {
        if (el.shadowRoot) collectFromRoot(el.shadowRoot, sourceHref);
      }
    }

    collectFromRoot(document, location.href);
    return items;
  }

  function labelStartsWithAnswer(label, letter) {
    const re = new RegExp("^\\s*" + letter + "(\\.|\\)|:|\\s)", "i");
    return re.test(label);
  }

  function labelIncludesAny(label, needles) {
    const lower = label.toLowerCase();
    return needles.some((n) => lower.includes(n));
  }

  function detectQuizContext(candidates) {
    let hasAnswer = false;
    for (const { label } of candidates) {
      if (
        labelStartsWithAnswer(label, "A") ||
        labelStartsWithAnswer(label, "B") ||
        labelStartsWithAnswer(label, "C") ||
        labelStartsWithAnswer(label, "D")
      ) {
        hasAnswer = true;
        break;
      }
    }

    if (hasAnswer) return true;

    for (const { label } of candidates) {
      if (
        labelIncludesAny(label, ["next"]) ||
        labelIncludesAny(label, ["previous"]) ||
        labelIncludesAny(label, ["Hint"]) ||
        labelIncludesAny(label, ["Explain"])
      ) {
        return true;
      }
    }

    return false;
  }

  function prepareFocusRoot() {
    if (STATE.focusPrepared) return;
    STATE.focusPrepared = true;
    try {
      if (document.body && document.body.tabIndex < 0) {
        document.body.tabIndex = -1;
      }
    } catch (err) {
      if (DEBUG) log("prepare focus failed", err);
    }
  }

  function ensureFocus(candidates) {
    prepareFocusRoot();
    if (document.hasFocus && document.hasFocus()) return;

    const focusTarget = candidates.find((c) => typeof c.el.focus === "function");
    if (focusTarget) {
      try {
        focusTarget.el.focus({ preventScroll: true });
      } catch (err) {
        try {
          focusTarget.el.focus();
        } catch (innerErr) {
          if (DEBUG) log("element focus failed", innerErr);
        }
      }
    }
    try {
      window.focus();
    } catch (err) {
      if (DEBUG) log("window focus failed", err);
    }
  }

  function detectionLog(candidates) {
    const labels = candidates.map((c) => c.label).slice(0, 20);
    const hash = labels.join("|");
    if (hash === STATE.lastDetectionHash) return;
    STATE.lastDetectionHash = hash;
    log("frame detected", {
      href: location.href,
      isTop: window.top === window,
      candidateCount: candidates.length,
      labels
    });
  }

  function candidateScore(item) {
    let score = 0;
    if (item.tag === "button") score += 100;
    if (item.role === "button") score += 60;
    if (item.ariaLabel) score += 20;
    if (item.hasOnclick) score += 10;
    const labelLen = item.label ? item.label.length : 0;
    score -= Math.min(40, Math.floor(labelLen / 10));
    return score;
  }

  function findCandidate(candidates, predicate) {
    const matches = [];
    for (const item of candidates) {
      if (!predicate(item.label, item.el)) continue;
      const isButtonLike =
        item.tag === "button" || item.role === "button" || item.ariaLabel;
      if (!isButtonLike) continue;
      matches.push(item);
    }
    if (matches.length === 0) return null;
    matches.sort((a, b) => candidateScore(b) - candidateScore(a));
    return matches[0].el;
  }

  function shouldIgnoreForTyping(event) {
    const target = event.target;
    if (!(target instanceof Element)) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select";
  }

  function stopEvent(event) {
    if (!event) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function handleAction(input, candidates, event) {
    const key = input.key;
    const code = input.code;

    const isSpace = code === "Space" || key === " ";
    if (isSpace) {
      if (event.shiftKey) {
        const prev = findCandidate(candidates, (label) =>
          labelIncludesAny(label, ["Previous"])
        );
        if (prev) {
          stopEvent(event);
          prev.click();
          return true;
        }
      } else {
        const next = findCandidate(candidates, (label) =>
          labelIncludesAny(label, ["Next"])
        );
        if (next) {
          stopEvent(event);
          next.click();
          return true;
        }
      }
      return false;
    }

    if (key === "1") {
      const el = findCandidate(candidates, (label) =>
        labelStartsWithAnswer(label, "A")
      );
      if (el) {
        stopEvent(event);
        el.click();
        return true;
      }
    }

    if (key === "2") {
      const el = findCandidate(candidates, (label) =>
        labelStartsWithAnswer(label, "B")
      );
      if (el) {
        stopEvent(event);
        el.click();
        return true;
      }
    }

    if (key === "3") {
      const el = findCandidate(candidates, (label) =>
        labelStartsWithAnswer(label, "C")
      );
      if (el) {
        stopEvent(event);
        el.click();
        return true;
      }
    }

    if (key === "4") {
      const el = findCandidate(candidates, (label) =>
        labelStartsWithAnswer(label, "D")
      );
      if (el) {
        stopEvent(event);
        el.click();
        return true;
      }
    }

    if (key === "5") {
      let el = findCandidate(candidates, (label) =>
        labelIncludesAny(label, ["Hint"])
      );
      if (!el) {
        el = findCandidate(candidates, (label) =>
          labelIncludesAny(label, ["Explain"])
        );
      }
      if (el) {
        stopEvent(event);
        el.click();
        return true;
      }
    }

    return false;
  }

  function broadcastToChildren(payload) {
    const data = { __nblm: true, ...payload, from: FRAME_ID };
    for (let i = 0; i < window.frames.length; i += 1) {
      const frame = window.frames[i];
      try {
        frame.postMessage(data, "*");
      } catch (err) {
        if (DEBUG) log("postMessage failed", err);
      }
    }
  }

  function onKeyDown(event) {
    if (shouldIgnoreForTyping(event)) return;

    const candidates = collectCandidates();
    const isQuiz = detectQuizContext(candidates);
    if (!isQuiz) {
      if (window.top === window) {
        broadcastToChildren({
          type: "NBLM_KEY",
          key: event.key,
          code: event.code,
          shiftKey: event.shiftKey
        });
      } else {
        try {
          window.top.postMessage(
            {
              __nblm: true,
              type: "NBLM_KEY",
              key: event.key,
              code: event.code,
              shiftKey: event.shiftKey,
              relayed: true,
              from: FRAME_ID
            },
            "*"
          );
        } catch (err) {
          if (DEBUG) log("postMessage to top failed", err);
        }
      }
      return;
    }

    if (!STATE.detected) {
      STATE.detected = true;
      log("quiz context detected");
    }
    detectionLog(candidates);
    ensureFocus(candidates);

    handleAction(
      { key: event.key, code: event.code, shiftKey: event.shiftKey },
      candidates,
      event
    );
  }

  function pollDetection() {
    const candidates = collectCandidates();
    if (!detectQuizContext(candidates)) return;
    if (!STATE.detected) {
      STATE.detected = true;
      log("quiz context detected");
    }
    detectionLog(candidates);
    ensureFocus(candidates);
  }

  if (DEBUG) {
    window.addEventListener(
      "keydown",
      (event) => {
        if (STATE.loggedKeydown) return;
        STATE.loggedKeydown = true;
        log("keydown captured", {
          href: location.href,
          isTop: window.top === window,
          key: event.key,
          code: event.code
        });
      },
      true
    );
  }

  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener(
    "message",
    (event) => {
      const data = event.data;
      if (!data || !data.__nblm || data.type !== "NBLM_KEY") return;
      if (data.from === FRAME_ID) return;
      const candidates = collectCandidates();
      if (!detectQuizContext(candidates)) {
        broadcastToChildren({
          type: "NBLM_KEY",
          key: data.key,
          code: data.code,
          shiftKey: data.shiftKey
        });
        return;
      }
      if (!STATE.detected) {
        STATE.detected = true;
        log("quiz context detected");
      }
      detectionLog(candidates);
      ensureFocus(candidates);
      handleAction(
        { key: data.key, code: data.code, shiftKey: data.shiftKey },
        candidates,
        null
      );
    },
    true
  );
  setInterval(pollDetection, 1000);
  pollDetection();
  log("content script loaded", { href: location.href, isTop: window.top === window });
})();
