// ============== Admin Dashboard JS ==============

document.addEventListener('DOMContentLoaded', async () => {
    // التحقق من أن المستخدم أدمن
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
        window.location.href = '../pages/login.html';
        return;
    }

    // تحميل البيانات
    document.getElementById('user-greeting').textContent = `مرحباً بك يا ${user.name}`;
    await loadDashboardData();
    await loadPendingUsers();
    await loadServices();
    await loadSermons();
    await loadExams();
    await loadCertificates();
    await loadAdmins();
});

async function loadDashboardData() {
    try {
        // عدد المستخدمين النشطين
        const { data: activeUsers } = await supabaseClient
            .from('users')
            .select('id', { count: 'exact' })
            .eq('status', 'active');

        document.getElementById('active-users').textContent = activeUsers?.length || 0;

        // حسابات قيد المراجعة
        const { data: pendingUsers } = await supabaseClient
            .from('users')
            .select('id', { count: 'exact' })
            .eq('status', 'pending');

        document.getElementById('pending-users').textContent = pendingUsers?.length || 0;

        // عدد الخدمات
        const { data: services } = await supabaseClient
            .from('services')
            .select('id', { count: 'exact' });

        document.getElementById('total-services').textContent = services?.length || 0;

        // عدد الامتحانات
        const { data: exams } = await supabaseClient
            .from('exams')
            .select('id', { count: 'exact' });

        document.getElementById('total-exams').textContent = exams?.length || 0;

        // أفضل 10 متفوقين
        const topUsers = await getTopUsers();
        if (topUsers.success) {
            displayTopUsers(topUsers.data);
        }
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
    }
}

function displayTopUsers(users) {
    const list = document.getElementById('top-users-list');
    
    if (users.length === 0) {
        list.innerHTML = '<p>لا توجد نتائج حتى الآن</p>';
        return;
    }

    let html = '<ol>';
    users.forEach(user => {
        html += `<li>${user.rank}. ${user.name} - ${user.score}%</li>`;
    });
    html += '</ol>';
    
    list.innerHTML = html;
}

async function loadPendingUsers() {
    try {
        const result = await getPendingUsers();
        
        if (result.success) {
            displayPendingUsers(result.data);
        }
    } catch (error) {
        console.error('خطأ في تحميل المستخدمين:', error);
    }
}

function displayPendingUsers(users) {
    const container = document.getElementById('pending-users-list');
    
    if (users.length === 0) {
        container.innerHTML = '<tr><td colspan="5">لا توجد حسابات قيد المراجعة</td></tr>';
        return;
    }

    container.innerHTML = users.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.phone}</td>
            <td>${user.is_church_member ? 'عضو كنيسة' : 'زائر'}</td>
            <td>${new Date(user.created_at).toLocaleDateString('ar-EG')}</td>
            <td class="action-buttons">
                <button class="action-btn btn-accept" onclick="approveUserAccount('${user.id}')">قبول</button>
                <button class="action-btn btn-reject" onclick="rejectUserAccount('${user.id}')">رفض</button>
            </td>
        </tr>
    `).join('');

    // تحميل المستخدمين النشطين
    loadAllActiveUsers();
}

async function loadAllActiveUsers() {
    try {
        const { data: users } = await supabase
            .from('users')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        const container = document.getElementById('all-users-list');
        
        if (!users || users.length === 0) {
            container.innerHTML = '<tr><td colspan="4">لا توجد حسابات نشطة</td></tr>';
            return;
        }

        container.innerHTML = users.map(user => `
            <tr>
                <td>${user.name}</td>
                <td>${user.phone}</td>
                <td>${user.is_church_member ? 'عضو كنيسة' : 'زائر'}</td>
                <td><span class="status-badge status-active">نشط</span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('خطأ:', error);
    }
}

async function approveUserAccount(userId) {
    const result = await approveUser(userId);
    if (result.success) {
        alert('تم قبول الحساب بنجاح');
        await loadPendingUsers();
        await loadDashboardData();
    } else {
        alert('حدث خطأ: ' + result.message);
    }
}

async function rejectUserAccount(userId) {
    if (confirm('هل أنت متأكد من رفض هذا الحساب؟')) {
        const result = await rejectUser(userId);
        if (result.success) {
            alert('تم رفض الحساب');
            await loadPendingUsers();
            await loadDashboardData();
        } else {
            alert('حدث خطأ: ' + result.message);
        }
    }
}

