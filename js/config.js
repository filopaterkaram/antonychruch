// ==================================================
// Supabase Config (FULL & SAFE VERSION)
// ==================================================

var supabaseClient = null;
var CONFIG_INITIALIZED = false;
var SUPABASE_INIT_ERROR = null;

const SUPABASE_URL = 'https://rzaexydvjdsylctdrhfc.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWV4eWR2amRzeWxjdGRyaGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDMzNDksImV4cCI6MjA4NDMxOTM0OX0.olUNzzq7z6fdgkxXqU030CtMeAe88_JZoQ_7tiWmLGw';

// ==================================================
// Initialize Supabase
// ==================================================
if (!CONFIG_INITIALIZED) {
  if (typeof window === 'undefined') {
    SUPABASE_INIT_ERROR = 'Window object غير متاح';
  } else if (!window.supabase) {
    SUPABASE_INIT_ERROR =
      'مكتبة Supabase لم تحمل من CDN';
  } else {
    try {
      supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      );
      console.log('✅ Supabase Client Ready');
    } catch (e) {
      SUPABASE_INIT_ERROR = e.message;
      supabaseClient = null;
    }
  }
  CONFIG_INITIALIZED = true;
}

// ==================================================
// Helper
// ==================================================
function checkSupabaseConnection() {
  if (!supabaseClient) {
    return {
      success: false,
      message:
        '❌ Supabase غير متصل\n' +
        (SUPABASE_INIT_ERROR || ''),
    };
  }
  return { success: true };
}

// ==================================================
// DEBUG - لعرض البيانات الفعلية من قاعدة البيانات
// ==================================================
async function debugDatabase() {
  console.clear();
  console.log('🔍 بدء فحص قاعدة البيانات...\n');

  const tables = [
    'users',
    'services',
    'sermons',
    'exams',
    'exam_answers',
    'certificates',
  ];

  for (const table of tables) {
    try {
      const { data, error } =
        await supabaseClient
          .from(table)
          .select('*')
          .limit(1);

      console.group(`📋 جدول: ${table}`);
      if (error) {
        console.error('❌ خطأ:', error.message);
      } else if (data && data.length > 0) {
        console.log(
          '✅ الأعمدة الموجودة:',
          Object.keys(data[0])
        );
        console.log('📊 أول صف:', data[0]);
      } else {
        console.log('⚠️ لا توجد بيانات في الجدول');
      }
      console.groupEnd();
    } catch (e) {
      console.error(`❌ خطأ في ${table}:`, e.message);
    }
  }

  console.log(
    '\n✅ انتهى الفحص - انسخ المعلومات أعلاه'
  );
}

// ضع هذا في Console لتشغيل الفحص:
// debugDatabase()


