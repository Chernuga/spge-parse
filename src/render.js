import { DAY_NAMES, START_TIMES, END_TIMES, MAX_PERIODS } from './constants.js';
import { state } from './state.js';
import { nameSelect, nameSelect2, groupSelect, groupSelect2, weekSelect, scheduleSection } from './dom.js';
import { adjustColorForTheme } from './theme.js';
import { escapeHtml, timeToMinutes, getCurrentDayIndex, getCurrentTimeMinutes, isLessonCurrent } from './utils.js';
import { refreshAllCustomSelects } from './selects.js';
import { sortClassNames } from './parse.js';

// ---------- Populate selects ----------
export function getNamesForType(type) { const set = new Set(); if (type === 'class') state.allLessons.forEach(l => { if (l.className) set.add(l.className); }); else if (type === 'teacher') state.allLessons.forEach(l => { if (l.teacher) set.add(l.teacher); }); else if (type === 'room') state.allLessons.forEach(l => { if (l.room) set.add(l.room); }); let names = Array.from(set); if (type === 'class') names = sortClassNames(names); else names.sort(); return names; }
export function populateNameSelects() {
    const type = state.currentFilter.type;
    const names = getNamesForType(type);
    nameSelect.innerHTML = '';
    nameSelect2.innerHTML = '';
    if (names.length === 0) {
        nameSelect.innerHTML = '';
        nameSelect2.innerHTML = '';
        refreshAllCustomSelects();
        return;
    }
    names.forEach(n => {
        const o1 = document.createElement('option');
        o1.value = n; o1.textContent = n; nameSelect.appendChild(o1);
        const o2 = document.createElement('option');
        o2.value = n; o2.textContent = n; nameSelect2.appendChild(o2);
    });
    if (state.currentFilter.name && names.includes(state.currentFilter.name)) {
        nameSelect.value = state.currentFilter.name;
    } else {
        nameSelect.value = names[0];
        state.currentFilter.name = names[0];
    }
    if (state.currentFilter.name2 && names.includes(state.currentFilter.name2)) {
        nameSelect2.value = state.currentFilter.name2;
    } else {
        if (names.length > 1) {
            const idx = names.indexOf(nameSelect.value);
            nameSelect2.value = names[(idx + 1) % names.length];
        } else {
            nameSelect2.value = names[0];
        }
        state.currentFilter.name2 = nameSelect2.value;
    }
    refreshAllCustomSelects();
}
export function toggleGroupVisibility() { const isClass = state.currentFilter.type === 'class'; document.querySelectorAll('.group-select').forEach(el => el.style.display = isClass ? '' : 'none'); if (!isClass) { groupSelect.value = 'A'; groupSelect2.value = 'A'; refreshAllCustomSelects(); } }

// ---------- Filtering ----------
export function filterLessonsFor(filterObj) { const { type, name, group, week } = filterObj; const effectiveGroup = (type === 'class') ? (group || 'A') : 'A'; return state.allLessons.filter(l => { if (type === 'class' && l.className !== name) return false; if (type === 'teacher' && l.teacher !== name) return false; if (type === 'room' && l.room !== name) return false; if (type === 'class') { if (effectiveGroup === 'A' && ![0,1].includes(l.group)) return false; if (effectiveGroup === 'B' && ![0,2].includes(l.group)) return false; } if (week === 'A' && !['A','C'].includes(l.week)) return false; if (week === 'B' && !['B','C'].includes(l.week)) return false; return true; }); }
export function getGroupText(code) { if (code === 1) return 'Group A'; if (code === 2) return 'Group B'; return 'Both'; }
export function getLessonTimeString(start, end) { const s = START_TIMES[start] || '??:??', e = END_TIMES[end] || '??:??'; return `[${s} - ${e}]`; }

// ---------- Rendering helpers ----------
export function sortLessons(list) { return [...list].sort((a, b) => a.start - b.start || a.subject.localeCompare(b.subject)); }