async function loadServices() {
    try {
        const result = await getServices();
        const container = document.getElementById('services-list');

        if (!result.success || result.data.length === 0) {
            container.innerHTML = '<p>لا توجد خدمات حالياً</p>';
            return;
        }

        let html = '<table class="admin-table"><thead><tr><th>الاسم</th><th>الوصف</th><th>كلمة السر</th><th>الإجراء</th></tr></thead><tbody>';
        
        for (let service of result.data) {
            const pwd = await getServicePasswords(service.id);
            const password = pwd.data && pwd.data.length > 0 ? pwd.data[0].password : 'غير محددة';
            
            html += `
                <tr>
                    <td>${service.name}</td>
                    <td>${service.description}</td>
                    <td>
                        <input type="text" value="${password}" id="pwd-${service.id}" readonly>
                    </td>
                    <td class="action-buttons">
                        <button class="action-btn btn-edit" onclick="editServicePassword('${service.id}', '${password}')">تعديل</button>
                        <button class="action-btn btn-delete" onclick="deleteServiceItem('${service.id}')">حذف</button>
                    </td>
                </tr>
            `;
        }
        
        html += '</tbody></table>';
        container.innerHTML = html;

        // تحديث القوائم المنسدلة
        updateServiceSelects(result.data);
    } catch (error) {
        console.error('خطأ:', error);
    }
}

async function deleteServiceItem(serviceId) {
    if (confirm('هل أنت متأكد من حذف هذه الخدمة؟')) {
        const result = await deleteService(serviceId);
        if (result.success) {
            alert('تم حذف الخدمة');
            await loadServices();
            await loadDashboardData();
        } else {
            alert('حدث خطأ: ' + result.message);
        }
    }
}

function editServicePassword(serviceId, currentPassword) {
    const newPassword = prompt('أدخل كلمة السر الجديدة:', currentPassword);
    if (newPassword !== null && newPassword.trim() !== '') {
        updateServicePasswordItem(serviceId, newPassword);
    }
}

async function updateServicePasswordItem(serviceId, password) {
    const result = await updateServicePassword(serviceId, password);
    if (result.success) {
        alert('تم تحديث كلمة السر');
        await loadServices();
    } else {
        alert('خطأ: ' + result.message);
    }
}

function updateServiceSelects(services) {
    const serviceSelect1 = document.getElementById('sermon-service');
    const serviceSelect2 = document.getElementById('exam-service');

    if (serviceSelect1) {
        serviceSelect1.innerHTML = '<option value="">اختر خدمة</option>' + 
            services.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }

    if (serviceSelect2) {
        serviceSelect2.innerHTML = '<option value="">اختر خدمة</option>' + 
            services.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
}

function openAddServiceModal() {
    document.getElementById('add-service-form').reset();
    openModal('add-service-modal');
}

document.getElementById('add-service-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('service-name').value;
    const description = document.getElementById('service-desc').value;
    const password = document.getElementById('service-password').value;

    const result = await createService(name, description);
    
    if (result.success) {
        // إضافة كلمة السر
        const services = await getServices();
        const newService = services.data.find(s => s.name === name);
        if (newService) {
            await updateServicePassword(newService.id, password);
        }
        
        alert('تم إضافة الخدمة بنجاح');
        closeModal('add-service-modal');
        await loadServices();
        await loadDashboardData();
    } else {
        alert('خطأ: ' + result.message);
    }
});

async function loadSermons() {
    try {
        const result = await getSermons();
        const container = document.getElementById('sermons-list');

        if (!result.success || result.data.length === 0) {
            container.innerHTML = '<p>لا توجد وعظات حالياً</p>';
            return;
        }

        let html = '<table class="admin-table"><thead><tr><th>التاريخ</th><th>العنوان</th><th>الخدمة</th><th>الإجراء</th></tr></thead><tbody>';
        
        for (let sermon of result.data) {
            const service = sermon.service_id ? `خدمة #${sermon.service_id}` : 'عامة';
            html += `
                <tr>
                    <td>${new Date(sermon.date).toLocaleDateString('ar-EG')}</td>
                    <td>${sermon.title}</td>
                    <td>${service}</td>
                    <td class="action-buttons">
                        <button class="action-btn btn-delete" onclick="deleteSermon('${sermon.id}')">حذف</button>
                    </td>
                </tr>
            `;
        }
        
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        console.error('خطأ:', error);
    }
}

async function deleteSermon(sermonId) {
    if (confirm('هل أنت متأكد من حذف هذه الوعظة؟')) {
        try {
            const { error } = await supabaseClient
                .from('sermons')
                .delete()
                .eq('id', sermonId);

            if (error) throw error;
            alert('تم حذف الوعظة');
            await loadSermons();
        } catch (error) {
            alert('خطأ: ' + error.message);
        }
    }
}

