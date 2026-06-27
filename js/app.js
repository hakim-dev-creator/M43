import { auth, fbLoad, fbSave, setLoginLoading } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { renderCalendar, updateShiftState, scrollToToday } from "./shifts.js";
import { initCareerData, renderCareerList } from "./career.js";
import { setAnnualLeaves } from "./leaves.js";

// التوجيه والتنقل الاحترافي بين أقسام التطبيق بحركات ناعمة
export function switchApp(appName) {
    const currentActive = document.querySelector('.app-section.active');
    const targetSection = appName === 'shift' ? document.getElementById('shift-app') : document.getElementById('career-app');
    
    // التوجيه الآمن باستخدام المعرفات بدلاً من الترتيب الرقمي المصفوفي الهش
    const targetNavItem = appName === 'shift' ? document.getElementById('nav-shift') : document.getElementById('nav-career');
    
    // إذا ضغط المستخدم على زر القسم المفتوح حالياً، لا داعي لإعادة تشغيل الحركات
    if (currentActive === targetSection) {
        if(appName === 'shift') scrollToToday();
        return;
    }
    
    // 1. تحديث أزرار شريط التنقل السفلي فوراً لمنح المستخدم استجابة مرئية لحظية (Instant Feedback)
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (targetNavItem) targetNavItem.classList.add('active');

    // 2. التحقق من وجود قسم نشط حالياً لبدء تسلسل الخروج
    if (currentActive) {
        currentActive.classList.remove('active');
        currentActive.classList.add('fade-out'); // تفعيل أنيميشن الخروج والتلاشي
        
        // 3. انتهاء حركة الخروج (خلال 200ms) ثم إخفاء القسم تماماً وإدخال القسم الجديد
        setTimeout(() => {
            currentActive.classList.remove('fade-out');
            currentActive.style.display = 'none';
            
            executeEntry();
        }, 200);
    } else {
        executeEntry();
    }

    // دالة داخلية لإدارة آلية دخول وتفعيل القسم الجديد بأمان
    function executeEntry() {
        // تبديل نظام الألوان وخلفية الـ Body لتتطابق مع هوية القسم الجديد قبل عرضه للعين
        if(appName === 'shift') {
            document.body.className = '';
        } else {
            document.body.className = 'dark-mode';
            renderCareerList();
        }
        
        // عرض حاوية القسم المستهدف في المتصفح
        targetSection.style.display = 'block';
        
        // سطر سحري (Reflow Trigger) لإجبار المتصفح على معالجة الأبعاد وتفعيل الـ Transition بسلاسة
        void targetSection.offsetWidth; 
        
        // تفعيل أنيميشن الدخول والظهور
        targetSection.classList.add('active');
        
        // إذا عدنا لنظام المناوبات، نقوم بالتمرير التلقائي لليوم الحالي بسلاسة كاملة
        if(appName === 'shift') {
            setTimeout(() => scrollToToday(), 60);
        }
    }
}

let appStarted = false;

// الاستماع إلى حالة تسجيل الدخول والمزامنة مع Firebase
onAuthStateChanged(auth, async (user) => {
    const screen = document.getElementById('login-screen');
    if (user) {
        document.getElementById('login-form-state').style.display = 'none';
        // تعديل المسار الافتراضي ليتوافق مع مجلد الأيقونات المتاح icons/
        document.getElementById('userAvatar').src = user.photoURL || 'icons/icon-512.png';
        document.getElementById('userName').textContent = user.displayName || 'مستخدم النظام';
        document.getElementById('userEmail').textContent = user.email || '';
        document.getElementById('login-user-state').classList.add('show');
        
        if (!appStarted) {
            await startApp();
            appStarted = true;
        }
    } else {
        // إعادة الشاشة وإصلاح حالة الأزرار عند تسجيل الخروج
        if(screen) { 
            screen.classList.remove('hidden'); 
            screen.style.display = 'flex'; 
        }
        document.getElementById('login-form-state').style.display = 'block';
        document.getElementById('login-user-state').classList.remove('show');
        document.getElementById('loginError').classList.remove('show');
        
        // الحل الجذري: إلغاء حالة "جاري المعالجة..." لتفعيل الأزرار من جديد
        setLoginLoading(false); 
        
        appStarted = false;
    }
});