export function renderCardHTML(l, type, isCurrent) {
    const c = adjustColorForTheme(l.color || '#888888');
    const currentClass = isCurrent ? ' current-lesson' : '';
    const cardId = isCurrent ? ' id="current-lesson-card"' : '';
    const lessonColorVar = isCurrent ? `--lesson-color:${c};` : '';
    let details;
    if (type === 'teacher') {
        details = `<span>🏫 ${escapeHtml(l.className)}</span><span>👥 ${escapeHtml(getGroupText(l.group))}</span><span>🚪 ${escapeHtml(l.room)}</span>`;
    } else if (type === 'room') {
        details = `<span>🏫 ${escapeHtml(l.className)}</span><span>👤 ${escapeHtml(l.teacher)}</span><span>👥 ${escapeHtml(getGroupText(l.group))}</span>`;
    } else {
        details = `<span>🏫 ${escapeHtml(l.className)}</span><span>👤 ${escapeHtml(l.teacher)}</span><span>🚪 ${escapeHtml(l.room)}</span>`;
    }
    // Fixed text color (var(--text)) for readability — only the border and
    // the current-lesson glow keep the subject color
    return `<div class="lesson-card${currentClass}"${cardId} style="border-color:${c};${lessonColorVar}">`
        + `<div class="lesson-header">`
        +   `<div class="lesson-subject">${escapeHtml(l.subject)}</div>`
        +   `<div class="lesson-time">${getLessonTimeString(l.start, l.end)}</div>`
        + `</div>`
        + `<div class="lesson-details">${details}</div>`
        + `</div>`;
}

export function renderFillerCardHTML(startPeriod, endPeriod) {
    const startTime = START_TIMES[startPeriod] || '??:??';
    const endTime = END_TIMES[endPeriod] || '??:??';
    return `<div class="lesson-card filler-card">`
        +   `<div class="filler-time">${startTime} – ${endTime}</div>`
        +   `<div class="filler-label">Free time</div>`
        + `</div>`;
}

export function adjustDetailsLayout() {
    document.querySelectorAll('.lesson-details').forEach(el => {
        el.classList.remove('stacked');
        const kids = Array.from(el.children);
        if (kids.length < 2) return;

        const tops = kids.map(k => Math.round(k.getBoundingClientRect().top));
        const allSameLine = tops.every(t => t === tops[0]);
        if (allSameLine) return;

        el.classList.add('stacked');

        requestAnimationFrame(() => {
            if (!el.classList.contains('stacked')) return;
            const rects = Array.from(el.children).map(k => k.getBoundingClientRect());
            const uniqueTops = new Set(rects.map(r => Math.round(r.top)));
            if (uniqueTops.size < rects.length) {
                el.classList.remove('stacked');
            }
        });
    });
}

export function computeMarkerPeriod(lessons, currentDay, currentMinutes, dayIdx) {
    if (dayIdx !== currentDay || lessons.length === 0) return -2;
    if (lessons.some(l => isLessonCurrent(l, currentDay, currentMinutes))) return -2;
    for (let p = 0; p < MAX_PERIODS; p++) {
        const endP = timeToMinutes(END_TIMES[p + 1]);
        if (endP !== -1 && endP > currentMinutes) return p;
    }
    return MAX_PERIODS;
}

