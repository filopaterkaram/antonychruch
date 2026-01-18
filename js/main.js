// ============== Main JS ==============
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
});

async function initializeApp() {
    // تحميل وعظة اليوم
    const sermonResult = await getTodaySermon();
    if (sermonResult.success && sermonResult.data) {
        displayTodaySermon(sermonResult.data);
    } else {
        document.getElementById('sermon-container').innerHTML = '<p>لا توجد وعظة لهذا اليوم</p>';
    }

    // تحميل الخدمات
    const servicesResult = await getServices();
    if (servicesResult.success) {
        displayServices(servicesResult.data);
    }

    // تحديث الإحصائيات
    updateStatistics();
}

function displayTodaySermon(sermon) {
    const container = document.getElementById('sermon-container');
    container.innerHTML = `
        <h3>${sermon.title}</h3>
        <p class="sermon-date">${new Date(sermon.date).toLocaleDateString('ar-EG')}</p>
        <p>${sermon.content}</p>
    `;
}

function displayServices(services) {
    const grid = document.getElementById('services-grid');
    
    if (services.length === 0) {
        grid.innerHTML = '<p>لا توجد خدمات متاحة حالياً</p>';
        return;
    }

    grid.innerHTML = services.map(service => `
        <div class="service-card">
            <h3>${service.name}</h3>
            <p>${service.description}</p>
            <button class="btn btn-primary" onclick="selectService('${service.id}')">
                دخول الخدمة
            </button>
        </div>
    `).join('');
}

async function updateStatistics() {
    try {
        // عدد الأعضاء النشطين
        const { data: users } = await supabaseClient
            .from('users')
            .select('id', { count: 'exact' })
            .eq('status', 'active');

        document.getElementById('members-count').textContent = users?.length || 0;

        // عدد الامتحانات المكتملة
        const { data: answers } = await supabaseClient
            .from('exam_answers')
            .select('id', { count: 'exact' });

        document.getElementById('exams-count').textContent = answers?.length || 0;

        // عدد الشهادات الصادرة
        const { data: certs } = await supabaseClient
            .from('certificates')
            .select('id', { count: 'exact' });

        document.getElementById('certificates-count').textContent = certs?.length || 0;

        // عدد الوعظات
        const { data: sermons } = await supabaseClient
            .from('sermons')
            .select('id', { count: 'exact' });

        document.getElementById('sermons-count').textContent = sermons?.length || 0;
    } catch (error) {
        console.error('خطأ في تحديث الإحصائيات:', error);
    }
}

function selectService(serviceId) {
    const user = localStorage.getItem('currentUser');
    if (!user) {
        window.location.href = 'pages/login.html';
    } else {
        window.location.href = `pages/service.html?id=${serviceId}`;
    }
}

// ============== Navbar Navigation ==============
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        // إزالة الـ active من جميع الروابط
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        // إضافة active للرابط الحالي
        link.classList.add('active');
    });
});