function openAddSermonModal() {
    document.getElementById('add-sermon-form').reset();
    openModal('add-sermon-modal');
}

document.getElementById('add-sermon-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const date = document.getElementById('sermon-date').value;
    const title = document.getElementById('sermon-title').value;
    const serviceId = document.getElementById('sermon-service').value;
    const content = document.getElementById('sermon-content').value;

    const result = await createSermon(date, title, content, serviceId || null);
    
    if (result.success) {
        alert('تم إضافة الوعظة بنجاح');
        closeModal('add-sermon-modal');
        await loadSermons();
    } else {
        alert('خطأ: ' + result.message);
    }
});

async function loadExams() {
    try {
        const result = await getExams();
        const container = document.getElementById('exams-list');

        if (!result.success || result.data.length === 0) {
            container.innerHTML = '<p>لا توجد امتحانات حالياً</p>';
            return;
        }

        let html = '<table class="admin-table"><thead><tr><th>العنوان</th><th>الخدمة</th><th>الأسئلة</th><th>الإجراء</th></tr></thead><tbody>';
        
        for (let exam of result.data) {
            const questions = Array.isArray(exam.questions) ? exam.questions.length : 0;
            const service = exam.service_id ? `خدمة #${exam.service_id}` : 'عامة';
            html += `
                <tr>
                    <td>${exam.title}</td>
                    <td>${service}</td>
                    <td>${questions}</td>
                    <td class="action-buttons">
                        <button class="action-btn btn-edit" onclick="viewExamAnswers('${exam.id}')">النتائج</button>
                        <button class="action-btn btn-delete" onclick="deleteExam('${exam.id}')">حذف</button>
                    </td>
                </tr>
            `;
        }
        
        html += '</tbody></table>';
        container.innerHTML = html;

        // تحديث قائمة الامتحانات للشهادات
        const certExamSelect = document.getElementById('certificate-exam');
        if (certExamSelect) {
            certExamSelect.innerHTML = '<option value="">اختر امتحان</option>' + 
                result.data.map(e => `<option value="${e.id}">${e.title}</option>`).join('');
        }
    } catch (error) {
        console.error('خطأ:', error);
    }
}

