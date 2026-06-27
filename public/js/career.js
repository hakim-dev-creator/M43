import { fbSave } from "./auth.js";

export let workersData = [];
export let careerWorkers = [];
let currentWorkerIndex = null;
let editingHistoryIndex = -1;
let editingCareerId = null;

export function initCareerData(wrk, car) {
    if(wrk) workersData = wrk;
    if(car) careerWorkers = car;
}

function parseDateSafe(s) {
    if(!s) return new Date();
    if(s.includes('/')) { const p=s.split('/'); if(p.length===3) return new Date(p[2],p[1]-1,p[0]); }
    return new Date(s);
}

export function renderCareerList() {
    const container = document.getElementById('career-workers-list'); if(!container) return;
    container.innerHTML = careerWorkers.length === 0 ? '<p style="text-align:center;color:#475569;padding:20px;">لا يوجد موظفون بعد. أضف موظفاً بالنموذج أعلاه.</p>' : '';
    
    careerWorkers.forEach(w => {
        const card = document.createElement('div'); card.className = 'career-worker-card';
        card.innerHTML = `<div class="cw-actions"><button class="cw-btn-edit">✏️</button><button class="cw-btn-del">🗑️</button></div><div class="cw-main"><div><div class="cw-name">${w.name}</div><div class="cw-date">📅 ${w.rec} &nbsp;|&nbsp; 🎂 ${w.birth}</div>${(w.milY||w.milM||w.milD)?`<div class="cw-date" style="margin-top:2px;">🎖️ ${w.milY||0}س ${w.milM||0}ش ${w.milD||0}ي خبرة</div>`:''}</div><span class="cw-arrow">🏅›</span></div>`;
        card.querySelector('.cw-btn-edit').onclick = () => editCareerWorker(w.id);
        card.querySelector('.cw-btn-del').onclick = () => deleteCareerWorker(w.id);
        card.querySelector('.cw-main').onclick = () => openMedalsPage(w.id);
        container.appendChild(card);
    });
}

export function editCareerWorker(id) {
    const w = careerWorkers.find(x => x.id == id); if(!w) return;
    editingCareerId = id;
    document.getElementById('in-name').value = w.name;
    document.getElementById('in-birth').value = w.birth;
    document.getElementById('in-rec').value = w.rec;
    document.getElementById('in-mil-y').value = w.milY || 0;
    document.getElementById('in-mil-m').value = w.milM || 0;
    document.getElementById('in-mil-d').value = w.milD || 0;
    document.getElementById('career-form-title').innerText = '✏️ تعديل بيانات الموظف';
    document.getElementById('btn-save-career').innerText = 'حفظ التعديلات';
    document.getElementById('btn-cancel-career').style.display = 'block';
    document.getElementById('career-form-card').scrollIntoView({behavior:'smooth'});
}

