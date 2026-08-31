// Code Spark Test Suite for Router, Admin Layout & Mode Isolation
const fs = require('fs');
const path = require('path');

class MockStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] !== undefined ? this.store[k] : null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
  clear() { this.store = {}; }
}

class MockElement {
  constructor(id = '', tag = 'DIV') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.innerHTML = '';
    this.textContent = '';
    this.style = {};
    this._classes = new Set();
    this.classList = {
      add: (...cls) => cls.forEach(c => this._classes.add(c)),
      remove: (...cls) => cls.forEach(c => this._classes.delete(c)),
      toggle: (c, val) => {
        if (val === undefined) {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        } else if (val) this._classes.add(c);
        else this._classes.delete(c);
      },
      contains: (c) => this._classes.has(c)
    };
    this.children = [];
    this.attributes = {};
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
  addEventListener() {}
  reset() {}
  remove() {}
  appendChild(child) { this.children.push(child); }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) this.children.splice(idx, 1);
  }
}

const mockAppRoot = new MockElement('app', 'DIV');
const mockCanvas = new MockElement('code-spark-bg-canvas', 'CANVAS');
const mockToast = new MockElement('toast-container', 'DIV');

const elementsMap = {
  'app': mockAppRoot,
  'code-spark-bg-canvas': mockCanvas,
  'toast-container': mockToast
};

global.window = global;
global.window.addEventListener = () => {};
global.window.scrollTo = () => {};
global.window.matchMedia = (query) => ({ matches: false, addEventListener: () => {} });

global.document = {
  body: new MockElement('body', 'BODY'),
  getElementById: (id) => elementsMap[id] || new MockElement(id),
  querySelectorAll: () => [],
  getElementsByTagName: () => [],
  createElement: (tag) => new MockElement('', tag)
};

global.localStorage = new MockStorage();
global.sessionStorage = new MockStorage();
global.navigator = { onLine: true, clipboard: { writeText: async () => {} } };
global.location = { hash: '#landing', origin: 'http://localhost:8000' };
global.window.CODESPARK_API_URL = 'http://localhost:8000/api';
global.fetch = async () => ({ ok: true, json: async () => ({}) });

// Load project scripts
require('./js/components/icons.js');
require('./js/sound.js');
require('./js/background.js');
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
require('./js/views/landingView.js');
require('./js/views/authViews.js');
require('./js/views/adminViews.js');
require('./js/views/studentDashboardView.js');
require('./js/views/curriculumView.js');
require('./js/views/unitDetailsView.js');
require('./js/views/lessonView.js');
require('./js/views/practiceView.js');
require('./js/views/exercisesView.js');
require('./js/views/progressView.js');
require('./js/views/userViews.js');
require('./js/router.js');

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

