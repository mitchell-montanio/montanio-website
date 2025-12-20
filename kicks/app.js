const STORAGE_KEY = "kickCounterSessions_v1";

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
let selectedMinutes = 60;
let totalSeconds = 60 * 60;
let remainingSeconds = 60 * 60;
let kickCount = 0;
let startTimestamp = null; // ms
let tickInterval = null;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
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

function renderHistory() {
  const sessions = loadSessions();
  const host = document.getElementById("history");
  host.innerHTML = "";

  if (sessions.length === 0) {
    host.innerHTML = `<div class="muted">No sessions yet.</div>`;
    return;
  }

  // newest first
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

  // Prevent accidental zoom on iOS by keeping font-size >= 16 in inputs (already)
}

function updateStats() {
  timerEl.textContent = formatTime(remainingSeconds);
  kicksEl.textContent = String(kickCount);

  const elapsed = totalSeconds - remainingSeconds;
  const elapsedMinutes = Math.max(1 / 60, elapsed / 60); // avoid divide by 0
  const rate = kickCount / elapsedMinutes;
  kpmEl.textContent = rate.toFixed(2);
}

function startSession() {
  kickCount = 0;
  startTimestamp = Date.now();
  totalSeconds = selectedMinutes * 60;
  remainingSeconds = totalSeconds;

  noteEl.textContent = "";
  setUIState(true);
  updateStats();

  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      updateStats();
      finishSession(true, "Session complete. Saved.");
      return;
    }
    updateStats();
  }, 1000);
}

function finishSession(save, message) {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }

  const endedAt = Date.now();
  const durationSeconds = totalSeconds - remainingSeconds;

  if (save && startTimestamp) {
    const sessions = loadSessions();
    sessions.push({
      startedAt: startTimestamp,
      endedAt,
      durationSeconds: Math.max(0, Math.round(durationSeconds)),
      totalKicks: kickCount
    });
    saveSessions(sessions);
    renderHistory();
  }

  setUIState(false);
  startTimestamp = null;
  remainingSeconds = selectedMinutes * 60;
  kickCount = 0;
  updateStats();

  noteEl.textContent = message || "";
}

function kick() {
  kickCount += 1;

  // Haptics: subtle vibration if supported (Android mostly; iOS support varies)
  if (navigator.vibrate) navigator.vibrate(10);

  updateStats();
}

function populateMinutes() {
  const options = [];
  for (let m = 5; m <= 120; m += 5) options.push(m);

  minutesSelect.innerHTML = options
    .map(m => `<option value="${m}" ${m === 60 ? "selected" : ""}>${m} minutes</option>`)
    .join("");

  selectedMinutes = Number(minutesSelect.value);
  remainingSeconds = selectedMinutes * 60;
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
  a.download = `kick-sessions-${new Date().toISOString().slice(0,10)}.csv`;
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

// Wire up events
startBtn.addEventListener("click", () => startSession());
kickBtn.addEventListener("click", () => kick());
stopBtn.addEventListener("click", () => finishSession(true, "Saved."));
exportBtn.addEventListener("click", () => exportCSV());
clearBtn.addEventListener("click", () => clearHistory());

minutesSelect.addEventListener("change", () => {
  selectedMinutes = Number(minutesSelect.value);
  remainingSeconds = selectedMinutes * 60;
  updateStats();
});

// Init
populateMinutes();
renderHistory();
setUIState(false);
