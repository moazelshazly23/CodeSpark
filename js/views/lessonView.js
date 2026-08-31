// Code Spark Interactive Lesson Page View
// Complete Student Journey: Video Player -> Theory -> Interactive Code -> Coding Exercise -> Lesson Quiz -> Progress
(function() {
  // YouTube ID Extraction Helper
  function extractYouTubeId(url) {
    if (!url) return null;
    const clean = url.trim();
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?m\.youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const p of patterns) {
      const match = clean.match(p);
      if (match) return match[1];
    }
    return null;
  }

  window.LessonView = {
    render(lessonId, user) {
      const lesson = window.CodeSparkDB.getLesson(lessonId);
      if (!lesson) {
        return `
          <div class="content-body">
            <div class="empty-state">
              <div class="empty-icon">📖</div>
              <h2 class="empty-title">الدرس غير موجود</h2>
              <a href="#curriculum" class="btn btn-primary">العودة لقائمة المنهج</a>
            </div>
          </div>
        `;
      }

      const unit = window.CodeSparkDB.getUnit(lesson.unitId) || { id: 'unit_1', title: 'الوحدة الأولى: أساسيات البرمجة' };
      const unitLessons = window.CodeSparkDB.getLessons(lesson.unitId);
      const progress = window.CodeSparkDB.getStudentProgress(user.id);
      const isCompleted = progress.completedLessons && progress.completedLessons.includes(lesson.id);
      const linkedResources = (window.CodeSparkDB && window.CodeSparkDB.getResources) ? window.CodeSparkDB.getResources(null, lesson.id) : [];

      // Find previous and next lessons
      const currentIndex = unitLessons.findIndex(l => l.id === lesson.id);
      const prevLesson = currentIndex > 0 ? unitLessons[currentIndex - 1] : null;
      const nextLesson = currentIndex < unitLessons.length - 1 ? unitLessons[currentIndex + 1] : null;

      // Determine Video Source Type
      const rawUrl = lesson.videoUrl || lesson.video_url || '';
      const vSource = lesson.videoSource || lesson.video_source;
      const ytId = extractYouTubeId(rawUrl) || lesson.videoId || lesson.video_id;
      
      const isYouTube = vSource === 'youtube' || (ytId && (rawUrl.includes('youtube') || rawUrl.includes('youtu.be') || !vSource));
      const isUpload = vSource === 'upload' || (!isYouTube && rawUrl && (rawUrl.includes('/storage/videos/') || rawUrl.endsWith('.mp4') || rawUrl.endsWith('.webm')));
      const hasVideo = (isYouTube && ytId) || (isUpload && rawUrl);

      // Fetch questions associated with this lesson for the quiz section
      const allQuestions = window.CodeSparkDB.getQuestions();
      const lessonQuestions = allQuestions.filter(q => q.lessonId === lesson.id || q.lesson_id === lesson.id);

      let videoSectionHtml = '';
      if (isYouTube && ytId) {
        const originParam = typeof window !== 'undefined' && window.location ? encodeURIComponent(window.location.origin) : '';
        const embedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?enablejsapi=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&controls=1${originParam ? '&origin=' + originParam : ''}`;
        videoSectionHtml = `
          <div id="section-video" class="card card-glass custom-video-player-container" style="padding:0; overflow:hidden; margin-bottom:2rem; border-color:var(--border-glow); position:relative;">
            <div class="responsive-video-wrapper" id="yt-player-wrapper">
              <iframe id="lesson-youtube-iframe"
                      src="${embedUrl}" 
                      title="${lesson.title} - شرح تفاعلي" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" 
                      allowfullscreen>
              </iframe>
            </div>
            
            <!-- YouTube Player Interactive Control & Status Bar -->
            <div class="video-custom-controls" style="padding:0.75rem 1.25rem; display:flex; justify-content:space-between; align-items:center; background:var(--bg-surface-elevated); flex-wrap:wrap; gap:0.75rem; border-top:1px solid var(--border-subtle);">
              <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
                <button type="button" id="yt-custom-play-btn" class="btn btn-primary btn-sm" style="display:flex; align-items:center; gap:0.35rem; padding:0.4rem 0.85rem; font-size:0.8125rem;">
                  <span id="yt-play-icon">${Icons.play('w-4 h-4')}</span> <span id="yt-play-label">تشغيل / إيقاف</span>
                </button>
                <div style="display:flex; align-items:center; gap:0.4rem;">
                  <button type="button" id="yt-custom-mute-btn" class="btn btn-ghost btn-icon-sm" title="كتم/تشغيل الصوت">
                    🔊
                  </button>
                  <input type="range" id="yt-volume-slider" min="0" max="100" value="100" style="width:70px; accent-color:var(--cyan); cursor:pointer; vertical-align:middle;" title="مستوى الصوت">
                </div>
                <div id="yt-time-display" style="font-size:0.8125rem; color:var(--text-muted); font-family:monospace; direction:ltr;">
                  00:00 / --:--
                </div>
              </div>

              <div style="display:flex; align-items:center; gap:0.6rem;">
                <span id="yt-playback-badge" class="badge badge-primary" style="font-size:0.75rem;">⏱️ حفظ الموضع نشط</span>
                <span class="badge badge-cyan">${lesson.duration || '20 دقيقة'}</span>
                <button type="button" id="yt-fullscreen-btn" class="btn btn-ghost btn-icon-sm" title="ملء الشاشة" style="font-size:1.1rem;">
                  ⛶
                </button>
              </div>
            </div>
          </div>
        `;
      } else if (isUpload && rawUrl) {
        const mimeType = lesson.mimeType || lesson.mime_type || 'video/mp4';
        videoSectionHtml = `
          <div id="section-video" class="card card-glass" style="padding:0; overflow:hidden; margin-bottom:2rem; border-color:var(--border-glow);">
            <div class="responsive-video-wrapper">
              <video id="lesson-html5-player" class="html5-video-player" controls playsinline preload="metadata" poster="${lesson.thumbnailUrl || ''}">
                <source src="${rawUrl}" type="${mimeType}">
                <div class="video-error-fallback">
                  <div class="error-icon">⚠️</div>
                  <div style="font-weight:700;">تعذر تشغيل الفيديو في متصفحك.</div>
                  <p style="font-size:0.875rem; color:var(--text-muted); margin-top:0.5rem;">يرجى التأكد من اتصالك بالإنترنت والمحاولة مجددًا.</p>
                </div>
              </video>
            </div>
            <div style="padding:1rem 1.25rem; display:flex; justify-content:space-between; align-items:center; background:var(--bg-surface-elevated); flex-wrap:wrap; gap:0.5rem;">
              <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.875rem; color:var(--text-muted);">
                ${Icons.playCircle()} فيديو الشرح المباشر (Direct MP4)
              </div>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span id="html5-playback-badge" class="badge badge-primary" style="font-size:0.75rem;">⏱️ حفظ الموضع نشط</span>
                <span class="badge badge-cyan">${lesson.duration || '20 دقيقة'}</span>
              </div>
            </div>
          </div>
        `;
      } else {
        videoSectionHtml = `
          <div class="card card-glass" style="padding:1.25rem 1.5rem; margin-bottom:2rem; display:flex; align-items:center; justify-content:space-between; border-color:var(--border-cyan); flex-wrap:wrap; gap:1rem;">
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span style="font-size:1.75rem;">💻</span>
              <div>
                <div style="font-weight:800; color:var(--text-main); font-size:1rem;">مختبر تفاعلي وشرح تطبيقي</div>
                <div style="font-size:0.8125rem; color:var(--text-muted);">هذا الدرس يركز على التطبيق العملي للبرمجة والمفاهيم النظرية في بيئة بايثون</div>
              </div>
            </div>
            <span class="badge badge-cyan">${lesson.duration || '15 دقيقة'}</span>
          </div>
        `;
      }

      return `
        <div class="content-body" style="padding-top:1rem;">
          
          <!-- Top Navigation Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; border-bottom:1px solid var(--border-subtle); padding-bottom:1rem;">
            <div>
              <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                <a href="#unit/${unit.id}" style="color:var(--cyan); font-size:0.8125rem; font-weight:700;">
                  ${unit.title.split(':')[0]}
                </a>
                <span style="color:var(--text-subtle);">/</span>
                <span style="color:var(--text-muted); font-size:0.8125rem;">الدرس ${lesson.order || lesson.number || 1}</span>
              </div>
              <h1 style="font-size: clamp(1.25rem, 2.2vw, 1.625rem); font-weight:800; margin:0;">
                ${lesson.title}
              </h1>
            </div>

            <div style="display:flex; align-items:center; gap:0.75rem;">
              <button id="mark-complete-btn" class="btn ${isCompleted ? 'btn-success' : 'btn-outline'} btn-sm">
                ${isCompleted ? '✓ تم إكمال الدرس' : 'تعليم كمكتمل'}
              </button>

              ${prevLesson ? `
                <a href="#lesson/${prevLesson.id}" class="btn btn-secondary btn-icon-sm" title="الدرس السابق">
                  ${Icons.chevronRight()}
                </a>
              ` : ''}

              ${nextLesson ? `
                <a href="#lesson/${nextLesson.id}" class="btn btn-primary btn-sm" title="الدرس التالي">
                  الدرس التالي ${Icons.chevronLeft()}
                </a>
              ` : `
                <a href="#unit/${unit.id}" class="btn btn-primary btn-sm">
                  إنهاء الوحدة ${Icons.check()}
                </a>
              `}
            </div>
          </div>

          <!-- Main Layout Split: Sidebar + Lesson Body -->
          <div style="display:grid; grid-template-columns: 300px 1fr; gap:2rem; align-items:flex-start;" class="lesson-layout-grid">
            
            <!-- Sidebar: Unit Navigation & Outline -->
            <div class="card hide-on-mobile" style="padding:1.25rem; position:sticky; top:88px;">
              <div style="font-weight:700; font-size:0.875rem; color:var(--text-main); margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center;">
                <span>دروس ${unit.title.split(':')[0]}</span>
                <span style="font-size:0.75rem; color:var(--cyan);">${unitLessons.length} دروس</span>
              </div>

              <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1.5rem;">
                ${unitLessons.map((l, idx) => {
                  const done = progress.completedLessons && progress.completedLessons.includes(l.id);
                  const isCurrent = l.id === lesson.id;
                  return `
                    <a href="#lesson/${l.id}" style="display:flex; align-items:center; gap:0.625rem; padding:0.5rem 0.75rem; border-radius:var(--radius-md); font-size:0.8125rem; font-weight:600; text-decoration:none; background:${isCurrent ? 'rgba(37,99,235,0.15)' : 'transparent'}; color:${isCurrent ? '#FFF' : (done ? 'var(--text-muted)' : 'var(--text-subtle)')}; border:${isCurrent ? '1px solid var(--border-glow)' : '1px solid transparent'};">
                      <span style="width:20px; height:20px; border-radius:50%; background:${done ? 'var(--success-bg)' : (isCurrent ? 'var(--cyan)' : 'var(--bg-surface-elevated)')}; color:${done ? 'var(--success)' : (isCurrent ? '#000' : 'var(--text-muted)')}; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:800;">
                        ${done ? '✓' : idx + 1}
                      </span>
                      <span style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${l.title}</span>
                    </a>
                  `;
                }).join('')}
              </div>

              <div style="border-top:1px solid var(--border-subtle); padding-top:1rem;">
                <div style="font-size:0.75rem; font-weight:700; color:var(--text-subtle); margin-bottom:0.5rem;">محتويات هذا الدرس:</div>
                <ul style="list-style:none; padding:0; margin:0; font-size:0.8125rem; color:var(--text-muted); display:flex; flex-direction:column; gap:0.35rem;">
                  ${hasVideo ? '<li><a href="#section-video" style="color:inherit;">📺 الشرح المرئي</a></li>' : ''}
                  <li><a href="#section-content" style="color:inherit;">📖 المفاهيم النظرية والتطبيقية</a></li>
                  <li><a href="#section-editor" style="color:inherit;">💻 التطبيق العملي المباشر</a></li>
                  ${lesson.exercise ? '<li><a href="#section-exercise" style="color:inherit;">🧩 تدريب "جرّب بنفسك"</a></li>' : ''}
                  ${lessonQuestions.length > 0 ? '<li><a href="#section-quiz" style="color:inherit;">📝 اختبار الفهم السريع</a></li>' : ''}
                  ${linkedResources.length > 0 ? '<li><a href="#section-resources" style="color:inherit;">📚 مذكرات وملفات الدرس</a></li>' : ''}
                </ul>
              </div>
            </div>

            <!-- Main Lesson Content -->
            <div>
              
              <!-- Video Section -->
              ${videoSectionHtml}

              <!-- Linked Educational Files Section -->
              ${linkedResources.length > 0 ? `
                <div id="section-resources" class="card card-glass" style="padding:1.5rem; margin-bottom:2rem; border-color:var(--border-cyan);">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
                    <div style="font-size:1.15rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:0.5rem;">
                      📚 مذكرات وملفات مرتبطة بهذا الدرس
                    </div>
                    <a href="#resources" class="btn btn-ghost btn-sm" style="color:var(--cyan); font-weight:700;">
                      تصفح كافة الملفات ←
                    </a>
                  </div>
                  <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:1rem;">
                    ${linkedResources.map(r => `
                      <div style="background:rgba(15,23,42,0.7); border:1px solid var(--border-card); border-radius:var(--radius-lg); padding:1rem; display:flex; justify-content:space-between; align-items:center; gap:1rem;">
                        <div style="display:flex; align-items:center; gap:0.75rem; overflow:hidden;">
                          <span style="font-size:1.5rem; color:#EF4444;">📄</span>
                          <div>
                            <div style="font-weight:800; font-size:0.9375rem; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;">
                              ${r.title}
                            </div>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">
                              ${r.file_size_label || 'PDF'} • ${r.category || 'مذكرة شرح'}
                            </div>
                          </div>
                        </div>
                        <div style="display:flex; gap:0.4rem; flex-shrink:0;">
                          <a href="${r.file_url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="font-size:0.75rem; padding:0.35rem 0.65rem;">
                            👁️ فتح
                          </a>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Explanation Text Section -->
              <div id="section-content" class="card" style="padding:2rem; margin-bottom:2rem; line-height:1.8;">
                <div class="badge badge-primary" style="margin-bottom:1rem;">الشرح النظري والتطبيقي</div>
                <div class="lesson-rich-body">
                  ${lesson.content || lesson.content_html || '<p>محتوى الدرس قيد التحديث.</p>'}
                </div>
              </div>

              <!-- In-Lesson Interactive Python Playground & IDE -->
              <div id="section-editor" style="margin-bottom:2rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
                  <div style="font-size:1.125rem; font-weight:800; display:flex; align-items:center; gap:0.5rem;">
                    ${Icons.code()} محرر بايثون التفاعلي والمساعد التعليمي
                  </div>
                  <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span id="lesson-autosave-badge" style="font-size:0.75rem; color:var(--cyan); opacity:0.6; transition:opacity 0.3s;">💾 حفظ تلقائي</span>
                    <button id="bookmark-lesson-btn" class="btn btn-ghost btn-sm" title="حفظ الدرس في المفضلة">
                      ⭐ المفضلة
                    </button>
                    <button id="toggle-lesson-notes-btn" class="btn btn-ghost btn-sm" title="تدوين ملاحظات شخصية">
                      📝 ملاحظاتي
                    </button>
                  </div>
                </div>

                <!-- Personal Notes Drawer (Collapsible) -->
                <div id="lesson-notes-drawer" style="display:none; background:rgba(15,23,42,0.8); border:1px solid var(--border-cyan); border-radius:var(--radius-md); padding:1rem; margin-bottom:1rem;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                    <span style="font-weight:700; font-size:0.875rem; color:var(--cyan);">📝 ملاحظاتك الشخصية على هذا الدرس:</span>
                    <span id="notes-save-status" style="font-size:0.75rem; color:var(--text-muted);"></span>
                  </div>
                  <textarea id="lesson-note-textarea" class="form-input" rows="3" placeholder="اكتب ملاحظاتك ونقاط التذكير الخاصة بك هنا..."></textarea>
                </div>

                <div class="editor-wrapper" id="lesson-editor-wrapper">
                  <div class="editor-toolbar">
                    <div class="editor-title">
                      <div class="editor-dots">
                        <span class="editor-dot red"></span>
                        <span class="editor-dot yellow"></span>
                        <span class="editor-dot green"></span>
                      </div>
                      <span>lesson_code.py</span>
                      <span class="badge badge-neutral" style="font-size:0.65rem;">Python 3.11</span>
                    </div>

                    <div class="editor-actions">
                      <!-- Hints & Help Buttons -->
                      <button id="lesson-hint-btn" class="btn btn-warning btn-sm" title="الحصول على تلميح تدريجي">
                        💡 تلميح
                      </button>
                      <button id="lesson-explain-btn" class="btn btn-secondary btn-sm" style="display:none;" title="شرح وتفسير الخطأ تعليميًا">
                        🤔 فهمني الخطأ
                      </button>
                      <button id="reset-lesson-code" class="btn btn-secondary btn-sm" title="إعادة الكود الأصلي">
                        ${Icons.refresh()} إعادة تعيين
                      </button>
                      <button id="clear-lesson-console" class="btn btn-ghost btn-sm" title="مسح المخرجات">
                        مسح
                      </button>
                      <button id="run-lesson-code" class="btn btn-primary btn-sm" style="box-shadow:0 0 15px rgba(6,182,212,0.4);">
                        ${Icons.play()} تشغيل الكود ▶
                      </button>
                    </div>
                  </div>

                  <!-- Progressive Hints Box -->
                  <div id="lesson-hints-drawer" class="editor-hints-box" style="display:none; margin:0; border-radius:0; border-left:none; border-right:none;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span style="font-weight:800; font-size:0.875rem; color:var(--gold);" id="hint-level-title">💡 تلميح المساعد التعليمي (المستوى 1):</span>
                      <button type="button" id="next-hint-btn" class="btn btn-ghost btn-sm" style="color:var(--gold); font-size:0.75rem;">تلميح تالي ←</button>
                    </div>
                    <div id="hint-text-content" class="hint-tier-step"></div>
                  </div>

                  <!-- Real-time Syntax Error Banner -->
                  <div id="lesson-syntax-banner" class="editor-error-banner" style="display:none;">
                    <span class="error-banner-text">💡 تحقق من صياغة السطر</span>
                    <button type="button" class="explain-btn" id="syntax-explain-btn">شرح الخطأ</button>
                  </div>

                  <div class="editor-workspace">
                    <!-- Code Editor Input -->
                    <div class="code-input-area">
                      <div class="line-numbers" id="lesson-line-numbers">1<br>2<br>3<br>4<br>5</div>
                      <textarea id="lesson-code-input" class="code-textarea" spellcheck="false" dir="ltr">${lesson.codeExample || lesson.code_example || 'print("مرحبًا بكم في Code Spark")'}</textarea>
                    </div>

                    <!-- Live Console Output -->
                    <div class="console-area">
                      <div class="console-header">
                        <span>Terminal Output</span>
                        <span id="lesson-run-status" style="color:var(--text-subtle);">جاهز للتشغيل</span>
                      </div>
                      <div id="lesson-console-out" class="console-output" dir="ltr">اضغط على "تشغيل الكود ▶" لمشاهدة المخرجات هنا...</div>
                    </div>
                  </div>
                </div>

                <!-- Error Explanation Modal / Card -->
                <div id="explain-error-modal" class="modal-backdrop" style="display:none;">
                  <div class="modal-dialog" style="max-width:600px;">
                    <div class="modal-header">
                      <h3 class="modal-title">🤔 تشخيص وفهم الخطأ البرمجي</h3>
                      <button type="button" class="modal-close" id="close-explain-modal-btn">✕</button>
                    </div>
                    <div class="modal-body" id="explain-error-modal-body" style="display:flex; flex-direction:column; gap:1.25rem;">
                      <!-- Populated dynamically -->
                    </div>
                    <div class="modal-footer">
                      <button type="button" class="btn btn-primary" id="done-explain-modal-btn" style="width:100%;">
                        فهمت الخطأ، سأقوم بالتصحيح 👍
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              <!-- In-Lesson Exercise Section -->
              ${lesson.exercise ? `
                <div id="section-exercise" class="card" style="background:linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.5) 100%); border-color:var(--border-cyan); padding:1.75rem; margin-bottom:2rem;">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
                    <div>
                      <span class="badge badge-cyan" style="margin-bottom:0.5rem;">🧩 تدريب: جرّب بنفسك (+30 XP)</span>
                      <h3 style="font-size:1.125rem; font-weight:800; color:var(--text-main);">${lesson.exercise.title}</h3>
                    </div>
                    <button id="show-solution-btn" class="btn btn-outline btn-sm">
                      ${Icons.eye()} إظهار الحل النموذجي
                    </button>
                  </div>

                  <p style="font-size:0.9375rem; color:var(--text-muted); line-height:1.7; margin-bottom:1.25rem;">
                    ${lesson.exercise.instruction || lesson.exercise.description || ''}
                  </p>

                  <div class="editor-wrapper" style="margin:0 0 1rem 0;">
                    <div class="editor-toolbar">
                      <div class="editor-title">
                        <span>exercise_solve.py</span>
                      </div>
                      <div class="editor-actions">
                        <button id="run-exercise-code" class="btn btn-primary btn-sm">
                          ${Icons.check()} تحقق من الإجابة وتسليم الحل
                        </button>
                      </div>
                    </div>
                    <div class="editor-workspace">
                      <div class="code-input-area">
                        <textarea id="exercise-code-input" class="code-textarea" style="min-height:120px;" spellcheck="false" dir="ltr">${lesson.exercise.starterCode || lesson.exercise.starter_code || ''}</textarea>
                      </div>
                      <div class="console-area">
                        <div class="console-header">النتيجة والتقييم الخادم</div>
                        <div id="exercise-console-out" class="console-output" dir="ltr">اكتب حلك ثم اضغط على "تحقق من الإجابة"...</div>
                      </div>
                    </div>
                  </div>

                  <div id="solution-box" style="display:none; background:#070C18; border:1px solid var(--border-glow); border-radius:var(--radius-md); padding:1rem; margin-top:1rem;">
                    <div style="font-weight:700; font-size:0.875rem; color:var(--cyan); margin-bottom:0.5rem;">💡 الحل النموذجي المنهجي:</div>
                    <pre class="code-font ltr" style="color:#E2E8F0; margin:0; font-size:0.875rem;" dir="ltr">${lesson.exercise.solutionCode || lesson.exercise.solution_code || ''}</pre>
                  </div>
                </div>
              ` : ''}

              <!-- In-Lesson Interactive Quiz Section -->
              ${lessonQuestions.length > 0 ? `
                <div id="section-quiz" class="card card-glass" style="border-color:var(--border-glow); padding:1.75rem; margin-bottom:2rem;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:0.5rem; border-bottom:1px solid var(--border-subtle); padding-bottom:0.75rem;">
                    <div>
                      <span class="badge badge-warning" style="margin-bottom:0.35rem;">📝 اختبار استيعاب الدرس (+30 XP)</span>
                      <h3 style="font-size:1.125rem; font-weight:800; color:var(--text-main); margin:0;">
                        اختبار الفهم السريع: ${lesson.title}
                      </h3>
                    </div>
                    <span class="badge badge-cyan">${lessonQuestions.length} أسئلة تقييمية</span>
                  </div>

                  <form id="lesson-quiz-form">
                    ${lessonQuestions.map((q, qIdx) => `
                      <div class="card" style="background:var(--bg-surface-elevated); padding:1.25rem; margin-bottom:1rem; border:1px solid var(--border-card);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                          <span class="badge badge-primary" style="font-size:0.75rem;">السؤال ${qIdx + 1}</span>
                          <span style="font-size:0.75rem; color:var(--text-muted);">${q.score || 10} درجات</span>
                        </div>
                        
                        <p style="font-weight:700; font-size:0.9375rem; color:var(--text-main); line-height:1.6; margin-bottom:1rem; white-space:pre-line;">
                          ${q.question || q.question_text}
                        </p>

                        ${q.codeSnippet ? `
                          <pre class="code-font ltr" style="background:#070C18; padding:0.75rem 1rem; border-radius:var(--radius-md); font-size:0.8125rem; margin-bottom:1rem;" dir="ltr">${q.codeSnippet}</pre>
                        ` : ''}

                        <div style="display:flex; flex-direction:column; gap:0.5rem;">
                          ${(q.options || []).map((opt, optIdx) => `
                            <label class="option-label" style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1rem; border-radius:var(--radius-md); border:1px solid var(--border-card); background:var(--bg-surface); cursor:pointer;">
                              <input type="radio" name="quiz_q_${q.id}" value="${optIdx}" style="accent-color:var(--cyan); width:16px; height:16px;">
                              <span style="font-size:0.875rem; color:var(--text-main);">${opt}</span>
                            </label>
                          `).join('')}
                        </div>

                        <div id="quiz-feedback-${q.id}" style="display:none; margin-top:0.75rem; padding:0.75rem; border-radius:var(--radius-md); font-size:0.8125rem; line-height:1.6;"></div>
                      </div>
                    `).join('')}

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.25rem; flex-wrap:wrap; gap:1rem;">
                      <div id="quiz-result-summary" style="font-weight:700; font-size:0.9375rem;"></div>
                      <button type="submit" id="submit-quiz-btn" class="btn btn-primary">
                        ${Icons.check()} تسليم إجابة الاختبار القصير ⚡
                      </button>
                    </div>
                  </form>
                </div>
              ` : ''}

              <!-- Bottom Lesson Navigation Card -->
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; padding-top:1.5rem; border-top:1px solid var(--border-subtle);">
                ${prevLesson ? `
                  <a href="#lesson/${prevLesson.id}" class="btn btn-secondary">
                    ${Icons.arrowRight()} الدرس السابق: ${prevLesson.title}
                  </a>
                ` : '<div></div>'}

                ${nextLesson ? `
                  <a href="#lesson/${nextLesson.id}" class="btn btn-primary btn-lg">
                    الدرس التالي: ${nextLesson.title} ${Icons.arrowLeft()}
                  </a>
                ` : `
                  <a href="#unit/${unit.id}" class="btn btn-primary btn-lg">
                    🎉 إكمال الوحدة والعودة للتقييم ${Icons.check()}
                  </a>
                `}
              </div>

            </div>

          </div>

        </div>
      `;
    },

    initEvents(lessonId, user) {
      const lesson = window.CodeSparkDB.getLesson(lessonId);
      if (!lesson) return;

      // Mark Complete button
      const completeBtn = document.getElementById('mark-complete-btn');
      if (completeBtn) {
        completeBtn.addEventListener('click', async () => {
          if (window.ProgressService) {
            await window.ProgressService.updateLessonProgress(lesson.id, 100, true, 0);
          }
          window.CodeSparkDB.markLessonCompleted(user.id, lesson.id);
          completeBtn.className = 'btn btn-success btn-sm';
          completeBtn.innerHTML = '✓ تم إكمال الدرس بنجاح';
          if (window.UI && window.UI.showToast) {
            window.UI.showToast('أحسنت! تم تسجيل إكمال الدرس بنجاح وإضافة 50 نقطة XP 🎉', 'success');
            window.UI.celebrateConfetti();
          }
        });
      }

      // ==========================================
      // YouTube Interactive Player API & Progress Tracking
      // ==========================================
      const ytIframe = document.getElementById('lesson-youtube-iframe');
      const ytContainer = document.getElementById('section-video');
      if (ytIframe && ytContainer) {
        let ytPlayer = null;
        let ytTimer = null;
        let ytLastLoggedSec = 0;
        let ytLastReportedTime = 0;

        const formatTime = (secs) => {
          if (!secs || isNaN(secs) || secs < 0) return '00:00';
          const m = Math.floor(secs / 60);
          const s = Math.floor(secs % 60);
          return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
        };

        const updateTimeDisplay = () => {
          if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
          try {
            const cur = Math.floor(ytPlayer.getCurrentTime() || 0);
            const dur = Math.floor(ytPlayer.getDuration() || 0);
            const timeEl = document.getElementById('yt-time-display');
            if (timeEl && dur > 0) {
              timeEl.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
            }

            const nowMs = Date.now();
            if (cur !== ytLastLoggedSec && (nowMs - ytLastReportedTime > 5000) && dur > 0) {
              ytLastLoggedSec = cur;
              ytLastReportedTime = nowMs;
              const pct = Math.min(100, Math.round((cur / dur) * 100));
              const badge = document.getElementById('yt-playback-badge');
              if (badge) badge.textContent = `⏱️ المشاهدة: ${pct}%`;
              if (window.ProgressService && cur > 0) {
                window.ProgressService.updateVideoProgress(lesson.id, cur, pct);
              }
            }
          } catch (e) {}
        };

        const initYTPlayerInstance = () => {
          try {
            ytPlayer = new window.YT.Player('lesson-youtube-iframe', {
              events: {
                onReady: (event) => {
                  const startPos = lesson.lastPosition || lesson.last_position || 0;
                  const dur = event.target.getDuration ? event.target.getDuration() : 0;
                  if (startPos > 0 && dur > 0 && startPos < dur - 5) {
                    event.target.seekTo(startPos, true);
                    const badge = document.getElementById('yt-playback-badge');
                    if (badge) badge.textContent = '⏱️ تم استئناف الموضع';
                  }
                  updateTimeDisplay();
                },
                onStateChange: (event) => {
                  const playLabel = document.getElementById('yt-play-label');
                  const playIcon = document.getElementById('yt-play-icon');

                  if (event.data === window.YT.PlayerState.PLAYING) {
                    if (playLabel) playLabel.textContent = 'إيقاف مؤقت';
                    if (playIcon && window.Icons) playIcon.innerHTML = '⏸️';
                    clearInterval(ytTimer);
                    ytTimer = setInterval(updateTimeDisplay, 1000);
                  } else if (event.data === window.YT.PlayerState.PAUSED) {
                    if (playLabel) playLabel.textContent = 'تشغيل';
                    if (playIcon && window.Icons) playIcon.innerHTML = Icons.play('w-4 h-4');
                    clearInterval(ytTimer);
                    updateTimeDisplay();
                    const cur = Math.floor(event.target.getCurrentTime() || 0);
                    const dur = Math.floor(event.target.getDuration() || 1);
                    const pct = Math.min(100, Math.round((cur / dur) * 100));
                    if (window.ProgressService && cur > 0) {
                      window.ProgressService.updateVideoProgress(lesson.id, cur, pct);
                    }
                  } else if (event.data === window.YT.PlayerState.ENDED) {
                    if (playLabel) playLabel.textContent = 'إعادة التشغيل';
                    if (playIcon && window.Icons) playIcon.innerHTML = Icons.play('w-4 h-4');
                    clearInterval(ytTimer);
                    const dur = Math.floor(event.target.getDuration() || 0);
                    if (window.ProgressService) {
                      window.ProgressService.updateLessonProgress(lesson.id, 100, true, dur);
                    }
                    if (window.CodeSparkDB) {
                      window.CodeSparkDB.markLessonCompleted(user.id, lesson.id);
                    }
                    if (completeBtn) {
                      completeBtn.className = 'btn btn-success btn-sm';
                      completeBtn.innerHTML = '✓ تم إكمال الدرس بنجاح';
                    }
                    if (window.UI && window.UI.showToast) {
                      window.UI.showToast('رائع! أنهيت مشاهدة فيديو الشرح بالكامل وتم تسجيل إكمال الدرس بنجاح ⚡', 'success');
                      window.UI.celebrateConfetti();
                    }
                  }
                }
              }
            });
          } catch (err) {
            console.warn('YouTube Player initialization fallback:', err);
          }
        };

        // Load YouTube Iframe API dynamically if not yet ready
        if (!window.YT || !window.YT.Player) {
          const existingScript = document.getElementById('youtube-iframe-api-script');
          if (!existingScript) {
            const tag = document.createElement('script');
            tag.id = 'youtube-iframe-api-script';
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            if (firstScriptTag && firstScriptTag.parentNode) {
              firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            } else {
              document.head.appendChild(tag);
            }
          }
          const prevReady = window.onYouTubeIframeAPIReady;
          window.onYouTubeIframeAPIReady = () => {
            if (typeof prevReady === 'function') prevReady();
            initYTPlayerInstance();
          };
          // Fallback poll in case API script already loaded
          let checkCount = 0;
          const pollYT = setInterval(() => {
            checkCount++;
            if (window.YT && window.YT.Player) {
              clearInterval(pollYT);
              if (!ytPlayer) initYTPlayerInstance();
            }
            if (checkCount > 20) clearInterval(pollYT);
          }, 250);
        } else {
          initYTPlayerInstance();
        }

        // Custom Play/Pause Toggle Button
        document.getElementById('yt-custom-play-btn')?.addEventListener('click', () => {
          if (!ytPlayer) return;
          try {
            const state = ytPlayer.getPlayerState ? ytPlayer.getPlayerState() : -1;
            if (state === window.YT.PlayerState.PLAYING) {
              ytPlayer.pauseVideo();
            } else {
              ytPlayer.playVideo();
            }
          } catch (e) {
            // postMessage fallback
            ytIframe.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          }
        });

        // Custom Mute/Unmute Button
        const muteBtn = document.getElementById('yt-custom-mute-btn');
        muteBtn?.addEventListener('click', () => {
          if (!ytPlayer) return;
          try {
            if (ytPlayer.isMuted()) {
              ytPlayer.unMute();
              muteBtn.textContent = '🔊';
            } else {
              ytPlayer.mute();
              muteBtn.textContent = '🔇';
            }
          } catch (e) {}
        });

        // Custom Volume Slider
        const volSlider = document.getElementById('yt-volume-slider');
        volSlider?.addEventListener('input', () => {
          if (!ytPlayer) return;
          try {
            const vol = parseInt(volSlider.value, 10);
            ytPlayer.setVolume(vol);
            if (vol === 0) {
              ytPlayer.mute();
              if (muteBtn) muteBtn.textContent = '🔇';
            } else {
              ytPlayer.unMute();
              if (muteBtn) muteBtn.textContent = '🔊';
            }
          } catch (e) {}
        });

        // Fullscreen Toggle Button (Fullscreen API with cross-browser prefixes)
        document.getElementById('yt-fullscreen-btn')?.addEventListener('click', () => {
          const wrapper = document.getElementById('yt-player-wrapper') || ytContainer;
          if (!wrapper) return;
          if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
          } else {
            if (wrapper.requestFullscreen) wrapper.requestFullscreen();
            else if (wrapper.webkitRequestFullscreen) wrapper.webkitRequestFullscreen();
            else if (wrapper.mozRequestFullScreen) wrapper.mozRequestFullScreen();
            else if (wrapper.msRequestFullscreen) wrapper.msRequestFullscreen();
          }
        });
      }

      // ==========================================
      // HTML5 Direct Video Player Tracking
      // ==========================================
      const html5Player = document.getElementById('lesson-html5-player');
      if (html5Player) {
        let lastLoggedSec = 0;
        let lastReportedTime = 0;

        html5Player.addEventListener('loadedmetadata', () => {
          const startPos = lesson.lastPosition || lesson.last_position || 0;
          if (startPos > 0 && html5Player.duration && startPos < html5Player.duration - 5) {
            html5Player.currentTime = startPos;
          }
        });

        html5Player.addEventListener('timeupdate', () => {
          const currentSec = Math.floor(html5Player.currentTime);
          const durationSec = Math.floor(html5Player.duration) || 1;
          const nowMs = Date.now();

          if (currentSec !== lastLoggedSec && (nowMs - lastReportedTime > 5000)) {
            lastLoggedSec = currentSec;
            lastReportedTime = nowMs;
            const pct = Math.min(100, Math.round((currentSec / durationSec) * 100));
            
            const badge = document.getElementById('html5-playback-badge');
            if (badge) badge.textContent = `⏱️ المشاهدة: ${pct}%`;

            if (window.ProgressService) {
              window.ProgressService.updateVideoProgress(lesson.id, currentSec, pct);
            }
          }
        });

        html5Player.addEventListener('pause', () => {
          const currentSec = Math.floor(html5Player.currentTime);
          const durationSec = Math.floor(html5Player.duration) || 1;
          const pct = Math.min(100, Math.round((currentSec / durationSec) * 100));
          if (window.ProgressService && currentSec > 0) {
            window.ProgressService.updateVideoProgress(lesson.id, currentSec, pct);
          }
        });

        html5Player.addEventListener('ended', async () => {
          if (window.ProgressService) {
            await window.ProgressService.updateLessonProgress(lesson.id, 100, true, Math.floor(html5Player.duration || 0));
          }
          window.CodeSparkDB.markLessonCompleted(user.id, lesson.id);
          if (completeBtn) {
            completeBtn.className = 'btn btn-success btn-sm';
            completeBtn.innerHTML = '✓ تم إكمال الدرس بنجاح';
          }
          if (window.UI && window.UI.showToast) {
            window.UI.showToast('رائع! أنهيت مشاهدة الفيديو بالكامل وتم تسجيل إكمال الدرس بنجاح ⚡', 'success');
            window.UI.celebrateConfetti();
          }
        });

        html5Player.addEventListener('error', () => {
          const badge = document.getElementById('html5-playback-badge');
          if (badge) {
            badge.className = 'badge badge-danger';
            badge.textContent = 'تعذر تحميل الفيديو';
          }
        });
      }

      // Lesson Code Editor

      // Attach Smart IDE Helper (Auto-indent, auto-brackets, line numbers, syntax check, autocomplete)
      if (window.CodeEditorHelper && codeInput && lineNums) {
        window.CodeEditorHelper.attach(codeInput, lineNums, {
          lessonId: lesson.id,
          storageKey: `codespark_autosave_${lesson.id}`,
          errorBannerEl: document.getElementById('lesson-syntax-banner'),
          saveIndicatorId: 'lesson-autosave-badge',
          restoreSaved: true
        });
      }

      // Progressive Hints Handler
      let currentHintLevel = 1;
      const hintBtn = document.getElementById('lesson-hint-btn');
      const hintsDrawer = document.getElementById('lesson-hints-drawer');
      const hintTitle = document.getElementById('hint-level-title');
      const hintContent = document.getElementById('hint-text-content');
      const nextHintBtn = document.getElementById('next-hint-btn');

      const fetchAndShowHint = async (lvl) => {
        try {
          const res = await window.CodeExecutor.getHint(lesson.id, lvl, codeInput ? codeInput.value : '', lesson.title || 'general');
          if (res.success && hintsDrawer && hintContent) {
            currentHintLevel = res.level || lvl;
            hintsDrawer.style.display = 'block';
            if (hintTitle) hintTitle.textContent = `💡 تلميح المساعد التعليمي (المستوى ${currentHintLevel} من ${res.max_levels || 3}):`;
            hintContent.textContent = res.hint || '';
            if (nextHintBtn) {
              nextHintBtn.style.display = res.has_more_hints ? 'inline-block' : 'none';
            }
          }
        } catch (e) {}
      };

      hintBtn?.addEventListener('click', () => {
        if (hintsDrawer && hintsDrawer.style.display !== 'none') {
          hintsDrawer.style.display = 'none';
        } else {
          currentHintLevel = 1;
          fetchAndShowHint(1);
        }
      });

      nextHintBtn?.addEventListener('click', () => {
        fetchAndShowHint(currentHintLevel + 1);
      });

      // Explain Error Handler
      let lastExecutionError = '';
      const explainBtn = document.getElementById('lesson-explain-btn');
      const syntaxExplainBtn = document.getElementById('syntax-explain-btn');
      const explainModal = document.getElementById('explain-error-modal');
      const explainModalBody = document.getElementById('explain-error-modal-body');
      const closeExplainBtn = document.getElementById('close-explain-modal-btn');
      const doneExplainBtn = document.getElementById('done-explain-modal-btn');

      const openExplainModal = async (errorText) => {
        if (!explainModal || !explainModalBody) return;
        explainModalBody.innerHTML = '<div style="text-align:center; padding:2rem;">⏳ جاري تحليل الخطأ وصياغة الشرح التعليمي...</div>';
        explainModal.style.display = 'flex';

        try {
          const res = await window.CodeExecutor.explainError(codeInput ? codeInput.value : '', errorText || lastExecutionError);
          if (res.success) {
            explainModalBody.innerHTML = `
              <div style="background:rgba(239,68,68,0.1); border:1px solid var(--danger); border-radius:var(--radius-md); padding:1rem;">
                <div style="font-weight:800; font-size:1rem; color:#F87171; margin-bottom:0.25rem;">📌 ${res.meaning || 'خطأ أثناء التنفيذ'}</div>
                <div style="font-size:0.8125rem; color:var(--text-muted); font-family:var(--font-mono);">${(errorText || lastExecutionError).split('\n')[0]}</div>
              </div>

              <div>
                <h4 style="font-size:0.9375rem; font-weight:800; color:var(--text-main); margin-bottom:0.35rem;">🔍 سبب الحدوث المحتمل:</h4>
                <p style="font-size:0.875rem; color:var(--text-muted); line-height:1.6; margin:0;">${res.cause || ''}</p>
              </div>

              <div style="background:rgba(6,182,212,0.08); border:1px solid rgba(6,182,212,0.3); border-radius:var(--radius-md); padding:1rem;">
                <h4 style="font-size:0.9375rem; font-weight:800; color:var(--cyan); margin-bottom:0.35rem;">🛠️ ما الذي يجب عليك مراجعته؟</h4>
                <div style="font-size:0.875rem; color:#E2E8F0; line-height:1.7; white-space:pre-line;">${res.guidance || ''}</div>
              </div>
            `;
          }
        } catch (e) {
          explainModalBody.innerHTML = '<div style="color:var(--danger); padding:1rem;">تعذر جلب الشرح في الوقت الحالي. راجع صيغة الكود.</div>';
        }
      };

      explainBtn?.addEventListener('click', () => openExplainModal(lastExecutionError));
      syntaxExplainBtn?.addEventListener('click', () => {
        const text = document.querySelector('#lesson-syntax-banner .error-banner-text')?.textContent || '';
        openExplainModal(text);
      });
      closeExplainBtn?.addEventListener('click', () => { if (explainModal) explainModal.style.display = 'none'; });
      doneExplainBtn?.addEventListener('click', () => { if (explainModal) explainModal.style.display = 'none'; });

      // Bookmark Lesson
      const bookmarkBtn = document.getElementById('bookmark-lesson-btn');
      bookmarkBtn?.addEventListener('click', async () => {
        try {
          const res = await window.StudentService.addBookmark('lesson', lesson.id, lesson.title || 'درس');
          if (res.success) {
            bookmarkBtn.textContent = '⭐ تم الحفظ في المفضلة';
            bookmarkBtn.style.color = 'var(--gold)';
            if (window.UI && window.UI.showToast) window.UI.showToast('تمت إضافة الدرس إلى المفضلة ⭐', 'success');
          }
        } catch (e) {}
      });

      // Personal Notes Drawer
      const notesBtn = document.getElementById('toggle-lesson-notes-btn');
      const notesDrawer = document.getElementById('lesson-notes-drawer');
      const noteTextarea = document.getElementById('lesson-note-textarea');
      const noteStatus = document.getElementById('notes-save-status');

      if (notesBtn && notesDrawer) {
        notesBtn.addEventListener('click', async () => {
          const isHidden = notesDrawer.style.display === 'none';
          notesDrawer.style.display = isHidden ? 'block' : 'none';
          if (isHidden && noteTextarea && !noteTextarea.value) {
            try {
              const res = await window.StudentService.getNote(lesson.id);
              if (res && res.note && res.note.note_text) {
                noteTextarea.value = res.note.note_text;
              }
            } catch (e) {}
          }
        });

        let noteTimer = null;
        noteTextarea?.addEventListener('input', () => {
          if (noteStatus) noteStatus.textContent = 'جاري الحفظ...';
          clearTimeout(noteTimer);
          noteTimer = setTimeout(async () => {
            try {
              await window.StudentService.saveNote(lesson.id, noteTextarea.value);
              if (noteStatus) noteStatus.textContent = '✓ تم الحفظ';
              setTimeout(() => { if (noteStatus) noteStatus.textContent = ''; }, 2000);
            } catch (e) {}
          }, 1000);
        });
      }


      const codeInput = document.getElementById('lesson-code-input');
      const lineNums = document.getElementById('lesson-line-numbers');
      const runBtn = document.getElementById('run-lesson-code');
      const resetBtn = document.getElementById('reset-lesson-code');
      const clearBtn = document.getElementById('clear-lesson-console');
      const consoleOut = document.getElementById('lesson-console-out');
      const statusText = document.getElementById('lesson-run-status');

      const updateLines = () => {
        if (!codeInput || !lineNums) return;
        const count = codeInput.value.split('\n').length;
        lineNums.innerHTML = Array.from({ length: Math.max(1, count) }, (_, i) => i + 1).join('<br>');
      };

      if (codeInput) {
        codeInput.addEventListener('input', updateLines);
        updateLines();
      }

      if (resetBtn && codeInput) {
        resetBtn.addEventListener('click', () => {
          codeInput.value = lesson.codeExample || lesson.code_example || '';
          updateLines();
          if (consoleOut) consoleOut.innerHTML = 'تمت إعادة الكود الأصلي.';
        });
      }

      if (clearBtn && consoleOut) {
        clearBtn.addEventListener('click', () => {
          consoleOut.textContent = '';
          if (statusText) statusText.textContent = 'جاهز للتشغيل';
        });
      }

      if (runBtn && codeInput && consoleOut) {
        runBtn.addEventListener('click', async () => {
          if (statusText) statusText.textContent = 'جاري التنفيذ...';
          consoleOut.className = 'console-output';
          consoleOut.textContent = '⏳ جاري تشغيل الكود في بيئة بايثون الآمنة...';

          const res = await window.CodeExecutor.run(codeInput.value);
          if (res.success) {
            if (statusText) statusText.textContent = `تم بنجاح (${res.executionTimeMs || 0}ms)`;
            consoleOut.className = 'console-output success';
            consoleOut.textContent = res.output || '(البرنامج نفّذ الأوامر دون طباعة مخرجات)';
          } else {
            if (statusText) statusText.textContent = 'خطأ برمجي ⚠️';
            consoleOut.className = 'console-output error';
            consoleOut.textContent = res.error || 'حدث خطأ غير متوقع';
            lastExecutionError = res.error || '';
            if (explainBtn) explainBtn.style.display = 'inline-flex';
          }
        });
      }

      // In-Lesson Exercise validation via Server-Side Execution
      const exerciseInput = document.getElementById('exercise-code-input');
      const exerciseRunBtn = document.getElementById('run-exercise-code');
      const exerciseOut = document.getElementById('exercise-console-out');
      const solutionBtn = document.getElementById('show-solution-btn');
      const solutionBox = document.getElementById('solution-box');

      if (solutionBtn && solutionBox) {
        solutionBtn.addEventListener('click', () => {
          const isHidden = solutionBox.style.display === 'none';
          solutionBox.style.display = isHidden ? 'block' : 'none';
          solutionBtn.innerHTML = isHidden ? `${Icons.eyeOff()} إخفاء الحل` : `${Icons.eye()} إظهار الحل النموذجي`;
        });
      }

      if (exerciseRunBtn && exerciseInput && exerciseOut) {
        exerciseRunBtn.addEventListener('click', async () => {
          exerciseOut.textContent = '⏳ جاري فحص الإجابة ومطابقة الحالات على الخادم...';
          exerciseOut.className = 'console-output';

          const res = await window.CodeExecutor.verifyExercise(lesson.id, exerciseInput.value);
          if (res.success && res.passed) {
            exerciseOut.className = 'console-output success';
            exerciseOut.innerHTML = `✅ ${res.message || 'إجابة صحيحة وممتازة!'}\n\nمخرجات كودك:\n${res.output || ''}\n\n🎉 تمت إضافة +${res.xp_earned || 30} XP لرصيدك بنجاح!`;
            if (window.UI && window.UI.showToast) {
              window.UI.showToast('إجابة صحيحة! أحسنت يا بطل (+30 XP) ⚡', 'success');
              window.UI.celebrateConfetti();
            }
          } else {
            exerciseOut.className = 'console-output error';
            exerciseOut.innerHTML = `⚠️ ${res.message || 'المخرجات لم تطابق المطلوب.'}\n\n${res.error || res.output || ''}\n\n💡 راجع رأس السؤال والمطلوب بدقة ثم أعد المحاولة.`;
          }
        });
      }

      // ==========================================
      // In-Lesson Quiz Submission & Server Grading
      // ==========================================
      const quizForm = document.getElementById('lesson-quiz-form');
      if (quizForm) {
        quizForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const submitBtn = document.getElementById('submit-quiz-btn');
          const summaryEl = document.getElementById('quiz-result-summary');

          const allQuestions = window.CodeSparkDB.getQuestions();
          const lessonQuestions = allQuestions.filter(q => q.lessonId === lesson.id || q.lesson_id === lesson.id);

          const answers = {};
          lessonQuestions.forEach(q => {
            const selected = quizForm.querySelector(`input[name="quiz_q_${q.id}"]:checked`);
            if (selected) {
              answers[q.id] = parseInt(selected.value, 10);
            }
          });

          if (Object.keys(answers).length < lessonQuestions.length) {
            if (!confirm(`لقد أجبت على ${Object.keys(answers).length} من أصل ${lessonQuestions.length} أسئلة فقط. هل تريد تسليم الإجابات الآن؟`)) {
              return;
            }
          }

          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'جاري التقييم ورصد الدرجات... ⏳';
          }

          try {
            const quizId = `quiz_${lesson.id}`;
            const res = await window.QuizService.submitQuiz(quizId, answers, lesson.id);

            if (res.success) {
              if (summaryEl) {
                summaryEl.innerHTML = `
                  <span class="badge ${res.passed ? 'badge-success' : 'badge-warning'}" style="font-size:1rem; padding:0.5rem 1rem;">
                    ${res.passed ? '🎉 نجحت في الاختبار القصير!' : 'يحتاج إلى مراجعة'} — نتيجتك: ${res.percentage}% (${res.correct_count}/${res.total_count})
                  </span>
                `;
              }

              // Highlight answers and display explanations
              if (res.reviews) {
                res.reviews.forEach(rev => {
                  const fb = document.getElementById(`quiz-feedback-${rev.question_id}`);
                  if (fb) {
                    fb.style.display = 'block';
                    if (rev.is_correct) {
                      fb.style.background = 'rgba(16, 185, 129, 0.15)';
                      fb.style.border = '1px solid var(--success)';
                      fb.style.color = 'var(--text-main)';
                      fb.innerHTML = `✅ <strong>إجابة صحيحة وممتازة!</strong><br><span style="color:var(--text-muted);">${rev.explanation || ''}</span>`;
                    } else {
                      fb.style.background = 'rgba(239, 68, 68, 0.15)';
                      fb.style.border = '1px solid var(--danger)';
                      fb.style.color = 'var(--text-main)';
                      const correctOptText = rev.options && rev.options[rev.correct_answer] ? rev.options[rev.correct_answer] : `الخيار رقم ${rev.correct_answer + 1}`;
                      fb.innerHTML = `❌ <strong>إجابة غير دقيقة.</strong> الإجابة الصحيحة هي: <strong style="color:var(--cyan);">${correctOptText}</strong><br><span style="color:var(--text-muted);">${rev.explanation || ''}</span>`;
                    }
                  }
                });
              }

              if (window.UI && window.UI.showToast) {
                window.UI.showToast(`تم تقييم الاختبار القصير بنجاح: ${res.percentage}% (+${res.xp_earned} XP) ⚡`, res.passed ? 'success' : 'info');
                if (res.passed) window.UI.celebrateConfetti();
              }

              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.className = 'btn btn-success';
                submitBtn.innerHTML = '✓ تم تسليم وتقييم الاختبار بنجاح';
              }
              return;
            }
          } catch (err) {
            console.warn('Quiz submission error:', err);
            if (window.UI && window.UI.showToast) {
              window.UI.showToast('تعذر تسليم الاختبار: ' + err.message, 'error');
            }
          }

          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `${Icons.check()} إعادة تسليم الإجابات`;
          }
        });
      }
    }
  };
})();
