const API_URL = window.location.origin;
let state = { robots: [], tasks: [], stats: { avg_energy: 100, completed_count: 0, active_tasks: 0, fleet_size: 0 } };
let interactionMode = 'TASK';
let autoTaskEnabled = false;
let explosions = [];
let isPaused = false;

// Map State (Zoom & Pan)
let zoom = 1.0;
let offsetX = 0;
let offsetY = 0;
let isPanning = false;
let startPanX = 0;
let startPanY = 0;

// DOM Elements
const loginOverlay = document.getElementById('login-overlay');
const dashboard = document.getElementById('dashboard');
const loginBtn = document.getElementById('login-btn');
const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');
const robotList = document.getElementById('robot-list');
const logs = document.getElementById('logs');
const modeDisplay = document.getElementById('interaction-mode-display');
const connStatus = document.getElementById('connection-status');

// --- UTILS ---
function announce(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.rate = 1.0;
        msg.pitch = 0.9;
        window.speechSynthesis.speak(msg);
    }
}

function addLog(msg) {
    const div = document.createElement('div');
    div.innerText = `${new Date().toLocaleTimeString()} ${msg}`;
    logs.prepend(div);
}

// --- AUTHENTICATION ---
loginBtn.onclick = async () => {
    const username = document.getElementById('username').value || 'admin';
    const password = document.getElementById('password').value || 'password';
    const status = document.getElementById('login-status');

    status.style.color = 'var(--accent-blue)';
    status.innerText = 'Connecting to Mission Control...';

    try {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const res = await fetch(`${API_URL}/login`, { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Auth Failed');

        const data = await res.json();

        document.getElementById('user-display').innerText = username.toUpperCase();
        document.getElementById('role-display').innerText = data.role.toUpperCase();

        loginOverlay.style.opacity = '0';
        setTimeout(() => {
            loginOverlay.style.display = 'none';
            dashboard.style.display = 'grid';
            startLoop();
            announce(`Welcome back ${username}. Swarm Mission Control system is now online.`);
        }, 500);

        addLog(`[AUTH] User ${username} logged in as ${data.role}`);
    } catch (err) {
        status.style.color = '#ff4444';
        status.innerText = `Error: ${err.message}. Ensure backend is running.`;
    }
};

// --- LOGOUT ---
window.logout = () => {
    console.log('Logout function called');
    announce('Logging out. Goodbye.');

    if (dashboard) dashboard.style.display = 'none';
    if (loginOverlay) {
        loginOverlay.style.display = 'flex';
        loginOverlay.style.opacity = '1';
    }

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    setTimeout(() => {
        window.location.href = window.location.origin + window.location.pathname;
    }, 500);
};

// --- MAP TRANSFORMATIONS ---
function toWorldCoords(screenX, screenY) {
    return {
        x: (screenX - offsetX) / zoom,
        y: (screenY - offsetY) / zoom
    };
}

function handleZoom(delta, centerX, centerY) {
    const oldZoom = zoom;
    zoom *= (delta > 0 ? 0.9 : 1.1);
    zoom = Math.max(0.2, Math.min(5, zoom));

    // Zoom towards center/mouse
    offsetX -= (centerX - offsetX) * (zoom / oldZoom - 1);
    offsetY -= (centerY - offsetY) * (zoom / oldZoom - 1);
}

// --- SIMULATION LOOP ---
async function startLoop() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Map Interaction Listeners
    canvas.onwheel = (e) => {
        e.preventDefault();
        handleZoom(e.deltaY, e.offsetX, e.offsetY);
    };

    canvas.onmousedown = (e) => {
        if (e.button === 0) { // Left click
            isPanning = true;
            startPanX = e.offsetX - offsetX;
            startPanY = e.offsetY - offsetY;
        }
    };

    window.onmousemove = (e) => {
        if (isPanning) {
            offsetX = e.offsetX - startPanX;
            offsetY = e.offsetY - startPanY;
        }
    };

    window.onmouseup = () => {
        isPanning = false;
    };

    // Touch Support
    let lastTouchDist = 0;
    canvas.ontouchstart = (e) => {
        if (e.touches.length === 1) {
            isPanning = true;
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            startPanX = (touch.clientX - rect.left) - offsetX;
            startPanY = (touch.clientY - rect.top) - offsetY;
        } else if (e.touches.length === 2) {
            lastTouchDist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
        }
    };

    canvas.ontouchmove = (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        if (e.touches.length === 1 && isPanning) {
            const touch = e.touches[0];
            offsetX = (touch.clientX - rect.left) - startPanX;
            offsetY = (touch.clientY - rect.top) - startPanY;
        } else if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
            handleZoom(lastTouchDist - dist, centerX, centerY);
            lastTouchDist = dist;
        }
    };

    canvas.ontouchend = () => {
        isPanning = false;
        lastTouchDist = 0;
    };

    setInterval(async () => {
        try {
            const res = await fetch(`${API_URL}/state`);
            if (!res.ok) {
                connStatus.innerText = '● OFFLINE';
                connStatus.style.color = '#ff4444';
                return;
            }
            connStatus.innerText = '● ONLINE';
            connStatus.style.color = '#00ff88';

            const newState = await res.json();

            if (newState.last_event && (!state.last_event || newState.last_event.time > state.last_event.time)) {
                handleEvent(newState.last_event);
            }

            state = newState;
            updateUI();
            draw();
        } catch (err) {
            connStatus.innerText = '● OFFLINE';
            connStatus.style.color = '#ff4444';
        }
    }, 100);
}