// تحميل البيانات والتهيئة الأساسية للأقسام
async function startApp() {
    console.log('⏳ جاري تحميل بيانات المستخدم من Firestore...');
    
    const shiftData = await fbLoad('spas_data', 'shiftSettings');
    if(shiftData) updateShiftState(shiftData.config, shiftData.refDate);

    const leaves = await fbLoad('spas_data', 'annualLeavesData');
    setAnnualLeaves(leaves || []);

    const wrk = await fbLoad('spas_data', 'workersData');
    const car = await fbLoad('spas_data', 'careerWorkers');
    
    let defaultWorkers = wrk || [];
    if(defaultWorkers.length === 0) {
        for(let i=1; i<=30; i++) defaultWorkers.push({id:i, name:`عامل ${i}`, history:[]});
    }
    initCareerData(defaultWorkers, car || []);

    // ✅ التعديل: جلب الملاحظات هنا لضمان وجود مستخدم مسجل الدخول
    const loadedNotes = await fbLoad('spas_data', 'shiftNotes');
    if (loadedNotes) shiftNotes = loadedNotes;

    const categories = ['5','6','7','8','9','10','11','12','13','14','14A','15','15A','16','17','18','19','20','21','22'];
    const catEl = document.getElementById('wh-cat');
    if(catEl) catEl.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
    
    const echEl = document.getElementById('wh-ech');
    if(echEl) {
        let h = ''; for(let i=0; i<=10; i++) { let v = i===0?'R':i===10?'C':i; h+=`<option value="${v}">${v}</option>`; }
        echEl.innerHTML = h;
    }

    // ✅ الترتيب مهم: رسم الجدول، ثم رسم الملاحظات عليه، ثم التمرير لليوم
    renderCalendar();
    applyNotesIndicators();
    switchApp('shift');
    scrollToToday();
    console.log('🚀 التطبيق جاهز ومعماريته مرنة!');
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW registration failed:', err));
    });
}

window.switchApp = switchApp;

// ==========================================
// محرك النوافذ التنبيهية المخصصة (Custom Dialog Engine)
// ==========================================
window.spasAlert = function(msg, icon = '⚠️', title = 'تنبيه') {
    showDialog(title, msg, icon, false, null, 'default');
};

window.spasConfirm = function(msg, icon = '🗑️', title = 'تأكيد', type = 'danger', callback) {
    showDialog(title, msg, icon, false, callback, type);
};

window.spasPrompt = function(msg, placeholder = '', icon = '✏️', btnText = 'إرسال', callback) {
    showDialog(msg, '', icon, true, callback, 'default', placeholder, btnText);
};

function showDialog(title, msg, icon, isPrompt, callback, btnType, placeholder = '', btnText = 'موافق') {
    const overlay = document.getElementById('spas-dialog-overlay');
    if (!overlay) return;
    
    document.getElementById('sd-title').innerText = title;
    document.getElementById('sd-msg').innerText = msg;
    document.getElementById('sd-icon').innerText = icon;
    
    const iconWrap = document.getElementById('sd-icon-wrap');
    if (iconWrap) {
        iconWrap.className = `spas-dialog-icon-wrap icon-wrap-${btnType || 'default'}`;
    }
    
    const input = document.getElementById('sd-input');
    if(isPrompt) {
        input.style.display = 'block';
        input.value = '';
        input.placeholder = placeholder;
    } else {
        input.style.display = 'none';
    }
    
    const btnsContainer = document.getElementById('sd-btns');
    btnsContainer.innerHTML = '';
    
    const closeDialog = () => {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.classList.remove('open'), 300);
    };

    if(isPrompt || callback) {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'spas-btn-cancel';
        cancelBtn.innerText = 'إلغاء';
        cancelBtn.onclick = closeDialog;
        btnsContainer.appendChild(cancelBtn);
    }
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = `spas-btn-confirm c-${btnType || 'default'}`;
    confirmBtn.innerText = isPrompt ? btnText : (btnType === 'danger' ? 'حذف' : 'موافق');
    
    confirmBtn.onclick = () => {
        closeDialog();
        if(callback) {
            if(isPrompt) callback(input.value);
            else callback();
        }
    };
    btnsContainer.appendChild(confirmBtn);
    
    overlay.classList.add('open');
    setTimeout(() => overlay.classList.add('visible'), 10);
}