async function viewExamAnswers(examId) {
    try {
        const { data: answers } = await supabaseClient
            .from('exam_answers')
            .select(`
                *,
                users:user_id(name, phone)
            `)
            .eq('exam_id', examId);

        if (!answers || answers.length === 0) {
            alert('لا توجد إجابات لهذا الامتحان');
            return;
        }

        let html = '<h3>النتائج</h3>';
        html += '<table class="admin-table"><thead><tr><th>اسم المستخدم</th><th>الهاتف</th><th>الدرجة</th><th>التاريخ</th></tr></thead><tbody>';
        
        answers.forEach(answer => {
            const userName = answer.users?.name || 'غير معروف';
            const userPhone = answer.users?.phone || 'غير معروف';
            const score = answer.score || 'لم يتم التقييم';
            const date = new Date(answer.submitted_at).toLocaleDateString('ar-EG');
            
            html += `
                <tr>
                    <td>${userName}</td>
                    <td>${userPhone}</td>
                    <td>${score}</td>
                    <td>${date}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';

        alert('جاري تحديث الشاشة...');
        // يمكن فتح modal لعرض النتائج
    } catch (error) {
        console.error('خطأ:', error);
    }
}

async function deleteExam(examId) {
    if (confirm('هل أنت متأكد من حذف هذا الامتحان؟')) {
        try {
            const { error } = await supabaseClient
                .from('exams')
                .delete()
                .eq('id', examId);

            if (error) throw error;
            alert('تم حذف الامتحان');
            await loadExams();
        } catch (error) {
            alert('خطأ: ' + error.message);
        }
    }
}

function openAddExamModal() {
    document.getElementById('add-exam-form').reset();
    openModal('add-exam-modal');
}

document.getElementById('add-exam-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('exam-title').value;
    const description = document.getElementById('exam-description').value;
    const serviceId = document.getElementById('exam-service').value;
    const questionsText = document.getElementById('exam-questions').value;

    try {
        const questions = JSON.parse(questionsText);
        const result = await createExam(title, description, serviceId || null, questions);
        
        if (result.success) {
            alert('تم إضافة الامتحان بنجاح');
            closeModal('add-exam-modal');
            await loadExams();
        } else {
            alert('خطأ: ' + result.message);
        }
    } catch (error) {
        alert('خطأ في صيغة الأسئلة: ' + error.message);
    }
});

async function loadCertificates() {
    try {
        const result = await getServices();
        const container = document.getElementById('certificates-list');

        if (!result.success || result.data.length === 0) {
            container.innerHTML = '<p>لا توجد شهادات حالياً</p>';
            return;
        }

        let html = '<table class="admin-table"><thead><tr><th>الخدمة/الامتحان</th><th>الإجراء</th></tr></thead><tbody>';
        
        result.data.forEach(service => {
            html += `
                <tr>
                    <td>${service.name}</td>
                    <td class="action-buttons">
                        <button class="action-btn btn-edit">تحديث</button>
                        <button class="action-btn btn-delete">حذف</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        console.error('خطأ:', error);
    }
}

function openAddCertificateModal() {
    document.getElementById('add-certificate-form').reset();
    openModal('add-certificate-modal');
}

document.getElementById('add-certificate-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const examId = document.getElementById('certificate-exam').value;
    const imageFile = document.getElementById('certificate-image').files[0];

    if (!imageFile) {
        alert('الرجاء اختيار صورة');
        return;
    }

    const result = await uploadCertificateTemplate(imageFile);
    
    if (result.success) {
        await saveCertificateTemplate(examId, result.fileName);
        alert('تم تحميل نموذج الشهادة بنجاح');
        closeModal('add-certificate-modal');
        await loadCertificates();
    } else {
        alert('خطأ: ' + result.message);
    }
});

async function loadAdmins() {
    try {
        const { data: admins } = await supabaseClient
            .from('users')
            .select('*')
            .eq('role', 'admin');

        const { data: nonAdmins } = await supabaseClient
            .from('users')
            .select('*')
            .neq('role', 'admin')
            .eq('status', 'active');

        const adminsList = document.getElementById('admins-list');
        const nonAdminsList = document.getElementById('non-admins-list');

        if (admins && admins.length > 0) {
            adminsList.innerHTML = admins.map(admin => `
                <tr>
                    <td>${admin.name}</td>
                    <td>${admin.phone}</td>
                    <td class="action-buttons">
                        <button class="action-btn btn-delete" onclick="removeAdmin('${admin.id}')">إزالة</button>
                    </td>
                </tr>
            `).join('');
        } else {
            adminsList.innerHTML = '<tr><td colspan="3">لا يوجد أدمن آخرين</td></tr>';
        }

        if (nonAdmins && nonAdmins.length > 0) {
            nonAdminsList.innerHTML = nonAdmins.map(user => `
                <tr>
                    <td>${user.name}</td>
                    <td>${user.phone}</td>
                    <td class="action-buttons">
                        <button class="action-btn btn-accept" onclick="makeAdmin('${user.id}')">تعيين أدمن</button>
                    </td>
                </tr>
            `).join('');
        } else {
            nonAdminsList.innerHTML = '<tr><td colspan="3">جميع المستخدمين النشطين هم بالفعل أدمن</td></tr>';
        }
    } catch (error) {
        console.error('خطأ:', error);
    }
}

async function makeAdmin(userId) {
    if (confirm('هل أنت متأكد من تعيين هذا المستخدم كأدمن؟')) {
        try {
            const { error } = await supabase
                .from('users')
                .update({ role: 'admin' })
                .eq('id', userId);

            if (error) throw error;
            alert('تم التعيين بنجاح');
            await loadAdmins();
        } catch (error) {
            alert('خطأ: ' + error.message);
        }
    }
}

async function removeAdmin(userId) {
    if (confirm('هل أنت متأكد من إزالة صلاحيات الأدمن؟')) {
        try {
            const { error } = await supabase
                .from('users')
                .update({ role: 'user' })
                .eq('id', userId);

            if (error) throw error;
            alert('تم الإزالة');
            await loadAdmins();
        } catch (error) {
            alert('خطأ: ' + error.message);
        }
    }
}

function switchSection(sectionId) {
    // إخفاء جميع الأقسام
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // إظهار القسم المختار
    document.getElementById(sectionId).classList.add('active');

    // تحديث الروابط النشطة
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');

    // تحميل البيانات بناءً على القسم
    if (sectionId === 'users') {
        loadPendingUsers();
    } else if (sectionId === 'services') {
        loadServices();
    } else if (sectionId === 'sermons') {
        loadSermons();
    } else if (sectionId === 'exams') {
        loadExams();
    } else if (sectionId === 'certificates') {
        loadCertificates();
    } else if (sectionId === 'admins') {
        loadAdmins();
    }
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// إغلاق الـ modal عند الضغط خارجه
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});

async function logoutAdmin() {
    const result = await logoutUser();
    if (result.success) {
        window.location.href = '../pages/login.html';
    }
}
