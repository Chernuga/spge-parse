import { themeToggle, scheduleSection } from './dom.js';
import { state } from './state.js';
import { renderSchedule } from './render.js';

// ---------- Theme-aware color adjustment ----------
export function adjustColorForTheme(color) {
    if (!color) return color;
    let r, g, b, a = 1;
    const s = String(color).trim();
    if (s[0] === '#') {
        const hex = s.slice(1);
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16); g = parseInt(hex[1] + hex[1], 16); b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6 || hex.length === 8) {
            r = parseInt(hex.slice(0, 2), 16); g = parseInt(hex.slice(2, 4), 16); b = parseInt(hex.slice(4, 6), 16);
            if (hex.length === 8) a = parseInt(hex.slice(6, 8), 16) / 255;
        } else { return color; }
    } else if (s.startsWith('rgb')) {
        const m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/);
        if (!m) return color;
        r = parseFloat(m[1]); g = parseFloat(m[2]); b = parseFloat(m[3]);
        if (m[4] !== undefined) a = parseFloat(m[4]);
    } else { return color; }
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    if (document.body.classList.contains('light-mode')) {
        const MAX_BRIGHTNESS = 185;
        if (brightness <= MAX_BRIGHTNESS) return color;
        const scale = MAX_BRIGHTNESS / brightness;
        const nr = Math.max(0, Math.min(255, Math.round(r * scale)));
        const ng = Math.max(0, Math.min(255, Math.round(g * scale)));
        const nb = Math.max(0, Math.min(255, Math.round(b * scale)));
        return a < 1 ? `rgba(${nr},${ng},${nb},${a})` : `rgb(${nr},${ng},${nb})`;
    }
    const MIN_BRIGHTNESS = 110;
    if (brightness >= MIN_BRIGHTNESS) return color;
    const t = (MIN_BRIGHTNESS - brightness) / (255 - brightness);
    const nr = Math.round(r + (255 - r) * t);
    const ng = Math.round(g + (255 - g) * t);
    const nb = Math.round(b + (255 - b) * t);
    return a < 1 ? `rgba(${nr},${ng},${nb},${a})` : `rgb(${nr},${ng},${nb})`;
}

// ---------- Theme handling ----------
export function setTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-mode');
        themeToggle.textContent = '☀️ Light';
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.remove('light-mode');
        themeToggle.textContent = '🌙 Dark';
        localStorage.setItem('theme', 'dark');
    }
    if (scheduleSection && scheduleSection.style.display !== 'none'
        && state.allLessons.length > 0) {
        renderSchedule();
    }
}
export function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') setTheme('light');
    else setTheme('dark');
}
