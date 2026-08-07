function escapeHtml(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

class AurixTTS {
  constructor() {
    this.storageKey = "aurix_tts_v1";
    this.settings = {
      enabled: true,
      subtitles: false,
      narratorVoice: "",
      aurixVoice: ""
    };

    this.voices = [];
    this.voicesPromise = null;
    this.lastSpoken = null;
    this.initialized = false;
    this.uiBound = false;
    this.subtitleTimeout = null;
    this.currentWordRanges = [];
    this.speakToken = 0;
  }

  async init() {
    if (this.initialized) return;

    this.loadSettings();
    this.injectUI();
    this.bindUI();

    await this.loadVoices();

    this.populateVoiceSelects();
    this.updateUI();

    this.initialized = true;
  }

  loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey));
      if (saved) {
        this.settings = Object.assign(this.settings, saved);
      }
    } catch (error) {
      this.settings = Object.assign({}, this.settings);
    }
  }

  saveSettings() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
  }

  setEnabled(value) {
    this.settings.enabled = Boolean(value);
    this.saveSettings();

    if (!this.settings.enabled) {
      this.cancel();
    }

    this.updateUI();
  }

  injectUI() {
    if (document.getElementById("aurix-tts-ui")) return;

    const wrapper = document.createElement("div");
    wrapper.id = "aurix-tts-ui";

    wrapper.innerHTML = `
      <div id="aurix-subtitle" class="aurix-subtitle hidden" aria-live="polite">
        <div id="aurix-subtitle-text"></div>
      </div>

      <button id="aurix-repeat" class="aurix-repeat hidden" title="Repetir">
        ⟲ Repetir
      </button>

      <button id="aurix-settings-toggle" class="aurix-settings-toggle" title="Configuración de voz">
        🎙
      </button>

      <div id="aurix-settings" class="aurix-settings hidden">
        <div class="aurix-settings-header">
          <strong>Voz y subtítulos</strong>
          <button id="aurix-settings-close" aria-label="Cerrar">✕</button>
        </div>

        <div class="aurix-setting">
          <div class="aurix-setting-label">
            <span>Activar voz</span>
            <input id="aurix-tts-enabled" class="aurix-checkbox" type="checkbox" />
          </div>
          <small>Si se desactiva, AURIX no hablará.</small>
        </div>

        <div class="aurix-setting">
          <div class="aurix-setting-label">
            <span>Subtítulos</span>
            <input id="aurix-subtitles-enabled" class="aurix-checkbox" type="checkbox" />
          </div>
          <small>Muestra el texto mientras el sistema habla.</small>
        </div>

        <div class="aurix-setting">
          <div class="aurix-setting-label">
            <span>Narrador masculino</span>
          </div>
          <div class="aurix-setting-row">
            <select id="aurix-voice-narrator"></select>
            <button id="aurix-test-narrator" class="aurix-small-btn">Probar</button>
          </div>
          <small>Voz recomendada: Microsoft Jorge Online Natural o Microsoft Alvaro Online Natural.</small>
        </div>

        <div class="aurix-setting">
          <div class="aurix-setting-label">
            <span>AURIX femenina</span>
          </div>
          <div class="aurix-setting-row">
            <select id="aurix-voice-aurix"></select>
            <button id="aurix-test-aurix" class="aurix-small-btn">Probar</button>
          </div>
          <small>Voz recomendada: Microsoft Aria Online Natural o Microsoft Jenny Online Natural.</small>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);
  }

  bindUI() {
    if (this.uiBound) return;

    const repeatBtn = document.getElementById("aurix-repeat");
    const settingsToggle = document.getElementById("aurix-settings-toggle");
    const settingsPanel = document.getElementById("aurix-settings");
    const settingsClose = document.getElementById("aurix-settings-close");

    const enabledCheckbox = document.getElementById("aurix-tts-enabled");
    const subtitlesCheckbox = document.getElementById("aurix-subtitles-enabled");

    const narratorSelect = document.getElementById("aurix-voice-narrator");
    const aurixSelect = document.getElementById("aurix-voice-aurix");

    const testNarratorBtn = document.getElementById("aurix-test-narrator");
    const testAurixBtn = document.getElementById("aurix-test-aurix");

    repeatBtn.onclick = () => {
      this.repeatLast();
    };

    settingsToggle.onclick = () => {
      settingsPanel.classList.toggle("hidden");
    };

    settingsClose.onclick = () => {
      settingsPanel.classList.add("hidden");
    };

    enabledCheckbox.onchange = () => {
      this.setEnabled(enabledCheckbox.checked);
    };

    subtitlesCheckbox.onchange = () => {
      this.settings.subtitles = subtitlesCheckbox.checked;
      this.saveSettings();

      if (!this.settings.subtitles) {
        this.hideSubtitle();
      }
    };

    narratorSelect.onchange = () => {
      this.settings.narratorVoice = narratorSelect.value;
      this.saveSettings();
    };

    aurixSelect.onchange = () => {
      this.settings.aurixVoice = aurixSelect.value;
      this.saveSettings();
    };

    testNarratorBtn.onclick = () => {
      this.setEnabled(true);
      this.speakRichText("Hola, esta es la voz del narrador.", "narrator");
    };

    testAurixBtn.onclick = () => {
      this.setEnabled(true);
      this.speakRichText('**"Hello. I am AURIX."**', "aurix");
    };

    this.uiBound = true;
  }

  updateUI() {
    const enabledCheckbox = document.getElementById("aurix-tts-enabled");
    const subtitlesCheckbox = document.getElementById("aurix-subtitles-enabled");

    if (enabledCheckbox) enabledCheckbox.checked = this.settings.enabled;
    if (subtitlesCheckbox) subtitlesCheckbox.checked = this.settings.subtitles;
  }

  async loadVoices() {
    if (this.voicesPromise) return this.voicesPromise;

    this.voicesPromise = this.fetchVoices();

    return this.voicesPromise;
  }

  async fetchVoices() {
    if (!("speechSynthesis" in window)) return;

    this.voices = speechSynthesis.getVoices();

    if (!this.voices.length) {
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 1500);

        speechSynthesis.onvoiceschanged = () => {
          clearTimeout(timer);
          resolve();
        };
      });
    }

    this.voices = speechSynthesis.getVoices();
  }

  async ensureVoicesReady(maxWait) {
    if (!("speechSynthesis" in window)) return;
    if (this.voices && this.voices.length) return;
    if (!this.voicesPromise) return;

    const limit = maxWait || 1500;

    await Promise.race([
      this.voicesPromise,
      new Promise((resolve) => setTimeout(resolve, limit))
    ]);
  }

  populateVoiceSelects() {
    const narratorSelect = document.getElementById("aurix-voice-narrator");
    const aurixSelect = document.getElementById("aurix-voice-aurix");

    if (!narratorSelect || !aurixSelect) return;

    const narratorVoices = this.getSortedVoices("narrator");
    const aurixVoices = this.getSortedVoices("aurix");

    narratorSelect.innerHTML =
      '<option value="">Auto</option>' +
      narratorVoices
        .map((voice) => {
          return '<option value="' + escapeHtml(voice.name) + '">' + escapeHtml(voice.name) + "</option>";
        })
        .join("");

    aurixSelect.innerHTML =
      '<option value="">Auto</option>' +
      aurixVoices
        .map((voice) => {
          return '<option value="' + escapeHtml(voice.name) + '">' + escapeHtml(voice.name) + "</option>";
        })
        .join("");

    narratorSelect.value = this.settings.narratorVoice || "";
    aurixSelect.value = this.settings.aurixVoice || "";
  }

  getSortedVoices(role) {
    const lang = role === "aurix" ? "en" : "es";

    let list = this.voices.filter((voice) => {
      return String(voice.lang || "").toLowerCase().startsWith(lang);
    });

    if (!list.length) {
      list = this.voices.slice();
    }

    return list
      .map((voice) => {
        return {
          voice: voice,
          score: this.scoreVoice(voice, role)
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((item) => item.voice);
  }

  scoreVoice(voice, role) {
    const name = String(voice.name || "").toLowerCase();
    let score = 0;

    if (name.includes("natural")) score += 130;
    if (name.includes("online")) score += 70;
    if (name.includes("neural")) score += 40;

    if (role === "aurix") {
      if (name.includes("aria")) score += 95;
      if (name.includes("jenny")) score += 85;
      if (name.includes("michelle")) score += 70;
      if (name.includes("sonia")) score += 60;
    }

    if (role === "narrator") {
      if (name.includes("jorge")) score += 95;
      if (name.includes("alvaro")) score += 85;
      if (name.includes("alonso")) score += 70;
      if (name.includes("diego")) score += 60;
    }

    const femaleNames = [
      "aria",
      "jenny",
      "michelle",
      "sonia",
      "emma",
      "ava",
      "zira",
      "susan",
      "dalia",
      "elvira",
      "lucia",
      "helena",
      "female",
      "mujer"
    ];

    const maleNames = [
      "guy",
      "christopher",
      "ryan",
      "james",
      "david",
      "mark",
      "jorge",
      "alvaro",
      "alonso",
      "diego",
      "male",
      "hombre"
    ];

    if (role === "aurix" && femaleNames.some((item) => name.includes(item))) {
      score += 50;
    }

    if (role === "narrator" && maleNames.some((item) => name.includes(item))) {
      score += 50;
    }

    if (voice.default) {
      score += 5;
    }

    return score;
  }

  getSelectedVoice(role) {
    const savedName = role === "aurix" ? this.settings.aurixVoice : this.settings.narratorVoice;

    if (savedName) {
      const found = this.voices.find((voice) => voice.name === savedName);
      if (found) return found;
    }

    const sorted = this.getSortedVoices(role);
    return sorted[0] || null;
  }

  parseRichText(raw, defaultRole) {
    defaultRole = defaultRole || "narrator";

    const segments = [];
    const regex = /\*\*"([^"]+)"\*\*/g;

    let lastIndex = 0;
    let match;

    while ((match = regex.exec(raw)) !== null) {
      const before = raw.slice(lastIndex, match.index).trim();

      if (before) {
        segments.push({
          voiceRole: defaultRole,
          text: before
        });
      }

      segments.push({
        voiceRole: "aurix",
        text: match[1].trim()
      });

      lastIndex = regex.lastIndex;
    }

    const tail = raw.slice(lastIndex).trim();

    if (tail) {
      segments.push({
        voiceRole: defaultRole,
        text: tail
      });
    }

    return segments.filter((segment) => segment.text.length > 0);
  }

  async speakRichText(raw, defaultRole) {
    if (!raw || !this.settings.enabled) return;

    this.cancel();

    const token = ++this.speakToken;

    await this.ensureVoicesReady();

    if (token !== this.speakToken) return;

    await new Promise((resolve) => setTimeout(resolve, 80));

    if (token !== this.speakToken) return;

    this.lastSpoken = {
      raw: raw,
      defaultRole: defaultRole || "narrator"
    };

    this.showRepeat(true);

    const segments = this.parseRichText(raw, defaultRole);

    for (const segment of segments) {
      if (token !== this.speakToken) return;
      await this.speakSegment(segment);
    }

    if (token === this.speakToken) {
      this.scheduleHideSubtitle();
    }
  }

  speakSegment(segment) {
    this.showSegmentSubtitle(segment);

    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) {
        const words = segment.text.split(/\s+/).length;
        setTimeout(resolve, Math.max(700, words * 180));
        return;
      }

      const words = segment.text.split(/\s+/).length;
      const safetyMs = Math.min(30000, Math.max(2500, words * 850 + 1200));

      let finished = false;

      const finish = () => {
        if (!finished) {
          finished = true;
          clearTimeout(safetyTimer);
          resolve();
        }
      };

      const safetyTimer = setTimeout(finish, safetyMs);

      const utterance = new SpeechSynthesisUtterance(segment.text);
      const voice = this.getSelectedVoice(segment.voiceRole);

      if (voice) {
        utterance.voice = voice;
      }

      utterance.lang = segment.voiceRole === "aurix" ? "en-US" : "es-MX";
      utterance.rate = segment.voiceRole === "aurix" ? 0.95 : 1;
      utterance.pitch = segment.voiceRole === "aurix" ? 1.06 : 0.95;
      utterance.volume = 1;

      utterance.onend = finish;
      utterance.onerror = finish;

      utterance.onboundary = (event) => {
        this.handleBoundary(event, segment);
      };

      speechSynthesis.resume();
      speechSynthesis.speak(utterance);
    });
  }

  cancel() {
    this.speakToken = (this.speakToken || 0) + 1;

    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      speechSynthesis.resume();
    }

    this.hideSubtitle();
  }

  repeatLast() {
    if (!this.lastSpoken) return;

    this.speakRichText(this.lastSpoken.raw, this.lastSpoken.defaultRole);
  }

  showRepeat(visible) {
    const repeatBtn = document.getElementById("aurix-repeat");
    if (!repeatBtn) return;

    if (visible && this.lastSpoken) {
      repeatBtn.classList.remove("hidden");
    } else {
      repeatBtn.classList.add("hidden");
    }
  }

  showSegmentSubtitle(segment) {
    const subtitle = document.getElementById("aurix-subtitle");
    const textEl = document.getElementById("aurix-subtitle-text");

    if (!subtitle || !textEl) return;

    if (!this.settings.subtitles) {
      subtitle.classList.add("hidden");
      return;
    }

    if (this.subtitleTimeout) {
      clearTimeout(this.subtitleTimeout);
      this.subtitleTimeout = null;
    }

    subtitle.classList.remove("hidden");
    textEl.innerHTML = "";

    this.currentWordRanges = [];

    const wrapper = document.createElement(segment.voiceRole === "aurix" ? "strong" : "span");

    if (segment.voiceRole === "aurix") {
      wrapper.className = "en-quote";
      wrapper.appendChild(document.createTextNode('"'));
    }

    const wordRegex = /\S+/g;
    let match;
    let wordIndex = 0;

    while ((match = wordRegex.exec(segment.text)) !== null) {
      this.currentWordRanges.push({
        start: match.index,
        end: match.index + match[0].length,
        index: wordIndex
      });

      const wordSpan = document.createElement("span");
      wordSpan.className = "word";
      wordSpan.id = "aurix-word-" + wordIndex;
      wordSpan.textContent = match[0];

      wrapper.appendChild(wordSpan);
      wrapper.appendChild(document.createTextNode(" "));

      wordIndex++;
    }

    if (segment.voiceRole === "aurix") {
      wrapper.appendChild(document.createTextNode('"'));
    }

    textEl.appendChild(wrapper);
  }

  handleBoundary(event, segment) {
    if (!event) return;

    if (event.name && event.name !== "word") return;

    const charIndex = event.charIndex;

    if (typeof charIndex === "undefined") return;

    let range = this.currentWordRanges.find((item) => {
      return charIndex >= item.start && charIndex <= item.end;
    });

    if (!range) {
      range = this.currentWordRanges.find((item) => {
        return charIndex >= item.start;
      });
    }

    if (range) {
      this.highlightWord(range.index);
    }
  }

  highlightWord(index) {
    const container = document.getElementById("aurix-subtitle-text");
    if (!container) return;

    container.querySelectorAll(".word.active").forEach((el) => {
      el.classList.remove("active");
    });

    const word = document.getElementById("aurix-word-" + index);

    if (word) {
      word.classList.add("active");
    }
  }

  scheduleHideSubtitle() {
    const subtitle = document.getElementById("aurix-subtitle");
    if (!subtitle) return;

    if (this.subtitleTimeout) {
      clearTimeout(this.subtitleTimeout);
    }

    this.subtitleTimeout = setTimeout(() => {
      subtitle.classList.add("hidden");
    }, 2600);
  }

  hideSubtitle() {
    const subtitle = document.getElementById("aurix-subtitle");
    if (!subtitle) return;

    subtitle.classList.add("hidden");

    if (this.subtitleTimeout) {
      clearTimeout(this.subtitleTimeout);
      this.subtitleTimeout = null;
    }
  }
}

window.AurixTTS = new AurixTTS();

if ("speechSynthesis" in window) {
  window.AurixTTS.loadVoices();
}