function handleEvent(event) {
    if (event.type === 'failure') {
        explosions.push({ x: event.x, y: event.y, radius: 0, alpha: 1 });
        addLog(`[CRITICAL] Robot ${event.id} hardware failure!`);
        announce(`Critical failure detected on Robot ${event.id}. Initiating swarm re-allocation.`);
    } else if (event.type === 'deploy') {
        addLog(`[SYSTEM] New robot unit deployed.`);
        announce(`New robot unit deployed to the field.`);
    } else if (event.type === 'reset') {
        addLog(`[SYSTEM] Mission reset. All systems recalibrated.`);
        announce(`Mission reset initiated.`);
        explosions = [];
        autoTaskEnabled = false;
        isPaused = false;
        document.getElementById('auto-task-btn').innerText = `AUTO: OFF`;
        document.getElementById('pause-btn').innerText = `PAUSE`;
        document.getElementById('pause-btn').style.background = 'rgba(255, 255, 255, 0.05)';
    } else if (event.type === 'clear_tasks') {
        addLog(`[SYSTEM] All tasks cleared.`);
        announce(`All tasks cleared.`);
    }
}

function updateUI() {
    robotList.innerHTML = state.robots.map(r => `
        <div class="robot-card" style="border-left: 4px solid ${r.is_active ? 'var(--accent-blue)' : '#ff4444'}">
            <div class="robot-header">
                <span>ROBOT ${r.id}</span>
                <span style="color: ${r.energy < 20 ? '#ff4444' : '#00ff88'}">${r.energy}%</span>
            </div>
            <div class="energy-bar">
                <div class="energy-fill" style="width: ${r.energy}%; background: ${r.energy < 20 ? '#ff4444' : '#00ff88'}"></div>
            </div>
            <div style="font-size: 0.7rem; color: #b0b0c0; margin-top: 8px;">
                STATUS: ${r.status.toUpperCase()}
            </div>
        </div>
    `).join('');

    if (state.stats) {
        document.getElementById('active-tasks').innerText = state.stats.active_tasks;
        document.getElementById('completed-tasks').innerText = state.stats.completed_count;
        document.getElementById('fleet-energy').innerText = `${state.stats.avg_energy}%`;
        document.getElementById('fleet-energy').style.color = state.stats.avg_energy < 20 ? '#ff4444' : 'white';
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(zoom, zoom);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1 / zoom;
    const gridSize = 50;
    const startX = Math.floor(-offsetX / zoom / gridSize) * gridSize;
    const startY = Math.floor(-offsetY / zoom / gridSize) * gridSize;
    const endX = startX + canvas.width / zoom + gridSize * 2;
    const endY = startY + canvas.height / zoom + gridSize * 2;

    for (let i = startX; i < endX; i += gridSize) {
        ctx.beginPath(); ctx.moveTo(i, startY); ctx.lineTo(i, endY); ctx.stroke();
    }
    for (let i = startY; i < endY; i += gridSize) {
        ctx.beginPath(); ctx.moveTo(startX, i); ctx.lineTo(endX, i); ctx.stroke();
    }

    // Tasks
    state.tasks.forEach(t => {
        ctx.fillStyle = t.priority > 3 ? '#ff4444' : '#ff8c00';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = `${10 / zoom}px Inter`;
        ctx.fillText(`T${t.id}`, t.x + 10, t.y - 10);
    });

    // Robots
    state.robots.forEach(r => {
        if (!r.is_active) {
            ctx.strokeStyle = '#ff4444';
            ctx.setLineDash([2 / zoom, 2 / zoom]);
        } else {
            ctx.strokeStyle = '#00d2ff';
            ctx.setLineDash([]);
        }

        ctx.lineWidth = 2 / zoom;
        ctx.strokeRect(r.x - 15, r.y - 15, 30, 30);

        if (r.is_active && r.status.includes('Executing')) {
            const target = state.tasks.find(t => t.assigned_to === r.id);
            if (target) {
                ctx.save();
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(0, 210, 255, 0.4)';
                ctx.setLineDash([5 / zoom, 5 / zoom]);
                ctx.moveTo(r.x, r.y);
                ctx.lineTo(target.x, target.y);
                ctx.stroke();
                ctx.restore();
            }
        }

        ctx.fillStyle = r.is_active ? '#00d2ff' : '#ff4444';
        ctx.beginPath();
        ctx.arc(r.x, r.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = `${10 / zoom}px Inter`;
        ctx.fillText(`R${r.id}`, r.x - 10, r.y + 30);
    });

    // Explosions
    explosions.forEach((exp, index) => {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 68, 68, ${exp.alpha})`;
        ctx.lineWidth = 3 / zoom;
        ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
        ctx.stroke();

        exp.radius += 2;
        exp.alpha -= 0.02;
        if (exp.alpha <= 0) explosions.splice(index, 1);
        ctx.restore();
    });

    ctx.restore();
}

// --- INTERACTION HANDLERS ---

document.getElementById('zoom-in').onclick = () => handleZoom(-1, canvas.width / 2, canvas.height / 2);
document.getElementById('zoom-out').onclick = () => handleZoom(1, canvas.width / 2, canvas.height / 2);

document.getElementById('deploy-mode-btn').onclick = () => {
    interactionMode = interactionMode === 'TASK' ? 'DEPLOY' : 'TASK';
    modeDisplay.innerText = `MODE: ${interactionMode === 'TASK' ? 'INJECT TASK' : 'DEPLOY ROBOT'}`;
    modeDisplay.style.color = interactionMode === 'TASK' ? 'white' : 'var(--accent-green)';
    addLog(`[SYSTEM] Mode changed to ${interactionMode}`);
};

document.getElementById('quick-robot-btn').onclick = async () => {
    const world = toWorldCoords(canvas.width / 2, canvas.height / 2);
    try {
        await fetch(`${API_URL}/robots/deploy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: world.x, y: world.y })
        });
        addLog(`[SYSTEM] Quick-deploying robot...`);
    } catch (err) {
        addLog(`[ERROR] Quick deploy failed.`);
    }
};

