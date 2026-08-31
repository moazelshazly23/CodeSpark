// Code Spark Production Dynamic State & Database Bridge
(function() {
  const cache = {
    users: [],
    units: [],
    lessons: [],
    questions: [],
    exams: [],
    quizzes: [],
    announcements: [],
    resources: [],
    notifications: [],
    supportTickets: [],
    studentProgress: {},
    adminAnalytics: null,
    isInitialized: false
  };

  window.CodeSparkDB = {
    // 1. Initial Synchronous Seed / Memory State
    load() {
      return cache;
    },

    save(data) {
      Object.assign(cache, data);
      return cache;
    },

    // 2. Full Sync with Backend API (Non-blocking & Resilient with Promise.allSettled)
    async syncAll() {
      try {
        const token = window.CodeSparkAPI ? window.CodeSparkAPI.getToken() : null;
        const currentUser = window.CodeSparkAuth ? window.CodeSparkAuth.getCurrentUser() : null;

        // Fetch Public / Shared Curriculum Datasets in Parallel
        const [unitsRes, lessonsRes, questionsRes, examsRes, quizzesRes, annRes] = await Promise.allSettled([
          window.CurriculumService ? window.CurriculumService.getUnits() : Promise.resolve([]),
          window.CurriculumService ? window.CurriculumService.getLessons() : Promise.resolve([]),
          window.QuestionService ? window.QuestionService.getQuestions() : Promise.resolve([]),
          window.ExamService ? window.ExamService.getExams() : Promise.resolve([]),
          window.QuizService ? window.QuizService.getQuizzes() : Promise.resolve([]),
          window.AnnouncementService ? window.AnnouncementService.getAnnouncements() : Promise.resolve([]),
          window.ResourceService ? window.ResourceService.getResources() : Promise.resolve([])
        ]);

        if (unitsRes.status === 'fulfilled' && Array.isArray(unitsRes.value)) {
          cache.units = unitsRes.value.map(u => ({
            ...u,
            unitId: u.id,
            totalLessons: u.totalLessons || u.total_lessons || 0,
            totalExams: u.totalExams || u.total_exams || 0,
            order: u.order_index || u.order || u.number || 1
          }));
        }

        if (lessonsRes.status === 'fulfilled' && Array.isArray(lessonsRes.value)) {
          cache.lessons = lessonsRes.value.map(l => ({
            ...l,
            unitId: l.unit_id || l.unitId,
            content: l.content_html || l.content,
            codeExample: l.code_example || l.codeExample,
            codeSolution: l.code_solution || l.codeSolution,
            order: l.order_index || l.order || l.number || 1,
            videoSource: l.video_source || l.videoSource || (l.video_url || l.videoUrl ? 'youtube' : null),
            videoUrl: l.video_url || l.videoUrl || '',
            videoId: l.video_id || l.videoId || '',
            storagePath: l.storage_path || l.storagePath || '',
            thumbnailUrl: l.thumbnail_url || l.thumbnailUrl || '',
            fileSize: l.file_size || l.fileSize || 0,
            mimeType: l.mime_type || l.mimeType || 'video/mp4',
            video_source: l.video_source || l.videoSource || (l.video_url || l.videoUrl ? 'youtube' : null),
            video_url: l.video_url || l.videoUrl || '',
            video_id: l.video_id || l.videoId || '',
            storage_path: l.storage_path || l.storagePath || '',
            thumbnail_url: l.thumbnail_url || l.thumbnailUrl || '',
            file_size: l.file_size || l.fileSize || 0,
            mime_type: l.mime_type || l.mimeType || 'video/mp4',
            exercise: l.exercise || (l.exercise_title ? {
              title: l.exercise_title,
              description: l.exercise_description || '',
              starterCode: l.exercise_starter_code || '',
              solutionCode: l.exercise_solution_code || '',
              testCases: l.exercise_test_cases ? (typeof l.exercise_test_cases === 'string' ? JSON.parse(l.exercise_test_cases) : l.exercise_test_cases) : []
            } : null)
          }));
        }

        if (questionsRes.status === 'fulfilled' && Array.isArray(questionsRes.value)) {
          cache.questions = questionsRes.value.map(q => ({
            ...q,
            unitId: q.unit_id || q.unitId,
            lessonId: q.lesson_id || q.lessonId,
            codeSnippet: q.code_snippet || q.codeSnippet
          }));
        }

        if (quizzesRes.status === 'fulfilled' && Array.isArray(quizzesRes.value)) {
          cache.quizzes = quizzesRes.value;
        }

        if (examsRes.status === 'fulfilled' && Array.isArray(examsRes.value)) {
          cache.exams = examsRes.value.map(e => ({
            ...e,
            unitId: e.unit_id || e.unitId,
            totalQuestions: e.totalQuestions || e.total_questions || 10,
            duration: e.duration_minutes || e.duration || 30,
            passingScore: e.passing_score || e.passingScore || 60,
            attemptsAllowed: e.attempts_allowed || e.attemptsAllowed || 3,
            randomizeQuestions: !!(e.randomize_questions || e.randomizeQuestions)
          }));
        }

        if (annRes.status === 'fulfilled' && Array.isArray(annRes.value)) {
          cache.announcements = annRes.value;
        }

        // Fetch User-Specific Data if Authenticated
        if (token && currentUser) {
          const uId = currentUser.id;

          // Notifications & Support Tickets
          const [notifRes, ticketRes] = await Promise.allSettled([
            window.NotificationService ? window.NotificationService.getNotifications() : Promise.resolve([]),
            window.SupportService ? window.SupportService.getTickets() : Promise.resolve([])
          ]);

          if (notifRes.status === 'fulfilled' && Array.isArray(notifRes.value)) {
            cache.notifications = notifRes.value;
          }
          if (ticketRes.status === 'fulfilled' && Array.isArray(ticketRes.value)) {
            cache.supportTickets = ticketRes.value;
          }

          // Student Progress Sync
          if (currentUser.role === 'student') {
            try {
              const prog = await window.ProgressService.getStudentProgress();
              if (prog) {
                cache.studentProgress[uId] = {
                  studentId: uId,
                  completedLessons: prog.completedLessons || [],
                  examAttempts: prog.examAttempts || [],
                  overallProgress: prog.completionPercentage ?? prog.overallProgress ?? 0,
                  streak: prog.streak ?? currentUser.streak ?? 5,
                  xp: prog.xp ?? currentUser.xp ?? 840,
                  learningHours: prog.learningHours ?? 14.5,
                  avgScore: prog.avgScore ?? currentUser.avgScore ?? 86,
                  unitProgress: prog.unitProgress || [],
                  lastActivity: prog.lastActivity || new Date().toISOString()
                };

                currentUser.completedLessonsCount = (prog.completedLessons || []).length;
                currentUser.examsCount = (prog.examAttempts || []).length;
                currentUser.avgScore = prog.avgScore ?? currentUser.avgScore ?? 86;
                currentUser.xp = prog.xp ?? currentUser.xp ?? 840;
                currentUser.streak = prog.streak ?? currentUser.streak ?? 5;
                window.CodeSparkAuth.setCurrentUser(currentUser);
              }
            } catch (e) {
              console.warn('Failed to sync student progress:', e);
            }
          }

          // Admin Data Sync
          if (currentUser.role === 'admin') {
            try {
              const [studentsRes, analyticsRes] = await Promise.allSettled([
                window.StudentService ? window.StudentService.getStudents() : Promise.resolve([]),
                window.StudentService ? window.StudentService.getAnalytics() : Promise.resolve({})
              ]);
              if (studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value)) {
                cache.users = studentsRes.value;
              }
              if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
                cache.adminAnalytics = analyticsRes.value;
              }
            } catch (e) {
              console.warn('Failed to sync admin data:', e);
            }
          }
        }

        cache.isInitialized = true;
        if (typeof CustomEvent !== "undefined") window.dispatchEvent(new CustomEvent('codespark:db-synced', { detail: { cache } }));
      } catch (err) {
        console.warn('CodeSparkDB sync warning:', err);
      }
      return cache;
    },

    // 3. Curriculum Getters & Helpers
    getUnits() {
      return cache.units || [];
    },

    getUnit(unitId) {
      return (cache.units || []).find(u => u.id === unitId || u.unitId === unitId) || null;
    },

    async saveUnit(unit) {
      if (!unit.id || unit.id.startsWith('new_') || unit.id.startsWith('unit_new')) {
        const res = await window.CurriculumService.createUnit(unit);
        this.syncAll();
        return res;
      } else {
        const res = await window.CurriculumService.updateUnit(unit.id, unit);
        this.syncAll();
        return res;
      }
    },

    async deleteUnit(unitId) {
      const res = await window.CurriculumService.deleteUnit(unitId);
      this.syncAll();
      return res;
    },

    // 4. Lessons Getters & Helpers
    getLessons(unitId = null) {
      if (unitId) {
        return (cache.lessons || []).filter(l => (l.unitId === unitId || l.unit_id === unitId));
      }
      return cache.lessons || [];
    },

    getLesson(lessonId) {
      return (cache.lessons || []).find(l => l.id === lessonId) || null;
    },

    async saveLesson(lesson) {
      if (!lesson.id || lesson.id.startsWith('new_') || lesson.id.startsWith('lesson_new')) {
        const res = await window.CurriculumService.createLesson(lesson);
        this.syncAll();
        return res;
      } else {
        const res = await window.CurriculumService.updateLesson(lesson.id, lesson);
        this.syncAll();
        return res;
      }
    },

    async deleteLesson(lessonId) {
      const res = await window.CurriculumService.deleteLesson(lessonId);
      this.syncAll();
      return res;
    },

    // 5. Questions Bank
    getQuestions(unitId = null) {
      if (unitId) {
        return (cache.questions || []).filter(q => (q.unitId === unitId || q.unit_id === unitId));
      }
      return cache.questions || [];
    },

    getQuestion(questionId) {
      return (cache.questions || []).find(q => q.id === questionId) || null;
    },

    async saveQuestion(q) {
      if (!q.id || q.id.startsWith('new_') || q.id.startsWith('q_new')) {
        const res = await window.QuestionService.createQuestion(q);
        this.syncAll();
        return res;
      } else {
        const res = await window.QuestionService.updateQuestion(q.id, q);
        this.syncAll();
        return res;
      }
    },

    async deleteQuestion(qId) {
      const res = await window.QuestionService.deleteQuestion(qId);
      this.syncAll();
      return res;
    },

    // 6. Exams
    getExams(unitId = null) {
      if (unitId) {
        return (cache.exams || []).filter(e => (e.unitId === unitId || e.unit_id === unitId));
      }
      return cache.exams || [];
    },

    getExam(examId) {
      return (cache.exams || []).find(e => e.id === examId) || null;
    },

    async saveExam(exam) {
      if (!exam.id || exam.id.startsWith('new_') || exam.id.startsWith('exam_new')) {
        const res = await window.ExamService.createExam(exam);
        this.syncAll();
        return res;
      } else {
        const res = await window.ExamService.updateExam(exam.id, exam);
        this.syncAll();
        return res;
      }
    },

    async deleteExam(examId) {
      const res = await window.ExamService.deleteExam(examId);
      this.syncAll();
      return res;
    },

    // 6.1 Quizzes
    getQuizzes(lessonId = null, unitId = null) {
      if (lessonId) {
        return (cache.quizzes || []).filter(q => q.lesson_id === lessonId || q.lessonId === lessonId);
      }
      if (unitId) {
        return (cache.quizzes || []).filter(q => q.unit_id === unitId || q.unitId === unitId);
      }
      return cache.quizzes || [];
    },

    getQuiz(quizId) {
      return (cache.quizzes || []).find(q => q.id === quizId) || null;
    },

    async saveQuiz(quiz) {
      if (!quiz.id || quiz.id.startsWith("new_") || quiz.id.startsWith("quiz_new")) {
        const res = await window.QuizService.createQuiz(quiz);
        this.syncAll();
        return res;
      } else {
        const res = await window.QuizService.updateQuiz(quiz.id, quiz);
        this.syncAll();
        return res;
      }
    },

    async deleteQuiz(quizId) {
      const res = await window.QuizService.deleteQuiz(quizId);
      this.syncAll();
      return res;
    },

    // 7. Student Progress & Submissions
    getStudentProgress(studentId) {
      if (cache.studentProgress[studentId]) {
        return cache.studentProgress[studentId];
      }
      return {
        studentId: studentId,
        completedLessons: [],
        examAttempts: [],
        overallProgress: 0,
        streak: 5,
        xp: 840,
        learningHours: 14.5,
        avgScore: 86,
        unitProgress: [],
        lastActivity: new Date().toISOString()
      };
    },

    async markLessonCompleted(studentId, lessonId) {
      let p = cache.studentProgress[studentId];
      if (!p) {
        p = this.getStudentProgress(studentId);
        cache.studentProgress[studentId] = p;
      }
      if (!p.completedLessons.includes(lessonId)) {
        p.completedLessons.push(lessonId);
        p.xp = (p.xp || 100) + 50;
      }

      try {
        await window.ProgressService.updateLessonProgress(lessonId, 100, true);
      } catch (e) {
        console.warn('Failed to persist lesson progress to backend:', e);
      }
      return p;
    },

    async recordExamAttempt(studentId, attempt) {
      let p = cache.studentProgress[studentId];
      if (!p) {
        p = this.getStudentProgress(studentId);
        cache.studentProgress[studentId] = p;
      }
      attempt.id = attempt.id || 'att_' + Date.now();
      attempt.date = attempt.date || new Date().toISOString();
      p.examAttempts.unshift(attempt);

      try {
        const res = await window.ExamService.submitExam(attempt.examId || attempt.exam_id, attempt.answers || {}, attempt.timeSpentSeconds || 0);
        if (res.success && res.attemptId) {
          attempt.id = res.attemptId;
          attempt.score = res.score;
          attempt.percentage = res.percentage;
          attempt.correctCount = res.correctCount;
          attempt.totalCount = res.totalCount;
          attempt.passed = res.passed;
        }
      } catch (e) {
        console.warn('Backend exam submission fallback:', e);
      }
      return attempt;
    },

    // 8. Users & Students Management
    getStudents() {
      return (cache.users || []).filter(u => u.role === 'student' || !u.role);
    },

    getUser(id) {
      return (cache.users || []).find(u => u.id === id) || null;
    },

    async saveUser(student) {
      if (!student.id) {
        const res = await window.AuthService.register(student);
        this.syncAll();
        return res;
      } else {
        const res = await window.StudentService.updateStudent(student.id, student);
        this.syncAll();
        return res;
      }
    },

    async deleteUser(userId) {
      const res = await window.StudentService.deleteStudent(userId);
      this.syncAll();
      return res;
    },

    // 9. Announcements
    getAnnouncements() {
      return cache.announcements || [];
    },

    async saveAnnouncement(ann) {
      if (!ann.id || ann.id.startsWith('ann_new')) {
        const res = await window.AnnouncementService.createAnnouncement(ann);
        this.syncAll();
        return res;
      } else {
        const res = await window.AnnouncementService.updateAnnouncement(ann.id, ann);
        this.syncAll();
        return res;
      }
    },

    async deleteAnnouncement(id) {
      const res = await window.AnnouncementService.deleteAnnouncement(id);
      this.syncAll();
      return res;
    },

    // 10. Notifications
    getNotifications(userId) {
      return (cache.notifications || []).filter(n => n.user_id === userId || n.userId === userId || !n.userId);
    },

    async markNotificationRead(id) {
      const notif = (cache.notifications || []).find(n => n.id === id);
      if (notif) notif.read = true;
      try {
        await window.NotificationService.markAsRead(id);
      } catch (e) {}
    },

    async markAllNotificationsRead() {
      (cache.notifications || []).forEach(n => n.read = true);
      try {
        await window.NotificationService.markAllAsRead();
      } catch (e) {}
    },

    // 11. Support Tickets
    getSupportTickets(studentId = null) {
      if (studentId) {
        return (cache.supportTickets || []).filter(t => t.studentId === studentId || t.user_id === studentId);
      }
      return cache.supportTickets || [];
    },

    async createSupportTicket(ticket) {
      const res = await window.SupportService.createTicket(ticket.subject, ticket.message);
      this.syncAll();
      return res;
    },

    async replySupportTicket(id, replyText) {
      const res = await window.SupportService.replyTicket(id, replyText);
      this.syncAll();
      return res;
    }
  };

  // Immediate Initial Background Sync on script execution
  window.CodeSparkDB.syncAll();
})();
