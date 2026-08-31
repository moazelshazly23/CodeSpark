// Code Spark Assistant Views Suite
// Complete Dedicated Assistant Dashboard for Teaching Assistants
(function() {
  window.AssistantViews = {

    // ==========================================
    // 1. ASSISTANT DASHBOARD OVERVIEW
    // ==========================================
    async renderDashboard(assistant) {
      let stats = {};
      let tickets = [];
      let exams = [];
      try {
        stats = await window.AssistantService.getDashboardStats();
        tickets = await window.AssistantService.getStudentQuestions('open');
        exams = await window.AssistantService.getExams();
      } catch (err) {
        console.warn('Error loading assistant dashboard:', err);
      }

      const totalStudents = stats.totalStudents || 0;
      const activeStudents = stats.activeStudents || 0;
      const questionsCount = stats.questionsCount || 0;
      const examsCount = exams.length || stats.examsCount || 0;
      const pendingTickets = tickets.filter(t => t.status === 'open').length;

      return `
        <div class="content-body">
          <!-- Welcome Banner -->
          <div class="card card-glass" style="margin-bottom:2rem; padding:2rem; background:linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%); border-color:rgba(147, 51, 234, 0.3);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1.5rem;">
              <div>
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
                  <span class="badge badge-purple" style="font-size:0.8125rem; font-weight:700;">👨🏫 لوحة المساعد الأكاديمي</span>
                  <span class="badge badge-cyan" style="font-size:0.8125rem;">CodeSpark Assistant</span>
                </div>
                <h1 style="font-size:1.875rem; font-weight:800; margin:0 0 0.5rem 0; color:var(--text-main);">
                  مرحبًا بك، ${assistant.name || 'المساعد الأكاديمي'} ⚡
                </h1>
                <p style="color:var(--text-muted); font-size:0.9375rem; max-width:650px; margin:0; line-height:1.6;">
                  مساحة العمل الخاصة بك لمتابعة أسئلة الطلاب، إعداد الامتحانات، تنظيم بنك الأسئلة، وتوليد الأكواد والتمارين البرمجية.
                </p>
              </div>
              <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
                <a href="#assistant-code" class="btn btn-primary btn-sm">${Icons.terminal ? Icons.terminal() : '💻'} توليد كود جديد</a>
                <a href="#assistant-questions" class="btn btn-secondary btn-sm">${Icons.helpCircle()} أسئلة الطلاب (${pendingTickets})</a>
              </div>
            </div>
          </div>

          <!-- KPI Cards -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1.25rem; margin-bottom:2rem;">
            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-cyan">${Icons.users()}</div>
              <div>
                <div class="stat-value">${totalStudents}</div>
                <div class="stat-label">إجمالي الطلاب (${activeStudents} نشط)</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-purple">${Icons.award()}</div>
              <div>
                <div class="stat-value">${examsCount}</div>
                <div class="stat-label">الامتحانات والاختبارات</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-blue">${Icons.book()}</div>
              <div>
                <div class="stat-value">${questionsCount}</div>
                <div class="stat-label">أسئلة بنك الأسئلة</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-amber">${Icons.helpCircle()}</div>
              <div>
                <div class="stat-value">${pendingTickets}</div>
                <div class="stat-label">استفسارات تنتظر الرد</div>
              </div>
            </div>
          </div>

          <!-- Quick Navigation Actions -->
          <h2 style="font-size:1.25rem; font-weight:800; margin-bottom:1rem; color:var(--text-main);">المهام والوظائف المتاحة</h2>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1.25rem; margin-bottom:2.5rem;">
            
            <a href="#assistant-code" class="card card-glass card-hover" style="text-decoration:none; padding:1.5rem; display:flex; gap:1rem; align-items:flex-start;">
              <div class="stat-icon-wrapper stat-icon-cyan" style="width:48px; height:48px; font-size:1.35rem; flex-shrink:0;">
                ⚡
              </div>
              <div>
                <div style="font-weight:800; font-size:1.05rem; color:var(--text-main); margin-bottom:0.35rem;">توليد واختبار الأكواد</div>
                <p style="font-size:0.8125rem; color:var(--text-muted); margin:0; line-height:1.5;">توليد أكواد وتمارين بايثون وتجربتها في بيئة معزولة ونقلها لبنك الأسئلة.</p>
              </div>
            </a>

            <a href="#assistant-questions" class="card card-glass card-hover" style="text-decoration:none; padding:1.5rem; display:flex; gap:1rem; align-items:flex-start;">
              <div class="stat-icon-wrapper stat-icon-purple" style="width:48px; height:48px; font-size:1.35rem; flex-shrink:0;">
                💬
              </div>
              <div>
                <div style="font-weight:800; font-size:1.05rem; color:var(--text-main); margin-bottom:0.35rem;">أسئلة واستفسارات الطلاب</div>
                <p style="font-size:0.8125rem; color:var(--text-muted); margin:0; line-height:1.5;">مراجعة استفسارات الطلاب البرمجية، الرد عليها، وتقديم تلميحات الشرح.</p>
              </div>
            </a>

            <a href="#assistant-exams" class="card card-glass card-hover" style="text-decoration:none; padding:1.5rem; display:flex; gap:1rem; align-items:flex-start;">
              <div class="stat-icon-wrapper stat-icon-blue" style="width:48px; height:48px; font-size:1.35rem; flex-shrink:0;">
                📝
              </div>
              <div>
                <div style="font-weight:800; font-size:1.05rem; color:var(--text-main); margin-bottom:0.35rem;">إدارة نماذج الامتحانات</div>
                <p style="font-size:0.8125rem; color:var(--text-muted); margin:0; line-height:1.5;">إنشاء وتعديل نماذج الاختبارات وتحديد درجات النجاح وعدد الأسئلة.</p>
              </div>
            </a>

            <a href="#assistant-bank" class="card card-glass card-hover" style="text-decoration:none; padding:1.5rem; display:flex; gap:1rem; align-items:flex-start;">
              <div class="stat-icon-wrapper stat-icon-green" style="width:48px; height:48px; font-size:1.35rem; flex-shrink:0;">
                ❓
              </div>
              <div>
                <div style="font-weight:800; font-size:1.05rem; color:var(--text-main); margin-bottom:0.35rem;">بنك الأسئلة الشامل</div>
                <p style="font-size:0.8125rem; color:var(--text-muted); margin:0; line-height:1.5;">إضافة وتصنيف الأسئلة وتحديد مستويات الصعوبة وشروحات الإجابة.</p>
              </div>
            </a>

            <a href="#assistant-students" class="card card-glass card-hover" style="text-decoration:none; padding:1.5rem; display:flex; gap:1rem; align-items:flex-start;">
              <div class="stat-icon-wrapper stat-icon-cyan" style="width:48px; height:48px; font-size:1.35rem; flex-shrink:0;">
                👨🎓
              </div>
              <div>
                <div style="font-weight:800; font-size:1.05rem; color:var(--text-main); margin-bottom:0.35rem;">متابعة الطلاب والتقدم</div>
                <p style="font-size:0.8125rem; color:var(--text-muted); margin:0; line-height:1.5;">مشاهدة الطلاب المسجلين والبحث في مستويات تقدمهم وإنجاز الدروس.</p>
              </div>
            </a>

            <a href="#assistant-grades" class="card card-glass card-hover" style="text-decoration:none; padding:1.5rem; display:flex; gap:1rem; align-items:flex-start;">
              <div class="stat-icon-wrapper stat-icon-amber" style="width:48px; height:48px; font-size:1.35rem; flex-shrink:0;">
                📊
              </div>
              <div>
                <div style="font-weight:800; font-size:1.05rem; color:var(--text-main); margin-bottom:0.35rem;">نتائج ودرجات الامتحانات</div>
                <p style="font-size:0.8125rem; color:var(--text-muted); margin:0; line-height:1.5;">مراجعة نتائج الاختبارات ونقاط القوة والضعف لكل طالب.</p>
              </div>
            </a>

          </div>

          <!-- Pending Questions Section -->
          <div class="card card-glass" style="padding:1.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
              <h3 style="font-size:1.15rem; font-weight:800; margin:0;">استفسارات الطلاب المعلقة حديثًا</h3>
              <a href="#assistant-questions" class="btn btn-ghost btn-sm">عرض جميع الأسئلة ←</a>
            </div>
            ${tickets.length === 0 ? `
              <div style="text-align:center; padding:2rem; color:var(--text-muted);">
                <div style="font-size:2rem; margin-bottom:0.5rem;">🎉</div>
                <div style="font-weight:700; color:var(--text-main);">لا توجد استفسارات معلقة حاليًا</div>
                <div style="font-size:0.8125rem;">تم الرد على جميع أسئلة الطلاب بنجاح.</div>
              </div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:0.75rem;">
                ${tickets.slice(0, 4).map(t => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:0.875rem 1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); border:1px solid var(--border-subtle); flex-wrap:wrap; gap:0.75rem;">
                    <div>
                      <div style="font-weight:700; font-size:0.9375rem; color:var(--text-main); margin-bottom:0.25rem;">${t.subject}</div>
                      <div style="font-size:0.8125rem; color:var(--text-muted);">الطالب: <strong>${t.student_name || 'طالب'}</strong> • ${t.created_at ? new Date(t.created_at).toLocaleDateString('ar-EG') : ''}</div>
                    </div>
                    <a href="#assistant-questions" class="btn btn-secondary btn-sm">الرد على السؤال ✉️</a>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

        </div>
      `;
    },

    // ==========================================
    // 2. CODE GENERATOR & PYTHON SANDBOX
    // ==========================================
    async renderCodeGenerator(assistant) {
      return `
        <div class="content-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-cyan" style="margin-bottom:0.35rem;">⚡ أداة المساعد الذكية</div>
              <h1 style="font-size:1.875rem; font-weight:800; margin:0;">توليد واختبار الأكواد البرمجية (Code Generator)</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">توليد تمارين بايثون نموذجية مع كود البداية وحالات الاختبار وتشغيلها في بيئة معزولة.</p>
            </div>
          </div>

          <!-- Code Generator Controls -->
          <div class="card card-glass" style="padding:1.5rem; margin-bottom:1.5rem;">
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; align-items:flex-end;">
              <div class="form-group">
                <label class="form-label">المفهوم / الموضوع البرمجي</label>
                <select id="gen-topic" class="form-select">
                  <option value="variables">المتغيرات وأنواع البيانات (Variables & Types)</option>
                  <option value="conditions">الجمل الشرطية (if / elif / else)</option>
                  <option value="loops">حلقات التكرار (for & while loops)</option>
                  <option value="lists">القوائم والمصفوفات (Python Lists)</option>
                  <option value="functions">الدوال المخصصة (def Functions)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">مستوى الصعوبة</label>
                <select id="gen-level" class="form-select">
                  <option value="beginner">مبتدئ (الصف الأول الثانوي)</option>
                  <option value="intermediate">متوسط (الصف الثاني الثانوي)</option>
                  <option value="advanced">متقدم (تطبيقات وخوارزميات)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">نوع المخرج</label>
                <select id="gen-type" class="form-select">
                  <option value="exercise">تدريب برمجي مع كود بداية وحالات اختبار</option>
                  <option value="solution">كود نموذجي كامل مع الشرح</option>
                  <option value="quiz">سؤال تدريبي لاختبار الفهم</option>
                </select>
              </div>

              <button type="button" id="trigger-gen-btn" class="btn btn-primary" style="height:42px;">
                ⚡ توليد الكود الآن
              </button>
            </div>
          </div>

          <!-- Code & IDE Section -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem;" class="code-generator-grid">
            
            <!-- Code Editor Box -->
            <div class="card card-glass" style="padding:1.5rem; display:flex; flex-direction:column;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <div style="font-weight:700; font-size:1rem; color:var(--text-main);" id="gen-title-display">
                  محرر الكود البرمجي (Python)
                </div>
                <div style="display:flex; gap:0.5rem;">
                  <button type="button" id="copy-code-btn" class="btn btn-ghost btn-sm" title="نسخ الكود">📋 نسخ</button>
                  <button type="button" id="run-code-btn" class="btn btn-success btn-sm">▶ تشغيل الكود</button>
                </div>
              </div>

              <textarea id="gen-code-editor" class="form-input" style="font-family:monospace; font-size:0.9375rem; min-height:280px; direction:ltr; text-align:left; background:#0B1120; color:#38BDF8; line-height:1.5; resize:vertical;" placeholder="# اكتب كود بايثون هنا أو استخدم التوليد التلقائي..."></textarea>

              <div style="margin-top:1rem;">
                <label class="form-label" style="font-size:0.8125rem;">المدخلات الافتراضية (Mock Inputs - قيمة لكل سطر):</label>
                <input type="text" id="gen-mock-inputs" class="form-input" placeholder="85, 90" style="direction:ltr; font-family:monospace; font-size:0.875rem;">
              </div>
            </div>

            <!-- Terminal Output & Explanation -->
            <div class="card card-glass" style="padding:1.5rem; display:flex; flex-direction:column;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <div style="font-weight:700; font-size:1rem; color:var(--text-main);">
                  شاشة المخرجات (Terminal Output)
                </div>
                <span id="gen-exec-time" class="badge badge-neutral" style="font-size:0.75rem;">0 ms</span>
              </div>

              <div id="gen-terminal-output" style="background:#070B14; border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:1rem; font-family:monospace; font-size:0.875rem; direction:ltr; text-align:left; min-height:160px; color:#A7F3D0; white-space:pre-wrap; overflow-y:auto; flex:1;">
> Ready. Press 'تشغيل الكود' to execute.
              </div>

              <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid var(--border-subtle);">
                <div style="font-weight:700; font-size:0.875rem; margin-bottom:0.35rem; color:var(--cyan);">💡 الشرح والهدف التعليمي:</div>
                <div id="gen-explanation-box" style="font-size:0.8125rem; color:var(--text-muted); line-height:1.6;">
                  اختر موضوعًا من القائمة العلوية واضغط على 'توليد الكود الآن' لعرض الشرح وحالات الاختبار المقترحة.
                </div>
              </div>
            </div>

          </div>
        </div>
      `;
    },

    // ==========================================
    // 3. STUDENT QUESTIONS (Support Tickets)
    // ==========================================
    async renderStudentQuestions(assistant) {
      let tickets = [];
      try {
        tickets = await window.AssistantService.getStudentQuestions();
      } catch (err) {
        console.warn('Error loading student questions:', err);
      }

      return `
        <div class="content-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-purple" style="margin-bottom:0.35rem;">💬 الدعم والمتابعة الأكاديمية</div>
              <h1 style="font-size:1.875rem; font-weight:800; margin:0;">أسئلة واستفسارات الطلاب</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">متابعة استفسارات الطلاب حول الدروس والتمارين وتقديم الشروحات والإجابات النموذجية.</p>
            </div>
            <select id="assistant-ticket-status-filter" class="form-select" style="width:auto;">
              <option value="">جميع الاستفسارات</option>
              <option value="open" selected>المعلقة فقط (Open)</option>
              <option value="closed">المجابة والمغلقة</option>
            </select>
          </div>

          <div id="assistant-tickets-container" style="display:flex; flex-direction:column; gap:1rem;">
            ${this.renderTicketsList(tickets)}
          </div>

          <!-- Reply Modal -->
          <div id="assistant-reply-modal" class="modal-overlay" style="display:none;">
            <div class="card card-glass" style="max-width:600px; width:100%; padding:2rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <h3 style="font-size:1.25rem; font-weight:800;" id="reply-modal-subject">الرد على سؤال الطالب</h3>
                <button class="btn btn-ghost btn-icon-sm close-modal-btn">${Icons.x()}</button>
              </div>
              <div id="reply-modal-student-msg" style="padding:1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); font-size:0.875rem; color:var(--text-muted); margin-bottom:1.5rem; line-height:1.6;">
              </div>
              <form id="assistant-reply-form">
                <input type="hidden" id="reply-ticket-id">
                <div class="form-group" style="margin-bottom:1.5rem;">
                  <label class="form-label">نص الإجابة والتوضيح للطالب <span style="color:var(--danger);">*</span></label>
                  <textarea id="reply-text-input" class="form-input" rows="5" placeholder="اكتب ردًا واضحًا ومفصلًا للطالب مع تلميحات برمجية..." required></textarea>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
                  <button type="button" class="btn btn-secondary close-modal-btn">إلغاء</button>
                  <button type="submit" class="btn btn-primary" id="send-reply-submit-btn">إرسال الرد للطالب ✉️</button>
                </div>
              </form>
            </div>
          </div>

        </div>
      `;
    },

    renderTicketsList(tickets) {
      if (!tickets || tickets.length === 0) {
        return `
          <div class="card card-glass" style="text-align:center; padding:3rem; color:var(--text-muted);">
            <div style="font-size:2.5rem; margin-bottom:0.75rem;">🎉</div>
            <div style="font-weight:700; font-size:1.1rem; color:var(--text-main);">لا توجد استفسارات مطابقة</div>
            <div style="font-size:0.875rem; margin-top:0.25rem;">تم الرد على جميع الاستفسارات أو لا يوجد أسئلة جديدة.</div>
          </div>
        `;
      }

      return tickets.map(t => {
        const isOpen = t.status === 'open';
        const dateStr = t.created_at ? new Date(t.created_at).toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' }) : '';
        return `
          <div class="card card-glass" style="padding:1.5rem; border-color:${isOpen ? 'rgba(234, 179, 8, 0.3)' : 'var(--border-subtle)'};">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; flex-wrap:wrap; gap:0.75rem;">
              <div>
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
                  <span class="badge ${isOpen ? 'badge-amber' : 'badge-success'}" style="font-size:0.75rem;">
                    ${isOpen ? '⏳ بانتظار الإجابة' : '✓ تم الرد'}
                  </span>
                  <span style="font-size:0.8125rem; color:var(--text-muted);">${dateStr}</span>
                </div>
                <h3 style="font-size:1.15rem; font-weight:800; margin:0 0 0.25rem 0; color:var(--text-main);">${t.subject}</h3>
                <div style="font-size:0.8125rem; color:var(--text-muted);">الطالب: <strong style="color:var(--cyan);">${t.student_name || 'طالب'}</strong></div>
              </div>
              <div style="display:flex; gap:0.5rem;">
                <button class="btn btn-primary btn-sm open-reply-modal-btn" data-id="${t.id}" data-subject="${t.subject}" data-msg="${t.message || ''}">
                  ${isOpen ? 'الرد على السؤال ✉️' : 'تعديل الرد'}
                </button>
                <button class="btn btn-secondary btn-sm toggle-ticket-status-btn" data-id="${t.id}" data-status="${t.status}">
                  ${isOpen ? 'إغلاق التذكرة' : 'إعادة فتح'}
                </button>
              </div>
            </div>

            <div style="padding:1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); font-size:0.9375rem; color:var(--text-main); margin-bottom:${t.reply ? '1rem' : '0'}; line-height:1.6;">
              ${t.message}
            </div>

            ${t.reply ? `
              <div style="padding:1rem; background:rgba(6, 182, 212, 0.08); border-right:3px solid var(--cyan); border-radius:var(--radius-md); font-size:0.875rem; color:var(--text-main); line-height:1.6;">
                <div style="font-weight:700; color:var(--cyan); margin-bottom:0.25rem;">رد المساعد الأكاديمي:</div>
                ${t.reply}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    },

    // ==========================================
    // 4. EXAMS MANAGEMENT
    // ==========================================
    async renderExams(assistant) {
      let exams = [];
      let units = [];
      try {
        exams = await window.AssistantService.getExams();
        units = await window.AdminService.getUnits();
      } catch (err) {
        console.warn('Error loading exams:', err);
      }

      return `
        <div class="content-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-blue" style="margin-bottom:0.35rem;">📝 التقييم والاختبارات</div>
              <h1 style="font-size:1.875rem; font-weight:800; margin:0;">إدارة الامتحانات المدرسية</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">إنشاء وتعديل نماذج الاختبارات، تحديد وقت الامتحان، وتعيين درجات النجاح.</p>
            </div>
            <button class="btn btn-primary" id="ast-create-exam-btn">
              ${Icons.plus()} إنشاء امتحان جديد
            </button>
          </div>

          <!-- Exams List Table -->
          <div class="card card-glass" style="padding:0; overflow:hidden;">
            <div class="table-responsive">
              <table class="table" style="margin:0;">
                <thead>
                  <tr>
                    <th>عنوان الاختبار</th>
                    <th>الوحدة التابعة</th>
                    <th>المدة (دقيقة)</th>
                    <th>عدد الأسئلة</th>
                    <th>درجة النجاح</th>
                    <th>المحاولات</th>
                    <th style="text-align:left;">الإجراءات</th>
                  </tr>
                </thead>
                <tbody id="ast-exams-table-body">
                  ${this.renderExamsTableRows(exams)}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Create Exam Modal -->
          <div id="ast-exam-modal" class="modal-overlay" style="display:none;">
            <div class="card card-glass" style="max-width:560px; width:100%; padding:2rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <h3 style="font-size:1.25rem; font-weight:800;" id="ast-exam-modal-title">إنشاء امتحان جديد</h3>
                <button class="btn btn-ghost btn-icon-sm close-modal-btn">${Icons.x()}</button>
              </div>
              <form id="ast-exam-form">
                <input type="hidden" id="ast-exam-id">
                <div class="form-group" style="margin-bottom:1rem;">
                  <label class="form-label">عنوان الامتحان <span style="color:var(--danger);">*</span></label>
                  <input type="text" id="ast-exam-title" class="form-input" placeholder="مثال: اختبار نهاية الوحدة الأولى" required>
                </div>
                <div class="form-group" style="margin-bottom:1rem;">
                  <label class="form-label">الوحدة الدراسية</label>
                  <select id="ast-exam-unit" class="form-select">
                    <option value="">بدون وحدة محددة (شامل)</option>
                    ${units.map(u => `<option value="${u.id}">${u.title}</option>`).join('')}
                  </select>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
                  <div class="form-group">
                    <label class="form-label">مدة الاختبار (بالدقائق)</label>
                    <input type="number" id="ast-exam-duration" class="form-input" value="30" min="5" max="180">
                  </div>
                  <div class="form-group">
                    <label class="form-label">درجة النجاح (%)</label>
                    <input type="number" id="ast-exam-passing" class="form-input" value="60" min="10" max="100">
                  </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem;">
                  <div class="form-group">
                    <label class="form-label">عدد الأسئلة</label>
                    <input type="number" id="ast-exam-total-q" class="form-input" value="10" min="1" max="100">
                  </div>
                  <div class="form-group">
                    <label class="form-label">المحاولات المسموحة</label>
                    <input type="number" id="ast-exam-attempts" class="form-input" value="3" min="1" max="10">
                  </div>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
                  <button type="button" class="btn btn-secondary close-modal-btn">إلغاء</button>
                  <button type="submit" class="btn btn-primary" id="save-ast-exam-btn">حفظ الامتحان ⚡</button>
                </div>
              </form>
            </div>
          </div>

        </div>
      `;
    },

    renderExamsTableRows(exams) {
      if (!exams || exams.length === 0) {
        return `
          <tr>
            <td colspan="7" style="text-align:center; padding:3rem; color:var(--text-muted);">
              <div style="font-size:2rem; margin-bottom:0.5rem;">📝</div>
              <div style="font-weight:700; color:var(--text-main);">لا توجد امتحانات مسجلة حاليًا</div>
              <div style="font-size:0.8125rem;">اضغط على زر 'إنشاء امتحان جديد' لإعداد نموذج اختبار.</div>
            </td>
          </tr>
        `;
      }

      return exams.map(e => `
        <tr data-exam-id="${e.id}">
          <td>
            <div style="font-weight:700; color:var(--text-main); font-size:0.9375rem;">${e.title}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${e.description || 'اختبار تقييمي'}</div>
          </td>
          <td><span class="badge badge-neutral">${e.unit_title || e.unit_id || 'عام'}</span></td>
          <td>${e.duration_minutes || e.duration || 30} دقيقة</td>
          <td>${e.total_questions || 10} أسئلة</td>
          <td><span class="badge badge-success">${e.passing_score || 60}%</span></td>
          <td>${e.attempts_allowed || 3}</td>
          <td>
            <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
              <a href="#assistant-grades" class="btn btn-ghost btn-icon-sm" title="نتائج الطلاب">
                ${Icons.trendingUp()}
              </a>
              <button class="btn btn-ghost btn-icon-sm edit-ast-exam-btn" data-id="${e.id}" title="تعديل">
                ${Icons.edit()}
              </button>
              <button class="btn btn-ghost btn-icon-sm delete-ast-exam-btn" data-id="${e.id}" data-title="${e.title}" title="حذف" style="color:var(--danger);">
                ${Icons.trash()}
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    },

    // ==========================================
    // 5. QUESTION BANK
    // ==========================================
    async renderQuestionBank(assistant) {
      let questions = [];
      let units = [];
      try {
        questions = await window.AssistantService.getQuestions();
        units = await window.AdminService.getUnits();
      } catch (err) {
        console.warn('Error loading question bank:', err);
      }

      return `
        <div class="content-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-green" style="margin-bottom:0.35rem;">❓ بنك الأسئلة الأكاديمي</div>
              <h1 style="font-size:1.875rem; font-weight:800; margin:0;">بنك الأسئلة والتدريبات</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">إضافة وتنظيم وتصنيف أسئلة الاختيار من متعدد وأكواد بايثون وتحديد الإجابات النموذجية.</p>
            </div>
            <button class="btn btn-primary" id="ast-add-question-btn">
              ${Icons.plus()} إضافة سؤال جديد
            </button>
          </div>

          <!-- Filter & Search Bar -->
          <div class="card card-glass" style="padding:1.25rem; margin-bottom:1.5rem;">
            <div style="display:flex; gap:1rem; flex-wrap:wrap; align-items:center;">
              <div style="flex:1; min-width:240px; position:relative;">
                <input type="text" id="ast-q-search" class="form-input" placeholder="ابحث في نصوص الأسئلة والأكواد..." style="padding-right:2.5rem;">
                <span style="position:absolute; right:0.75rem; top:50%; transform:translateY(-50%); color:var(--text-muted);">${Icons.search()}</span>
              </div>
              <select id="ast-q-unit-filter" class="form-select" style="width:auto;">
                <option value="">جميع الوحدات</option>
                ${units.map(u => `<option value="${u.id}">${u.title}</option>`).join('')}
              </select>
              <select id="ast-q-diff-filter" class="form-select" style="width:auto;">
                <option value="">جميع المستويات</option>
                <option value="easy">سهل</option>
                <option value="medium">متوسط</option>
                <option value="hard">متقدم</option>
              </select>
            </div>
          </div>

          <!-- Questions List -->
          <div id="ast-questions-list-container" style="display:flex; flex-direction:column; gap:1rem;">
            ${this.renderQuestionsList(questions)}
          </div>

          <!-- Question Modal -->
          <div id="ast-question-modal" class="modal-overlay" style="display:none;">
            <div class="card card-glass" style="max-width:680px; width:100%; padding:2rem; max-height:90vh; overflow-y:auto;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <h3 style="font-size:1.25rem; font-weight:800;" id="ast-q-modal-title">إضافة سؤال جديد</h3>
                <button class="btn btn-ghost btn-icon-sm close-modal-btn">${Icons.x()}</button>
              </div>
              <form id="ast-question-form">
                <input type="hidden" id="ast-q-id">
                
                <div class="form-group" style="margin-bottom:1rem;">
                  <label class="form-label">نص السؤال <span style="color:var(--danger);">*</span></label>
                  <textarea id="ast-q-text" class="form-input" rows="3" placeholder="اكتب نص السؤال بدقة..." required></textarea>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem; margin-bottom:1rem;">
                  <div class="form-group">
                    <label class="form-label">الوحدة</label>
                    <select id="ast-q-unit" class="form-select">
                      <option value="">عام</option>
                      ${units.map(u => `<option value="${u.id}">${u.title}</option>`).join('')}
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">مستوى الصعوبة</label>
                    <select id="ast-q-diff" class="form-select">
                      <option value="easy">سهل</option>
                      <option value="medium" selected>متوسط</option>
                      <option value="hard">متقدم</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">الدرجة</label>
                    <input type="number" id="ast-q-score" class="form-input" value="10" min="1" max="100">
                  </div>
                </div>

                <div class="form-group" style="margin-bottom:1rem;">
                  <label class="form-label">كود بايثون البرمجي (اختياري)</label>
                  <textarea id="ast-q-code" class="form-input" rows="3" style="font-family:monospace; direction:ltr; text-align:left; background:#0B1120; color:#38BDF8;" placeholder="# كود السؤال إن وجد"></textarea>
                </div>

                <div style="margin-bottom:1rem;">
                  <label class="form-label">خيارات الإجابة (اختر الإجابة الصحيحة):</label>
                  <div style="display:flex; flex-direction:column; gap:0.5rem;">
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                      <input type="radio" name="ast_correct_opt" value="0" checked>
                      <span style="font-weight:700; width:20px;">أ</span>
                      <input type="text" id="ast-opt-0" class="form-input" placeholder="الخيار الأول" required>
                    </div>
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                      <input type="radio" name="ast_correct_opt" value="1">
                      <span style="font-weight:700; width:20px;">ب</span>
                      <input type="text" id="ast-opt-1" class="form-input" placeholder="الخيار الثاني" required>
                    </div>
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                      <input type="radio" name="ast_correct_opt" value="2">
                      <span style="font-weight:700; width:20px;">ج</span>
                      <input type="text" id="ast-opt-2" class="form-input" placeholder="الخيار الثالث (اختياري)">
                    </div>
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                      <input type="radio" name="ast_correct_opt" value="3">
                      <span style="font-weight:700; width:20px;">د</span>
                      <input type="text" id="ast-opt-3" class="form-input" placeholder="الخيار الرابع (اختياري)">
                    </div>
                  </div>
                </div>

                <div class="form-group" style="margin-bottom:1.5rem;">
                  <label class="form-label">شرح الإجابة والتوضيح النموذجي</label>
                  <textarea id="ast-q-explanation" class="form-input" rows="2" placeholder="شرح يظهر للطالب بعد التصحيح..."></textarea>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
                  <button type="button" class="btn btn-secondary close-modal-btn">إلغاء</button>
                  <button type="submit" class="btn btn-primary">حفظ السؤال في البنك ⚡</button>
                </div>
              </form>
            </div>
          </div>

        </div>
      `;
    },

    renderQuestionsList(questions) {
      if (!questions || questions.length === 0) {
        return `
          <div class="card card-glass" style="text-align:center; padding:3rem; color:var(--text-muted);">
            <div style="font-size:2.5rem; margin-bottom:0.75rem;">❓</div>
            <div style="font-weight:700; font-size:1.1rem; color:var(--text-main);">لا توجد أسئلة مسجلة حاليًا</div>
          </div>
        `;
      }

      return questions.map(q => {
        const qText = q.question || q.question_text || '';
        const options = q.options || [];
        return `
          <div class="card card-glass" style="padding:1.5rem;" data-q-id="${q.id}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
              <div style="display:flex; gap:0.5rem; align-items:center;">
                <span class="badge badge-purple">${q.difficulty === 'easy' ? 'سهل' : (q.difficulty === 'hard' ? 'متقدم' : 'متوسط')}</span>
                <span class="badge badge-cyan">${q.score || 10} درجات</span>
                <span class="badge badge-neutral">${q.unit_title || 'عام'}</span>
              </div>
              <div style="display:flex; gap:0.5rem;">
                <button class="btn btn-ghost btn-icon-sm edit-ast-q-btn" data-id="${q.id}" title="تعديل">
                  ${Icons.edit()}
                </button>
                <button class="btn btn-ghost btn-icon-sm delete-ast-q-btn" data-id="${q.id}" title="حذف" style="color:var(--danger);">
                  ${Icons.trash()}
                </button>
              </div>
            </div>

            <h4 style="font-size:1.05rem; font-weight:700; color:var(--text-main); margin-bottom:0.75rem; line-height:1.5;">${qText}</h4>

            ${q.code_snippet ? `
              <pre style="background:#070B14; border:1px solid var(--border-subtle); padding:0.75rem 1rem; border-radius:var(--radius-md); font-family:monospace; direction:ltr; text-align:left; color:#38BDF8; margin-bottom:1rem; font-size:0.875rem;"><code>${q.code_snippet}</code></pre>
            ` : ''}

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:0.5rem; margin-bottom:0.75rem;">
              ${options.map((opt, idx) => {
                const optText = typeof opt === 'object' ? (opt.option_text || opt.text) : opt;
                const isCorrect = typeof opt === 'object' ? (opt.is_correct || opt.isCorrect || String(idx) === String(q.correct_answer)) : String(idx) === String(q.correct_answer);
                return `
                  <div style="padding:0.5rem 0.75rem; background:var(--bg-surface-elevated); border:1px solid ${isCorrect ? 'var(--success)' : 'var(--border-subtle)'}; border-radius:var(--radius-sm); font-size:0.875rem; display:flex; justify-content:space-between; align-items:center;">
                    <span>${optText}</span>
                    ${isCorrect ? '<span style="color:var(--success); font-weight:800;">✓ صحيحة</span>' : ''}
                  </div>
                `;
              }).join('')}
            </div>

            ${q.explanation ? `
              <div style="font-size:0.8125rem; color:var(--text-muted); padding:0.5rem 0.75rem; background:rgba(255,255,255,0.03); border-radius:var(--radius-sm);">
                💡 <strong>التوضيح:</strong> ${q.explanation}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    },

    // ==========================================
    // 6. STUDENTS DIRECTORY
    // ==========================================
    async renderStudents(assistant) {
      let students = [];
      try {
        students = await window.AssistantService.getStudents();
      } catch (err) {
        console.warn('Error loading students:', err);
      }

      return `
        <div class="content-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-cyan" style="margin-bottom:0.35rem;">👥 دليل الطلاب</div>
              <h1 style="font-size:1.875rem; font-weight:800; margin:0;">شؤون وتقدم الطلاب</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">مشاهدة بيانات الطلاب، البحث بالاسم ورقم الهاتف، ومتابعة الدروس المكتملة ومتوسط الدرجات.</p>
            </div>
          </div>

          <!-- Search Bar -->
          <div class="card card-glass" style="padding:1.25rem; margin-bottom:1.5rem;">
            <div style="display:flex; gap:1rem; flex-wrap:wrap; align-items:center;">
              <div style="flex:1; min-width:240px; position:relative;">
                <input type="text" id="ast-st-search" class="form-input" placeholder="ابحث باسم الطالب، رقم الهاتف، أو هاتف ولي الأمر..." style="padding-right:2.5rem;">
                <span style="position:absolute; right:0.75rem; top:50%; transform:translateY(-50%); color:var(--text-muted);">${Icons.search()}</span>
              </div>
              <select id="ast-st-grade-filter" class="form-select" style="width:auto;">
                <option value="">جميع الصفوف</option>
                <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
              </select>
            </div>
          </div>

          <!-- Table -->
          <div class="card card-glass" style="padding:0; overflow:hidden;">
            <div class="table-responsive">
              <table class="table" style="margin:0;">
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th>الصف الدراسي</th>
                    <th>رقم الهاتف</th>
                    <th>هاتف ولي الأمر</th>
                    <th>الدروس المكتملة</th>
                    <th>متوسط الدرجات</th>
                    <th>الحالة</th>
                    <th style="text-align:left;">التفاصيل</th>
                  </tr>
                </thead>
                <tbody id="ast-students-table-body">
                  ${this.renderStudentsTableRows(students)}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Student Profile Modal -->
          <div id="ast-student-profile-modal" class="modal-overlay" style="display:none;">
            <div class="card card-glass" style="max-width:560px; width:100%; padding:2rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <h3 style="font-size:1.25rem; font-weight:800;" id="ast-st-modal-title">ملف الطالب الأكاديمي</h3>
                <button class="btn btn-ghost btn-icon-sm close-modal-btn">${Icons.x()}</button>
              </div>
              <div id="ast-st-modal-body"></div>
            </div>
          </div>

        </div>
      `;
    },

    renderStudentsTableRows(students) {
      if (!students || students.length === 0) {
        return `
          <tr>
            <td colspan="8" style="text-align:center; padding:3rem; color:var(--text-muted);">
              <div style="font-size:2rem; margin-bottom:0.5rem;">👨🎓</div>
              <strong>لا يوجد طلاب يطابقون شروط البحث</strong>
            </td>
          </tr>
        `;
      }

      return students.map(s => {
        const isActive = s.isActive !== undefined ? s.isActive : (s.status === 'active' || s.status === 'ACTIVE' || s.is_active === 1);
        return `
          <tr data-student-id="${s.id}">
            <td>
              <div style="display:flex; align-items:center; gap:0.75rem;">
                <div class="user-avatar" style="width:36px; height:36px; font-size:0.875rem;">${s.avatar || 'ط'}</div>
                <div>
                  <div style="font-weight:700; color:var(--text-main);">${s.name}</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">${s.email || ''}</div>
                </div>
              </div>
            </td>
            <td><span class="badge badge-neutral">${s.grade || 'الصف الأول الثانوي'}</span></td>
            <td>${s.phone}</td>
            <td>${s.parent_phone || s.parentPhone || '—'}</td>
            <td><span class="badge badge-cyan">${s.completedLessonsCount || 0} درس (${s.progress || 0}%)</span></td>
            <td><span class="badge ${s.avgScore >= 60 ? 'badge-success' : 'badge-neutral'}">${s.avgScore || 0}%</span></td>
            <td><span class="badge ${isActive ? 'badge-success' : 'badge-danger'}">${isActive ? 'نشط' : 'معطل'}</span></td>
            <td>
              <button class="btn btn-secondary btn-icon-sm view-ast-student-btn" data-id="${s.id}" title="عرض التقرير">
                ${Icons.eye()}
              </button>
            </td>
          </tr>
        `;
      }).join('');
    },

    // ==========================================
    // 7. GRADES & EXAM RESULTS
    // ==========================================
    async renderGrades(assistant) {
      let results = [];
      try {
        results = await window.AssistantService.getGrades();
      } catch (err) {
        console.warn('Error loading grades:', err);
      }

      return `
        <div class="content-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-amber" style="margin-bottom:0.35rem;">📊 النتائج والتقييمات</div>
              <h1 style="font-size:1.875rem; font-weight:800; margin:0;">درجات ونتائج اختبارات الطلاب</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">مراجعة نتائج الاختبارات المسلمة وتحليل مستويات الطلاب ونقاط القوة والضعف.</p>
            </div>
          </div>

          <div class="card card-glass" style="padding:0; overflow:hidden;">
            <div class="table-responsive">
              <table class="table" style="margin:0;">
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th>اسم الاختبار</th>
                    <th>الدرجة</th>
                    <th>النسبة المئوية</th>
                    <th>الأسئلة الصحيحة</th>
                    <th>وقت الحل</th>
                    <th>الحالة</th>
                    <th>تاريخ التسليم</th>
                  </tr>
                </thead>
                <tbody id="ast-grades-table-body">
                  ${this.renderGradesTableRows(results)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    renderGradesTableRows(results) {
      if (!results || results.length === 0) {
        return `
          <tr>
            <td colspan="8" style="text-align:center; padding:3rem; color:var(--text-muted);">
              <div style="font-size:2rem; margin-bottom:0.5rem;">📊</div>
              <strong>لا توجد تسليمات اختبارات مسجلة حتى الآن</strong>
            </td>
          </tr>
        `;
      }

      return results.map(r => {
        const isPassed = r.passed === 1 || r.percentage >= 60;
        const timeSpentMin = r.time_spent_seconds ? Math.round(r.time_spent_seconds / 60) : 0;
        const dateStr = r.completed_at ? new Date(r.completed_at).toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' }) : '-';

        return `
          <tr>
            <td>
              <div style="font-weight:700; color:var(--text-main); font-size:0.9375rem;">${r.student_name || 'طالب'}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">${r.grade || ''}</div>
            </td>
            <td><span class="badge badge-neutral">${r.exam_title || 'اختبار'}</span></td>
            <td><strong>${r.score}</strong> / ${r.total_score || 100}</td>
            <td>
              <span class="badge ${isPassed ? 'badge-success' : 'badge-danger'}" style="font-weight:700;">
                ${r.percentage}%
              </span>
            </td>
            <td>${r.correct_count} / ${r.total_count}</td>
            <td>${timeSpentMin} دقيقة</td>
            <td>
              <span class="badge ${isPassed ? 'badge-success' : 'badge-danger'}">
                ${isPassed ? 'ناجح ✓' : 'راسب ✗'}
              </span>
            </td>
            <td style="font-size:0.8125rem; color:var(--text-muted);">${dateStr}</td>
          </tr>
        `;
      }).join('');
    },

    // ==========================================
    // 8. EVENT LISTENERS INITIALIZER
    // ==========================================
    initEvents(path, param, assistant) {
      // Global Modal close buttons
      document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
        });
      });

      // 1. Code Generator Events
      if (path === '#assistant-code') {
        const topicSel = document.getElementById('gen-topic');
        const levelSel = document.getElementById('gen-level');
        const typeSel = document.getElementById('gen-type');
        const triggerBtn = document.getElementById('trigger-gen-btn');
        const editor = document.getElementById('gen-code-editor');
        const runBtn = document.getElementById('run-code-btn');
        const copyBtn = document.getElementById('copy-code-btn');
        const terminal = document.getElementById('gen-terminal-output');
        const execTime = document.getElementById('gen-exec-time');
        const titleDisp = document.getElementById('gen-title-display');
        const explBox = document.getElementById('gen-explanation-box');

        triggerBtn?.addEventListener('click', async () => {
          triggerBtn.disabled = true;
          triggerBtn.innerHTML = 'جاري التوليد... ⏳';
          try {
            const topic = topicSel ? topicSel.value : 'variables';
            const level = levelSel ? levelSel.value : 'beginner';
            const type = typeSel ? typeSel.value : 'exercise';
            const res = await window.AssistantService.generateCode(topic, level, type);
            triggerBtn.disabled = false;
            triggerBtn.innerHTML = '⚡ توليد الكود الآن';

            if (res.success && res.generated) {
              const gen = res.generated;
              if (editor) editor.value = gen.code || gen.starter_code || '';
              if (titleDisp) titleDisp.textContent = gen.title || 'كود بايثون';
              if (explBox) explBox.textContent = gen.explanation || '';
              if (window.UI && window.UI.showToast) UI.showToast('تم توليد الكود البرمجي بنجاح', 'success');
            }
          } catch (err) {
            triggerBtn.disabled = false;
            triggerBtn.innerHTML = '⚡ توليد الكود الآن';
            if (window.UI && window.UI.showToast) UI.showToast('فشل توليد الكود', 'error');
          }
        });

        runBtn?.addEventListener('click', async () => {
          const code = editor ? editor.value : '';
          const mockInputs = document.getElementById('gen-mock-inputs')?.value.split(',').map(s => s.trim()).filter(Boolean);
          if (runBtn) { runBtn.disabled = true; runBtn.innerHTML = 'جاري التشغيل... ⏳'; }

          try {
            const res = await window.AssistantService.runCode(code, mockInputs);
            if (runBtn) { runBtn.disabled = false; runBtn.innerHTML = '▶ تشغيل الكود'; }
            if (execTime) execTime.textContent = `${res.executionTimeMs || 0} ms`;
            if (terminal) {
              if (res.success) {
                terminal.style.color = '#A7F3D0';
                terminal.textContent = res.output || 'تم التنفيذ بنجاح بدون مخرجات مطبوعة.';
              } else {
                terminal.style.color = '#FCA5A5';
                terminal.textContent = res.error || 'حدث خطأ أثناء التشغيل.';
              }
            }
          } catch (err) {
            if (runBtn) { runBtn.disabled = false; runBtn.innerHTML = '▶ تشغيل الكود'; }
            if (terminal) {
              terminal.style.color = '#FCA5A5';
              terminal.textContent = err.message || 'تعذر الاتصال بمحرك التنفيذ';
            }
          }
        });

        copyBtn?.addEventListener('click', () => {
          if (editor && navigator.clipboard) {
            navigator.clipboard.writeText(editor.value);
            copyBtn.textContent = 'تم النسخ ✓';
            setTimeout(() => copyBtn.textContent = '📋 نسخ', 2000);
          }
        });
      }

      // 2. Student Questions Events
      if (path === '#assistant-questions') {
        const replyModal = document.getElementById('assistant-reply-modal');
        const replyForm = document.getElementById('assistant-reply-form');
        const statusFilter = document.getElementById('assistant-ticket-status-filter');

        document.querySelectorAll('.open-reply-modal-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const subject = btn.getAttribute('data-subject');
            const msg = btn.getAttribute('data-msg');
            document.getElementById('reply-ticket-id').value = id;
            document.getElementById('reply-modal-subject').textContent = `الرد على: ${subject}`;
            document.getElementById('reply-modal-student-msg').textContent = `سؤال الطالب: "${msg}"`;
            document.getElementById('reply-text-input').value = '';
            if (replyModal) replyModal.style.display = 'flex';
          });
        });

        replyForm?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const id = document.getElementById('reply-ticket-id')?.value;
          const reply = document.getElementById('reply-text-input')?.value.trim();
          const sendBtn = document.getElementById('send-reply-submit-btn');
          if (sendBtn) { sendBtn.disabled = true; sendBtn.innerHTML = 'جاري الإرسال... ⏳'; }

          try {
            const res = await window.AssistantService.replyToStudentQuestion(id, reply);
            if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = 'إرسال الرد للطالب ✉️'; }
            if (replyModal) replyModal.style.display = 'none';
            if (window.UI && window.UI.showToast) UI.showToast('تم إرسال الرد للطالب بنجاح', 'success');
            
            const updated = await window.AssistantService.getStudentQuestions();
            document.getElementById('assistant-tickets-container').innerHTML = window.AssistantViews.renderTicketsList(updated);
            window.AssistantViews.initEvents(path, param, assistant);
          } catch (err) {
            if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = 'إرسال الرد للطالب ✉️'; }
            if (window.UI && window.UI.showToast) UI.showToast(err.message || 'فشل إرسال الرد', 'error');
          }
        });

        document.querySelectorAll('.toggle-ticket-status-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const currentStatus = btn.getAttribute('data-status');
            const newStatus = currentStatus === 'open' ? 'closed' : 'open';
            try {
              await window.AssistantService.updateQuestionStatus(id, newStatus);
              if (window.UI && window.UI.showToast) UI.showToast('تم تعديل حالة التذكرة', 'info');
              const updated = await window.AssistantService.getStudentQuestions();
              document.getElementById('assistant-tickets-container').innerHTML = window.AssistantViews.renderTicketsList(updated);
              window.AssistantViews.initEvents(path, param, assistant);
            } catch (err) {
              if (window.UI && window.UI.showToast) UI.showToast('فشل تعديل الحالة', 'error');
            }
          });
        });

        statusFilter?.addEventListener('change', async () => {
          const val = statusFilter.value;
          const updated = await window.AssistantService.getStudentQuestions(val || null);
          document.getElementById('assistant-tickets-container').innerHTML = window.AssistantViews.renderTicketsList(updated);
          window.AssistantViews.initEvents(path, param, assistant);
        });
      }

      // 3. Exams Events
      if (path === '#assistant-exams') {
        const examModal = document.getElementById('ast-exam-modal');
        const examForm = document.getElementById('ast-exam-form');

        document.getElementById('ast-create-exam-btn')?.addEventListener('click', () => {
          document.getElementById('ast-exam-modal-title').textContent = 'إنشاء امتحان جديد';
          document.getElementById('ast-exam-id').value = '';
          examForm?.reset();
          if (examModal) examModal.style.display = 'flex';
        });

        examForm?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const id = document.getElementById('ast-exam-id')?.value;
          const title = document.getElementById('ast-exam-title')?.value;
          const unit_id = document.getElementById('ast-exam-unit')?.value || null;
          const duration_minutes = parseInt(document.getElementById('ast-exam-duration')?.value) || 30;
          const passing_score = parseInt(document.getElementById('ast-exam-passing')?.value) || 60;
          const total_questions = parseInt(document.getElementById('ast-exam-total-q')?.value) || 10;
          const attempts_allowed = parseInt(document.getElementById('ast-exam-attempts')?.value) || 3;

          try {
            if (id) {
              await window.AssistantService.updateExam(id, { title, unit_id, duration_minutes, passing_score, total_questions, attempts_allowed });
              if (window.UI && window.UI.showToast) UI.showToast('تم تحديث الامتحان بنجاح', 'success');
            } else {
              await window.AssistantService.createExam({ title, unit_id, duration_minutes, passing_score, total_questions, attempts_allowed });
              if (window.UI && window.UI.showToast) UI.showToast('تم إنشاء الامتحان بنجاح', 'success');
            }
            if (examModal) examModal.style.display = 'none';
            const updated = await window.AssistantService.getExams();
            document.getElementById('ast-exams-table-body').innerHTML = window.AssistantViews.renderExamsTableRows(updated);
            window.AssistantViews.initEvents(path, param, assistant);
          } catch (err) {
            if (window.UI && window.UI.showToast) UI.showToast(err.message || 'فشل حفظ الامتحان', 'error');
          }
        });

        document.querySelectorAll('.edit-ast-exam-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const eId = btn.getAttribute('data-id');
            try {
              const res = await window.AssistantService.getExam(eId);
              const ex = res.exam || res;
              document.getElementById('ast-exam-modal-title').textContent = 'تعديل الامتحان';
              document.getElementById('ast-exam-id').value = ex.id;
              document.getElementById('ast-exam-title').value = ex.title || '';
              document.getElementById('ast-exam-unit').value = ex.unit_id || '';
              document.getElementById('ast-exam-duration').value = ex.duration_minutes || ex.duration || 30;
              document.getElementById('ast-exam-passing').value = ex.passing_score || 60;
              document.getElementById('ast-exam-total-q').value = ex.total_questions || 10;
              document.getElementById('ast-exam-attempts').value = ex.attempts_allowed || 3;
              if (examModal) examModal.style.display = 'flex';
            } catch (err) {
              if (window.UI && window.UI.showToast) UI.showToast('تعذر جلب تفاصيل الامتحان', 'error');
            }
          });
        });

        document.querySelectorAll('.delete-ast-exam-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const eId = btn.getAttribute('data-id');
            const title = btn.getAttribute('data-title');
            if (!confirm(`هل أنت متأكد من حذف الامتحان (${title})؟`)) return;
            try {
              await window.AssistantService.deleteExam(eId);
              if (window.UI && window.UI.showToast) UI.showToast('تم حذف الامتحان بنجاح', 'success');
              const updated = await window.AssistantService.getExams();
              document.getElementById('ast-exams-table-body').innerHTML = window.AssistantViews.renderExamsTableRows(updated);
              window.AssistantViews.initEvents(path, param, assistant);
            } catch (err) {
              if (window.UI && window.UI.showToast) UI.showToast(err.message || 'فشل حذف الامتحان', 'error');
            }
          });
        });
      }

      // 4. Question Bank Events
      if (path === '#assistant-bank') {
        const qModal = document.getElementById('ast-question-modal');
        const qForm = document.getElementById('ast-question-form');

        document.getElementById('ast-add-question-btn')?.addEventListener('click', () => {
          document.getElementById('ast-q-modal-title').textContent = 'إضافة سؤال جديد لبنك الأسئلة';
          document.getElementById('ast-q-id').value = '';
          qForm?.reset();
          if (qModal) qModal.style.display = 'flex';
        });

        qForm?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const id = document.getElementById('ast-q-id')?.value;
          const question = document.getElementById('ast-q-text')?.value.trim();
          const unit_id = document.getElementById('ast-q-unit')?.value || null;
          const difficulty = document.getElementById('ast-q-diff')?.value || 'medium';
          const score = parseInt(document.getElementById('ast-q-score')?.value) || 10;
          const code_snippet = document.getElementById('ast-q-code')?.value || '';
          const explanation = document.getElementById('ast-q-explanation')?.value || '';
          
          const opt0 = document.getElementById('ast-opt-0')?.value.trim();
          const opt1 = document.getElementById('ast-opt-1')?.value.trim();
          const opt2 = document.getElementById('ast-opt-2')?.value.trim();
          const opt3 = document.getElementById('ast-opt-3')?.value.trim();
          const correctRadio = document.querySelector('input[name="ast_correct_opt"]:checked')?.value || '0';

          const options = [opt0, opt1];
          if (opt2) options.push(opt2);
          if (opt3) options.push(opt3);

          const qData = {
            question,
            text: question,
            unit_id,
            difficulty,
            score,
            code_snippet,
            explanation,
            options,
            correct_answer: correctRadio
          };

          try {
            if (id) {
              await window.AssistantService.updateQuestion(id, qData);
              if (window.UI && window.UI.showToast) UI.showToast('تم تحديث السؤال بنجاح', 'success');
            } else {
              await window.AssistantService.createQuestion(qData);
              if (window.UI && window.UI.showToast) UI.showToast('تمت إضافة السؤال لبنك الأسئلة', 'success');
            }
            if (qModal) qModal.style.display = 'none';
            const updated = await window.AssistantService.getQuestions();
            document.getElementById('ast-questions-list-container').innerHTML = window.AssistantViews.renderQuestionsList(updated);
            window.AssistantViews.initEvents(path, param, assistant);
          } catch (err) {
            if (window.UI && window.UI.showToast) UI.showToast(err.message || 'فشل حفظ السؤال', 'error');
          }
        });

        document.querySelectorAll('.delete-ast-q-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const qId = btn.getAttribute('data-id');
            if (!confirm('هل أنت متأكد من حذف هذا السؤال من بنك الأسئلة؟')) return;
            try {
              await window.AssistantService.deleteQuestion(qId);
              if (window.UI && window.UI.showToast) UI.showToast('تم حذف السؤال بنجاح', 'success');
              const updated = await window.AssistantService.getQuestions();
              document.getElementById('ast-questions-list-container').innerHTML = window.AssistantViews.renderQuestionsList(updated);
              window.AssistantViews.initEvents(path, param, assistant);
            } catch (err) {
              if (window.UI && window.UI.showToast) UI.showToast(err.message || 'فشل حذف السؤال', 'error');
            }
          });
        });
      }

      // 5. Students Directory Events
      if (path === '#assistant-students') {
        const profModal = document.getElementById('ast-student-profile-modal');
        const profBody = document.getElementById('ast-st-modal-body');

        document.querySelectorAll('.view-ast-student-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const stId = btn.getAttribute('data-id');
            if (profBody) profBody.innerHTML = '<div style="text-align:center; padding:2rem;">جاري جلب ملف الطالب... ⏳</div>';
            if (profModal) profModal.style.display = 'flex';

            try {
              const res = await window.AssistantService.getStudent(stId);
              const st = res.student || res;
              const completedLessons = res.completedLessons || [];
              const examAttempts = res.examAttempts || [];

              if (profBody) {
                profBody.innerHTML = `
                  <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem;">
                    <div class="user-avatar" style="width:52px; height:52px; font-size:1.25rem;">${st.avatar || 'ط'}</div>
                    <div>
                      <h4 style="margin:0 0 0.25rem 0; font-size:1.15rem; color:var(--text-main);">${st.name}</h4>
                      <div style="font-size:0.8125rem; color:var(--text-muted);">${st.grade || 'الصف الأول الثانوي'} • ${st.phone}</div>
                    </div>
                  </div>

                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1.5rem;">
                    <div style="padding:0.75rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); text-align:center;">
                      <div style="font-size:1.25rem; font-weight:800; color:var(--cyan);">${completedLessons.length} دروس</div>
                      <div style="font-size:0.75rem; color:var(--text-muted);">الدروس المكتملة</div>
                    </div>
                    <div style="padding:0.75rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); text-align:center;">
                      <div style="font-size:1.25rem; font-weight:800; color:var(--success);">${st.xp || 100} XP</div>
                      <div style="font-size:0.75rem; color:var(--text-muted);">نقاط التفاعل والخبرة</div>
                    </div>
                  </div>

                  <h5 style="font-size:0.9375rem; font-weight:700; margin-bottom:0.75rem; color:var(--text-main);">سجل محاولات الاختبارات:</h5>
                  <div style="max-height:160px; overflow-y:auto;">
                    ${examAttempts.length === 0 ? '<div style="color:var(--text-muted); font-size:0.8125rem;">لم يقم الطالب بأي محاولات تسليم بعد.</div>' : examAttempts.map(ea => `
                      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0.75rem; background:var(--bg-surface-elevated); border-radius:var(--radius-sm); margin-bottom:0.4rem; font-size:0.8125rem;">
                        <div><strong>${ea.exam_title || 'اختبار'}</strong></div>
                        <span class="badge ${ea.percentage >= 60 ? 'badge-success' : 'badge-danger'}">${ea.percentage}% (${ea.correct_count}/${ea.total_count})</span>
                      </div>
                    `).join('')}
                  </div>
                `;
              }
            } catch (err) {
              if (profBody) profBody.innerHTML = `<div style="color:var(--danger); padding:1rem;">تعذر جلب ملف الطالب: ${err.message}</div>`;
            }
          });
        });
      }

    }

,
    renderResources(assistant) {
      return window.AdminViews.renderResources(assistant);
    },
    initResourcesEvents() {
      return window.AdminViews.initResourcesEvents();
    }
  };
})();
