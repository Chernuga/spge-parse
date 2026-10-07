import { CLASS_LETTER_ORDER } from './constants.js';

// ---------- Parsing ----------
export function parseReport(text) { const blocks = text.split(/\n\s*\n/).filter(b => b.trim()); const lessons = []; blocks.forEach(block => { const lines = block.split('\n'), entry = {}; lines.forEach(line => { const idx = line.indexOf(':'); if (idx === -1) return; const key = line.substring(0, idx).trim().toLowerCase(), val = line.substring(idx + 1).trim(); switch (key) { case 'start': entry.start = parseInt(val); break; case 'end': entry.end = parseInt(val); break; case 'day': entry.day = parseInt(val); break; case 'subject': entry.subject = val; break; case 'room': entry.room = val; break; case 'class': entry.className = val; break; case 'teacher': entry.teacher = val; break; case 'color': entry.color = val; break; case 'type': entry.type = parseInt(val); break; case 'week': entry.week = val; break; case 'group': entry.group = parseInt(val); break; } }); if (entry.start !== undefined && entry.end !== undefined && entry.day !== undefined && entry.subject && entry.className && entry.teacher) { if (!entry.color) entry.color = '#888888'; if (entry.group === undefined) entry.group = 0; if (!entry.week) entry.week = 'C'; if (!entry.room) entry.room = '?'; lessons.push(entry); } }); return lessons; }

// ---------- Sorting helpers ----------
export function uppercaseClassSuffix(name) {
    return String(name || '').replace(/(\d+)([а-яa-z])/g, (_, num, letter) => num + letter.toUpperCase());
}
export function classSortKey(name) {
    const norm = uppercaseClassSuffix(name);
    const m = norm.match(/^(\d+)(.*)$/);
    const grade = m ? parseInt(m[1], 10) : 999;
    const suffix = m ? m[2] : norm;
    const idx = CLASS_LETTER_ORDER.indexOf(suffix);
    return { grade, idx: (idx === -1 ? 999 : idx), suffix };
}
export function compareClassNames(a, b) {
    const ka = classSortKey(a), kb = classSortKey(b);
    if (ka.grade !== kb.grade) return ka.grade - kb.grade;
    if (ka.idx !== kb.idx) return ka.idx - kb.idx;
    return ka.suffix.localeCompare(kb.suffix);
}
export function sortClassNames(names) { return [...names].sort(compareClassNames); }
export function sortLessonsByClassThenTime(lessons) {
    return [...lessons].sort((a, b) => {
        const c = compareClassNames(a.className || '', b.className || '');
        if (c !== 0) return c;
        if (a.day !== b.day) return a.day - b.day;
        return a.start - b.start;
    });
}

export function generateCombinedReportFromLessons(lessons) {
    const sorted = sortLessonsByClassThenTime(lessons);
    return sorted.map(l => `Start: ${l.start}\nEnd: ${l.end}\nDay: ${l.day}\nSubject: ${l.subject}\nRoom: ${l.room}\nClass: ${l.className}\nTeacher: ${l.teacher}\nColor: ${l.color}\nType: ${l.type}\nWeek: ${l.week}\nGroup: ${l.group}`).join('\n\n');
}
