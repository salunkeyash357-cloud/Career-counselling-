/**
 * CareerGuide AI – Main Application JavaScript
 * IBM watsonx.ai · Granite · Flask Backend
 */

'use strict';

// ── Theme Management ──────────────────────────────────────────────────────────
const ThemeManager = (() => {
  const KEY = 'cg-theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
    const icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = theme === DARK ? '☀️' : '🌙';
  }

  function init() {
    const saved = localStorage.getItem(KEY);
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
    apply(saved || preferred);
  }

  function toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    apply(current === DARK ? LIGHT : DARK);
  }

  return { init, toggle };
})();

// ── Toast Notifications ───────────────────────────────────────────────────────
const Toast = (() => {
  function show(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container-custom';
      document.body.appendChild(container);
    }
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;
    toast.innerHTML = `<span>${icons[type] || '💬'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all .3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  return { show };
})();

// ── Markdown Renderer ─────────────────────────────────────────────────────────
const MD = (() => {
  function render(text) {
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        breaks: true,
        gfm: true,
        sanitize: false,
      });
      return marked.parse(text);
    }
    // Fallback: simple formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^#{1,3} (.+)$/gm, (m, p1, offset, str) => {
        const level = m.match(/^(#{1,3})/)[1].length;
        return `<h${level + 2}>${p1}</h${level + 2}>`;
      })
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, (m) => m.startsWith('<') ? m : `<p>${m}</p>`);
  }
  return { render };
})();

// ── Scroll Reveal Animation ───────────────────────────────────────────────────
const ScrollReveal = (() => {
  function init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }
  return { init };
})();

// ── API Helpers ───────────────────────────────────────────────────────────────
const API = (() => {
  async function post(endpoint, data) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function get(endpoint) {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function del(endpoint) {
    const res = await fetch(endpoint, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  return { post, get, del };
})();

// ── Chat Interface ────────────────────────────────────────────────────────────
const Chat = (() => {
  let isTyping = false;
  const SUGGESTIONS = [
    '🎯 Analyze my career fit',
    '📊 Show skill gap analysis',
    '🗺️ Generate my roadmap',
    '📚 Suggest courses for me',
    '📝 Review my resume tips',
    '💼 Top tech careers 2025',
    '🤖 Best AI/ML career paths',
    '☁️ IBM Cloud career options',
  ];

  function init() {
    const input   = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const form    = document.getElementById('chatForm');
    if (!input) return;

    // Enter to send (Shift+Enter for newline)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 140) + 'px';
    });

    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });

    renderSuggestions();
    loadHistory();
  }

  function renderSuggestions() {
    const container = document.getElementById('chatSuggestions');
    if (!container) return;
    SUGGESTIONS.forEach(s => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.textContent = s;
      chip.addEventListener('click', () => {
        const input = document.getElementById('chatInput');
        if (input) {
          input.value = s.replace(/^[^\s]+\s/, ''); // strip emoji
          sendMessage();
        }
      });
      container.appendChild(chip);
    });
  }

  async function loadHistory() {
    try {
      const history = await API.get('/api/history');
      if (history && history.length) {
        history.forEach(msg => appendMessage(msg.role, msg.content, false));
        scrollToBottom();
      }
    } catch (_) { /* empty history is fine */ }
  }

  async function sendMessage() {
    const input   = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    if (!input || isTyping) return;

    const text = input.value.trim();
    if (!text) return;

    // Hide suggestions after first message
    const sugBox = document.getElementById('chatSuggestions');
    if (sugBox) sugBox.style.display = 'none';

    appendMessage('user', text);
    input.value = '';
    input.style.height = 'auto';
    if (sendBtn) sendBtn.disabled = true;
    isTyping = true;

    showTyping();

    try {
      const data = await API.post('/api/chat', { message: text });
      removeTyping();
      appendMessage('assistant', data.response);
    } catch (err) {
      removeTyping();
      appendMessage('assistant', `❌ Error: ${err.message}\n\nPlease check your IBM API credentials in the .env file.`);
      Toast.show(err.message, 'error');
    } finally {
      isTyping = false;
      if (sendBtn) sendBtn.disabled = false;
      if (input) input.focus();
    }
  }

  function appendMessage(role, content, animate = true) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const isUser = role === 'user';
    const wrapper = document.createElement('div');
    wrapper.className = `message ${isUser ? 'user' : 'assistant'}${animate ? ' fade-in' : ''}`;

    const avatar = document.createElement('div');
    avatar.className = `msg-avatar ${isUser ? 'usr' : 'ai'}`;
    avatar.textContent = isUser ? '👤' : '🤖';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    if (isUser) {
      bubble.textContent = content;
    } else {
      const rendered = document.createElement('div');
      rendered.className = 'ai-content';
      rendered.innerHTML = MD.render(content);
      bubble.appendChild(rendered);
    }

    const time = document.createElement('div');
    time.className = 'msg-time';
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const inner = document.createElement('div');
    inner.appendChild(bubble);
    inner.appendChild(time);

    wrapper.appendChild(avatar);
    wrapper.appendChild(inner);
    container.appendChild(wrapper);
    scrollToBottom();
  }

  function showTyping() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    const typing = document.createElement('div');
    typing.id = 'typingIndicator';
    typing.className = 'message assistant';
    typing.innerHTML = `
      <div class="msg-avatar ai">🤖</div>
      <div class="msg-bubble">
        <div class="typing-dots">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>`;
    container.appendChild(typing);
    scrollToBottom();
  }

  function removeTyping() {
    const t = document.getElementById('typingIndicator');
    if (t) t.remove();
  }

  function scrollToBottom() {
    const c = document.getElementById('chatMessages');
    if (c) c.scrollTop = c.scrollHeight;
  }

  function clearChat() {
    API.del('/api/history').then(() => {
      const c = document.getElementById('chatMessages');
      if (c) c.innerHTML = '';
      Toast.show('Conversation cleared', 'success');
    }).catch(err => Toast.show(err.message, 'error'));
  }

  return { init, sendMessage, clearChat };
})();

// ── Profile Manager ───────────────────────────────────────────────────────────
const ProfileManager = (() => {
  let skills = [];
  let interests = [];

  function init() {
    loadProfile();
    initSkillsInput();
    const form = document.getElementById('profileForm');
    if (form) form.addEventListener('submit', saveProfile);
  }

  function initSkillsInput() {
    const input = document.getElementById('skillsInput');
    if (!input) return;
    input.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
        e.preventDefault();
        addSkill(input.value.trim().replace(/,$/, ''));
        input.value = '';
      }
    });
  }

  function addSkill(skill) {
    if (!skill || skills.includes(skill)) return;
    skills.push(skill);
    renderSkills();
  }

  function removeSkill(skill) {
    skills = skills.filter(s => s !== skill);
    renderSkills();
  }

  function renderSkills() {
    const container = document.getElementById('skillsContainer');
    if (!container) return;
    const input = document.getElementById('skillsInput');
    container.innerHTML = '';
    skills.forEach(s => {
      const tag = document.createElement('span');
      tag.className = 'skill-tag';
      tag.innerHTML = `${s} <span class="skill-tag-remove" data-skill="${s}">✕</span>`;
      tag.querySelector('.skill-tag-remove').addEventListener('click', () => removeSkill(s));
      container.appendChild(tag);
    });
    if (input) container.appendChild(input);
  }

  async function saveProfile(e) {
    if (e) e.preventDefault();
    const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
    const profile = {
      name:         getVal('profileName'),
      email:        getVal('profileEmail'),
      education:    getVal('profileEducation'),
      gpa:          getVal('profileGpa'),
      skills:       skills,
      interests:    Array.from(document.querySelectorAll('.interest-item.selected')).map(el => el.dataset.interest),
      goals:        getVal('profileGoals'),
      experience:   getVal('profileExperience'),
      personality:  getVal('profilePersonality'),
      timeline:     getVal('profileTimeline'),
      hours_per_week: getVal('profileHours'),
    };

    try {
      await API.post('/api/profile', profile);
      Toast.show('Profile saved successfully! ✅', 'success');
      setTimeout(() => window.location.href = '/dashboard', 1000);
    } catch (err) {
      Toast.show('Failed to save profile: ' + err.message, 'error');
    }
  }

  async function loadProfile() {
    try {
      const profile = await API.get('/api/profile');
      if (!profile || !profile.name) return;
      const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
      setVal('profileName', profile.name);
      setVal('profileEmail', profile.email);
      setVal('profileEducation', profile.education);
      setVal('profileGpa', profile.gpa);
      setVal('profileGoals', profile.goals);
      setVal('profileExperience', profile.experience);
      setVal('profilePersonality', profile.personality);
      setVal('profileTimeline', profile.timeline);
      setVal('profileHours', profile.hours_per_week);
      skills = profile.skills || [];
      renderSkills();
      // Re-select interests
      if (profile.interests) {
        profile.interests.forEach(interest => {
          const el = document.querySelector(`.interest-item[data-interest="${interest}"]`);
          if (el) el.classList.add('selected');
        });
      }
    } catch (_) {}
  }

  return { init, addSkill };
})();

// ── Assessment Stepper ────────────────────────────────────────────────────────
const Assessment = (() => {
  let currentStep = 0;
  const STEPS = ['personal', 'skills', 'interests', 'goals', 'results'];

  function init() {
    if (!document.getElementById('assessmentSteps')) return;
    showStep(0);
    document.querySelectorAll('.interest-item').forEach(item => {
      item.addEventListener('click', () => item.classList.toggle('selected'));
    });
  }

  function showStep(index) {
    currentStep = index;
    STEPS.forEach((step, i) => {
      const el = document.getElementById(`step-${step}`);
      if (el) el.classList.toggle('active', i === index);
      const dot = document.getElementById(`dot-${i}`);
      if (dot) {
        dot.classList.toggle('active', i === index);
        dot.classList.toggle('done', i < index);
      }
      const line = document.getElementById(`line-${i}`);
      if (line) line.classList.toggle('done', i < index);
    });
  }

  function next() {
    if (currentStep < STEPS.length - 1) {
      if (currentStep === STEPS.length - 2) {
        runAssessment();
      } else {
        showStep(currentStep + 1);
      }
    }
  }

  function prev() {
    if (currentStep > 0) showStep(currentStep - 1);
  }

  async function runAssessment() {
    showStep(STEPS.length - 1);
    const resultsEl = document.getElementById('assessmentResults');
    if (resultsEl) {
      resultsEl.innerHTML = `
        <div class="text-center py-4">
          <div class="spinner mx-auto mb-3" style="border-color:rgba(15,98,254,.2);border-top-color:var(--primary)"></div>
          <p class="text-muted">🤖 Granite AI is analyzing your profile...</p>
        </div>`;
    }

    const profile = {
      name:        document.getElementById('assName')?.value || '',
      education:   document.getElementById('assEducation')?.value || '',
      gpa:         document.getElementById('assGpa')?.value || '',
      skills:      (document.getElementById('assSkills')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
      interests:   Array.from(document.querySelectorAll('.interest-item.selected')).map(el => el.dataset.interest),
      goals:       document.getElementById('assGoals')?.value || '',
      experience:  document.getElementById('assExperience')?.value || '',
      personality: document.getElementById('assPersonality')?.value || '',
    };

    try {
      const data = await API.post('/api/assess', profile);
      if (resultsEl) {
        resultsEl.innerHTML = `<div class="ai-content">${MD.render(data.assessment)}</div>`;
      }
    } catch (err) {
      if (resultsEl) {
        resultsEl.innerHTML = `<p class="text-danger">❌ ${err.message}</p>`;
      }
    }
  }

  return { init, next, prev };
})();

// ── Roadmap Generator ─────────────────────────────────────────────────────────
const RoadmapGenerator = (() => {
  async function generate() {
    const career  = document.getElementById('roadmapCareer')?.value?.trim();
    const resultsEl = document.getElementById('roadmapResults');
    if (!career) { Toast.show('Please enter a target career', 'warning'); return; }
    if (!resultsEl) return;

    resultsEl.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner mx-auto mb-3" style="border-color:rgba(15,98,254,.2);border-top-color:var(--primary)"></div>
        <p class="text-muted">🗺️ Building your personalised roadmap...</p>
      </div>`;

    try {
      const data = await API.post('/api/roadmap', { career });
      resultsEl.innerHTML = `<div class="ai-content">${MD.render(data.roadmap)}</div>`;
    } catch (err) {
      resultsEl.innerHTML = `<p class="text-danger">❌ ${err.message}</p>`;
    }
  }

  async function generateSkillGap() {
    const career  = document.getElementById('sgCareer')?.value?.trim();
    const skillsRaw = document.getElementById('sgSkills')?.value?.trim();
    const resultsEl = document.getElementById('skillGapResults');
    if (!career || !resultsEl) return;

    const skills = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    resultsEl.innerHTML = `
      <div class="text-center py-4">
        <div class="spinner mx-auto mb-3" style="border-color:rgba(15,98,254,.2);border-top-color:var(--primary)"></div>
        <p class="text-muted">📊 Analyzing skill gaps...</p>
      </div>`;

    try {
      const data = await API.post('/api/skill-gap', { skills, target_career: career });
      resultsEl.innerHTML = `<div class="ai-content">${MD.render(data.analysis)}</div>`;
    } catch (err) {
      resultsEl.innerHTML = `<p class="text-danger">❌ ${err.message}</p>`;
    }
  }

  async function suggestCourses() {
    const career  = document.getElementById('courseCareer')?.value?.trim();
    const skillsRaw = document.getElementById('courseSkills')?.value?.trim();
    const budget = document.getElementById('courseBudget')?.value || 'free';
    const resultsEl = document.getElementById('courseResults');
    if (!career || !resultsEl) return;

    const skills = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    resultsEl.innerHTML = `
      <div class="text-center py-4">
        <div class="spinner mx-auto mb-3" style="border-color:rgba(15,98,254,.2);border-top-color:var(--primary)"></div>
        <p class="text-muted">📚 Finding best courses...</p>
      </div>`;

    try {
      const data = await API.post('/api/courses', { skills, career, budget });
      resultsEl.innerHTML = `<div class="ai-content">${MD.render(data.courses)}</div>`;
    } catch (err) {
      resultsEl.innerHTML = `<p class="text-danger">❌ ${err.message}</p>`;
    }
  }

  async function reviewResume() {
    const text = document.getElementById('resumeText')?.value?.trim();
    const role = document.getElementById('resumeRole')?.value?.trim();
    const resultsEl = document.getElementById('resumeResults');
    if (!text) { Toast.show('Please paste your resume text', 'warning'); return; }
    if (!resultsEl) return;

    resultsEl.innerHTML = `
      <div class="text-center py-4">
        <div class="spinner mx-auto mb-3" style="border-color:rgba(15,98,254,.2);border-top-color:var(--primary)"></div>
        <p class="text-muted">📝 Reviewing your resume...</p>
      </div>`;

    try {
      const data = await API.post('/api/resume', { resume_text: text, target_role: role || 'Software Engineer' });
      resultsEl.innerHTML = `<div class="ai-content">${MD.render(data.review)}</div>`;
    } catch (err) {
      resultsEl.innerHTML = `<p class="text-danger">❌ ${err.message}</p>`;
    }
  }

  return { generate, generateSkillGap, suggestCourses, reviewResume };
})();

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  ScrollReveal.init();
  Chat.init();
  ProfileManager.init();
  Assessment.init();

  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) toggleBtn.addEventListener('click', ThemeManager.toggle);

  // Check API health
  fetch('/api/health')
    .then(r => r.json())
    .then(data => {
      if (!data.watsonx_connected) {
        Toast.show('⚠️ IBM watsonx.ai not connected. Check your .env credentials.', 'warning', 8000);
      }
    })
    .catch(() => {});
});

// Expose to global for inline usage
window.Chat        = Chat;
window.Assessment  = Assessment;
window.RoadmapGenerator = RoadmapGenerator;
window.ProfileManager   = ProfileManager;
window.ThemeManager     = ThemeManager;