document.getElementById('fail-btn').onclick = async () => {
    try {
        await fetch(`${API_URL}/control/fail`, { method: 'POST' });
        addLog(`[SYSTEM] Triggering failure...`);
    } catch (err) {
        addLog(`[ERROR] Fail trigger failed.`);
    }
};

document.getElementById('reset-btn').onclick = async () => {
    try {
        await fetch(`${API_URL}/control/reset`, { method: 'POST' });
        addLog(`[SYSTEM] Resetting mission...`);
    } catch (err) {
        addLog(`[ERROR] Reset failed.`);
    }
};

document.getElementById('clear-tasks-btn').onclick = async () => {
    try {
        await fetch(`${API_URL}/control/clear-tasks`, { method: 'POST' });
        addLog(`[SYSTEM] Clearing tasks...`);
    } catch (err) {
        addLog(`[ERROR] Clear tasks failed.`);
    }
};

document.getElementById('auto-task-btn').onclick = async () => {
    autoTaskEnabled = !autoTaskEnabled;
    try {
        await fetch(`${API_URL}/control/auto-task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: autoTaskEnabled })
        });
        document.getElementById('auto-task-btn').innerText = `AUTO: ${autoTaskEnabled ? 'ON' : 'OFF'}`;
        addLog(`[SYSTEM] Auto-Task: ${autoTaskEnabled ? 'ON' : 'OFF'}`);
    } catch (err) {
        addLog(`[ERROR] Auto-task toggle failed.`);
    }
};

canvas.onclick = async (e) => {
    if (isPanning) return; // Don't trigger click if we were panning

    const rect = canvas.getBoundingClientRect();
    const world = toWorldCoords(e.clientX - rect.left, e.clientY - rect.top);

    try {
        if (interactionMode === 'TASK') {
            await fetch(`${API_URL}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ x: world.x, y: world.y, priority: 5 })
            });
            addLog(`[MISSION] Task injected at (${Math.round(world.x)}, ${Math.round(world.y)})`);
        } else {
            await fetch(`${API_URL}/robots/deploy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ x: world.x, y: world.y })
            });
            addLog(`[SYSTEM] Robot deployed at (${Math.round(world.x)}, ${Math.round(world.y)})`);
        }
    } catch (err) {
        addLog(`[ERROR] Canvas interaction failed.`);
    }
};

document.getElementById('add-task-btn').onclick = async () => {
    const world = toWorldCoords(Math.random() * canvas.width, Math.random() * canvas.height);
    try {
        await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: world.x, y: world.y, priority: 3 })
        });
        addLog(`[MISSION] Random task injected.`);
    } catch (err) {
        addLog(`[ERROR] Random task failed.`);
    }
};

document.getElementById('pause-btn').onclick = async (e) => {
    const btn = e.target;
    try {
        if (!isPaused) {
            await fetch(`${API_URL}/control/pause`, { method: 'POST' });
            btn.innerText = 'RESUME';
            btn.style.background = 'var(--accent-green)';
            isPaused = true;
            addLog('[SYSTEM] Mission Paused');
            announce("Mission paused.");
        } else {
            await fetch(`${API_URL}/control/resume`, { method: 'POST' });
            btn.innerText = 'PAUSE';
            btn.style.background = 'rgba(255, 255, 255, 0.05)';
            isPaused = false;
            addLog('[SYSTEM] Mission Resumed');
            announce("Mission resumed.");
        }
    } catch (err) {
        addLog(`[ERROR] Pause/Resume failed.`);
    }
};

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

// Attach logout listener
document.getElementById('logout-btn').onclick = window.logout;
