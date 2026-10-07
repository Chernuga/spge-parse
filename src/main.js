import './css/main.css';

import { MAX_RETRIES, RETRY_DELAY_MS } from './constants.js';
import { state } from './state.js';
import {
    reportInput, fileInput, loadFileBtn, parseBtn, filterSection,
    nameSelect, nameSelect2, secondScheduleSelect, scheduleSelectsContainer,
    compareToggle, groupSelect, groupSelect2, weekSelect, weekIndicator,
    weekIndicatorText, scheduleSection, viewTypeRadios, themeToggle,
    selectPdfBtn, pdfFilesInput, selectedPdfNames, convertAllBtn,
    downloadCombinedBtn, copyCombinedBtn, downloadRecoloredBtn,
    progressWrap, progressFill, fetchOnlineBtn, onlineProgressWrap,
    onlineProgressFill, onlineDownloadCombinedBtn, onlineCopyCombinedBtn,
    onlineDownloadRecoloredBtn, urlInputs, tabBtns, tabPanels, setStatus,
    settingsSection, settingsToggle, glassToggle
} from './dom.js';
import { getCurrentWeekType } from './utils.js';
import { initTheme, setTheme } from './theme.js';
import { initCustomSelects, refreshAllCustomSelects } from './selects.js';
import { parseReport, sortLessonsByClassThenTime, generateCombinedReportFromLessons } from './parse.js';
import { stashCurrentFilter, applyTypeFilterToCurrent, saveToStorage, loadFromStorage } from './storage.js';
import {
    getNamesForType, populateNameSelects, toggleGroupVisibility,
    adjustDetailsLayout, renderSchedule, performInitialScrollIfNeeded
} from './render.js';
import {
    processPDFBuffer, processAllPages, mergeNewPages,
    fetchPDFViaNetlifyFunction, getGradeFromFilename
} from './pdf.js';
import JSZip from 'jszip';

// ---------- Theme toggle ----------
themeToggle.addEventListener('click', () => {
    if (document.body.classList.contains('light-mode')) setTheme('dark');
    else setTheme('light');
});

// ---------- Settings panel ----------
function setSettingsOpen(open) {
    settingsSection.classList.toggle('open', open);
    settingsToggle.classList.toggle('open', open);
}
settingsToggle.addEventListener('click', () => setSettingsOpen(!settingsSection.classList.contains('open')));

// ---------- Liquid Glass toggle ----------
function applyGlass(enabled) {
    document.body.classList.toggle('glass-off', !enabled);
    localStorage.setItem('glass', enabled ? 'on' : 'off');
}
glassToggle.addEventListener('change', () => applyGlass(glassToggle.checked));

// ---------- Week indicator ----------
function updateWeekIndicator() {
    const detectedWeek = getCurrentWeekType();
    const selectedWeek = weekSelect.value;
    if (selectedWeek === detectedWeek && !state.weekManuallyChanged) {
        weekIndicator.style.display = 'flex';
        weekIndicatorText.textContent = `Auto-detected: Week ${detectedWeek} (current week)`;
    } else if (state.weekManuallyChanged) {
        weekIndicator.style.display = 'flex';
        weekIndicatorText.textContent = `Manual selection: Week ${selectedWeek} (auto: Week ${detectedWeek})`;
    } else {
        weekIndicator.style.display = 'none';
    }
}

