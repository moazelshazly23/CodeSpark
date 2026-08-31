// Code Spark Comprehensive UI/UX Upgrade Verification Test Suite
const fs = require('fs');

class MockStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] !== undefined ? this.store[k] : null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
  clear() { this.store = {}; }
}

global.window = global;
global.window.addEventListener = () => {};
global.window.matchMedia = (query) => ({
  matches: false,
  addEventListener: () => {}
});
global.document = {
  querySelectorAll: () => [],
  getElementById: () => null,
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    setAttribute: () => {},
    getAttribute: () => null,
    addEventListener: () => {},
    getContext: () => ({
      scale: () => {},
      clearRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillText: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {}
    })
  }),
  body: {
    insertBefore: () => {},
    appendChild: () => {}
  }
};
global.localStorage = new MockStorage();
global.sessionStorage = new MockStorage();
global.navigator = { onLine: true, clipboard: { writeText: async () => {} } };
global.location = { hash: '#dashboard', origin: 'http://localhost:8000' };
global.window.CODESPARK_API_URL = 'http://localhost:8000/api';

// Mock Web Audio API
global.window.AudioContext = class {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = {};
  }
  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: () => {},
      start: () => {},
      stop: () => {}
    };
  }
  createGain() {
    return {
      gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: () => {}
    };
  }
  resume() { return Promise.resolve(); }
};

// Load code files in dependency order
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

async function runUiUxTestSuite() {
  console.log("=== STARTING CODE SPARK UI/UX UPGRADE TEST SUITE ===");

  // 1. Sound Manager Tests
  assert(window.SoundManager !== undefined, "SoundManager singleton is initialized");
  assert(window.SoundManager.isEnabled() === true, "Sound is enabled by default");
  window.SoundManager.playClick('default');
  window.SoundManager.playClick('run');
  window.SoundManager.playClick('success');
  window.SoundManager.playClick('nav');
  assert(true, "Web Audio API sound synthesizers execute cleanly without error");

  const toggled = window.SoundManager.toggle();
  assert(toggled === false, "SoundManager.toggle correctly mutes audio");
  assert(localStorage.getItem('codespark_sound_enabled') === 'false', "Sound preference persisted in localStorage");
  window.SoundManager.toggle();
  assert(window.SoundManager.isEnabled() === true, "SoundManager re-enables sound properly");

  // 2. Background Engine Tests
  assert(window.CodeSparkBackground !== undefined, "CodeSparkBackground engine is initialized");
  assert(Array.isArray(window.CodeSparkBackground.snippets) && window.CodeSparkBackground.snippets.length > 5, "Background engine defines real code snippets");
  assert(window.CodeSparkBackground.snippets.includes('def learn(): return "CodeSpark"'), "Background snippets include 'def learn(): return \"CodeSpark\"'");
  assert(window.CodeSparkBackground.snippets.includes('const progress = 72;'), "Background snippets include 'const progress = 72;'");
  assert(window.CodeSparkBackground.symbols.includes('</>'), "Background symbols include '</>'");

  // 3. Student Dashboard UI/UX Elements
  const mockStudent = {
    id: "student_ux_1",
    name: "عمر خالد الشافعي",
    grade: "الصف الأول الثانوي",
    streak: 6,
    xp: 920,
    subscription_status: "active",
    subscription_start: "2026-08-01T00:00:00Z",
    subscription_expires_at: "2026-09-01T00:00:00Z",
    days_remaining: 18,
    subscription_plan_label: "اشتراك شهر واحد (30 يوم)"
  };

  const dashHtml = StudentDashboardView.render(mockStudent);
  
  // Hero & Welcome Section
  assert(dashHtml.includes("مرحبًا بك،"), "Hero section displays 'مرحبًا بك،'");
  assert(dashHtml.includes("عمر خالد الشافعي"), "Hero displays student's full name");
  assert(dashHtml.includes("مستعد لمواصلة رحلتك في عالم البرمجة؟"), "Hero displays motivational welcome prompt");
  assert(dashHtml.includes("أكمل تعلم Python"), "Hero displays 'أكمل تعلم Python' progress card");
  assert(dashHtml.includes("متابعة التعلم"), "Hero includes 'متابعة التعلم' action button");
  assert(dashHtml.includes("#practice"), "Hero includes link to interactive Python IDE");

  // 5 Statistics Cards
  assert(dashHtml.includes("الدروس المكتملة"), "Stats section contains 'الدروس المكتملة'");
  assert(dashHtml.includes("متوسط الدرجات"), "Stats section contains 'متوسط الدرجات'");
  assert(dashHtml.includes("نقاط الخبرة XP"), "Stats section contains 'نقاط الخبرة XP'");
  assert(dashHtml.includes("الشارات المكتسبة"), "Stats section contains 'الشارات المكتسبة'");
  assert(dashHtml.includes("نسبة الإنجاز الكلي"), "Stats section contains 'نسبة الإنجاز الكلي'");

  // Recent Lessons Section
  assert(dashHtml.includes("الدروس الأخيرة"), "Dashboard renders 'الدروس الأخيرة' section");
  assert(dashHtml.includes("متابعة الدرس") || dashHtml.includes("بدء الدرس"), "Recent lessons contain interactive action button");

  // Course Progress Section
  assert(dashHtml.includes("التقدم في الكورسات ووحدات المنهج"), "Dashboard renders 'التقدم في الكورسات' section");

  // Recommended Courses Section
  assert(dashHtml.includes("الكورسات والمسارات الموصى بها"), "Dashboard renders 'الكورسات والمسارات الموصى بها' section");
  assert(dashHtml.includes("أساسيات لغة بايثون والتفكير المنطقي"), "Recommended courses contain Python core track");
  assert(dashHtml.includes("المستوى المبتدئ"), "Recommended courses display difficulty level");

  // 4. Settings View UI Click Sound Toggle
  const settingsHtml = SettingsView.render(mockStudent);
  assert(settingsHtml.includes("صوت النقر التفاعلي"), "Settings view renders 'صوت النقر التفاعلي' section");
  assert(settingsHtml.includes("id=\"settings-sound-toggle-btn\""), "Settings view contains sound toggle action button");
  assert(settingsHtml.includes("🔊 تشغيل") || settingsHtml.includes("🔇 إيقاف"), "Settings view displays clear audio state toggle");

  // 5. Notifications & Community View
  const notifsHtml = NotificationsView.render(mockStudent);
  assert(notifsHtml.includes("إعلانات المشرفين والمجتمع الأكاديمي"), "Notifications view contains community announcements section");

  // 6. Python Interactive IDE View
  const practiceHtml = PracticeView.render(mockStudent);
  assert(practiceHtml.includes("مختبر ومحرر الأكواد"), "Practice view renders code playground");
  assert(practiceHtml.includes("id=\"run-playground-btn\""), "Practice view includes Run button");
  assert(practiceHtml.includes("TERMINAL / STDOUT"), "Practice view includes terminal output area");

  console.log(`\n=== ALL UI/UX TEST SUITE CHECKS PASSED (${passedTests}/${totalTests}) ===`);
}

runUiUxTestSuite().catch(err => {
  console.error("UI/UX Test Failure:", err);
  process.exit(1);
});
