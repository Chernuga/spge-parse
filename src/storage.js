import { STORAGE_KEY, FILTER_KEY } from './constants.js';
import { state } from './state.js';
import { reportInput } from './dom.js';
import { sortLessonsByClassThenTime, generateCombinedReportFromLessons } from './parse.js';

// ---------- Persistence ----------
export function stashCurrentFilter() {
    const t = state.currentFilter.type;
    if (!t || !state.typeFilters[t]) return;
    state.typeFilters[t] = {
        name: state.currentFilter.name || '',
        name2: state.currentFilter.name2 || '',
        group: state.currentFilter.group || 'A',
        group2: state.currentFilter.group2 || 'A',
        compareMode: !!state.currentFilter.compareMode
    };
}
export function applyTypeFilterToCurrent(type) {
    const saved = state.typeFilters[type] || { name: '', name2: '', group: 'A', group2: 'A', compareMode: false };
    state.currentFilter.type = type;
    state.currentFilter.name = saved.name || '';
    state.currentFilter.name2 = saved.name2 || '';
    state.currentFilter.group = saved.group || 'A';
    state.currentFilter.group2 = saved.group2 || 'A';
    state.currentFilter.compareMode = !!saved.compareMode;
}
export function saveToStorage() {
    const data = { reportText: reportInput.value, allLessons: state.allLessons, parsed: state.allLessons.length > 0, combinedReportText: state.combinedReportText };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    stashCurrentFilter();
    const filterToSave = { type: state.currentFilter.type, perType: state.typeFilters };
    try { localStorage.setItem(FILTER_KEY, JSON.stringify(filterToSave)); } catch (e) {}
}
export function loadFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const d = JSON.parse(saved);
            if (d.reportText) reportInput.value = d.reportText;
            if (d.allLessons && d.allLessons.length) {
                state.allLessons = sortLessonsByClassThenTime(d.allLessons);
                state.combinedReportText = generateCombinedReportFromLessons(state.allLessons);
                reportInput.value = state.combinedReportText;
            }
        }
        const f = localStorage.getItem(FILTER_KEY);
        if (f) {
            try {
                const fd = JSON.parse(f);
                if (fd && fd.perType) {
                    ['class', 'teacher', 'room'].forEach(t => {
                        if (fd.perType[t]) state.typeFilters[t] = Object.assign({}, state.typeFilters[t], fd.perType[t]);
                    });
                    applyTypeFilterToCurrent(state.typeFilters[fd.type] ? fd.type : 'class');
                } else if (fd) {
                    const t = (fd.type === 'teacher' || fd.type === 'room') ? fd.type : 'class';
                    state.typeFilters[t] = {
                        name: fd.name || '', name2: fd.name2 || '',
                        group: fd.group || 'A', group2: fd.group2 || 'A',
                        compareMode: !!fd.compareMode
                    };
                    applyTypeFilterToCurrent(t);
                }
            } catch (e) {}
        }
    } catch (e) {}
}
