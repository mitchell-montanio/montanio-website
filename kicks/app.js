const STORAGE_KEY = "kickCounterSessions_v1";
const ACTIVE_KEY = "kickCounterActive_v1";

const minutesSelect = document.getElementById("minutes");
const timerEl = document.getElementById("timer");
const kicksEl = document.getElementById("kicks");
const kpmEl = document.getElementById("kpm");
const noteEl = document.getElementById("note");

const startBtn = document.getElementById("startBtn");
const kickBtn = document.getElementById("kickBtn");
const stopBtn = document.getElementById("stopBtn");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");

let isRunning = false;
let selectedMinutes = 120;

let totalSeconds = 120 * 60;
let remainingSeconds = 120 * 60;

let kickCount = 0;
let startTimestamp = null; // ms
let endTimestamp = null;   // ms

let tickInterval = null;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${pad2(s)}`;
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function saveActive() {
  if (!isRunning || !startTimestamp || !endTimestamp) {
    localStorage.removeItem(ACTIVE_KEY);
    return;
  }
  localStorage.setItem(
    ACTIVE_KEY,
    JSON.stringify({
      selectedMinutes,
      totalSeconds,
      startTimestamp,
      endTimestamp,
      kickCount
    })
  );
}

function loadActive() {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    // Minimal validation
    if (!obj.startTimestamp || !obj.endTimestamp || !obj.totalSeconds) return null;
    return obj;
  } catch {
    return null;
  }
}

function clearActive() {
  localStorage.removeItem(ACTIVE_KEY);
}

function renderHistory() {
  const sessions = loadSessions();
  const host = document.getElementById("history");
  host.innerHTML = "";

  if (sessions.length === 0) {
    host.innerHTML = `<div class="muted">No sessions yet.</div>`;
    return;
  }

  const ordered = [...sessions].sort((a, b) => b.startedAt - a.startedAt);

  for (const s of ordered) {
    const started = new Date(s.startedAt);
    const mins = Math.max(1, Math.round(s.durationSeconds / 60));
    const rate = s.totalKicks / mins;

    const div = document.createElement("div");
    div.className = "hitem";
    div.innerHTML = `
      <div class="top">
        <div class="date">${started.toLocaleString()}</div>
        <div><b>${s.totalKicks}</b> kicks</div>
      </div>
      <div class="meta">
        ${mins} min • ${rate.toFixed(2)} kicks/min
      </div>
    `;
    host.appendChild(div);
  }
}

function setUIState(running) {
  isRunning = running;
  minutesSelect.disabled = running;

  startBtn.disabled = running;
  kickBtn.disabled = !running;
  stopBtn.disabled = !running;
}

function computeRemainingSeconds() {
  if (!isRunning || !endTimestamp) return remainingSeconds;
  const msLeft = endTimestamp - Date.now();
  return Math.ceil(msLeft / 1000);
}

function computeElapsedSeconds() {
  if (!isRunning || !startTimestamp) return totalSeconds - remainingSeconds;
  const elapsedMs = Date.now() - startTimestamp;
  // Clamp to [0, totalSeconds]
  return Math.min(totalSeconds, Math.max(0, Math.floor(elapsedMs / 1000)));
}

function updateStats() {
  if (isRunning) {
    remainingSeconds = computeRemainingSeconds();
    if (remainingSeconds < 0) remainingSeconds = 0;
  }

  timerEl.textContent = formatTime(remainingSeconds);
  kicksEl.textContent = String(kickCount);

  const elapsed = isRunning ? computeElapsedSeconds() : (totalSeconds - remainingSeconds);
  const elapsedMinutes = Math.max(1 / 60, elapsed / 60);
  const rate = kickCount / elapsedMinutes;
  kpmEl.textContent = rate.toFixed(2);
}

function startTicker() {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    updateStats();
    saveActive();

    if (isRunning && remainingSeconds <= 0) {
      finishSession(true, "Session complete. Saved.");
    }
  }, 250); // UI refresh; not the source of truth
}

function stopTicker() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

function startSession() {
  kickCount = 0;
  startTimestamp = Date.now();

  totalSeconds = selectedMinutes * 60;
  endTimestamp = startTimestamp + totalSeconds * 1000;
  remainingSeconds = totalSeconds;

  noteEl.textContent = "";
  setUIState(true);

  updateStats();
  saveActive();
  startTicker();
}

function finishSession(save, message) {
  stopTicker();

  const endedAt = Date.now();
  const durationSeconds = isRunning && startTimestamp
    ? Math.min(totalSeconds, Math.max(0, Math.round((endedAt - startTimestamp) / 1000)))
    : Math.max(0, Math.round(totalSeconds - remainingSeconds));

  if (save && startTimestamp) {
    const sessions = loadSessions();
    sessions.push({
      startedAt: startTimestamp,
      endedAt,
      durationSeconds,
      totalKicks: kickCount
    });
    saveSessions(sessions);
    renderHistory();
  }

  setUIState(false);
  clearActive();

  // Reset UI to selected duration
  startTimestamp = null;
  endTimestamp = null;
  remainingSeconds = selectedMinutes * 60;
  kickCount = 0;
  totalSeconds = selectedMinutes * 60;

  updateStats();
  noteEl.textContent = message || "";
}

function kick() {
  if (!isRunning) return;

  kickCount += 1;

  if (navigator.vibrate) navigator.vibrate(10);

  updateStats();
  saveActive();
}

function populateMinutes() {
  const options = [];
  for (let m = 5; m <= 120; m += 5) options.push(m);

  minutesSelect.innerHTML = options
    .map(m => `<option value="${m}" ${m === 120 ? "selected" : ""}>${m} minutes</option>`)
    .join("");

  selectedMinutes = Number(minutesSelect.value);
  totalSeconds = selectedMinutes * 60;
  remainingSeconds = totalSeconds;
  updateStats();
}

function exportCSV() {
  const sessions = loadSessions();
  if (sessions.length === 0) {
    noteEl.textContent = "No sessions to export.";
    return;
  }

  const header = ["startedAt", "endedAt", "durationSeconds", "totalKicks", "kicksPerMinute"];
  const rows = sessions.map(s => {
    const mins = Math.max(1, Math.round(s.durationSeconds / 60));
    const kpm = s.totalKicks / mins;
    return [
      new Date(s.startedAt).toISOString(),
      new Date(s.endedAt).toISOString(),
      s.durationSeconds,
      s.totalKicks,
      kpm.toFixed(2)
    ];
  });

  const csv = [header, ...rows]
    .map(r => r.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `kick-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  noteEl.textContent = "Exported CSV.";
}