export function renderDayHTML(dayLessons, type, currentDay, currentMinutes) {
    const sorted = sortLessons(dayLessons);
    if (sorted.length === 0) return '';

    const dayIdx = sorted[0].day;
    const firstStart = Math.min(...sorted.map(l => l.start));
    const lastEnd = Math.min(MAX_PERIODS, Math.max(1, Math.max(...sorted.map(l => l.end))));

    const atPeriod = new Map();
    sorted.forEach(l => {
        if (!atPeriod.has(l.start)) atPeriod.set(l.start, []);
        atPeriod.get(l.start).push(l);
    });

    let markerAt = computeMarkerPeriod(sorted, currentDay, currentMinutes, dayIdx);
    let bottomMarker = false;
    if (markerAt >= lastEnd && markerAt !== -2) { bottomMarker = true; markerAt = -2; }

    // ----- Row planning -----
    const rowSizes = [];
    const periodStartRow = {};
    let curRow = 1;
    for (let p = 0; p < lastEnd; p++) {
        if (markerAt === p) {
            rowSizes.push('var(--marker-row-height, 6px)');
            curRow++;
        }
        periodStartRow[p] = curRow;
        rowSizes.push('var(--period-height, 74px)');
        curRow++;
    }
    periodStartRow[lastEnd] = curRow;

    let html = `<div class="period-grid" style="grid-template-rows:${rowSizes.join(' ')};">`;

    // ----- Filler card (free time before the first lesson) -----
    const markerInFiller = (markerAt >= 0 && markerAt < firstStart);
    if (firstStart > 0 && !markerInFiller) {
        const rowStart = periodStartRow[0];
        const rowEnd   = periodStartRow[firstStart - 1] + 1;
        html += `<div class="period-cell" style="grid-row:${rowStart} / ${rowEnd};">`
             +  renderFillerCardHTML(0, firstStart)
             +  `</div>`;
    } else if (firstStart > 0 && markerInFiller) {
        if (markerAt > 0) {
            const rowStart = periodStartRow[0];
            const rowEnd   = periodStartRow[markerAt - 1] + 1;
            html += `<div class="period-cell" style="grid-row:${rowStart} / ${rowEnd};">`
                 +  renderFillerCardHTML(0, markerAt)
                 +  `</div>`;
        }
        const markerRow = periodStartRow[markerAt] - 1;
        html += `<div class="period-marker" style="grid-row:${markerRow};grid-column:1 / -1;">`
             +  `<div class="current-time-line" id="current-time-marker"></div>`
             +  `</div>`;
        const rowStart = periodStartRow[markerAt];
        const rowEnd   = periodStartRow[firstStart - 1] + 1;
        html += `<div class="period-cell" style="grid-row:${rowStart} / ${rowEnd};">`
             +  renderFillerCardHTML(markerAt, firstStart)
             +  `</div>`;
    } else if (markerAt >= 0 && markerAt < lastEnd) {
        const markerRow = periodStartRow[markerAt] - 1;
        html += `<div class="period-marker" style="grid-row:${markerRow};grid-column:1 / -1;">`
             +  `<div class="current-time-line" id="current-time-marker"></div>`
             +  `</div>`;
    }

    // ----- Lesson cards -----
    for (let p = 0; p < lastEnd; p++) {
        if (!atPeriod.has(p)) continue;
        const group = atPeriod.get(p);
        const endPeriod = Math.max(...group.map(l => l.end));
        const rowStart = periodStartRow[p];
        const rowEnd   = periodStartRow[endPeriod - 1] + 1;
        html += `<div class="period-cell" style="grid-row:${rowStart} / ${rowEnd};">`;
        group.forEach(l => {
            html += renderCardHTML(l, type, isLessonCurrent(l, currentDay, currentMinutes));
        });
        html += `</div>`;
    }

    html += `</div>`;

    if (bottomMarker) {
        html += `<div class="current-time-line bottom-marker" id="current-time-marker"></div>`;
    }
    return html;
}

