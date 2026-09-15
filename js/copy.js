// copy.js — clipboard with terminal feedback
function copySnippet(elementId, btn) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const text = (el.innerText || el.textContent || "").trim();
  const showFeedback = () => {
    const original = btn.innerText;
    btn.innerText = "[ COPIED! ]";
    btn.style.borderColor = "var(--phosphor)";
    btn.style.color = "var(--phosphor)";
    setTimeout(() => {
      btn.innerText = original;
      btn.style.borderColor = "";
      btn.style.color = "";
    }, 1600);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(showFeedback).catch(() => {
      fallbackCopy(text, showFeedback);
    });
  } else {
    fallbackCopy(text, showFeedback);
  }
}

function copyText(text, el) {
  const hint = el.querySelector(".cmd-copy-hint");
  const done = () => {
    if (!hint) return;
    const original = hint.innerText;
    hint.innerText = "[COPIED!]";
    hint.style.color = "var(--phosphor)";
    setTimeout(() => {
      hint.innerText = original;
      hint.style.color = "";
    }, 1600);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, onDone) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch (e) {}
  document.body.removeChild(ta);
  onDone();
}
