// ============== Debug Helper File ==============
// هذا الملف يساعد في تشخيص المشاكل والتحقق من تحميل جميع الملفات بشكل صحيح

function debugStatus() {
    const status = {
        // التحقق من Supabase
        supabaseLoaded: typeof window.supabase !== 'undefined',
        supabaseClient: typeof supabase !== 'undefined' && supabase !== null,
        
        // التحقق من دوال التحقق من الهوية
        registerUserDefined: typeof registerUser === 'function',
        loginUserDefined: typeof loginUser === 'function',
        logoutUserDefined: typeof logoutUser === 'function',
        
        // التحقق من دوال الخدمات
        getServicesDefined: typeof getServices === 'function',
        createServiceDefined: typeof createService === 'function',
        
        // التحقق من دوال الامتحانات
        getExamsDefined: typeof getExams === 'function',
        submitExamAnswerDefined: typeof submitExamAnswer === 'function',
        
        // التحقق من دوال الشهادات
        generateCertificateDefined: typeof generateCertificate === 'function',
        getCertificatesDefined: typeof getCertificates === 'function',
        
        // التحقق من السكريبتات الأخرى
        configInitialized: typeof CONFIG_INITIALIZED !== 'undefined',
    };
    
    return status;
}

function printDebugStatus() {
    const status = debugStatus();
    console.clear();
    console.log('%c=== حالة النظام ===', 'color: blue; font-weight: bold; font-size: 16px');
    console.table(status);
    
    // الإجمالي
    const allGood = Object.values(status).every(v => v === true);
    if (allGood) {
        console.log('%c✅ جميع الأنظمة تعمل بشكل صحيح!', 'color: green; font-weight: bold; font-size: 14px');
    } else {
        console.log('%c❌ هناك مشاكل في النظام. راجع التفاصيل أعلاه.', 'color: red; font-weight: bold; font-size: 14px');
    }
}

// تشغيل التشخيص عند تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', printDebugStatus);
} else {
    printDebugStatus();
}

// تصدير للاستخدام من وحدة التحكم
window.debugStatus = debugStatus;
window.printDebugStatus = printDebugStatus;
