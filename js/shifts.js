import { fbSave } from "./auth.js";

export const SHIFTS = [{code:0,label:'نهار',class:'txt-nahar'},{code:1,label:'ليل',class:'txt-layl'},{code:2,label:'ر1',class:''},{code:3,label:'ر2',class:''}];
export const monthNames = ["جانفي","فيفري","مارس","أفريل","ماي","جوان","جويلية","أوت","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export let currentYear = new Date().getFullYear();
export let currentMonth = new Date().getMonth();
export let groupConfig = { A:2, B:1, C:0, D:3 };
export let referenceDate = new Date(2026,0,14); referenceDate.setHours(0,0,0,0);

export function updateShiftState(config, refTime) {
    if(config) groupConfig = config;
    if(refTime) referenceDate = new Date(refTime);
}

export function renderCalendar() {
    const tbody = document.getElementById('calendarBody'); 
    if(!tbody) return;
    tbody.innerHTML = '';
    document.getElementById('monthDisplay').innerText = `${monthNames[currentMonth]} ${currentYear}`;
    const days = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date(); today.setHours(0,0,0,0);
    let counters = {A:0, B:0, C:0, D:0};

    for(let day = 1; day <= days; day++){
        const dateObj = new Date(currentYear, currentMonth, day);
        const diff = Math.round((dateObj - referenceDate) / 86400000);
        const getS = cfg => { let i = (cfg + diff) % 4; while(i < 0) i += 4; return SHIFTS[i]; };
        const s = {A:getS(groupConfig.A), B:getS(groupConfig.B), C:getS(groupConfig.C), D:getS(groupConfig.D)};
        
        ['A','B','C','D'].forEach(g => { 
            if(s[g].code === 1) counters[g] += 2; 
            else if(s[g].code === 0) counters[g] += 1; 
        });

        const tr = document.createElement('tr');
        if(dateObj.getTime() === today.getTime()){ tr.className = 'row-today'; tr.id = 'todayRow'; }
        
        const dayNamesAR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
        tr.innerHTML = `
            <td><div class="day-cell-container"><span class="day-number">${day}</span><span class="day-name-vertical">${dayNamesAR[dateObj.getDay()]}</span></div></td>
            <td class="${s.A.class}">${s.A.label}</td>
            <td class="${s.B.class}">${s.B.label}</td>
            <td class="${s.C.class}">${s.C.label}</td>
            <td class="${s.D.class}">${s.D.label}</td>
        `;
        tbody.appendChild(tr);
    }
    ['A','B','C','D'].forEach(g => document.getElementById(`total-${g.toLowerCase()}`).innerText = counters[g]);
}

export function changeMonth(s) {
    currentMonth += s;
    if(currentMonth > 11){ currentMonth = 0; currentYear++; }
    else if(currentMonth < 0){ currentMonth = 11; currentYear--; }
    renderCalendar();
    const inp = document.getElementById('dayJumpInput'); if(inp) inp.value = '';
    removeTodayCircles();
}

export function goToCurrentMonth() {
    const n = new Date(); currentMonth = n.getMonth(); currentYear = n.getFullYear();
    renderCalendar(); scrollToToday();
}

export function onDayInputChange(input) {
    const raw = parseInt(input.value); if (isNaN(raw)) return;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    if (raw < 1 || raw > daysInMonth) {
        input.classList.add('flash-err'); setTimeout(() => input.classList.remove('flash-err'), 400); return;
    }
    input.classList.add('flash-ok'); setTimeout(() => input.classList.remove('flash-ok'), 400);
    scrollToDay(raw);
}

export function scrollToDay(day) {
    const rows = document.querySelectorAll('#calendarBody tr');
    let targetRow = null;
    for (const row of rows) {
        const span = row.querySelector('.day-number');
        if (span && parseInt(span.textContent) === day) { targetRow = row; break; }
    }
    if (!targetRow) return;
    targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { showCirclesForDate(targetRow, new Date(currentYear, currentMonth, day)); }, 650);
}

function getShiftsForDate(dateObj) {
    const d = new Date(dateObj); d.setHours(0,0,0,0);
    const diff = Math.round((d - referenceDate) / 86400000);
    const getS = cfg => { let i = (cfg + diff) % 4; while(i < 0) i += 4; return SHIFTS[i]; };
    return { A:getS(groupConfig.A), B:getS(groupConfig.B), C:getS(groupConfig.C), D:getS(groupConfig.D) };
}

