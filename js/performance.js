// ============== Performance Optimization Module ==============
// تحسين الأداء

class PerformanceOptimizer {
    constructor() {
        this.metrics = {};
    }

    /**
     * قياس أداء الدالة
     */
    measureFunction(functionName, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();

        this.metrics[functionName] = {
            duration: end - start,
            timestamp: new Date().toISOString()
        };

        console.log(`⏱️ ${functionName}: ${(end - start).toFixed(2)}ms`);
        return result;
    }

    /**
     * التنبيه عند تجاوز الوقت المسموح
     */
    async measureAsync(functionName, asyncFn, maxDuration = 2000) {
        const start = performance.now();
        
        try {
            const result = await asyncFn();
            const end = performance.now();
            const duration = end - start;

            this.metrics[functionName] = {
                duration,
                timestamp: new Date().toISOString(),
                status: duration > maxDuration ? 'slow' : 'ok'
            };

            if (duration > maxDuration) {
                console.warn(`⚠️ ${functionName} تجاوزت الوقت المسموح: ${duration.toFixed(2)}ms`);
            } else {
                console.log(`✅ ${functionName}: ${duration.toFixed(2)}ms`);
            }

            return result;
        } catch (error) {
            console.error(`❌ ${functionName} فشلت:`, error);
            throw error;
        }
    }

    /**
     * الحصول على تقرير الأداء
     */
    getReport() {
        return this.metrics;
    }

    /**
     * مسح المقاييس
     */
    clearMetrics() {
        this.metrics = {};
    }
}

const performanceOptimizer = new PerformanceOptimizer();

// ============== Caching Module ==============
// نظام التخزين المؤقت

class CacheManager {
    constructor(prefix = 'cache_') {
        this.prefix = prefix;
        this.memory = {};
    }

    /**
     * حفظ في الذاكرة
     */
    setMemory(key, value, ttl = null) {
        this.memory[key] = {
            value,
            expires: ttl ? Date.now() + ttl : null
        };
    }

    getMemory(key) {
        const item = this.memory[key];
        if (!item) return null;

        if (item.expires && Date.now() > item.expires) {
            delete this.memory[key];
            return null;
        }

        return item.value;
    }

    /**
     * حفظ في localStorage
     */
    setLocal(key, value, ttl = null) {
        const data = {
            value,
            expires: ttl ? Date.now() + ttl : null
        };
        localStorage.setItem(this.prefix + key, JSON.stringify(data));
    }

    getLocal(key) {
        const item = localStorage.getItem(this.prefix + key);
        if (!item) return null;

        const data = JSON.parse(item);

        if (data.expires && Date.now() > data.expires) {
            localStorage.removeItem(this.prefix + key);
            return null;
        }

        return data.value;
    }

    /**
     * حفظ شامل (الذاكرة أولاً، ثم localStorage)
     */
    set(key, value, ttl = null) {
        this.setMemory(key, value, ttl);
        this.setLocal(key, value, ttl);
    }

    get(key) {
        return this.getMemory(key) || this.getLocal(key);
    }

    /**
     * حذف من الذاكرة
     */
    delete(key) {
        delete this.memory[key];
        localStorage.removeItem(this.prefix + key);
    }

    /**
     * مسح الكل
     */
    clear() {
        this.memory = {};
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.prefix)) {
                localStorage.removeItem(key);
            }
        });
    }
}

const cacheManager = new CacheManager();

// ============== Lazy Loading Module ==============
// تحميل البيانات عند الحاجة

class LazyLoader {
    /**
     * تحميل الصور بشكل كسول
     */
    static initLazyImages() {
        const images = document.querySelectorAll('img[data-src]');

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }

    /**
     * تحميل المحتوى عند التمرير
     */
    static initLazyContent(selector, loadMore) {
        const elements = document.querySelectorAll(selector);

        const contentObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    loadMore();
                    contentObserver.unobserve(entry.target);
                }
            });
        }, { rootMargin: '100px' });

        if (elements.length > 0) {
            contentObserver.observe(elements[elements.length - 1]);
        }
    }
}

// ============== Analytics Module ==============
// تحليل الاستخدام

class Analytics {
    constructor() {
        this.events = [];
        this.startTime = Date.now();
    }

    /**
     * تسجيل حدث
     */
    trackEvent(eventName, properties = {}) {
        const event = {
            name: eventName,
            properties,
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.startTime
        };

        this.events.push(event);
        console.log(`📊 Event: ${eventName}`, properties);

        // إرسال إلى خادم تحليل (اختياري)
        // this.sendEvent(event);
    }

    /**
     * تتبع الصفحات
     */
    trackPageView(pageName) {
        this.trackEvent('page_view', { page: pageName });
    }

    /**
     * تتبع الأخطاء
     */
    trackError(error) {
        this.trackEvent('error', {
            message: error.message,
            stack: error.stack
        });
    }