// ==========================================
// نظام مراقبة حالة الاتصال بالإنترنت (Offline/Online)
// ==========================================
function updateNetworkStatus() {
    const statusEl = document.getElementById('network-status');
    if (!statusEl) return;
    
    const textEl = statusEl.querySelector('.network-text');
    
    if (navigator.onLine) {
        statusEl.classList.remove('offline');
        statusEl.classList.add('online');
        textEl.textContent = 'متصل';
    } else {
        statusEl.classList.remove('online');
        statusEl.classList.add('offline');
        textEl.textContent = 'غير متصل';
        
        window.spasAlert('أنت الآن في وضع عدم الاتصال (Offline). يمكنك متابعة العمل وسيتم مزامنة البيانات تلقائياً عند عودة الإنترنت.', '📶', 'انقطع الاتصال', 'warning');
    }
}

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
document.addEventListener('DOMContentLoaded', updateNetworkStatus);

// ==========================================
// نظام الملاحظات الآمن (وضع التعديل المحمي) - النسخة المصححة
// ==========================================
export let shiftNotes = {};
let currentNoteKey = '';
let isNoteModeActive = false;

const tableObserver = new MutationObserver(() => applyNotesIndicators());
const calBody = document.getElementById('calendarBody');
if(calBody) tableObserver.observe(calBody, { childList: true, subtree: true });

const toggleNoteBtn = document.getElementById('toggle-note-mode-btn');
const noteModeIcon = document.getElementById('note-mode-icon');
const noteModeText = document.getElementById('note-mode-text');
const tableContainer = document.getElementById('scheduleTableContainer');

if(toggleNoteBtn) {
    toggleNoteBtn.addEventListener('click', () => {
        isNoteModeActive = !isNoteModeActive;
        if(isNoteModeActive) {
            toggleNoteBtn.style.background = '#eff6ff';
            toggleNoteBtn.style.color = '#1d4ed8';
            toggleNoteBtn.style.borderColor = '#bfdbfe';
            if(noteModeIcon) noteModeIcon.innerText = '🔓';
            if(noteModeText) noteModeText.innerText = 'وضع الملاحظات (مفعل)';
            tableContainer.classList.add('note-mode-active');
            if(window.showToast) window.showToast('يمكنك الآن النقر على أي مناوبة لإضافة ملاحظة.', '✏️', 'وضع التعديل', '#3b82f6', 4000);
        } else {
            toggleNoteBtn.style.background = '#ffffff';
            toggleNoteBtn.style.color = '#64748b';
            toggleNoteBtn.style.borderColor = '#e2e8f0';
            if(noteModeIcon) noteModeIcon.innerText = '🔒';
            if(noteModeText) noteModeText.innerText = 'وضع العرض (محمي)';
            tableContainer.classList.remove('note-mode-active');
        }
    });
}

if(tableContainer) {
    tableContainer.addEventListener('click', (e) => {
        if (!isNoteModeActive) return; 

        const td = e.target.closest('td');
        if (!td) return;
        
        const tr = td.parentElement;
        const cellIndex = Array.from(tr.children).indexOf(td);

        if (cellIndex > 0 && cellIndex <= 4) {
            const dayText = tr.children[0].innerText.replace(/\s+/g, ' ').trim(); 
            const monthText = document.getElementById('monthDisplay').innerText.trim();
            const groupName = ['أ', 'ب', 'ج', 'د'][cellIndex - 1];
            const shiftType = td.innerText.replace(/\s+/g, '').trim(); 

            if(!shiftType) return;

            currentNoteKey = `${monthText}_${dayText}_${groupName}`;
            window.openNoteModal(dayText, groupName, shiftType);
        }
    });
}

window.closeNoteModal = function() {
    const modal = document.getElementById('note-modal');
    if(modal) modal.style.display = 'none';
};

