// Code Spark Frontend Test Suite for YouTube Player & Subscription Code System
const fs = require('fs');
const path = require('path');

// 1. Mock Environment
class MockStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] !== undefined ? this.store[k] : null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
  clear() { this.store = {}; }
}

global.window = global;
global.window.addEventListener = () => {};
global.document = { querySelectorAll: () => [], getElementById: () => null, createElement: () => ({}) };
global.localStorage = new MockStorage();
global.sessionStorage = new MockStorage();
global.navigator = { onLine: true, clipboard: { writeText: async () => {} } };
global.location = { hash: '#dashboard', origin: 'http://localhost:8000' };
global.window.CODESPARK_API_URL = 'http://localhost:8000/api';
global.fetch = async () => ({ ok: true, json: async () => ({}) });

// Load code files in dependency order
require('./js/components/icons.js');
require('./js/api.js');
require('./js/services/authService.js');
require('./js/services/adminService.js');
require('./js/services/curriculumService.js');
require('./js/services/progressService.js');
require('./js/services/quizService.js');
require('./js/services/questionService.js');
require('./js/services/examService.js');
require('./js/services/announcementService.js');
require('./js/services/supportService.js');
require('./js/services/studentService.js');
require('./js/auth.js');
require('./js/db.js');
require('./js/views/authViews.js');
require('./js/views/adminViews.js');
require('./js/views/studentDashboardView.js');
require('./js/views/lessonView.js');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  passedTests++;
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log("=== STARTING FRONTEND UNIT & INTEGRATION TESTS ===");

  // Test 1: Icons library includes key icon
  assert(typeof Icons.key === 'function', "Icons library defines key icon function");
  assert(Icons.key().includes("<svg"), "Icons.key returns valid SVG markup");

  // Test 2: Registration View renders required Subscription Code
  const regHtml = AuthViews.renderRegister();
  assert(regHtml.includes('id="reg-code"'), "Register view contains subscription code input field");
  assert(regHtml.includes('CS-8F4K-29XM'), "Register view displays placeholder CS-8F4K-29XM");
  assert(regHtml.includes('كود تفعيل الاشتراك مطلوب'), "Register view provides clear Arabic explanation that code is required");
  assert(!regHtml.includes('(إن وجد)'), "Register view no longer marks subscription code as optional");

  // Test 3: Admin Subscriptions View rendering
  const subsHtml = await AdminViews.renderSubscriptions();
  assert(subsHtml.includes('أكواد تفعيل اشتراكات الطلاب'), "Admin subscriptions page renders main heading");
  assert(subsHtml.includes('id="sub-stat-total"'), "Admin dashboard contains Total Codes stat");
  assert(subsHtml.includes('id="sub-stat-available"'), "Admin dashboard contains Available Codes stat");
  assert(subsHtml.includes('id="sub-stat-used"'), "Admin dashboard contains Used Codes stat");
  assert(subsHtml.includes('id="sub-stat-expired"'), "Admin dashboard contains Expired Codes stat");
  assert(subsHtml.includes('id="sub-stat-disabled"'), "Admin dashboard contains Disabled Codes stat");
  assert(subsHtml.includes('id="generate-single-code-btn"'), "Admin dashboard contains single code generate button");
  assert(subsHtml.includes('id="generate-bulk-codes-btn"'), "Admin dashboard contains bulk codes generate button");
  assert(subsHtml.includes('id="sub-search-input"'), "Admin subscriptions table contains search input");
  assert(subsHtml.includes('id="sub-filter-status"'), "Admin subscriptions table contains status filter");
  assert(subsHtml.includes('id="sub-filter-type"'), "Admin subscriptions table contains duration type filter");
  assert(subsHtml.includes('id="generate-sub-modal"'), "Admin view contains generate codes modal");
  assert(subsHtml.includes('id="display-generated-modal"'), "Admin view contains one-time plain code display modal");
  assert(subsHtml.includes('id="view-code-modal"'), "Admin view contains code details view modal");

  // Test 4: Subscriptions Table Rows generator
  const sampleCodes = [
    {
      id: "sub_1",
      masked_code: "CS-8F4K-****",
      code_prefix: "CS-8F4K",
      status: "active",
      type_label: "شهر واحد (30 يوم)",
      duration_days: 30,
      assigned_user_name: null,
      assigned_user_phone: null,
      created_at: "2026-08-28T12:00:00Z",
      activated_at: null,
      expires_at: null,
      uses_count: 0,
      max_uses: 1
    },
    {
      id: "sub_2",
      masked_code: "CS-LIFE-****",
      code_prefix: "CS-LIFE",
      status: "used",
      type_label: "اشتراك مدى الحياة",
      duration_days: -1,
      assigned_user_name: "أحمد محمد الشناوي",
      assigned_user_phone: "01012345678",
      created_at: "2026-08-28T12:00:00Z",
      activated_at: "2026-08-28T12:05:00Z",
      expires_at: null,
      uses_count: 1,
      max_uses: 1,
      assigned_user_id: "student_1"
    }
  ];
  const tableRowsHtml = AdminViews.renderSubscriptionsTableRows(sampleCodes);
  assert(tableRowsHtml.includes("CS-8F4K-****"), "Table renders masked active code");
  assert(tableRowsHtml.includes("متاح للتفعيل"), "Table renders active status badge");
  assert(tableRowsHtml.includes("أحمد محمد الشناوي"), "Table renders assigned student name for redeemed code");
  assert(tableRowsHtml.includes("مدى الحياة ♾️"), "Table renders lifetime badge");

  // Test 5: Student Dashboard Subscription Widget
  const activeStudent = {
    id: "student_1",
    name: "أحمد محمد",
    grade: "الصف الأول الثانوي",
    subscription_status: "active",
    subscription_start: "2026-08-01T00:00:00Z",
    subscription_expires_at: "2026-09-01T00:00:00Z",
    subscription_duration_days: 30,
    days_remaining: 15,
    subscription_plan_label: "اشتراك شهر واحد (30 يوم)"
  };
  const dashActiveHtml = StudentDashboardView.render(activeStudent);
  assert(dashActiveHtml.includes("حالة الاشتراك الأكاديمي"), "Student dashboard contains subscription card");
  assert(dashActiveHtml.includes("🟢 اشتراك نشط"), "Student dashboard shows active badge");
  assert(dashActiveHtml.includes("متبقي 15 يومًا"), "Student dashboard shows days remaining");

  // Test 6: Student Dashboard Lifetime Subscription Widget
  const lifetimeStudent = {
    id: "student_2",
    name: "كريم يوسف",
    grade: "الصف الثاني الثانوي",
    subscription_status: "active",
    is_lifetime: true,
    subscription_duration_days: -1,
    days_remaining: -1
  };
  const dashLifetimeHtml = StudentDashboardView.render(lifetimeStudent);
  assert(dashLifetimeHtml.includes("اشتراك مدى الحياة ♾️") || dashLifetimeHtml.includes("اشتراك مدى الحياة"), "Student dashboard shows 'اشتراك مدى الحياة'");

  // Test 7: Student Dashboard Expired Subscription Notice
  const expiredStudent = {
    id: "student_3",
    name: "سارة إبراهيم",
    grade: "الصف الأول الثانوي",
    subscription_status: "expired",
    days_remaining: 0
  };
  const dashExpiredHtml = StudentDashboardView.render(expiredStudent);
  assert(dashExpiredHtml.includes("انتهى اشتراكك، يرجى تجديد الاشتراك."), "Student dashboard renders prominent expired subscription alert banner");
  assert(dashExpiredHtml.includes("🔴 منتهي الصلاحية"), "Student dashboard renders expired badge");

  // Test 8: Improved YouTube Video Player inside Lesson View
  // Seed a lesson with YouTube video in CodeSparkDB
  CodeSparkDB.save({
    lessons: [{
      id: "lesson_yt_test",
      unitId: "unit_1",
      title: "درس يوتيوب التفاعلي",
      description: "شرح شامل للبرمجة بلغة بايثون",
      duration: "20 دقيقة",
      videoSource: "youtube",
      video_source: "youtube",
      videoUrl: "https://www.youtube.com/watch?v=kqtD5dpn9C8",
      video_url: "https://www.youtube.com/watch?v=kqtD5dpn9C8",
      videoId: "kqtD5dpn9C8",
      lastPosition: 120
    }],
    units: [{ id: "unit_1", title: "الوحدة الأولى: أساسيات بايثون" }],
    studentProgress: { completedLessons: [] },
    questions: []
  });

  const lessonYtHtml = LessonView.render("lesson_yt_test", activeStudent);
  assert(lessonYtHtml.includes('id="lesson-youtube-iframe"'), "Lesson view renders YouTube iframe element");
  assert(lessonYtHtml.includes('youtube-nocookie.com/embed/kqtD5dpn9C8'), "YouTube iframe uses privacy-enhanced nocookie embed");
  assert(lessonYtHtml.includes('id="yt-custom-play-btn"'), "Lesson view contains custom Play/Pause control button");
  assert(lessonYtHtml.includes('id="yt-custom-mute-btn"'), "Lesson view contains custom Mute/Unmute audio control");
  assert(lessonYtHtml.includes('id="yt-volume-slider"'), "Lesson view contains volume slider control");
  assert(lessonYtHtml.includes('id="yt-time-display"'), "Lesson view contains formatted time scrubber display");
  assert(lessonYtHtml.includes('id="yt-fullscreen-btn"'), "Lesson view contains Fullscreen toggle button");
  assert(lessonYtHtml.includes('responsive-video-wrapper'), "Lesson view uses responsive 16:9 video wrapper container");
  
  // Verify NO clickable links or "Watch on YouTube" buttons
  assert(!lessonYtHtml.includes('href="https://www.youtube.com'), "No clickable raw YouTube links rendered in DOM");
  assert(!lessonYtHtml.includes('Watch on YouTube'), "No external 'Watch on YouTube' button rendered");

  // Test 9: Uploaded Direct MP4 Video Player inside Lesson View (Non-breaking regression test)
  CodeSparkDB.save({
    lessons: [{
      id: "lesson_upload_test",
      unitId: "unit_1",
      title: "درس فيديو مرفوع محليًا",
      description: "فيديو مباشر MP4",
      duration: "15 دقيقة",
      videoSource: "upload",
      video_source: "upload",
      videoUrl: "/storage/videos/lessons/test_video.mp4",
      video_url: "/storage/videos/lessons/test_video.mp4",
      mimeType: "video/mp4"
    }],
    units: [{ id: "unit_1", title: "الوحدة الأولى: أساسيات بايثون" }],
    studentProgress: { completedLessons: [] },
    questions: []
  });

  const lessonUploadHtml = LessonView.render("lesson_upload_test", activeStudent);
  assert(lessonUploadHtml.includes('id="lesson-html5-player"'), "Lesson view preserves HTML5 direct video player for uploaded videos");
  assert(lessonUploadHtml.includes('<source src="/storage/videos/lessons/test_video.mp4"'), "HTML5 video source tag rendered properly");
  assert(lessonUploadHtml.includes('id="html5-playback-badge"'), "HTML5 video position badge preserved");

  console.log(`\n=== ALL FRONTEND TESTS PASSED (${passedTests}/${totalTests}) ===`);
}

runTests().catch(err => {
  console.error("Frontend Tests Encountered Failure:", err);
  process.exit(1);
});
