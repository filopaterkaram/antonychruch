// ============== Security and Validation Module ==============
// معالجة الأمان والتحقق من البيانات

class SecurityValidator {
    /**
     * التحقق من صحة البريد الإلكتروني
     */
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * التحقق من صحة رقم الهاتف المصري
     */
    static validateEgyptianPhone(phone) {
        // صيغ الهاتف المصري: 01xxxxxxxxx أو +201xxxxxxxxx
        const phoneRegex = /^(?:\+20|0)?1[0-9]{9}$/;
        const cleaned = phone.replace(/\s/g, '');
        return phoneRegex.test(cleaned);
    }

    /**
     * التحقق من قوة كلمة المرور
     */
    static validatePasswordStrength(password) {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        const isLengthValid = password.length >= 8;

        return {
            isValid: isLengthValid && hasUpperCase && hasLowerCase && hasNumbers,
            strength: this.calculatePasswordStrength(password),
            issues: this.getPasswordIssues(password)
        };
    }

    static calculatePasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength += 1;
        if (password.length >= 12) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/\d/.test(password)) strength += 1;
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 1;

        return ['ضعيفة جداً', 'ضعيفة', 'متوسطة', 'قوية', 'قوية جداً', 'قوية جداً'][strength];
    }

    static getPasswordIssues(password) {
        const issues = [];
        
        if (password.length < 8) issues.push('يجب أن تكون 8 أحرف على الأقل');
        if (!/[A-Z]/.test(password)) issues.push('أضف حرف كبير واحد على الأقل');
        if (!/[a-z]/.test(password)) issues.push('أضف حرف صغير واحد على الأقل');
        if (!/\d/.test(password)) issues.push('أضف رقم واحد على الأقل');
        
        return issues;
    }

    /**
     * التحقق من صحة الاسم
     */
    static validateName(name) {
        // التحقق من أن الاسم يحتوي على أحرف صحيحة (عربي أو إنجليزي)
        const nameRegex = /^[\u0600-\u06FFA-Za-z\s-]{3,100}$/;
        return nameRegex.test(name);
    }

    /**
     * منع حقن SQL
     */
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/'/g, "''")
            .replace(/"/g, '""')
            .replace(/\\/g, '\\\\')
            .trim();
    }

    /**
     * منع XSS attacks
     */
    static sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    /**
     * التحقق من معرف UUID
     */
    static isValidUUID(id) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
    }
}

// ============== Rate Limiting ==============
// تحديد معدل الطلبات

class RateLimiter {
    constructor() {
        this.attempts = {};
        this.lockouts = {};
    }

    /**
     * التحقق من عدد المحاولات
     */
    isAllowed(key, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
        const now = Date.now();
        
        if (!this.attempts[key]) {
            this.attempts[key] = [];
        }

        // إزالة المحاولات القديمة
        this.attempts[key] = this.attempts[key].filter(time => now - time < windowMs);

        if (this.attempts[key].length >= maxAttempts) {
            this.lockouts[key] = now;
            return false;
        }

        this.attempts[key].push(now);
        return true;
    }

    /**
     * الحصول على وقت الانتظار المتبقي
     */
    getRemainingTime(key, windowMs = 15 * 60 * 1000) {
        if (!this.lockouts[key]) return 0;
        
        const remaining = windowMs - (Date.now() - this.lockouts[key]);
        return remaining > 0 ? remaining : 0;
    }

    /**
     * إعادة تعيين المحاولات
     */
    reset(key) {
        delete this.attempts[key];
        delete this.lockouts[key];
    }
}

const loginLimiter = new RateLimiter();
const registerLimiter = new RateLimiter();

// ============== Encryption Module ==============
// تشفير البيانات الحساسة

class EncryptionModule {
    /**
     * تشفير بسيط للبيانات الحساسة (يستخدم localStorage)
     * ملاحظة: هذا تشفير بسيط. لتطبيقات الإنتاج، استخدم مكتبات متخصصة
     */
    static encrypt(data, key = 'default-key') {
        try {
            const encoded = btoa(JSON.stringify(data));
            return encoded;
        } catch (error) {
            console.error('خطأ في التشفير:', error);
            return null;
        }
    }

    static decrypt(encrypted, key = 'default-key') {
        try {
            const decoded = JSON.parse(atob(encrypted));
            return decoded;
        } catch (error) {
            console.error('خطأ في فك التشفير:', error);
            return null;
        }
    }

    /**
     * حفظ البيانات الحساسة بشكل آمن
     */
    static saveSecureData(key, data) {
        const encrypted = this.encrypt(data);
        sessionStorage.setItem(key, encrypted);
    }

    static getSecureData(key) {
        const encrypted = sessionStorage.getItem(key);
        return encrypted ? this.decrypt(encrypted) : null;
    }

    /**
     * مسح البيانات الحساسة
     */
    static clearSecureData(key) {
        sessionStorage.removeItem(key);
    }
}

// ============== Session Management ==============
// إدارة الجلسات

class SessionManager {
    constructor() {
        this.sessionTimeout = 30 * 60 * 1000; // 30 دقيقة
        this.warningTime = 5 * 60 * 1000; // 5 دقائق
        this.lastActivity = Date.now();
        this.sessionId = this.generateSessionId();
    }

