// Code Spark Profile, Notifications, Settings & Support Views - Futuristic UI/UX Edition
(function() {
  // 1. Profile View
  window.ProfileView = {
    render(user) {
      user = user || {};
      const progress = window.CodeSparkDB ? window.CodeSparkDB.getStudentProgress(user.id) : {};
      const isLifetime = user.is_lifetime || user.subscription_duration_days === -1;
      const subStatus = user.subscription_status || 'active';
      const daysRemaining = user.days_remaining !== undefined ? user.days_remaining : (isLifetime ? -1 : 30);

      return `
        <div class="content-body" style="max-width:960px;">
          
          <div style="margin-bottom:2rem;">
            <div class="badge badge-cyan" style="margin-bottom:0.35rem;">👤 الحساب الشخصي</div>
            <h1 style="font-size:1.875rem; font-weight:900; margin:0;">الملف التعريفي للطالب</h1>
            <p style="color:var(--text-muted); font-size:0.9375rem;">إدارة بياناتك الشخصية وحالة الحساب والاشتراك الأكاديمي.</p>
          </div>

          <!-- Profile Main Card -->
          <div class="card card-glass" style="margin-bottom:2rem; padding:2rem; border-color:var(--border-glow); box-shadow:var(--shadow-lg), 0 0 25px rgba(6,182,212,0.15);">
            <div style="display:flex; align-items:center; gap:1.5rem; margin-bottom:2rem; flex-wrap:wrap;">
              <div class="user-avatar" style="width:76px; height:76px; font-size:1.85rem; border:3px solid rgba(6,182,212,0.4);">
                ${user.avatar || 'ط'}
              </div>
              <div style="flex:1;">
                <h2 style="font-size:1.45rem; font-weight:800; color:var(--text-main); margin-bottom:0.25rem;">
                  ${user.name}
                </h2>
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap; font-size:0.875rem; color:var(--text-muted);">
                  <span class="badge badge-primary">${user.grade || 'الصف الأول الثانوي'}</span>
                  <span class="badge badge-cyan" style="display:flex; align-items:center; gap:0.25rem;">
                    ${Icons.flame()} ${user.streak || 5} أيام حماس
                  </span>
                  <span class="badge ${subStatus === 'active' ? 'badge-success' : 'badge-danger'}">
                    ${subStatus === 'active' ? (isLifetime ? '♾️ اشتراك مدى الحياة' : `🟢 متبقي ${daysRemaining} يومًا`) : '🔴 منتهي الصلاحية'}
                  </span>
                </div>
              </div>

              <button id="edit-profile-btn" class="btn btn-secondary">
                ${Icons.edit()} تعديل البيانات
              </button>
            </div>

            <!-- Profile Info Grid -->
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1.25rem; border-top:1px solid var(--border-subtle); padding-top:1.5rem;">
              <div style="background:rgba(7,11,20,0.5); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                <div style="font-size:0.75rem; color:var(--text-subtle); font-weight:700;">رقم هاتف الطالب (واتساب)</div>
                <div style="font-size:1.05rem; font-weight:800; color:var(--text-main); font-family:var(--font-sans); margin-top:0.25rem;">${user.phone || 'غير مسجل'}</div>
              </div>

              <div style="background:rgba(7,11,20,0.5); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                <div style="font-size:0.75rem; color:var(--text-subtle); font-weight:700;">رقم هاتف ولي الأمر</div>
                <div style="font-size:1.05rem; font-weight:800; color:var(--text-main); font-family:var(--font-sans); margin-top:0.25rem;">${user.parentPhone || user.parent_phone || 'غير مسجل'}</div>
              </div>

              <div style="background:rgba(7,11,20,0.5); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                <div style="font-size:0.75rem; color:var(--text-subtle); font-weight:700;">البريد الإلكتروني</div>
                <div style="font-size:0.9375rem; font-weight:700; color:var(--text-main); margin-top:0.25rem; word-break:break-all;">${user.email || 'غير مسجل'}</div>
              </div>

              <div style="background:rgba(7,11,20,0.5); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                <div style="font-size:0.75rem; color:var(--text-subtle); font-weight:700;">كود الاشتراك والتفعيل</div>
                <div style="font-size:1.05rem; font-weight:800; color:var(--cyan); font-family:var(--font-mono); margin-top:0.25rem;">${user.subscriptionCode || user.subscription_code || 'CS-ACTIVE'}</div>
              </div>
            </div>
          </div>

          <!-- Academic Quick Stats -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:1rem;">
            <div class="stat-card" style="text-align:center; padding:1.25rem; flex-direction:column; gap:0.25rem;">
              <div style="font-size:0.8125rem; color:var(--text-muted); font-weight:600;">إنجاز المنهج</div>
              <div style="font-size:1.85rem; font-weight:900; color:var(--cyan); font-family:var(--font-sans);">${progress.overallProgress || 72}%</div>
            </div>

            <div class="stat-card" style="text-align:center; padding:1.25rem; flex-direction:column; gap:0.25rem;">
              <div style="font-size:0.8125rem; color:var(--text-muted); font-weight:600;">الدروس المنجزة</div>
              <div style="font-size:1.85rem; font-weight:900; color:var(--primary-light); font-family:var(--font-sans);">${user.completedLessonsCount || 18}</div>
            </div>

            <div class="stat-card" style="text-align:center; padding:1.25rem; flex-direction:column; gap:0.25rem;">
              <div style="font-size:0.8125rem; color:var(--text-muted); font-weight:600;">الاختبارات</div>
              <div style="font-size:1.85rem; font-weight:900; color:var(--purple); font-family:var(--font-sans);">${user.examsCount || 7}</div>
            </div>

            <div class="stat-card" style="text-align:center; padding:1.25rem; flex-direction:column; gap:0.25rem;">
              <div style="font-size:0.8125rem; color:var(--text-muted); font-weight:600;">متوسط الدرجات</div>
              <div style="font-size:1.85rem; font-weight:900; color:var(--success); font-family:var(--font-sans);">${user.avgScore || 86}%</div>
            </div>
          </div>

          <!-- Edit Profile Modal -->
          <div class="modal-overlay" id="edit-profile-modal">
            <div class="modal-card">
              <div class="modal-header">
                <h3 style="font-size:1.125rem; font-weight:800; margin:0;">تعديل بيانات الحساب</h3>
                <button class="btn btn-ghost btn-icon-sm close-modal-btn">${Icons.x()}</button>
              </div>
              <div class="modal-body">
                <form id="edit-profile-form">
                  <div class="form-group">
                    <label class="form-label" for="edit-name">اسم الطالب</label>
                    <input type="text" id="edit-name" class="form-input" value="${user.name}" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="edit-parent-phone">رقم ولي الأمر</label>
                    <input type="tel" id="edit-parent-phone" class="form-input" value="${user.parentPhone || user.parent_phone || ''}" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="edit-grade">الصف الدراسي</label>
                    <select id="edit-grade" class="form-select">
                      <option value="الصف الأول الثانوي" ${user.grade === 'الصف الأول الثانوي' ? 'selected' : ''}>الصف الأول الثانوي</option>
                      <option value="الصف الثاني الثانوي" ${user.grade === 'الصف الثاني الثانوي' ? 'selected' : ''}>الصف الثاني الثانوي</option>
                      <option value="الصف الثالث الثانوي" ${user.grade === 'الصف الثالث الثانوي' ? 'selected' : ''}>الصف الثالث الثانوي</option>
                    </select>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary close-modal-btn">إلغاء</button>
                <button id="save-profile-btn" class="btn btn-primary">حفظ التعديلات</button>
              </div>
            </div>
          </div>

        </div>
      `;
    },

    initEvents(user) {
      const editBtn = document.getElementById('edit-profile-btn');
      const saveBtn = document.getElementById('save-profile-btn');

      if (editBtn) {
        editBtn.addEventListener('click', () => {
          UI.openModal('edit-profile-modal');
        });
      }

      document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          UI.closeModal('edit-profile-modal');
        });
      });

      if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
          const updated = {
            name: document.getElementById('edit-name').value.trim(),
            parent_phone: document.getElementById('edit-parent-phone').value.trim(),
            grade: document.getElementById('edit-grade').value
          };
          try {
            const res = await window.AuthService.updateProfile(updated);
            if (res.success) {
              UI.closeModal('edit-profile-modal');
              UI.showToast('تم تحديث البيانات بنجاح', 'success');
              if (window.CodeSparkRouter) window.CodeSparkRouter.handleRoute();
            }
          } catch (err) {
            UI.showToast(err.message || 'حدث خطأ أثناء التحديث', 'error');
          }
        });
      }
    }
  };

  // 2. Notifications View (المجتمع والتنبيهات)
  window.NotificationsView = {
    render(user) {
      const notifs = window.CodeSparkDB ? window.CodeSparkDB.getNotifications(user.id) : [];
      const announcements = window.CodeSparkDB ? window.CodeSparkDB.getAnnouncements() : [];

      return `
        <div class="content-body" style="max-width:960px;">
          
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-cyan" style="margin-bottom:0.35rem;">🔔 مركز التنبيهات والمجتمع</div>
              <h1 style="font-size:1.875rem; font-weight:900; margin:0;">الإشعارات وتحديثات المنصة</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">تحديثات مستمرة حول الدروس الجديدة، تحديات بايثون، ونتائج التقييمات.</p>
            </div>

            <button id="mark-all-read-btn" class="btn btn-secondary btn-sm">
              ${Icons.check()} تحديد الكل كمقروء
            </button>
          </div>

          <!-- Platform Announcements Banner -->
          <div class="card card-glass" style="margin-bottom:2rem; border-color:var(--border-glow); padding:1.5rem;">
            <h3 style="font-size:1.1rem; font-weight:800; margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; color:var(--cyan);">
              ${Icons.sparkles ? Icons.sparkles() : '✨'} إعلانات المشرفين والمجتمع الأكاديمي
            </h3>
            <div style="display:flex; flex-direction:column; gap:1rem;">
              ${announcements.map(a => `
                <div style="padding:1rem; background:rgba(7,11,20,0.5); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
                  <div style="font-weight:800; font-size:0.95rem; color:var(--text-main); margin-bottom:0.35rem;">${a.title}</div>
                  <div style="font-size:0.875rem; color:var(--text-muted); line-height:1.6;">${a.content}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Notifications List -->
          <div class="card card-glass" style="padding:1.5rem;">
            <h3 style="font-size:1.1rem; font-weight:800; margin-bottom:1.25rem; display:flex; align-items:center; gap:0.5rem;">
              ${Icons.bell()} سجل الإشعارات الفردية
            </h3>

            <div style="display:flex; flex-direction:column; gap:1rem;">
              ${notifs.length === 0 ? `
                <div class=\"empty-state\" style=\"padding:2.5rem 1rem;\">
                  <div class=\"empty-icon\">🔔</div>
                  <h3 class=\"empty-title\">لا توجد إشعارات جديدة حالياً</h3>
                  <p class=\"empty-desc\">ستظهر هنا التنبيهات الخاصة بفتح الدروس الجديدة ونتائج الاختبارات.</p>
                </div>
              ` : notifs.map(n => `
                <div class="card card-hover" style="padding:1.25rem; display:flex; align-items:flex-start; gap:1rem; border-color:${n.read ? 'var(--border-subtle)' : 'var(--border-cyan)'}; background:${n.read ? 'var(--bg-surface)' : 'rgba(6,182,212,0.06)'};">
                  <div class="stat-icon-wrapper ${n.type === 'achievement' ? 'stat-icon-green' : (n.type === 'exam' ? 'stat-icon-purple' : 'stat-icon-cyan')}" style="width:42px; height:42px; font-size:1.15rem;">
                    ${n.type === 'achievement' ? '🏆' : (n.type === 'exam' ? Icons.checkSquare() : Icons.bell())}
                  </div>

                  <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.25rem;">
                      <h4 style="font-size:0.95rem; font-weight:800; color:var(--text-main); margin:0;">${n.title}</h4>
                      <span style="font-size:0.75rem; color:var(--text-subtle);">اليوم</span>
                    </div>
                    <p style="font-size:0.875rem; color:var(--text-muted); line-height:1.6; margin:0 0 0.5rem 0;">
                      ${n.message}
                    </p>
                    ${n.link ? `
                      <a href="${n.link}" style="font-size:0.8125rem; color:var(--cyan); font-weight:700; display:inline-flex; align-items:center; gap:0.25rem;">
                        الانتقال للمحتوى ${Icons.arrowLeft()}
                      </a>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>
      `;
    },

    initEvents(user) {
      document.getElementById('mark-all-read-btn')?.addEventListener('click', async () => {
        if (window.CodeSparkDB && window.CodeSparkDB.markAllNotificationsRead) {
          await window.CodeSparkDB.markAllNotificationsRead();
          UI.showToast('تم تحديد جميع الإشعارات كمقروءة', 'success');
          if (window.CodeSparkRouter) window.CodeSparkRouter.handleRoute();
        }
      });
    }
  };

  // 3. Settings View (الإعدادات وتفضيلات الصوت)
  window.SettingsView = {
    render(user) {
      const soundEnabled = window.SoundManager ? window.SoundManager.isEnabled() : true;

      return `
        <div class="content-body" style="max-width:850px;">
          
          <div style="margin-bottom:2rem;">
            <div class="badge badge-cyan" style="margin-bottom:0.35rem;">⚙️ إعدادات الحساب والتفضيلات</div>
            <h1 style="font-size:1.875rem; font-weight:900; margin:0;">الإعدادات والتفضيلات</h1>
            <p style="color:var(--text-muted); font-size:0.9375rem;">تخصيص تجربة التعلم، إعدادات الصوت، والأمان.</p>
          </div>

          <!-- Sound & UI Preferences Section -->
          <div class="card card-glass" style="margin-bottom:2rem; padding:1.75rem; border-color:var(--border-glow);">
            <h3 style="font-size:1.125rem; font-weight:800; margin-bottom:1.25rem; display:flex; align-items:center; gap:0.5rem; color:var(--cyan);">
              <span>🔊</span> تفضيلات الصوت والمؤثرات التفاعلية
            </h3>
            
            <div style="display:flex; flex-direction:column; gap:1.25rem;">
              
              <!-- Sound Click Toggle Item -->
              <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; background:rgba(7,11,20,0.6); border:1px solid var(--border-card); border-radius:var(--radius-md);">
                <div>
                  <div style="font-weight:800; font-size:0.95rem; color:var(--text-main); margin-bottom:0.25rem;">
                    صوت النقر التفاعلي (UI Click Sound)
                  </div>
                  <div style="font-size:0.8125rem; color:var(--text-muted); line-height:1.5;">
                    تشغيل نغمة نقر تقنية ناعمة وخفيفة عند الضغط على الأزرار والقوائم والمحرر
                  </div>
                </div>

                <div style="display:flex; align-items:center; gap:0.75rem;">
                  <button id="settings-sound-toggle-btn" class="btn ${soundEnabled ? 'btn-cyan' : 'btn-secondary'} btn-sm sound-toggle-btn">
                    <span>${soundEnabled ? '🔊 تشغيل' : '🔇 إيقاف'}</span>
                  </button>
                </div>
              </div>

              <!-- Theme Note -->
              <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; background:rgba(7,11,20,0.6); border:1px solid var(--border-card); border-radius:var(--radius-md);">
                <div>
                  <div style="font-weight:800; font-size:0.95rem; color:var(--text-main); margin-bottom:0.25rem;">
                    الوضع الداكن المستقبلي (Futuristic Dark Mode)
                  </div>
                  <div style="font-size:0.8125rem; color:var(--text-muted);">
                    تصميم عصري مريح للعين مخصص لبيئة تعلم وتطبيق البرمجة
                  </div>
                </div>
                <span class="badge badge-cyan">مفعّل دائمًا</span>
              </div>

            </div>
          </div>

          <!-- Account Security -->
          <div class="card card-glass" style="margin-bottom:2rem; padding:1.75rem;">
            <h3 style="font-size:1.125rem; font-weight:800; margin-bottom:1.25rem; display:flex; align-items:center; gap:0.5rem;">
              ${Icons.shield()} الأمان وكلمة المرور
            </h3>

            <form id="change-password-form">
              <div class="form-group">
                <label class="form-label" for="current-pass">كلمة المرور الحالية</label>
                <input type="password" id="current-pass" class="form-input" placeholder="••••••••" required>
              </div>

              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;" class="form-grid">
                <div class="form-group">
                  <label class="form-label" for="new-pass">كلمة المرور الجديدة</label>
                  <input type="password" id="new-pass" class="form-input" placeholder="6 أحرف على الأقل" required minlength="6">
                </div>
                <div class="form-group">
                  <label class="form-label" for="confirm-new-pass">تأكيد كلمة المرور</label>
                  <input type="password" id="confirm-new-pass" class="form-input" placeholder="أعد كتابة كلمة المرور" required minlength="6">
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-sm" style="margin-top:0.5rem;">
                تحديث كلمة المرور 🔒
              </button>
            </form>
          </div>

          <!-- Logout Button -->
          <div style="display:flex; justify-content:flex-end;">
            <button id="settings-logout-btn" class="btn btn-danger">
              ${Icons.logOut()} تسجيل الخروج من المنصة
            </button>
          </div>

        </div>
      `;
    },

    initEvents() {
      // Sound Toggle Handler
      const soundBtn = document.getElementById('settings-sound-toggle-btn');
      soundBtn?.addEventListener('click', () => {
        if (window.SoundManager) {
          const isNowEnabled = window.SoundManager.toggle();
          soundBtn.innerHTML = `<span>${isNowEnabled ? '🔊 تشغيل' : '🔇 إيقاف'}</span>`;
          soundBtn.className = `btn ${isNowEnabled ? 'btn-cyan' : 'btn-secondary'} btn-sm sound-toggle-btn`;
          UI.showToast(isNowEnabled ? 'تم تفعيل صوت النقر 🔊' : 'تم كتم صوت النقر 🔇', 'info', 2000);
        }
      });

      document.getElementById('change-password-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cur = document.getElementById('current-pass').value;
        const n = document.getElementById('new-pass').value;
        const c = document.getElementById('confirm-new-pass').value;

        if (n !== c) {
          UI.showToast('كلمتا المرور غير متطابقتين', 'error');
          return;
        }

        try {
          const res = await window.AuthService.changePassword(cur, n);
          if (res.success) {
            UI.showToast('تم تغيير كلمة المرور بنجاح 🔒', 'success');
            e.target.reset();
          }
        } catch (err) {
          UI.showToast(err.message || 'فشل تغيير كلمة المرور', 'error');
        }
      });

      document.getElementById('settings-logout-btn')?.addEventListener('click', async () => {
        if (window.CodeSparkAuth && window.CodeSparkAuth.logout) {
          await window.CodeSparkAuth.logout();
        }
      });
    }
  };

  // 4. Support & Help View (الدعم الأكاديمي)
  window.SupportView = {
    render(user) {
      user = user || {};
      const tickets = window.CodeSparkDB ? window.CodeSparkDB.getSupportTickets(user.role === 'admin' ? null : user.id) : [];
      
      return `
        <div class="content-body" style="max-width:960px;">
          
          <div style="margin-bottom:2rem;">
            <div class="badge badge-cyan" style="margin-bottom:0.35rem;">💬 خدمة الطلاب والدعم</div>
            <h1 style="font-size:1.875rem; font-weight:900; margin:0;">مركز المساعدة والدعم الأكاديمي</h1>
            <p style="color:var(--text-muted); font-size:0.9375rem;">لديك سؤال في منهج بايثون أو استفسار حول الاشتراك وتفعيل الأكواد؟ نحن هنا لمساعدتك.</p>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; margin-bottom:2.5rem;" class="form-grid">
            
            <!-- WhatsApp Direct Card -->
            <div class="card card-glass" style="background:linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(6,182,212,0.12) 100%); border-color:rgba(16,185,129,0.35); padding:1.75rem; display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div style="font-size:2.25rem; margin-bottom:0.5rem;">📱</div>
                <h3 style="font-size:1.15rem; font-weight:800; margin-bottom:0.5rem; color:var(--text-main);">التواصل المباشر عبر واتساب</h3>
                <p style="font-size:0.875rem; color:var(--text-muted); line-height:1.6;">
                  تواصل مع المشرف الأكاديمي ومسؤولي مادة البرمجة للرد على أسئلتك المنهجية وتجديد وتفعيل الاشتراكات مباشرة.
                </p>
              </div>
              <a href="https://wa.me/201012345678" target="_blank" class="btn btn-success" style="align-self:flex-start; margin-top:1rem;">
                ${Icons.whatsapp()} محادثة واتساب المباشرة
              </a>
            </div>

            <!-- Submit Ticket Form -->
            <div class="card card-glass" style="padding:1.75rem;">
              <h3 style="font-size:1.15rem; font-weight:800; margin-bottom:1rem; color:var(--text-main);">إرسال استفسار للمشرف</h3>
              <form id="support-ticket-form">
                <div class="form-group">
                  <label class="form-label" for="ticket-subject">موضوع الاستفسار / الدرس / الاشتراك</label>
                  <input type="text" id="ticket-subject" class="form-input" placeholder="مثال: سؤال في درس الحلقات أو تجديد الكود" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="ticket-msg">نص السؤال أو المشكلة</label>
                  <textarea id="ticket-msg" class="form-textarea" rows="3" placeholder="اكتب استفسارك بالتفصيل هنا..." required></textarea>
                </div>
                <button type="submit" id="submit-ticket-btn" class="btn btn-primary btn-sm" style="width:100%;">
                  إرسال الاستفسار الآن 🚀
                </button>
              </form>
            </div>

          </div>

          <!-- Student Previous Inquiries -->
          <div class="card card-glass" style="padding:1.5rem;">
            <div class="card-header" style="margin-bottom:1rem;">
              <div class="card-title">${Icons.helpCircle()} استفساراتك السابقة</div>
            </div>

            <div style="display:flex; flex-direction:column; gap:1rem;">
              ${tickets.length === 0 ? `
                <div style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted); font-size:0.875rem;">
                  لم ترسل أي استفسارات سابقة بعد.
                </div>
              ` : tickets.map(t => `
                <div style="padding:1.25rem; background:rgba(7,11,20,0.55); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; flex-wrap:wrap; gap:0.5rem;">
                    <h4 style="font-size:0.95rem; font-weight:800; color:var(--text-main); margin:0;">${t.subject}</h4>
                    <span class="badge ${t.status === 'answered' ? 'badge-success' : 'badge-warning'}">
                      ${t.status === 'answered' ? '✓ تم الرد' : '⏳ جاري المراجعة'}
                    </span>
                  </div>
                  <p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:0.75rem; line-height:1.5;">${t.message}</p>
                  ${t.reply ? `
                    <div style="background:rgba(14,22,38,0.8); border-right:3px solid var(--success); padding:0.875rem 1rem; border-radius:var(--radius-sm); font-size:0.8125rem; color:var(--text-main); line-height:1.6;">
                      <strong style="color:var(--success);">رد المشرف الأكاديمي:</strong> ${t.reply}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>

        </div>
      `;
    },

    initEvents(user) {
      document.getElementById('support-ticket-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const subject = document.getElementById('ticket-subject').value.trim();
        const msg = document.getElementById('ticket-msg').value.trim();

        try {
          await window.CodeSparkDB.createSupportTicket({
            studentId: user.id,
            studentName: user.name,
            subject: subject,
            message: msg
          });
          UI.showToast('تم إرسال استفسارك بنجاح إلى المشرف الأكاديمي', 'success');
          e.target.reset();
          if (window.CodeSparkRouter) window.CodeSparkRouter.handleRoute();
        } catch (err) {
          UI.showToast(err.message || 'فشل إرسال التذكرة', 'error');
        }
      });
    }
  };
})();

  // 4. Bookmarks / Favorites View (المفضلة ⭐)
  window.BookmarksView = {
    async render(user) {
      let bookmarks = [];
      try {
        bookmarks = await window.StudentService.getBookmarks();
      } catch (e) {
        console.warn('Error loading bookmarks:', e);
      }

      return `
        <div class="content-body" style="max-width:960px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-gold" style="margin-bottom:0.35rem;">⭐ المفضلة والمحفوظات</div>
              <h1 style="font-size:1.875rem; font-weight:900; margin:0;">الدروس والأسئلة المحفوظة</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">الوصول السريع إلى المحتوى والتدريبات التي قمت بتمييزها للرجوع إليها لاحقًا.</p>
            </div>
            <a href="#curriculum" class="btn btn-outline btn-sm">
              📚 تصفح المنهج
            </a>
          </div>

          <div style="display:flex; flex-direction:column; gap:1rem;" id="bookmarks-list-container">
            ${bookmarks.length === 0 ? `
              <div class="empty-state card card-glass" style="padding:3.5rem 1.5rem; text-align:center;">
                <div style="font-size:3rem; margin-bottom:0.75rem;">⭐</div>
                <h3 style="font-size:1.2rem; font-weight:800; color:var(--text-main); margin-bottom:0.5rem;">لا توجد عناصر محفوظة في المفضلة حالياً</h3>
                <p style="color:var(--text-muted); max-width:450px; margin:0 auto 1.5rem; line-height:1.6;">
                  يمكنك حفظ أي درس أو تدريب برمجي بالضغط على زر '⭐ المفضلة' داخل صفحة الدرس للرجوع إليه هنا في أي وقت.
                </p>
                <a href="#curriculum" class="btn btn-primary">
                  استكشاف الدروس الآن 🚀
                </a>
              </div>
            ` : bookmarks.map(bm => `
              <div class="card card-glass card-hover" style="padding:1.25rem 1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
                <div style="display:flex; align-items:center; gap:1rem;">
                  <div class="stat-icon-wrapper stat-icon-cyan" style="width:44px; height:44px; font-size:1.25rem;">
                    ${bm.item_type === 'lesson' ? Icons.book() : Icons.code()}
                  </div>
                  <div>
                    <h3 style="font-size:1.05rem; font-weight:800; color:var(--text-main); margin-bottom:0.25rem;">
                      ${bm.title}
                    </h3>
                    <div style="font-size:0.75rem; color:var(--text-muted);">
                      ${bm.item_type === 'lesson' ? 'درس تعليمي' : 'تدريب برمجي'} • تم الحفظ في ${bm.created_at ? bm.created_at.split('T')[0] : ''}
                    </div>
                  </div>
                </div>

                <div style="display:flex; align-items:center; gap:0.75rem;">
                  <a href="#${bm.item_type}/${bm.item_id}" class="btn btn-primary btn-sm">
                    فتح المحتوى ${Icons.arrowLeft()}
                  </a>
                  <button class="btn btn-ghost btn-sm remove-bookmark-btn" data-type="${bm.item_type}" data-id="${bm.item_id}" style="color:var(--danger);" title="إزالة من المفضلة">
                    ✕
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    },

    initEvents() {
      document.querySelectorAll('.remove-bookmark-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const type = btn.getAttribute('data-type');
          const id = btn.getAttribute('data-id');
          try {
            await window.StudentService.removeBookmark(type, id);
            if (window.UI && window.UI.showToast) window.UI.showToast('تمت إزالة العنصر من المفضلة', 'info');
            btn.closest('.card')?.remove();
          } catch (e) {}
        });
      });
    }
  };
