import { fbSave } from "./auth.js";

export let annualLeavesData = [];

export function setAnnualLeaves(data) { if(data) annualLeavesData = data; }

export function openLeaveModal() {
    document.getElementById('leave-worker-name').value = '';
    document.getElementById('leave-start-date').value = '';
    document.getElementById('leave-duration').value = '';
    document.getElementById('leave-result-card').classList.remove('show');
    renderSavedLeaves();
    document.getElementById('leaveModal').style.display = 'flex';
}

export function calculateReturnDate() {
    const startVal = document.getElementById('leave-start-date').value;
    const durationVal = parseInt(document.getElementById('leave-duration').value);
    const resultCard = document.getElementById('leave-result-card');
    const returnDateEl = document.getElementById('leave-return-date');

    if(startVal && !isNaN(durationVal) && durationVal > 0) {
        let date = new Date(startVal); date.setDate(date.getDate() + durationVal);
        returnDateEl.innerText = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        resultCard.classList.add('show');
    } else { resultCard.classList.remove('show'); }
}

export async function saveAnnualLeave() {
    const workerName = document.getElementById('leave-worker-name').value.trim();
    const startDate = document.getElementById('leave-start-date').value;
    const duration = parseInt(document.getElementById('leave-duration').value);

    if(!workerName || !startDate || isNaN(duration) || duration <= 0) {
        window.spasAlert('يرجى تعبئة جميع الحقول لتسجيل العطلة.', '⚠️', 'بيانات ناقصة'); return;
    }
    let rDate = new Date(startDate); rDate.setDate(rDate.getDate() + duration);
    const returnDateStr = `${String(rDate.getDate()).padStart(2, '0')}/${String(rDate.getMonth() + 1).padStart(2, '0')}/${rDate.getFullYear()}`;

    annualLeavesData.push({ 
        id: Date.now(), 
        name: workerName, 
        start: startDate, 
        startDate: startDate, 
        duration: duration, 
        returnDate: returnDateStr 
    });
    
    await fbSave('spas_data', 'annualLeavesData', annualLeavesData);
    
    document.getElementById('leave-worker-name').value = '';
    document.getElementById('leave-start-date').value = '';
    document.getElementById('leave-duration').value = '';
    document.getElementById('leave-result-card').classList.remove('show');
    
    renderSavedLeaves();
}

export function renderSavedLeaves() {
    const container = document.getElementById('saved-leaves-list');
    if (!container) return;
    container.innerHTML = annualLeavesData.length === 0 ? '<p style="margin:20px 0; font-size:0.85rem; margin-top:20px; color:#94a3b8; text-align:center;">لا توجد عطلات مسجلة حالياً</p>' : '';

    [...annualLeavesData].sort((a,b) => b.id - a.id).forEach((leave) => {
        const card = document.createElement('div');
        card.className = 'leave-item-card';

        const now = new Date();
        const start = new Date(leave.startDate || leave.start);
        
        now.setHours(0,0,0,0);
        if(!isNaN(start.getTime())) start.setHours(0,0,0,0);

        const totalDays = parseInt(leave.duration) || 1;
        
        let daysPassed = 1;
        if(!isNaN(start.getTime())) {
            daysPassed = Math.round((now - start) / (1000 * 60 * 60 * 24)) + 1;
        }

        if (daysPassed < 1) daysPassed = 1;
        if (daysPassed > totalDays) daysPassed = totalDays;

        let percentage = Math.round((daysPassed / totalDays) * 100);
        if (percentage > 100) percentage = 100;
        if (percentage < 0) percentage = 0;

        let progressTextMsg = percentage === 100 ? 'انتهت العطلة 🏁' : `اليوم الـ ${daysPassed} من العطلة`;

        let barColor = '#2ecc71'; 
        if (percentage > 75) {
            barColor = '#e74c3c'; 
        } else if (percentage > 50) {
            barColor = '#e67e22'; 
        } else if (percentage > 25) {
            barColor = '#f1c40f'; 
        }
        
        let displayStart = leave.startDate || leave.start;
        if(displayStart && displayStart.includes('-')) {
            const parts = displayStart.split('-');
            if(parts.length === 3) displayStart = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }

        card.innerHTML = `
            <div class="leave-item-info">
                <div class="leave-item-name">👷‍♂️ ${leave.name}</div>
                <div class="leave-item-dates">📅 خروج: ${displayStart} | المدة: ${leave.duration} يوم</div>
                <div class="leave-item-return">تاريخ العودة: ${leave.returnDate}</div>
                
                <div class="holiday-progress-container">
                    <div class="holiday-progress-text">
                        <span style="${percentage === 100 ? 'color: #ef4444; font-weight: 800;' : ''}">${progressTextMsg}</span>
                        <span style="color: ${barColor}; font-weight: 900; font-size: 0.9rem;">${percentage}%</span>
                    </div>
                    <div class="holiday-progress-bar-bg">
                        <div class="holiday-progress-bar-fill" style="width: ${percentage}%; background-color: ${barColor};"></div>
                    </div>
                </div>
            </div>
            <button class="btn-delete-leave" data-id="${leave.id}">🗑️</button>
        `;

        card.querySelector('.btn-delete-leave').onclick = () => deleteAnnualLeave(leave.id);
        container.appendChild(card);
    });
}

export function deleteAnnualLeave(id) {
    window.spasConfirm('هل أنت متأكد من حذف هذه العطلة؟', '🗑️', 'تأكيد الحذف', 'danger', async function() {
        annualLeavesData = annualLeavesData.filter(l => l.id !== id);
        await fbSave('spas_data', 'annualLeavesData', annualLeavesData);
        renderSavedLeaves();
    });
}

window.openLeaveModal = openLeaveModal;
window.calculateReturnDate = calculateReturnDate;
window.saveAnnualLeave = saveAnnualLeave;
window.deleteAnnualLeave = deleteAnnualLeave;