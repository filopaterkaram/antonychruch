// ============== Certificate Generation Module ==============
// معالجة إنشاء الشهادات مع الصور

class CertificateGenerator {
    constructor() {
        this.canvas = null;
        this.ctx = null;
    }

    /**
     * إنشاء شهادة من نموذج صورة
     * @param {String} imagePath - مسار الصورة
     * @param {String} userName - اسم المستخدم
     * @param {String} examTitle - عنوان الامتحان
     * @param {Number} score - الدرجة
     * @returns {Canvas} - اللوحة بالشهادة
     */
    async generateFromTemplate(imagePath, userName, examTitle, score) {
        try {
            // تحميل الصورة
            const img = await this.loadImage(imagePath);
            
            // إنشاء canvas بحجم الصورة
            this.canvas = document.createElement('canvas');
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            this.ctx = this.canvas.getContext('2d');

            // رسم الصورة الأساسية
            this.ctx.drawImage(img, 0, 0);

            // إضافة النصوص على الصورة
            this.addTextToCertificate(userName, examTitle, score, img.width, img.height);

            return this.canvas;
        } catch (error) {
            console.error('خطأ في إنشاء الشهادة:', error);
            throw error;
        }
    }

    /**
     * تحميل الصورة
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('فشل تحميل الصورة'));
            img.src = src;
        });
    }

    /**
     * إضافة النصوص على الشهادة
     */
    addTextToCertificate(userName, examTitle, score, width, height) {
        // إعدادات النصوص
        const fontSize = Math.round(width / 15);
        const smallFontSize = Math.round(width / 25);

        // تعيين الخط واللون
        this.ctx.fillStyle = '#1a3a52';
        this.ctx.textAlign = 'center';
        this.ctx.font = `bold ${fontSize}px 'Cairo', Arial`;

        // رسم اسم المستخدم
        this.ctx.fillText(userName, width / 2, height / 2.2);

        // رسم عنوان الامتحان
        this.ctx.font = `${smallFontSize}px 'Cairo', Arial`;
        this.ctx.fillText(examTitle, width / 2, height / 1.8);

        // رسم الدرجة
        this.ctx.font = `bold ${smallFontSize}px 'Cairo', Arial`;
        this.ctx.fillText(`الدرجة: ${score}%`, width / 2, height / 1.5);

        // رسم التاريخ
        const today = new Date().toLocaleDateString('ar-EG');
        this.ctx.font = `${Math.round(smallFontSize * 0.8)}px 'Cairo', Arial`;
        this.ctx.fillText(`الصادرة في: ${today}`, width / 2, height / 1.25);
    }

    /**
     * تحميل الشهادة كصورة
     */
    downloadCertificate(fileName = 'شهادة.png') {
        const link = document.createElement('a');
        link.href = this.canvas.toDataURL('image/png');
        link.download = fileName;
        link.click();
    }

    /**
     * طباعة الشهادة
     */
    printCertificate() {
        const printWindow = window.open('', '', 'width=800,height=600');
        const img = this.canvas.toDataURL('image/png');
        printWindow.document.write(`<img src="${img}" style="max-width: 100%; height: auto;">`);
        printWindow.document.close();
        printWindow.print();
    }

    /**
     * حفظ الشهادة في Supabase Storage
     */
    async saveCertificateToStorage(examId, userId, userName) {
        try {
            const blob = await this.canvasToBlob(this.canvas);
            const fileName = `cert_${examId}_${userId}_${Date.now()}.png`;

            const { error } = await supabase.storage
                .from('certificates')
                .upload(`generated/${fileName}`, blob);

            if (error) throw error;

            // حفظ المسار في قاعدة البيانات
            await supabase
                .from('certificates')
                .update({ certificate_image: fileName })
                .eq('exam_id', examId)
                .eq('user_id', userId);

            return { success: true, fileName };
        } catch (error) {
            console.error('خطأ في حفظ الشهادة:', error);
            throw error;
        }
    }

    /**
     * تحويل Canvas إلى Blob
     */
    canvasToBlob(canvas) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/png');
        });
    }
}

// ============== Image Processing Module ==============
// معالجة الصور

class ImageProcessor {
    /**
     * تغيير حجم الصورة
     */
    static async resizeImage(file, maxWidth = 1200, maxHeight = 800) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // حساب الحجم الجديد
                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
                };
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * التحقق من صيغة الملف
     */
    static isValidImageFormat(file) {
        const validFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        return validFormats.includes(file.type);
    }

    /**
     * الحصول على معلومات الصورة
     */
    static getImageInfo(file) {
        return {
            name: file.name,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            type: file.type,
            lastModified: new Date(file.lastModified).toLocaleDateString('ar-EG')
        };
    }
}

// ============== Text Rendering Module ==============
// معالجة النصوص والخطوط العربية

class ArabicTextRenderer {
    /**
     * قياس النص مع دعم اللغة العربية
     */
    static measureText(ctx, text, fontSize, fontFamily = 'Cairo') {
        ctx.font = `${fontSize}px ${fontFamily}, Arial`;
        return ctx.measureText(text).width;
    }

    /**
     * رسم نص متعدد الأسطر
     */
    static drawMultilineText(ctx, text, x, y, maxWidth, lineHeight = 30) {
        const words = text.split(' ');
        let line = '';
        let yPos = y;

        words.forEach((word) => {
            const testLine = line + word + ' ';
            if (this.measureText(ctx, testLine, 16) > maxWidth) {
                ctx.fillText(line, x, yPos);
                line = word + ' ';
                yPos += lineHeight;
            } else {
                line = testLine;
            }
        });
        
        ctx.fillText(line, x, yPos);
    }

