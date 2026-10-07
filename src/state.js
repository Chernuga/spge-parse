// Shared mutable app state. Everything that used to live in the single
// IIFE's closure lives here now.
export const state = {
    allLessons: [],
    currentFilter: { type: 'class', name: '', name2: '', group: 'A', group2: 'A', week: 'A', compareMode: false },
    typeFilters: {
        class:   { name: '', name2: '', group: 'A', group2: 'A', compareMode: false },
        teacher: { name: '', name2: '', group: 'A', group2: 'A', compareMode: false },
        room:    { name: '', name2: '', group: 'A', group2: 'A', compareMode: false }
    },
    combinedReportText: '',
    globalRecoloredSvgs: [],
    weekManuallyChanged: false,
    initialScrollDone: false
};