export function renderCompareDay(dayIdx, lessonsA, lessonsB, type, currentDay, currentMinutes) {
    const a = sortLessons(lessonsA);
    const b = sortLessons(lessonsB);
    if (a.length === 0 && b.length === 0) return '';

    const lastEndA = a.length ? Math.min(MAX_PERIODS, Math.max(1, Math.max(...a.map(l => l.end)))) : 0;
    const lastEndB = b.length ? Math.min(MAX_PERIODS, Math.max(1, Math.max(...b.map(l => l.end)))) : 0;
    const lastEnd = Math.max(lastEndA, lastEndB);

    const buildMap = list => {
        const m = new Map();
        list.forEach(l => {
            if (!m.has(l.start)) m.set(l.start, []);
            m.get(l.start).push(l);
        });
        return m;
    };
    const atA = buildMap(a);
    const atB = buildMap(b);

    const firstStartA = a.length ? Math.min(...a.map(l => l.start)) : -1;
    const firstStartB = b.length ? Math.min(...b.map(l => l.start)) : -1;

    let markerAtA = computeMarkerPeriod(a, currentDay, currentMinutes, dayIdx);
    let markerAtB = computeMarkerPeriod(b, currentDay, currentMinutes, dayIdx);
    let bottomA = false, bottomB = false;
    if (markerAtA >= lastEnd && markerAtA !== -2) { bottomA = true; markerAtA = -2; }
    if (markerAtB >= lastEnd && markerAtB !== -2) { bottomB = true; markerAtB = -2; }

    // ----- Row planning (union of both columns' marker rows) -----
    const markerPositions = new Set();
    if (markerAtA >= 0 && markerAtA < lastEnd) markerPositions.add(markerAtA);
    if (markerAtB >= 0 && markerAtB < lastEnd) markerPositions.add(markerAtB);

    const rowSizes = [];
    const periodStartRow = {};
    let curRow = 1;
    for (let p = 0; p < lastEnd; p++) {
        if (markerPositions.has(p)) {
            rowSizes.push('var(--marker-row-height, 6px)');
            curRow++;
        }
        periodStartRow[p] = curRow;
        rowSizes.push('var(--period-height, 74px)');
        curRow++;
    }
    periodStartRow[lastEnd] = curRow;

    // If either column needs its bottom marker AFTER the last period row,
    // append one shared extra row at the end for it/them.
    let bottomExtraRow = -1;
    const needExtraForA = bottomA && lastEndA >= lastEnd;
    const needExtraForB = bottomB && lastEndB >= lastEnd;
    if (needExtraForA || needExtraForB) {
        bottomExtraRow = curRow;
        rowSizes.push('var(--marker-row-height, 6px)');
        curRow++;
    }

    let html = `<div class="period-grid period-grid-compare" style="grid-template-rows:${rowSizes.join(' ')};">`;

    const emitFiller = (col, firstStart, markerAt) => {
        if (firstStart <= 0) return '';
        const markerInFiller = (markerAt >= 0 && markerAt < firstStart);
        let out = '';
        if (!markerInFiller) {
            const rowStart = periodStartRow[0];
            const rowEnd   = periodStartRow[firstStart - 1] + 1;
            out += `<div class="period-cell" style="grid-column:${col};grid-row:${rowStart} / ${rowEnd};">`
                 +  renderFillerCardHTML(0, firstStart)
                 +  `</div>`;
        } else {
            if (markerAt > 0) {
                const rowStart = periodStartRow[0];
                const rowEnd   = periodStartRow[markerAt - 1] + 1;
                out += `<div class="period-cell" style="grid-column:${col};grid-row:${rowStart} / ${rowEnd};">`
                     +  renderFillerCardHTML(0, markerAt)
                     +  `</div>`;
            }
            const rowStart = periodStartRow[markerAt];
            const rowEnd   = periodStartRow[firstStart - 1] + 1;
            out += `<div class="period-cell" style="grid-column:${col};grid-row:${rowStart} / ${rowEnd};">`
                 +  renderFillerCardHTML(markerAt, firstStart)
                 +  `</div>`;
        }
        return out;
    };
    html += emitFiller(1, firstStartA, markerAtA);
    html += emitFiller(2, firstStartB, markerAtB);

    const emitMarker = (col, markerAt) => {
        if (markerAt < 0 || markerAt >= lastEnd) return '';
        const markerRow = periodStartRow[markerAt] - 1;
        const id = col === 1 ? 'current-time-marker-a' : 'current-time-marker-b';
        return `<div class="period-marker" style="grid-row:${markerRow};grid-column:${col};">`
             +  `<div class="current-time-line" id="${id}"></div>`
             +  `</div>`;
    };
    html += emitMarker(1, markerAtA);
    html += emitMarker(2, markerAtB);

    const emitCards = (col, map) => {
        let out = '';
        for (let p = 0; p < lastEnd; p++) {
            if (!map.has(p)) continue;
            const group = map.get(p);
            const endPeriod = Math.max(...group.map(l => l.end));
            const rowStart = periodStartRow[p];
            const rowEnd   = periodStartRow[endPeriod - 1] + 1;
            out += `<div class="period-cell" style="grid-column:${col};grid-row:${rowStart} / ${rowEnd};">`;
            group.forEach(l => {
                out += renderCardHTML(l, type, isLessonCurrent(l, currentDay, currentMinutes));
            });
            out += `</div>`;
        }
        return out;
    };
    html += emitCards(1, atA);
    html += emitCards(2, atB);

    // Bottom markers — placed INSIDE the grid so each one sits right after
    // its own column's last lesson. If the column spans all the way to the
    // grid's last period row, its marker lands in the extra row we added.
    const emitBottomMarker = (col, flag, colLastEnd) => {
        if (!flag) return '';
        const markerRow = (colLastEnd < lastEnd)
            ? periodStartRow[colLastEnd]   // top of the next period row
            : bottomExtraRow;              // extra row at the very end
        if (markerRow < 0) return '';
        const id = col === 1 ? 'current-time-marker-a' : 'current-time-marker-b';
        return `<div class="period-marker period-marker-bottom" style="grid-row:${markerRow};grid-column:${col};">`
             +  `<div class="current-time-line" id="${id}"></div>`
             +  `</div>`;
    };
    html += emitBottomMarker(1, bottomA, lastEndA);
    html += emitBottomMarker(2, bottomB, lastEndB);

    html += `</div>`;

    return html;
}

