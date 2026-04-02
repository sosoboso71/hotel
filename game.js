 // =============================
// CONFIG
// =============================
const FPS = 30;
const FRAME_TIME = 1000 / FPS;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// =============================
// STATE
// =============================
let lastFrame = 0;
let objects = [];
const avatarCache = {};

let chatEffects = [];
let shareEffects = [];
let giftEffects = [];

let chatMessageCounter = 0;

// =============================
// HOTEL WINDOWS
// =============================
let hotelWindows = [];

// =============================
// AVATAR CACHE
// =============================
function loadAvatar(url, callback) {
    if (!url) return;
    if (avatarCache[url]) {
        callback(avatarCache[url]);
        return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
        avatarCache[url] = img;
        callback(img);
    };
    img.src = url;
}

// =============================
// CALCULATE WINDOW POSITIONS
// =============================
function calculateWindows() {
    const hotel = document.getElementById("hotel");
    if (!hotel) return;

    const rect = hotel.getBoundingClientRect();

    // ZONA GEAMURILOR
    const startX = rect.left + rect.width * 0.10;
    const startY = rect.top + rect.height * 0.45;

    // FERESTRE MARI (20% × 22%)
    const winW = rect.width * 0.20;
    const winH = rect.height * 0.22;

    const gapX = rect.width * 0.05;
    const gapY = rect.height * 0.08;

    hotelWindows = [];

    // 3 etaje × 5 coloane
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 5; col++) {
            hotelWindows.push({
                x: startX + col * (winW + gapX),
                y: startY + row * (winH + gapY),
                width: winW,
                height: winH,
                filled: false
            });
        }
    }
}

// =============================
// PLACE AVATAR IN WINDOW
// =============================
function placeAvatarInWindow(avatarUrl) {
    const free = hotelWindows.filter(w => !w.filled);

    let w;
    if (free.length > 0) {
        // random în ferestre goale
        w = free[Math.floor(Math.random() * free.length)];
    } else {
        // toate pline → înlocuim random
        w = hotelWindows[Math.floor(Math.random() * hotelWindows.length)];
    }

    w.filled = true;

    loadAvatar(avatarUrl, (img) => {
        objects.push({
            type: "avatarEffect",
            img,
            x: w.x + w.width / 2 - 35,
            y: w.y + w.height / 2 - 35,
            life: 60,
            alpha: 1
        });
    });
}

// =============================
// RESIZE
// =============================
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    setTimeout(calculateWindows, 200);
}
window.addEventListener("resize", resize);
resize();

// =============================
// BACKGROUND (transparent)
// =============================
function drawBackground() {
    // fundal transparent
}

// =============================
// AVATAR EFFECTS (ROUND AVATARS)
// =============================
function renderAvatarEffects() {
    objects = objects.filter(o => o.life > 0);

    objects.forEach(o => {
        if (o.type !== "avatarEffect") return;

        ctx.save();
        ctx.globalAlpha = o.alpha;

        if (o.img) {
            // Avatar rotund
            ctx.save();
            ctx.beginPath();
            ctx.arc(o.x + 35, o.y + 35, 35, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            ctx.drawImage(o.img, o.x, o.y, 70, 70);
            ctx.restore();

            // Contur neon
            ctx.save();
            ctx.strokeStyle = "#00FFFF";
            ctx.lineWidth = 3;
            ctx.shadowColor = "#00FFFF";
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(o.x + 35, o.y + 35, 35, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();

        o.life--;
        o.alpha -= 0.02;
    });
}

// =============================
// SHARE EFFECTS
// =============================
function renderShareEffects() {
    shareEffects = shareEffects.filter(e => e.life > 0);

    shareEffects.forEach(e => {
        ctx.save();
        ctx.globalAlpha = e.alpha;

        ctx.fillStyle = "#1ABC9C";
        ctx.beginPath();
        ctx.moveTo(e.x, e.y + 15);
        ctx.lineTo(e.x + 30, e.y);
        ctx.lineTo(e.x + 30, e.y + 30);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        e.life--;
        e.alpha -= 0.02;
    });
}

// =============================
// GIFT EFFECTS (dezactivat pătratul)
// =============================
function renderGiftEffects() {
    // nu mai desenăm pătratul de gift
    return;
}

// =============================
// LOOP
// =============================
function update() {}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    // MASK CLUB peste HOTEL (0.40 din înălțime)
    ctx.save();
    ctx.font = "bold 90px Arial";
    ctx.fillStyle = "#00FFFF";
    ctx.shadowColor = "#00FFFF";
    ctx.shadowBlur = 25;
    ctx.textAlign = "center";
    ctx.fillText("MASK CLUB", canvas.width / 2, canvas.height * 0.40);
    ctx.restore();

    renderAvatarEffects();
    renderShareEffects();
    renderGiftEffects();
}

function gameLoop(ts) {
    if (ts - lastFrame >= FRAME_TIME) {
        update();
        render();
        lastFrame = ts;
    }
    requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

// =============================
// WEBSOCKET
// =============================
const ws = new WebSocket("ws://localhost:62024");

ws.onmessage = (event) => {
    let packet;
    try { packet = JSON.parse(event.data); } catch { return; }

    const data = packet.data || {};
    const username = data.nickname || data.uniqueId || "Anonim";
    const avatar = data.profilePictureUrl || "";

    // LIKE → fereastră
    if (packet.event === "like") {
        placeAvatarInWindow(avatar);
        return;
    }

    // CHAT → fereastră + efect lateral
    if (packet.event === "chat") {
        loadAvatar(avatar, (img) => {
            chatEffects.push({
                img,
                x: 20,
                y: canvas.height - 200 - chatEffects.length * 50,
                life: 60,
                alpha: 1
            });
        });

        placeAvatarInWindow(avatar);
        return;
    }

    // SHARE → fereastră + efect săgeată
    if (packet.event === "share") {
        shareEffects.push({
            x: canvas.width - 300,
            y: canvas.height - 200 - shareEffects.length * 50,
            life: 60,
            alpha: 1
        });

        placeAvatarInWindow(avatar);
        return;
    }

    // GIFT → doar fereastră (fără pătrat)
    if (packet.event === "gift") {
        placeAvatarInWindow(avatar);
        return;
    }
};

ws.onopen = () => console.log("WebSocket connected");
ws.onerror = (err) => console.log("WebSocket error:", err);
ws.onclose = () => console.log("WebSocket closed");