    /**
     * الحصول على التقرير
     */
    getReport() {
        return {
            totalEvents: this.events.length,
            sessionDuration: Date.now() - this.startTime,
            events: this.events,
            eventsByType: this.groupByType()
        };
    }

    groupByType() {
        const grouped = {};
        this.events.forEach(event => {
            if (!grouped[event.name]) {
                grouped[event.name] = 0;
            }
            grouped[event.name]++;
        });
        return grouped;
    }

    /**
     * إرسال البيانات إلى الخادم
     */
    async sendAnalytics() {
        try {
            const report = this.getReport();
            const user = await getCurrentUser();

            await supabase
                .from('analytics')
                .insert([{
                    user_id: user?.id,
                    report: report,
                    created_at: new Date().toISOString()
                }]);

            console.log('✅ تم إرسال بيانات التحليل');
        } catch (error) {
            console.error('❌ خطأ في إرسال بيانات التحليل:', error);
        }
    }
}

const analytics = new Analytics();

// ============== Error Handling Module ==============
// معالجة الأخطاء

class ErrorHandler {
    /**
     * معالج الأخطاء العام
     */
    static setup() {
        // معالجة أخطاء النصوص
        window.addEventListener('error', (event) => {
            console.error('❌ خطأ:', event.message);
            analytics.trackError(event.error);
            
            // عرض رسالة للمستخدم
            this.showErrorMessage('حدث خطأ في الموقع. يرجى تحديث الصفحة');
        });

        // معالجة الـ promises المرفوضة
        window.addEventListener('unhandledrejection', (event) => {
            console.error('❌ Promise رفضت:', event.reason);
            analytics.trackError(event.reason);
            
            this.showErrorMessage('حدث خطأ في معالجة الطلب');
        });
    }

    static showErrorMessage(message) {
        const errorEl = document.createElement('div');
        errorEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #f8d7da;
            color: #721c24;
            padding: 15px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 9999;
            max-width: 300px;
        `;
        errorEl.textContent = message;
        document.body.appendChild(errorEl);

        setTimeout(() => {
            errorEl.remove();
        }, 5000);
    }

    static showSuccessMessage(message) {
        const successEl = document.createElement('div');
        successEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #d4edda;
            color: #155724;
            padding: 15px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 9999;
            max-width: 300px;
        `;
        successEl.textContent = message;
        document.body.appendChild(successEl);

        setTimeout(() => {
            successEl.remove();
        }, 3000);
    }
}

// ============== DOM Utilities ==============
// أدوات DOM

class DOMUtil {
    /**
     * البحث الآمن عن العنصر
     */
    static safe$(selector) {
        try {
            return document.querySelector(selector);
        } catch (error) {
            console.error('خطأ في البحث عن العنصر:', selector);
            return null;
        }
    }

    /**
     * إنشاء عنصر بسهولة
     */
    static createElement(tag, attributes = {}, content = '') {
        const el = document.createElement(tag);
        
        Object.keys(attributes).forEach(key => {
            if (key === 'class') {
                el.className = attributes[key];
            } else if (key === 'style') {
                Object.assign(el.style, attributes[key]);
            } else {
                el.setAttribute(key, attributes[key]);
            }
        });

        if (content) {
            el.textContent = content;
        }

        return el;
    }

    /**
     * إضافة أحداث متعددة
     */
    static on(element, events, handler) {
        events.split(' ').forEach(event => {
            element.addEventListener(event, handler);
        });
    }

    /**
     * تأخير التنفيذ
     */
    static debounce(fn, delay = 300) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    /**
     * تنفيذ مرة واحدة فقط
     */
    static throttle(fn, limit = 1000) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// ============== Initialization ==============
// التهيئة عند بدء الموقع

document.addEventListener('DOMContentLoaded', () => {
    // إعداد معالجة الأخطاء
    ErrorHandler.setup();

    // تحميل الصور بشكل كسول
    LazyLoader.initLazyImages();

    // بدء التحليل
    analytics.trackPageView(window.location.pathname);

    console.log('✅ تم تهيئة الموقع بنجاح');
});

// ============== Usage Examples ==============
/*
// أمثلة على الاستخدام:

// 1. قياس الأداء
performanceOptimizer.measureAsync('loadData', async () => {
    return await fetchData();
}, 2000);

// 2. التخزين المؤقت
cacheManager.set('user-data', userData, 5 * 60 * 1000); // 5 دقائق
const cached = cacheManager.get('user-data');

// 3. تتبع الأحداث
analytics.trackEvent('exam_submitted', { examId: 123, score: 95 });

// 4. عرض الأخطاء
ErrorHandler.showErrorMessage('حدث خطأ ما');

// 5. أدوات DOM
const element = DOMUtil.safe$('.my-element');
const btn = DOMUtil.createElement('button', { class: 'btn' }, 'انقر هنا');

// 6. تأخير التنفيذ
const debouncedSearch = DOMUtil.debounce((query) => {
    performSearch(query);
}, 500);
*/
