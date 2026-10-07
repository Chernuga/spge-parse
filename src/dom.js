// Central DOM references. Module scripts are deferred, so the whole DOM
// is parsed by the time this module evaluates.
export const reportInput = document.getElementById('reportInput');
export const fileInput = document.getElementById('fileInput');
export const loadFileBtn = document.getElementById('loadFileBtn');
export const parseBtn = document.getElementById('parseBtn');
export const importStatus = document.getElementById('importStatus');
export const filterSection = document.getElementById('filterSection');
export const nameSelect = document.getElementById('nameSelect');
export const nameSelect2 = document.getElementById('nameSelect2');
export const secondScheduleSelect = document.getElementById('secondScheduleSelect');
export const scheduleSelectsContainer = document.getElementById('scheduleSelectsContainer');
export const compareToggle = document.getElementById('compareToggle');
export const groupSelect = document.getElementById('groupSelect');
export const groupSelect2 = document.getElementById('groupSelect2');
export const weekSelect = document.getElementById('weekSelect');
export const weekIndicator = document.getElementById('weekIndicator');
export const weekIndicatorText = document.getElementById('weekIndicatorText');
export const scheduleSection = document.getElementById('scheduleSection');
export const viewTypeRadios = document.getElementsByName('viewType');
export const themeToggle = document.getElementById('themeToggle');

export const settingsSection = document.getElementById('settingsSection');
export const settingsToggle = document.getElementById('settingsToggle');
export const glassToggle = document.getElementById('glassToggle');
export const auroraToggle = document.getElementById('auroraToggle');

export const selectPdfBtn = document.getElementById('selectPdfBtn');
export const pdfFilesInput = document.getElementById('pdfFiles');
export const selectedPdfNames = document.getElementById('selectedPdfNames');
export const convertAllBtn = document.getElementById('convertAllBtn');
export const downloadCombinedBtn = document.getElementById('downloadCombinedBtn');
export const copyCombinedBtn = document.getElementById('copyCombinedBtn');
export const downloadRecoloredBtn = document.getElementById('downloadRecoloredBtn');
export const progressWrap = document.getElementById('progressWrap');
export const progressFill = document.getElementById('progressFill');

export const fetchOnlineBtn = document.getElementById('fetchOnlineBtn');
export const onlineProgressWrap = document.getElementById('onlineProgressWrap');
export const onlineProgressFill = document.getElementById('onlineProgressFill');
export const onlineDownloadCombinedBtn = document.getElementById('onlineDownloadCombinedBtn');
export const onlineCopyCombinedBtn = document.getElementById('onlineCopyCombinedBtn');
export const onlineDownloadRecoloredBtn = document.getElementById('onlineDownloadRecoloredBtn');
export const urlInputs = { 8: document.getElementById('url8'), 9: document.getElementById('url9'), 10: document.getElementById('url10'), 11: document.getElementById('url11'), 12: document.getElementById('url12') };

export const tabBtns = document.querySelectorAll('.tab-btn');
export const tabPanels = document.querySelectorAll('.tab-panel');

export function setStatus(msg, type) {
    importStatus.textContent = msg; importStatus.className = 'status-msg';
    if (type === 'error') importStatus.className = 'status-msg error';
    if (type === 'success') importStatus.className = 'status-msg success';
}