function showCirclesForDate(rowEl, dateObj) {
    removeTodayCircles();
    const shifts = getShiftsForDate(dateObj);
    const cells = rowEl.querySelectorAll('td');
    const groups = [
        { label:'أ', cls:'tc-a', color:'#1e3a8a', shift:shifts.A, tdIndex:1 },
        { label:'ب', cls:'tc-b', color:'#b91c1c', shift:shifts.B, tdIndex:2 },
        { label:'ج', cls:'tc-c', color:'#0f766e', shift:shifts.C, tdIndex:3 },
        { label:'د', cls:'tc-d', color:'#7e22ce', shift:shifts.D, tdIndex:4 },
    ];
    const rowRect = rowEl.getBoundingClientRect();
    const goAbove = rowRect.top >= 68;
    const overlay = document.createElement('div');
    overlay.id = 'today-circles-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;z-index:4500;';
    document.body.appendChild(overlay);

    groups.forEach((g, i) => {
        const td = cells[g.tdIndex]; if (!td) return;
        const cx = td.getBoundingClientRect().left + td.getBoundingClientRect().width / 2;
        const circleTop = goAbove ? rowRect.top - 68 : rowRect.bottom + 16;
        const c = document.createElement('div');
        c.className = `today-circle ${g.cls}`;
        c.style.cssText = `position:fixed; width:52px; height:52px; left:${cx - 26}px; top:${circleTop}px; animation-delay:${i*0.07}s;`;
        c.innerHTML = `<span class="tc-label">${g.label}</span><span class="tc-shift">${g.shift.label}</span>`;
        
        const arrow = document.createElement('span');
        const arrowTop = goAbove ? rowRect.top - 16 : rowRect.bottom + 6;
        arrow.style.cssText = `position:fixed; left:${cx - 7}px; top:${arrowTop}px; width:0; height:0; border-left:7px solid transparent; border-right:7px solid transparent; opacity:0; animation:tc-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) ${i*0.07}s forwards; ${goAbove ? `border-top:10px solid ${g.color};` : `border-bottom:10px solid ${g.color};`}`;
        overlay.appendChild(c); overlay.appendChild(arrow);
    });

    const handler = () => { removeTodayCircles(); window.removeEventListener('scroll', handler, true); };
    setTimeout(() => { window.addEventListener('scroll', handler, { capture:true, passive:true }); }, 420);
}

export function removeTodayCircles() {
    const old = document.getElementById('today-circles-overlay');
    if (!old) return;
    old.querySelectorAll('.today-circle').forEach(c => c.classList.add('hiding'));
    setTimeout(() => { if(old.parentNode) old.remove(); }, 220);
}

export function scrollToToday() {
    const todayNum = new Date().getDate();
    const inp = document.getElementById('dayJumpInput'); if (inp) inp.value = todayNum;
    setTimeout(() => {
        const t = document.getElementById('todayRow');
        if (t) { t.scrollIntoView({ behavior:'smooth', block:'center' }); setTimeout(() => showCirclesForDate(t, new Date()), 650); }
    }, 300);
}

export function openSettings() {
    document.getElementById('settingsInputs').innerHTML = ['A','B','C','D'].map(g => {
        return `<div style="display:flex;justify-content:space-between;margin-bottom:15px;align-items:center;"><label style="color:#1e293b;font-weight:700;">فوج ${g}</label><select id="start${g}" style="padding:8px;border-radius:8px;border:1px solid #cbd5e1;">${SHIFTS.map(s=>`<option value="${s.code}" ${s.code===groupConfig[g]?'selected':''}>${s.label}</option>`).join('')}</select></div>`;
    }).join('');
    document.getElementById('settingsModal').style.display = 'flex';
}

export async function saveSettings() {
    ['A','B','C','D'].forEach(g => groupConfig[g] = parseInt(document.getElementById(`start${g}`).value));
    referenceDate = new Date(); referenceDate.setHours(0,0,0,0);
    await fbSave('spas_data', 'shiftSettings', {config:groupConfig, refDate:referenceDate.getTime()});
    document.getElementById('settingsModal').style.display = 'none';
    renderCalendar();
}

window.changeMonth = changeMonth;
window.goToCurrentMonth = goToCurrentMonth;
window.onDayInputChange = onDayInputChange;
window.openSettings = openSettings;
window.saveSettings = saveSettings;
window.scrollToToday = scrollToToday;