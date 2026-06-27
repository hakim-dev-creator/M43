import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
    getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
    signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCqzSvmNPhaorUF2dq_Rd93BWjFqRl5plA",
  authDomain: "spas-19.firebaseapp.com",
  projectId: "spas-19",
  storageBucket: "spas-19.firebasestorage.app",
  messagingSenderId: "813949207031",
  appId: "1:813949207031:web:3fee84cdbaa50b65936ef2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// دوال Firestore المعزولة بـ المعرف (UID)
export async function fbSave(collectionName, docName, data) {
    try {
        const user = auth.currentUser;
        if (!user) return;
        const docRef = doc(db, "users", user.uid, collectionName, docName);
        await setDoc(docRef, { data: data }, { merge: true });
        console.log('✅ Firestore OK :', collectionName, docName);
    } catch(e) {
        console.error('❌ Firestore FAIL:', collectionName, docName, e.message);
    }
}

export async function fbLoad(collectionName, docName) {
    try {
        const user = auth.currentUser;
        if (!user) return null;
        const docRef = doc(db, "users", user.uid, collectionName, docName);
        const snap = await getDoc(docRef);
        return snap.exists() ? snap.data().data : null;
    } catch(e) {
        console.error('❌ Firestore READ FAIL:', collectionName, docName, e.message);
        return null;
    }
}

// إظهار وإخفاء كلمات المرور
const setupTogglePassword = (btnId, inputId) => {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (btn && input) {
        btn.addEventListener('click', () => {
            input.setAttribute('type', input.getAttribute('type') === 'password' ? 'text' : 'password');
        });
    }
};
setupTogglePassword('togglePassword', 'password');
setupTogglePassword('toggleConfirmPassword', 'confirmPassword');

let isSignUpMode = false;
const authForm = document.getElementById('authForm');
const toggleModeBtn = document.getElementById('toggleModeBtn');
const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
const confirmPasswordInput = document.getElementById('confirmPassword');
const submitBtnText = document.getElementById('submitBtnText');
const loginErrorEl = document.getElementById('loginError');

if (toggleModeBtn) {
    toggleModeBtn.addEventListener('click', () => {
        isSignUpMode = !isSignUpMode;
        submitBtnText.textContent = isSignUpMode ? 'إنشاء حساب' : 'دخول';
        toggleModeBtn.textContent = isSignUpMode ? 'لدي حساب بالفعل (تسجيل الدخول)' : 'إنشاء حساب جديد';
        confirmPasswordGroup.style.display = isSignUpMode ? 'block' : 'none';
        if(isSignUpMode) confirmPasswordInput.setAttribute('required', 'true');
        else { confirmPasswordInput.removeAttribute('required'); confirmPasswordInput.value = ''; }
        loginErrorEl.classList.remove('show');
    });
}

if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        if (isSignUpMode && password !== confirmPasswordInput.value) {
            showLoginError('auth/passwords-do-not-match');
            return;
        }
        setLoginLoading(true);
        try {
            if (isSignUpMode) await createUserWithEmailAndPassword(auth, email, password);
            else await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            setLoginLoading(false);
            showLoginError(error.code);
        }
    });
}

if (document.getElementById('forgotPasswordBtn')) {
    document.getElementById('forgotPasswordBtn').addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();
        if (!email) { showLoginError('auth/missing-email'); return; }
        try {
            await sendPasswordResetEmail(auth, email);
            showLoginError('✅ تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك.', true);
        } catch (error) { showLoginError(error.code); }
    });
}

export function setLoginLoading(isLoading) {
    const googleBtn = document.getElementById('btnGoogleLogin');
    const submitBtn = document.getElementById('submitBtn');
    const submitBtnText = document.getElementById('submitBtnText');

    if (googleBtn) googleBtn.classList.toggle('loading', isLoading);
    
    if (submitBtn) {
        submitBtn.style.opacity = isLoading ? '0.7' : '1';
        submitBtn.style.pointerEvents = isLoading ? 'none' : 'auto';
        
        if (submitBtnText) {
            if (isLoading) {
                submitBtnText.textContent = 'جاري المعالجة...';
            } else {
                submitBtnText.textContent = isSignUpMode ? 'إنشاء حساب' : 'دخول';
            }
        }
    }
}

export function showLoginError(code, isSuccess = false) {
    const err = document.getElementById('loginError');
    if (!err) return;
    err.style.color = isSuccess ? '#10b981' : '#fca5a5';
    err.style.backgroundColor = isSuccess ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239,68,68,0.1)';
    err.style.borderColor = isSuccess ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239,68,68,0.25)';
    
    const msgs = {
        'auth/network-request-failed': '⚠️ تعذّر الاتصال. تحقق من الإنترنت.',
        'auth/invalid-credential': '⚠️ البريد الإلكتروني أو كلمة المرور غير صحيحة.',
        'auth/email-already-in-use': '⚠️ هذا البريد مستخدم مسبقاً.',
        'auth/weak-password': '⚠️ كلمة المرور ضعيفة (6 أحرف على الأقل).',
        'auth/missing-email': '⚠️ يرجى إدخال بريدك الإلكتروني أولاً.'
    };
    err.textContent = isSuccess ? code : (msgs[code] || '⚠️ حدث خطأ، يرجى المحاولة مرة أخرى.');
    err.classList.add('show');
}

export async function handleGoogleLogin() {
    setLoginLoading(true);
    try {
        const result = await signInWithPopup(auth, googleProvider);
        if (result && result.user) setLoginLoading(false);
    } catch (e) {
        if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
            signInWithRedirect(auth, googleProvider);
        } else { setLoginLoading(false); showLoginError(e.code); }
    }
}

export function enterApp() {
    const screen = document.getElementById('login-screen');
    if(screen) { screen.classList.add('hidden'); setTimeout(() => { screen.style.display = 'none'; }, 650); }
}

export async function handleSignOut() {
    await signOut(auth);
}

window.handleGoogleLogin = handleGoogleLogin;
window.enterApp = enterApp;
window.handleSignOut = handleSignOut;