// ==================================================
// AUTH
// ==================================================
async function registerUser(userData) {
  const check = checkSupabaseConnection();
  if (!check.success) return check;

  try {
    // 1️⃣ إنشاء حساب في Auth
    const { data, error } =
      await supabaseClient.auth.signUp({
        email: userData.email,
        password: userData.password,
      });
    if (error) throw error;

    console.log('✅ حساب Auth تم إنشاؤه:', data.user.id);

    // 2️⃣ إدراج البيانات في جدول users
    const { error: dbError } =
      await supabaseClient.from('users').insert([
        {
          id: data.user.id,
          name: userData.name || 'مستخدم جديد',
          email: userData.email,
          phone: userData.phone && userData.phone.trim() !== '' ? userData.phone : null,
          is_church_member: userData.is_church_member || false,
          status: 'pending',
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

    if (dbError) {
      console.error('❌ خطأ في إدراج البيانات:', dbError);
      throw dbError;
    }

    console.log('✅ البيانات تم إدراجها بنجاح');

    return {
      success: true,
      message:
        'تم إنشاء الحساب، في انتظار موافقة الإدارة',
    };
  } catch (e) {
    console.error('❌ خطأ في التسجيل:', e);
    return { success: false, message: e.message };
  }
}

async function loginUser(email, password) {
  const check = checkSupabaseConnection();
  if (!check.success) return check;

  try {
    // 1️⃣ تسجيل الدخول
    const { data, error } =
      await supabaseClient.auth.signInWithPassword(
        { email, password }
      );
    if (error) throw error;

    console.log('✅ تم تسجيل الدخول:', data.user.id);

    // 2️⃣ جلب بيانات المستخدم من الجدول
    const { data: users, error: userErr } =
      await supabaseClient
        .from('users')
        .select('id, name, email, phone, role, status, created_at')
        .eq('id', data.user.id);

    if (userErr) {
      console.error('❌ خطأ في جلب بيانات المستخدم:', userErr);
      throw userErr;
    }

    // التحقق من وجود المستخدم في الجدول
    if (!users || users.length === 0) {
      console.warn('⚠️ المستخدم موجود في Auth لكن ليس في جدول users');
      
      // استخدام البيانات من auth.user بدلاً من الإنشاء التلقائي
      const user = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || 'مستخدم جديد',
        phone: data.user.user_metadata?.phone || null,
        status: 'pending', // انتظر الموافقة من الأدمن
        role: 'user',
        created_at: new Date().toISOString(),
      };
      
      console.log('✅ بيانات المستخدم (من Auth):', user);

      // حفظ البيانات
      localStorage.setItem(
        'currentUser',
        JSON.stringify(user)
      );
      localStorage.setItem(
        'authToken',
        data.session.access_token
      );

      return { success: true, user };
    }

    const user = users[0];
    console.log('✅ بيانات المستخدم:', user);

    // 3️⃣ التحقق من الحالة
    if (user.status !== 'active') {
      await supabaseClient.auth.signOut();
      return {
        success: false,
        message:
          user.status === 'pending'
            ? 'حسابك قيد المراجعة'
            : 'تم رفض حسابك',
      };
    }

    // 4️⃣ حفظ البيانات
    localStorage.setItem(
      'currentUser',
      JSON.stringify(user)
    );
    localStorage.setItem(
      'authToken',
      data.session.access_token
    );

    return { success: true, user };
  } catch (e) {
    console.error('❌ خطأ في تسجيل الدخول:', e);
    return { success: false, message: e.message };
  }
}

async function logoutUser() {
  await supabaseClient.auth.signOut();
  localStorage.clear();
  return { success: true };
}

function getCurrentUser() {
  const u = localStorage.getItem('currentUser');
  const user = u ? JSON.parse(u) : null;
  console.log('👤 المستخدم الحالي:', user);
  return user;
}

// ==================================================
// DEBUG - عرض بيانات المستخدم
// ==================================================
function debugUser() {
  const user = getCurrentUser();
  if (!user) {
    console.log('❌ لا يوجد مستخدم مسجل دخول');
    return;
  }
  
  console.group('👤 بيانات المستخدم');
  console.log('الاسم:', user.name);
  console.log('البريد:', user.email);
  console.log('الهاتف:', user.phone);
  console.log('الحالة:', user.status);
  console.log('الدور:', user.role);
  console.groupEnd();
}

// ==================================================
// SERVICES
// ==================================================
async function getServices() {
  const { data, error } =
    await supabaseClient
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });

  if (error)
    return { success: false, message: error.message };
  return { success: true, data };
}

async function createService(name, description) {
  const { error } =
    await supabaseClient.from('services').insert([
      {
        name,
        description,
        created_at: new Date().toISOString(),
      },
    ]);

  if (error)
    return { success: false, message: error.message };
  return { success: true };
}

// ==================================================
// SERMONS
// ==================================================
async function getSermons() {
  const { data, error } =
    await supabaseClient
      .from('sermons')
      .select('*')
      .order('date', { ascending: false });

  if (error)
    return { success: false, message: error.message };
  return { success: true, data };
}

// ==================================================
// GET TODAY'S SERMON
// ==================================================
async function getTodaySermon() {
  try {
    const checkConnection = checkSupabaseConnection();
    if (!checkConnection.success) {
      return checkConnection;
    }

    // احصل على تاريخ اليوم بصيغة YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    const { data, error } =
      await supabaseClient
        .from('sermons')
        .select('*')
        .eq('date', today)
        .single();

    if (error) {
      // إذا لم تكن هناك وعظة لهذا اليوم، ليس خطأ
      if (error.code === 'PGRST116' || error.code === 'NO_ROWS_FOUND') {
        return { success: false, data: null };
      }
      return { success: false, message: error.message };
    }

    return { success: true, data };
  } catch (e) {
    console.error('Error fetching today sermon:', e);
    return { success: false, message: e.message };
  }
}

// ==================================================
// EXAMS
// ==================================================
async function getExams() {
  const { data, error } =
    await supabaseClient
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false });

  if (error)
    return { success: false, message: error.message };
  return { success: true, data };
}