    /**
     * تنسيق التاريخ بصيغة عربية
     */
    static formatDateArabic(date) {
        const months = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];

        const days = [
            'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
        ];

        const dayName = days[date.getDay()];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();

        return `${dayName} ${day} ${month} ${year}`;
    }
}

// ============== Usage Example ==============
/*
// مثال على الاستخدام:

async function createCertificate() {
    const generator = new CertificateGenerator();
    
    // إنشاء شهادة من صورة نموذج
    const canvas = await generator.generateFromTemplate(
        'images/certificate-template.png',
        'أحمد محمد علي',
        'امتحان الكتاب المقدس',
        95
    );

    // عرض الشهادة
    document.getElementById('cert-container').appendChild(canvas);

    // تحميل الشهادة
    generator.downloadCertificate('شهادة_أحمد.png');

    // أو طباعة الشهادة
    generator.printCertificate();

    // أو حفظها في Supabase
    const result = await generator.saveCertificateToStorage(
        'exam-id',
        'user-id',
        'أحمد محمد علي'
    );
}

// التحقق من الصور
const fileInput = document.getElementById('image-input');
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    
    if (!ImageProcessor.isValidImageFormat(file)) {
        alert('صيغة الملف غير صحيحة. استخدم JPG أو PNG');
        return;
    }

    console.log('معلومات الملف:', ImageProcessor.getImageInfo(file));
});

// تنسيق التاريخ
const arabicDate = ArabicTextRenderer.formatDateArabic(new Date());
console.log(arabicDate); // الاثنين 18 يناير 2024
*/

// ============== Advanced Certificate Features ==============
// ميزات متقدمة للشهادات

class AdvancedCertificate extends CertificateGenerator {
    /**
     * إضافة علامة مائية على الشهادة
     */
    addWatermark(watermarkText, opacity = 0.1) {
        const prevOpacity = this.ctx.globalAlpha;
        this.ctx.globalAlpha = opacity;
        
        this.ctx.font = 'bold 60px Arial';
        this.ctx.fillStyle = '#ccc';
        this.ctx.textAlign = 'center';
        this.ctx.rotate(-45 * Math.PI / 180);
        
        this.ctx.fillText(watermarkText, 0, 0);
        this.ctx.rotate(45 * Math.PI / 180);
        
        this.ctx.globalAlpha = prevOpacity;
    }

    /**
     * إضافة QR Code للشهادة (يتطلب مكتبة qrcode.js)
     */
    addQRCode(certificateId, x, y, size = 100) {
        // يمكن استخدام مكتبة QRCode.js
        // QRCode.toCanvas(this.canvas, certificateId, { width: size }, (error) => {
        //     if (error) console.error(error);
        // });
    }

    /**
     * إضافة رقم تسلسلي للشهادة
     */
    addSerialNumber(serialNumber, x, y) {
        this.ctx.fillStyle = '#666';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`رقم الشهادة: ${serialNumber}`, x, y);
    }

    /**
     * إضافة توقيع رقمي
     */
    addDigitalSignature(signatureImage, x, y, width = 80, height = 80) {
        const img = new Image();
        img.onload = () => {
            this.ctx.drawImage(signatureImage, x, y, width, height);
        };
        img.src = signatureImage;
    }
}

// ============== Statistics and Reporting ==============
// إحصائيات وتقارير

class CertificateStatistics {
    /**
     * الحصول على إحصائيات الشهادات
     */
    static async getCertificateStats() {
        try {
            const { data: certificates } = await supabase
                .from('certificates')
                .select('score, generated_at');

            const { data: users } = await supabase
                .from('users')
                .select('id', { count: 'exact' });

            const { data: exams } = await supabase
                .from('exams')
                .select('id', { count: 'exact' });

            return {
                totalCertificates: certificates?.length || 0,
                totalUsers: users?.length || 0,
                totalExams: exams?.length || 0,
                averageScore: this.calculateAverageScore(certificates || []),
                certificatesByExam: this.groupByExam(certificates || [])
            };
        } catch (error) {
            console.error('خطأ في جلب الإحصائيات:', error);
            return null;
        }
    }

    static calculateAverageScore(certificates) {
        if (certificates.length === 0) return 0;
        const sum = certificates.reduce((acc, cert) => acc + cert.score, 0);
        return Math.round(sum / certificates.length);
    }

    static groupByExam(certificates) {
        const grouped = {};
        certificates.forEach(cert => {
            if (!grouped[cert.exam_id]) {
                grouped[cert.exam_id] = [];
            }
            grouped[cert.exam_id].push(cert);
        });
        return grouped;
    }

    /**
     * تقرير الأداء الشهري
     */
    static async getMonthlyReport(year, month) {
        try {
            const startDate = new Date(year, month - 1, 1).toISOString();
            const endDate = new Date(year, month, 0).toISOString();

            const { data: certificates } = await supabase
                .from('certificates')
                .select('*')
                .gte('generated_at', startDate)
                .lte('generated_at', endDate);

            return {
                month,
                year,
                totalCertificates: certificates?.length || 0,
                averageScore: this.calculateAverageScore(certificates || []),
                data: certificates || []
            };
        } catch (error) {
            console.error('خطأ في جلب التقرير:', error);
            return null;
        }
    }
}
