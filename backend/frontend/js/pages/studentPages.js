/** * Code Spark - Student Portal Views & Dynamic Controller Logic * 100% Data-Driven from REST APIs with Real Progression, Subscriptions, and Sandboxed Code Execution. */ import ApiClient, { debounce } from '../api/apiClient.js'; import { Toast, Modal } from '../components/ui.js'; import AuthService from '../auth/authService.js'; export class StudentPages { /* =================================================================== 1. STUDENT DASHBOARD =================================================================== */ static async renderDashboard(container) { const user = AuthService.getUser(); container.innerHTML = ` 

## مرحبًا بك، ${user?.full_name || 'طالبنا المتميز'} ��

لوحة المتابعة الأكاديمية والتعلم الذاتي لمادة البرمجة

[�� محرر الأكواد ](#/student/playground)[�� استكمال المنهج](#/student/courses)

`; try { const [prog, mySub, annList] = await Promise.all([ ApiClient.get('/progress/summary').catch(() => ({})), ApiClient.get('/subscriptions/my-status').catch(() => ({})), ApiClient.get('/announcements').catch(() => ([])) ]); // Subscription Alert Banner const subAlert = document.getElementById('sub-status-alert'); if (!mySub.is_subscribed) { subAlert.style.display = 'block'; subAlert.innerHTML = ` 

��

#### أنت على الخطة المجانية حالياً

قم بتفعيل كود الاشتراك لفتح جميع وحدات المنهج المتقدمة والامتحانات والمذكرات بالكامل.

�� إدخال كود الاشتراك

`; document.getElementById('dash-open-sub-btn')?.addEventListener('click', () => { document.getElementById('sub-modal').style.display = 'flex'; }); } // Render Metrics Cards const pct = prog.overall_percentage || 0; document.getElementById('dashboard-metrics').innerHTML = ` 

��

### ${pct}%

نسبة الإنجاز الأكاديمي العام

��

### ${prog.completed_lessons || 0} / ${prog.total_lessons || 0}

الدروس المكتملة

⚡

### ${prog.xp || 0} XP

نقاط الخبرة البرمجية

��

### ${prog.streak_days || 1} أيام

أيام الدراسة المتتالية

`; // Render Left Column: Continue Learning + Quick Exams const continueLes = prog.last_accessed_lesson; let leftHtml = ` 

### ▶️ متابعة التعلم

${continueLes ? ` 

#### ${continueLes.lesson_title}

تمت مشاهدة ${Math.round(continueLes.watch_percentage || 0)}% • آخر موضع: ${Math.round(continueLes.last_video_position_seconds || 0)} ثانية

[استكمال الدرس ⟵](#/student/lesson/${continueLes.lesson_id})

` : ` 

لم تبدأ أي درس بعد. ابدأ الآن بتصفح أول درس في أساسيات البرمجة!

[تصفح المنهج](#/student/courses)

`}

### �� الاختبارات والامتحانات القادمة

[عرض الكل ⟵](#/student/exams)

امتحان منتصف الفصل متاح حالياً للطلاب المشتركين.

[الذهاب لقسم الامتحانات](#/student/exams)

`; document.getElementById('dashboard-left-col').innerHTML = leftHtml; // Render Right Column: Announcements + Shortcuts let rightHtml = ` 

### �� الإعلانات والتبليغات

${annList.length > 0 ? annList.map(a => ` 

${a.title}

${a.content}

${a.publish_date ? a.publish_date.substring(0,10) : ''}

`).join('') : ` 

لا توجد إعلانات جديدة حالياً.

`}

-----

#### روابط سريعة

[�� محرر الأكواد التفاعلي](#/student/playground) [�� مكتبة المذكرات والملازم](#/student/resources) [�� فتح تذكرة دعم أكاديمي](#/student/support)

`; document.getElementById('dashboard-right-col').innerHTML = rightHtml; } catch (err) { console.error(err); Toast.error('تعذر تحميل بعض بيانات لوحة التحكم'); } } /* =================================================================== 2. COURSES & CURRICULUM VIEW =================================================================== */ static async renderCourses(container) { container.innerHTML = ` 

## منهج مادة البرمجة الأكاديمي

الكورسات والوحدات التعليمية المعتمدة

`; try { const res = await ApiClient.get('/courses'); const courses = res.courses || []; const listEl = document.getElementById('courses-list'); if (courses.length === 0) { listEl.innerHTML = '

لا توجد كورسات متاحة حالياً.

'; return; } let html = ''; for (const crs of courses) { // Fetch course details with units const fullCourse = await ApiClient.get(`/courses/${crs.id}`); html += `

### ${crs.title}

${crs.access_type === 'PUBLIC' ? 'مجاني ومتاح للجميع' : 'مخصص للمشتركين ��'}

${crs.description || ''}

${fullCourse.units ? fullCourse.units.map((u, uIdx) => ` 

�� ${u.title}

${u.access_type === 'PUBLIC' ? 'عام' : 'مشتركين ��'}

${u.description || ''}

${u.lessons ? u.lessons.map(les => ` 

${les.is_unlocked ? '��' : '��'} 

${les.title}

${les.progress?.is_completed ? '✅ مكتمل' : (les.progress?.watch_percentage > 0 ? `مشاهدة ${Math.round(les.progress.watch_percentage)}%` : 'لم يبدأ بعد')}

${les.is_unlocked ? ` [مشاهدة الدرس](#/student/lesson/${les.id}) ` : ` تفعيل الاشتراك �� `}

`).join('') : '

لا توجد دروس في هذه الوحدة.

'}

`).join('') : ''}

`; } listEl.innerHTML = html; // Bind all subscription modal triggers document.querySelectorAll('.open-sub-modal-btn').forEach(btn => { btn.addEventListener('click', () => { document.getElementById('sub-modal').style.display = 'flex'; }); }); } catch (err) { console.error(err); Toast.error('حدث خطأ أثناء تحميل الكورسات'); } } /* =================================================================== 3. LESSON VIEW (Video Player, Description, Attachments, Exercises, Quiz) =================================================================== */ static async renderLessonView(container, lessonId) { container.innerHTML = ` 

[المناهج والكورسات](#/student/courses) / جاري التحميل...

`; try { const les = await ApiClient.get(`/lessons/${lessonId}`); document.getElementById('lesson-breadcrumb-title').textContent = les.title; const mainEl = document.getElementById('lesson-container'); // Check if locked if (!les.is_unlocked) { mainEl.innerHTML = ` 

��

## هذا الدرس مخصص للمشتركين فقط

عذراً، يتطلب الوصول إلى محتوى هذا الدرس وجود اشتراك نشط على حسابك. قم بإدخال كود الاشتراك الخاص بك لفتح هذا الدرس وجميع محتويات المنهج فوراً.

�� إدخال كود الاشتراك [العودة للمنهج](#/student/courses)

`; document.getElementById('lesson-locked-sub-btn').addEventListener('click', () => { document.getElementById('sub-modal').style.display = 'flex'; }); return; } // Render Video Player let videoHtml = ''; if (les.video_type === 'youtube' && les.video_id) { videoHtml = `

`; } else if (les.video_type === 'uploaded' && les.video_url) { videoHtml = ` 

متصفحك لا يدعم تشغيل الفيديو المباشر.

`; } else { videoHtml = ` 

لا يوجد فيديو مرفق مع هذا الدرس، يمكنك قراءة الشرح وحل التمارين أدناه.

`; } mainEl.innerHTML = ` 

${videoHtml} 

## ${les.title}

المدة المقدرة: ${Math.round(les.duration_seconds / 60)} دقيقة

${les.is_bookmarked ? '⭐ محفوظ' : '☆ حفظ'} ${les.progress?.is_completed ? '✅ تم إكمال الدرس' : 'تحديد كمكتمل'}

${les.prev_lesson_id ? ` [⟵ الدرس السابق](#/student/lesson/${les.prev_lesson_id}) ` : '

'} ${les.next_lesson_id ? ` [الدرس التالي ⟶](#/student/lesson/${les.next_lesson_id}) ` : '

'}

�� الشرح والملاحظات �� التمارين البرمجية (${les.exercises ? les.exercises.length : 0}) �� المذكرات والملفات (${les.resources ? les.resources.length : 0}) ${les.quiz ? `�� الاختبار القصير` : ''}

${les.description || ''}

${les.content_markdown || 'لا توجد ملاحظات إضافية.'}

${les.exercises && les.exercises.length > 0 ? les.exercises.map(ex => ` 

#### ${ex.title}

${ex.difficulty}

${ex.description || ''}

[حل التمرين في المحرر ⟵](#/student/exercises)

`).join('') : '

لا توجد تمارين مخصصة لهذا الدرس حالياً.

'}

${les.resources && les.resources.length > 0 ? les.resources.map(r => ` 

�� 

${r.title}

${r.resource_type === 'drive_link' ? 'رابط Google Drive' : 'ملف مرفوع'} • ${r.file_format?.toUpperCase()}

[تحميل المذكرة ��](${r.file_url})

`).join('') : '

لا توجد مذكرات مرفقة بهذا الدرس.

'}

${les.quiz ? ` 

### ${les.quiz.title}

درجة النجاح: ${les.quiz.passing_score}% • الوقت: ${les.quiz.time_limit_minutes} دقيقة

[بدء الاختبار القصير الآن ��](#/student/quizzes)

` : ''}

`; // Tabs switcher logic document.querySelectorAll('.tab-btn').forEach(btn => { btn.addEventListener('click', () => { document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none'); btn.classList.add('active'); const target = document.getElementById(btn.dataset.tab); if (target) target.style.display = 'block'; }); }); // Complete button const completeBtn = document.getElementById('complete-lesson-btn'); completeBtn.addEventListener('click', async () => { try { await ApiClient.put(`/lessons/${lessonId}/progress`, { last_video_position_seconds: les.duration_seconds || 0, watch_percentage: 100, is_completed: true }); Toast.success('تهانينا! تم إكمال الدرس وحساب نقاط الخبرة ��'); completeBtn.className = 'btn btn-success btn-sm'; completeBtn.textContent = '✅ تم إكمال الدرس'; } catch (e) { Toast.error(e.message); } }); // Bookmark button const bmBtn = document.getElementById('bookmark-lesson-btn'); bmBtn.addEventListener('click', async () => { try { await ApiClient.post('/bookmarks', { item_type: 'lesson', item_id: lessonId }); Toast.success('تمت إضافة الدرس إلى محفوظاتك'); bmBtn.textContent = '⭐ محفوظ'; } catch (e) { Toast.error(e.message); } }); // HTML5 video progress tracker const html5Video = document.getElementById('html5-lesson-player'); if (html5Video) { if (les.progress?.last_video_position_seconds > 0) { html5Video.currentTime = les.progress.last_video_position_seconds; } html5Video.addEventListener('timeupdate', debounce(async () => { const pos = html5Video.currentTime; const dur = html5Video.duration || les.duration_seconds || 1; const pct = Math.min(100, (pos / dur) * 100); ApiClient.put(`/lessons/${lessonId}/progress`, { last_video_position_seconds: pos, watch_percentage: pct, is_completed: pct > 90 }).catch(() => {}); }, 5000)); } } catch (err) { console.error(err); Toast.error('فشل تحميل تفاصيل الدرس'); } } /* =================================================================== 4. CODE PLAYGROUND (Python / JavaScript / HTML / CSS) =================================================================== */ /* =================================================================== 4. CODE PLAYGROUND & WEB DEVELOPMENT WORKSPACE (ENHANCED) =================================================================== */ static async renderPlayground(container) { let currentMode = "python"; // python, javascript, web let currentActiveFile = "index.html"; let currentProjectId = null; let lastErrorDetected = null; let isAiDrawerOpen = false; let savedEditorHeight = "52%"; let savedTerminalHeight = "48%"; // Web Workspace in-memory file structure let webFiles = { "index.html": ` مشروعي الأول - Code Spark 

# مرحباً بك في عالم تطوير الويب! ��

قم بتعديل HTML أو CSS أو JavaScript وشاهد النتيجة مباشرة في نافذة المعاينة.

اضغط هنا للتفاعل ✨ 

عدد النقرات: 0

`, "style.css": `body { margin: 0; padding: 2rem; font-family: system-ui, -apple-system, sans-serif; background: #0B132B; color: #F8FAFC; display: flex; justify-content: center; align-items: center; min-height: 80vh; } .container { background: #0F172A; padding: 2.5rem; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #1E293B; text-align: center; max-width: 500px; } h1 { color: #38BDF8; margin-top: 0; } .btn { background: linear-gradient(135deg, #0EA5E9, #0284C7); color: white; border: none; padding: 0.8rem 1.8rem; font-size: 1rem; font-weight: bold; border-radius: 8px; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; } .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(14,165,233,0.4); } .counter-box { margin-top: 1.5rem; font-size: 1.2rem; font-weight: bold; color: #A5F3FC; }`, "script.js": `let count = 0; const btn = document.getElementById("click-btn"); const counter = document.getElementById("counter"); btn.addEventListener("click", () => { count++; counter.textContent = "عدد النقرات: " + count; btn.style.transform = "scale(0.95)"; setTimeout(() => { btn.style.transform = "scale(1)"; }, 100); });` }; const standaloneStarters = { python: `# بيئة بايثون 3.11 التفاعلية (Code Spark IDE) print("مرحباً بك في بيئة تشغيل بايثون!")`, javascript: `// بيئة جافا سكريبت التفاعلية (Node.js) const students = ["عمر", "سارة", "أحمد", "مريم"]; students.forEach((name, idx) => { console.log(\`الطالب #${idx + 1}: ${name} في منصة Code Spark\`); });` }; container.innerHTML = ` 

## �� محرر الأكواد التفاعلي (Code Playground)

بيئة IDE سحابية متطورة لتشغيل بايثون 3.11، نود جي اس، ومشاريع الويب مع شاشة مخرجات كبيرة قابلة للتكبير وإعادة التحجيم

�� Python 3.11 ⚡ Node.js �� برمجة الويب (Web Dev)

�� حفظ المشروع �� مشاريعي

▶ تشغيل الكود

\+ ملف ��️

�� main.py Python 3.11

تنظيف الكود مسح المحرر

الأسطر: 1 | الأحرف: 0 UTF-8 | LF

⚡ شاشة المخرجات (Terminal Console)

جاهز للتشغيل

�� المساعد الذكي ��️ مسح المخرجات ⛶ تكبير الشاشة

``` 
اضغط على [▶ تشغيل الكود] لعرض المخرجات هنا... 
```

��️ المعاينة المباشرة (Sandbox) إعادة تحميل ��

��️ Console Logs مسح

[Console ready]

�� مساعد البرمجة التعليمي الذكي

��️ إصلاح الخطأ

�� تلميح �� شرح الكود �� فحص الأخطاء ⚡ إكمال الكود �� تحسينات

اختر أي إجراء لمساعدتك في فهم الكود خطوة بخطوة...

تطبيق الكود المقترح على المحرر ✨

`; // DOM Elements const ideContainer = document.getElementById("playground-ide-container"); const editorSection = document.getElementById("playground-editor-section"); const dragDivider = document.getElementById("playground-drag-divider"); const terminalSection = document.getElementById("playground-terminal-section"); const btnMaximize = document.getElementById("btn-maximize-terminal"); const btnClearTerminal = document.getElementById("btn-clear-terminal"); const btnToggleAi = document.getElementById("btn-toggle-ai"); const aiContainer = document.getElementById("ai-assistant-container"); const editor = document.getElementById("main-code-editor"); const terminal = document.getElementById("standalone-terminal-output"); const runBtn = document.getElementById("main-run-btn"); const runStatusText = document.getElementById("run-status-text"); const popup = document.getElementById("autocomplete-popup"); const linesCount = document.getElementById("stat-lines-count"); const charsCount = document.getElementById("stat-chars-count"); const langIndicator = document.getElementById("editor-language-indicator"); const fileTitle = document.getElementById("editor-file-title"); const standaloneOutView = document.getElementById("standalone-output-view"); const webPrevView = document.getElementById("web-preview-view"); const webTabsBar = document.getElementById("web-file-tabs-bar"); const webActionsBar = document.getElementById("web-actions-bar"); const standaloneHeader = document.getElementById("standalone-editor-header"); const webTabsContainer = document.getElementById("web-tabs-container"); const webIframe = document.getElementById("web-live-iframe"); const webConsole = document.getElementById("web-console-logs"); const aiResponse = document.getElementById("ai-assistant-response"); const btnApplyAi = document.getElementById("btn-apply-ai-code"); const btnQuickFix = document.getElementById("btn-quick-fix-error"); let suggestedAiCode = null; // ------------------------------------------------------------- // Draggable Splitter Implementation // ------------------------------------------------------------- let isDragging = false; dragDivider.addEventListener("mousedown", (e) => { if (ideContainer.classList.contains("maximized")) return; isDragging = true; dragDivider.classList.add("dragging"); document.body.style.cursor = "row-resize"; document.body.style.userSelect = "none"; }); window.addEventListener("mousemove", (e) => { if (!isDragging || ideContainer.classList.contains("maximized")) return; const rect = ideContainer.getBoundingClientRect(); const newEditorH = e.clientY - rect.top; const divH = 12; const minH = 120; const maxH = rect.height - minH - divH; const clamped = Math.max(minH, Math.min(maxH, newEditorH)); savedEditorHeight = `${clamped}px`; savedTerminalHeight = `${rect.height - clamped - divH}px`; editorSection.style.height = savedEditorHeight; terminalSection.style.height = savedTerminalHeight; editorSection.style.flex = "none"; terminalSection.style.flex = "none"; }); window.addEventListener("mouseup", () => { if (isDragging) { isDragging = false; dragDivider.classList.remove("dragging"); document.body.style.cursor = ""; document.body.style.userSelect = ""; } }); // Touch events for mobile / tablets dragDivider.addEventListener("touchstart", (e) => { if (ideContainer.classList.contains("maximized")) return; isDragging = true; dragDivider.classList.add("dragging"); }, { passive: true }); window.addEventListener("touchmove", (e) => { if (!isDragging || ideContainer.classList.contains("maximized") || !e.touches[0]) return; const touch = e.touches[0]; const rect = ideContainer.getBoundingClientRect(); const newEditorH = touch.clientY - rect.top; const divH = 12; const minH = 120; const maxH = rect.height - minH - divH; const clamped = Math.max(minH, Math.min(maxH, newEditorH)); savedEditorHeight = `${clamped}px`; savedTerminalHeight = `${rect.height - clamped - divH}px`; editorSection.style.height = savedEditorHeight; terminalSection.style.height = savedTerminalHeight; editorSection.style.flex = "none"; terminalSection.style.flex = "none"; }, { passive: true }); window.addEventListener("touchend", () => { if (isDragging) { isDragging = false; dragDivider.classList.remove("dragging"); } }); // Maximize / Restore Controls btnMaximize?.addEventListener("click", () => { const isMax = ideContainer.classList.contains("maximized"); if (!isMax) { savedEditorHeight = editorSection.style.height || "52%"; savedTerminalHeight = terminalSection.style.height || "48%"; ideContainer.classList.add("maximized"); btnMaximize.innerHTML = "�� استعادة الحجم"; btnMaximize.classList.remove("btn-secondary"); btnMaximize.classList.add("btn-primary"); } else { ideContainer.classList.remove("maximized"); editorSection.style.height = savedEditorHeight; terminalSection.style.height = savedTerminalHeight; btnMaximize.innerHTML = "⛶ تكبير الشاشة"; btnMaximize.classList.remove("btn-primary"); btnMaximize.classList.add("btn-secondary"); } }); // Clear Terminal Output btnClearTerminal?.addEventListener("click", () => { terminal.textContent = "تم مسح شاشة المخرجات."; terminal.style.color = "var(--color-text-dim)"; runStatusText.textContent = "جاهز"; }); // Toggle AI Assistant Drawer btnToggleAi?.addEventListener("click", () => { isAiDrawerOpen = !isAiDrawerOpen; if (aiContainer) { aiContainer.style.display = isAiDrawerOpen ? "block" : "none"; } btnToggleAi.classList.toggle("btn-primary", isAiDrawerOpen); btnToggleAi.classList.toggle("btn-secondary", !isAiDrawerOpen); }); // Switch Modes (Python vs Node vs Web) function setMode(mode) { currentMode = mode; document.querySelectorAll(".playground-mode-btn").forEach(b => { b.classList.toggle("active", b.dataset.mode === mode); }); if (mode === "web") { webTabsBar.style.display = "flex"; webActionsBar.style.display = "flex"; standaloneHeader.style.display = "none"; standaloneOutView.style.display = "none"; webPrevView.style.display = "block"; runBtn.innerHTML = "�� تحديث المعاينة"; langIndicator.textContent = "HTML / CSS / JS"; renderWebTabs(); loadWebFile(currentActiveFile); updateLivePreview(); } else { webTabsBar.style.display = "none"; webActionsBar.style.display = "none"; standaloneHeader.style.display = "flex"; standaloneOutView.style.display = "flex"; webPrevView.style.display = "none"; runBtn.innerHTML = "▶ تشغيل الكود"; if (mode === "python") { fileTitle.innerHTML = "�� main.py"; langIndicator.textContent = "Python 3.11"; editor.value = standaloneStarters.python; } else if (mode === "javascript") { fileTitle.innerHTML = "⚡ script.js"; langIndicator.textContent = "Node.js v18"; editor.value = standaloneStarters.javascript; } updateEditorStats(); } } document.querySelectorAll(".playground-mode-btn").forEach(btn => { btn.addEventListener("click", () => setMode(btn.dataset.mode)); }); // ------------------------------------------------------------- // Web Mode Workspace Tabs & Management // ------------------------------------------------------------- function renderWebTabs() { webTabsContainer.innerHTML = ""; Object.keys(webFiles).forEach(fileName => { const tab = document.createElement("button"); tab.className = `btn btn-sm ${fileName === currentActiveFile ? "btn-primary" : "btn-secondary"}`; tab.style.padding = "2px 10px"; tab.style.fontSize = "0.8rem"; tab.textContent = fileName; tab.addEventListener("click", () => { webFiles[currentActiveFile] = editor.value; currentActiveFile = fileName; renderWebTabs(); loadWebFile(fileName); }); webTabsContainer.appendChild(tab); }); } function loadWebFile(fileName) { editor.value = webFiles[fileName] || ""; updateEditorStats(); } // New File document.getElementById("btn-new-file")?.addEventListener("click", () => { const name = prompt("أدخل اسم الملف الجديد مع الامتداد (مثال: about.html أو utils.js):"); if (name && name.trim()) { const cleanName = name.trim(); if (webFiles[cleanName]) { Toast.error("الملف موجود بالفعل بهذا الاسم"); return; } webFiles[cleanName] = `/* ${cleanName} */\n`; currentActiveFile = cleanName; renderWebTabs(); loadWebFile(cleanName); } }); // Delete File document.getElementById("btn-del-file")?.addEventListener("click", () => { if (Object.keys(webFiles).length <= 1) { Toast.error("لا يمكن حذف آخر ملف في المشروع"); return; } if (confirm(`هل أنت متأكد من رغبتك في حذف الملف (${currentActiveFile})؟`)) { delete webFiles[currentActiveFile]; currentActiveFile = Object.keys(webFiles)[0]; renderWebTabs(); loadWebFile(currentActiveFile); updateLivePreview(); } }); // ------------------------------------------------------------- // Live Preview Engine (HTML + CSS + JS in isolated iframe sandbox) // ------------------------------------------------------------- function updateLivePreview() { if (currentMode !== "web") return; webFiles[currentActiveFile] = editor.value; const html = webFiles["index.html"] || ""; const css = webFiles["style.css"] || ""; const js = webFiles["script.js"] || ""; const consoleCaptureScript = ` `; let combinedDoc = html; if (css && !combinedDoc.includes("`); } combinedDoc = combinedDoc.replace("", `${consoleCaptureScript}`); if (js && !combinedDoc.includes('`); } else if (js) { combinedDoc = combinedDoc.replace('', ``); } webIframe.srcdoc = combinedDoc; } // Capture console messages from sandbox iframe window.addEventListener("message", (event) => { if (event.data && event.data.source === "codespark_sandbox") { const item = document.createElement("div"); if (event.data.type === "error") { item.style.color = "#EF4444"; item.textContent = `❌ [Error] ${event.data.message}`; } else if (event.data.type === "warn") { item.style.color = "#F59E0B"; item.textContent = `⚠️ [Warn] ${event.data.message}`; } else { item.style.color = "#38BDF8"; item.textContent = `�� ${event.data.message}`; } webConsole.appendChild(item); webConsole.scrollTop = webConsole.scrollHeight; } }); document.getElementById("btn-clear-web-console")?.addEventListener("click", () => { webConsole.innerHTML = '

[سجل المخرجات فارغ]

'; }); document.getElementById("btn-reload-preview")?.addEventListener("click", updateLivePreview); // ------------------------------------------------------------- // Save & Load Web Projects via Backend API (/api/playground/projects) // ------------------------------------------------------------- document.getElementById("btn-save-project")?.addEventListener("click", async () => { webFiles[currentActiveFile] = editor.value; const title = prompt("أدخل اسماً لحفظ مشروع الويب الخاص بك:", currentProjectId ? "مشروعي المحدث" : "مشروعي التفاعلي"); if (!title) return; try { if (currentProjectId) { await ApiClient.put(`/playground/projects/${currentProjectId}`, { title: title.trim(), files: webFiles }); Toast.success("تم تحديث المشروع بنجاح في حسابك! ��"); } else { const res = await ApiClient.post("/playground/projects", { title: title.trim(), files: webFiles }); currentProjectId = res.project_id; Toast.success("تم حفظ المشروع الجديد بنجاح في حسابك! ��"); } } catch (err) { Toast.error("فشل حفظ المشروع: " + err.message); } }); document.getElementById("btn-load-projects")?.addEventListener("click", async () => { try { const projects = await ApiClient.get("/playground/projects"); if (!projects || projects.length === 0) { Toast.info("لا توجد مشاريع ويب محفوظة سابقة لديك"); return; } const projectListHtml = projects.map(p => ` 

**${p.title}** 

آخر تعديل: ${p.updated_at.substring(0, 10)}

فتح �� ��️

`).join(""); Modal.show({ title: "�� مشاريع الويب المحفوظة لديك", content: `

${projectListHtml}

`, onRender: (modalEl) => { modalEl.querySelectorAll(".btn-open-p").forEach(btn => { btn.addEventListener("click", async () => { const pData = await ApiClient.get(`/playground/projects/${btn.dataset.pid}`); currentProjectId = pData.id; webFiles = pData.files || {}; currentActiveFile = Object.keys(webFiles)[0] || "index.html"; renderWebTabs(); loadWebFile(currentActiveFile); updateLivePreview(); Modal.close(); Toast.success(`تم تحميل مشروع: ${pData.title}`); }); }); modalEl.querySelectorAll(".btn-del-p").forEach(btn => { btn.addEventListener("click", async () => { if (confirm("هل أنت متأكد من حذف هذا المشروع نهائياً؟")) { await ApiClient.delete(`/playground/projects/${btn.dataset.pid}`); Toast.success("تم حذف المشروع"); Modal.close(); } }); }); } }); } catch (err) { Toast.error("تعذر جلب المشاريع: " + err.message); } }); // ------------------------------------------------------------- // RUN CODE EXECUTION ENGINE (Python & Node & Web) // ------------------------------------------------------------- runBtn.addEventListener("click", async () => { if (currentMode === "web") { updateLivePreview(); Toast.success("تم تحديث المعاينة المباشرة بنجاح ✨"); return; } runBtn.disabled = true; runBtn.innerHTML = "⏳ جاري التشغيل..."; runStatusText.textContent = "جاري المعالجة..."; let code = editor.value; try { const res = await ApiClient.post("/playground/run", { language: currentMode, code: code }); if (res.success) { terminal.textContent = res.output || "(تم التنفيذ بنجاح دون مخرجات نصية)"; terminal.style.color = "#38BDF8"; runStatusText.textContent = "تم التنفيذ بنجاح ✅"; terminal.scrollTop = terminal.scrollHeight; } else { terminal.textContent = res.error || res.output || "حدث خطأ أثناء التنفيذ"; terminal.style.color = "#EF4444"; runStatusText.textContent = "تم رصد خطأ ❌"; lastErrorDetected = res.error || res.output; terminal.scrollTop = terminal.scrollHeight; if (btnQuickFix) btnQuickFix.style.display = "inline-flex"; } } catch (err) { terminal.textContent = err.message || "فشل الاتصال بالخادم"; terminal.style.color = "#EF4444"; runStatusText.textContent = "فشل الاتصال"; terminal.scrollTop = terminal.scrollHeight; } finally { runBtn.disabled = false; runBtn.innerHTML = "▶ تشغيل الكود"; } }); // ------------------------------------------------------------- // Real Code Completion / IntelliSense Engine // ------------------------------------------------------------- const completions = { html: [ { label: "

", insert: "

\n \n

", type: "tag" }, { label: "

", insert: "

", type: "tag" }, { label: "", insert: "", type: "tag" }, { label: "", insert: "", type: "tag" }, { label: "", insert: "", type: "tag" }, { label: "

# ", insert: "
رفع ملف الفيديو...'); try { const upRes = await ApiClient.upload('/resources/upload', fd); vUrl = upRes.file_url; } catch (err) { Toast.error('فشل رفع الفيديو: ' + err.message); return; } } else if (vtypeSelect.value === 'youtube') { if (vUrl.includes('v=')) { vId = vUrl.split('v=')[1].split('&')[0]; } else if (vUrl.includes('youtu.be/')) { vId = vUrl.split('youtu.be/')[1].split('?')[0]; } else if (vUrl.length === 11 && !vUrl.includes('/')) { vId = vUrl; } } const payload = { unit_id: document.getElementById('m-les-unit').value, title: document.getElementById('m-les-title').value.trim(), slug: document.getElementById('m-les-slug').value.trim() || 'lesson-' + Date.now(), description: document.getElementById('m-les-title').value.trim(), content_markdown: document.getElementById('m-les-content').value, video_type: vtypeSelect.value, video_url: vUrl, video_id: vId, duration_seconds: (parseFloat(document.getElementById('m-les-dur').value) || 10) * 60, order_index: parseInt(document.getElementById('m-les-ord').value) || 1, access_type: document.getElementById('m-les-access').value, is_published: true }; try { if (isEdit) { await ApiClient.put(`/lessons/${lesson.id}`, payload); Toast.success('تم تعديل الدرس بنجاح'); } else { await ApiClient.post('/lessons', payload); Toast.success('تمت إضافة ونشر الدرس بنجاح ��'); } Modal.close(); onSaved(); } catch (err) { Toast.error(err.message); } }); } document.getElementById('filter-lesson-search')?.addEventListener('input', debounce(loadLessons, 300)); document.getElementById('filter-lesson-unit')?.addEventListener('change', loadLessons); document.getElementById('filter-lesson-access')?.addEventListener('change', loadLessons); await loadLessons(); } /* =================================================================== 4. QUESTION BANK MANAGEMENT (Full CRUD for Admin & Assistants) =================================================================== */ static async renderQuestionBank(container) { container.innerHTML = ` 

## بنك الأسئلة المركزي ��

إضافة وتعديل وحذف أسئلة الاختيار من متعدد والصواب والخطأ وتحليل الأكواد وتصنيفها

\+ إضافة سؤال جديد

جميع الصعوبات سهل (Easy) متوسط (Medium) صعب (Hard) جميع الأنواع اختيار من متعدد (MCQ) صح أو خطأ (True/False) تحليل كود برمجى

| نص السؤال | النوع | الصعوبة | الموضوع | الإجابة الصحيحة | الإجراءات |
| :-: | :-: | :-: | :-: | :-: | :-: |
| جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... |

`; async function loadQuestions() { const search = document.getElementById('filter-q-search')?.value || ''; const diff = document.getElementById('filter-q-diff')?.value || ''; const qtype = document.getElementById('filter-q-type')?.value || ''; let url = `/questions?`; if (search) url += `search=${encodeURIComponent(search)}&`; if (diff) url += `difficulty=${diff}&`; if (qtype) url += `qtype=${qtype}&`; try { const res = await ApiClient.get(url); const questions = res.questions || []; const tbody = document.getElementById('questions-table-body'); if (questions.length === 0) { tbody.innerHTML = 'لا توجد أسئلة تطابق البحث.'; return; } tbody.innerHTML = questions.map(q => ` **${q.question_text}** ${q.explanation ? `

الشرح: ${q.explanation}

` : ''} ${q.question_type === 'multiple_choice' ? 'اختيار من متعدد' : (q.question_type === 'true_false' ? 'صح/خطأ' : 'كود')} ${q.difficulty} ${q.topic || 'عام'} ${q.correct_answer} 

تعديل ✏️ حذف ��️

`).join(''); // Bind Edit Question document.querySelectorAll('.edit-q-btn').forEach(btn => { btn.addEventListener('click', () => { const q = questions.find(x => x.id === btn.dataset.id); if (q) openQuestionModal(q, loadQuestions); }); }); // Bind Delete Question document.querySelectorAll('.del-q-btn').forEach(btn => { btn.addEventListener('click', () => { const qId = btn.dataset.id; Modal.confirm({ title: 'تأكيد حذف السؤال', message: 'هل أنت متأكد من رغبتك في حذف هذا السؤال نهائياً من بنك الأسئلة؟', onConfirm: async () => { try { await ApiClient.delete(`/questions/${qId}`); Toast.success('تم حذف السؤال بنجاح'); loadQuestions(); } catch (e) { Toast.error(e.message); } } }); }); }); document.getElementById('btn-add-question').onclick = () => openQuestionModal(null, loadQuestions); } catch (err) { console.error(err); Toast.error('فشل تحميل بنك الأسئلة'); } } function openQuestionModal(q, onSaved) { const isEdit = !!q; const opts = q?.options_json ? JSON.parse(q.options_json) : [ { id: "opt1", text: "" }, { id: "opt2", text: "" }, { id: "opt3", text: "" }, { id: "opt4", text: "" } ]; Modal.open({ title: isEdit ? 'تعديل السؤال' : 'إضافة سؤال جديد إلى بنك الأسئلة', contentHtml: ` 

نص السؤال ${q?.question_text || ''}

نوع السؤال اختيار من متعدد (MCQ) صح أو خطأ (True / False) تحليل مخرجات كود

مستوى الصعوبة سهل (Easy) متوسط (Medium) صعب (Hard)

الموضوع البرمجي (Topic)

الخيارات وتحديد الإجابة الصحيحة:

شرح وتفسير الإجابة النموذجية (Explanation) ${q?.explanation || ''}

${isEdit ? 'حفظ التعديلات' : 'إضافة السؤال لبنك الأسئلة ��'} ` }); document.getElementById('form-q-save').addEventListener('submit', async (e) => { e.preventDefault(); const selectedRadio = document.querySelector('input[name="correct_opt"]:checked'); const correctVal = selectedRadio ? selectedRadio.value : 'opt2'; const customOpts = [ { id: "opt1", text: document.getElementById('opt-val-1').value.trim() }, { id: "opt2", text: document.getElementById('opt-val-2').value.trim() }, { id: "opt3", text: document.getElementById('opt-val-3').value.trim() }, { id: "opt4", text: document.getElementById('opt-val-4').value.trim() } ]; const payload = { question_text: document.getElementById('m-q-text').value.trim(), question_type: document.getElementById('m-q-type').value, difficulty: document.getElementById('m-q-diff').value, topic: document.getElementById('m-q-topic').value.trim() || 'عام', options_json: JSON.stringify(customOpts), correct_answer: correctVal, explanation: document.getElementById('m-q-exp').value.trim() }; try { if (isEdit) { await ApiClient.put(`/questions/${q.id}`, payload); Toast.success('تم تعديل السؤال بنجاح'); } else { await ApiClient.post('/questions', payload); Toast.success('تمت إضافة السؤال لبنك الأسئلة بنجاح ��'); } Modal.close(); onSaved(); } catch (err) { Toast.error(err.message); } }); } document.getElementById('filter-q-search')?.addEventListener('input', debounce(loadQuestions, 300)); document.getElementById('filter-q-diff')?.addEventListener('change', loadQuestions); document.getElementById('filter-q-type')?.addEventListener('change', loadQuestions); await loadQuestions(); } /* =================================================================== 5. EXAMS MANAGEMENT & SUBMISSIONS (Full CRUD for Admin & Assistants) =================================================================== */ static async renderExams(container) { container.innerHTML = ` 

## إدارة وتصحيح الامتحانات ��

إنشاء وتعديل الامتحانات واختيار الأسئلة من بنك الأسئلة ومتابعة نتائج الطلاب لحظياً

\+ إنشاء امتحان جديد

| عنوان الامتحان | المدة | درجة النجاح | المحاولات | الوصول | الحالة | الإجراءات |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... |

`; async function loadExams() { try { const [exams, qRes] = await Promise.all([ ApiClient.get('/exams'), ApiClient.get('/questions').catch(() => ({ questions: [] })) ]); const allQuestions = qRes.questions || []; const tbody = document.getElementById('exams-table-body'); if (!exams || exams.length === 0) { tbody.innerHTML = 'لا توجد امتحانات مضافة بعد.'; return; } tbody.innerHTML = exams.map(ex => ` **${ex.title}** 

${ex.description || ''}

${ex.duration_minutes} دقيقة ${ex.passing_score}% ${ex.max_attempts} ${ex.access_type === 'PUBLIC' ? 'عام' : 'مشتركين ��'} ${ex.is_published ? 'منشور ✅' : 'مسودة ⏸️'} 

النتائج �� تعديل ✏️ حذف ��️

`).join(''); // View Student Results document.querySelectorAll('.view-results-btn').forEach(btn => { btn.addEventListener('click', async () => { const exId = btn.dataset.id; try { const results = await ApiClient.get(`/exams/${exId}/results`); Modal.open({ title: 'نتائج ومحاولات الطلاب في الامتحان', contentHtml: ` 

| الطالب | اسم المستخدم | الدرجة المحققة | النسبة | الحالة | تاريخ التسليم |
| :-: | :-: | :-: | :-: | :-: | :-: |
| **${r.student_name}** | ${r.student_username} | ${r.score} / ${r.total_possible} | **${r.percentage}%** |  ${r.is_passed ? 'ناجح ✅' : 'راسب ❌'}  | ${r.completed_at ? r.completed_at.substring(0, 16).replace('T', ' ') : '—'} |
| لا توجد محاولات مسجلة بعد لهذا الامتحان. | لا توجد محاولات مسجلة بعد لهذا الامتحان. | لا توجد محاولات مسجلة بعد لهذا الامتحان. | لا توجد محاولات مسجلة بعد لهذا الامتحان. | لا توجد محاولات مسجلة بعد لهذا الامتحان. | لا توجد محاولات مسجلة بعد لهذا الامتحان. |

` }); } catch (e) { Toast.error(e.message); } }); }); // Edit Exam document.querySelectorAll('.edit-exam-btn').forEach(btn => { btn.addEventListener('click', async () => { const ex = exams.find(x => x.id === btn.dataset.id); const fullExam = await ApiClient.get(`/exams/${ex.id}`).catch(() => ex); openExamModal(fullExam, allQuestions, loadExams); }); }); // Delete Exam document.querySelectorAll('.del-exam-btn').forEach(btn => { btn.addEventListener('click', () => { const exId = btn.dataset.id; Modal.confirm({ title: 'تأكيد حذف الامتحان', message: 'هل أنت متأكد من رغبتك في حذف هذا الامتحان بالكامل وكافة محاولات الطلاب المرتبطة به؟', onConfirm: async () => { try { await ApiClient.delete(`/exams/${exId}`); Toast.success('تم حذف الامتحان بنجاح'); loadExams(); } catch (e) { Toast.error(e.message); } } }); }); }); document.getElementById('btn-add-exam').onclick = () => openExamModal(null, allQuestions, loadExams); } catch (err) { console.error(err); Toast.error('فشل تحميل قائمة الامتحانات'); } } function openExamModal(exam, allQuestions, onSaved) { const isEdit = !!exam; const linkedQIds = exam?.questions ? exam.questions.map(q => q.id) : []; Modal.open({ title: isEdit ? `تعديل الامتحان: ${exam.title}` : 'إنشاء وتكوين امتحان جديد', contentHtml: ` 

عنوان الامتحان

الوصف والتعليمات للطلاب ${exam?.description || ''}

المدة (بالدقائق)

درجة النجاح (%)

المحاولات المتاحة

مستوى الوصول مخصص للمشتركين فقط �� عام ومتاح للجميع (PUBLIC)

اختر الأسئلة من بنك الأسئلة (${allQuestions.length} سؤال متاح):

${allQuestions.length > 0 ? allQuestions.map((q, idx) => ` 

[${q.difficulty}] ${q.question_text}

`).join('') : '

لا توجد أسئلة في بنك الأسئلة. قم بإضافة أسئلة أولاً.

'}

${isEdit ? 'حفظ تعديلات الامتحان' : 'إنشاء ونشر الامتحان ��'} ` }); document.getElementById('form-exam-save').addEventListener('submit', async (e) => { e.preventDefault(); const pickedQIds = Array.from(document.querySelectorAll('input[name="exam_q_pick"]:checked')).map(cb => ({ question_id: cb.value, points: 5.0 })); const payload = { title: document.getElementById('m-ex-title').value.trim(), description: document.getElementById('m-ex-desc').value.trim(), duration_minutes: parseInt(document.getElementById('m-ex-dur').value) || 45, passing_score: parseFloat(document.getElementById('m-ex-pass').value) || 75.0, max_attempts: parseInt(document.getElementById('m-ex-att').value) || 1, access_type: document.getElementById('m-ex-access').value, is_published: true, questions: pickedQIds }; try { if (isEdit) { await ApiClient.put(`/exams/${exam.id}`, payload); Toast.success('تم تعديل الامتحان بنجاح'); } else { await ApiClient.post('/exams', payload); Toast.success('تم إنشاء ونشر الامتحان بنجاح ��'); } Modal.close(); onSaved(); } catch (err) { Toast.error(err.message); } }); } await loadExams(); } /* =================================================================== 6. ANNOUNCEMENTS MANAGEMENT (Full CRUD for Admin & Assistants) =================================================================== */ static async renderAnnouncements(container) { container.innerHTML = ` 

## إدارة ونشر الإعلانات العامة ��

بث الرسائل والتبليغات الموجهة لكافة الطلاب أو المشتركين أو المساعدين وتحديثها لحظياً

\+ نشر إعلان جديد

`; async function loadAnnouncements() { try { const announcements = await ApiClient.get('/announcements'); const listEl = document.getElementById('announcements-cards-list'); if (!announcements || announcements.length === 0) { listEl.innerHTML = '

لا توجد إعلانات منشورة حالياً.

'; return; } listEl.innerHTML = announcements.map(a => ` 

### ${a.title}

الجمهور: ${a.target_audience === 'ALL' ? 'الكل ��' : (a.target_audience === 'STUDENTS' ? 'الطلاب ��' : (a.target_audience === 'SUBSCRIBERS' ? 'المشتركون ��' : 'المساعدون ��️'))}

${a.content}

تاريخ النشر: ${a.publish_date ? a.publish_date.substring(0, 10) : ''}

حذف الإعلان ��️

`).join(''); document.querySelectorAll('.del-ann-btn').forEach(btn => { btn.addEventListener('click', () => { const aId = btn.dataset.id; Modal.confirm({ title: 'تأكيد حذف الإعلان', message: 'هل أنت متأكد من رغبتك في حذف هذا الإعلان؟ لن يظهر للطلاب بعد الحذف.', onConfirm: async () => { try { await ApiClient.delete(`/announcements/${aId}`); Toast.success('تم حذف الإعلان بنجاح'); loadAnnouncements(); } catch (e) { Toast.error(e.message); } } }); }); }); document.getElementById('btn-add-announcement').onclick = () => { Modal.open({ title: 'نشر إعلان عام جديد للطلاب', contentHtml: ` 

عنوان الإعلان

الجمهور المستهدف كافة المستخدمين (الكل ��) الطلاب فقط �� المشتركون فقط �� المساعدون التعليميون ��️

نص الإعلان بالتفصيل

نشر الإعلان الآن �� ` }); document.getElementById('form-ann-save').addEventListener('submit', async (e) => { e.preventDefault(); try { await ApiClient.post('/announcements', { title: document.getElementById('m-ann-title').value.trim(), target_audience: document.getElementById('m-ann-aud').value, content: document.getElementById('m-ann-content').value.trim() }); Modal.close(); Toast.success('تم نشر الإعلان بنجاح ��'); loadAnnouncements(); } catch (err) { Toast.error(err.message); } }); }; } catch (err) { console.error(err); Toast.error('فشل تحميل قائمة الإعلانات'); } } await loadAnnouncements(); } /* =================================================================== 7. SUBSCRIPTION CODES MANAGEMENT =================================================================== */ static async renderSubscriptions(container) { container.innerHTML = ` 

## إدارة وتوليد أكواد الاشتراكات ��

إنشاء وتتبع أكواد التفعيل وتحديد مدد الصلاحية للطلاب

\+ توليد كود جديد

| كود الاشتراك | نوع المدة | الأيام | الحالة | المستخدم المستفيد | تاريخ التوليد | الإجراءات |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... |

`; async function loadCodes() { try { const res = await ApiClient.get('/subscriptions/codes'); const codes = res.codes || []; const tbody = document.getElementById('codes-table-body'); if (codes.length === 0) { tbody.innerHTML = 'لا توجد أكواد مولدة بعد.'; return; } tbody.innerHTML = codes.map(c => ` **${c.code}** ${c.duration_type} ${c.duration_days} يوم ${c.status === 'ACTIVE' ? 'نشط وغير مستخدم' : (c.status === 'USED' ? 'تم الاستخدام' : 'معطل / منتهي')} ${c.used_by || '—'} ${c.created_at ? c.created_at.substring(0, 10) : ''} نسخ `).join(''); document.querySelectorAll('.copy-code-btn').forEach(btn => { btn.addEventListener('click', () => { navigator.clipboard.writeText(btn.dataset.code); Toast.success(`تم نسخ الكود: ${btn.dataset.code}`); }); }); } catch (e) { Toast.error('فشل تحميل قائمة الأكواد'); } } await loadCodes(); document.getElementById('btn-generate-code').addEventListener('click', () => { Modal.open({ title: 'توليد كود اشتراك جديد', contentHtml: ` 

مدة الاشتراك شهر واحد (30 يوم) 3 أشهر (90 يوم) 6 أشهر (180 يوم) سنة كاملة (365 يوم) مدى الحياة (Lifetime)

كود مخصص (اختياري، اتركه فارغاً لتوليد كود تلقائي CS-XXXX-XXXX)

توليد الكود الآن �� ` }); document.getElementById('form-gen-code').addEventListener('submit', async (e) => { e.preventDefault(); const duration = document.getElementById('gen-duration').value; const custom = document.getElementById('gen-custom-code').value.trim() || null; try { const res = await ApiClient.post('/subscriptions/codes/generate', { duration_type: duration, custom_code: custom }); Modal.close(); Toast.success(`تم توليد الكود بنجاح: ${res.code.code}`); loadCodes(); } catch (err) { Toast.error(err.message); } }); }); } /* =================================================================== 8. ASSISTANTS & PERMISSIONS MANAGEMENT =================================================================== */ static async renderAssistants(container) { container.innerHTML = ` 

## إدارة المساعدين التعليميين والصلاحيات ��️

تخصيص صلاحيات الوصول التفصيلية لكل مساعد تعليمي

\+ إضافة مساعد جديد

`; async function loadAssistants() { try { const res = await ApiClient.get('/assistants'); const assistants = res.assistants || []; const availPerms = res.available_permissions || {}; const grid = document.getElementById('assistants-cards-grid'); if (assistants.length === 0) { grid.innerHTML = '

لا يوجد مساعدين مسجلين حالياً.

'; return; } grid.innerHTML = assistants.map(a => ` 

### ${a.full_name}

اسم المستخدم: ${a.username} • البريد: ${a.email}

تعديل الصلاحيات ✏️ حذف

#### الصلاحيات المفعلة حالياً:

${a.permissions && a.permissions.length > 0 ? a.permissions.map(p => ` ${availPerms[p] || p} `).join('') : 'لا توجد صلاحيات مفعلة'}

`).join(''); document.querySelectorAll('.edit-perms-btn').forEach(btn => { btn.addEventListener('click', () => { const asstId = btn.dataset.asstId; const asst = assistants.find(x => x.id === asstId); if (!asst) return; const currentPerms = asst.permissions || []; Modal.open({ title: `تعديل صلاحيات المساعد: ${asst.full_name}`, contentHtml: ` 

${Object.entries(availPerms).map(([key, label]) => ` ${label} `).join('')}

حفظ الصلاحيات ` }); document.getElementById('form-edit-perms').addEventListener('submit', async (e) => { e.preventDefault(); const checked = Array.from(document.querySelectorAll('input[name="asst_perm"]:checked')).map(cb => cb.value); try { await ApiClient.put(`/assistants/${asstId}/permissions`, { permissions: checked }); Modal.close(); Toast.success('تم تحديث صلاحيات المساعد بنجاح'); loadAssistants(); } catch (err) { Toast.error(err.message); } }); }); }); document.querySelectorAll('.del-asst-btn').forEach(btn => { btn.addEventListener('click', () => { Modal.confirm({ title: 'حذف المساعد', message: 'هل أنت متأكد من حذف حساب هذا المساعد وسحب كافة صلاحياته؟', onConfirm: async () => { await ApiClient.delete(`/assistants/${btn.dataset.asstId}`); Toast.success('تم حذف المساعد'); loadAssistants(); } }); }); }); } catch (err) { Toast.error('فشل تحميل قائمة المساعدين'); } } await loadAssistants(); document.getElementById('btn-add-assistant').addEventListener('click', () => { Modal.open({ title: 'إضافة مساعد تعليمي جديد', contentHtml: ` 

الاسم بالكامل

اسم المستخدم

البريد الإلكتروني

كلمة المرور

إنشاء الحساب ` }); document.getElementById('form-new-asst').addEventListener('submit', async (e) => { e.preventDefault(); try { await ApiClient.post('/assistants', { full_name: document.getElementById('asst-name').value, username: document.getElementById('asst-user').value, email: document.getElementById('asst-email').value, password: document.getElementById('asst-pass').value, permissions: ["questions.read", "questions.create", "exams.read", "exams.create"] }); Modal.close(); Toast.success('تم إضافة المساعد التعليمي بنجاح'); loadAssistants(); } catch (err) { Toast.error(err.message); } }); }); } /* =================================================================== 9. STUDENTS MANAGEMENT =================================================================== */ static async renderStudents(container) { container.innerHTML = ` 

## إدارة الطلاب المسجلين ��

متابعة حسابات واشتراكات وتقدم الطلاب

| الطالب | اسم المستخدم | البريد الإلكتروني | حالة الاشتراك | النقاط (XP) | تاريخ التسجيل | الحالة |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... |

`; try { const res = await ApiClient.get('/students'); const students = res.students || []; const tbody = document.getElementById('students-table-body'); if (students.length === 0) { tbody.innerHTML = 'لا يوجد طلاب مسجلون بعد.'; return; } tbody.innerHTML = students.map(s => ` **${s.full_name}** ${s.username} ${s.email} ${s.is_subscribed ? 'مشترك نشط ��' : 'خطة مجانية'} ${s.stats?.xp || 0} XP ${s.created_at ? s.created_at.substring(0, 10) : ''} ${s.is_active ? 'نشط ✅' : 'معطل ❌'} `).join(''); document.querySelectorAll('.toggle-student-btn').forEach(btn => { btn.addEventListener('click', async () => { try { const res = await ApiClient.put(`/students/${btn.dataset.id}/toggle-active`); Toast.success(res.is_active ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب'); AdminPages.renderStudents(container); } catch (e) { Toast.error(e.message); } }); }); } catch (e) { Toast.error('فشل تحميل قائمة الطلاب'); } } /* =================================================================== 10. SUBSCRIPTION REQUESTS MANAGEMENT (ADMIN & ASSISTANTS) =================================================================== */ static async renderSubscriptionRequests(container) { container.innerHTML = ` 

## �� مراجعة واعتماد طلبات تفعيل الاشتراكات

متابعة تحويلات InstaPay وإيصالات الطلاب واعتماد تفعيل الحسابات فورياً

[⚙️ إعدادات الباقات وأرقام الدفع](#/admin/settings) [�� أكواد الاشتراكات](#/admin/subscriptions)

جميع الحالات قيد المراجعة والانتظار (Pending) ⏳ المعتمدة والمفعلة (Approved) ✅ المرفوضة (Rejected) ❌

| الطالب | الهاتف | الباقة والمدة | المبلغ المسدد | رقم العملية / المرجع | الإيصال المرفق | تاريخ التحويل | الحالة | الإجراءات |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... |

### معاينة إيصال التحويل ��️

✕ إغلاق

`; const proofModal = document.getElementById('proof-modal'); const proofImg = document.getElementById('proof-modal-img'); const proofCaption = document.getElementById('proof-modal-caption'); document.getElementById('close-proof-modal')?.addEventListener('click', () => { if (proofModal) proofModal.style.display = 'none'; }); proofModal?.addEventListener('click', (e) => { if (e.target === proofModal) proofModal.style.display = 'none'; }); async function loadRequests() { const status = document.getElementById('filter-sub-req-status')?.value || ''; const search = document.getElementById('filter-sub-req-search')?.value.toLowerCase().trim() || ''; let url = '/subscriptions/requests'; if (status) url += `?status_filter=${status}`; try { const requests = await ApiClient.get(url); const tbody = document.getElementById('sub-req-table-body'); let filtered = requests || []; if (search) { filtered = filtered.filter(r => (r.student_name && r.student_name.toLowerCase().includes(search)) || (r.student_email && r.student_email.toLowerCase().includes(search)) || (r.phone && r.phone.includes(search)) || (r.payment_reference && r.payment_reference.toLowerCase().includes(search)) ); } if (filtered.length === 0) { tbody.innerHTML = 'لا توجد طلبات تطابق الفلتر المحدد.'; return; } tbody.innerHTML = filtered.map(r => ` **${r.student_name || 'طالب'}** 

${r.student_email}

${r.phone || '—'} ${r.package_name} ${r.duration_months ? `

${r.duration_months} أشهر

` : ''} ${r.amount ? `${r.amount} ج.م` : '—'} ${r.payment_reference} ${r.admin_notes ? `

ملاحظة: ${r.admin_notes}

` : ''} ${r.proof_file_url ? ` ��️ عرض الإيصال ` : 'بدون إيصال'} ${r.transfer_date || r.created_at?.substring(0, 10)} ${r.status === 'APPROVED' ? 'معتمد ومفعل ✅' : (r.status === 'PENDING' ? 'قيد الانتظار ⏳' : 'مرفوض ❌')} 

${r.status === 'PENDING' ? ` اعتماد ✅ رفض ❌ ` : ` تم اتخاذ القرار `}

`).join(''); document.querySelectorAll('.view-proof-btn').forEach(btn => { btn.addEventListener('click', () => { if (proofImg && proofModal) { proofImg.src = btn.dataset.url; if (proofCaption) proofCaption.textContent = `إيصال الطالب: ${btn.dataset.name} | رقم المرجع: ${btn.dataset.ref}`; proofModal.style.display = 'flex'; } }); }); document.querySelectorAll('.approve-req-btn').forEach(btn => { btn.addEventListener('click', () => { const reqId = btn.dataset.id; Modal.confirm({ title: 'تأكيد اعتماد وتفعيل الاشتراك', message: 'هل أنت متأكد من صحة التحويل؟ سيتم تفعيل حساب الطالب في قاعدة البيانات فوراً وفتح كافة المناهج والامتحانات.', onConfirm: async () => { try { const res = await ApiClient.post(`/subscriptions/requests/${reqId}/approve`); Toast.success(res.message || 'تم اعتماد وتفعيل الاشتراك بنجاح ��'); loadRequests(); } catch (err) { Toast.error(err.message); } } }); }); }); document.querySelectorAll('.reject-req-btn').forEach(btn => { btn.addEventListener('click', () => { const reqId = btn.dataset.id; const reason = prompt('أدخل سبب رفض الطلب لإخطار الطالب به:', 'بيانات التحويل غير مطابقة أو العملية غير مكتملة'); if (reason !== null) { ApiClient.post(`/subscriptions/requests/${reqId}/reject`, { rejection_reason: reason.trim() || 'بيانات التحويل غير صحيحة' }) .then(res => { Toast.success('تم رفض الطلب وإخطار الطالب'); loadRequests(); }) .catch(err => Toast.error(err.message)); } }); }); } catch (err) { console.error(err); Toast.error('فشل تحميل قائمة طلبات الاشتراكات'); } } document.getElementById('filter-sub-req-status')?.addEventListener('change', loadRequests); document.getElementById('filter-sub-req-search')?.addEventListener('input', debounce(loadRequests, 300)); await loadRequests(); } /* =================================================================== 11. ADMIN PLATFORM SETTINGS & 11-PLAN SUBSCRIPTION MANAGEMENT =================================================================== */ static async renderSettings(container) { container.innerHTML = ` 

## ⚙️ إعدادات المنصة وإدارة باقات الاشتراكات

تحكم كامل في أرقام التحويل المعتمدة وتعديل أسعار ومدد باقات الاشتراكات (1 إلى 11 شهراً)

### �� رقم التحويل وبيانات السداد (InstaPay / المحافظ)

الرقم الذي يظهر لجميع الطلاب في صفحة الاشتراك. عند تعديل هذا الرقم يتم حفظه في قاعدة البيانات ويظهر تلقائياً للطلاب فوراً دون الحاجة لتعديل أي كود برمجي.

رقم التحويل المعتمد للطلاب (Transfer/Payment Phone) *

رقم التواصل والدعم الفني (WhatsApp Phone)

الرابط المباشر لتطبيق InstaPay

�� حفظ بيانات الدفع في قاعدة البيانات

### �� إدارة باقات الاشتراكات الأكاديمية (11 باقة معتمدة)

يمكنك تعديل أسعار الباقات أو تفعيلها/تعطيلها. المعاملات السابقة تظل محمية بالمبلغ الأصلي المسدد.

\+ إضافة باقة اشتراك جديدة

| المدة (شهور) | اسم الباقة | السعر (ج.م) | ترتيب العرض | الحالة | إجمالي الطلبات | الإجراءات |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| جاري تحميل الباقات... | جاري تحميل الباقات... | جاري تحميل الباقات... | جاري تحميل الباقات... | جاري تحميل الباقات... | جاري تحميل الباقات... | جاري تحميل الباقات... |

### إضافة باقة اشتراك جديدة

✕

اسم الباقة *

المدة بالشهور *

السعر (ج.م) *

ترتيب العرض

إلغاء حفظ الباقة الجديدة ✨

`; async function loadPaymentSettings() { try { const sett = await ApiClient.get('/subscriptions/payment-info'); const phoneInput = document.getElementById('admin-set-payment-phone'); const contactInput = document.getElementById('admin-set-contact-phone'); const linkInput = document.getElementById('admin-set-instapay-link'); if (phoneInput && sett.payment_phone) phoneInput.value = sett.payment_phone; if (contactInput && sett.contact_phone) contactInput.value = sett.contact_phone; if (linkInput && sett.instapay_link) linkInput.value = sett.instapay_link; } catch (e) { console.error(e); } } document.getElementById('admin-payment-settings-form')?.addEventListener('submit', async (e) => { e.preventDefault(); const phoneVal = document.getElementById('admin-set-payment-phone').value.trim(); const contactVal = document.getElementById('admin-set-contact-phone').value.trim(); const linkVal = document.getElementById('admin-set-instapay-link').value.trim(); const btn = document.getElementById('btn-save-payment-settings'); btn.disabled = true; btn.textContent = 'جاري الحفظ...'; try { const res = await ApiClient.put('/subscriptions/admin/payment-info', { payment_phone: phoneVal, contact_phone: contactVal, instapay_link: linkVal }); Toast.success(res.message || 'تم تحديث بيانات التحويل بنجاح! ستظهر للطلاب فوراً.'); } catch (err) { Toast.error(err.message || 'تعذر تحديث بيانات التحويل'); } finally { btn.disabled = false; btn.textContent = '�� حفظ بيانات الدفع في قاعدة البيانات'; } }); async function loadAdminPlans() { const tbody = document.getElementById('admin-plans-table-body'); try { const plans = await ApiClient.get('/subscriptions/admin/plans'); if (!plans || plans.length === 0) { tbody.innerHTML = 'لا توجد باقات معرفة.'; return; } tbody.innerHTML = plans.map(p => ` ${p.duration_months} شهر 

ج.م

${p.is_active ? 'مفعلة ✅' : 'معطلة ❌'} ${p.total_requests || 0} طلب 

حفظ �� حذف ��️

`).join(''); tbody.querySelectorAll('tr').forEach(tr => { const planId = tr.dataset.planId; const nameInput = tr.querySelector('.plan-name-input'); const priceInput = tr.querySelector('.plan-price-input'); const orderInput = tr.querySelector('.plan-order-input'); const toggleBtn = tr.querySelector('.toggle-plan-active-btn'); const saveBtn = tr.querySelector('.save-plan-row-btn'); const delBtn = tr.querySelector('.delete-plan-row-btn'); toggleBtn?.addEventListener('click', async () => { const currentActive = toggleBtn.dataset.active === '1'; const newActive = !currentActive; try { await ApiClient.put(`/subscriptions/admin/plans/${planId}`, { is_active: newActive }); Toast.success(newActive ? 'تم تفعيل الباقة بنجاح' : 'تم تعطيل الباقة بنجاح'); loadAdminPlans(); } catch (err) { Toast.error(err.message); } }); saveBtn?.addEventListener('click', async () => { const newName = nameInput.value.trim(); const newPrice = parseFloat(priceInput.value); const newOrder = parseInt(orderInput.value) || 0; if (!newName || isNaN(newPrice) || newPrice < 0) { Toast.error('يرجى إدخال اسم وسعر صحيح'); return; } saveBtn.disabled = true; saveBtn.textContent = '...'; try { await ApiClient.put(`/subscriptions/admin/plans/${planId}`, { name: newName, price: newPrice, order_index: newOrder }); Toast.success('تم حفظ تعديلات الباقة بنجاح!'); } catch (err) { Toast.error(err.message); } finally { saveBtn.disabled = false; saveBtn.textContent = 'حفظ ��'; } }); delBtn?.addEventListener('click', () => { Modal.confirm({ title: 'تأكيد إزالة أو تعطيل الباقة', message: 'هل تريد إزالة هذه الباقة؟ إذا كانت هناك طلبات سابقة مسجلة بها، فسيتم تعطيلها بأمان للحفاظ على سجلات الطلاب.', onConfirm: async () => { try { const res = await ApiClient.delete(`/subscriptions/admin/plans/${planId}`); Toast.success(res.message || 'تم حذف الباقة بنجاح'); loadAdminPlans(); } catch (err) { Toast.error(err.message); } } }); }); }); } catch (err) { console.error(err); tbody.innerHTML = 'فشل تحميل الباقات'; } } const addPlanModal = document.getElementById('add-plan-modal'); document.getElementById('btn-open-add-plan-modal')?.addEventListener('click', () => { if (addPlanModal) addPlanModal.style.display = 'flex'; }); document.getElementById('close-add-plan-modal')?.addEventListener('click', () => { if (addPlanModal) addPlanModal.style.display = 'none'; }); document.getElementById('cancel-add-plan')?.addEventListener('click', () => { if (addPlanModal) addPlanModal.style.display = 'none'; }); document.getElementById('form-add-new-plan')?.addEventListener('submit', async (e) => { e.preventDefault(); const name = document.getElementById('new-plan-name').value.trim(); const months = parseInt(document.getElementById('new-plan-months').value); const price = parseFloat(document.getElementById('new-plan-price').value); const order = parseInt(document.getElementById('new-plan-order').value) || months; if (!name || isNaN(months) || isNaN(price)) { Toast.error('يرجى ملء جميع الحقول المطلوبة بشكل صحيح'); return; } try { const res = await ApiClient.post('/subscriptions/admin/plans', { name: name, duration_months: months, price: price, order_index: order }); Toast.success(res.message || 'تمت إضافة الباقة بنجاح! ✨'); if (addPlanModal) addPlanModal.style.display = 'none'; document.getElementById('form-add-new-plan').reset(); loadAdminPlans(); } catch (err) { Toast.error(err.message || 'تعذر إنشاء الباقة'); } }); await Promise.all([loadPaymentSettings(), loadAdminPlans()]); } }