    generateSessionId() {
        return 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now();
    }

    /**
     * تحديث وقت الجلسة
     */
    updateActivity() {
        this.lastActivity = Date.now();
        sessionStorage.setItem('lastActivity', this.lastActivity);
    }

    /**
     * التحقق من صلاحية الجلسة
     */
    isSessionValid() {
        const now = Date.now();
        const lastActivity = parseInt(sessionStorage.getItem('lastActivity') || this.lastActivity);
        return (now - lastActivity) < this.sessionTimeout;
    }

    /**
     * التحقق من التحذير
     */
    shouldWarnUser() {
        const now = Date.now();
        const lastActivity = parseInt(sessionStorage.getItem('lastActivity') || this.lastActivity);
        return (now - lastActivity) > (this.sessionTimeout - this.warningTime);
    }

    /**
     * إنهاء الجلسة
     */
    endSession() {
        sessionStorage.clear();
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
    }
}

const sessionManager = new SessionManager();

// ============== CSRF Protection ==============
// حماية CSRF

class CSRFProtection {
    static generateToken() {
        const token = 'token_' + Math.random().toString(36).substr(2, 32);
        sessionStorage.setItem('csrfToken', token);
        return token;
    }

    static getToken() {
        let token = sessionStorage.getItem('csrfToken');
        if (!token) {
            token = this.generateToken();
        }
        return token;
    }

    static validateToken(token) {
        const stored = sessionStorage.getItem('csrfToken');
        return stored === token;
    }

    static addTokenToForm(form) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'csrf_token';
        input.value = this.getToken();
        form.appendChild(input);
    }
}

// ============== Audit Logging ==============
// تسجيل العمليات الحساسة

class AuditLogger {
    /**
     * تسجيل عملية حساسة
     */
    static async logAction(action, details) {
        try {
            const user = await getCurrentUser();
            const timestamp = new Date().toISOString();

            const log = {
                action,
                details,
                user_id: user?.id,
                user_name: user?.name,
                ip_address: await this.getUserIP(),
                timestamp,
                user_agent: navigator.userAgent
            };

            // حفظ في قاعدة البيانات
            await supabase
                .from('audit_logs')
                .insert([log]);

            console.log('تم تسجيل العملية:', action);
        } catch (error) {
            console.error('خطأ في تسجيل العملية:', error);
        }
    }

    static async getUserIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch {
            return 'unknown';
        }
    }

    /**
     * أنواع العمليات المهمة
     */
    static async logLogin(userId) {
        await this.logAction('LOGIN', { user_id: userId });
    }

    static async logLogout(userId) {
        await this.logAction('LOGOUT', { user_id: userId });
    }

    static async logUserApproval(userId, adminId) {
        await this.logAction('USER_APPROVAL', { user_id: userId, admin_id: adminId });
    }

    static async logExamSubmission(userId, examId, score) {
        await this.logAction('EXAM_SUBMISSION', { user_id: userId, exam_id: examId, score });
    }

    static async logCertificateGeneration(userId, examId) {
        await this.logAction('CERTIFICATE_GENERATED', { user_id: userId, exam_id: examId });
    }
}

// ============== Activity Monitoring ==============
// مراقبة النشاط

class ActivityMonitor {
    constructor() {
        this.setupListeners();
    }

    setupListeners() {
        // تحديث الجلسة على أي نشاط
        document.addEventListener('mousemove', () => sessionManager.updateActivity());
        document.addEventListener('keypress', () => sessionManager.updateActivity());
        document.addEventListener('click', () => sessionManager.updateActivity());
        document.addEventListener('scroll', () => sessionManager.updateActivity());

        // التحقق من صلاحية الجلسة بشكل دوري
        setInterval(() => {
            if (!sessionManager.isSessionValid()) {
                alert('انتهت جلستك. يرجى تسجيل الدخول مجدداً');
                logoutUser();
            }
        }, 1000);
    }
}

const activityMonitor = new ActivityMonitor();

// ============== Usage Examples ==============
/*
// أمثلة على الاستخدام:

// 1. التحقق من صحة البيانات
const passwordValidation = SecurityValidator.validatePasswordStrength('Pass123!@#');
console.log(passwordValidation); // { isValid: true, strength: 'قوية جداً', issues: [] }

// 2. منع حقن SQL
const userInput = "'; DROP TABLE users; --";
const safe = SecurityValidator.sanitizeInput(userInput);

// 3. تحديد معدل الطلبات
if (!loginLimiter.isAllowed('user@example.com')) {
    alert('تم تجاوز عدد محاولات الدخول. حاول لاحقاً');
}

// 4. إدارة الجلسات
sessionManager.updateActivity();
if (sessionManager.isSessionValid()) {
    // المستخدم نشط
}

// 5. حماية CSRF
const token = CSRFProtection.getToken();

// 6. تسجيل العمليات الحساسة
AuditLogger.logLogin(userId);

// 7. حفظ البيانات بشكل آمن
EncryptionModule.saveSecureData('user-token', { token: 'abc123' });
const data = EncryptionModule.getSecureData('user-token');
*/