function clearHistory() {
  if (!confirm("Clear all saved sessions?")) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
  noteEl.textContent = "History cleared.";
}

// --- Visibility + focus handlers (snap timer correctly when returning) ---
document.addEventListener("visibilitychange", () => {
  if (isRunning) {
    updateStats();
    saveActive();

    if (remainingSeconds <= 0) {
      finishSession(true, "Session complete. Saved.");
    }
  }
});

window.addEventListener("focus", () => {
  if (isRunning) {
    updateStats();
    saveActive();

    if (remainingSeconds <= 0) {
      finishSession(true, "Session complete. Saved.");
    }
  }
});

// Wire up events
startBtn.addEventListener("click", () => startSession());
kickBtn.addEventListener("click", () => kick());
stopBtn.addEventListener("click", () => finishSession(true, "Saved."));
exportBtn.addEventListener("click", () => exportCSV());
clearBtn.addEventListener("click", () => clearHistory());

minutesSelect.addEventListener("change", () => {
  selectedMinutes = Number(minutesSelect.value);

  // If not running, update displayed remaining immediately
  if (!isRunning) {
    totalSeconds = selectedMinutes * 60;
    remainingSeconds = totalSeconds;
    updateStats();
  }
});

// Init
populateMinutes();
renderHistory();
setUIState(false);

// Resume active session if present
const active = loadActive();
if (active) {
  selectedMinutes = Number(active.selectedMinutes || 120);
  totalSeconds = Number(active.totalSeconds || selectedMinutes * 60);
  startTimestamp = Number(active.startTimestamp);
  endTimestamp = Number(active.endTimestamp);
  kickCount = Number(active.kickCount || 0);

  // Keep the select in sync
  minutesSelect.value = String(selectedMinutes);

  setUIState(true);
  updateStats();

  // If it already ended while we were away, finalize immediately
  if (computeRemainingSeconds() <= 0) {
    updateStats();
    finishSession(true, "Session complete (recovered). Saved.");
  } else {
    noteEl.textContent = "Resumed running session.";
    startTicker();
  }
}