window.openNoteModal = function(day, group, shift) {
    const subtitle = document.getElementById('note-subtitle');
    if(subtitle) subtitle.innerText = `${day} | الفوج (${group}) | المناوبة: ${shift}`;
    
    const deleteBtn = document.getElementById('btn-delete-note');
    
    ['note1-text', 'note1-start', 'note1-end', 'note2-text', 'note2-start', 'note2-end'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });

    const savedData = shiftNotes[currentNoteKey];

    if (savedData) {
        if(deleteBtn) deleteBtn.style.display = 'block';
        
        if (typeof savedData === 'string') {
            const t1 = document.getElementById('note1-text');
            if(t1) t1.value = savedData;
        } else {
            if(savedData.task1) {
                const t1 = document.getElementById('note1-text'); if(t1) t1.value = savedData.task1.text || '';
                const t1s = document.getElementById('note1-start'); if(t1s) t1s.value = savedData.task1.start || '';
                const t1e = document.getElementById('note1-end'); if(t1e) t1e.value = savedData.task1.end || '';
            }
            if(savedData.task2) {
                const t2 = document.getElementById('note2-text'); if(t2) t2.value = savedData.task2.text || '';
                const t2s = document.getElementById('note2-start'); if(t2s) t2s.value = savedData.task2.start || '';
                const t2e = document.getElementById('note2-end'); if(t2e) t2e.value = savedData.task2.end || '';
            }
        }
    } else {
        if(deleteBtn) deleteBtn.style.display = 'none';
    }
    
    const modal = document.getElementById('note-modal');
    if(modal) modal.style.display = 'flex';
};

window.saveShiftNote = async function() {
    window.closeNoteModal();

    try {
        const el1 = document.getElementById('note1-text');
        const el1s = document.getElementById('note1-start');
        const el1e = document.getElementById('note1-end');
        
        const el2 = document.getElementById('note2-text');
        const el2s = document.getElementById('note2-start');
        const el2e = document.getElementById('note2-end');

        const t1Text = el1 ? el1.value.trim() : '';
        const t1Start = el1s ? el1s.value : '';
        const t1End = el1e ? el1e.value : '';
        
        const t2Text = el2 ? el2.value.trim() : '';
        const t2Start = el2s ? el2s.value : '';
        const t2End = el2e ? el2e.value : '';

        const hasTask1 = t1Text || t1Start || t1End;
        const hasTask2 = t2Text || t2Start || t2End;

        if (hasTask1 || hasTask2) {
            shiftNotes[currentNoteKey] = {
                task1: hasTask1 ? { text: t1Text, start: t1Start, end: t1End } : null,
                task2: hasTask2 ? { text: t2Text, start: t2Start, end: t2End } : null
            };
            if(window.showToast) window.showToast('تم الحفظ بنجاح', '📝', 'مهام المناوبة', '#10b981');
        } else {
            delete shiftNotes[currentNoteKey];
        }
        
        applyNotesIndicators(); 
        await fbSave('spas_data', 'shiftNotes', shiftNotes);
        
    } catch(e) {
        console.error("خطأ أثناء الحفظ:", e);
    }
};

window.deleteShiftNote = async function() {
    window.closeNoteModal();
    try {
        delete shiftNotes[currentNoteKey];
        applyNotesIndicators();
        if(window.showToast) window.showToast('تم مسح المهام', '🗑️', 'حذف', '#ef4444');
        await fbSave('spas_data', 'shiftNotes', shiftNotes);
    } catch(e) {
        console.error("خطأ أثناء الحذف:", e);
    }
};

function applyNotesIndicators() {
    tableObserver.disconnect();

    const trs = document.querySelectorAll('#calendarBody tr');
    const monthText = document.getElementById('monthDisplay');
    
    if(monthText) {
        trs.forEach(tr => {
            if(!tr.children || tr.children.length < 5) return;
            const dayText = tr.children[0].innerText.replace(/\s+/g, ' ').trim();
            
            for(let i = 1; i <= 4; i++) {
                const groupName = ['أ', 'ب', 'ج', 'د'][i - 1];
                const key = `${monthText.innerText.trim()}_${dayText}_${groupName}`;
                const td = tr.children[i];
                
                const oldIndicator = td.querySelector('.note-indicator');

                if (shiftNotes[key]) {
                    if (!oldIndicator) {
                        const indicator = document.createElement('div');
                        indicator.className = 'note-indicator';
                        td.appendChild(indicator);
                    }
                } else {
                    if (oldIndicator) {
                        oldIndicator.remove();
                    }
                }
            }
        });
    }

    const currentCalBody = document.getElementById('calendarBody');
    if(currentCalBody) {
        tableObserver.observe(currentCalBody, { childList: true, subtree: true });
    }
}
// ==========================================
// تأكيد تسجيل الخروج
// ==========================================
window.confirmSignOut = function() {
    window.spasConfirm(
        'هل أنت متأكد أنك تريد إنهاء الجلسة وتسجيل الخروج من التطبيق؟', 
        '🚪', 
        'تأكيد تسجيل الخروج', 
        'danger', 
        async function() {
            if (window.handleSignOut) {
                await window.handleSignOut();
            }
        }
    );
};