async function runRouterTestSuite() {
  console.log("=== STARTING ROUTER & ADMIN LAYOUT INTEGRATION TESTS ===");

  // Check 1: Canvas CSS fixed styling in main.css and inline in index.html
  const mainCss = fs.readFileSync(path.join(__dirname, 'css/main.css'), 'utf-8');
  const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
  
  assert(indexHtml.includes('id="code-spark-bg-canvas"'), "index.html defines canvas element");
  assert(indexHtml.includes('position:fixed'), "index.html defines inline fixed position for canvas");
  assert(mainCss.includes('#code-spark-bg-canvas'), "css/main.css defines #code-spark-bg-canvas rules");
  assert(mainCss.includes('position: fixed !important;'), "css/main.css enforces fixed position for canvas background");
  assert(mainCss.includes('body.admin-mode #code-spark-bg-canvas'), "css/main.css hides canvas in admin mode");
  assert(mainCss.includes('body.admin-mode'), "css/main.css contains body.admin-mode state class");
  assert(mainCss.includes('body.student-mode'), "css/main.css contains body.student-mode state class");
  assert(mainCss.includes('body.public-mode'), "css/main.css contains body.public-mode state class");

  // Check 2: Mock Admin User
  const adminUser = {
    id: "admin_1",
    name: "الأستاذ المشرف",
    role: "admin",
    avatar: "مش"
  };

  // Mock Student User
  const studentUser = {
    id: "student_1",
    name: "محمد علي",
    role: "student",
    grade: "الصف الأول الثانوي",
    subscription_status: "active",
    days_remaining: 30
  };

  // Check 3: Public Route '#landing'
  window.location.hash = '#landing';
  window.CodeSparkAuth.getCurrentUser = () => null;
  await window.CodeSparkRouter.handleRoute();

  assert(document.body.classList.contains('public-mode'), "Body has 'public-mode' on #landing");
  assert(!document.body.classList.contains('admin-mode'), "Body does NOT have 'admin-mode' on #landing");
  assert(!document.body.classList.contains('student-mode'), "Body does NOT have 'student-mode' on #landing");
  assert(mockAppRoot.innerHTML.includes('public-layout'), "#app contains public-layout on #landing");
  assert(mockAppRoot.innerHTML.includes('hero-grid') || mockAppRoot.innerHTML.includes('اتعلم البرمجة'), "#app contains landing content");

  // Check 4: Admin Guard blocks student from #admin-students
  window.location.hash = '#admin-students';
  window.CodeSparkAuth.getCurrentUser = () => studentUser;
  await window.CodeSparkRouter.handleRoute();
  assert(window.location.hash === '#dashboard', "Admin guard redirects non-admin user to #dashboard");

  // Check 5: Admin routes rendered with admin user
  window.CodeSparkAuth.getCurrentUser = () => adminUser;

  const adminRoutes = [
    { hash: '#admin-dashboard', title: 'الإحصائيات العامة' },
    { hash: '#admin-students', title: 'إدارة طلاب مادة البرمجة' },
    { hash: '#admin-subscriptions', title: 'أكواد تفعيل اشتراكات الطلاب' },
    { hash: '#admin-curriculum', title: 'إدارة الوحدات والدروس' },
    { hash: '#admin-questions', title: 'بنك أسئلة المرحلة الثانوية' },
    { hash: '#admin-exams', title: 'إدارة الاختبارات والامتحانات' },
    { hash: '#admin-results', title: 'سجل نتائج وتقييمات الطلاب' },
    { hash: '#admin-announcements', title: 'الإعلانات والتنبيهات العامة' },
    { hash: '#admin-support', title: 'تذاكر الدعم الفني والاستفسارات' },
    { hash: '#admin-settings', title: 'إعدادات المنصة والحساب' }
  ];

  for (const r of adminRoutes) {
    window.location.hash = r.hash;
    await window.CodeSparkRouter.handleRoute();

    assert(document.body.classList.contains('admin-mode'), `Body has 'admin-mode' on ${r.hash}`);
    assert(!document.body.classList.contains('student-mode'), `Body does not have 'student-mode' on ${r.hash}`);
    assert(!document.body.classList.contains('public-mode'), `Body does not have 'public-mode' on ${r.hash}`);
    assert(mockCanvas.style.display === 'none', `Canvas is disabled/hidden on ${r.hash}`);
    assert(mockAppRoot.innerHTML.includes('app-container'), `${r.hash} renders .app-container`);
    assert(mockAppRoot.innerHTML.includes('app-sidebar'), `${r.hash} renders .app-sidebar`);
    assert(mockAppRoot.innerHTML.includes('dashboard-topbar'), `${r.hash} renders .dashboard-topbar`);
    assert(mockAppRoot.innerHTML.includes('لوحة إدارة منصة'), `${r.hash} renders admin topbar heading`);
    assert(mockAppRoot.innerHTML.includes('عرض المنصة كطالب'), `${r.hash} renders switch-to-student button`);
    assert(!mockAppRoot.innerHTML.includes('public-layout'), `${r.hash} strictly does NOT contain public-layout`);
    assert(!mockAppRoot.innerHTML.includes('hero-grid'), `${r.hash} strictly does NOT contain hero-grid`);
  }

  // Check 6: Specifically verify #admin-students details
  window.location.hash = '#admin-students';
  await window.CodeSparkRouter.handleRoute();
  assert(mockAppRoot.innerHTML.includes('إدارة طلاب مادة البرمجة'), "#admin-students renders student management title");
  assert(mockAppRoot.innerHTML.includes('id="add-student-btn"'), "#admin-students contains add student button");
  assert(mockAppRoot.innerHTML.includes('id="students-table-body"'), "#admin-students contains students table body");
  assert(mockAppRoot.innerHTML.includes('id="close-sidebar-btn"'), "#admin-students contains responsive mobile close sidebar button");

  // Check 7: Transitioning from Admin to Student Dashboard
  window.location.hash = '#dashboard';
  window.CodeSparkAuth.getCurrentUser = () => studentUser;
  await window.CodeSparkRouter.handleRoute();

  assert(document.body.classList.contains('student-mode'), "Body has 'student-mode' on #dashboard");
  assert(!document.body.classList.contains('admin-mode'), "Body does NOT have 'admin-mode' on #dashboard");
  assert(!document.body.classList.contains('public-mode'), "Body does NOT have 'public-mode' on #dashboard");
  assert(mockCanvas.style.display === 'block', "Canvas is restored/visible on #dashboard");
  assert(mockAppRoot.innerHTML.includes('app-sidebar'), "Student dashboard contains student sidebar");
  assert(mockAppRoot.innerHTML.includes('mobile-bottom-nav'), "Student layout includes mobile-bottom-nav");
  assert(!mockAppRoot.innerHTML.includes('public-layout'), "Student layout does NOT contain public-layout");

  // Check 8: Transitioning back to #landing
  window.location.hash = '#landing';
  window.CodeSparkAuth.getCurrentUser = () => null;
  await window.CodeSparkRouter.handleRoute();

  assert(document.body.classList.contains('public-mode'), "Body has 'public-mode' on return to #landing");
  assert(!document.body.classList.contains('admin-mode'), "Body does NOT have 'admin-mode' on return to #landing");
  assert(mockCanvas.style.display === 'block', "Canvas is restored/visible on #landing");
  assert(mockAppRoot.innerHTML.includes('public-layout'), "#app contains public-layout on return to #landing");
  assert(!mockAppRoot.innerHTML.includes('app-sidebar'), "#landing does NOT contain sidebar");

  console.log(`\n=== ALL ROUTER & ADMIN LAYOUT TESTS PASSED (${passedTests}/${totalTests}) ===`);
}

runRouterTestSuite().catch(err => {
  console.error("Router Test Suite Error:", err);
  process.exit(1);
});