export function cancelCareerEdit() {
    editingCareerId = null;
    ['in-name','in-birth','in-rec','in-mil-y','in-mil-m','in-mil-d'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('career-form-title').innerText = 'إضافة موظف جديد';
    document.getElementById('btn-save-career').innerText = 'حفظ في قاعدة البيانات';
    document.getElementById('btn-cancel-career').style.display = 'none';
}

export async function saveCareerWorker() {
    const name = document.getElementById('in-name').value, b = document.getElementById('in-birth').value, r = document.getElementById('in-rec').value;
    const milY = parseInt(document.getElementById('in-mil-y').value)||0, milM = parseInt(document.getElementById('in-mil-m').value)||0, milD = parseInt(document.getElementById('in-mil-d').value)||0;
    if(!name||!b||!r){ window.spasAlert('يرجى تعبئة جميع الحقول المطلوبة.','⚠️','بيانات ناقصة'); return; }
    
    if(editingCareerId !== null) {
        const idx = careerWorkers.findIndex(x => x.id == editingCareerId);
        if(idx !== -1) careerWorkers[idx] = {...careerWorkers[idx], name, birth:b, rec:r, milY, milM, milD};
        cancelCareerEdit();
    } else {
        careerWorkers.push({id:Date.now(), name, birth:b, rec:r, milY, milM, milD});
        cancelCareerEdit();
    }
    await fbSave('spas_data', 'careerWorkers', careerWorkers); renderCareerList();
}

export function deleteCareerWorker(id) {
    const w = careerWorkers.find(x => x.id == id);
    window.spasConfirm(`سيتم حذف الموظف "${w?w.name:''}" نهائياً.`, '🗑️', 'تأكيد الحذف', 'danger', async function() {
        careerWorkers = careerWorkers.filter(x => x.id != id);
        await fbSave('spas_data', 'careerWorkers', careerWorkers); renderCareerList();
    });
}

export function openMedalsPage(id) {
    const w = careerWorkers.find(x => x.id == id); if(!w) return;
    document.getElementById('mp-worker-name').innerText = w.name;
    
    const recDate = parseDateSafe(w.rec), today = new Date();
    let diff = today - recDate;
    let tY = Math.floor(diff/(365.25*24*60*60*1000)), tM = Math.floor((diff%(365.25*24*60*60*1000))/(30.44*24*60*60*1000)), tD = Math.floor((diff%(30.44*24*60*60*1000))/(24*60*60*1000));
    tY += w.milY; tM += w.milM; tD += w.milD;
    if(tD >= 30){ tD -= 30; tM++; } if(tM >= 12){ tM -= 12; tY++; }
    
    document.getElementById('res-years').innerText = `${tY} سنة`;
    document.getElementById('res-detail').innerText = `${tM} شهر و ${tD} يوم أقدمية`;
    
    const grid = document.getElementById('medals-grid'); grid.innerHTML = '';
    const medals = [{n:'فضية',y:20,i:'🥈',c:'#94a3b8'}, {n:'برونزية',y:15,i:'🥉',c:'#cd7f32'}, {n:'قرمزية',y:30,i:'🎖️',c:'#e74c3c'}, {n:'ذهبية',y:25,i:'🥇',c:'#f1c40f'}, {n:'دبلوم كبير',y:40,i:'🎓',c:'#64748b'}, {n:'دبلوم',y:35,i:'📜',c:'#64748b'}];
    
    medals.forEach(m => {
        let d = new Date(recDate); d.setFullYear(d.getFullYear() + m.y - w.milY); d.setMonth(d.getMonth() - w.milM); d.setDate(d.getDate() - w.milD);
        let isDone = today >= d;
        let remTxt = !isDone ? `متبقي: ${Math.floor((d-today)/(365.25*24*60*60*1000))}س ${Math.floor(((d-today)%(365.25*24*60*60*1000))/(30.44*24*60*60*1000))}ش` : '';
        
        grid.innerHTML += `<div class="medal-card ${isDone?'active':''}"><span class="medal-icon">${m.i}</span><div style="font-weight:700;color:${isDone?'#10b981':m.c}">${m.n} <br>[دفعة ${d.getFullYear()}]</div><div style="font-size:0.8rem;color:#94a3b8;">${isDone?'✅ مستحقة':'الاستحقاق: '+d.toLocaleDateString('en-GB')}</div>${!isDone?`<div style="font-size:0.75rem;color:#6c757d;margin-top:5px;">${remTxt}</div>`:''}<div class="medal-progress-bar"><div class="medal-progress-fill" style="width:${isDone?100:Math.min(100,(tY/m.y)*100)}%;background:${isDone?'#10b981':m.c}"></div></div></div>`;
    });

    const retire = new Date(parseDateSafe(w.birth)); retire.setFullYear(retire.getFullYear() + 60);
    document.getElementById('retire-date').innerText = retire.toLocaleDateString('en-GB');
    let rd = retire - today;
    document.getElementById('retire-countdown').innerText = rd > 0 ? `المتبقي: ${Math.floor(rd/(365.25*24*60*60*1000))} سنة و ${Math.floor((rd%(365.25*24*60*60*1000))/(30.44*24*60*60*1000))} شهر` : "متقاعد";
    
    document.getElementById('medals-page').classList.add('open');
}

export function openWorkersList() {
    const container = document.getElementById('workersListSimpleContainer'); if(!container) return;
    container.innerHTML = '';
    workersData.forEach((w, i) => {
        container.innerHTML += `<div class="worker-item-light"><div style="flex:1;" id="w-item-${i}"><span style="font-weight:700;color:#334155;">${w.name||'عامل '+w.id}</span></div><div><button class="btn-action-mini btn-blue" id="w-edit-${i}">✏️</button><button class="btn-action-mini btn-red" id="w-del-${i}">🗑️</button></div></div>`;
        setTimeout(() => {
            document.getElementById(`w-item-${i}`).onclick = () => openWorkerHistory(i);
            document.getElementById(`w-edit-${i}`).onclick = () => editWorkerName(i);
            document.getElementById(`w-del-${i}`).onclick = () => deleteWorker(i);
        }, 10);
    });
    document.getElementById('workersListModal').style.display = 'flex';
}

export function openWorkerHistory(i) {
    currentWorkerIndex = i; document.getElementById('workersListModal').style.display = 'none';
    document.getElementById('wh-workerName').innerText = workersData[i].name;
    hidePromoForm(); 
    renderHistoryList();
    document.getElementById('workerPromoModal').style.display = 'flex';
}

function renderHistoryList() {
    const list = document.getElementById('wh-list'); 
    const historyData = workersData[currentWorkerIndex].history || [];

    if (!historyData.length) {
        list.innerHTML = '<p style="text-align:center;color:#94a3b8;font-size:0.9rem;padding:20px;">لا توجد سجلات ترقية حتى الآن</p>';
        return;
    }

    list.innerHTML = ''; 

    const timelineContainer = document.createElement('div');
    timelineContainer.className = 'promo-timeline';

    const sortedHistory = historyData
        .map((item, index) => ({...item, originalIndex: index}))
        .sort((a,b) => new Date(b.date) - new Date(a.date));

    sortedHistory.forEach((h, i) => {
        let newerDate = i === 0 ? new Date() : new Date(sortedHistory[i - 1].date);
        let olderDate = new Date(h.date);

        let monthsDiff = (newerDate.getFullYear() - olderDate.getFullYear()) * 12 + (newerDate.getMonth() - olderDate.getMonth());
        if (newerDate.getDate() < olderDate.getDate()) monthsDiff--; 
        if (monthsDiff < 0) monthsDiff = 0;

        let y = Math.floor(monthsDiff / 12);
        let m = monthsDiff % 12;
        let timeParts = [];
        if (y > 0) timeParts.push(`${y} سنة`);
        if (m > 0) timeParts.push(`${m} شهر`);
        let durationStr = timeParts.length > 0 ? timeParts.join(' و ') : 'أقل من شهر';

        const durationWrap = document.createElement('div');
        durationWrap.className = 'promo-duration-wrap';
        durationWrap.innerHTML = `<div class="promo-duration-badge">${i === 0 ? '⏳ المدة حتى اليوم: ' : '⏱️ المدة في هذا الصنف: '}${durationStr}</div>`;
        timelineContainer.appendChild(durationWrap);

        const card = document.createElement('div');
        card.className = 'promo-card-modern clickable-card'; 
        card.innerHTML = `
            <div class="promo-info">
                <div class="promo-date">📅 ${h.date}</div>
                <div class="promo-details">
                    <span class="promo-cat">CAT: <span>${h.cat}</span></span>
                    <span class="promo-cls">CLS: <span>${h.ech}</span></span>
                </div>
            </div>
            <div style="color: #64748b; font-size: 1.2rem; margin-right: 10px;">✎</div>
        `;
        
        card.onclick = () => { 
            document.getElementById('wh-date').value = h.date; 
            document.getElementById('wh-cat').value = h.cat; 
            document.getElementById('wh-ech').value = h.ech; 
            editingHistoryIndex = h.originalIndex; 
            
            document.getElementById('formTitle').innerText = "تعديل الترقية"; 
            document.getElementById('btnSavePromo').innerText = "حفظ التغييرات";
            document.getElementById('btnDeletePromo').style.display = 'block'; 
            
            document.getElementById('promoFormContainer').style.display = 'block';
            document.getElementById('btnShowAddPromo').style.display = 'none'; 
            document.getElementById('promoFormContainer').scrollIntoView({behavior: 'smooth'});
        };

        timelineContainer.appendChild(card);
    });

    list.appendChild(timelineContainer);
}

export function showAddPromoForm() {
    editingHistoryIndex = -1;
    document.getElementById('wh-date').valueAsDate = new Date();
    document.getElementById('wh-cat').value = '5';
    document.getElementById('wh-ech').value = 'R';
    document.getElementById('formTitle').innerText = "إضافة ترقية جديدة";
    document.getElementById('btnSavePromo').innerText = "+ تسجيل الترقية";
    document.getElementById('btnDeletePromo').style.display = 'none';
    
    document.getElementById('promoFormContainer').style.display = 'block';
    document.getElementById('btnShowAddPromo').style.display = 'none';
    document.getElementById('promoFormContainer').scrollIntoView({behavior: 'smooth'});
}

export function hidePromoForm() {
    document.getElementById('promoFormContainer').style.display = 'none';
    document.getElementById('btnShowAddPromo').style.display = 'flex'; 
}

export function deleteCurrentPromo() {
    if(editingHistoryIndex === -1) return;
    window.spasConfirm('هل أنت متأكد من حذف سجل الترقية هذا نهائياً؟', '🗑️', 'تأكيد الحذف', 'danger', async () => { 
        workersData[currentWorkerIndex].history.splice(editingHistoryIndex, 1); 
        await fbSave('spas_data', 'workersData', workersData); 
        hidePromoForm();
        renderHistoryList(); 
    }); 
}

export function resetPromoForm() {
    hidePromoForm();
}

export async function saveWorkerPromo() {
    const date = document.getElementById('wh-date').value, cat = document.getElementById('wh-cat').value, ech = document.getElementById('wh-ech').value;
    if(!date) return;
    if(!workersData[currentWorkerIndex].history) workersData[currentWorkerIndex].history = [];
    if(editingHistoryIndex === -1) workersData[currentWorkerIndex].history.push({date,cat,ech});
    else workersData[currentWorkerIndex].history[editingHistoryIndex] = {date,cat,ech};
    await fbSave('spas_data', 'workersData', workersData); 
    hidePromoForm(); 
    renderHistoryList();
}

export function addNewWorkerPrompt() {
    window.spasPrompt('أدخل اسم العامل الجديد', 'الاسم...', '👷', 'إضافة', async (n) => {
        if(!n) return; workersData.push({id: Date.now(), name: n.trim(), history:[]});
        await fbSave('spas_data', 'workersData', workersData); openWorkersList();
    });
}
export function editWorkerName(i) {
    window.spasPrompt('تعديل الاسم', workersData[i].name, '✏️', 'تعديل', async (n) => {
        if(!n) return; workersData[i].name = n.trim(); await fbSave('spas_data', 'workersData', workersData); openWorkersList();
    });
}
export function deleteWorker(i) {
    window.spasConfirm(`حذف العامل ${workersData[i].name}؟`, '🗑️', 'تأكيد', 'danger', async () => {
        workersData.splice(i,1); await fbSave('spas_data', 'workersData', workersData); openWorkersList();
    });
}

window.saveCareerWorker = saveCareerWorker;
window.cancelCareerEdit = cancelCareerEdit;
window.openWorkersList = openWorkersList;
window.saveWorkerPromo = saveWorkerPromo;
window.resetPromoForm = resetPromoForm;
window.showAddPromoForm = showAddPromoForm;
window.hidePromoForm = hidePromoForm;
window.deleteCurrentPromo = deleteCurrentPromo;
window.addNewWorkerPrompt = addNewWorkerPrompt;
window.closeMedalsPage = () => document.getElementById('medals-page').classList.remove('open');