// ==================================================
// GET TOP USERS (للإحصائيات)
// ==================================================
async function getTopUsers(limit = 10) {
  const check = checkSupabaseConnection();
  if (!check.success) return check;

  try {
    // جلب جميع الإجابات مع بيانات المستخدم والامتحان
    const { data: answers, error } = await supabaseClient
      .from('exam_answers')
      .select(`
        id,
        score,
        user_id,
        exam_id,
        submitted_at,
        users:user_id(id, name, email),
        exams:exam_id(id, title)
      `)
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ خطأ في جلب أفضل المستخدمين:', error);
      return { success: false, data: [] };
    }

    // تجميع النتائج وحساب متوسط الدرجات
    const userScores = {};
    answers?.forEach(answer => {
      const userId = answer.user_id;
      if (!userScores[userId]) {
        userScores[userId] = {
          id: userId,
          name: answer.users?.name || 'غير معروف',
          email: answer.users?.email || '',
          scores: [],
          count: 0,
          totalScore: 0,
        };
      }
      userScores[userId].scores.push(answer.score || 0);
      userScores[userId].totalScore += answer.score || 0;
      userScores[userId].count += 1;
    });

    // تحويل إلى array وحساب المتوسط
    const topUsers = Object.values(userScores)
      .map((user, index) => ({
        rank: index + 1,
        id: user.id,
        name: user.name,
        email: user.email,
        score: user.count > 0 ? Math.round((user.totalScore / user.count) * 100) / 100 : 0,
        examCount: user.count,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    console.log('✅ أفضل المستخدمين:', topUsers);
    return { success: true, data: topUsers };
  } catch (e) {
    console.error('Error fetching top users:', e);
    return { success: false, message: e.message, data: [] };
  }
}

async function submitExamAnswer(
  examId,
  userId,
  answers
) {
  const { error } =
    await supabaseClient
      .from('exam_answers')
      .insert([
        {
          exam_id: examId,
          user_id: userId,
          answers,
          submitted_at:
            new Date().toISOString(),
        },
      ]);

  if (error)
    return { success: false, message: error.message };
  return { success: true };
}

// ==================================================
// CERTIFICATES
// ==================================================
async function generateCertificate(
  examId,
  userId
) {
  const exam =
    await supabaseClient
      .from('exams')
      .select('title')
      .eq('id', examId)
      .single();

  const user =
    await supabaseClient
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

  const { error } =
    await supabaseClient
      .from('certificates')
      .insert([
        {
          exam_id: examId,
          user_id: userId,
          exam_title: exam.data.title,
          user_name: user.data.name,
          generated_at:
            new Date().toISOString(),
        },
      ]);

  if (error)
    return { success: false, message: error.message };
  return { success: true };
}

async function getCertificates(userId) {
  const { data, error } =
    await supabaseClient
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', {
        ascending: false,
      });

  if (error)
    return { success: false, message: error.message };
  return { success: true, data };
}

// ==================================================
// ADMIN
// ==================================================
async function getPendingUsers() {
  const { data, error } =
    await supabaseClient
      .from('users')
      .select('*')
      .eq('status', 'pending');

  if (error)
    return { success: false, message: error.message };
  return { success: true, data };
}

async function approveUser(userId) {
  const { error } =
    await supabaseClient
      .from('users')
      .update({ status: 'active' })
      .eq('id', userId);

  if (error)
    return { success: false, message: error.message };
  return { success: true };
}

async function updateUserRole(userId, newRole) {
  const check = checkSupabaseConnection();
  if (!check.success) return check;

  try {
    const { error } = await supabaseClient
      .from('users')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('❌ خطأ في تحديث دور المستخدم:', error);
      return { success: false, message: error.message };
    }

    console.log(`✅ تم تحديث دور المستخدم إلى: ${newRole}`);
    return { success: true, message: `تم تحديث الدور إلى ${newRole}` };
  } catch (e) {
    console.error('Error updating user role:', e);
    return { success: false, message: e.message };
  }
}

async function rejectUser(userId) {
  const { error } =
    await supabaseClient
      .from('users')
      .update({ status: 'rejected' })
      .eq('id', userId);

  if (error)
    return { success: false, message: error.message };
  return { success: true };
}

// ==================================================
// Globals
// ==================================================
if (typeof window !== 'undefined') {
  window.supabaseClient = supabaseClient;
  window.CONFIG_LOADED = true;
}
