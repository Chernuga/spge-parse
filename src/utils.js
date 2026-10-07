import { START_TIMES, END_TIMES } from './constants.js';

export function escapeHtml(t) {
    const m = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return t.replace(/[&<>"']/g, c => m[c]);
}

// ---------- Time / week utilities ----------
export function getISOWeekNumber(date) { const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())); const dayNum = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dayNum); const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil((((d - yearStart) / 86400000) + 1) / 7); }
export function getCurrentWeekType() { const weekNum = getISOWeekNumber(new Date()); return (weekNum % 2 === 0) ? 'A' : 'B'; }
export function timeToMinutes(timeStr) { if (!timeStr) return -1; const parts = timeStr.split(':'); if (parts.length !== 2) return -1; return parseInt(parts[0]) * 60 + parseInt(parts[1]); }
export function getCurrentDayIndex() { const jsDay = new Date().getDay(); if (jsDay === 0 || jsDay === 6) return -1; return jsDay - 1; }
export function getCurrentTimeMinutes() { const now = new Date(); return now.getHours() * 60 + now.getMinutes(); }
export function getLessonTimeRange(lesson) { const startTime = START_TIMES[lesson.start]; const endTime = END_TIMES[lesson.end]; if (!startTime || !endTime) return null; return { startMinutes: timeToMinutes(startTime), endMinutes: timeToMinutes(endTime) }; }
export function isLessonCurrent(lesson, currentDay, currentMinutes) { if (lesson.day !== currentDay) return false; const range = getLessonTimeRange(lesson); if (!range) return false; return currentMinutes >= range.startMinutes && currentMinutes < range.endMinutes; }