// ---------- Tab switching ----------
tabBtns.forEach(btn => { btn.addEventListener('click', () => { tabBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active'); tabPanels.forEach(p => p.classList.remove('active')); document.getElementById('panel' + btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1)).classList.add('active'); }); });

function applySavedFilterToUI() {
    for (const r of viewTypeRadios) r.checked = (r.value === state.currentFilter.type);
    groupSelect.value = state.currentFilter.group;
    groupSelect2.value = state.currentFilter.group2;
    weekSelect.value = state.currentFilter.week;
    compareToggle.checked = state.currentFilter.compareMode;
    secondScheduleSelect.style.display = state.currentFilter.compareMode ? '' : 'none';
    scheduleSelectsContainer.classList.toggle('compare-active', state.currentFilter.compareMode);
    toggleGroupVisibility();
    populateNameSelects();
    if (state.currentFilter.name2 && getNamesForType(state.currentFilter.type).includes(state.currentFilter.name2)) nameSelect2.value = state.currentFilter.name2;
    refreshAllCustomSelects();
    updateWeekIndicator();
    updateSchedule();
}

let _detailsResizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(_detailsResizeTimer);
    _detailsResizeTimer = setTimeout(adjustDetailsLayout, 120);
});

// ---------- Update ----------
function updateSchedule() {
    state.currentFilter.name = nameSelect.value;
    state.currentFilter.name2 = nameSelect2.value;
    state.currentFilter.group = (state.currentFilter.type === 'class') ? groupSelect.value : 'A';
    state.currentFilter.group2 = (state.currentFilter.type === 'class') ? groupSelect2.value : 'A';
    state.currentFilter.week = weekSelect.value;
    state.currentFilter.compareMode = compareToggle.checked;
    for (const r of viewTypeRadios) if (r.checked) { state.currentFilter.type = r.value; break; }
    toggleGroupVisibility();
    secondScheduleSelect.style.display = state.currentFilter.compareMode ? '' : 'none';
    scheduleSelectsContainer.classList.toggle('compare-active', state.currentFilter.compareMode);
    renderSchedule();
    updateWeekIndicator();
    saveToStorage();
}
function showFiltersAndSchedule() {
    filterSection.style.display = 'flex';
    scheduleSection.style.display = 'block';
    applySavedFilterToUI();
    setStatus(`Loaded ${state.allLessons.length} lessons.`, 'success');
    performInitialScrollIfNeeded();
}

// ---------- Parse button ----------
function handleParse() {
    const text = reportInput.value.trim();
    if (!text) { setStatus('Please paste or load a report first.', 'error'); return; }
    state.allLessons = sortLessonsByClassThenTime(parseReport(text));
    state.combinedReportText = generateCombinedReportFromLessons(state.allLessons);
    if (state.allLessons.length === 0) {
        setStatus('No valid schedule entries found.', 'error');
        filterSection.style.display = 'none';
        scheduleSection.style.display = 'none';
    } else showFiltersAndSchedule();
    saveToStorage();
}

// ==================== EVENT LISTENERS ====================
selectPdfBtn.addEventListener('click', () => pdfFilesInput.click());
pdfFilesInput.addEventListener('change', () => {
    const files = pdfFilesInput.files;
    selectedPdfNames.textContent = files && files.length > 0 ? `Selected: ${Array.from(files).map(f=>f.name).join(', ')}` : '';
});

convertAllBtn.addEventListener('click', async () => {
    const files = pdfFilesInput.files;
    if(!files || files.length === 0) { setStatus('⚠️ No PDFs selected.', 'error'); return; }
    const allPages = [];
    convertAllBtn.disabled = true; progressWrap.style.display = 'block'; progressFill.style.width = '0%';
    downloadCombinedBtn.style.display = 'none'; copyCombinedBtn.style.display = 'none'; downloadRecoloredBtn.style.display = 'none';
    try {
        for(let i=0; i<files.length; i++) {
            const file = files[i]; const grade = getGradeFromFilename(file.name);
            setStatus(`Processing ${file.name} (grade ${grade})...`, '');
            const buf = await file.arrayBuffer(); const pages = await processPDFBuffer(buf, grade);
            allPages.push(...pages);
            progressFill.style.width = Math.round(((i+1)/files.length)*80) + '%';
        }
        if(allPages.length === 0) { setStatus('⚠️ No pages extracted.', 'error'); return; }
        await processAllPages(allPages);
        const result = mergeNewPages(allPages);
        state.globalRecoloredSvgs = allPages.map(p => ({classLabel: p.classLabel, svg: p.recoloredSvg}));
        showFiltersAndSchedule();
        setStatus(`✅ Added ${result.added} lessons, skipped ${result.skipped}.`, 'success');
    } catch(e) { setStatus('❌ Processing failed: ' + e.message, 'error'); }
    finally {
        convertAllBtn.disabled = false; progressWrap.style.display = 'none';
        saveToStorage(); pdfFilesInput.value = ''; selectedPdfNames.textContent = '';
    }
});

fetchOnlineBtn.addEventListener('click', async () => {
    const grades = [8,9,10,11,12];
    const urls = grades.map(g => ({grade:g, url: urlInputs[g].value.trim()})).filter(x => x.url);
    if(urls.length===0) { setStatus('⚠️ No URLs entered.', 'error'); return; }
    fetchOnlineBtn.disabled = true; onlineProgressWrap.style.display = 'block'; onlineProgressFill.style.width = '0%';
    onlineDownloadCombinedBtn.style.display = 'none'; onlineCopyCombinedBtn.style.display = 'none'; onlineDownloadRecoloredBtn.style.display = 'none';
    let allNewPages = []; let remaining = urls, attempt = 0; const maxAttempts = MAX_RETRIES + 1;
    const doAttempt = async (items) => {
        const results = await Promise.allSettled(items.map(async ({grade,url}) => {
            const buf = await fetchPDFViaNetlifyFunction(url); const pages = await processPDFBuffer(buf, grade); return {grade, pages};
        }));
        const successes = [], failures = [];
        results.forEach((res, idx) => { if(res.status==='fulfilled') successes.push(res.value); else failures.push(items[idx]); });
        return { successes, failures };
    };
    while(remaining.length > 0 && attempt < maxAttempts) {
        attempt++;
        setStatus(`Attempt ${attempt}/${maxAttempts} – fetching ${remaining.length} grade(s)…`, '');
        const { successes, failures } = await doAttempt(remaining);
        remaining = failures;
        for(const {pages} of successes) { allNewPages.push(...pages); }
        onlineProgressFill.style.width = Math.round((attempt/maxAttempts)*80) + '%';
        if(remaining.length > 0 && attempt < maxAttempts) await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    }
    if(allNewPages.length === 0) { setStatus('❌ Could not fetch any PDFs.', 'error'); fetchOnlineBtn.disabled = false; onlineProgressWrap.style.display = 'none'; return; }
    try {
        setStatus('⚙️ Processing pages…', '');
        await processAllPages(allNewPages);
        const mergeResult = mergeNewPages(allNewPages);
        state.globalRecoloredSvgs = allNewPages.map(p => ({classLabel: p.classLabel, svg: p.recoloredSvg}));
        showFiltersAndSchedule();
        let msg = `✅ Added ${mergeResult.added} lessons.`; if(mergeResult.skipped > 0) msg += ` Skipped ${mergeResult.skipped}.`; if(remaining.length > 0) msg += ` ${remaining.length} grade(s) failed.`;
        setStatus(msg, 'success');
    } catch(e) { setStatus('❌ Processing failed: ' + e.message, 'error'); }
    finally { fetchOnlineBtn.disabled = false; onlineProgressWrap.style.display = 'none'; saveToStorage(); }
});

function downloadReport() {
    if(!state.combinedReportText) { setStatus('⚠️ No report.', 'error'); return; }
    const blob = new Blob([state.combinedReportText], {type:'text/plain'}); const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'combined_schedule.txt'; a.click();
    setStatus('📄 Downloaded.', 'success');
}
async function copyReport() {
    if(!state.combinedReportText) { setStatus('⚠️ No report.', 'error'); return; }
    try { await navigator.clipboard.writeText(state.combinedReportText); setStatus('📋 Copied!', 'success'); }
    catch { setStatus('❌ Copy failed.', 'error'); }
}
async function downloadRecoloredSvgs() {
    if(!state.globalRecoloredSvgs.length) { setStatus('⚠️ No recolored SVGs.', 'error'); return; }
    const zip = new JSZip();
    state.globalRecoloredSvgs.forEach(({classLabel, svg}, i) => { zip.file(`overlay_${classLabel.replace(/[^\w]/g,'_')}_page${i+1}.svg`, svg); });
    const blob = await zip.generateAsync({type:'blob'}); const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'recolored_overlays.zip'; a.click();
    setStatus('🎨 Recolored SVGs downloaded.', 'success');
}

downloadCombinedBtn.addEventListener('click', downloadReport);
copyCombinedBtn.addEventListener('click', copyReport);
downloadRecoloredBtn.addEventListener('click', downloadRecoloredSvgs);
onlineDownloadCombinedBtn.addEventListener('click', downloadReport);
onlineCopyCombinedBtn.addEventListener('click', copyReport);
onlineDownloadRecoloredBtn.addEventListener('click', downloadRecoloredSvgs);

parseBtn.addEventListener('click', handleParse);
loadFileBtn.addEventListener('click', () => {
    const file = fileInput.files[0]; if(!file) { setStatus('No file selected.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = e => { reportInput.value = e.target.result; setStatus('Loaded. Click Parse.', 'success'); saveToStorage(); };
    reader.onerror = () => setStatus('Error reading file.', 'error');
    reader.readAsText(file, 'UTF-8');
});
for(const r of viewTypeRadios) r.addEventListener('change', () => {
    if (!r.checked) return;
    const newType = r.value;
    if (state.currentFilter.type === newType) return;
    stashCurrentFilter();
    applyTypeFilterToCurrent(newType);
    applySavedFilterToUI();
});
nameSelect.addEventListener('change', updateSchedule);
nameSelect2.addEventListener('change', updateSchedule);
compareToggle.addEventListener('change', () => { state.currentFilter.compareMode = compareToggle.checked; updateSchedule(); });
groupSelect.addEventListener('change', updateSchedule);
groupSelect2.addEventListener('change', updateSchedule);
weekSelect.addEventListener('change', () => { state.weekManuallyChanged = true; updateSchedule(); });
reportInput.addEventListener('input', () => saveToStorage());

// ==================== Initialize ====================
const glassSaved = localStorage.getItem('glass');
const glassOn = glassSaved !== 'off';
glassToggle.checked = glassOn;
applyGlass(glassOn);

initTheme();
loadFromStorage();
initCustomSelects();

// First visit with no data: open Settings so the import panel is visible
if (state.allLessons.length === 0 && !reportInput.value) setSettingsOpen(true);

const detectedWeek = getCurrentWeekType();
state.currentFilter.week = detectedWeek; weekSelect.value = detectedWeek; state.weekManuallyChanged = false;
for (const r of viewTypeRadios) r.checked = (r.value === state.currentFilter.type);
compareToggle.checked = state.currentFilter.compareMode;
secondScheduleSelect.style.display = state.currentFilter.compareMode ? '' : 'none';
scheduleSelectsContainer.classList.toggle('compare-active', state.currentFilter.compareMode);
toggleGroupVisibility();
updateWeekIndicator();
refreshAllCustomSelects();

if(state.allLessons.length > 0) {
    showFiltersAndSchedule();
    if(state.combinedReportText) {
        downloadCombinedBtn.style.display = 'inline-flex'; copyCombinedBtn.style.display = 'inline-flex';
        onlineDownloadCombinedBtn.style.display = 'inline-flex'; onlineCopyCombinedBtn.style.display = 'inline-flex';
    }
} else {
    setStatus('Paste text, upload PDFs, or fetch via URL.', '');
}
if(state.combinedReportText && !reportInput.value) reportInput.value = state.combinedReportText;