// ---------- Main render ----------
export function renderSchedule() {
    const type = state.currentFilter.type;
    const week = weekSelect.value;
    const currentDay = getCurrentDayIndex();
    const currentMinutes = getCurrentTimeMinutes();

    if (state.currentFilter.compareMode) {
        const group1 = (type === 'class') ? groupSelect.value : 'A';
        const group2 = (type === 'class') ? groupSelect2.value : 'A';
        const f1 = { type, name: nameSelect.value, group: group1, week };
        const f2 = { type, name: nameSelect2.value, group: group2, week };
        const lessons1 = filterLessonsFor(f1);
        const lessons2 = filterLessonsFor(f2);

        let html = '';
        for (let d = 0; d < 5; d++) {
            const dayA = lessons1.filter(l => l.day === d);
            const dayB = lessons2.filter(l => l.day === d);
            if (dayA.length === 0 && dayB.length === 0) continue;
            html += `<div class="compare-day-row">`;
            html += `<div class="compare-day-header">${DAY_NAMES[d]}</div>`;
            html += renderCompareDay(d, dayA, dayB, type, currentDay, currentMinutes);
            html += `</div>`;
        }
        if (html === '') html = '<div class="empty-state">No lessons match the current filters.</div>';
        scheduleSection.innerHTML = html;
        requestAnimationFrame(adjustDetailsLayout);
        return;
    } else {
        const group = (type === 'class') ? groupSelect.value : 'A';
        const f = { type, name: nameSelect.value, group, week };
        const lessons = filterLessonsFor(f);
        let html = '';
        for (let d = 0; d < 5; d++) {
            const dayLessons = lessons.filter(l => l.day === d);
            if (dayLessons.length === 0) continue;
            html += `<div class="day-header">${DAY_NAMES[d]}</div>`;
            html += renderDayHTML(dayLessons, type, currentDay, currentMinutes);
        }
        if (html === '') html = '<div class="empty-state">No lessons match the current filters.</div>';
        scheduleSection.innerHTML = html;
        requestAnimationFrame(adjustDetailsLayout);
        return;
    }
}

// ---------- Scroll ----------
export function scrollToCurrentLesson() {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const target = scheduleSection.querySelector('.current-lesson')
                || scheduleSection.querySelector('.period-marker')
                || scheduleSection.querySelector('.current-time-line');
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });
}
export function performInitialScrollIfNeeded() { if (state.initialScrollDone) return; state.initialScrollDone = true; const indicator = scheduleSection.querySelector('.current-lesson') || scheduleSection.querySelector('.period-marker') || scheduleSection.querySelector('.current-time-line'); if (indicator) scrollToCurrentLesson(); }
