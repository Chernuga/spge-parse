// ==================== Custom Select widget ====================
const MOBILE_POPUP_QUERY = '(max-width: 768px)';
function isMobilePopup() {
    return window.matchMedia(MOBILE_POPUP_QUERY).matches;
}

let _mobileSheet = null;
function ensureMobileSheet() {
    if (_mobileSheet) return _mobileSheet;
    const backdrop = document.createElement('div');
    backdrop.className = 'mobile-select-backdrop';
    const sheet = document.createElement('div');
    sheet.className = 'mobile-select-sheet';
    sheet.innerHTML = `
        <div class="mobile-select-header">
            <div class="mobile-select-title"></div>
            <button type="button" class="mobile-select-close" aria-label="Close">×</button>
        </div>
        <div class="mobile-select-list" role="listbox"></div>
    `;
    backdrop.appendChild(sheet);
    document.body.appendChild(backdrop);
    _mobileSheet = {
        backdrop,
        sheet,
        titleEl: sheet.querySelector('.mobile-select-title'),
        listEl:  sheet.querySelector('.mobile-select-list'),
        closeBtn: sheet.querySelector('.mobile-select-close')
    };
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeMobileSheet();
    });
    _mobileSheet.closeBtn.addEventListener('click', closeMobileSheet);
    return _mobileSheet;
}
function closeMobileSheet() {
    if (!_mobileSheet) return;
    _mobileSheet.backdrop.classList.remove('open');
    _mobileSheet.sheet.classList.remove('open');
}
function openMobileSheet(container) {
    const selectEl = container._selectEl;
    if (!selectEl) return;
    const m = ensureMobileSheet();
    m.titleEl.textContent = container.dataset.mobileTitle || 'Select';
    m.listEl.innerHTML = '';
    const opts = Array.from(selectEl.options);
    if (opts.length === 0) {
        const item = document.createElement('div');
        item.className = 'mobile-select-item empty';
        item.textContent = '-- No entries --';
        m.listEl.appendChild(item);
    } else {
        opts.forEach(opt => {
            const item = document.createElement('div');
            item.className = 'mobile-select-item';
            if (opt.value === selectEl.value) item.classList.add('selected');
            item.setAttribute('role', 'option');
            item.textContent = opt.textContent;
            item.addEventListener('click', () => {
                selectEl.value = opt.value;
                selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                closeMobileSheet();
            });
            m.listEl.appendChild(item);
        });
        requestAnimationFrame(() => {
            const sel = m.listEl.querySelector('.mobile-select-item.selected');
            if (sel) sel.scrollIntoView({ block: 'center' });
        });
    }
    requestAnimationFrame(() => {
        m.backdrop.classList.add('open');
        m.sheet.classList.add('open');
    });
}

export function initCustomSelects() {
    document.querySelectorAll('.custom-select[data-select-id]').forEach(container => {
        const selectId = container.dataset.selectId;
        const selectEl = document.getElementById(selectId);
        if (!selectEl) return;

        container.innerHTML = '';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'custom-select-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');

        const label = document.createElement('span');
        label.className = 'custom-select-label';
        trigger.appendChild(label);

        const caret = document.createElement('span');
        caret.className = 'custom-select-caret';
        caret.textContent = '▾';
        trigger.appendChild(caret);

        const menu = document.createElement('div');
        menu.className = 'custom-select-menu';
        menu.setAttribute('role', 'listbox');

        container.appendChild(trigger);
        container.appendChild(menu);

        container._trigger = trigger;
        container._label = label;
        container._menu = menu;
        container._selectEl = selectEl;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isMobilePopup()) {
                closeAllCustomSelects();
                openMobileSheet(container);
                return;
            }
            const wasOpen = container.classList.contains('open');
            closeAllCustomSelects();
            if (!wasOpen) {
                container.classList.add('open');
                trigger.setAttribute('aria-expanded', 'true');
            }
        });

        selectEl.addEventListener('change', () => refreshCustomSelect(container));

        refreshCustomSelect(container);
    });
}

export function refreshCustomSelect(container) {
    const selectEl = container._selectEl;
    const label = container._label;
    const menu = container._menu;
    if (!selectEl || !label || !menu) return;

    menu.innerHTML = '';
    const opts = Array.from(selectEl.options);
    if (opts.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'custom-select-option empty';
        empty.textContent = '-- No entries --';
        menu.appendChild(empty);
        label.textContent = '-- No entries --';
        return;
    }

    opts.forEach(opt => {
        const item = document.createElement('div');
        item.className = 'custom-select-option';
        if (opt.value === selectEl.value) item.classList.add('selected');
        item.setAttribute('role', 'option');
        item.dataset.value = opt.value;
        item.textContent = opt.textContent;
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            selectEl.value = opt.value;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            closeAllCustomSelects();
        });
        menu.appendChild(item);
    });

    const selectedOpt = selectEl.options[selectEl.selectedIndex];
    label.textContent = selectedOpt ? selectedOpt.textContent : (opts[0] ? opts[0].textContent : '-- Select --');
}

export function refreshAllCustomSelects() {
    document.querySelectorAll('.custom-select[data-select-id]').forEach(refreshCustomSelect);
}

export function closeAllCustomSelects() {
    document.querySelectorAll('.custom-select.open').forEach(el => {
        el.classList.remove('open');
        if (el._trigger) el._trigger.setAttribute('aria-expanded', 'false');
    });
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select')) closeAllCustomSelects();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeAllCustomSelects(); closeMobileSheet(); }
});
window.addEventListener('resize', () => {
    if (!isMobilePopup()) closeMobileSheet();
});
