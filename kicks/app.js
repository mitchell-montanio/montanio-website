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
let selectedMinutes = 120;
let totalSeconds = 120 * 60;
let remainingSeconds = 120 * 60;
let kickCount = 0;
let startTimestamp = null; // ms
let tickInterval = null;
// record kick timestamps (seconds since session start)
let kickTimesSec = [];
// tooltip element for SVG hover
let chartTooltip = null;

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
  kickTimesSec = [];
  startTimestamp = Date.now();
  totalSeconds = selectedMinutes * 60;
  remainingSeconds = totalSeconds;

  noteEl.textContent = "";
  setUIState(true);
  updateStats();
  renderCharts();

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
      ,
      // persist kick times for later analysis
      kickTimesSec: [...kickTimesSec]
    });
    saveSessions(sessions);
    renderHistory();
  }

  setUIState(false);
  startTimestamp = null;
  remainingSeconds = selectedMinutes * 60;
  kickCount = 0;
  kickTimesSec = [];
  updateStats();
  renderCharts();
  noteEl.textContent = message || "";
}

function kick() {
  if (!startTimestamp) return;

  kickCount += 1;

  // record elapsed seconds since session start
  const elapsed = Math.round((Date.now() - startTimestamp) / 1000);
  kickTimesSec.push(elapsed);

  // Haptics: subtle vibration if supported (Android mostly; iOS support varies)
  if (navigator.vibrate) navigator.vibrate(10);

  updateStats();
  renderCharts();
}

function populateMinutes() {
  const options = [];
  for (let m = 5; m <= 120; m += 5) options.push(m);

  minutesSelect.innerHTML = options
    .map(m => `<option value="${m}" ${m === 120 ? "selected" : ""}>${m} minutes</option>`)
    .join("");

  selectedMinutes = Number(minutesSelect.value);
  remainingSeconds = selectedMinutes * 60;
  updateStats();
  renderCharts();
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

// Render timeline ticks and intervals sparkline using SVG
function renderCharts() {
  const timeline = document.getElementById("timeline");
  const intervalsHost = document.getElementById("intervals");
  const chartMeta = document.getElementById("chartMeta");
  const intervalMeta = document.getElementById("intervalMeta");

  if (!timeline || !intervalsHost) return;

  // timeline ticks
  timeline.innerHTML = "";
  const dur = totalSeconds || (selectedMinutes * 60);
  for (const t of kickTimesSec) {
    const xPct = dur > 0 ? (t / dur) * 100 : 0;
    const d = document.createElement("div");
    d.className = "tick";
    d.style.left = `${xPct}%`;
    timeline.appendChild(d);
  }

  if (chartMeta) {
    if (kickTimesSec.length === 0) chartMeta.textContent = "";
    else {
      const first = kickTimesSec[0];
      const last = kickTimesSec[kickTimesSec.length - 1];
      chartMeta.textContent = `first: ${Math.floor(first/60)}m ${first%60}s • last: ${Math.floor(last/60)}m ${last%60}s`;
    }
  }

  // intervals
  intervalsHost.innerHTML = "";
  if (chartTooltip) chartTooltip.remove();
  chartTooltip = document.createElement("div");
  chartTooltip.className = "tooltip";
  chartTooltip.style.display = "none";
  intervalsHost.appendChild(chartTooltip);

  if (kickTimesSec.length < 2) {
    if (intervalMeta) intervalMeta.textContent = "";
    return;
  }

  const intervals = [];
  for (let i = 1; i < kickTimesSec.length; i++) intervals.push(kickTimesSec[i] - kickTimesSec[i-1]);

  if (intervalMeta) {
    const last = intervals[intervals.length - 1];
    const avg = intervals.reduce((a,b) => a+b, 0) / intervals.length;
    intervalMeta.textContent = `last: ${last}s • avg: ${avg.toFixed(1)}s`;
  }

  // build SVG
  const count = intervals.length;
  const svgW = Math.max(320, count * 40);
  const svgH = 120;
  const minVal = 0;
  const maxVal = Math.max(1, ...intervals);
  const pad = 12;

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  // grid lines
  for (let g = 0; g <= 4; g++) {
    const y = pad + ((svgH - pad*2) * g) / 4;
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", 0);
    line.setAttribute("y1", y);
    line.setAttribute("x2", svgW);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "rgba(255,255,255,0.04)");
    line.setAttribute("stroke-width", 1);
    svg.appendChild(line);
  }

  // polyline points
  const points = [];
  for (let i = 0; i < count; i++) {
    const x = (i / Math.max(1, count - 1)) * (svgW - pad*2) + pad;
    const v = intervals[i];
    const y = pad + (1 - (v - minVal) / (maxVal - minVal)) * (svgH - pad*2);
    points.push([x, y]);
  }

  // area fill (semi-transparent) + path
  const area = document.createElementNS(ns, 'path');
  const path = document.createElementNS(ns, "path");
  const d = points.map((p, i) => `${i===0? 'M':'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'rgba(37,99,235,0.95)');
  path.setAttribute('stroke-width', 2);

  const areaD = d + ` L ${svgW-pad} ${svgH-pad} L ${pad} ${svgH-pad} Z`;
  area.setAttribute('d', areaD);
  area.setAttribute('fill', 'rgba(37,99,235,0.08)');

  svg.appendChild(area);
  svg.appendChild(path);

  // points and hover
  points.forEach((p, i) => {
    const circ = document.createElementNS(ns, 'circle');
    circ.setAttribute('cx', p[0]);
    circ.setAttribute('cy', p[1]);
    circ.setAttribute('r', 4);
    circ.setAttribute('fill', 'rgba(229,231,235,0.95)');
    circ.setAttribute('stroke', 'rgba(0,0,0,0.2)');
    circ.style.cursor = 'pointer';
    // events
    circ.addEventListener('mouseenter', (e) => {
      chartTooltip.style.display = 'block';
      chartTooltip.textContent = `${intervals[i]}s`;
    });
    circ.addEventListener('mousemove', (e) => {
      const rect = intervalsHost.getBoundingClientRect();
      chartTooltip.style.left = `${e.clientX - rect.left}px`;
      chartTooltip.style.top = `${e.clientY - rect.top}px`;
    });
    circ.addEventListener('mouseleave', () => {
      chartTooltip.style.display = 'none';
    });
    svg.appendChild(circ);
  });

  intervalsHost.appendChild(svg);
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
