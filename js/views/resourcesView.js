// Code Spark Educational Resources & PDF Library View
(function() {
  window.ResourcesView = {
    _currentCategory: 'all',
    _currentUnit: 'all',
    _searchQuery: '',
    _cachedResources: [],
    _categories: ['تدريبات وامتحانات', 'مذكرات شرح', 'ملخصات وتفاصيل', 'نماذج إجابة'],

    render(resources = [], categories = [], selectedCategory = 'all', selectedUnit = 'all', searchQuery = '') {
      this._currentCategory = selectedCategory || 'all';
      this._currentUnit = selectedUnit || 'all';
      this._searchQuery = searchQuery || '';
      this._cachedResources = resources || [];

      const standardCategories = ['تدريبات وامتحانات', 'مذكرات شرح', 'ملخصات وتفاصيل', 'نماذج إجابة'];
      const rawCategories = categories && categories.length > 0 ? categories : standardCategories;
      
      const mergedCats = ['all'];
      for (const cat of standardCategories) {
        if (!mergedCats.includes(cat)) mergedCats.push(cat);
      }
      for (const cat of rawCategories) {
        const norm = (cat === 'ملخصات وقوانين') ? 'ملخصات وتفاصيل' : cat;
        if (!mergedCats.includes(norm) && norm !== 'all' && norm !== 'الكل') {
          mergedCats.push(norm);
        }
      }
      this._categories = mergedCats.filter(c => c !== 'all');

      const list = resources || [];

      return `
        <div class="content-body" style="max-width:1250px; margin:0 auto;">
          
          <!-- Hero Header Banner -->
          <div class="card card-glass" style="margin-bottom:2rem; padding:2rem; border-color:var(--border-glow); position:relative; overflow:hidden; box-shadow:var(--shadow-lg), 0 0 35px rgba(6,182,212,0.12);">
            <div style="position:absolute; top:-60px; left:-60px; width:220px; height:220px; background:radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%); filter:blur(30px); pointer-events:none;"></div>
            <div style="position:absolute; bottom:-40px; right:20%; width:160px; height:160px; background:radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%); filter:blur(25px); pointer-events:none;"></div>

            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1.5rem; position:relative; z-index:2;">
              <div>
                <div class="badge badge-cyan" style="margin-bottom:0.75rem; font-size:0.8125rem; font-weight:800; display:inline-flex; align-items:center; gap:0.4rem;">
                  📚 المكتبة والملفات التعليمية الرسمية
                </div>
                <h1 style="font-size:1.875rem; font-weight:900; color:var(--text-main); margin-bottom:0.5rem; line-height:1.3;">
                  مذكرات وملخصات مادة البرمجة (PDF) 📄
                </h1>
                <p style="font-size:0.9375rem; color:var(--text-muted); max-width:650px; line-height:1.7;">
                  حمل واطلع على جميع مذكرات الشرح المعتمدة، ملخصات القوانين والدوال، وبنوك الأسئلة والامتحانات النموذجية مع إمكانية المعاينة المباشرة عبر Google Drive.
                </p>
              </div>

              <!-- Quick Summary Badges -->
              <div style="display:flex; gap:1rem; flex-wrap:wrap;" class="hide-on-mobile">
                <div style="background:rgba(14,22,38,0.8); border:1px solid var(--border-card); border-radius:var(--radius-lg); padding:1rem 1.25rem; text-align:center; min-width:110px;">
                  <div style="font-size:1.5rem; font-weight:900; color:var(--cyan); font-family:var(--font-heading);" id="resources-total-count">${list.length}</div>
                  <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700; margin-top:0.25rem;">ملف متاح 📑</div>
                </div>
                <div style="background:rgba(14,22,38,0.8); border:1px solid var(--border-card); border-radius:var(--radius-lg); padding:1rem 1.25rem; text-align:center; min-width:110px;">
                  <div style="font-size:1.5rem; font-weight:900; color:var(--gold); font-family:var(--font-heading);">PDF</div>
                  <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700; margin-top:0.25rem;">عرض سحابي ☁️</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Controls: Search & Category Filter Tabs -->
          <div class="card" style="padding:1.25rem; margin-bottom:2rem; border-color:var(--border-card);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
              
              <!-- Search Box -->
              <div style="flex:1; min-width:280px; position:relative;">
                <input type="text" id="resources-search-input" class="form-input" placeholder="🔍 ابحث بالاسم، الوصف، أو نوع الملف..." value="${this._searchQuery}" style="padding-right:2.5rem;">
                <span style="position:absolute; right:0.875rem; top:50%; transform:translateY(-50%); color:var(--text-subtle); pointer-events:none;">
                  ${window.Icons && window.Icons.search ? window.Icons.search('w-4 h-4') : '🔍'}
                </span>
              </div>

              <!-- Unit Filter Select -->
              <div style="min-width:200px;">
                <select id="resources-unit-filter" class="form-select" style="font-size:0.875rem;">
                  <option value="all" ${this._currentUnit === 'all' ? 'selected' : ''}>📂 جميع الوحدات الدراسية</option>
                  <option value="unit_1" ${this._currentUnit === 'unit_1' ? 'selected' : ''}>الوحدة الأولى: أساسيات بايثون</option>
                  <option value="unit_2" ${this._currentUnit === 'unit_2' ? 'selected' : ''}>الوحدة الثانية: هياكل البيانات</option>
                  <option value="unit_3" ${this._currentUnit === 'unit_3' ? 'selected' : ''}>الوحدة الثالثة: البرمجة كائنية التوجه</option>
                  <option value="unit_4" ${this._currentUnit === 'unit_4' ? 'selected' : ''}>الوحدة الرابعة: المراجعة الشاملة</option>
                </select>
              </div>

            </div>

            <!-- Category Pills -->
            <div id="resources-category-pills" style="display:flex; gap:0.5rem; overflow-x:auto; padding-top:1rem; margin-top:0.75rem; border-top:1px solid var(--border-subtle); scrollbar-width:thin;">
              ${mergedCats.map(cat => {
                const label = cat === 'all' ? '🌟 الكل' : cat;
                const isSelected = (this._currentCategory === cat) || (this._currentCategory === 'all' && cat === 'all');
                return `
                  <button type="button" class="btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'} resource-cat-btn" data-category="${cat}" style="white-space:nowrap; border-radius:2rem; font-weight:700;">
                    ${label}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Resources Cards Grid Container -->
          <div id="resources-grid-container">
            ${this.renderGrid(list, this._currentCategory, this._searchQuery)}
          </div>

          <!-- Embedded PDF Viewer Modal Backdrop -->
          <div id="pdf-viewer-modal" class="modal-backdrop" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); z-index:9999; align-items:center; justify-content:center; padding:1rem;">
            <div style="background:var(--bg-surface); border:1px solid var(--border-cyan); border-radius:var(--radius-xl); max-width:1050px; width:100%; height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 0 40px rgba(6,182,212,0.25);" id="pdf-modal-dialog">
              
              <!-- Modal Header -->
              <div style="padding:1rem 1.5rem; background:#0F172A; border-bottom:1px solid var(--border-card); display:flex; justify-content:space-between; align-items:center; gap:1rem;">
                <div style="display:flex; align-items:center; gap:0.75rem; overflow:hidden;">
                  <span style="font-size:1.35rem; color:#EF4444;">📄</span>
                  <h3 id="pdf-modal-title" style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    معاينة الملف التعليمي
                  </h3>
                </div>

                <div style="display:flex; align-items:center; gap:0.75rem; flex-shrink:0;">
                  <a id="pdf-modal-direct-link" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="font-size:0.8125rem;">
                    🔗 فتح في نافذة مستقلة ↗
                  </a>
                  <a id="pdf-modal-download-link" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="font-size:0.8125rem;">
                    ⬇️ تحميل
                  </a>
                  <button type="button" id="close-pdf-modal-btn" class="btn btn-ghost btn-sm" style="font-size:1.25rem; line-height:1; padding:0.4rem 0.75rem;" aria-label="إغلاق">
                    ✕
                  </button>
                </div>
              </div>

              <!-- Modal Iframe Body -->
              <div style="flex:1; background:#0B1120; position:relative; overflow:hidden;">
                <!-- Loading State -->
                <div id="pdf-modal-loader" style="position:absolute; top:0; left:0; right:0; bottom:0; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--cyan); z-index:1;">
                  <div style="font-size:2.5rem; animation:spin 1s linear infinite;">⏳</div>
                  <div style="font-size:0.9375rem; font-weight:700; margin-top:1rem; color:var(--text-muted);">جاري تحميل ومعاينة المستند عبر Google Drive...</div>
                </div>

                <!-- Iframe preview -->
                <iframe id="pdf-modal-iframe" src="" style="width:100%; height:100%; border:none; position:relative; z-index:2;" allow="autoplay" loading="lazy"></iframe>
              </div>

              <!-- Modal Footer / Fallback Guidance -->
              <div style="padding:0.75rem 1.5rem; background:#080D1A; border-top:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; font-size:0.8125rem; color:var(--text-subtle);">
                <span>💡 يتم عرض الملف عبر Google Drive Preview الآمن.</span>
                <span id="pdf-modal-fallback-hint">إذا لم يظهر الملف، تأكد من تسجيل دخولك على حساب Google أو اضغط على "فتح في نافذة مستقلة".</span>
              </div>

            </div>
          </div>

        </div>
      `;
    },

    renderGrid(list = [], selectedCategory = 'all', searchQuery = '') {
      if (!list || list.length === 0) {
        const isCatFilter = selectedCategory && selectedCategory !== 'all' && selectedCategory !== 'الكل';
        return `
          <div class="card card-glass" style="text-align:center; padding:4rem 2rem; border-color:var(--border-subtle);">
            <div style="font-size:3.5rem; margin-bottom:1rem; filter:drop-shadow(0 0 10px rgba(6,182,212,0.3));">📄</div>
            <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-main); margin-bottom:0.5rem;">
              ${isCatFilter ? `لا توجد ملفات في هذا التصنيف حاليًا.` : 'لا توجد ملفات تعليمية تطابق البحث حالياً'}
            </h3>
            <p style="color:var(--text-muted); font-size:0.9375rem; max-width:450px; margin:0 auto 1.5rem; line-height:1.7;">
              جرب تغيير كلمات البحث أو اختيار تصنيف آخر لعرض الملفات المتاحة.
            </p>
            <button id="reset-resources-filter-btn" class="btn btn-outline">
              🔄 إعادة تعيين الفلاتر
            </button>
          </div>
        `;
      }

      return `
        <div class="resources-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:1.75rem; align-items:stretch;">
          ${list.map(r => {
            const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : 'متاح دائمًا';
            const previewUrl = r.preview_url || r.file_url;
            const downloadUrl = r.download_url || r.file_url;
            const viewUrl = r.file_url;

            // Normalize category for display
            let displayCat = r.category || 'ملف تعليمي';
            if (displayCat === 'ملخصات وقوانين') displayCat = 'ملخصات وتفاصيل';

            // Color accents by category
            let catBadgeClass = 'badge-primary';
            if (displayCat === 'مذكرات شرح') catBadgeClass = 'badge-cyan';
            else if (displayCat === 'ملخصات وتفاصيل') catBadgeClass = 'badge-gold';
            else if (displayCat === 'تدريبات وامتحانات') catBadgeClass = 'badge-warning';
            else if (displayCat === 'نماذج إجابة') catBadgeClass = 'badge-success';

            return `
              <div class="card card-glass resource-card" style="display:flex; flex-direction:column; justify-content:space-between; padding:1.5rem; border-color:var(--border-card); transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position:relative; overflow:hidden;" data-resource-id="${r.id}">
                
                <!-- Card Top Info -->
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; gap:0.75rem;">
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                      <div style="width:44px; height:44px; border-radius:var(--radius-md); background:linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.25) 100%); border:1px solid rgba(239,68,68,0.4); display:flex; align-items:center; justify-content:center; font-size:1.35rem; color:#EF4444; flex-shrink:0;">
                        📄
                      </div>
                      <div>
                        <span class="badge ${catBadgeClass}" style="font-size:0.75rem; font-weight:800; margin-bottom:0.25rem; display:inline-block;">
                          ${displayCat}
                        </span>
                        ${r.unit_title ? `
                          <div style="font-size:0.75rem; color:var(--text-subtle); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">
                            ${r.unit_title}
                          </div>
                        ` : ''}
                      </div>
                    </div>

                    ${r.file_size_label ? `
                      <span style="font-size:0.75rem; color:var(--text-subtle); font-family:var(--font-mono); background:rgba(255,255,255,0.05); padding:0.2rem 0.5rem; border-radius:var(--radius-sm);">
                        ${r.file_size_label}
                      </span>
                    ` : ''}
                  </div>

                  <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-main); line-height:1.4; margin-bottom:0.6rem;">
                    ${r.title}
                  </h3>

                  <p style="font-size:0.875rem; color:var(--text-muted); line-height:1.6; min-height:42px; margin-bottom:1.25rem;">
                    ${r.description || 'ملف تعليمي مساعد لمذاكرة المنهج وتطبيقات البرمجة.'}
                  </p>
                </div>

                <!-- Card Footer & Actions -->
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-subtle); padding-top:0.75rem; border-top:1px solid var(--border-subtle); margin-bottom:1rem;">
                    <span>📅 ${dateStr}</span>
                    <span>👁️ ${r.views_count || 0} مشاهدة</span>
                  </div>

                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
                    <button type="button" class="btn btn-primary btn-sm open-pdf-modal-btn" data-title="${encodeURIComponent(r.title)}" data-preview="${encodeURIComponent(previewUrl)}" data-view="${encodeURIComponent(viewUrl)}" data-download="${encodeURIComponent(downloadUrl)}" data-id="${r.id}" style="font-weight:800; justify-content:center;">
                      👁️ فتح ومعاينة
                    </button>
                    
                    <a href="${viewUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="font-weight:700; justify-content:center; text-decoration:none;">
                      🔗 Google Drive ↗
                    </a>
                  </div>
                </div>

              </div>
            `;
          }).join('')}
        </div>
      `;
    },

    renderLoadingState() {
      return `
        <div id="resources-loading-state" style="text-align:center; padding:4rem 2rem; color:var(--cyan);">
          <div style="font-size:2.5rem; animation:spin 1s linear infinite;">⏳</div>
          <div style="margin-top:1rem; font-weight:700; color:var(--text-muted);">جاري تحميل وتصفية الملفات التعليمية...</div>
        </div>
      `;
    },

    renderErrorState() {
      return `
        <div id="resources-error-state" class="card card-glass" style="text-align:center; padding:4rem 2rem; border-color:var(--danger);">
          <div style="font-size:3rem; margin-bottom:1rem;">⚠️</div>
          <h3 style="font-size:1.25rem; font-weight:800; color:var(--danger); margin-bottom:0.5rem;">
            تعذر تحميل الملفات. حاول مرة أخرى.
          </h3>
          <p style="color:var(--text-muted); font-size:0.875rem; margin-bottom:1.5rem;">
            حدث خطأ أثناء جلب الملفات من الخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجددًا.
          </p>
          <button id="retry-resources-btn" class="btn btn-primary">
            🔄 إعادة المحاولة
          </button>
        </div>
      `;
    },

    initEvents(onFilterChange = null) {
      const self = this;

      // Internal fetch & filter helper
      const executeFilter = async () => {
        if (typeof onFilterChange === 'function') {
          onFilterChange({
            category: self._currentCategory,
            unit_id: self._currentUnit,
            search: self._searchQuery
          });
          return;
        }

        const gridContainer = document.getElementById('resources-grid-container');
        if (gridContainer) gridContainer.innerHTML = self.renderLoadingState();

        try {
          const params = {};
          if (self._currentCategory && self._currentCategory !== 'all' && self._currentCategory !== 'الكل') {
            params.category = self._currentCategory;
          }
          if (self._currentUnit && self._currentUnit !== 'all') {
            params.unit_id = self._currentUnit;
          }
          if (self._searchQuery) {
            params.search = self._searchQuery;
          }

          let fetchedResources = [];
          if (window.ResourceService && window.ResourceService.getResources) {
            const res = await window.ResourceService.getResources(params);
            fetchedResources = res.resources || [];
          } else {
            // Fallback client-side filter
            fetchedResources = (self._cachedResources || []).filter(r => {
              const rCat = (r.category === 'ملخصات وقوانين') ? 'ملخصات وتفاصيل' : (r.category || '');
              const matchCat = (self._currentCategory === 'all' || self._currentCategory === 'الكل') || (rCat === self._currentCategory);
              const matchUnit = (self._currentUnit === 'all') || (r.unit_id === self._currentUnit);
              const q = (self._searchQuery || '').toLowerCase();
              const matchSearch = !q || (r.title && r.title.toLowerCase().includes(q)) || (r.description && r.description.toLowerCase().includes(q)) || (rCat && rCat.toLowerCase().includes(q));
              return matchCat && matchUnit && matchSearch;
            });
          }

          if (gridContainer) {
            gridContainer.innerHTML = self.renderGrid(fetchedResources, self._currentCategory, self._searchQuery);
          }

          const countBadge = document.getElementById('resources-total-count');
          if (countBadge) countBadge.textContent = fetchedResources.length;

          self.bindGridEvents();
        } catch (err) {
          console.error('Error fetching educational resources:', err);
          if (gridContainer) {
            gridContainer.innerHTML = self.renderErrorState();
            document.getElementById('retry-resources-btn')?.addEventListener('click', () => {
              executeFilter();
            });
          }
        }
      };

      // 1. Search Input
      const searchInput = document.getElementById('resources-search-input');
      let searchTimer = null;
      searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          self._searchQuery = e.target.value.trim();
          executeFilter();
        }, 300);
      });

      // 2. Unit Filter Select
      const unitSelect = document.getElementById('resources-unit-filter');
      unitSelect?.addEventListener('change', (e) => {
        self._currentUnit = e.target.value;
        executeFilter();
      });

      // 3. Category Buttons
      document.querySelectorAll('.resource-cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const cat = btn.getAttribute('data-category');
          self._currentCategory = cat;

          // Update active styling
          document.querySelectorAll('.resource-cat-btn').forEach(b => {
            b.classList.remove('btn-primary');
            b.classList.add('btn-secondary');
          });
          btn.classList.remove('btn-secondary');
          btn.classList.add('btn-primary');

          executeFilter();
        });
      });

      // 4. Reset Filters Button
      document.getElementById('reset-resources-filter-btn')?.addEventListener('click', () => {
        self._currentCategory = 'all';
        self._currentUnit = 'all';
        self._searchQuery = '';

        if (searchInput) searchInput.value = '';
        if (unitSelect) unitSelect.value = 'all';
        document.querySelectorAll('.resource-cat-btn').forEach(b => {
          if (b.getAttribute('data-category') === 'all') {
            b.classList.remove('btn-secondary');
            b.classList.add('btn-primary');
          } else {
            b.classList.remove('btn-primary');
            b.classList.add('btn-secondary');
          }
        });

        executeFilter();
      });

      self.bindGridEvents();
    },

    bindGridEvents() {
      const self = this;
      // Re-bind reset filter if empty state rendered inside grid
      document.getElementById('reset-resources-filter-btn')?.addEventListener('click', () => {
        self._currentCategory = 'all';
        self._currentUnit = 'all';
        self._searchQuery = '';

        const searchInput = document.getElementById('resources-search-input');
        const unitSelect = document.getElementById('resources-unit-filter');
        if (searchInput) searchInput.value = '';
        if (unitSelect) unitSelect.value = 'all';

        document.querySelectorAll('.resource-cat-btn').forEach(b => {
          if (b.getAttribute('data-category') === 'all') {
            b.classList.remove('btn-secondary');
            b.classList.add('btn-primary');
          } else {
            b.classList.remove('btn-primary');
            b.classList.add('btn-secondary');
          }
        });

        const gridContainer = document.getElementById('resources-grid-container');
        if (gridContainer) gridContainer.innerHTML = self.renderLoadingState();
        if (window.ResourceService && window.ResourceService.getResources) {
          window.ResourceService.getResources().then(res => {
            const list = res.resources || [];
            if (gridContainer) gridContainer.innerHTML = self.renderGrid(list, 'all', '');
            const countBadge = document.getElementById('resources-total-count');
            if (countBadge) countBadge.textContent = list.length;
            self.bindGridEvents();
          }).catch(() => {
            if (gridContainer) gridContainer.innerHTML = self.renderErrorState();
          });
        }
      });

      // 5. Open PDF Modal Handlers
      const modal = document.getElementById('pdf-viewer-modal');
      const closeBtn = document.getElementById('close-pdf-modal-btn');
      const modalTitle = document.getElementById('pdf-modal-title');
      const modalIframe = document.getElementById('pdf-modal-iframe');
      const directLink = document.getElementById('pdf-modal-direct-link');
      const downloadLink = document.getElementById('pdf-modal-download-link');
      const loader = document.getElementById('pdf-modal-loader');

      document.querySelectorAll('.open-pdf-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const title = decodeURIComponent(btn.getAttribute('data-title') || '');
          const preview = decodeURIComponent(btn.getAttribute('data-preview') || '');
          const view = decodeURIComponent(btn.getAttribute('data-view') || '');
          const download = decodeURIComponent(btn.getAttribute('data-download') || '');
          const id = btn.getAttribute('data-id');

          if (modalTitle) modalTitle.textContent = title || 'معاينة الملف التعليمي';
          if (directLink) directLink.href = view || preview;
          if (downloadLink) downloadLink.href = download || view;
          
          if (loader) loader.style.display = 'flex';
          if (modalIframe) {
            modalIframe.src = preview;
            modalIframe.onload = () => {
              if (loader) loader.style.display = 'none';
            };
          }

          if (modal) modal.style.display = 'flex';

          // Record view count
          if (id && window.ResourceService && window.ResourceService.recordView) {
            window.ResourceService.recordView(id);
          }
        });
      });

      const closeModal = () => {
        if (modal) modal.style.display = 'none';
        if (modalIframe) modalIframe.src = '';
      };

      closeBtn?.addEventListener('click', closeModal);
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
          closeModal();
        }
      });
    }
  };
})();
