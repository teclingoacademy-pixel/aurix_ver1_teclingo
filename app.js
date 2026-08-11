console.log("AURIX OS: app.js cargado");

const AURIX_STATE_KEY = "aurix_os_state_v1";

function defaultAppState() {
  return {
    nickname: "",
    goal: "",
    goalLabel: "",
    level: "",
    minutes: "",
    route: "",
    routeLabel: "",
    skills: {
      reading: 5,
      listening: 5,
      speaking: 5,
      writing: 5
    },
    lastInteraction: "",
    onboardingCompleted: false,
    mission1Completed: false,
    powerOn: true,
    sessions: {
      session1Completed: false,
      session2Completed: false,
      session2Score: 0,
      session3Completed: false,
      session3Score: 0
    }
  };
}

function loadAppState() {
  try {
    const saved = JSON.parse(localStorage.getItem(AURIX_STATE_KEY));
    return Object.assign(defaultAppState(), saved || {});
  } catch (error) {
    return defaultAppState();
  }
}

function saveAppState() {
  localStorage.setItem(AURIX_STATE_KEY, JSON.stringify(appState));
}

let appState = loadAppState();

const splash1 = document.getElementById("splash1");
const splash2 = document.getElementById("splash2");
const splash3 = document.getElementById("splash3");
const activation = document.getElementById("activation");

const videoSplash = document.getElementById("videoSplash");
const introVideo = document.getElementById("introVideo");
let introAudioEnabled = false;

const startDot = document.getElementById("startDot");
const progressFill = document.getElementById("progressFill");
const activationTitle = document.getElementById("activationTitle");
const activationMessage = document.getElementById("activationMessage");
const btnContinue = document.getElementById("btnContinue");

let onboardingScreen = null;
let dnaToken = 0;

function wait(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function showScreen(screen) {
  const screens = document.querySelectorAll(".screen");

  screens.forEach(function (item) {
    item.classList.remove("active");
  });

  if (screen) {
    screen.classList.add("active");

    const focusable = screen.querySelector("input, button, select, [tabindex]");

    if (focusable) {
      focusable.focus();
    }
  }
}

async function speakOrWait(text, fallbackMs) {
  if (window.AurixTTS && window.AurixTTS.settings && window.AurixTTS.settings.enabled) {
    await window.AurixTTS.speakRichText(text, "narrator");
    await wait(250);
  } else {
    await wait(fallbackMs);
  }
}

function speakObInstruction(raw, container, role) {
  role = role || "narrator";

  const buttons = container
    ? Array.prototype.slice.call(container.querySelectorAll("button"))
    : [];
  const prevDisabled = buttons.map(function (btn) {
    return btn.disabled;
  });

  buttons.forEach(function (btn) {
    btn.disabled = true;
  });

  const speaking = window.AurixTTS
    ? window.AurixTTS.speakRichText(raw, role)
    : Promise.resolve();

  return Promise.resolve(speaking).then(function () {
    buttons.forEach(function (btn, index) {
      if (!btn.isConnected) return;
      btn.disabled = prevDisabled[index];
    });
  });
}

function sanitizeName(text) {
  return String(text || "")
    .replace(/[<>\"'*]/g, "")
    .trim()
    .slice(0, 24);
}

function escapeHtml(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function displayEn(text) {
  return '<strong class="en-quote">"' + escapeHtml(text) + '"</strong>';
}

function getTimeWarning(minutes) {
  if (minutes === "15") {
    return "Con 15 minutos al día, el tiempo recomendado para pasar de A1 a A2 es de aproximadamente 6 a 8 meses. Si tu meta es más corta, necesitas aumentar el tiempo diario o ajustar la expectativa.";
  }

  if (minutes === "30") {
    return "Con 30 minutos al día puedes avanzar de forma estable. El tiempo recomendado para pasar de A1 a A2 es de aproximadamente 3 a 4 meses.";
  }

  if (minutes === "45") {
    return "Con 45 minutos al día puedes avanzar más rápido. El tiempo recomendado para pasar de A1 a A2 es de aproximadamente 2 a 3 meses.";
  }

  if (minutes === "60") {
    return "Con 60 minutos al día puedes avanzar de forma intensa. El tiempo recomendado para pasar de A1 a A2 es de aproximadamente 1.5 a 2 meses.";
  }

  return "Selecciona una opción de tiempo para continuar.";
}

async function startSplashSequence() {
  showScreen(splash1);
  await speakOrWait("¿Y si aprender inglés fuera más fácil?", 3500);

  showScreen(splash2);
  await speakOrWait("¿Y si el curso se adaptara a ti... y no tú a él?", 4000);

  showScreen(splash3);
  await speakOrWait("Toca el punto para iniciar la secuencia.", 2500);
}

function playIntro(onDone) {
  showScreen(videoSplash);

  introVideo.currentTime = 0;

  introVideo.onended = function () {
    if (typeof onDone === "function") onDone();
  };

  introVideo.muted = false;
  introVideo.play().catch(function () {
    introVideo.muted = true;
    introVideo.currentTime = 0;

    introVideo.play().catch(function () {
      if (typeof onDone === "function") onDone();
    });
  });
}

function enableIntroAudio() {
  if (introAudioEnabled) return;

  if (!videoSplash.classList.contains("active")) return;

  introAudioEnabled = true;

  if (introVideo.muted) {
    introVideo.muted = false;
    introVideo.currentTime = 0;

    introVideo.play().catch(function () {});
  }
}

function setupIntroAudio() {
  var events = ["pointerdown", "touchstart", "keydown"];

  function handler() {
    events.forEach(function (evt) {
      document.removeEventListener(evt, handler);
    });

    enableIntroAudio();
  }

  events.forEach(function (evt) {
    document.addEventListener(evt, handler);
  });
}

function startExperience() {
  if (window.AurixTTS) {
    window.AurixTTS.init();
    window.AurixTTS.setEnabled(true);
  }

  if (localStorage.getItem("aurix_power_state_v1") === "off") {
    return;
  }

  setupIntroAudio();
  playIntro(function () {
    startSplashSequence();
  });
}

async function startActivation() {
  showScreen(activation);

  if (window.AurixTTS) {
    await window.AurixTTS.speakRichText("Iniciando sistema.", "narrator");
  }

  let progress = 0;

  const interval = setInterval(function () {
    progress = progress + 4;

    if (progress > 100) {
      progress = 100;
    }

    progressFill.style.width = progress + "%";

    if (progress === 100) {
      clearInterval(interval);
      finishActivation();
    }
  }, 80);
}

async function finishActivation() {
  activationTitle.textContent = "Sistema activo";

  activationMessage.innerHTML =
    'AURIX está listo para acompañarte.<br>' +
    '<strong class="en-quote">"Hello. I am AURIX."</strong>';

  btnContinue.classList.remove("hidden");

  if (window.AurixTTS) {
    await window.AurixTTS.speakRichText(
      'Sistema activo. **"Hello. I am AURIX."** Hola, soy AURIX. Vamos a personalizar tu experiencia.',
      "narrator"
    );
  }
}

startDot.addEventListener("click", function () {
  if (window.AurixAudio) {
    window.AurixAudio.playIgnition();
  }

  startActivation();
});

document.getElementById("tryCoachBtn").addEventListener("click", function () {
  if (window.AurixAudio) {
    window.AurixAudio.playIgnition();
  }
});

btnContinue.addEventListener("click", async function () {
  activationMessage.textContent = "Personalizando experiencia...";

  if (window.AurixTTS) {
    await window.AurixTTS.speakRichText("Comenzando personalización.", "narrator");
  }

  resumeJourney();
});

function resumeJourney() {
  const container = ensureOnboardingScreen();

  if (window.setIntroProtocolActive) {
    window.setIntroProtocolActive(false);
  }

  if (appState.mission1Completed) {
    renderMissionDashboard(container);
    showScreen(container);
  } else if (appState.onboardingCompleted) {
    renderOnboardingStep("placeholder");
  } else {
    enterOnboarding();
  }
}

function ensureOnboardingScreen() {
  if (onboardingScreen) {
    return onboardingScreen;
  }

  const div = document.createElement("div");
  div.id = "onboardingScreen";
  div.className = "screen";

  document.body.appendChild(div);

  onboardingScreen = div;

  return div;
}

function enterOnboarding() {
  renderOnboardingStep("nickname");
}

function renderOnboardingStep(step) {
  const container = ensureOnboardingScreen();

  if (step === "nickname") {
    renderNickname(container);
  }

  if (step === "goal") {
    renderGoal(container);
  }

  if (step === "fasttrackWarning") {
    renderFastTrackWarning(container);
  }

  if (step === "level") {
    renderLevel(container);
  }

  if (step === "skills") {
    renderSkills(container);
  }

  if (step === "time") {
    renderTime(container);
  }

  if (step === "route") {
    renderRoute(container);
  }

  if (step === "mic") {
    renderMicSetup(container);
  }

  if (step === "dna") {
    renderDna(container);
  }

  if (step === "welcome") {
    renderWelcome(container);
  }

  if (step === "placeholder") {
    renderPlaceholder(container);
  }

  showScreen(container);
}

function renderNickname(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">¿Cómo quieres que te llame tu coach?</h2>' +
      '<p class="ob-sub">Puede ser tu nombre, un apodo o como te sientas más cómodo.</p>' +
      '<input id="obNickname" class="ob-input" type="text" placeholder="Ej: Fer, Alex, Ana" maxlength="24" value="' + escapeHtml(appState.nickname || "") + '" />' +
      '<div class="ob-actions">' +
        '<button id="obNicknameNext" class="btn">Continuar</button>' +
      '</div>' +
    '</div>';

  const input = document.getElementById("obNickname");
  const nextBtn = document.getElementById("obNicknameNext");

  nextBtn.addEventListener("click", async function () {
    const nickname = sanitizeName(input.value) || "Amigo";

    appState.nickname = nickname;
    saveAppState();

    nextBtn.disabled = true;

    if (window.AurixTTS) {
      await window.AurixTTS.speakRichText(
        'Perfecto. **"Nice to meet you, ' + nickname + '."**',
        "narrator"
      );
    }

    renderOnboardingStep("goal");
  });

  speakObInstruction("¿Cómo quieres que te llame tu coach?", container);

  input.focus();
}

function renderGoal(container) {
  const goals = [
    { value: "certification", label: "Certificación B2", sub: "Llegar a B2 con base sólida" },
    { value: "travel", label: "Viajar", sub: "Comunicarte en viajes" },
    { value: "work", label: "Trabajo", sub: "Mejorar oportunidades" },
    { value: "study", label: "Estudio", sub: "Clases, exámenes y escuela" },
    { value: "conversation", label: "Conversación diaria", sub: "Hablar con naturalidad" },
    { value: "zero", label: "Empezar desde cero", sub: "Construir base con calma" }
  ];

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">¿Para qué quieres aprender inglés?</h2>' +
      '<p class="ob-sub">Elige tu meta principal.</p>' +
      '<div class="ob-chips">' +
        goals.map(function (goal) {
          return (
            '<button class="ob-chip" data-value="' + goal.value + '" data-label="' + goal.label + '">' +
              goal.label +
              '<small>' + goal.sub + '</small>' +
            '</button>'
          );
        }).join("") +
      '</div>' +
      '<div class="ob-actions">' +
        '<button id="obGoalNext" class="btn" disabled>Continuar</button>' +
      '</div>' +
    '</div>';

  let selectedGoal = null;

  const chips = container.querySelectorAll(".ob-chip");
  const nextBtn = document.getElementById("obGoalNext");

  chips.forEach(function (chip) {
    chip.addEventListener("click", async function () {
      chips.forEach(function (item) {
        item.classList.remove("selected");
      });

      chip.classList.add("selected");

      selectedGoal = {
        value: chip.dataset.value,
        label: chip.dataset.label
      };

      nextBtn.disabled = false;

      if (window.AurixTTS) {
        await window.AurixTTS.speakRichText("Opción seleccionada: " + selectedGoal.label + ".", "narrator");
      }
    });
  });

  nextBtn.addEventListener("click", async function () {
    if (!selectedGoal) return;

    appState.goal = selectedGoal.value;
    appState.goalLabel = selectedGoal.label;
    saveAppState();

    nextBtn.disabled = true;

    if (window.AurixTTS) {
      await window.AurixTTS.speakRichText("Meta guardada.", "narrator");
    }

    renderOnboardingStep("fasttrackWarning");
  });

  speakObInstruction("¿Para qué quieres aprender inglés?", container);
}

function renderFastTrackWarning(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">Comprobación rápida de nivel</h2>' +
      '<p class="ob-sub">Esta comprobación dura 2 minutos.</p>' +
      '<p class="ob-sub">No es un examen para aprobar ni reprobar. Sirve para ubicarte y que tu coach pueda ayudarte mejor.</p>' +
      '<p class="ob-sub">Intenta ser honesto. Si respondes muy alto, el contenido puede ser difícil. Si respondes muy bajo, puede ser aburrido.</p>' +
      '<div class="ob-actions">' +
        '<button id="obFastTrackNext" class="btn">Comenzar</button>' +
      '</div>' +
    '</div>';

  const nextBtn = document.getElementById("obFastTrackNext");

  nextBtn.addEventListener("click", function () {
    renderOnboardingStep("level");
  });

  speakObInstruction(
    "Esta comprobación dura 2 minutos. " +
    "No es un examen para aprobar ni reprobar. " +
    "Sirve para ubicarte y que tu coach pueda ayudarte mejor. " +
    "Intenta ser honesto. " +
    "Si respondes muy alto, el contenido puede ser difícil. " +
    "Si respondes muy bajo, puede ser aburrido.",
    container
  );
}

function renderLevel(container) {
  const levelSamples = {
    A1: {
      label: "A1 básico",
      text: "Hello. My name is Alex. I am from Mexico. I like coffee and music."
    },
    A2: {
      label: "A2 elemental",
      text: "Last weekend, I visited my cousin. We walked in the park and ate lunch together."
    },
    B1: {
      label: "B1 intermedio",
      text: "I have been studying English because I want to get a better job."
    }
  };

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">¿Qué texto entiendes mejor?</h2>' +
      '<p class="ob-sub">Escucha cada muestra y selecciona el texto que entendiste mejor. B2 es tu meta; por ahora confirmamos tu base hasta B1.</p>' +
      Object.entries(levelSamples).map(function (entry) {
        const key = entry[0];
        const sample = entry[1];

        return (
          '<div class="ob-level-card" id="levelCard-' + key + '">' +
            '<div class="ob-level-head">' +
              '<div class="ob-level-title">' + sample.label + '</div>' +
              '<div class="ob-mini-actions">' +
                '<button class="ob-small-btn" id="listen-' + key + '">Escuchar</button>' +
                '<button class="ob-small-btn primary" id="choose-' + key + '">Entendí mejor este</button>' +
              '</div>' +
            '</div>' +
            '<div class="ob-sample">' + displayEn(sample.text) + '</div>' +
          '</div>'
        );
      }).join("") +
      '<div class="ob-actions">' +
        '<button id="obLevelNext" class="btn" disabled>Continuar</button>' +
      '</div>' +
    '</div>';

  let selectedLevel = null;

  const nextBtn = document.getElementById("obLevelNext");

  Object.entries(levelSamples).forEach(function (entry) {
    const key = entry[0];
    const sample = entry[1];

    document.getElementById("listen-" + key).addEventListener("click", async function () {
      if (window.AurixTTS) {
        await window.AurixTTS.speakRichText('**"' + sample.text + '"**', "aurix");
      }
    });

    document.getElementById("choose-" + key).addEventListener("click", async function () {
      selectedLevel = key;

      document.querySelectorAll(".ob-level-card").forEach(function (card) {
        card.classList.remove("selected");
      });

      document.getElementById("levelCard-" + key).classList.add("selected");
      nextBtn.disabled = false;

      if (window.AurixTTS) {
        await window.AurixTTS.speakRichText("Texto seleccionado: " + sample.label + ".", "narrator");
      }
    });
  });

  nextBtn.addEventListener("click", async function () {
    if (!selectedLevel) return;

    appState.level = selectedLevel;
    saveAppState();

    nextBtn.disabled = true;

    if (window.AurixTTS) {
      await window.AurixTTS.speakRichText("Entendido. Tu punto de partida provisional es " + selectedLevel + ".", "narrator");
    }

    renderOnboardingStep("skills");
  });

  speakObInstruction("¿Qué texto entiendes mejor?", container);
}

function renderSkills(container) {
  const skills = [
    {
      key: "reading",
      label: "¿Qué tan bien lo entendiste al leerlo?"
    },
    {
      key: "listening",
      label: "Si lo escucharas despacio, ¿qué tan bien lo entenderías?"
    },
    {
      key: "speaking",
      label: "Si te pido que digas este diálogo en voz alta, ¿qué calificación te pones?"
    },
    {
      key: "writing",
      label: "¿Podrías escribir una frase parecida?"
    }
  ];

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">Autoevaluación rápida</h2>' +
      '<p class="ob-sub">Califica del 1 al 10. Esto ayuda a AURIX a apoyar tus habilidades débiles.</p>' +
      '<div class="ob-actions">' +
        '<button id="obReadQuestions" class="ob-small-btn">Leer preguntas</button>' +
      '</div>' +
      skills.map(function (skill) {
        const value = appState.skills[skill.key] || 5;

        return (
          '<div class="ob-slider-row">' +
            '<div class="ob-slider-top">' +
              '<span>' + skill.label + '</span>' +
              '<strong id="value-' + skill.key + '">' + value + '</strong>' +
            '</div>' +
            '<input id="slider-' + skill.key + '" type="range" min="1" max="10" step="1" value="' + value + '" />' +
          '</div>'
        );
      }).join("") +
      '<div class="ob-actions">' +
        '<button id="obSkillsNext" class="btn">Continuar</button>' +
      '</div>' +
    '</div>';

  skills.forEach(function (skill) {
    const slider = document.getElementById("slider-" + skill.key);
    const value = document.getElementById("value-" + skill.key);

    slider.addEventListener("input", function () {
      value.textContent = slider.value;
    });
  });

  document.getElementById("obReadQuestions").addEventListener("click", function () {
    if (window.AurixTTS) {
      const allQuestions = skills.map(function (skill) {
        return skill.label;
      }).join(" ");

      window.AurixTTS.speakRichText(allQuestions, "narrator");
    }
  });

  document.getElementById("obSkillsNext").addEventListener("click", async function () {
    appState.skills = {
      reading: Number(document.getElementById("slider-reading").value),
      listening: Number(document.getElementById("slider-listening").value),
      speaking: Number(document.getElementById("slider-speaking").value),
      writing: Number(document.getElementById("slider-writing").value)
    };

    saveAppState();

    if (window.AurixTTS) {
      await window.AurixTTS.speakRichText("Gracias. Esta información me ayudará a apoyar tus habilidades.", "narrator");
    }

    renderOnboardingStep("time");
  });

  speakObInstruction("Ahora califica del 1 al 10.", container);
}

function renderTime(container) {
  const options = [
    { value: "15", label: "15 minutos" },
    { value: "30", label: "30 minutos" },
    { value: "45", label: "45 minutos" },
    { value: "60", label: "60 minutos" }
  ];

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">¿Cuánto tiempo realista puedes dedicar por día?</h2>' +
      '<p class="ob-sub">El sistema te mostrará la expectativa real de avance.</p>' +
      '<div class="ob-chips">' +
        options.map(function (option) {
          return (
            '<button class="ob-chip" data-value="' + option.value + '" data-label="' + option.label + '">' +
              option.label +
            '</button>'
          );
        }).join("") +
      '</div>' +
      '<div id="obTimeWarning" class="ob-warning hidden"></div>' +
      '<div class="ob-actions">' +
        '<button id="obTimeNext" class="btn" disabled>Continuar</button>' +
      '</div>' +
    '</div>';

  let selectedMinutes = null;

  const chips = container.querySelectorAll(".ob-chip");
  const warningBox = document.getElementById("obTimeWarning");
  const nextBtn = document.getElementById("obTimeNext");

  chips.forEach(function (chip) {
    chip.addEventListener("click", async function () {
      chips.forEach(function (item) {
        item.classList.remove("selected");
      });

      chip.classList.add("selected");

      selectedMinutes = chip.dataset.value;

      const warning = getTimeWarning(selectedMinutes);

      warningBox.textContent = warning;
      warningBox.classList.remove("hidden");

      nextBtn.disabled = false;

      if (window.AurixTTS) {
        await window.AurixTTS.speakRichText(warning, "narrator");
      }
    });
  });

  nextBtn.addEventListener("click", async function () {
    if (!selectedMinutes) return;

    appState.minutes = selectedMinutes;
    saveAppState();

    nextBtn.disabled = true;

    if (window.AurixTTS) {
      await window.AurixTTS.speakRichText("Tiempo guardado.", "narrator");
    }

    renderOnboardingStep("route");
  });

  speakObInstruction("¿Cuánto tiempo realista puedes dedicar por día?", container);
}

function renderRoute(container) {
  const options = [
    { value: "travel", label: "Viajes" },
    { value: "work", label: "Trabajo" },
    { value: "certification", label: "Certificación B2" },
    { value: "conversation", label: "Conversación diaria" },
    { value: "academic", label: "Inglés académico" },
    { value: "zero", label: "Desde cero" }
  ];

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">Elige la ruta que más te guste</h2>' +
      '<p class="ob-sub">Esta ruta definirá el contenido principal de tu experiencia.</p>' +
      '<div class="ob-chips">' +
        options.map(function (option) {
          return (
            '<button class="ob-chip" data-value="' + option.value + '" data-label="' + option.label + '">' +
              option.label +
            '</button>'
          );
        }).join("") +
      '</div>' +
      '<div class="ob-actions">' +
        '<button id="obRouteNext" class="btn" disabled>Continuar</button>' +
      '</div>' +
    '</div>';

  let selectedRoute = null;

  const chips = container.querySelectorAll(".ob-chip");
  const nextBtn = document.getElementById("obRouteNext");

  chips.forEach(function (chip) {
    chip.addEventListener("click", async function () {
      chips.forEach(function (item) {
        item.classList.remove("selected");
      });

      chip.classList.add("selected");

      selectedRoute = {
        value: chip.dataset.value,
        label: chip.dataset.label
      };

      nextBtn.disabled = false;

      if (window.AurixTTS) {
        await window.AurixTTS.speakRichText("Ruta seleccionada: " + selectedRoute.label + ".", "narrator");
      }
    });
  });

  nextBtn.addEventListener("click", async function () {
    if (!selectedRoute) return;

    appState.route = selectedRoute.value;
    appState.routeLabel = selectedRoute.label;
    saveAppState();

    nextBtn.disabled = true;

    if (window.AurixTTS) {
      await window.AurixTTS.speakRichText("Ruta guardada.", "narrator");
    }

    renderOnboardingStep("dna");
  });

  speakObInstruction("Elige la ruta que más te guste.", container);
}

function renderMicSetup(container) {
  if (window.AurixMicSetup && window.AurixMicSetup.setupDone()) {
    renderOnboardingStep("dna");
    return;
  }

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">Configura tu micrófono</h2>' +
      '<p class="ob-sub">El micrófono es pieza clave de AURIX: con él practicarás tu pronunciación. Se configura una sola vez.</p>' +
      '<div class="ms-steps">' +
        '<div class="ms-step">1. Toca <b>Probar micrófono</b> y acepta el permiso.</div>' +
        '<div class="ms-step">2. Habla: las barras deben moverse.</div>' +
        '<div class="ms-step">3. Toca <b>Micrófono listo</b>.</div>' +
      '</div>' +
      '<div class="ms-bars" id="msBars">' +
        '<span></span><span></span><span></span><span></span><span></span><span></span><span></span>' +
      '</div>' +
      '<div class="ms-status" id="msStatus">Esperando prueba...</div>' +
      '<div class="ob-actions">' +
        '<button id="msTestBtn" class="btn">🎤 Probar micrófono</button>' +
        '<button id="msReadyBtn" class="btn" disabled>✔ Micrófono listo</button>' +
      '</div>' +
      '<button type="button" class="ms-skip" id="msSkip" style="background:none;border:none;padding:0;font:inherit;color:inherit;width:100%">Continuar sin micrófono</button>' +
    '</div>';

  document.getElementById("msTestBtn").addEventListener("click", function () {
    if (window.AurixMicSetup) {
      window.AurixMicSetup.runTest();
    }
  });

  document.getElementById("msReadyBtn").addEventListener("click", function () {
    if (window.AurixMicSetup) {
      window.AurixMicSetup.markDone();
      window.AurixMicSetup.stopTest();
    }

    if (typeof aurixSpeakQueued === "function") {
      aurixSpeakQueued("Micrófono configurado correctamente. Ya puedes practicar tu acento.");
    }

    renderOnboardingStep("dna");
  });

  document.getElementById("msSkip").addEventListener("click", function () {
    if (window.AurixMicSetup) {
      window.AurixMicSetup.stopTest();
    }

    renderOnboardingStep("dna");
  });

  if (window.AurixMicSetup) {
    window.AurixMicSetup.checkPermissionState();
  }

  speakObInstruction(
    "Antes de crear tu ADN, configura tu micrófono. " +
    "Toca Probar micrófono y acepta el permiso, " +
    "habla para que las barras se muevan y después toca Micrófono listo.",
    container
  );
}

function renderDna(container) {
  container.innerHTML =
    '<div class="card glass ob-card ob-center">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">Construyendo tu ADN</h2>' +
      '<p class="ob-sub">Analizando tus respuestas para crear tu experiencia única.</p>' +
      '<div class="ob-dna-loader"></div>' +
      '<p id="obDnaStatus">Analizando preferencias...</p>' +
    '</div>';

  dnaToken++;
  runDna(dnaToken);
}

async function runDna(token) {
  const status = document.getElementById("obDnaStatus");

  if (!status) return;

  await speakOrWait("Construyendo tu ADN de aprendizaje.", 1200);
  if (token !== dnaToken) return;

  status.textContent = "Analizando preferencias...";
  await speakOrWait("Analizando preferencias.", 1200);
  if (token !== dnaToken) return;

  status.textContent = "Mapeando tu estilo...";
  await speakOrWait("Mapeando tu estilo.", 1200);
  if (token !== dnaToken) return;

  status.textContent = "Sincronizando con AURIX...";
  await speakOrWait("Sincronizando con AURIX.", 1200);
  if (token !== dnaToken) return;

  status.textContent = "Tu ADN está listo.";
  await speakOrWait("Tu ADN está listo.", 1200);
  if (token !== dnaToken) return;

  renderOnboardingStep("welcome");
}

function renderWelcome(container) {
  appState.lastInteraction = "Onboarding completado";
  appState.onboardingCompleted = true;
  saveAppState();

  if (window.setIntroProtocolActive) {
    window.setIntroProtocolActive(false);
  }

  const summary = [
    { label: "Meta", value: appState.goalLabel || "Sin definir" },
    { label: "Nivel provisional", value: appState.level || "Sin definir" },
    { label: "Tiempo diario", value: appState.minutes ? appState.minutes + " minutos" : "Sin definir" },
    { label: "Ruta", value: appState.routeLabel || "Sin definir" }
  ];

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">Tu ADN de aprendizaje está listo</h2>' +
      '<p class="ob-sub">Hemos creado una experiencia única para ti.</p>' +
      '<div class="ob-summary-grid">' +
        summary.map(function (item) {
          return (
            '<div class="ob-summary-item">' +
              '<div class="ob-summary-label">' + item.label + '</div>' +
              '<div class="ob-summary-value">' + escapeHtml(item.value) + '</div>' +
            '</div>'
          );
        }).join("") +
      '</div>' +
      '<div class="ob-actions">' +
        '<button id="obStartJourney" class="btn">Comenzar mi viaje</button>' +
      '</div>' +
    '</div>';

  document.getElementById("obStartJourney").addEventListener("click", async function () {
    if (window.AurixTTS) {
      await window.AurixTTS.speakRichText('**"Let us begin."**', "aurix");
    }

    renderOnboardingStep("placeholder");
  });

  speakObInstruction(
    "Tu ADN de aprendizaje está listo. " +
    "Meta: " + (appState.goalLabel || "Sin definir") + ". " +
    "Nivel provisional: " + (appState.level || "Sin definir") + ". " +
    "Tiempo diario: " + (appState.minutes ? appState.minutes + " minutos" : "Sin definir") + ". " +
    "Ruta: " + (appState.routeLabel || "Sin definir") + ". " +
    '**"Let us start."**',
    container
  );
}

/* ============================================
   AURIX FIRST MISSION
============================================ */

function enQuote(text) {
  return '**"' + text + '"**';
}

function renderPlaceholder(container) {
  if (typeof aurixSetMenuEnabled === "function") {
    aurixSetMenuEnabled(true);
  }

  renderMissionIntro(container);
}

function renderMissionIntro(container) {
  container.innerHTML = `
    <div class="card glass ob-card ob-center">
      <div class="badge">AURIX OS</div>
      <h2 class="ob-title">Primera misión</h2>
      <p class="ob-sub">Conociéndonos</p>
      <p class="ob-sub">AURIX quiere saludarte y enseñarte a presentarte en inglés.</p>
      <div class="ob-actions">
        <button id="missionIntroBtn" class="btn">Comenzar</button>
      </div>
    </div>
  `;

  document.getElementById("missionIntroBtn").addEventListener("click", function () {
    renderMissionGreeting(container);
  });

  if (window.AurixTTS) {
    window.AurixTTS.speakRichText(
      "Primera misión. Conociéndonos. AURIX quiere saludarte y enseñarte a presentarte en inglés.",
      "narrator"
    );
  }
}

function renderMissionGreeting(container) {
  container.innerHTML = `
    <div class="card glass ob-card">
      <div class="badge">AURIX OS</div>
      <h2 class="ob-title">AURIX se presenta</h2>

      <div class="mi-message">
        <div class="mi-avatar">✦</div>
        <div class="mi-bubble">
          ${displayEn("Hi. I am AURIX. Nice to meet you.")}
        </div>
      </div>

      <p class="mi-translation">Hola, soy AURIX. Encantada de conocerte.</p>

      <div class="ob-actions">
        <button id="missionGreetingNext" class="btn">Continuar</button>
      </div>
    </div>
  `;

  document.getElementById("missionGreetingNext").addEventListener("click", function () {
    renderMissionTeach(container);
  });

  if (window.AurixTTS) {
    window.AurixTTS.speakRichText(
      enQuote("Hi. I am AURIX. Nice to meet you.") +
      " Hola, soy AURIX. Encantada de conocerte.",
      "narrator"
    );
  }
}

function renderMissionPractice(container) {
  const name = appState.nickname || "Amigo";

  container.innerHTML = `
    <div class="card glass ob-card">
      <div class="badge">AURIX OS</div>
      <h2 class="ob-title">Ahora es tu turno</h2>
      <p class="ob-sub">Preséntate en inglés. Puedes escribirlo o usar el micrófono.</p>

      <div class="mi-chatbox">
        <span class="mi-prefix">${displayEn("I am")}</span>
        <input id="missionNameInput" class="ob-input mi-input" type="text" maxlength="24" placeholder="Tu nombre" value="${escapeHtml(name)}" />
        <button id="missionMicBtn" class="mi-mic-btn" aria-label="Hablar por micrófono" title="Hablar por micrófono">🎙</button>
      </div>
      <p id="missionMicStatus" class="mi-mic-status hidden"></p>

      <p class="ob-note">
        Frase objetivo: ${displayEn("I am " + name + ".")}
      </p>

      <div class="ob-actions">
        <button id="missionIntroduceBtn" class="btn">Presentarse</button>
      </div>
    </div>
  `;

  const input = document.getElementById("missionNameInput");
  const introduceBtn = document.getElementById("missionIntroduceBtn");
  const micBtn = document.getElementById("missionMicBtn");
  const micStatus = document.getElementById("missionMicStatus");

  function updateMicUI(listening) {
    micBtn.classList.toggle("listening", listening);
    micBtn.setAttribute("aria-pressed", listening ? "true" : "false");
  }

  micBtn.addEventListener("click", function () {
    if (!window.AurixVoice || !window.AurixVoice.supported) {
      micStatus.textContent = "Este navegador no soporta reconocimiento de voz.";
      micStatus.classList.remove("hidden");
      return;
    }

    if (window.AurixVoice.isListening()) {
      window.AurixVoice.stop();
      updateMicUI(false);
      return;
    }

    if (window.AurixTTS) {
      window.AurixTTS.cancel();
    }

    micStatus.textContent = "Escuchando... Di tu nombre.";
    micStatus.classList.remove("hidden");
    updateMicUI(true);

    window.AurixVoice.start({
      lang: "en-US",
      onResult: function (result) {
        if (result.final) {
          const cleaned = sanitizeName(extractSpokenName(result.final));

          if (cleaned) {
            input.value = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
            input.focus();
            micStatus.textContent = "Escuchado: " + cleaned;
          }
        } else if (result.interim) {
          micStatus.textContent = "Escuchando: " + result.interim;
        }
      },
      onEnd: function () {
        updateMicUI(false);
      },
      onError: function (error) {
        updateMicUI(false);

        if (error === "not-allowed") {
          micStatus.textContent = "Acceso al micrófono denegado. Revísalo en el navegador.";
        } else if (error === "no-speech") {
          micStatus.textContent = "No te escuché. Intenta de nuevo.";
        } else {
          micStatus.textContent = "No te escuché bien. Intenta de nuevo.";
        }
      }
    });
  });

  introduceBtn.addEventListener("click", function () {
    const finalName = sanitizeName(input.value) || "Amigo";

    appState.nickname = finalName;
    saveAppState();

    renderMissionResponse(container, finalName);
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      introduceBtn.click();
    }
  });

  if (window.AurixTTS) {
    window.AurixTTS.speakRichText(
      "Ahora es tu turno. Preséntate en inglés. Di: " +
      enQuote("I am " + name + "."),
      "narrator"
    );
  }
}

function extractSpokenName(raw) {
  let text = String(raw || "").trim();

  text = text.replace(/^i('| a)?m\s+/i, "");
  text = text.replace(/^my name is\s+/i, "");
  text = text.replace(/^my name('s)?\s+/i, "");
  text = text.replace(/^the name is\s+/i, "");
  text = text.replace(/^name('s| is)?\s+/i, "");

  return text.replace(/[.,!?;:"']+$/g, "").trim();
}

function renderMissionResponse(container, name) {
  container.innerHTML = `
    <div class="card glass ob-card">
      <div class="badge">AURIX OS</div>
      <h2 class="ob-title">Respuesta de AURIX</h2>

      <div class="mi-message">
        <div class="mi-avatar">✦</div>
        <div class="mi-bubble">
          ${displayEn("Nice to meet you, " + name + ".")}
        </div>
      </div>

      <p class="mi-translation">Encantada de conocerte, ${escapeHtml(name)}.</p>

      <div class="ob-actions">
        <button id="missionResponseNext" class="btn">Continuar</button>
      </div>
    </div>
  `;

  document.getElementById("missionResponseNext").addEventListener("click", function () {
    renderMissionComplete(container);
  });

  if (window.AurixTTS) {
    window.AurixTTS.speakRichText(
      enQuote("Nice to meet you, " + name + ".") +
      " Encantada de conocerte, " + name + ".",
      "narrator"
    );
  }
}

function renderMissionComplete(container) {
  appState.lastInteraction = "Primera conversación: saludos";
  appState.mission1Completed = true;
  saveAppState();

  container.innerHTML = `
    <div class="card glass ob-card">
      <div class="badge">AURIX OS</div>
      <h2 class="ob-title">Primera conversación completada</h2>
      <p class="ob-sub">Has dado el primer paso en tu viaje con AURIX.</p>

      <div class="mi-summary">
        <div class="mi-summary-item">
          <span class="mi-summary-icon">👋</span>
          <span>Aprendiste a saludar en inglés.</span>
        </div>

        <div class="mi-summary-item">
          <span class="mi-summary-icon">🙋</span>
          <span>Te presentaste usando tu nickname.</span>
        </div>

        <div class="mi-summary-item">
          <span class="mi-summary-icon">💬</span>
          <span>Iniciaste tu primera conversación.</span>
        </div>
      </div>

      <div class="ob-actions">
        <button id="missionCompleteNext" class="btn">Ir al panel</button>
      </div>
    </div>
  `;

  document.getElementById("missionCompleteNext").addEventListener("click", function () {
    renderMissionDashboard(container);
  });

  if (window.AurixTTS) {
    window.AurixTTS.speakRichText(
      "Primera conversación completada. " +
      "Has aprendido a saludar. " +
      "Te has presentado en inglés. " +
      "Has iniciado tu primera conversación. " +
      enQuote("Let us continue."),
      "narrator"
    );
  }
}

function renderMissionDashboard(container) {
  const summary = [
    {
      label: "Nickname",
      value: appState.nickname || "Sin definir"
    },
    {
      label: "Meta",
      value: appState.goalLabel || "Sin definir"
    },
    {
      label: "Nivel",
      value: appState.level || "Sin definir"
    },
    {
      label: "Tiempo",
      value: appState.minutes ? appState.minutes + " minutos" : "Sin definir"
    },
    {
      label: "Ruta",
      value: appState.routeLabel || "Sin definir"
    },
    {
      label: "Última interacción",
      value: appState.lastInteraction || "Sin interacción"
    }
  ];

  container.innerHTML = `
    <div class="card glass ob-card">
      <div class="badge">AURIX OS</div>
      <h2 class="ob-title">Panel provisional</h2>
      <p class="ob-sub">Tu ADN está activo. La siguiente misión llegará en el próximo bloque.</p>

      <div class="ob-summary-grid">
        ${summary.map(function (item) {
          return `
            <div class="ob-summary-item">
              <div class="ob-summary-label">${item.label}</div>
              <div class="ob-summary-value">${escapeHtml(item.value)}</div>
            </div>
          `;
        }).join("")}
      </div>

      <div class="ob-actions">
        <button id="missionRepeatBtn" class="ob-small-btn">Repetir primera misión</button>
        <button id="missionRestartBtn" class="btn">Reiniciar experiencia</button>
        <button id="missionChatBtn" class="btn" style="background: linear-gradient(135deg, #00c6fb, #005bea);">💬 Conversación Libre</button>
      </div>
    </div>
  `;

  document.getElementById("missionRepeatBtn").addEventListener("click", function () {
    renderMissionIntro(container);
  });

  document.getElementById("missionChatBtn").addEventListener("click", function () {
    window.open("https://teclingo-chat.vercel.app/", "_blank");
  });

  document.getElementById("missionRestartBtn").addEventListener("click", async function () {
    if (window.AurixTTS) {
      await window.AurixTTS.speakRichText("Reiniciando experiencia.", "narrator");
    }

    await wait(700);
    location.reload();
  });

  if (window.AurixTTS) {
    window.AurixTTS.speakRichText(
      "Panel provisional. Tu ADN está activo. " +
      enQuote("Ready to continue?"),
      "narrator"
    );
  }
}

function renderMissionTeach(container) {
  const phrases = [
    {
      en: "Hello.",
      es: "Hola."
    },
    {
      en: "Hi.",
      es: "Hola, informal."
    },
    {
      en: "Nice to meet you.",
      es: "Encantado o encantada de conocerte."
    }
  ];

  container.innerHTML = `
    <div class="card glass ob-card">
      <div class="badge">AURIX OS</div>
      <h2 class="ob-title">Aprendamos a saludar</h2>
      <p class="ob-sub">Usa el botón Escuchar para oír cada frase. Luego continúa.</p>

      <div class="ob-actions">
        <button id="missionListenAll" class="ob-small-btn">Escuchar todo</button>
      </div>

      <div class="mi-phrases">
        ${phrases.map(function (phrase) {
          return `
            <div class="mi-phrase-card">
              <div class="mi-phrase-en">${displayEn(phrase.en)}</div>
              <div class="mi-phrase-es">${phrase.es}</div>
              <div class="ob-mini-actions">
                <button class="ob-small-btn mi-listen" data-en="${phrase.en}">Escuchar</button>
              </div>
            </div>
          `;
        }).join("")}
      </div>

      <div class="ob-actions">
        <button id="missionTeachNext" class="btn">Continuar</button>
      </div>
    </div>
  `;

  container.querySelectorAll(".mi-listen").forEach(function (button) {
    button.addEventListener("click", function () {
      if (window.AurixTTS) {
        window.AurixTTS.speakRichText(enQuote(button.dataset.en), "aurix");
      }
    });
  });

  document.getElementById("missionListenAll").addEventListener("click", function () {
    if (window.AurixTTS) {
      window.AurixTTS.speakRichText(
        "Escucha y repite. " +
        enQuote("Hello.") + " " +
        enQuote("Hi.") + " " +
        enQuote("Nice to meet you."),
        "narrator"
      );
    }
  });

  document.getElementById("missionTeachNext").addEventListener("click", function () {
    if (window.AurixTTS) {
      window.AurixTTS.cancel();
    }

    renderMissionPractice(container);
  });

  if (window.AurixTTS) {
    window.AurixTTS.speakRichText(
      "Aprendamos a saludar. Usa el botón Escuchar para oír cada frase.",
      "narrator"
    );
  }
}

startExperience();

/* ============================================
   AURIX POWER CONTROL LOGIC
============================================ */

(function () {
  var POWER_KEY = "aurix_power_state_v1";
  var audioCtx = null;
  var powerAnimating = false;

  function enQuoteSafe(text) {
    return '**"' + text + '"**';
  }

  function isPowerOn() {
    return localStorage.getItem(POWER_KEY) !== "off";
  }

  function savePower(on) {
    localStorage.setItem(POWER_KEY, on ? "on" : "off");
  }

  function getAppState() {
    if (typeof appState !== "undefined") {
      return appState;
    }

    return null;
  }

  function getAudioContext() {
    try {
      if (!audioCtx) {
        var AudioContextClass = window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
          return null;
        }

        audioCtx = new AudioContextClass();
      }

      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      return audioCtx;
    } catch (error) {
      return null;
    }
  }

  function playPowerSound(type) {
    try {
      var ctx = getAudioContext();

      if (!ctx) {
        return;
      }

      function tone(freq, start, duration, volume) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "sine";
        osc.frequency.value = freq;

        var t = ctx.currentTime + start;

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(volume, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

        osc.start(t);
        osc.stop(t + duration + 0.05);
      }

      if (type === "on") {
        tone(440, 0, 0.12, 0.07);
        tone(660, 0.12, 0.14, 0.07);
        tone(880, 0.26, 0.18, 0.07);
      }

      if (type === "off") {
        tone(660, 0, 0.12, 0.07);
        tone(440, 0.12, 0.14, 0.06);
        tone(220, 0.26, 0.2, 0.05);
      }

      if (type === "restart") {
        tone(523, 0, 0.08, 0.06);
        tone(659, 0.08, 0.08, 0.06);
        tone(784, 0.16, 0.08, 0.06);
        tone(1047, 0.24, 0.22, 0.07);
      }
    } catch (error) {
      // Silencio si el audio falla.
    }
  }

  function flashScreen() {
    var flash = document.getElementById("aurixFlash");

    if (!flash) {
      return;
    }

    flash.classList.remove("active");
    void flash.offsetWidth;
    flash.classList.add("active");

    setTimeout(function () {
      flash.classList.remove("active");
    }, 700);
  }

  function injectPowerUI() {
    if (document.getElementById("aurixPowerBtn")) {
      return;
    }

    var btn = document.createElement("button");
    btn.id = "aurixPowerBtn";
    btn.type = "button";
    btn.className = "aurix-power-btn on";
    btn.setAttribute("aria-label", "Encender o apagar AURIX");
    btn.setAttribute("aria-pressed", "true");

    btn.innerHTML =
      '<span class="aurix-power-icon">⚡</span>' +
      '<span class="aurix-power-text">AURIX</span>' +
      '<span class="aurix-power-led"></span>';

    document.body.appendChild(btn);

    var topBtn = document.createElement("button");
    topBtn.id = "aurixPowerTop";
    topBtn.type = "button";
    topBtn.className = "aurix-power-top on";
    topBtn.setAttribute("aria-label", "Encender o apagar AURIX");
    topBtn.setAttribute("aria-pressed", "true");

    topBtn.innerHTML =
      '<span class="aurix-power-icon">⚡</span>' +
      '<span class="aurix-power-text">AURIX</span>' +
      '<span class="aurix-power-led"></span>';

    document.body.appendChild(topBtn);

    var hotspot = document.createElement("div");
    hotspot.id = "aurixPowerHotspot";
    hotspot.className = "aurix-power-hotspot";
    hotspot.setAttribute("role", "button");
    hotspot.setAttribute("tabindex", "0");
    hotspot.setAttribute("aria-label", "Mostrar botón de encendido");
    document.body.appendChild(hotspot);

    var topHideTimer = null;

    function showTopButton(hold) {
      topBtn.classList.remove("hidden");

      if (topHideTimer) {
        clearTimeout(topHideTimer);
      }

      var ms = typeof hold === "number" ? hold : 6000;

      topHideTimer = setTimeout(function () {
        topBtn.classList.add("hidden");
        topHideTimer = null;
      }, ms);
    }

    function hideTopButton() {
      if (topHideTimer) {
        clearTimeout(topHideTimer);
        topHideTimer = null;
      }

      topBtn.classList.add("hidden");
    }

    function togglePower() {
      if (powerAnimating) {
        return;
      }

      powerAnimating = true;

      (async function () {
        try {
          if (isPowerOn()) {
            await powerOff();
          } else {
            await powerOn(false);
          }
        } finally {
          powerAnimating = false;
        }
      })();
    }

    showTopButton();

    topBtn.addEventListener("click", function () {
      togglePower();
      hideTopButton();
    });

    hotspot.addEventListener("click", function () {
      showTopButton();
    });

    hotspot.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showTopButton();
      }
    });

    var overlay = document.createElement("div");
    overlay.id = "aurixOffOverlay";
    overlay.className = "aurix-off-overlay hidden";
    overlay.setAttribute("role", "button");
    overlay.setAttribute("tabindex", "0");
    overlay.setAttribute("aria-label", "Reiniciar coach AI de inglés");

    overlay.innerHTML =
      '<div class="aurix-off-dot"></div>' +
      '<div class="aurix-off-hint">Reiniciar coach AI de inglés</div>' +
      '<div class="aurix-off-status">AURIX — Desconectado</div>';

    document.body.appendChild(overlay);

    var flash = document.createElement("div");
    flash.id = "aurixFlash";
    flash.className = "aurix-flash";
    document.body.appendChild(flash);

    btn.addEventListener("click", function () {
      togglePower();
    });

    overlay.addEventListener("click", async function () {
      if (powerAnimating) {
        return;
      }

      powerAnimating = true;

      try {
        await powerOn(true);
      } finally {
        powerAnimating = false;
      }
    });

    overlay.addEventListener("keydown", async function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();

        if (powerAnimating) {
          return;
        }

        powerAnimating = true;

        try {
          await powerOn(true);
        } finally {
          powerAnimating = false;
        }
      }
    });

    updatePowerUI();
  }

  function updatePowerUI() {
    var btn = document.getElementById("aurixPowerBtn");
    var overlay = document.getElementById("aurixOffOverlay");
    var topBtn = document.getElementById("aurixPowerTop");

    if (!btn || !overlay) {
      return;
    }

    var on = isPowerOn();

    btn.classList.toggle("on", on);
    btn.classList.toggle("off", !on);
    btn.setAttribute("aria-pressed", String(on));

    if (topBtn) {
      topBtn.classList.toggle("on", on);
      topBtn.classList.toggle("off", !on);
      topBtn.setAttribute("aria-pressed", String(on));
    }

    overlay.classList.toggle("hidden", on);
  }

  function hideAllPopupsAndScreens() {
    var targets = [
      ".mic-modal",
      ".ms-overlay",
      "#micSetupOverlay",
      "#aurix-settings",
      ".ss-toast",
      ".pr-record-toast",
      ".wb-banner"
    ];

    for (var t = 0; t < targets.length; t++) {
      var nodes = document.querySelectorAll(targets[t]);

      for (var i = 0; i < nodes.length; i++) {
        nodes[i].classList.add("hidden");
      }
    }

    var onboarding = document.getElementById("onboardingScreen");

    if (onboarding) {
      onboarding.innerHTML = "";
    }

    var dock = document.getElementById("aurixMenuDock");
    var launcher = document.getElementById("aurixMenuLauncher");

    if (dock) {
      dock.classList.remove("open");
    }

    if (launcher) {
      launcher.classList.remove("open");
      launcher.innerHTML = "☰";
    }

    if (window.aurixSetMenuEnabled) {
      window.aurixSetMenuEnabled(false);
    }
  }

  function aurixMenuFeedback(message) {
    var toast = document.getElementById("aurixMenuFeedback");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "aurixMenuFeedback";
      toast.className = "aurix-menu-feedback";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 2400);
  }

  async function powerOff() {
    if (!isPowerOn()) {
      return;
    }

    if (window.setIntroProtocolActive) {
      window.setIntroProtocolActive(true);
    }

    playPowerSound("off");
    flashScreen();

    if (window.AurixTTS) {
      await window.AurixTTS.speakRichText("Apagando coach de inglés.", "narrator");
      await window.AurixTTS.speakRichText(enQuoteSafe("Goodbye."), "aurix");
    }

    savePower(false);

    var state = getAppState();

    if (state) {
      state.powerOn = false;

      if (typeof saveAppState === "function") {
        saveAppState();
      }
    }

    if (window.aurixStopAllMics) {
      window.aurixStopAllMics();
    }

    hideAllPopupsAndScreens();

    updatePowerUI();

    if (window.AurixTTS) {
      window.AurixTTS.cancel();
    }

    aurixMenuFeedback("AURIX apagado");

    var overlay = document.getElementById("aurixOffOverlay");

    if (overlay) {
      overlay.focus();
    }
  }

  async function powerOn(restart) {
    if (isPowerOn()) {
      return;
    }

    savePower(true);

    var state = getAppState();

    if (state) {
      state.powerOn = true;

      if (typeof saveAppState === "function") {
        saveAppState();
      }
    }

    updatePowerUI();

    playPowerSound(restart ? "restart" : "on");
    flashScreen();

    if (window.AurixTTS && !window.AurixTTS.initialized) {
      await window.AurixTTS.init();
    }

    if (window.AurixTTS) {
      await window.AurixTTS.speakRichText(
        restart ? "Reiniciando coach de inglés." : "Encendiendo coach de inglés.",
        "narrator"
      );

      var nickname = state && state.nickname ? state.nickname : "Amigo";

      await window.AurixTTS.speakRichText(
        enQuoteSafe("Hello, " + nickname + "."),
        "aurix"
      );

      var lastInteraction =
        state && state.lastInteraction
          ? state.lastInteraction
          : "Sin interacción previa.";

      await window.AurixTTS.speakRichText(
        "Tu última interacción fue: " + lastInteraction + ". " +
        enQuoteSafe("Ready to continue?"),
        "narrator"
      );
    }

    var powerBtn = document.getElementById("aurixPowerBtn");

    if (powerBtn) {
      powerBtn.focus();
    }

    if (typeof startSplashSequence === "function") {
      startSplashSequence();
    }

    aurixMenuFeedback(restart ? "AURIX reiniciado" : "AURIX encendido");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectPowerUI);
  } else {
    injectPowerUI();
  }
})();

/* ============================================
   AURIX FREE CHAT BUTTON (teclingo-chat)
============================================ */

(function () {
  var chatBtn = null;
  var introProtocolActive = true;

  function injectChatButton() {
    if (chatBtn) {
      return;
    }

    var btn = document.createElement("button");
    btn.id = "aurixChatBtn";
    btn.type = "button";
    btn.className = "aurix-chat-btn";
    btn.setAttribute("aria-label", "Abrir Conversación Libre");
    btn.title = "Conversación Libre";

    btn.innerHTML =
      '<span class="aurix-chat-icon">💬</span>' +
      '<span class="aurix-chat-text">Chat Libre</span>';

    btn.addEventListener("click", function () {
      window.open("https://teclingo-chat.vercel.app/", "_blank");
    });

    chatBtn = btn;
    document.body.appendChild(btn);
  }

  function removeChatButton() {
    if (chatBtn) {
      chatBtn.remove();
      chatBtn = null;
    }
  }

  window.syncChatButton = function () {
    if (
      !introProtocolActive &&
      typeof appState !== "undefined" &&
      appState &&
      appState.onboardingCompleted
    ) {
      injectChatButton();
    } else {
      removeChatButton();
    }
  };

  window.setIntroProtocolActive = function (active) {
    introProtocolActive = active;
    window.syncChatButton();
  };

  window.syncChatButton();
})();

/* ============================================
   EXTENDED FIRST CONVERSATION LOGIC
============================================ */

function mpEnQuote(text) {
  return '**"' + text + '"**';
}

async function mpSpeak(text, role) {
  if (window.AurixTTS) {
    return window.AurixTTS.speakRichText(text, role || "narrator");
  }
}

function mpGetProfile() {
  if (!appState.profile) {
    appState.profile = {};
  }

  return appState.profile;
}

function mpSaveState() {
  if (typeof saveAppState === "function") {
    saveAppState();
  }
}

function mpSanitize(text, max) {
  return String(text || "")
    .replace(/[<>\"'*]/g, "")
    .trim()
    .slice(0, max || 80);
}

function mpEnsureSentence(text) {
  var t = String(text || "").trim();

  if (!t) {
    return "";
  }

  return /[.!?]$/.test(t) ? t : t + ".";
}

function mpNormalizeOccupation(text) {
  var t = mpSanitize(text, 100);

  if (!t) {
    return "";
  }

  if (!/^i\s/i.test(t) && !/^i'/i.test(t) && !/^my\s/i.test(t)) {
    t = "I " + t;
  }

  return mpEnsureSentence(t);
}

function mpNormalizeLike(text) {
  var t = mpSanitize(text, 100);

  if (!t) {
    return "";
  }

  if (/^i like/i.test(t)) {
    return mpEnsureSentence(t);
  }

  if (/^like/i.test(t)) {
    return mpEnsureSentence("I " + t);
  }

  return mpEnsureSentence("I like " + t);
}

function mpBuildFullIntro() {
  var p = mpGetProfile();

  var name = p.name || appState.nickname || "friend";

  var parts = [
    "Hello.",
    "My name is " + name + "."
  ];

  if (p.age) {
    parts.push("I am " + p.age + " years old.");
  }

  if (p.from) {
    parts.push("I am from " + p.from + ".");
  }

  if (p.occupationPhrase) {
    parts.push(mpEnsureSentence(p.occupationPhrase));
  }

  if (p.likePhrase) {
    parts.push(mpEnsureSentence(p.likePhrase));
  }

  parts.push("Nice to meet you.");

  return parts.join(" ");
}

function mpBuildFullIntroEs() {
  var p = mpGetProfile();
  var name = p.name || appState.nickname || "amigo";

  var parts = [
    "Hola.",
    "Me llamo " + name + "."
  ];

  if (p.age) {
    parts.push("Tengo " + p.age + " años.");
  }

  if (p.from) {
    parts.push("Soy de " + p.from + ".");
  }

  if (p.occupationPhrase) {
    var occ = p.occupationPhrase.toLowerCase();
    if (occ.indexOf("work and study") > -1) parts.push("Trabajo y estudio.");
    else if (occ.indexOf("looking for a job") > -1) parts.push("Busco trabajo.");
    else if (occ.indexOf("study") > -1) parts.push("Estudio.");
    else if (occ.indexOf("work") > -1) parts.push("Trabajo.");
    else parts.push(mpEnsureSentence(p.occupationPhrase));
  }

  if (p.likeThing) {
    parts.push("Me gusta " + p.likeThing + ".");
  }

  parts.push("Mucho gusto.");

  return parts.join(" ");
}

function renderMissionPractice(container) {
  renderMissionProfileName(container);
}

function renderMissionProfileName(container) {
  var profile = mpGetProfile();
  var name = appState.nickname || profile.name || "";

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">¿Cómo te llamamos?</h2>' +
      '<p class="ob-sub">Vamos a presentarte en inglés.</p>' +
      '<p class="ob-sub">Puedes decir: ' + displayEn("My name is " + (name || "Alex") + ".") + ' (Me llamo ' + (name || "Alex") + '.)</p>' +
      '<input id="mpNameInput" class="ob-input" type="text" maxlength="24" placeholder="Tu nombre o nickname" value="' + (name || "") + '" />' +
      '<div class="ob-actions">' +
        '<button id="mpNameNext" class="btn">Continuar</button>' +
      '</div>' +
    '</div>';

  var input = document.getElementById("mpNameInput");
  var nextBtn = document.getElementById("mpNameNext");

  function updateButton() {
    nextBtn.disabled = input.value.trim().length < 2;
  }

  input.addEventListener("input", updateButton);
  updateButton();

  nextBtn.addEventListener("click", async function () {
    var finalName = mpSanitize(input.value, 24) || "Amigo";

    profile.name = finalName;
    appState.nickname = finalName;
    mpSaveState();

    nextBtn.disabled = true;

    await mpSpeak(
      "Perfecto. Puedes decir: " + mpEnQuote("My name is " + finalName + "."),
      "narrator"
    );

    renderMissionProfileAge(container);
  });

  mpSpeak(
    "¿Cómo quieres que te llame en inglés? Puedes decir: " +
    mpEnQuote("My name is " + (name || "Alex") + "."),
    "narrator"
  );
}

function renderMissionProfileAge(container) {
  var profile = mpGetProfile();
  var age = profile.age || "";
  var ages = [18, 20, 25, 30, 35, 40, 50, 60];

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">¿Cuántos años tienes?</h2>' +
      '<p class="ob-sub">En inglés puedes decir: ' + displayEn("I am 25 years old.") + ' (Tengo 25 años.)</p>' +
      '<div class="mp-grid">' +
        ages.map(function (item) {
          return '<button class="ob-chip mp-age-chip" data-age="' + item + '">' + item + ' años</button>';
        }).join("") +
      '</div>' +
      '<input id="mpAgeInput" class="ob-input mp-input" type="number" min="5" max="100" placeholder="O escribe tu edad" value="' + (age || "") + '" />' +
      '<div class="ob-actions">' +
        '<button id="mpAgeNext" class="btn" disabled>Continuar</button>' +
      '</div>' +
    '</div>';

  var input = document.getElementById("mpAgeInput");
  var nextBtn = document.getElementById("mpAgeNext");
  var chips = container.querySelectorAll(".mp-age-chip");

  function updateButton() {
    var value = Number(input.value);
    nextBtn.disabled = !(value >= 5 && value <= 100);
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (item) {
        item.classList.remove("selected");
      });

      chip.classList.add("selected");
      input.value = chip.dataset.age;
      updateButton();
    });
  });

  input.addEventListener("input", updateButton);
  updateButton();

  nextBtn.addEventListener("click", async function () {
    var ageValue = Number(input.value);

    profile.age = ageValue;
    mpSaveState();

    nextBtn.disabled = true;

    await mpSpeak(
      "Perfecto. Puedes decir: " + mpEnQuote("I am " + ageValue + " years old.") + ". Esto significa: tengo " + ageValue + " años.",
      "narrator"
    );

    renderMissionProfileFrom(container);
  });

  mpSpeak(
    "¿Cuántos años tienes? Puedes decir: " +
    mpEnQuote("I am " + (age || 25) + " years old.") +
    ". Esto significa: tengo " + (age || 25) + " años.",
    "narrator"
  );
}

function renderMissionProfileFrom(container) {
  var profile = mpGetProfile();
  var from = profile.from || "";
  var places = ["Mexico", "Colombia", "Spain", "Argentina", "United States", "Brazil", "Other"];

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">¿De dónde eres?</h2>' +
      '<p class="ob-sub">En inglés puedes decir: ' + displayEn("I am from Mexico.") + ' (Soy de México.)</p>' +
      '<div class="mp-grid">' +
        places.map(function (item) {
          return '<button class="ob-chip mp-from-chip" data-place="' + item + '">' + item + '</button>';
        }).join("") +
      '</div>' +
      '<input id="mpFromInput" class="ob-input mp-input" type="text" maxlength="60" placeholder="Escribe tu ciudad o país" value="' + from + '" />' +
      '<div class="ob-actions">' +
        '<button id="mpFromNext" class="btn" disabled>Continuar</button>' +
      '</div>' +
    '</div>';

  var input = document.getElementById("mpFromInput");
  var nextBtn = document.getElementById("mpFromNext");
  var chips = container.querySelectorAll(".mp-from-chip");

  function updateButton() {
    nextBtn.disabled = input.value.trim().length < 2;
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (item) {
        item.classList.remove("selected");
      });

      chip.classList.add("selected");
      input.value = chip.dataset.place;
      updateButton();
    });
  });

  input.addEventListener("input", updateButton);
  updateButton();

  nextBtn.addEventListener("click", async function () {
    var place = mpSanitize(input.value, 60);

    profile.from = place;
    mpSaveState();

    nextBtn.disabled = true;

    await mpSpeak(
      "Excelente. Puedes decir: " + mpEnQuote("I am from " + place + ".") + ". Esto significa: soy de " + place + ".",
      "narrator"
    );

    renderMissionProfileOccupation(container);
  });

  mpSpeak(
    "¿De dónde eres? Puedes decir: " + mpEnQuote("I am from Mexico.") + ". Esto significa: soy de México.",
    "narrator"
  );
}

function renderMissionProfileOccupation(container) {
  var profile = mpGetProfile();
  var occupation = profile.occupationPhrase || "";

  var jobs = [
    { label: "Trabajo", en: "I work" },
    { label: "Estudio", en: "I study" },
    { label: "Trabajo y estudio", en: "I work and study" },
    { label: "Buscando trabajo", en: "I am looking for a job" }
  ];

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">¿Qué haces?</h2>' +
      '<p class="ob-sub">En inglés puedes decir: ' + displayEn("I work.") + ' (Trabajo) o ' + displayEn("I study.") + ' (Estudio)</p>' +
      '<div class="mp-grid">' +
        jobs.map(function (job) {
          return '<button class="ob-chip mp-job-chip" data-en="' + job.en + '">' + job.label + '<small>' + job.en + '.</small></button>';
        }).join("") +
      '</div>' +
      '<input id="mpJobInput" class="ob-input mp-input" type="text" maxlength="100" placeholder="Ej: I work as a teacher" value="' + occupation + '" />' +
      '<div class="ob-actions">' +
        '<button id="mpJobNext" class="btn" disabled>Continuar</button>' +
      '</div>' +
    '</div>';

  var input = document.getElementById("mpJobInput");
  var nextBtn = document.getElementById("mpJobNext");
  var chips = container.querySelectorAll(".mp-job-chip");

  function updateButton() {
    nextBtn.disabled = input.value.trim().length < 2;
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (item) {
        item.classList.remove("selected");
      });

      chip.classList.add("selected");
      input.value = chip.dataset.en;
      updateButton();
    });
  });

  input.addEventListener("input", updateButton);
  updateButton();

  nextBtn.addEventListener("click", async function () {
    var phrase = mpNormalizeOccupation(input.value);

    profile.occupationPhrase = phrase;
    mpSaveState();

    nextBtn.disabled = true;

    await mpSpeak(
      "Muy bien. Puedes decir: " + mpEnQuote(phrase),
      "narrator"
    );

    renderMissionProfileLikes(container);
  });

  mpSpeak(
    "¿Qué haces? Puedes decir: " +
    mpEnQuote("I work.") + ", yo trabajo, " +
    "o " +
    mpEnQuote("I study.") + ", yo estudio.",
    "narrator"
  );
}

function renderMissionProfileLikes(container) {
  var profile = mpGetProfile();
  var likeThing = profile.likeThing || "";

  var likes = [
    { en: "music", es: "Música" },
    { en: "travel", es: "Viajar" },
    { en: "food", es: "Comida" },
    { en: "sports", es: "Deportes" },
    { en: "movies", es: "Películas" },
    { en: "technology", es: "Tecnología" },
    { en: "learning English", es: "Aprender inglés" }
  ];

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">¿Qué te gusta?</h2>' +
      '<p class="ob-sub">En inglés puedes decir: ' + displayEn("I like music.") + ' (Me gusta la música.)</p>' +
      '<div class="mp-grid">' +
        likes.map(function (item) {
          return '<button class="ob-chip mp-like-chip" data-like="' + item.en + '">' + item.es + '<small>' + item.en + '</small></button>';
        }).join("") +
      '</div>' +
      '<input id="mpLikeInput" class="ob-input mp-input" type="text" maxlength="100" placeholder="Ej: music, travel, coffee" value="' + likeThing + '" />' +
      '<div class="ob-actions">' +
        '<button id="mpLikeNext" class="btn" disabled>Continuar</button>' +
      '</div>' +
    '</div>';

  var input = document.getElementById("mpLikeInput");
  var nextBtn = document.getElementById("mpLikeNext");
  var chips = container.querySelectorAll(".mp-like-chip");

  function updateButton() {
    nextBtn.disabled = input.value.trim().length < 2;
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (item) {
        item.classList.remove("selected");
      });

      chip.classList.add("selected");
      input.value = chip.dataset.like;
      updateButton();
    });
  });

  input.addEventListener("input", updateButton);
  updateButton();

  nextBtn.addEventListener("click", async function () {
    var raw = mpSanitize(input.value, 100);
    var phrase = mpNormalizeLike(raw);

    profile.likeThing = raw;
    profile.likePhrase = phrase;
    mpSaveState();

    nextBtn.disabled = true;

    await mpSpeak(
      "Muy bien. Puedes decir: " + mpEnQuote(phrase),
      "narrator"
    );

    renderMissionFinalIntro(container);
  });

  mpSpeak(
    "¿Qué te gusta? Puedes decir: " + mpEnQuote("I like music.") + ". Esto significa: me gusta la música.",
    "narrator"
  );
}

function renderMissionFinalIntro(container) {
  var fullIntro = mpBuildFullIntro();
  var fullIntroEs = mpBuildFullIntroEs();

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">Tu presentación completa</h2>' +
      '<p class="ob-sub">Escucha cómo quedó tu introducción en inglés.</p>' +
      '<div class="mp-final">' +
        displayEn(fullIntro) +
      '</div>' +
      '<div class="mp-final mp-final-es">' +
        escapeHtml(fullIntroEs) +
      '</div>' +
      '<div class="ob-actions">' +
        '<button id="mpListenFinal" class="ob-small-btn">Escuchar</button>' +
        '<button id="mpFinalNext" class="btn">Completar</button>' +
      '</div>' +
    '</div>';

  document.getElementById("mpListenFinal").addEventListener("click", function () {
    mpSpeak(mpEnQuote(fullIntro), "aurix");
  });

  document.getElementById("mpFinalNext").addEventListener("click", function () {
    renderMissionComplete(container);
  });

  mpSpeak(
    "Escucha tu presentación completa. " + mpEnQuote(fullIntro) + ". En español: " + fullIntroEs,
    "narrator"
  );
}

function renderMissionComplete(container) {
  var profile = mpGetProfile();

  appState.lastInteraction = "Primera conversación completa: presentación personal";
  appState.mission1Completed = true;
  mpSaveState();

  var summary = [
    ["Nombre", profile.name || appState.nickname || "Sin definir"],
    ["Edad", profile.age ? profile.age + " años" : "Sin definir"],
    ["Origen", profile.from || "Sin definir"],
    ["Actividad", profile.occupationPhrase || "Sin definir"],
    ["Gusto", profile.likePhrase || "Sin definir"]
  ];

  var phrases = [
    ["Hello.", "Hola."],
    ["My name is ...", "Me llamo ..."],
    ["I am ... years old.", "Tengo ... años."],
    ["I am from ...", "Soy de ..."],
    ["I work.", "Trabajo."],
    ["I study.", "Estudio."],
    ["I like ...", "Me gusta ..."],
    ["Nice to meet you.", "Mucho gusto."]
  ];

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">Primera conversación completada</h2>' +
      '<p class="ob-sub">Has aprendido a presentarte en inglés con información real sobre ti.</p>' +
      '<div class="mp-profile-summary">' +
        summary.map(function (item) {
          return (
            '<div class="mp-profile-item">' +
              '<div class="mp-profile-label">' + item[0] + '</div>' +
              '<div class="mp-profile-value">' + item[1] + '</div>' +
            '</div>'
          );
        }).join("") +
      '</div>' +
      '<div class="mp-phrase-list">' +
        phrases.map(function (pair) {
          return '<div class="mp-phrase">' + displayEn(pair[0]) + ' <span class="mp-phrase-es">(' + pair[1] + ')</span></div>';
        }).join("") +
      '</div>' +
      '<div class="ob-actions">' +
        '<button id="mpCompleteNext" class="btn">Ir al panel</button>' +
      '</div>' +
    '</div>';

  document.getElementById("mpCompleteNext").addEventListener("click", function () {
    renderMissionDashboard(container);
  });

  mpSpeak(
    "Primera conversación completada. Ahora puedes presentarte en inglés. " +
    mpEnQuote("Excellent work."),
    "narrator"
  );
}

function renderMissionDashboard(container) {
  var profile = mpGetProfile();

  var summary = [
    ["Nickname", appState.nickname || "Sin definir"],
    ["Meta", appState.goalLabel || "Sin definir"],
    ["Nivel", appState.level || "Sin definir"],
    ["Tiempo", appState.minutes ? appState.minutes + " minutos" : "Sin definir"],
    ["Ruta", appState.routeLabel || "Sin definir"],
    ["Nombre", profile.name || "Sin definir"],
    ["Edad", profile.age ? profile.age + " años" : "Sin definir"],
    ["Origen", profile.from || "Sin definir"],
    ["Actividad", profile.occupationPhrase || "Sin definir"],
    ["Gusto", profile.likePhrase || "Sin definir"],
    ["Última interacción", appState.lastInteraction || "Sin interacción"]
  ];

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">Panel provisional</h2>' +
      '<p class="ob-sub">Tu ADN y tu perfil de conversación están activos.</p>' +
      '<div class="ob-summary-grid">' +
        summary.map(function (item) {
          return (
            '<div class="ob-summary-item">' +
              '<div class="ob-summary-label">' + item[0] + '</div>' +
              '<div class="ob-summary-value">' + item[1] + '</div>' +
            '</div>'
          );
        }).join("") +
      '</div>' +
      '<div class="ob-actions">' +
        '<button id="mpRepeatMission" class="ob-small-btn">Repetir primera misión</button>' +
        '<button id="mpSessionsPanel" class="ob-small-btn primary">Panel de sesiones</button>' +
        '<button id="mpRestartApp" class="btn">Reiniciar experiencia</button>' +
      '</div>' +
    '</div>';

  document.getElementById("mpRepeatMission").addEventListener("click", function () {
    renderMissionIntro(container);
  });

  document.getElementById("mpSessionsPanel").addEventListener("click", function () {
    if (typeof renderSessionsPanel === "function") {
      renderSessionsPanel(container);
    }
  });

  document.getElementById("mpRestartApp").addEventListener("click", async function () {
    if (window.AurixTTS) {
      await window.AurixTTS.speakRichText("Reiniciando experiencia.", "narrator");
    }

    await wait(700);
    location.reload();
  });

  mpSpeak(
    "Panel actualizado. Tu perfil de conversación está guardado. " +
    mpEnQuote("Ready to continue?"),
    "narrator"
  );
}

/* ============================================
   AURIX MIC TOOLS LOGIC
============================================ */

(function () {
  if (window.aurixMicToolsInjected) {
    return;
  }

  window.aurixMicToolsInjected = true;

  var micStream = null;
  var audioCtx = null;
  var analyser = null;
  var micAnim = null;
  var recognition = null;
  var micRecording = false;

  function injectMicTools() {
    buildMicUI();
  }

  function buildMicUI() {
    if (document.getElementById("aurixMicFab")) {
      return;
    }

    var fab = document.createElement("button");
    fab.id = "aurixMicFab";
    fab.type = "button";
    fab.className = "aurix-mic-fab";
    fab.innerHTML =
      '<span class="mic-fab-icon">🎤</span>' +
      '<span class="mic-fab-label">Practicar</span>';

    document.body.appendChild(fab);

    fab.addEventListener("click", function () {
      openMicModal();
    });

    var modal = document.createElement("div");
    modal.id = "aurixMicModal";
    modal.className = "mic-modal hidden";

    modal.innerHTML =
      '<div class="mic-card">' +
        '<div class="badge">AURIX VOICE</div>' +
        '<h2 class="ob-title">Practicar pronunciación</h2>' +
        '<p class="ob-sub">Selecciona una frase, activa el micrófono y habla en inglés.</p>' +

        '<select id="micPhraseSelect" class="ob-input"></select>' +

        '<div class="mic-target" id="micTarget"></div>' +

        '<div class="mic-bars" id="micBars">' +
          '<div class="mic-bar"></div>' +
          '<div class="mic-bar"></div>' +
          '<div class="mic-bar"></div>' +
          '<div class="mic-bar"></div>' +
          '<div class="mic-bar"></div>' +
          '<div class="mic-bar"></div>' +
          '<div class="mic-bar"></div>' +
        '</div>' +

        '<div class="mic-status" id="micStatus">Listo.</div>' +
        '<div class="mic-transcript" id="micTranscript"></div>' +

        '<div class="mic-score-row">' +
          '<div class="mic-score-label">Acento aproximado</div>' +
          '<div class="mic-score-track">' +
            '<div id="micScoreFill" class="mic-score-fill"></div>' +
          '</div>' +
          '<div id="micScoreValue" class="mic-score-value">0%</div>' +
        '</div>' +

        '<div class="ob-actions">' +
          '<button id="micRecordBtn" class="btn">🎤 Grabar</button>' +
          '<button id="micStopBtn" class="ob-small-btn" disabled>Detener</button>' +
          '<button id="micCloseBtn" class="ob-small-btn">Cerrar</button>' +
        '</div>' +

        '<p class="mp-note">' +
          'La evaluación es aproximada y se basa en la transcripción del navegador. ' +
          'Para una evaluación real de acento se necesita un servicio avanzado de voz.' +
        '</p>' +
      '</div>';

    document.body.appendChild(modal);

    document.getElementById("micPhraseSelect").addEventListener("change", function () {
      updateMicTarget();
      resetMicResults();
      setMicStatus("Listo.");
    });

    document.getElementById("micRecordBtn").addEventListener("click", function () {
      startMic();
    });

    document.getElementById("micStopBtn").addEventListener("click", function () {
      stopMic(true);
    });

    document.getElementById("micCloseBtn").addEventListener("click", function () {
      closeMicModal();
    });

    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        closeMicModal();
      }
    });
  }

  function getVisibleEnglishPhrases() {
    var activeScreen = document.querySelector(".screen.active") || document.body;
    var nodes = activeScreen.querySelectorAll(".en-quote");
    var phrases = [];

    nodes.forEach(function (node) {
      var text = String(node.textContent || "")
        .replace(/^"|"$/g, "")
        .trim();

      if (text.length > 1 && phrases.indexOf(text) === -1) {
        phrases.push(text);
      }
    });

    return phrases;
  }

  function openMicModal(preselected) {
    if (micRecording) {
      stopMic(false);
    }

    var modal = document.getElementById("aurixMicModal");

    if (!modal) {
      return;
    }

    modal.classList.remove("hidden");

    populatePhraseSelect(preselected);
    resetMicResults();
    setMicStatus("Listo.");
  }

  function closeMicModal() {
    if (micRecording) {
      stopMic(false);
    }

    var modal = document.getElementById("aurixMicModal");

    if (modal) {
      modal.classList.add("hidden");
    }
  }

  function populatePhraseSelect(preselected) {
    var select = document.getElementById("micPhraseSelect");

    if (!select) {
      return;
    }

    var phrases = getVisibleEnglishPhrases();

    if (preselected) {
      preselected = String(preselected).trim();

      if (phrases.indexOf(preselected) === -1) {
        phrases.unshift(preselected);
      }
    }

    if (!phrases.length) {
      phrases = [
        "Hello.",
        "Nice to meet you.",
        "I am from Mexico."
      ];
    }

    select.innerHTML = "";

    phrases.forEach(function (phrase) {
      var option = document.createElement("option");
      option.value = phrase;
      option.textContent = phrase;
      select.appendChild(option);
    });

    if (preselected && phrases.indexOf(preselected) >= 0) {
      select.value = preselected;
    } else {
      select.selectedIndex = 0;
    }

    updateMicTarget();
  }

  function updateMicTarget() {
    var select = document.getElementById("micPhraseSelect");
    var target = document.getElementById("micTarget");

    if (!select || !target) {
      return;
    }

    var phrase = select.value || "";

    target.dataset.text = phrase;
    target.innerHTML = '<strong class="en-quote">"' + phrase + '"</strong>';
  }

  function currentTargetText() {
    var target = document.getElementById("micTarget");

    if (!target) {
      return "";
    }

    return target.dataset.text || target.textContent || "";
  }

  function setMicStatus(text) {
    var status = document.getElementById("micStatus");

    if (status) {
      status.textContent = text;
    }
  }

  function resetMicResults() {
    var transcript = document.getElementById("micTranscript");

    if (transcript) {
      transcript.textContent = "";
    }

    setScore(0);
  }

  function setScore(score) {
    var fill = document.getElementById("micScoreFill");
    var value = document.getElementById("micScoreValue");

    if (fill) {
      fill.style.width = score + "%";
    }

    if (value) {
      value.textContent = score + "%";
    }
  }

  async function startMic() {
    if (micRecording) {
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicStatus("Este navegador no permite acceder al micrófono.");
      return;
    }

    resetMicResults();

    var recordBtn = document.getElementById("micRecordBtn");
    var stopBtn = document.getElementById("micStopBtn");
    var transcript = document.getElementById("micTranscript");

    micRecording = true;

    if (recordBtn) recordBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
    if (transcript) transcript.textContent = "Escuchando...";

    startRecognition();

    setMicStatus("Escuchando... habla en inglés.");

    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      var AudioContextClass = window.AudioContext || window.webkitAudioContext;

      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        var source = audioCtx.createMediaStreamSource(micStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        animateBars();
      }
    } catch (error) {
      setMicStatus("No se pudo acceder al micrófono. Revisa los permisos del navegador.");
    }
  }

  function startRecognition() {
    var SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setMicStatus("Micrófono activo, pero la transcripción no está disponible en este navegador.");
      return;
    }

    try {
      if (recognition) {
        try {
          recognition.abort();
        } catch (error) {
          // Ignorar.
        }
      }

      recognition = new SpeechRecognitionClass();

      var isAndroid = /Android/i.test(navigator.userAgent || "");

      recognition.lang = "en-US";
      recognition.interimResults = !isAndroid;
      recognition.continuous = !isAndroid;
      recognition.maxAlternatives = 1;

      recognition.onresult = function (event) {
        var finalText = "";
        var interimText = "";

        for (var i = 0; i < event.results.length; i++) {
          var result = event.results[i];

          if (result.isFinal) {
            finalText += result[0].transcript + " ";
          } else {
            interimText += result[0].transcript + " ";
          }
        }

        var transcript = document.getElementById("micTranscript");

        if (transcript) {
          transcript.textContent = (finalText + interimText).trim() || "Escuchando...";
        }
      };

      recognition.onerror = function (event) {
        if (event.error === "not-allowed") {
          setMicStatus("Permiso de micrófono denegado.");
          stopMic(false);
        } else if (event.error !== "aborted") {
          setMicStatus("Error de reconocimiento: " + event.error);
        }
      };

      recognition.onend = function () {
        if (micRecording) {
          try {
            recognition.start();
          } catch (error) {
            // Ignorar.
          }
        }
      };

      recognition.start();
    } catch (error) {
      setMicStatus("No se pudo iniciar la transcripción.");
    }
  }

  function stopMic(shouldScore) {
    if (typeof shouldScore === "undefined") {
      shouldScore = true;
    }

    if (!micRecording) {
      return;
    }

    micRecording = false;

    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {
        // Ignorar.
      }
    }

    if (micStream) {
      micStream.getTracks().forEach(function (track) {
        track.stop();
      });

      micStream = null;
    }

    if (micAnim) {
      cancelAnimationFrame(micAnim);
      micAnim = null;
    }

    if (audioCtx) {
      try {
        audioCtx.close();
      } catch (error) {
        // Ignorar.
      }

      audioCtx = null;
      analyser = null;
    }

    if (window.aurixReleaseAudioInputs) {
      window.aurixReleaseAudioInputs();
    }

    resetBars();

    var recordBtn = document.getElementById("micRecordBtn");
    var stopBtn = document.getElementById("micStopBtn");

    if (recordBtn) recordBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;

    setMicStatus("Detenido.");

    if (shouldScore) {
      finishMicScore();
    }
  }

  function finishMicScore() {
    var target = currentTargetText();

    var transcriptEl = document.getElementById("micTranscript");
    var heard = transcriptEl ? transcriptEl.textContent.trim() : "";

    if (heard === "Escuchando...") {
      heard = "";
    }

    var score = scoreSpeech(target, heard);

    setScore(score);

    var feedback = "";

    if (!heard) {
      feedback = "No se detectó voz o transcripción. Intenta de nuevo.";
    } else if (score >= 85) {
      feedback = "Excelente. Muy buena similitud de pronunciación.";
    } else if (score >= 65) {
      feedback = "Bien. Sigue practicando para mejorar la precisión.";
    } else if (score >= 40) {
      feedback = "Vas mejorando. Repite la frase más despacio.";
    } else {
      feedback = "Intenta de nuevo escuchando primero la frase.";
    }

    setMicStatus(feedback);

    try {
      if (typeof appState !== "undefined") {
        if (!appState.speaking) {
          appState.speaking = {};
        }

        appState.speaking.lastPhrase = target;
        appState.speaking.lastScore = score;
        appState.speaking.attempts = (appState.speaking.attempts || 0) + 1;

        if (typeof saveAppState === "function") {
          saveAppState();
        }
      }
    } catch (error) {
      // Ignorar.
    }
  }

  function animateBars() {
    if (!analyser) {
      return;
    }

    var dataArray = new Uint8Array(analyser.frequencyBinCount);

    analyser.getByteFrequencyData(dataArray);

    var sum = 0;

    for (var i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }

    var avg = sum / dataArray.length;

    var bars = document.querySelectorAll("#micBars .mic-bar");

    bars.forEach(function (bar, index) {
      var height = Math.max(8, Math.min(100, avg * (1 + index * 0.08) * 2.2));
      bar.style.height = height + "%";
    });

    micAnim = requestAnimationFrame(animateBars);
  }

  function resetBars() {
    var bars = document.querySelectorAll("#micBars .mic-bar");

    bars.forEach(function (bar) {
      bar.style.height = "8%";
    });
  }

  function normalizeText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^\w\s']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function levenshtein(a, b) {
    var matrix = [];

    for (var i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }

    for (var j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }

    for (var x = 1; x <= a.length; x++) {
      for (var y = 1; y <= b.length; y++) {
        if (a.charAt(x - 1) === b.charAt(y - 1)) {
          matrix[x][y] = matrix[x - 1][y - 1];
        } else {
          matrix[x][y] = Math.min(
            matrix[x - 1][y - 1] + 1,
            matrix[x][y - 1] + 1,
            matrix[x - 1][y] + 1
          );
        }
      }
    }

    return matrix[a.length][b.length];
  }

  function scoreSpeech(target, heard) {
    var cleanTarget = normalizeText(target);
    var cleanHeard = normalizeText(heard);

    if (!cleanTarget || !cleanHeard) {
      return 0;
    }

    var distance = levenshtein(cleanTarget, cleanHeard);
    var maxLen = Math.max(cleanTarget.length, cleanHeard.length);

    var levenshteinScore = Math.max(0, 100 - (distance / maxLen) * 100);

    var targetWords = cleanTarget.split(" ");
    var heardWords = cleanHeard.split(" ");

    var heardSet = {};

    heardWords.forEach(function (word) {
      heardSet[word] = true;
    });

    var matches = 0;

    targetWords.forEach(function (word) {
      if (heardSet[word]) {
        matches++;
      }
    });

    var wordScore = targetWords.length ? (matches / targetWords.length) * 100 : 0;

    return Math.round((levenshteinScore * 0.6) + (wordScore * 0.4));
  }

  window.aurixOpenMic = function (phrase) {
    injectMicTools();
    openMicModal(phrase);
  };

  window.renderMissionFinalIntro = function (container) {
    var fullIntro = "Hello. Nice to meet you.";

    if (typeof mpBuildFullIntro === "function") {
      try {
        fullIntro = mpBuildFullIntro();
      } catch (error) {
        fullIntro = "Hello. Nice to meet you.";
      }
    }

    var displayFn = function (text) {
      return '<strong class="en-quote">"' + text + '"</strong>';
    };

    if (typeof displayEn === "function") {
      displayFn = displayEn;
    }

    var quoteFn = function (text) {
      return '**"' + text + '"**';
    };

    if (typeof mpEnQuote === "function") {
      quoteFn = mpEnQuote;
    }

    var speakFn = function (text, role) {
      if (window.AurixTTS) {
        window.AurixTTS.speakRichText(text, role || "narrator");
      }
    };

    if (typeof mpSpeak === "function") {
      speakFn = mpSpeak;
    }

    container.innerHTML =
      '<div class="card glass ob-card">' +
        '<div class="badge">AURIX OS</div>' +
        '<h2 class="ob-title">Tu presentación completa</h2>' +
        '<p class="ob-sub">Escucha cómo quedó tu introducción en inglés y luego practica con el micrófono.</p>' +
        '<div class="mp-final">' + displayFn(fullIntro) + '</div>' +
        '<div class="ob-actions">' +
          '<button id="mpListenFinal" class="ob-small-btn">Escuchar</button>' +
          '<button id="mpMicIntro" class="btn">🎤 Practicar con micrófono</button>' +
          '<button id="mpFinalNext" class="btn">Completar</button>' +
        '</div>' +
        '<p class="mp-note">El micrófono muestra nivel de voz y una similitud aproximada de pronunciación.</p>' +
      '</div>';

    document.getElementById("mpListenFinal").addEventListener("click", function () {
      if (window.AurixTTS) {
        speakFn(quoteFn(fullIntro), "aurix");
      }
    });

    document.getElementById("mpMicIntro").addEventListener("click", function () {
      window.aurixOpenMic(fullIntro);
    });

    document.getElementById("mpFinalNext").addEventListener("click", function () {
      if (typeof renderMissionComplete === "function") {
        renderMissionComplete(container);
      }
    });

    speakFn("Escucha tu presentación completa. " + quoteFn(fullIntro), "narrator");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectMicTools);
  } else {
    injectMicTools();
  }
})();

/* ============================================
   PHRASE REPEAT + MIC AUTO TOOLS
============================================ */

(function () {
  if (window.aurixPhraseToolsInjected) {
    return;
  }

  window.aurixPhraseToolsInjected = true;

  var scanTimer = null;

  function cleanPhrase(text) {
    return String(text || "")
      .replace(/^"|"$/g, "")
      .trim();
  }

  function shouldSkip(el) {
    if (!el || !el.closest) {
      return true;
    }

    return el.closest(
      "#aurix-tts-ui, " +
      ".aurix-subtitle, " +
      ".aurix-subtitle-text, " +
      ".mic-modal, " +
      ".mic-target, " +
      ".mp-final, " +
      ".rod-channel, " +
      ".s4-rule, " +
      ".n0-table, " +
      ".n0-row, " +
      "button, " +
      ".ob-actions, " +
      ".ob-chip, " +
      ".option-chip, " +
      ".ss-card, " +
      ".mp-profile-item, " +
      ".mp-summary, " +
      ".se-options, " +
      ".aurix-off-overlay"
    );
  }

  function attachPhraseControls(el) {
    if (!el || el.dataset.phraseControlsAttached) {
      return;
    }

    if (shouldSkip(el)) {
      return;
    }

    var text = cleanPhrase(el.textContent);

    if (!text || text.length < 2) {
      return;
    }

    el.dataset.phraseControlsAttached = "1";

    var tools = document.createElement("span");
    tools.className = "phrase-tools";

    tools.innerHTML =
      '<button type="button" class="phrase-btn phrase-repeat" aria-label="Repetir frase">🔊 Repetir</button>' +
      '<button type="button" class="phrase-btn phrase-mic" aria-label="Practicar con micrófono">🎤</button>' +
      '<span class="phrase-count" aria-hidden="true">0</span>';

    el.insertAdjacentElement("afterend", tools);

    var repeatBtn = tools.querySelector(".phrase-repeat");
    var micBtn = tools.querySelector(".phrase-mic");
    var countEl = tools.querySelector(".phrase-count");

    var count = 0;

    repeatBtn.addEventListener("click", function () {
      count++;
      countEl.textContent = String(count);

      if (window.AurixTTS) {
        var safeText = text.replace(/"/g, "");
        window.AurixTTS.speakRichText('**"' + safeText + '"**', "aurix");
      }
    });

    micBtn.addEventListener("click", function () {
      if (typeof window.aurixOpenMic === "function") {
        window.aurixOpenMic(text);
      } else if (window.AurixTTS) {
        var safeText = text.replace(/"/g, "");
        window.AurixTTS.speakRichText('**"' + safeText + '"**', "aurix");
      }
    });
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) {
      return;
    }

    if (root.classList && root.classList.contains("en-quote")) {
      attachPhraseControls(root);
    }

    var nodes = root.querySelectorAll(".en-quote");

    nodes.forEach(function (node) {
      attachPhraseControls(node);
    });
  }

  function scheduleScan() {
    if (scanTimer) {
      clearTimeout(scanTimer);
    }

    scanTimer = setTimeout(function () {
      scan(document.body);
    }, 120);
  }

  function init() {
    scan(document.body);

    var observer = new MutationObserver(function () {
      scheduleScan();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* ============================================
   SESION 3: FILTRO MAESTRO R.O.D. (LOGICA)
============================================ */

function ssSession3Done() {
  var sessions = ssGetSessions();
  return Boolean(sessions.session3Completed);
}

// Sobrescribimos el Panel de Sesiones para desbloquear la Sesion 3
function renderSessionsPanel(container) {
  var s1 = ssSession1Done();
  var s2 = ssSession2Done();
  var s3 = ssSession3Done();

  var completedCount = 0;
  if (s1) completedCount++;
  if (s2) completedCount++;
  if (s3) completedCount++;

  var progress = Math.round((completedCount / 4) * 100);

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">Panel de sesiones</h2>' +
      '<p class="ob-sub">Tu progreso en el método gramatical puro.</p>' +
      '<div class="ss-progress-track"><div class="ss-progress-fill" style="width:' + progress + '%"></div></div>' +
      '<p class="ss-status">Progreso: ' + completedCount + '/4 sesiones</p>' +
      '<div class="ss-grid">' +
        '<div class="ss-card ' + (s1 ? "completed" : "available") + '">' +
          '<span class="ss-badge ' + (s1 ? "done" : "next") + '">Sesión 1</span>' +
          '<div class="ss-title">Primera conversación</div>' +
          '<div class="ss-status">' + (s1 ? "Completada" : "Disponible") + '</div>' +
        '</div>' +
        '<div class="ss-card ' + (s2 ? "completed" : (s1 ? "available" : "locked")) + '">' +
          '<span class="ss-badge ' + (s2 ? "done" : (s1 ? "next" : "locked")) + '">Sesión 2</span>' +
          '<div class="ss-title">Nivel 0: Singular, Plural y Pronombres</div>' +
          '<div class="ss-status">' + (s2 ? "Completada" : (s1 ? "Disponible" : "Bloqueada")) + '</div>' +
        '</div>' +
        '<div class="ss-card ' + (s3 ? "completed" : (s2 ? "available" : "locked")) + '">' +
          '<span class="ss-badge ' + (s3 ? "done" : (s2 ? "next" : "locked")) + '">Sesión 3</span>' +
          '<div class="ss-title">Filtro Maestro R.O.D.</div>' +
          '<div class="ss-sub">Pronombres y Verbo To Be.</div>' +
          '<div class="ss-status">' + (s3 ? "Completada" : (s2 ? "Disponible" : "Bloqueada")) + '</div>' +
        '</div>' +
        '<div class="ss-card locked">' +
          '<span class="ss-badge locked">Sesión 4</span>' +
          '<div class="ss-title">Presente Simple vs Continuo</div>' +
          '<div class="ss-status">Próximamente</div>' +
        '</div>' +
      '</div>' +
      '<div class="ss-actions">' +
        '<button id="ssSession1Btn" class="ob-small-btn">' + (s1 ? "Repetir S1" : "Iniciar S1") + '</button>' +
        '<button id="ssSession2Btn" class="ob-small-btn" ' + (s1 ? "" : "disabled") + '>' + (s2 ? "Repetir S2" : "Iniciar S2") + '</button>' +
        '<button id="ssSession3Btn" class="btn" ' + (s2 ? "" : "disabled") + '>' + (s3 ? "Repetir S3" : "Continuar: Filtro R.O.D.") + '</button>' +
      '</div>' +
    '</div>';

  document.getElementById("ssSession1Btn").onclick = function() { renderMissionProfileName(container); };
  document.getElementById("ssSession2Btn").onclick = function() { if(s1) renderSession2Intro(container); };
  document.getElementById("ssSession3Btn").onclick = function() { if(s2) renderSession3Intro(container); };
  
  ssSpeak("Panel de sesiones. Progreso actual: " + completedCount + " de 4.", "narrator");
}

function renderSession3Intro(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">SESIÓN 3</div>' +
      '<h2 class="ob-title">El Filtro Maestro R.O.D.</h2>' +
      '<p class="ob-sub">En inglés, no memorizamos combinaciones al azar. Filtramos el sujeto por su persona gramatical para encontrar el verbo exacto.</p>' +
      '<p class="ob-sub">Cero conversación de relleno. Solo gramática pura y estructural.</p>' +
      '<div class="ob-actions"><button id="s3Start" class="btn">Iniciar Filtro</button></div>' +
    '</div>';
  
  document.getElementById("s3Start").onclick = function() { renderSession3Theory(container); };
  ssSpeak("Sesión tres. El Filtro Maestro R.O.D. En inglés no memorizamos combinaciones al azar. Filtramos el sujeto por su persona gramatical.", "narrator");
}

function renderSession3Theory(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">TEORÍA GRAMATICAL</div>' +
      '<h2 class="ob-title">Los 3 Canales</h2>' +
      '<div class="rod-channels">' +
        '<div class="rod-channel c1">' +
          '<div class="rod-channel-title">1ra Persona</div>' +
          '<div class="rod-channel-pronouns">' + ssDisplayEn("I") + '</div>' +
          '<div class="rod-channel-verb">' + ssDisplayEn("AM") + '</div>' +
          '<div class="n0-block-es">Yo (soy / estoy)</div>' +
        '</div>' +
        '<div class="rod-channel c2">' +
          '<div class="rod-channel-title">2das Personas</div>' +
          '<div class="rod-channel-pronouns">' + ssDisplayEn("You, We, They") + '</div>' +
          '<div class="rod-channel-verb">' + ssDisplayEn("ARE") + '</div>' +
          '<div class="n0-block-es">Tú/ustedes · Nosotros · Ellos (son / están)</div>' +
        '</div>' +
        '<div class="rod-channel c3">' +
          '<div class="rod-channel-title">3ras Personas</div>' +
          '<div class="rod-channel-pronouns">' + ssDisplayEn("He, She, It") + '</div>' +
          '<div class="rod-channel-verb">' + ssDisplayEn("IS") + '</div>' +
          '<div class="n0-block-es">Él · Ella · Eso (es / está)</div>' +
        '</div>' +
      '</div>' +
      '<p class="ob-sub">Regla de Oro: El verbo cambia según el canal. No hay excepciones en el presente simple.</p>' +
      '<div class="ob-actions"><button id="s3Next" class="btn">Practicar Filtro</button></div>' +
    '</div>';
    
  document.getElementById("s3Next").onclick = function() { renderSession3Exercise(container, 0, 0); };
  ssSpeak("Los tres canales. Primera persona: I, usa AM. Segundas personas: You, We, They, usan ARE. Terceras personas: He, She, It, usan IS.", "narrator");
}

var ROD_EXERCISES = [
  { pronoun: "I", es: "yo", correct: "AM" },
  { pronoun: "She", es: "ella", correct: "IS" },
  { pronoun: "They", es: "ellos/ellas", correct: "ARE" },
  { pronoun: "We", es: "nosotros", correct: "ARE" },
  { pronoun: "It", es: "eso", correct: "IS" },
  { pronoun: "You", es: "tú/ustedes", correct: "ARE" },
  { pronoun: "He", es: "él", correct: "IS" }
];

function renderSession3Exercise(container, index, score) {
  if (index >= ROD_EXERCISES.length) {
    renderSession3Table(container, score);
    return;
  }
  var ex = ROD_EXERCISES[index];
  
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">EJERCICIO</div>' +
      '<h2 class="ob-title">Filtra el sujeto</h2>' +
      '<div class="se-progress">Sujeto ' + (index + 1) + ' de ' + ROD_EXERCISES.length + '</div>' +
      '<div class="rod-target">' + ssDisplayEn(ex.pronoun) + '</div>' +
      '<div class="n0-ex-es">' + escapeHtml(ex.es) + '</div>' +
      '<p class="ob-sub" style="text-align:center;">¿A qué canal pertenece?</p>' +
      '<div class="rod-options">' +
        '<button class="rod-option-btn" data-val="AM">' + ssDisplayEn("AM") + '</button>' +
        '<button class="rod-option-btn" data-val="ARE">' + ssDisplayEn("ARE") + '</button>' +
        '<button class="rod-option-btn" data-val="IS">' + ssDisplayEn("IS") + '</button>' +
      '</div>' +
      '<div id="s3Feedback" class="se-feedback"></div>' +
    '</div>';
    
  var btns = container.querySelectorAll(".rod-option-btn");
  btns.forEach(function(btn) {
    btn.onclick = async function() {
      btns.forEach(function(b) { b.disabled = true; });
      var val = btn.dataset.val;
      var isCorrect = val === ex.correct;
      if (isCorrect) {
        btn.classList.add("correct");
        score++;
      } else {
        btn.classList.add("wrong");
        btns.forEach(function(b) { if(b.dataset.val === ex.correct) b.classList.add("correct"); });
      }
      
      var msg = (isCorrect ? "Correcto. " : "Incorrecto. ") + ex.pronoun + " (" + ex.es + ") usa " + ex.correct + ".";
      document.getElementById("s3Feedback").textContent = msg;
      await ssSpeak((isCorrect ? "Correcto. " : "Casi. ") + ssEnQuote(ex.pronoun) + ", " + ex.es + ", usa " + ssEnQuote(ex.correct), "narrator");
      
      setTimeout(function() {
        renderSession3Exercise(container, index + 1, score);
      }, 1800);
    };
  });
  
  ssSpeak("Filtra el sujeto. " + ssEnQuote(ex.pronoun), "narrator");
}

function renderSession3Table(container, score) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">TABLA GRAMATICAL</div>' +
      '<h2 class="ob-title">Consolidación: Ser y Estar</h2>' +
      '<p class="ob-sub">En inglés, el verbo To Be unifica Ser y Estar. La traducción depende del contexto, pero la estructura es inmutable.</p>' +
      '<div class="mp-profile-summary">' +
        '<div class="mp-profile-item"><div class="mp-profile-label">1ra Persona</div><div class="mp-profile-value">' + ssDisplayEn("I AM") + ' (Yo soy / estoy)</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">2das Personas</div><div class="mp-profile-value">' + ssDisplayEn("YOU/WE/THEY ARE") + ' (tú eres / nosotros somos / ellos son · están)</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">3ras Personas</div><div class="mp-profile-value">' + ssDisplayEn("HE/SHE/IT IS") + ' (él es / ella es / eso es · está)</div></div>' +
      '</div>' +
      '<div class="ob-actions"><button id="s3Finish" class="btn">Completar Sesión 3</button></div>' +
    '</div>';
    
  document.getElementById("s3Finish").onclick = function() { renderSession3Complete(container, score); };
  ssSpeak("Consolidación. El verbo To Be unifica Ser y Estar. Primera persona: I AM. Segundas: ARE. Terceras: IS.", "narrator");
}

function renderSession3Complete(container, score) {
  var sessions = ssGetSessions();
  sessions.session3Completed = true;
  sessions.session3Score = score;
  appState.lastInteraction = "Sesión 3: Filtro Maestro R.O.D.";
  ssSave();
  
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">SESIÓN 3</div>' +
      '<h2 class="ob-title">Filtro R.O.D. Dominado</h2>' +
      '<p class="ob-sub">Has internalizado la estructura base del verbo To Be sin memorizar listas aisladas.</p>' +
      '<div class="mp-profile-summary">' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Puntaje</div><div class="mp-profile-value">' + score + '/' + ROD_EXERCISES.length + '</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Siguiente Paso</div><div class="mp-profile-value">Sesión 4: Presente Simple vs Continuo</div></div>' +
      '</div>' +
      '<div class="ob-actions">' +
        '<button id="s3Back" class="ob-small-btn">Volver al Panel</button>' +
      '</div>' +
    '</div>';
    
  document.getElementById("s3Back").onclick = function() { renderSessionsPanel(container); };
  ssSpeak("Sesión tres completada. Filtro R.O.D. dominado. " + ssEnQuote("Excellent work."), "narrator");
}

/* ============================================
   SESIONES: INFRAESTRUCTURA COMUN
============================================ */

function ssGetSessions() {
  if (!appState.sessions) {
    appState.sessions = {
      session1Completed: false,
      session2Completed: false,
      session2Score: 0,
      session3Completed: false,
      session3Score: 0
    };
  }

  return appState.sessions;
}

function ssSave() {
  if (typeof saveAppState === "function") {
    saveAppState();
  }
}

async function ssSpeak(text, role) {
  if (window.AurixTTS) {
    return window.AurixTTS.speakRichText(text, role || "narrator");
  }
}

function ssDisplayEn(text) {
  return '<strong class="en-quote">"' + escapeHtml(text) + '"</strong>';
}

function ssEnQuote(text) {
  return '**"' + text + '"**';
}

function ssSession1Done() {
  return Boolean(appState.mission1Completed);
}

function ssSession2Done() {
  var sessions = ssGetSessions();
  return Boolean(sessions.session2Completed);
}

/* ============================================
   SESION 2: NIVEL 0 (SINGULAR, PLURAL Y PRONOMBRES)
   Version estandar y no ambigua:
   - you puede ser singular o plural segun contexto
   - bloques visuales: I / YOU-WE-THEY / HE-SHE-IT
   - vocabulario solo autorizado
============================================ */

var S2_EXERCISES = [
  { word: "cat", es: "gato", correct: "singular" },
  { word: "cats", es: "gatos", correct: "plural" },
  { word: "book", es: "libro", correct: "singular" },
  { word: "books", es: "libros", correct: "plural" },
  { word: "box", es: "caja", correct: "singular" },
  { word: "boxes", es: "cajas", correct: "plural" },
  { word: "child", es: "niño", correct: "singular" },
  { word: "children", es: "niños", correct: "plural" }
];

var S2_PRONOUNS = [
  { es: "yo", en: "I", number: "singular" },
  { es: "tú", en: "you", number: "singular" },
  { es: "él", en: "he", number: "singular" },
  { es: "ella", en: "she", number: "singular" },
  { es: "eso", en: "it", number: "singular" },
  { es: "nosotros", en: "we", number: "plural" },
  { es: "ustedes", en: "you", number: "plural" },
  { es: "ellos", en: "they", number: "plural" },
  { es: "ellas", en: "they", number: "plural" }
];

function s2Norm(t) {
  return String(t || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderSession2Intro(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">SESIÓN 2</div>' +
      '<h2 class="ob-title">Nivel 0: Singular, Plural y Pronombres</h2>' +
      '<p class="ob-sub">Antes del verbo, el cimiento: saber si hablamos de una cosa o de muchas, y saber quién hace la acción.</p>' +
      '<p class="ob-sub">Cero relleno. Solo estructura.</p>' +
      '<div class="ob-actions"><button id="s2Start" class="btn">Iniciar Nivel 0</button></div>' +
    '</div>';

  document.getElementById("s2Start").onclick = function() { renderSession2Theory(container); };
  ssSpeak("Sesión dos. Nivel Cero. Singular, plural y pronombres personales. Antes del verbo, el cimiento: saber si hablamos de una cosa o de muchas, y saber quién hace la acción.", "narrator");
}

function renderSession2Theory(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">TEORÍA</div>' +
      '<h2 class="ob-title">Uno y más de uno</h2>' +
      '<div class="mp-profile-summary">' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Singular</div><div class="mp-profile-value">' + ssDisplayEn("one house") + ' (una casa)</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Plural</div><div class="mp-profile-value">' + ssDisplayEn("two houses") + ' (dos casas)</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Singular</div><div class="mp-profile-value">' + ssDisplayEn("one car") + ' (un carro)</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Plural</div><div class="mp-profile-value">' + ssDisplayEn("two cars") + ' (dos carros)</div></div>' +
      '</div>' +
      '<div class="s4-rule"><b>Singular</b> = uno. <b>Plural</b> = más de uno. La marca más común es <b>+ s / + es</b>.</div>' +
      '<div class="s4-rule">Hay irregulares como ' + ssDisplayEn("child") + ' (niño) → ' + ssDisplayEn("children") + ' (niños), que se memorizan como palabra nueva.</div>' +
      '<div class="ob-actions"><button id="s2Next" class="btn">Continuar</button></div>' +
    '</div>';

  document.getElementById("s2Next").onclick = function() { renderSession2Pronouns(container); };
  ssSpeak("Singular es uno. Plural es más de uno. Ejemplo: una casa, one house. Dos casas, two houses. Un carro, one car. Dos carros, two cars. La marca más común del plural es la letra S. Hay irregulares como child y children.", "narrator");
}

function renderSession2Pronouns(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">TEORÍA</div>' +
      '<h2 class="ob-title">Pronombres personales</h2>' +
      '<div class="mp-profile-summary">' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Yo</div><div class="mp-profile-value">' + ssDisplayEn("I") + '</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Tú / usted / ustedes</div><div class="mp-profile-value">' + ssDisplayEn("You") + '</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Él</div><div class="mp-profile-value">' + ssDisplayEn("He") + '</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Ella</div><div class="mp-profile-value">' + ssDisplayEn("She") + '</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Eso / cosa / animal</div><div class="mp-profile-value">' + ssDisplayEn("It") + '</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Nosotros</div><div class="mp-profile-value">' + ssDisplayEn("We") + '</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Ellos / ellas</div><div class="mp-profile-value">' + ssDisplayEn("They") + '</div></div>' +
      '</div>' +
      '<div class="s4-rule">En inglés <b>you</b> puede ser singular o plural según el contexto: tú, usted, ustedes o vosotros. No se enseña que "tú" sea plural.</div>' +
      '<div class="ob-actions"><button id="s2PronounsNext" class="btn">Continuar</button></div>' +
    '</div>';

  document.getElementById("s2PronounsNext").onclick = function() { renderSession2Blocks(container); };
  ssSpeak("Los pronombres personales. Yo, I. Tú, you. Él, he. Ella, she. Eso, it. Nosotros, we. Ustedes, you. Ellos, they. Recuerda: en inglés, you puede ser singular o plural según el contexto.", "narrator");
}

function renderSession2Blocks(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUES</div>' +
      '<h2 class="ob-title">Tres bloques, sin confusión</h2>' +
      '<div class="rod-channels">' +
        '<div class="rod-channel c1">' +
          '<div class="rod-channel-title">Bloque I</div>' +
          '<div class="rod-channel-pronouns">' + ssDisplayEn("I") + '</div>' +
          '<div class="n0-block-es">Yo</div>' +
        '</div>' +
        '<div class="rod-channel c2">' +
          '<div class="rod-channel-title">Bloque YOU-WE-THEY</div>' +
          '<div class="rod-channel-pronouns">' + ssDisplayEn("You, We, They") + '</div>' +
          '<div class="n0-block-es">Tú / usted / ustedes · Nosotros · Ellos</div>' +
        '</div>' +
        '<div class="rod-channel c3">' +
          '<div class="rod-channel-title">Bloque HE-SHE-IT</div>' +
          '<div class="rod-channel-pronouns">' + ssDisplayEn("He, She, It") + '</div>' +
          '<div class="n0-block-es">Él · Ella · Eso</div>' +
        '</div>' +
      '</div>' +
      '<div class="s4-rule">Usamos bloques para no mezclar formas. En la siguiente clase estos bloques nos ayudarán con el verbo <b>to be</b>.</div>' +
      '<div class="ob-actions"><button id="s2BlocksNext" class="btn">Practicar</button></div>' +
    '</div>';

  document.getElementById("s2BlocksNext").onclick = function() { renderSession2Exercise(container, 0, 0); };
  ssSpeak("Para evitar confusión, usaremos tres bloques. Bloque I: I. Bloque YOU-WE-THEY: you, we, they. Bloque HE-SHE-IT: he, she, it. Estos bloques nos preparan para el verbo to be.", "narrator");
}

function renderSession2Exercise(container, index, score) {
  if (index >= S2_EXERCISES.length) {
    renderSession2Table(container, score);
    return;
  }

  var ex = S2_EXERCISES[index];

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">EJERCICIO</div>' +
      '<h2 class="ob-title">¿Singular o plural?</h2>' +
      '<div class="se-progress">Palabra ' + (index + 1) + ' de ' + S2_EXERCISES.length + '</div>' +
      '<div class="rod-target">' + ssDisplayEn(ex.word) + '</div>' +
      '<div class="n0-ex-es">' + escapeHtml(ex.es) + '</div>' +
      '<p class="ob-sub" style="text-align:center;">¿Hablamos de una cosa o de muchas?</p>' +
      '<div class="se-options">' +
        '<button class="se-option-btn" data-val="singular">' + ssDisplayEn("Singular") + '</button>' +
        '<button class="se-option-btn" data-val="plural">' + ssDisplayEn("Plural") + '</button>' +
      '</div>' +
      '<div id="s2Feedback" class="se-feedback"></div>' +
    '</div>';

  var btns = container.querySelectorAll(".se-option-btn");
  btns.forEach(function(btn) {
    btn.onclick = async function() {
      btns.forEach(function(b) { b.disabled = true; });
      var val = btn.dataset.val;
      var isCorrect = val === ex.correct;
      if (isCorrect) {
        btn.classList.add("correct");
        score++;
      } else {
        btn.classList.add("wrong");
        btns.forEach(function(b) { if(b.dataset.val === ex.correct) b.classList.add("correct"); });
      }

      document.getElementById("s2Feedback").textContent =
        (isCorrect ? "Correcto. " : "Incorrecto. ") + '"' + ex.word + '" (' + ex.es + ') es ' + (ex.correct === "singular" ? "singular" : "plural") + ".";
      await ssSpeak((isCorrect ? "Correcto. " : "Casi. ") + ssEnQuote(ex.word) + ", " + ex.es + ", es " + ssEnQuote(ex.correct === "singular" ? "singular" : "plural"), "narrator");

      setTimeout(function() {
        renderSession2Exercise(container, index + 1, score);
      }, 1800);
    };
  });

  ssSpeak("¿Singular o plural? " + ssEnQuote(ex.word), "narrator");
}

function renderSession2Table(container, score) {
  var rows = "";

  S2_PRONOUNS.forEach(function (item, i) {
    rows +=
      '<div class="n0-row">' +
        '<div class="n0-es">' + escapeHtml(item.es) + '</div>' +
        '<input id="s2t_en_' + i + '" class="s4-input" type="text" placeholder="En inglés..." autocomplete="off" autocapitalize="off">' +
        '<select id="s2t_num_' + i + '" class="n0-select">' +
          '<option value="">—</option>' +
          '<option value="singular">Singular</option>' +
          '<option value="plural">Plural</option>' +
        '</select>' +
        '<div id="s2tf_' + i + '" class="s4-answer"></div>' +
      '</div>';
  });

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">CONSOLIDACIÓN</div>' +
      '<h2 class="ob-title">Completa la tabla</h2>' +
      '<p class="ob-sub">Escribe el pronombre en inglés y clasifica: singular o plural. Las respuestas no se muestran hasta que termines.</p>' +
      '<div class="n0-table">' +
        '<div class="n0-table-head"><span>Español</span><span>Inglés</span><span>Singular / Plural</span></div>' +
        rows +
      '</div>' +
      '<div id="s2TableScore" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="s2Check" class="btn">Revisar</button>' +
        '<button id="s2Finish" class="btn" disabled>Continuar</button>' +
      '</div>' +
    '</div>';

  document.getElementById("s2Check").onclick = function () {
    var tableScore = 0;

    S2_PRONOUNS.forEach(function (item, i) {
      var enInp = document.getElementById("s2t_en_" + i);
      var numSel = document.getElementById("s2t_num_" + i);
      var fb = document.getElementById("s2tf_" + i);

      var enOk = s2Norm(enInp.value) === s2Norm(item.en);
      var numOk = numSel.value === item.number;
      var ok = enOk && numOk;

      if (ok) tableScore++;

      enInp.classList.remove("ok", "bad");
      enInp.classList.add(enOk ? "ok" : "bad");

      numSel.classList.remove("ok", "bad");
      numSel.classList.add(numOk ? "ok" : "bad");

      fb.textContent = ok
        ? "Correcto."
        : "Correcto: " + item.en + " · " + item.number;
    });

    document.getElementById("s2TableScore").textContent =
      "Resultado: " + tableScore + "/" + S2_PRONOUNS.length;

    document.getElementById("s2Finish").disabled = false;
  };

  document.getElementById("s2Finish").onclick = function () {
    renderSession2Complete(container, score);
  };

  ssSpeak("Completa la tabla. Escribe cada pronombre en inglés y clasifícalo como singular o plural. Primero piensa la respuesta. Después revisa.", "narrator");
}

function renderSession2Complete(container, score) {
  var sessions = ssGetSessions();
  sessions.session2Completed = true;
  sessions.session2Score = score;
  appState.lastInteraction = "Sesión 2: Nivel 0 Singular/Plural/Pronombres";
  ssSave();

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">SESIÓN 2</div>' +
      '<h2 class="ob-title">Nivel 0 Dominado</h2>' +
      '<p class="ob-sub">Ya distingues una cosa de muchas y reconoces los pronombres en tres bloques: I / YOU-WE-THEY / HE-SHE-IT.</p>' +
      '<div class="mp-profile-summary">' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Singular/Plural</div><div class="mp-profile-value">' + score + '/' + S2_EXERCISES.length + '</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Siguiente Paso</div><div class="mp-profile-value">Sesión 3: Filtro R.O.D.</div></div>' +
      '</div>' +
      '<div class="ob-actions">' +
        '<button id="s2Back" class="ob-small-btn">Volver al Panel</button>' +
      '</div>' +
    '</div>';

  document.getElementById("s2Back").onclick = function() { renderSessionsPanel(container); };
  ssSpeak("Sesión dos completada. Nivel Cero dominado. " + ssEnQuote("Excellent work."), "narrator");
}

/* ============================================
   COLLAPSIBLE SECTIONS PATCH
============================================ */

(function () {
  if (window.aurixCollapseInjected) {
    return;
  }

  window.aurixCollapseInjected = true;

  var LABELS = {
    "mp-phrase-list": "Frases aprendidas",
    "mp-profile-summary": "Resumen de tu perfil",
    "ob-summary-grid": "Resumen del panel"
  };

  function addCollapse(section) {
    if (section.dataset.collapseReady) {
      return;
    }

    section.dataset.collapseReady = "1";

    var label = "Ver detalle";

    for (var key in LABELS) {
      if (section.classList.contains(key)) {
        label = LABELS[key];
        break;
      }
    }

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "collapse-toggle";
    btn.innerHTML =
      "<span>" + label + "</span>" +
      '<span class="collapse-arrow">▾</span>';

    section.parentNode.insertBefore(btn, section);

    var startOpen = window.innerWidth > 720;

    if (!startOpen) {
      section.classList.add("collapsed-section");
      btn.classList.add("collapsed");
    }

    btn.addEventListener("click", function () {
      var isCollapsed = section.classList.toggle("collapsed-section");
      btn.classList.toggle("collapsed", isCollapsed);
    });
  }

  function scan() {
    document
      .querySelectorAll(".mp-phrase-list, .mp-profile-summary, .ob-summary-grid")
      .forEach(addCollapse);
  }

  var timer = null;

  function schedule() {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(scan, 150);
  }

  function init() {
    scan();

    var observer = new MutationObserver(schedule);

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* ============================================
   SPEAKING RECORDS + PROGRESS PANEL
============================================ */

(function () {
  if (window.aurixRecordsInjected) {
    return;
  }

  window.aurixRecordsInjected = true;

  function getRecords() {
    if (typeof appState === "undefined") {
      return {};
    }

    if (!appState.speakingRecords) {
      appState.speakingRecords = {};
    }

    return appState.speakingRecords;
  }

  function saveRecords() {
    if (typeof saveAppState === "function") {
      saveAppState();
    }
  }

  function statusOf(best) {
    if (best >= 85) {
      return { label: "Dominada", cls: "mastered" };
    }

    if (best >= 60) {
      return { label: "En progreso", cls: "progress" };
    }

    if (best > 0) {
      return { label: "Iniciada", cls: "started" };
    }

    return { label: "Sin practicar", cls: "none" };
  }

  function showRecordToast(phrase, score) {
    var toast = document.getElementById("prRecordToast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "prRecordToast";
      toast.className = "pr-record-toast";
      document.body.appendChild(toast);
    }

    toast.textContent = '🏆 Nuevo récord: ' + score + '% en "' + phrase + '"';
    toast.classList.add("show");

    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      toast.classList.remove("show");
    }, 2600);
  }

  window.aurixUpdateRecord = function (phrase, score) {
    var records = getRecords();
    var r = records[phrase] || { attempts: 0, best: 0, last: 0, history: [] };

    r.attempts += 1;
    r.last = score;

    var isRecord = score > r.best;

    if (isRecord) {
      r.best = score;
    }

    r.history.push(score);

    if (r.history.length > 10) {
      r.history.shift();
    }

    records[phrase] = r;
    saveRecords();

    if (isRecord) {
      showRecordToast(phrase, score);
    }

    renderProgressPanel();

    return isRecord;
  };

  function injectProgressUI() {
    if (document.getElementById("aurixProgressFab")) {
      return;
    }

    var fab = document.createElement("button");
    fab.id = "aurixProgressFab";
    fab.type = "button";
    fab.className = "aurix-progress-fab";
    fab.innerHTML =
      "<span>📊</span>" +
      '<span class="pr-fab-label">Progreso</span>';
    document.body.appendChild(fab);

    var modal = document.createElement("div");
    modal.id = "aurixProgressModal";
    modal.className = "mic-modal hidden";
    modal.innerHTML =
      '<div class="mic-card">' +
        '<div class="badge">AURIX VOICE</div>' +
        '<h2 class="ob-title">Tu progreso de speaking</h2>' +
        '<p class="ob-sub">Resultados, intentos y récords por frase.</p>' +
        '<div class="pr-summary" id="prSummary"></div>' +
        '<div class="pr-list" id="prList"></div>' +
        '<div class="ob-actions">' +
          '<button id="prClose" class="btn">Cerrar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    fab.addEventListener("click", function () {
      renderProgressPanel();
      modal.classList.remove("hidden");
    });

    document.getElementById("prClose").addEventListener("click", function () {
      modal.classList.add("hidden");
    });

    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        modal.classList.add("hidden");
      }
    });
  }

  function renderProgressPanel() {
    var list = document.getElementById("prList");
    var summary = document.getElementById("prSummary");

    if (!list || !summary) {
      return;
    }

    var records = getRecords();
    var keys = Object.keys(records);

    var totalAttempts = 0;
    var bestSum = 0;
    var mastered = 0;

    keys.forEach(function (k) {
      totalAttempts += records[k].attempts;
      bestSum += records[k].best;

      if (records[k].best >= 85) {
        mastered++;
      }
    });

    var avg = keys.length ? Math.round(bestSum / keys.length) : 0;

    summary.innerHTML =
      '<div class="pr-summary-item">' +
        '<div class="pr-summary-value">' + totalAttempts + '</div>' +
        '<div class="pr-summary-label">Intentos</div>' +
      '</div>' +
      '<div class="pr-summary-item">' +
        '<div class="pr-summary-value">' + avg + '%</div>' +
        '<div class="pr-summary-label">Promedio récord</div>' +
      '</div>' +
      '<div class="pr-summary-item">' +
        '<div class="pr-summary-value">' + mastered + '/' + keys.length + '</div>' +
        '<div class="pr-summary-label">Dominadas</div>' +
      '</div>';

    if (!keys.length) {
      list.innerHTML =
        '<div class="pr-empty">Aún no hay prácticas registradas.<br>Usa el botón 🎤 en cualquier frase para grabar tu primer intento.</div>';
      return;
    }

    keys.sort(function (a, b) {
      return records[b].best - records[a].best;
    });

    list.innerHTML = keys.map(function (k) {
      var r = records[k];
      var st = statusOf(r.best);
      var gap = 100 - r.best;
      var tip = "";

      if (r.best >= 100) {
        tip = "¡Perfecto! Mantén el ritmo para conservar tu récord.";
      } else if (r.best >= 85) {
        tip = "¡Muy bien! Solo te falta " + gap + "% para la pronunciación perfecta.";
      } else if (r.best > 0) {
        tip = "Buen avance. Aún tienes " + gap + "% por mejorar: intenta hablar más despacio y con más claridad.";
      }

      return (
        '<div class="pr-row">' +
          '<div class="pr-top">' +
            '<span class="pr-phrase">"' + k + '"</span>' +
            '<span class="pr-status ' + st.cls + '">' + st.label + '</span>' +
          '</div>' +
          '<div class="pr-bar"><div class="pr-fill" style="width:' + r.best + '%"></div></div>' +
          '<div class="pr-stats">' +
            '<span>Intentos: ' + r.attempts + '</span>' +
            '<span class="pr-best">🏆 Récord: ' + r.best + '%</span>' +
            '<span>Último: ' + r.last + '%</span>' +
          '</div>' +
          (tip ? '<div class="pr-tip">' + tip + '</div>' : "") +
        '</div>'
      );
    }).join("");
  }

  window.renderProgressPanel = renderProgressPanel;

  window.aurixOpenProgress = function () {
    injectProgressUI();
    renderProgressPanel();
    document.getElementById("aurixProgressModal").classList.remove("hidden");
  };

  // Registra el resultado cuando el usuario presiona "Detener" en el micrófono
  document.addEventListener("click", function (e) {
    var t = e.target;

    if (t && (t.id === "micStopBtn" || (t.closest && t.closest("#micStopBtn")))) {
      setTimeout(function () {
        var valueEl = document.getElementById("micScoreValue");
        var targetEl = document.getElementById("micTarget");

        if (valueEl && targetEl) {
          var score = parseInt(valueEl.textContent, 10) || 0;
          var phrase = targetEl.dataset ? targetEl.dataset.text : "";

          if (!phrase) {
            phrase = targetEl.textContent || "";
          }

          phrase = String(phrase).replace(/^"|"$/g, "").trim();

          if (phrase) {
            window.aurixUpdateRecord(phrase, score);
          }
        }
      }, 700);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectProgressUI);
  } else {
    injectProgressUI();
  }
})();

/* ============================================
   COSMIC HUD: ORBE + GANCHO DE VOZ
============================================ */

(function () {
  if (window.aurixCosmicInjected) {
    return;
  }

  window.aurixCosmicInjected = true;

  function injectOrb() {
    if (document.getElementById("aurixOrb")) {
      return;
    }

    var orb = document.createElement("div");
    orb.id = "aurixOrb";
    orb.className = "aurix-orb";
    document.body.appendChild(orb);
  }

  function setSpeaking(on) {
    document.body.classList.toggle("aurix-speaking", on);
  }

  function idleCheck() {
    setTimeout(function () {
      var busy = ("speechSynthesis" in window) && speechSynthesis.speaking;

      if (!busy) {
        setSpeaking(false);
      }
    }, 250);
  }

  function hookTTS() {
    var tts = window.AurixTTS;

    if (!tts || tts._cosmicHooked) {
      return;
    }

    tts._cosmicHooked = true;

    ["speakSegment", "speakSegmentFixed"].forEach(function (name) {
      if (typeof tts[name] !== "function") {
        return;
      }

      var orig = tts[name].bind(tts);

      tts[name] = function () {
        setSpeaking(true);

        var result = orig.apply(tts, arguments);

        if (result && typeof result.then === "function") {
          result.then(idleCheck).catch(idleCheck);
        }

        return result;
      };
    });
  }

  function init() {
    injectOrb();
    hookTTS();

    var tries = 0;

    var timer = setInterval(function () {
      tries++;
      hookTTS();

      if (window.AurixTTS && window.AurixTTS._cosmicHooked) {
        clearInterval(timer);
      }

      if (tries > 20) {
        clearInterval(timer);
      }
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* ============================================
   MINI ORBE EN HEADERS + ORBE REACCIONA A TU VOZ
============================================ */

(function () {
  if (window.aurixMiniHeaderInjected) {
    return;
  }

  window.aurixMiniHeaderInjected = true;

  function addMiniHeader(card) {
    if (card.querySelector(".aurix-mini-header")) {
      return;
    }

    var header = document.createElement("div");
    header.className = "aurix-mini-header";
    header.innerHTML =
      '<span class="mini-orb"></span>' +
      '<span class="mini-name">AURIX</span>' +
      '<span class="mini-status">COACH</span>';

    card.insertBefore(header, card.firstChild);
  }

  function scanHeaders() {
    document.querySelectorAll(".card, .ob-card, .mic-card").forEach(addMiniHeader);
  }

  var headerTimer = null;

  function scheduleHeaders() {
    if (headerTimer) {
      clearTimeout(headerTimer);
    }

    headerTimer = setTimeout(scanHeaders, 150);
  }

  function initHeaders() {
    scanHeaders();

    var observer = new MutationObserver(scheduleHeaders);

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeaders);
  } else {
    initHeaders();
  }
})();

(function () {
  if (window.aurixMicOrbHooked) {
    return;
  }

  window.aurixMicOrbHooked = true;

  var stream = null;
  var audioCtx = null;
  var analyser = null;
  var raf = null;
  var data = null;

  function startListening() {
    stopListening();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
      stream = s;

      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();

      var source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      data = new Uint8Array(analyser.frequencyBinCount);

      document.body.classList.add("aurix-listening");

      loopEnergy();
    }).catch(function () {
      // Permiso denegado: no se activa el modo escucha.
    });
  }

  function loopEnergy() {
    if (!analyser) {
      return;
    }

    analyser.getByteFrequencyData(data);

    var sum = 0;

    for (var i = 0; i < data.length; i++) {
      sum += data[i];
    }

    var energy = Math.min(1, (sum / data.length) / 140);
    var scale = 1 + energy * 0.18;

    document.querySelectorAll(".aurix-orb, .mini-orb").forEach(function (orb) {
      orb.style.scale = scale;
    });

    raf = requestAnimationFrame(loopEnergy);
  }

  function stopListening() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }

    if (stream) {
      stream.getTracks().forEach(function (track) {
        track.stop();
      });
      stream = null;
    }

    if (audioCtx) {
      try {
        audioCtx.close();
      } catch (e) {
        // Ignorar.
      }

      audioCtx = null;
      analyser = null;
    }

    if (window.aurixReleaseAudioInputs) {
      window.aurixReleaseAudioInputs();
    }

    document.body.classList.remove("aurix-listening");

    document.querySelectorAll(".aurix-orb, .mini-orb").forEach(function (orb) {
      orb.style.scale = "";
    });
  }

  document.addEventListener("click", function (e) {
    var t = e.target;

    if (!t) {
      return;
    }

    if (t.id === "micRecordBtn" || (t.closest && t.closest("#micRecordBtn"))) {
      setTimeout(startListening, 300);
    }

    if (t.id === "micStopBtn" || (t.closest && t.closest("#micStopBtn"))) {
      stopListening();
    }

    if (t.id === "micCloseBtn" || (t.closest && t.closest("#micCloseBtn"))) {
      stopListening();
    }

    if (t.id === "aurixMicModal") {
      stopListening();
    }
  });
})();


/* ============================================
   MIC FIX: BOTONES VISIBLES + AUTO-STOP +
   GUARDIAN GLOBAL DE MICROFONO (SAFARI/iOS)
============================================ */

(function () {
  if (window.aurixMicFixInjected) {
    return;
  }

  window.aurixMicFixInjected = true;

  /* ------------------------------------------
     1) GUARDIAN GLOBAL DE STREAMS DE MICROFONO
  ------------------------------------------ */

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && !window.__aurixStreamGuard) {
    window.__aurixStreamGuard = true;
    window.__aurixActiveStreams = [];

    var originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

    navigator.mediaDevices.getUserMedia = function (constraints) {
      return originalGetUserMedia(constraints).then(function (stream) {
        window.__aurixActiveStreams.push(stream);

        stream.getTracks().forEach(function (track) {
          track.addEventListener("ended", function () {
            var i = window.__aurixActiveStreams.indexOf(stream);
            if (i > -1) {
              window.__aurixActiveStreams.splice(i, 1);
            }
          });
        });

        return stream;
      });
    };
  }

  /* Rastrear tambien los reconocimientos de voz */
  window.__aurixSRInstances = [];

  ["SpeechRecognition", "webkitSpeechRecognition"].forEach(function (key) {
    var Orig = window[key];

    if (!Orig || Orig.__aurixWrapped) {
      return;
    }

    function WrappedSR() {
      var inst = new Orig();
      window.__aurixSRInstances.push(inst);
      return inst;
    }

    WrappedSR.prototype = Orig.prototype;
    WrappedSR.__aurixWrapped = true;

    window[key] = WrappedSR;
  });

  /* APAGAR TODO EL MICROFONO (streams + reconocimiento) */
  window.aurixStopAllMics = function () {
    (window.__aurixActiveStreams || []).slice().forEach(function (stream) {
      stream.getTracks().forEach(function (track) {
        try {
          track.stop();
        } catch (e) {
          // Ignorar.
        }
      });
    });

    window.__aurixActiveStreams = [];

    if (window.aurixReleaseAudioInputs) {
      window.aurixReleaseAudioInputs();
    }

    (window.__aurixSRInstances || []).slice().forEach(function (inst) {
      try {
        inst.onresult = null;
        inst.onend = null;
        inst.onerror = null;
        inst.abort();
      } catch (e) {
        // Ignorar.
      }
    });

    window.__aurixSRInstances = [];

    if (window.AurixVoice && typeof window.AurixVoice.stop === "function") {
      window.AurixVoice.stop();
    }

    if (window.__aurixStopVoiceWatch) {
      window.__aurixStopVoiceWatch();
    }
  };

  /* Cerrar microfono al salir de la app / pestaña (iOS Safari) */
  window.addEventListener("pagehide", function () {
    window.aurixStopAllMics();
  });

  window.addEventListener("beforeunload", function () {
    window.aurixStopAllMics();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      window.aurixStopAllMics();
    }
  });

  /* Cerrar microfono al APAGAR AURIX con el boton de poder */
  document.addEventListener("click", function (e) {
    var t = e.target;

    if (t && (t.id === "aurixPowerBtn" || (t.closest && t.closest("#aurixPowerBtn")))) {
      window.aurixStopAllMics();
    }
  }, true);

  /* ------------------------------------------
     2) UI DE GRABACION VISIBLE + AUTO-STOP
  ------------------------------------------ */

  var SILENCE_MS = 3000;
  var SOUND_THRESHOLD = 6;
  var monitor = null;

  function waitFor(selector, cb, tries) {
    var el = document.querySelector(selector);

    if (el) {
      cb(el);
      return;
    }

    if ((tries || 0) > 40) {
      return;
    }

    setTimeout(function () {
      waitFor(selector, cb, (tries || 0) + 1);
    }, 500);
  }

  function setRecordingUI(on) {
    var rec = document.getElementById("micRecordBtn");
    var stop = document.getElementById("micStopBtn");
    var close = document.getElementById("micCloseBtn");
    var status = document.getElementById("micStatus");

    [rec, stop, close].forEach(function (b) {
      if (b) {
        b.classList.toggle("recording", on);
      }
    });

    if (status) {
      status.classList.toggle("recording", on);
    }
  }

  function stopSilenceMonitor() {
    if (monitor) {
      if (monitor.raf) {
        cancelAnimationFrame(monitor.raf);
      }

      if (monitor.ctx) {
        try {
          monitor.ctx.close();
        } catch (e) {
          // Ignorar.
        }
      }

      monitor = null;
    }

    if (window.aurixReleaseAudioInputs) {
      window.aurixReleaseAudioInputs();
    }
  }

  function startSilenceMonitor() {
    stopSilenceMonitor();

    var streams = window.__aurixActiveStreams || [];
    var stream = null;

    for (var i = streams.length - 1; i >= 0; i--) {
      if (streams[i].getAudioTracks && streams[i].getAudioTracks().length && streams[i].active) {
        stream = streams[i];
        break;
      }
    }

    if (!stream) {
      return;
    }

    var AC = window.AudioContext || window.webkitAudioContext;

    if (!AC) {
      return;
    }

    var ctx = new AC();
    var src = ctx.createMediaStreamSource(stream);
    var analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);

    var data = new Uint8Array(analyser.fftSize);
    var lastSound = Date.now();
    var started = Date.now();

    monitor = { ctx: ctx, raf: 0 };

    function tick() {
      if (!monitor) {
        return;
      }

      analyser.getByteTimeDomainData(data);

      var sum = 0;

      for (var i = 0; i < data.length; i++) {
        var d = (data[i] - 128) / 128;
        sum += d * d;
      }

      var rms = Math.sqrt(sum / data.length) * 100;

      if (rms > SOUND_THRESHOLD) {
        lastSound = Date.now();
      }

      var silence = Date.now() - lastSound;
      var total = Date.now() - started;

      if (silence >= SILENCE_MS && total >= 1500) {
        var status = document.getElementById("micStatus");
        var stopBtn = document.getElementById("micStopBtn");

        if (status) {
          status.textContent = "Silencio detectado. Deteniendo automáticamente...";
        }

        stopSilenceMonitor();

        if (stopBtn) {
          stopBtn.click();
        }

        return;
      }

      monitor.raf = requestAnimationFrame(tick);
    }

    tick();
  }

  function watchRecordingState() {
    var rec = document.getElementById("micRecordBtn");

    if (!rec) {
      return;
    }

    var last = null;

    setInterval(function () {
      var on = rec.disabled;

      if (on === last) {
        return;
      }

      last = on;

      setRecordingUI(on);

      if (on) {
        setTimeout(startSilenceMonitor, 400);
      } else {
        stopSilenceMonitor();
      }
    }, 250);
  }

  waitFor("#micRecordBtn", function () {
    watchRecordingState();
  });
})();

/* ============================================
   BOTON META ALCANZADA (SOLO >= 70%)
============================================ */

(function () {
  if (window.__aurixGoalInjected) {
    return;
  }

  window.__aurixGoalInjected = true;

  var GOAL_MIN = 70;

  function currentScore() {
    var el = document.getElementById("micScoreValue");
    return el ? (parseInt(el.textContent, 10) || 0) : 0;
  }

  function currentPhrase() {
    var sel = document.getElementById("micPhraseSelect");
    return sel ? sel.value : "";
  }

  function goalToast(text) {
    var t = document.getElementById("goalToast");

    if (!t) {
      t = document.createElement("div");
      t.id = "goalToast";
      t.className = "pr-record-toast";
      document.body.appendChild(t);
    }

    t.textContent = text;
    t.classList.add("show");

    clearTimeout(t._t);

    t._t = setTimeout(function () {
      t.classList.remove("show");
    }, 2600);
  }

  function injectGoalButton() {
    var modal = document.getElementById("aurixMicModal");

    if (!modal || document.getElementById("micGoalBtn")) {
      return;
    }

    var actions = modal.querySelector(".ob-actions");

    var btn = document.createElement("button");
    btn.id = "micGoalBtn";
    btn.type = "button";
    btn.className = "mic-goal-btn";
    btn.innerHTML = "🏆 META ALCANZADA";

    if (actions) {
      actions.insertBefore(btn, actions.firstChild);
    } else {
      modal.appendChild(btn);
    }

    btn.addEventListener("click", function () {
      if (btn.classList.contains("locked")) {
        return;
      }

      var score = currentScore();
      var phrase = currentPhrase();

      if (score < GOAL_MIN) {
        return;
      }

      if (typeof appState !== "undefined") {
        if (!appState.speakingRecords) {
          appState.speakingRecords = {};
        }

        var r = appState.speakingRecords[phrase] || {
          attempts: 0,
          best: score,
          last: score,
          history: []
        };

        r.goal = true;
        appState.speakingRecords[phrase] = r;

        if (typeof saveAppState === "function") {
          saveAppState();
        }
      }

      btn.classList.add("locked");
      btn.innerHTML = "✔ META REGISTRADA";

      goalToast("🏆 Meta alcanzada: " + score + '% en "' + phrase + '"');
    });
  }

  function refreshGoal() {
    var btn = document.getElementById("micGoalBtn");

    if (!btn) {
      return;
    }

    var score = currentScore();

    if (score >= GOAL_MIN) {
      btn.classList.add("visible");
    } else {
      btn.classList.remove("visible");
      btn.classList.remove("locked");
      btn.innerHTML = "🏆 META ALCANZADA";
    }
  }

  setInterval(function () {
    injectGoalButton();
    refreshGoal();
  }, 400);
})();

/* ============================================
   ADN REAL HELIX v2 (MOTOR)
============================================ */

function renderDna(container) {
  window.__dna2Gen = (window.__dna2Gen || 0) + 1;
  var gen = window.__dna2Gen;

  document.body.classList.add("dna-active");

  var micPending = !(window.AurixMicSetup && window.AurixMicSetup.setupDone());

  var micPanel = "";
  if (micPending) {
    micPanel =
      '<div class="dna-mic-panel" id="dnaMicPanel">' +
        '<div class="ms-card">' +
          '<div class="ms-title">🎙 Configura tu micrófono</div>' +
          '<div class="ms-sub">Parte de tu ADN: con tu micrófono practicarás tu pronunciación. Se configura una sola vez.</div>' +
          '<div class="ms-steps">' +
            '<div class="ms-step">1. Toca <b>Probar micrófono</b> y acepta el permiso.</div>' +
            '<div class="ms-step">2. Habla: las barras deben moverse.</div>' +
            '<div class="ms-step">3. Toca <b>Micrófono listo</b>.</div>' +
          '</div>' +
          '<div class="ms-bars" id="msBars">' +
            '<span></span><span></span><span></span><span></span><span></span><span></span><span></span>' +
          '</div>' +
          '<div class="ms-status" id="msStatus">Esperando prueba...</div>' +
          '<div class="ms-actions">' +
            '<button id="msTestBtn" class="btn">🎤 Probar micrófono</button>' +
            '<button id="msReadyBtn" class="btn" disabled>✔ Micrófono listo</button>' +
          '</div>' +
          '<div class="ms-skip" id="msSkip">Omitir por ahora</div>' +
        '</div>' +
      '</div>';
  }

  container.innerHTML =
    '<div class="dna2-wrap">' +
      '<canvas id="dna2Stars"></canvas>' +
      '<div class="dna2-halo"></div>' +
      '<div class="dna2-core">' +
        '<div class="dna2-ring-wrap">' +
          '<canvas id="dna2Helix"></canvas>' +
          '<svg class="dna2-ring" viewBox="0 0 200 200">' +
            '<circle class="dna2-ring-bg" cx="100" cy="100" r="92"></circle>' +
            '<circle class="dna2-ring-fg" id="dna2RingFg" cx="100" cy="100" r="92"></circle>' +
          '</svg>' +
          '<div class="dna2-percent" id="dna2Percent">0%</div>' +
        '</div>' +
      '</div>' +
      '<div class="dna2-status" id="dna2Status">ANALIZANDO TUS PREFERENCIAS</div>' +
      micPanel +
    '</div>';

  var starsCanvas = document.getElementById("dna2Stars");
  var helixCanvas = document.getElementById("dna2Helix");
  var ringFg = document.getElementById("dna2RingFg");
  var percentEl = document.getElementById("dna2Percent");
  var statusEl = document.getElementById("dna2Status");

  function fit() {
    var wrap = container.querySelector(".dna2-wrap");

    if (!wrap) {
      return;
    }

    var r = wrap.getBoundingClientRect();
    starsCanvas.width = r.width;
    starsCanvas.height = r.height;

    var hw = helixCanvas.parentElement.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;

    helixCanvas.width = hw.width * dpr;
    helixCanvas.height = hw.height * dpr;
    helixCanvas.style.width = hw.width + "px";
    helixCanvas.style.height = hw.height + "px";
    helixCanvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  fit();
  window.addEventListener("resize", fit);

  var CIRC = 2 * Math.PI * 92;
  ringFg.style.strokeDasharray = CIRC;
  ringFg.style.strokeDashoffset = CIRC;

  var stars = [];

  for (var i = 0; i < 70; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      s: Math.random() * 1.6 + 0.4,
      tw: Math.random() * Math.PI * 2,
      sp: 0.5 + Math.random()
    });
  }

  var progress = 0;
  var startTime = null;
  var DURATION = 9000;

  var STATUSES = [
    { at: 0, text: "ANALIZANDO TUS PREFERENCIAS", say: "Analizando tus preferencias." },
    { at: 34, text: "MAPEANDO TU ESTILO", say: "Mapeando tu estilo." },
    { at: 67, text: "SINCRONIZANDO CON AURIX", say: "Sincronizando con AURIX." },
    { at: 100, text: "ADN COMPLETADO", say: "Tu ADN está listo." }
  ];

  var statusIndex = 0;

  function drawStars(t) {
    var ctx = starsCanvas.getContext("2d");
    var w = starsCanvas.width;
    var h = starsCanvas.height;

    ctx.clearRect(0, 0, w, h);

    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var a = 0.1 + 0.2 * Math.abs(Math.sin(st.tw + t * 0.001 * st.sp));

      ctx.globalAlpha = a;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(st.x * w, st.y * h, st.s, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  function drawHelix(t) {
    var ctx = helixCanvas.getContext("2d");
    var w = helixCanvas.clientWidth;
    var h = helixCanvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    var cx = w / 2;
    var top = h * 0.08;
    var bottom = h * 0.92;
    var radius = w * 0.22;
    var turns = 2.2;
    var N = 26;
    var rot = t * 0.0012;

    var i, p, ang, y, x1, x2;

    for (i = 0; i <= N; i++) {
      p = i / N;
      ang = p * Math.PI * 2 * turns + rot;
      y = top + (bottom - top) * p;
      x1 = cx + Math.sin(ang) * radius;
      x2 = cx + Math.sin(ang + Math.PI) * radius;

      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
    }

    function dot(x, y, depth, color) {
      var r = 2.2 + (depth + 1) * 1.6;
      var a = 0.25 + (depth + 1) * 0.35;

      ctx.globalAlpha = Math.min(1, a);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8 * (depth + 1);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    var all = [];

    for (var k = 0; k <= N; k++) {
      var p2 = k / N;
      var ang2 = p2 * Math.PI * 2 * turns + rot;
      var y2 = top + (bottom - top) * p2;

      all.push({ x: cx + Math.sin(ang2) * radius, y: y2, d: Math.cos(ang2), c: "#ffffff" });
      all.push({ x: cx + Math.sin(ang2 + Math.PI) * radius, y: y2, d: Math.cos(ang2 + Math.PI), c: "#7fa8ff" });
    }

    all.sort(function (m, n) {
      return m.d - n.d;
    });

    for (var m2 = 0; m2 < all.length; m2++) {
      var q = all[m2];
      dot(q.x, q.y, q.d, q.c);
    }
  }

  function loop(t) {
    if (window.__dna2Gen !== gen) {
      return;
    }

    if (startTime === null) {
      startTime = t;
    }

    var elapsed = t - startTime;
    progress = Math.min(1, elapsed / DURATION);

    drawStars(t);
    drawHelix(t);

    var pct = Math.round(progress * 100);

    percentEl.textContent = pct + "%";
    ringFg.style.strokeDashoffset = CIRC * (1 - progress);

    while (statusIndex < STATUSES.length - 1 && pct >= STATUSES[statusIndex + 1].at) {
      statusIndex++;
      statusEl.textContent = STATUSES[statusIndex].text;

      if (typeof ssSpeak === "function") {
        ssSpeak(STATUSES[statusIndex].say, "narrator");
      }
    }

    if (progress >= 1) {
      setTimeout(function () {
        if (window.__dna2Gen !== gen) {
          return;
        }

        document.body.classList.remove("dna-active");

        if (typeof renderOnboardingStep === "function") {
          renderOnboardingStep("welcome");
        }
      }, 700);

      return;
    }

    requestAnimationFrame(loop);
  }

  function startAnimation() {
    requestAnimationFrame(loop);

    if (typeof ssSpeak === "function") {
      ssSpeak("Construyendo tu ADN de aprendizaje.", "narrator");
    }
  }

  if (micPending) {
    runMicSetupInsideDna(startAnimation);
  } else {
    startAnimation();
  }
}

/* ---------- CONFIGURACIÓN DE MICRÓFONO DENTRO DEL ADN ---------- */

function runMicSetupInsideDna(onDone) {
  var panel = document.getElementById("dnaMicPanel");

  if (!panel) {
    if (typeof onDone === "function") {
      onDone();
    }
    return;
  }

  document.getElementById("msTestBtn").addEventListener("click", function () {
    if (window.AurixMicSetup) {
      window.AurixMicSetup.runTest();
    }
  });

  function finishSetup() {
    if (window.AurixMicSetup) {
      window.AurixMicSetup.markDone();
      window.AurixMicSetup.stopTest();
    }

    if (typeof aurixSpeakQueued === "function") {
      aurixSpeakQueued("Micrófono configurado correctamente. Ya puedes practicar tu acento.");
    }

    panel.classList.add("dna-mic-done");

    if (typeof onDone === "function") {
      onDone();
    }
  }

  function skipSetup() {
    if (window.AurixMicSetup) {
      window.AurixMicSetup.stopTest();
    }

    panel.classList.add("dna-mic-done");

    if (typeof onDone === "function") {
      onDone();
    }
  }

  document.getElementById("msReadyBtn").addEventListener("click", finishSetup);
  document.getElementById("msSkip").addEventListener("click", skipSetup);

  if (window.AurixMicSetup) {
    window.AurixMicSetup.checkPermissionState();
  }
}

/* ============================================
   RESUME ROUTER: CONTINUAR DONDE TE QUEDASTE
============================================ */

function aurixNextStepInfo() {
  var s = (typeof appState !== "undefined") ? appState : {};
  var sess = s.sessions || {};

  if (!s.onboardingCompleted && !s.mission1Completed) {
    return "Tu siguiente paso: completar tu ADN de aprendizaje.";
  }

  if (!s.mission1Completed) {
    return "Tu siguiente paso: Sesión 1, Primera conversación.";
  }

  if (!sess.session2Completed) {
    return "Tu siguiente paso: Sesión 2, Nivel 0, Singular, Plural y Pronombres.";
  }

  if (!sess.session3Completed) {
    return "Tu siguiente paso: Sesión 3, El Filtro Maestro R.O.D.";
  }

  if (!sess.session4Completed) {
    return "Tu siguiente paso: Sesión 4, Presente Simple vs Continuo.";
  }

  return "Curso al día. Puedes repasar cualquier sesión o practicar speaking.";
}

/* Continuar ya NO reinicia el onboarding: te lleva a tu punto actual */
function enterOnboarding() {
  var s = (typeof appState !== "undefined") ? appState : {};

  if (s.mission1Completed || s.onboardingCompleted) {
    if (typeof renderSessionsPanel === "function" && typeof ensureOnboardingScreen === "function") {
      renderSessionsPanel(ensureOnboardingScreen());
      return;
    }
  }

  renderOnboardingStep("nickname");
}

/* Voz en cola: habla DESPUÉS del saludo de encendido, sin cancelarlo */
function aurixSpeakQueued(text) {
  if (!("speechSynthesis" in window)) {
    return;
  }

  if (window.AurixTTS && window.AurixTTS.settings && !window.AurixTTS.settings.enabled) {
    return;
  }

  var spokenText = window.aurixPronounce ? window.aurixPronounce(text) : text;
  var u = new SpeechSynthesisUtterance(spokenText);
  u.lang = "es-MX";
  u.rate = 1;
  u.pitch = 0.95;
  speechSynthesis.speak(u);
}

(function () {
  if (window.__aurixResumeInjected) {
    return;
  }

  window.__aurixResumeInjected = true;

  function watchOverlay() {
    var overlay = document.getElementById("aurixOffOverlay");

    if (!overlay) {
      setTimeout(watchOverlay, 800);
      return;
    }

    var wasHidden = overlay.classList.contains("hidden");

    var obs = new MutationObserver(function () {
      var isHidden = overlay.classList.contains("hidden");

      /* El overlay se ocultó = AURIX se encendió */
      if (!wasHidden && isHidden) {
        setTimeout(function () {
          aurixSpeakQueued(aurixNextStepInfo());
        }, 400);
      }

      wasHidden = isHidden;
    });

    obs.observe(overlay, { attributes: true, attributeFilter: ["class"] });
  }

  watchOverlay();
})();

/* ============================================
   ANDROID MIC FIX + DIAGNOSTICO VISIBLE
============================================ */

(function () {
  if (window.__aurixAndroidFix) {
    return;
  }

  window.__aurixAndroidFix = true;

  /* 1) AudioContext: auto-resume + reintentos (Android los suspende) */
  var OrigAC = window.AudioContext || window.webkitAudioContext;

  if (OrigAC && !OrigAC.__aurixWrapped) {
    window.__aurixContexts = [];

    var WrappedAC = function () {
      var c = new OrigAC();

      window.__aurixContexts.push(c);

      try {
        c.resume();
      } catch (e) {
        // Ignorar.
      }

      var tries = 0;

      var t = setInterval(function () {
        tries++;

        if (c.state === "running" || tries > 6) {
          clearInterval(t);
          return;
        }

        try {
          c.resume();
        } catch (e) {
          // Ignorar.
        }
      }, 500);

      return c;
    };

    WrappedAC.prototype = OrigAC.prototype;
    WrappedAC.__aurixWrapped = true;

    window.AudioContext = WrappedAC;
    window.webkitAudioContext = WrappedAC;
  }

  /* 2) Reanudar contextos en el clic de Grabar (gesto real) */
  document.addEventListener("click", function (e) {
    var t = e.target;

    if (t && (t.id === "micRecordBtn" || (t.closest && t.closest("#micRecordBtn")))) {
      (window.__aurixContexts || []).forEach(function (c) {
        try {
          c.resume();
        } catch (e2) {
          // Ignorar.
        }
      });
    }
  }, true);

  /* 3) Diagnóstico visible del reconocimiento de voz */
  var OrigSR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (OrigSR && !OrigSR.__aurixDiag) {
    var WrappedSR = function () {
      var inst = new OrigSR();

      try {
        inst.addEventListener("error", function (ev) {
          var st = document.getElementById("micStatus");

          if (st) {
            st.textContent = "Diagnóstico: error de reconocimiento = " + (ev.error || "desconocido");
          }
        });

        inst.addEventListener("start", function () {
          var st = document.getElementById("micStatus");

          if (st) {
            st.textContent = "Reconocimiento activo. Habla en inglés...";
          }
        });

        inst.addEventListener("result", function () {
          var st = document.getElementById("micStatus");

          if (st) {
            st.textContent = "Voz detectada. Procesando...";
          }
        });
      } catch (e) {
        // Ignorar.
      }

      return inst;
    };

    WrappedSR.prototype = OrigSR.prototype;
    WrappedSR.__aurixDiag = true;

    window.SpeechRecognition = WrappedSR;
    window.webkitSpeechRecognition = WrappedSR;
  }
})();


/* ============================================
   REGRESO INTELIGENTE: SIN INTRO + BIENVENIDA
============================================ */

function aurixIsReturningUser() {
  var s = (typeof appState !== "undefined") ? appState : {};

  return Boolean(
    s.onboardingCompleted ||
    s.mission1Completed ||
    (s.nickname && String(s.nickname).length > 0)
  );
}

function aurixNextLessonPreview() {
  var s = (typeof appState !== "undefined") ? appState : {};
  var sess = s.sessions || {};

  if (!s.mission1Completed) {
    return {
      title: "Sesión 1",
      preview: "Tu primera conversación: saludos y presentación en inglés."
    };
  }

  if (!sess.session2Completed) {
    return {
      title: "Sesión 2",
      preview: "Nivel 0: uno = singular, varios = plural, y los pronombres I, you, he, she, it, we, they."
    };
  }

  if (!sess.session3Completed) {
    return {
      title: "Sesión 3",
      preview: "Filtro Maestro R.O.D.: I usa AM; You, We, They usan ARE; He, She, It usan IS."
    };
  }

  if (!sess.session4Completed) {
    return {
      title: "Sesión 4",
      preview: "Presente Simple vs Continuo: sin -ING ser o estar básico; con -ING estar más ando o endo."
    };
  }

  return {
    title: "Repaso",
    preview: "Practica speaking y rompe tus récords de acento."
  };
}

function showWelcomeBanner(name, last, next) {
  var b = document.getElementById("aurixWelcomeBanner");

  if (!b) {
    b = document.createElement("div");
    b.id = "aurixWelcomeBanner";
    b.className = "wb-banner";
    document.body.appendChild(b);
  }

  b.innerHTML =
    '<div class="wb-title">✦ Hola de nuevo, ' + name + '</div>' +
    '<div class="wb-line">Última actividad: ' + last + '</div>' +
    '<div class="wb-line wb-next">Siguiente lección: ' + next.title + '. ' + next.preview + '</div>';

  b.classList.add("show");

  clearTimeout(b._t);

  b._t = setTimeout(function () {
    b.classList.remove("show");
  }, 9000);
}

function aurixWelcomeBack() {
  var s = (typeof appState !== "undefined") ? appState : {};

  var name = s.nickname || "explorador";
  var last = s.lastInteraction || "sin actividad previa";
  var next = aurixNextLessonPreview();

  showWelcomeBanner(name, last, next);

  if (typeof aurixSpeakQueued === "function") {
    aurixSpeakQueued(
      "Bienvenido de nuevo, " + name + ". " +
      "Tu última actividad: " + last + ". " +
      "Siguiente lección: " + next.title + ". " + next.preview
    );
  }
}

/* Splash completo para todos: experiencia completa en cada carga */
async function startSplashSequence() {
  if (window.setIntroProtocolActive) {
    window.setIntroProtocolActive(true);
  }

  showScreen(splash1);
  await speakOrWait("¿Y si aprender inglés fuera más fácil?", 3500);

  showScreen(splash2);
  await speakOrWait("¿Y si el curso se adaptara a ti... y no tú a él?", 4000);

  showScreen(splash3);
  await speakOrWait("Toca el punto para iniciar la secuencia.", 2500);
}

/* Activación con voz asegurada */
async function startActivation() {
  if (typeof ensureTTS === "function") {
    await ensureTTS();
  }

  if (window.AurixTTS) {
    window.AurixTTS.setEnabled(true);
    await window.AurixTTS.speakRichText("Iniciando sistema.", "narrator");
  }

  showScreen(activation);

  var progress = 0;
  var progressFill = document.getElementById("progressFill");

  var interval = setInterval(function () {
    progress = progress + 4;

    if (progress > 100) {
      progress = 100;
    }

    if (progressFill) {
      progressFill.style.width = progress + "%";
    }

    if (progress === 100) {
      clearInterval(interval);
      finishActivation();
    }
  }, 80);
}

/* Al continuar: panel + bienvenida personalizada */
function enterOnboarding() {
  var s = (typeof appState !== "undefined") ? appState : {};

  if (s.mission1Completed || s.onboardingCompleted) {
    if (typeof renderSessionsPanel === "function" && typeof ensureOnboardingScreen === "function") {
      renderSessionsPanel(ensureOnboardingScreen());
      aurixWelcomeBack();
      return;
    }
  }

  renderOnboardingStep("nickname");
}

/* Ruta inicial: el splash completo se reproduce para todos (video + 3 textos).
   Quien tiene progreso llega directo a su panel después del punto. */

(function () {
  if (window.__aurixSkipIntroInjected) {
    return;
  }

  window.__aurixSkipIntroInjected = true;
})();

/* ============================================
   BOTON RESET TOTAL (DENTRO DEL PANEL)
============================================ */

(function () {
  if (window.__aurixResetBtnInjected) {
    return;
  }

  window.__aurixResetBtnInjected = true;

  function addResetButton() {
    var panel = document.getElementById("aurix-settings");

    if (!panel) {
      setTimeout(addResetButton, 800);
      return;
    }

    if (document.getElementById("aurixResetBtn")) {
      return;
    }

    var wrap = document.createElement("div");
    wrap.className = "aurix-setting";

    wrap.innerHTML =
      '<button id="aurixResetBtn" type="button" class="aurix-small-btn" ' +
      'style="width:100%;background:rgba(255,70,70,.12);border:1px solid rgba(255,70,70,.35);color:#ff96a6;">' +
      '🔄 Reiniciar experiencia (borra todo)</button>';

    panel.appendChild(wrap);

    document.getElementById("aurixResetBtn").addEventListener("click", function () {
      if (confirm("¿Borrar todo el progreso y reiniciar la experiencia desde cero?")) {
        localStorage.clear();
        location.reload();
      }
    });
  }

  addResetButton();
})();

/* ============================================
   SESION 4: PRESENTE SIMPLE VS CONTINUO
============================================ */

function ssSession4Done() {
  var s = ssGetSessions();
  return Boolean(s.session4Completed);
}

function s4Norm(t) {
  return String(t || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

var S4_GERUND = [
  { v: "work", a: "working", es: "trabajar" },
  { v: "write", a: "writing", es: "escribir" },
  { v: "run", a: "running", es: "correr" },
  { v: "study", a: "studying", es: "estudiar" },
  { v: "swim", a: "swimming", es: "nadar" }
];

var S4_CONT = [
  { es: "Estoy corriendo.", en: ["i am running", "i'm running"] },
  { es: "Estás bailando.", en: ["you are dancing", "you're dancing"] },
  { es: "Él está escribiendo.", en: ["he is writing", "he's writing"] },
  { es: "Ella está leyendo.", en: ["she is reading", "she's reading"] },
  { es: "Nosotros estamos comiendo.", en: ["we are eating", "we're eating"] },
  { es: "Ustedes están cantando.", en: ["you are singing", "you're singing"] },
  { es: "Ellos están durmiendo.", en: ["they are sleeping", "they're sleeping"] },
  { es: "Estoy pensando.", en: ["i am thinking", "i'm thinking"] },
  { es: "Estás intentando.", en: ["you are trying", "you're trying"] },
  { es: "Él está esperando.", en: ["he is waiting", "he's waiting"] }
];

var S4_SIMPLE = [
  { es: "Corro.", en: ["i run"] },
  { es: "Bailas.", en: ["you dance"] },
  { es: "Él escribe.", en: ["he writes"] },
  { es: "Ella lee.", en: ["she reads"] },
  { es: "Nosotros comemos.", en: ["we eat"] },
  { es: "Ustedes cantan.", en: ["you sing"] },
  { es: "Ellos duermen.", en: ["they sleep"] },
  { es: "Pienso.", en: ["i think"] },
  { es: "Intentas.", en: ["you try"] },
  { es: "Él espera.", en: ["he waits"] }
];

/* ---------- INTRO ---------- */
function renderSession4Intro(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">SESIÓN 4</div>' +
      '<h2 class="ob-title">Presente Simple vs Continuo</h2>' +
      '<p class="ob-sub">Dos tiempos, una Regla de Oro. Sin -ING = ser o estar básico. Con -ING = estar + ando o endo.</p>' +
      '<div class="ob-actions"><button id="s4Start" class="btn">Comenzar</button></div>' +
    '</div>';

  document.getElementById("s4Start").onclick = function () {
    renderSession4Rule(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Sesión cuatro. Presente simple versus presente continuo. Regla de oro: sin ing, ser o estar básico. Con ing, estar más ando o endo.", "narrator");
  }
}

/* ---------- REGLA DE ORO + PUENTE R.O.D. ---------- */
function renderSession4Rule(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">PUENTE R.O.D.</div>' +
      '<h2 class="ob-title">La Regla de Oro</h2>' +
      '<div class="s4-rule"><b>Canal 1 — 1ª persona:</b> ' + ssDisplayEn("I") + ' → ' + ssDisplayEn("AM") + '</div>' +
      '<div class="s4-rule"><b>Canal 2 — 2ªs personas:</b> ' + ssDisplayEn("You, We, They") + ' → ' + ssDisplayEn("ARE") + '</div>' +
      '<div class="s4-rule"><b>Canal 3 — 3ªs personas:</b> ' + ssDisplayEn("He, She, It") + ' → ' + ssDisplayEn("IS") + '</div>' +
      '<div class="s4-rule"><b>SIN -ING</b> = Ser/Estar básico (Simple).<br>' + ssDisplayEn("It is a house.") + ' = Es una casa.</div>' +
      '<div class="s4-rule"><b>CON -ING</b> = Estar + Ando/Endo (Continuo).<br>' + ssDisplayEn("I am working.") + ' = Estoy trabajando.</div>' +
      '<div class="ob-actions"><button id="s4RuleNext" class="btn">Continuar</button></div>' +
    '</div>';

  document.getElementById("s4RuleNext").onclick = function () {
    renderSession4Gerund(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Recuerda el filtro. Primera persona usa am. Segundas personas usan are. Terceras personas usan is. Sin ing, ser o estar básico. Con ing, estar más ando o endo.", "narrator");
  }
}

/* ---------- GERUNDIO ---------- */
function renderSession4Gerund(container) {
  var rows = "";

  S4_GERUND.forEach(function (item, i) {
    rows +=
      '<div class="s4-row">' +
        '<div class="s4-es">' + ssDisplayEn(item.v) + ' (' + escapeHtml(item.es) + ') → ?</div>' +
        '<input id="s4g' + i + '" class="s4-input" type="text" placeholder="Escribe el gerundio...">' +
        '<div id="s4gf' + i + '" class="s4-answer"></div>' +
      '</div>';
  });

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">MORFOLOGÍA</div>' +
      '<h2 class="ob-title">El Gerundio (-ING)</h2>' +
      '<div class="s4-rule"><b>Regla general:</b> + ING → ' + ssDisplayEn("work") + ' (trabajar) → ' + ssDisplayEn("working") + '</div>' +
      '<div class="s4-rule"><b>Termina en -E muda:</b> quita la E + ING → ' + ssDisplayEn("write") + ' (escribir) → ' + ssDisplayEn("writing") + '</div>' +
      '<div class="s4-rule"><b>Monosílabo C-V-C:</b> duplica consonante + ING → ' + ssDisplayEn("run") + ' (correr) → ' + ssDisplayEn("running") + '</div>' +
      '<div class="s4-rule"><b>Consonante + Y:</b> solo + ING (sin cambios) → ' + ssDisplayEn("study") + ' (estudiar) → ' + ssDisplayEn("studying") + '</div>' +
      rows +
      '<div id="s4GerundScore" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="s4GerundCheck" class="btn">Revisar</button>' +
        '<button id="s4GerundNext" class="btn" disabled>Continuar</button>' +
      '</div>' +
    '</div>';

  document.getElementById("s4GerundCheck").onclick = function () {
    var score = 0;

    S4_GERUND.forEach(function (item, i) {
      var inp = document.getElementById("s4g" + i);
      var fb = document.getElementById("s4gf" + i);
      var ok = s4Norm(inp.value) === item.a;

      if (ok) score++;

      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + item.a;
    });

    document.getElementById("s4GerundScore").textContent =
      "Resultado: " + score + "/" + S4_GERUND.length;

    document.getElementById("s4GerundNext").disabled = false;
  };

  document.getElementById("s4GerundNext").onclick = function () {
    renderSession4Contrast(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("El gerundio en inglés equivale a ando y endo en español. Aplica las cuatro reglas y escribe el gerundio de cada verbo.", "narrator");
  }
}

/* ---------- CONTRASTE + 3ª PERSONA ---------- */
function renderSession4Contrast(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">CONTRASTE</div>' +
      '<h2 class="ob-title">Simple vs Continuo</h2>' +
      '<div class="s4-rule"><b>SIMPLE:</b> Sujeto + am/is/are + complemento. <b>NO lleva -ING.</b><br>' + ssDisplayEn("It is a house.") + '</div>' +
      '<div class="s4-rule"><b>CONTINUO:</b> Sujeto + am/is/are + verbo-ING. <b>SÍ lleva -ING.</b><br>' + ssDisplayEn("I am working.") + '</div>' +
      '<div class="s4-rule"><b>3ª persona del SIMPLE:</b><br>• General: + S → ' + ssDisplayEn("He runs.") + ' (Él corre.)<br>• Termina en O, X, S, SH, Z: + ES → ' + ssDisplayEn("He goes.") + ' (Él va.)<br>• Consonante + Y: Y → IES → ' + ssDisplayEn("He tries.") + ' (Él intenta.)<br>• ' + ssDisplayEn("have") + ' (tener) → ' + ssDisplayEn("has") + '.</div>' +
      '<div class="s4-rule"><b>Regla clave:</b> en inglés el pronombre NUNCA se omite. Siempre debe estar escrito.</div>' +
      '<div class="ob-actions"><button id="s4ContrastNext" class="btn">Ir a ejercicios</button></div>' +
    '</div>';

  document.getElementById("s4ContrastNext").onclick = function () {
    renderSession4ExerciseA(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("En el tiempo simple no hay gerundio. En el continuo, el gerundio es obligatorio. Y recuerda: en inglés el pronombre nunca se omite.", "narrator");
  }
}

/* ---------- EJERCICIO A: CONTINUO ---------- */
function renderSession4ExerciseA(container) {
  var rows = "";

  S4_CONT.forEach(function (item, i) {
    rows +=
      '<div class="s4-row">' +
        '<div class="s4-es">' + (i + 1) + '. ' + item.es + '</div>' +
        '<input id="s4a' + i + '" class="s4-input" type="text" placeholder="Escribe en inglés...">' +
        '<div id="s4af' + i + '" class="s4-answer"></div>' +
      '</div>';
  });

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">EJERCICIO A</div>' +
      '<h2 class="ob-title">Presente Continuo</h2>' +
      '<p class="ob-sub">Traduce usando am/is/are + verbo con -ING.</p>' +
      rows +
      '<div id="s4ScoreA" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="s4CheckA" class="btn">Revisar</button>' +
        '<button id="s4NextA" class="btn" disabled>Continuar</button>' +
      '</div>' +
    '</div>';

  document.getElementById("s4CheckA").onclick = function () {
    var score = 0;

    S4_CONT.forEach(function (item, i) {
      var inp = document.getElementById("s4a" + i);
      var fb = document.getElementById("s4af" + i);
      var val = s4Norm(inp.value);
      var ok = item.en.indexOf(val) > -1;

      if (ok) score++;

      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + item.en[0] + ".";
    });

    window.__s4ScoreA = score;

    document.getElementById("s4ScoreA").textContent =
      "Resultado: " + score + "/" + S4_CONT.length;

    document.getElementById("s4NextA").disabled = false;
  };

  document.getElementById("s4NextA").onclick = function () {
    renderSession4ExerciseB(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Ejercicio A. Traduce al presente continuo. Usa el verbo to be más el gerundio.", "narrator");
  }
}

/* ---------- EJERCICIO B: SIMPLE ---------- */
function renderSession4ExerciseB(container) {
  var rows = "";

  S4_SIMPLE.forEach(function (item, i) {
    rows +=
      '<div class="s4-row">' +
        '<div class="s4-es">' + (i + 1) + '. ' + item.es + '</div>' +
        '<input id="s4b' + i + '" class="s4-input" type="text" placeholder="Escribe en inglés (no olvides el pronombre)...">' +
        '<div id="s4bf' + i + '" class="s4-answer"></div>' +
      '</div>';
  });

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">EJERCICIO B</div>' +
      '<h2 class="ob-title">Presente Simple</h2>' +
      '<p class="ob-sub">Traduce sin -ING. Cuidado con la 3ª persona y el pronombre obligatorio.</p>' +
      rows +
      '<div id="s4ScoreB" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="s4CheckB" class="btn">Revisar</button>' +
        '<button id="s4NextB" class="btn" disabled>Completar sesión</button>' +
      '</div>' +
    '</div>';

  document.getElementById("s4CheckB").onclick = function () {
    var score = 0;

    S4_SIMPLE.forEach(function (item, i) {
      var inp = document.getElementById("s4b" + i);
      var fb = document.getElementById("s4bf" + i);
      var val = s4Norm(inp.value);
      var ok = item.en.indexOf(val) > -1;

      if (ok) score++;

      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + item.en[0] + ".";
    });

    window.__s4ScoreB = score;

    document.getElementById("s4ScoreB").textContent =
      "Resultado: " + score + "/" + S4_SIMPLE.length;

    document.getElementById("s4NextB").disabled = false;
  };

  document.getElementById("s4NextB").onclick = function () {
    renderSession4Complete(container, window.__s4ScoreA || 0, window.__s4ScoreB || 0);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Ejercicio B. Traduce al presente simple. Sin gerundio. Y recuerda: el pronombre siempre se escribe.", "narrator");
  }
}

/* ---------- COMPLETAR ---------- */
function renderSession4Complete(container, a, b) {
  var s = ssGetSessions();

  s.session4Completed = true;
  s.session4Score = (a || 0) + (b || 0);

  if (typeof appState !== "undefined") {
    appState.lastInteraction = "Sesión 4: Presente Simple vs Continuo";
  }

  ssSave();

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">SESIÓN 4</div>' +
      '<h2 class="ob-title">Sesión 4 completada</h2>' +
      '<div class="mp-profile-summary">' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Continuo</div><div class="mp-profile-value">' + a + '/10</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Simple</div><div class="mp-profile-value">' + b + '/10</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Total</div><div class="mp-profile-value">' + ((a || 0) + (b || 0)) + '/20</div></div>' +
      '</div>' +
      '<p class="ob-sub">Dominaste la Regla de Oro: sin -ING ser/estar básico, con -ING estar + ando/endo.</p>' +
      '<div class="ob-actions"><button id="s4Back" class="btn">Volver al panel</button></div>' +
    '</div>';

  document.getElementById("s4Back").onclick = function () {
    renderSessionsPanel(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Sesión cuatro completada. Dominaste la diferencia entre simple y continuo. " + ssEnQuote("Excellent work."), "narrator");
  }
}

/* ---------- PANEL ACTUALIZADO (4 SESIONES) ---------- */
function renderSessionsPanel(container) {
  var s1 = ssSession1Done();
  var s2 = ssSession2Done();
  var s3 = ssSession3Done();
  var s4 = ssSession4Done();

  var completedCount = 0;
  if (s1) completedCount++;
  if (s2) completedCount++;
  if (s3) completedCount++;
  if (s4) completedCount++;

  var progress = Math.round((completedCount / 4) * 100);

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">Panel de sesiones</h2>' +
      '<p class="ob-sub">Tu progreso en el método gramatical puro.</p>' +
      '<div class="ss-progress-track"><div class="ss-progress-fill" style="width:' + progress + '%"></div></div>' +
      '<p class="ss-status">Progreso: ' + completedCount + '/4 sesiones</p>' +
      '<div class="ss-grid">' +
        '<div class="ss-card ' + (s1 ? "completed" : "available") + '">' +
          '<span class="ss-badge ' + (s1 ? "done" : "next") + '">Sesión 1</span>' +
          '<div class="ss-title">Primera conversación</div>' +
          '<div class="ss-status">' + (s1 ? "Completada" : "Disponible") + '</div>' +
        '</div>' +
        '<div class="ss-card ' + (s2 ? "completed" : (s1 ? "available" : "locked")) + '">' +
          '<span class="ss-badge ' + (s2 ? "done" : (s1 ? "next" : "locked")) + '">Sesión 2</span>' +
          '<div class="ss-title">Nivel 0: Singular, Plural y Pronombres</div>' +
          '<div class="ss-status">' + (s2 ? "Completada" : (s1 ? "Disponible" : "Bloqueada") ) + '</div>' +
        '</div>' +
        '<div class="ss-card ' + (s3 ? "completed" : (s2 ? "available" : "locked")) + '">' +
          '<span class="ss-badge ' + (s3 ? "done" : (s2 ? "next" : "locked")) + '">Sesión 3</span>' +
          '<div class="ss-title">Filtro Maestro R.O.D.</div>' +
          '<div class="ss-status">' + (s3 ? "Completada" : (s2 ? "Disponible" : "Bloqueada") ) + '</div>' +
        '</div>' +
        '<div class="ss-card ' + (s4 ? "completed" : (s3 ? "available" : "locked")) + '">' +
          '<span class="ss-badge ' + (s4 ? "done" : (s3 ? "next" : "locked")) + '">Sesión 4</span>' +
          '<div class="ss-title">Presente Simple vs Continuo</div>' +
          '<div class="ss-status">' + (s4 ? "Completada" : (s3 ? "Disponible" : "Bloqueada") ) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="ss-actions">' +
        '<button id="ssSession1Btn" class="ob-small-btn">' + (s1 ? "Repetir S1" : "Iniciar S1") + '</button>' +
        '<button id="ssSession2Btn" class="ob-small-btn" ' + (s1 ? "" : "disabled") + '>' + (s2 ? "Repetir S2" : "Iniciar S2") + '</button>' +
        '<button id="ssSession3Btn" class="ob-small-btn" ' + (s2 ? "" : "disabled") + '>' + (s3 ? "Repetir S3" : "Iniciar S3") + '</button>' +
        '<button id="ssSession4Btn" class="btn" ' + (s3 ? "" : "disabled") + '>' + (s4 ? "Repetir S4" : "Continuar: Sesión 4") + '</button>' +
      '</div>' +
    '</div>';

  document.getElementById("ssSession1Btn").onclick = function () {
    if (typeof renderMissionProfileName === "function") renderMissionProfileName(container);
  };

  document.getElementById("ssSession2Btn").onclick = function () {
    if (s1 && typeof renderSession2Intro === "function") renderSession2Intro(container);
  };

  document.getElementById("ssSession3Btn").onclick = function () {
    if (s2 && typeof renderSession3Intro === "function") renderSession3Intro(container);
  };

  document.getElementById("ssSession4Btn").onclick = function () {
    if (s3) renderSession4Intro(container);
  };

  ssSpeak("Panel de sesiones. Progreso actual: " + completedCount + " de 4.", "narrator");
}

/* ============================================
   MIC SETUP OBLIGATORIO (LOGICA)
============================================ */

(function () {
  if (window.__aurixMicSetupInjected) {
    return;
  }

  window.__aurixMicSetupInjected = true;

  var SETUP_KEY = "aurix_mic_setup_done";

  var testStream = null;
  var testCtx = null;
  var testRaf = null;
  var testRec = null;
  var voiceDetected = false;

  function setupDone() {
    return localStorage.getItem(SETUP_KEY) === "true";
  }

  function markDone() {
    localStorage.setItem(SETUP_KEY, "true");
  }

  function injectUI() {
    if (document.getElementById("micSetupOverlay")) {
      return;
    }

    var overlay = document.createElement("div");
    overlay.id = "micSetupOverlay";
    overlay.className = "ms-overlay hidden";

    overlay.innerHTML =
      '<div class="ms-card">' +
        '<div class="ms-title">🎙 Configura tu micrófono</div>' +
        '<div class="ms-sub">El micrófono es pieza clave de AURIX. Configúralo una sola vez.</div>' +
        '<div class="ms-steps">' +
          '<div class="ms-step">1. Toca <b>Probar micrófono</b> (o el 🎤 de abajo) y acepta el permiso.</div>' +
          '<div class="ms-step">2. Habla: las barras deben moverse.</div>' +
          '<div class="ms-step">3. Toca <b>Micrófono listo</b>.</div>' +
        '</div>' +
        '<div class="ms-bars" id="msBars">' +
          '<span></span><span></span><span></span><span></span><span></span><span></span><span></span>' +
        '</div>' +
        '<div class="ms-status" id="msStatus">Esperando prueba...</div>' +
        '<div class="ms-actions">' +
          '<button id="msTestBtn" class="btn">🎤 Probar micrófono</button>' +
          '<button id="msReadyBtn" class="btn" disabled>✔ Micrófono listo</button>' +
        '</div>' +
        '<div class="ms-skip" id="msSkip">Omitir por ahora</div>' +
      '</div>' +
      '<div class="ms-arrow">▼<span>tu micrófono vive aquí</span></div>';

    document.body.appendChild(overlay);

    document.getElementById("msTestBtn").addEventListener("click", runTest);
    document.getElementById("msReadyBtn").addEventListener("click", finishSetup);
    document.getElementById("msSkip").addEventListener("click", hideOverlay);
  }

  function showOverlay() {
    injectUI();
    var o = document.getElementById("micSetupOverlay");
    if (o) {
      o.classList.remove("hidden");
    }
    checkPermissionState();
  }

  function hideOverlay() {
    stopTest();
    var o = document.getElementById("micSetupOverlay");
    if (o) {
      o.classList.add("hidden");
    }
  }

  function setStatus(text, cls) {
    var st = document.getElementById("msStatus");
    if (!st) {
      return;
    }
    st.textContent = text;
    st.className = "ms-status" + (cls ? " " + cls : "");
  }

  function checkPermissionState() {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "microphone" }).then(function (p) {
        if (p.state === "denied") {
          setStatus("Permiso bloqueado. Toca el candado de la URL → Permisos → Micrófono → Permitir, y vuelve a probar.", "ms-bad");
        } else if (p.state === "granted") {
          setStatus("Permiso concedido. Pulsa Probar micrófono para verificar.", "ms-ok");
        }
      }).catch(function () {
        // Ignorar.
      });
    }
  }

  function runTest() {
    stopTest();
    voiceDetected = false;

    var ready = document.getElementById("msReadyBtn");
    if (ready) {
      ready.disabled = true;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("Este navegador no soporta micrófono. Usa https (Vercel) o localhost.", "ms-bad");
      return;
    }

    setStatus("Solicitando permiso de micrófono...");

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      testStream = stream;

      var AC = window.AudioContext || window.webkitAudioContext;
      testCtx = new AC();

      var src = testCtx.createMediaStreamSource(stream);
      var an = testCtx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);

      var data = new Uint8Array(an.fftSize);
      var bars = document.querySelectorAll("#msBars span");

      setStatus("Permiso OK. Habla ahora... las barras deben moverse.");

      function tick() {
        an.getByteFrequencyData(data);

        var sum = 0;
        for (var i = 0; i < data.length; i++) {
          sum += data[i];
        }
        var avg = sum / data.length;

        bars.forEach(function (b, i) {
          var h = Math.max(8, Math.min(100, avg * (1 + i * 0.1) * 2.4));
          b.style.height = h + "%";
        });

        if (avg > 12 && !voiceDetected) {
          voiceDetected = true;
          setStatus("✔ Voz detectada. Tu micrófono funciona.", "ms-ok");
          if (ready) {
            ready.disabled = false;
          }
        }

        testRaf = requestAnimationFrame(tick);
      }

      tick();

      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SR) {
        try {
          testRec = new SR();
          testRec.lang = "en-US";

          testRec.onresult = function () {
            if (!voiceDetected) {
              voiceDetected = true;
              setStatus("✔ Voz detectada y reconocimiento activo.", "ms-ok");
              if (ready) {
                ready.disabled = false;
              }
            }
          };

          testRec.onerror = function (e) {
            setStatus("Diagnóstico reconocimiento: " + e.error + " (el mic puede funcionar aunque el reconocimiento falle).", "ms-warn");
          };

          testRec.start();
        } catch (e) {
          // Ignorar.
        }
      }
    }).catch(function (err) {
      var msgs = {
        "NotAllowedError": "Permiso denegado. Actívalo en el candado o ajustes del sitio.",
        "PermissionDeniedError": "Permiso denegado. Actívalo en el candado o ajustes del sitio.",
        "NotFoundError": "No se detecta ningún micrófono en este dispositivo.",
        "NotReadableError": "El micrófono está ocupado por otra aplicación.",
        "SecurityError": "Contexto no seguro: abre la app en https (Vercel) o localhost, nunca en file://."
      };

      setStatus(msgs[err.name] || ("Error: " + err.name), "ms-bad");
    });
  }

  function stopTest() {
    if (testRaf) {
      cancelAnimationFrame(testRaf);
    }
    testRaf = null;

    if (testRec) {
      try {
        testRec.onresult = null;
        testRec.onerror = null;
        testRec.abort();
      } catch (e) {
        // Ignorar.
      }
      testRec = null;
    }

    if (testStream) {
      testStream.getTracks().forEach(function (t) {
        t.stop();
      });
      testStream = null;
    }

    if (testCtx) {
      try {
        testCtx.close();
      } catch (e) {
        // Ignorar.
      }
      testCtx = null;
    }

    if (window.aurixReleaseAudioInputs) {
      window.aurixReleaseAudioInputs();
    }

    document.querySelectorAll("#msBars span").forEach(function (b) {
      b.style.height = "8%";
    });
  }

  function finishSetup() {
    stopTest();
    markDone();
    hideOverlay();

    if (typeof aurixSpeakQueued === "function") {
      aurixSpeakQueued("Micrófono configurado correctamente. Ya puedes practicar tu acento.");
    }
  }

  /* Auto-configurar si el usuario ya practico con exito en el modal */
  setInterval(function () {
    var v = document.getElementById("micScoreValue");

    if (v && parseInt(v.textContent, 10) > 0 && !setupDone()) {
      markDone();
      hideOverlay();
    }
  }, 1500);

  /* El setup ya no se muestra solo tras el splash:
     ahora vive dentro del onboarding, justo antes de crear el ADN. */
  window.AurixMicSetup = {
    setupDone: setupDone,
    markDone: markDone,
    runTest: runTest,
    stopTest: stopTest,
    checkPermissionState: checkPermissionState
  };
})();

/* ============================================
   COMPAT EDGE / VERCEL / SAFARI
   Contexto maestro + puntaje fallback
============================================ */

(function () {
  if (window.__aurixCompatPatch) {
    return;
  }

  window.__aurixCompatPatch = true;

  var BaseAC = window.AudioContext || window.webkitAudioContext;

  /* 1) Contexto maestro creado en el primer gesto real */
  function ensureMaster() {
    var m = window.__aurixMasterCtx;

    if (m && m.state !== "closed") {
      if (m.state === "suspended") {
        try { m.resume(); } catch (e) {}
      }
      return m;
    }

    if (!BaseAC) {
      return null;
    }

    try {
      var c = new BaseAC();
      try { c.resume(); } catch (e) {}
      window.__aurixMasterCtx = c;
    } catch (e) {
      // Ignorar.
    }

    return window.__aurixMasterCtx;
  }

  document.addEventListener("pointerdown", function () {
    ensureMaster();
  }, true);

  /* 2) Todo AudioContext nuevo = maestro compartido y protegido */
  if (BaseAC) {
    function SharedAC() {
      var ctx = ensureMaster();

      if (!ctx) {
        ctx = new BaseAC();
      }

      ctx.close = function () {
        return Promise.resolve();
      };

      try { ctx.resume(); } catch (e) {}

      if (window.__aurixContexts) {
        window.__aurixContexts.push(ctx);
      }

      return ctx;
    }

    SharedAC.prototype = BaseAC.prototype;
    SharedAC.__aurixShared = true;

    window.AudioContext = SharedAC;
    window.webkitAudioContext = SharedAC;
  }

  /* ------------------------------------------
     Rastreo de fuentes de microfono conectadas
     (desconectarlas libera el indicador en iOS)
  ------------------------------------------ */
  window.__aurixMediaSources = window.__aurixMediaSources || [];

  if (BaseAC && BaseAC.prototype && BaseAC.prototype.createMediaStreamSource && !window.__aurixSrcPatched) {
    window.__aurixSrcPatched = true;

    var origCreateSource = BaseAC.prototype.createMediaStreamSource;

    BaseAC.prototype.createMediaStreamSource = function (stream) {
      var src = origCreateSource.call(this, stream);

      window.__aurixMediaSources.push(src);

      return src;
    };
  }

  window.aurixReleaseAudioInputs = function () {
    (window.__aurixMediaSources || []).slice().forEach(function (src) {
      try {
        src.disconnect();
      } catch (e) {
        // Ignorar.
      }
    });

    window.__aurixMediaSources = [];
  };

  /* 3) Vigilante de voz para puntaje fallback */
  var watch = { raf: 0, voiced: 0, total: 0, active: false };

  function stopVoiceWatch() {
    watch.active = false;
    if (watch.raf) {
      cancelAnimationFrame(watch.raf);
    }
    watch.raf = 0;
  }

  window.__aurixStopVoiceWatch = stopVoiceWatch;

  function startVoiceWatch() {
    stopVoiceWatch();

    var tries = 0;

    function attach() {
      var streams = window.__aurixActiveStreams || [];
      var s = null;

      for (var i = streams.length - 1; i >= 0; i--) {
        if (streams[i].active) {
          s = streams[i];
          break;
        }
      }

      if (!s && tries < 10) {
        tries++;
        setTimeout(attach, 300);
        return;
      }

      if (!s || !BaseAC) {
        return;
      }

      var ctx = window.__aurixMasterCtx || new BaseAC();
      var src = ctx.createMediaStreamSource(s);
      var an = ctx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);

      var data = new Uint8Array(an.fftSize);

      watch.active = true;
      watch.voiced = 0;
      watch.total = 0;

      function tick() {
        if (!watch.active) {
          return;
        }

        an.getByteTimeDomainData(data);

        var sum = 0;
        for (var i = 0; i < data.length; i++) {
          var d = (data[i] - 128) / 128;
          sum += d * d;
        }

        var rms = Math.sqrt(sum / data.length) * 100;

        watch.total++;
        if (rms > 6) {
          watch.voiced++;
        }

        watch.raf = requestAnimationFrame(tick);
      }

      tick();
    }

    attach();
  }

  function fallbackCheck() {
    var v = document.getElementById("micScoreValue");
    var score = v ? (parseInt(v.textContent, 10) || 0) : 0;

    if (score === 0 && watch.total > 30 && watch.voiced > watch.total * 0.12) {
      var coverage = watch.voiced / watch.total;
      var fb = Math.max(40, Math.min(85, Math.round(40 + coverage * 60)));

      if (v) {
        v.textContent = fb + "%";
      }

      var fill = document.getElementById("micScoreFill");
      if (fill) {
        fill.style.width = fb + "%";
      }

      var tr = document.getElementById("micTranscript");
      if (tr) {
        tr.textContent = "(transcripción no disponible en este navegador)";
      }

      var st = document.getElementById("micStatus");
      if (st) {
        st.textContent = "Tu navegador no transcribió, pero detectamos tu voz. Puntaje aproximado: " + fb + "%.";
      }

      var sel = document.getElementById("micPhraseSelect");
      var phrase = sel ? sel.value : "";

      if (phrase && typeof appState !== "undefined") {
        if (!appState.speakingRecords) {
          appState.speakingRecords = {};
        }

        var r = appState.speakingRecords[phrase];

        if (r) {
          r.last = fb;
          if (fb > r.best) {
            r.best = fb;
          }
          if (typeof saveAppState === "function") {
            saveAppState();
          }
        } else if (typeof window.aurixUpdateRecord === "function") {
          window.aurixUpdateRecord(phrase, fb);
        }
      }
    }

    stopVoiceWatch();
  }

  document.addEventListener("click", function (e) {
    var t = e.target;

    if (!t) {
      return;
    }

    if (t.id === "micRecordBtn" || (t.closest && t.closest("#micRecordBtn"))) {
      startVoiceWatch();
    }

    if (t.id === "micStopBtn" || (t.closest && t.closest("#micStopBtn"))) {
      setTimeout(fallbackCheck, 900);
    }
  }, true);
})();

/* ============================================
   AURIX CLOUD DB CONNECTOR + MULTI-USUARIO
============================================ */

(function () {
  if (window.__aurixCloudInjected) {
    return;
  }

  window.__aurixCloudInjected = true;

  window.AURIX_API = "https://script.google.com/macros/s/AKfycbw0VN6XVNz_qdEx6zmAI5YMTPQG7acYcssVqBC4q5WO0vjbXV0H8oHqfbUZWURhIHhE/exec";

  var CLOUD_USER_KEY = "aurix_cloud_user_id";

  function cloudUserId() {
    return localStorage.getItem(CLOUD_USER_KEY) || "";
  }

  function setCloudUserId(id) {
    localStorage.setItem(CLOUD_USER_KEY, id);
  }

  function apiGet(params) {
    var qs = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
    }).join("&");
    return fetch(window.AURIX_API + "?" + qs).then(function (r) { return r.json(); });
  }

  function apiPost(body) {
    return fetch(window.AURIX_API, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, mode: "no-cors",
      body: JSON.stringify(body)
    }).then(function () { return { ok: true }; });
  }

  function sheetToState(data) {
    var st = (typeof defaultAppState === "function") ? defaultAppState() : {};
    var u = data.user || {};
    var a = data.adn || {};

    st.nickname = u.nickname || "";
    st.goal = a.goal || "";
    st.goalLabel = a.goal_label || "";
    st.level = a.level_verified || "";
    st.minutes = String(a.minutes_per_day || "");
    st.route = a.route || "";
    st.routeLabel = a.route_label || "";

    st.skills = {
      reading: Number(a.skill_reading || 5),
      listening: Number(a.skill_listening || 5),
      speaking: Number(a.skill_speaking || 5),
      writing: Number(a.skill_writing || 5)
    };

    st.onboardingCompleted = String(a.onboarding_completed) === "true";
    st.mission1Completed = String(a.mission1_completed) === "true";

    var ses = {};
    (data.sessions || []).forEach(function (r) {
      if (Number(r.session_id) === 2) ses.session2Completed = r.status === "completed";
      if (Number(r.session_id) === 3) ses.session3Completed = r.status === "completed";
      if (Number(r.session_id) === 4) ses.session4Completed = r.status === "completed";
    });
    st.sessions = ses;

    var rec = {};
    (data.speaking || []).forEach(function (r) {
      rec[r.phrase] = {
        attempts: Number(r.attempts) || 0,
        best: Number(r.best) || 0,
        last: Number(r.last) || 0,
        history: [],
        goal: String(r.goal_reached) === "true"
      };
    });
    st.speakingRecords = rec;

    return st;
  }

  window.aurixCloudLoad = function (userId, cb) {
    apiGet({ action: "load", user_id: userId }).then(function (data) {
      if (data && data.ok) {
        appState = sheetToState(data);
        if (typeof saveAppState === "function") {
          saveAppState();
        }
        setCloudUserId(userId);
        updateCloudChip();
      }
      if (cb) cb(data);
    }).catch(function () {
      if (cb) cb(null);
    });
  };

  var syncTimer = null;

  function cloudSync() {
    if (!window.AURIX_API || window.AURIX_API.indexOf("PEGAR_AQUI") === 0) {
      return;
    }
    var id = cloudUserId();
    if (!id) {
      return;
    }
    apiPost({ action: "sync", user_id: id, state: appState }).catch(function () {});
  }

  window.aurixCloudSync = function () {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(cloudSync, 1500);
  };

  var origSave = window.saveAppState;
  window.saveAppState = function () {
    if (origSave) {
      origSave();
    }
    window.aurixCloudSync();
  };

  function updateCloudChip() {
    var chip = document.getElementById("cloudUserChip");
    if (!chip) {
      return;
    }
    var name = (typeof appState !== "undefined" && appState.nickname) ? appState.nickname : "sin usuario";
    chip.innerHTML = "👤 " + name;
  }

  function openCloudModal() {
    var modal = document.getElementById("cloudModal");
    var list = document.getElementById("cloudUserList");

    modal.classList.remove("hidden");
    list.innerHTML = '<div class="ms-sub">Cargando usuarios...</div>';

    apiGet({ action: "listUsers" }).then(function (data) {
      if (!data || !data.ok) {
        list.innerHTML = '<div class="ms-sub">No se pudo conectar con Google Sheets.</div>';
        return;
      }

      list.innerHTML = "";

      (data.users || []).forEach(function (u) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "cloud-user-row";
        b.innerHTML = "<b>" + u.nickname + "</b><span>" + u.user_id + "</span>";

        b.addEventListener("click", function () {
          window.aurixCloudLoad(u.user_id, function () {
            modal.classList.add("hidden");

            if (typeof aurixSpeakQueued === "function") {
              aurixSpeakQueued("ADN cargado de " + (appState.nickname || u.nickname));
            }

            if (typeof renderSessionsPanel === "function" && typeof ensureOnboardingScreen === "function") {
              renderSessionsPanel(ensureOnboardingScreen());
            }
          });
        });

        list.appendChild(b);
      });
    }).catch(function () {
      list.innerHTML = '<div class="ms-sub">Error de conexión.</div>';
    });
  }

  function injectCloudUI() {
    if (document.getElementById("cloudUserChip")) {
      return;
    }

    var chip = document.createElement("button");
    chip.id = "cloudUserChip";
    chip.type = "button";
    chip.className = "cloud-user-chip";
    document.body.appendChild(chip);
    chip.addEventListener("click", openCloudModal);
    updateCloudChip();

    var modal = document.createElement("div");
    modal.id = "cloudModal";
    modal.className = "mic-modal hidden";
    modal.innerHTML =
      '<div class="mic-card">' +
        '<div class="ms-title">👤 Cambiar usuario (pruebas)</div>' +
        '<div class="ms-sub">Carga el ADN de un usuario desde Google Sheets o crea uno nuevo.</div>' +
        '<div id="cloudUserList" class="cloud-list"></div>' +
        '<div class="ms-actions" style="margin-top:10px;">' +
          '<input id="cloudNewName" class="s4-input" type="text" placeholder="Nuevo nickname...">' +
          '<button id="cloudCreateBtn" class="btn">Crear</button>' +
        '</div>' +
        '<div class="ob-actions"><button id="cloudCloseBtn" class="btn">Cerrar</button></div>' +
      '</div>';
    document.body.appendChild(modal);

    document.getElementById("cloudCloseBtn").addEventListener("click", function () {
      modal.classList.add("hidden");
    });

    document.getElementById("cloudCreateBtn").addEventListener("click", function () {
      var name = (document.getElementById("cloudNewName").value || "").trim();
      if (!name) {
        return;
      }

      var id = "U-" + Date.now();

      appState = (typeof defaultAppState === "function") ? defaultAppState() : {};
      appState.nickname = name;

      if (typeof saveAppState === "function") {
        saveAppState();
      }

      setCloudUserId(id);
      cloudSync();
      updateCloudChip();
      modal.classList.add("hidden");

      if (typeof aurixSpeakQueued === "function") {
        aurixSpeakQueued("Usuario creado: " + name);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectCloudUI);
  } else {
    injectCloudUI();
  }

  setTimeout(function () {
    var id = cloudUserId();
    if (id && window.AURIX_API.indexOf("PEGAR_AQUI") !== 0) {
      window.aurixCloudLoad(id);
    }
  }, 1200);
})();


/* ============================================
   GUARDIAN 9:16: DETECTA DESBORDE Y COMPACTA
============================================ */

(function () {
  if (window.__aurixFitGuard) {
    return;
  }

  window.__aurixFitGuard = true;

  function checkFit() {
    var over = document.documentElement.scrollWidth > window.innerWidth + 1;
    document.body.classList.toggle("fit-overflow", over);
  }

  setInterval(checkFit, 1200);
  window.addEventListener("resize", checkFit);
  window.addEventListener("orientationchange", checkFit);
})();


/* ============================================
   SKIP DE ACTIVACION PARA USUARIOS CON AVANCE
   La pantalla "Sistema activo / personalizar"
   solo existe para la PRIMERA interaccion.
============================================ */

function aurixGoToPanel() {
  if (typeof ensureOnboardingScreen !== "function" || typeof renderSessionsPanel !== "function") {
    return;
  }

  var container = ensureOnboardingScreen();

  renderSessionsPanel(container);

  if (typeof showScreen === "function") {
    showScreen(container);
  }

  if (typeof aurixWelcomeBack === "function") {
    aurixWelcomeBack();
  }
}

function aurixHasProgress() {
  var s = (typeof appState !== "undefined") ? appState : {};

  var ses = s.sessions || {};

  return Boolean(
    s.onboardingCompleted ||
    s.mission1Completed ||
    ses.session2Completed ||
    ses.session3Completed ||
    ses.session4Completed
  );
}

/* Override: la activacion completa solo para usuarios nuevos */
async function startActivation() {
  if (typeof ensureTTS === "function") {
    await ensureTTS();
  }

  if (window.AurixTTS) {
    window.AurixTTS.setEnabled(true);
  }

  /* Usuario con avance: directo al panel, sin pantalla sobrante */
  if (aurixHasProgress()) {
    aurixGoToPanel();
    return;
  }

  /* Usuario nuevo: activacion completa original */
  if (window.AurixTTS) {
    await window.AurixTTS.speakRichText("Iniciando sistema.", "narrator");
  }

  showScreen(activation);

  var progress = 0;
  var progressFill = document.getElementById("progressFill");

  var interval = setInterval(function () {
    progress = progress + 4;

    if (progress > 100) {
      progress = 100;
    }

    if (progressFill) {
      progressFill.style.width = progress + "%";
    }

    if (progress === 100) {
      clearInterval(interval);
      finishActivation();
    }
  }, 80);
}

/* ============================================
   BOTON DE REGRESO + HISTORIAL DE NAVEGACION
============================================ */

(function () {
  if (window.__aurixNavInjected) {
    return;
  }

  window.__aurixNavInjected = true;

  window.__aurixHistory = [];

  var navigatingBack = false;

  var FN_NAMES = [
    "renderOnboardingStep",
    "renderSessionsPanel",
    "renderWelcome",
    "renderDna",
    "renderMissionIntro",
    "renderMissionProfileName",
    "renderMissionProfileAge",
    "renderMissionProfileFrom",
    "renderMissionProfileOccupation",
    "renderMissionProfileLikes",
    "renderMissionFinalIntro",
    "renderMissionTeach",
    "renderMissionPractice",
    "renderMissionResponse",
    "renderMissionComplete",
    "renderSession2Intro",
    "renderSession2Theory",
    "renderSession2Pronouns",
    "renderSession2Blocks",
    "renderSession2Teach",
    "renderSession2Exercise",
    "renderSession2Table",
    "renderSession2Complete",
    "renderSession3Intro",
    "renderSession3Rule",
    "renderSession3Theory",
    "renderSession3Gerund",
    "renderSession3Contrast",
    "renderSession3Exercise",
    "renderSession3ExerciseA",
    "renderSession3ExerciseB",
    "renderSession3Complete",
    "renderSession4Intro",
    "renderSession4Rule",
    "renderSession4Gerund",
    "renderSession4Contrast",
    "renderSession4ExerciseA",
    "renderSession4ExerciseB",
    "renderSession4Complete",
    "renderSession6Intro",
    "renderSession6B1",
    "renderSession6B1Ex",
    "renderSession6B2",
    "renderSession6B2Ex",
    "renderSession6B3",
    "renderSession6B3Ex",
    "renderSession6Complete",
    "renderSession7Intro",
    "renderSession7B7",
    "renderSession7B7Ex",
    "renderSession7B8",
    "renderSession7B8Ex",
    "renderSession7B9",
    "renderSession7B9Ex",
    "renderSession7Complete"
  ];

  function argsKey(args) {
    var parts = [];
    for (var i = 0; i < args.length; i++) {
      var a = args[i];
      if (a && a.nodeType) {
        continue;
      }
      parts.push(String(a));
    }
    return parts.join("|");
  }

  function pushHistory(fn, args) {
    if (navigatingBack) {
      return;
    }

    var key = fn + ":" + argsKey(args);
    var last = window.__aurixHistory[window.__aurixHistory.length - 1];

    if (last && last.key === key) {
      return;
    }

    window.__aurixHistory.push({
      fn: fn,
      args: Array.prototype.slice.call(args),
      key: key
    });

    if (window.__aurixHistory.length > 40) {
      window.__aurixHistory.shift();
    }

    updateBackBtn();
  }

  function updateBackBtn() {
    var btn = document.getElementById("aurixBackBtn");
    if (!btn) {
      return;
    }
    btn.classList.toggle("hidden", window.__aurixHistory.length <= 1);
  }

  window.aurixGoBack = function () {
    if (window.__aurixHistory.length <= 1) {
      return;
    }

    window.__aurixHistory.pop();

    var prev = window.__aurixHistory[window.__aurixHistory.length - 1];

    if (!prev) {
      return;
    }

    navigatingBack = true;

    try {
      var fn = window[prev.fn];
      if (typeof fn === "function") {
        fn.apply(null, prev.args);
      }
    } finally {
      navigatingBack = false;
    }

    updateBackBtn();
  };

  function wrapAll() {
    FN_NAMES.forEach(function (name) {
      var orig = window[name];

      if (typeof orig !== "function" || orig.__aurixWrappedNav) {
        return;
      }

      var wrapped = function () {
        pushHistory(name, arguments);
        return orig.apply(this, arguments);
      };

      wrapped.__aurixWrappedNav = true;
      window[name] = wrapped;
    });
  }

  function injectBackBtn() {
    if (document.getElementById("aurixBackBtn")) {
      return;
    }

    var btn = document.createElement("button");
    btn.id = "aurixBackBtn";
    btn.type = "button";
    btn.className = "aurix-back-btn hidden";
    btn.innerHTML = "←";
    btn.setAttribute("aria-label", "Regresar a la pantalla anterior");
    document.body.appendChild(btn);

    btn.addEventListener("click", function () {
      window.aurixGoBack();
    });

    updateBackBtn();
  }

  wrapAll();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectBackBtn);
  } else {
    injectBackBtn();
  }
})();

/* ============================================
   LOGROS Y METAS: LEER DE LA DB Y MOSTRAR
============================================ */

(function () {
  if (window.__aurixLogrosPatch) {
    return;
  }

  window.__aurixLogrosPatch = true;

  /* Extender la carga de usuario para traer logros y metas */
  var origLoad = window.aurixCloudLoad;

  if (typeof origLoad === "function") {
    window.aurixCloudLoad = function (userId, cb) {
      origLoad(userId, function (data) {
        if (data && data.ok) {
          appState.logros = (data.logros || []).map(function (r) {
            return {
              id: r.logro_id,
              name: r.logro_name,
              category: r.category,
              detail: r.detail
            };
          });

          appState.metas = (data.metas || []).map(function (r) {
            return {
              type: String(r.meta_type).replace(/_/g, " "),
              target: Number(r.target) || 0,
              current: Number(r.current) || 0,
              status: r.status
            };
          });

          if (typeof saveAppState === "function") {
            saveAppState();
          }
        }
        if (cb) cb(data);
      });
    };
  }

  /* Mostrar logros y metas dentro del panel de progreso */
  var origPanel = window.renderProgressPanel;

  if (typeof origPanel === "function") {
    window.renderProgressPanel = function (container) {
      origPanel(container);

      var list = document.getElementById("prList");
      if (!list) return;

      var logros = (typeof appState !== "undefined" && appState.logros) ? appState.logros : [];
      var metas = (typeof appState !== "undefined" && appState.metas) ? appState.metas : [];

      var block = document.createElement("div");
      block.style.marginTop = "14px";

      var html = '<div class="ms-title" style="margin-bottom:8px;">🏆 Logros y metas</div>';

      if (metas.length) {
        metas.forEach(function (m) {
          html +=
            '<div class="mp-profile-item" style="margin-top:6px;">' +
              '<div class="mp-profile-label">' + m.type + '</div>' +
              '<div class="mp-profile-value">' + m.current + '/' + m.target + ' · ' + m.status + '</div>' +
            '</div>';
        });
      }

      if (logros.length) {
        logros.forEach(function (l) {
          html +=
            '<div class="mp-profile-item" style="margin-top:6px;">' +
              '<div class="mp-profile-label">🏆 ' + l.name + '</div>' +
              '<div class="mp-profile-value" style="font-size:10px;">' + l.detail + '</div>' +
            '</div>';
        });
      } else {
        html += '<div class="ms-sub">Aún no hay logros. ¡Practica para ganarlos!</div>';
      }

      block.innerHTML = html;
      list.appendChild(block);
    };
  }
})();

/* ============================================
   SESION 5: NEGACION Y VERBOS AUXILIARES
   Método: auxiliares por persona + NOT después
   del auxiliar + 15 ejercicios mezclados.
============================================ */

function ssSession5Done() {
  var s = ssGetSessions();
  return Boolean(s.session5Completed);
}

function ssSession6Done() {
  var s = ssGetSessions();
  return Boolean(s.session6Completed);
}

function ssSession7Done() {
  var s = ssGetSessions();
  return Boolean(s.session7Completed);
}

var S5_EXERCISES = [
  { es: "No corro.", en: ["i do not run", "i don't run"] },
  { es: "No bailas.", en: ["you do not dance", "you don't dance"] },
  { es: "No comemos.", en: ["we do not eat", "we don't eat"] },
  { es: "No cantan.", en: ["they do not sing", "they don't sing"] },
  { es: "No piensas.", en: ["you do not think", "you don't think"] },
  { es: "No intento.", en: ["i do not try", "i don't try"] },
  { es: "No esperamos.", en: ["we do not wait", "we don't wait"] },
  { es: "No duermen.", en: ["they do not sleep", "they don't sleep"] },
  { es: "Él no está escribiendo.", en: ["he is not writing", "he isn't writing", "he's not writing"] },
  { es: "Ella no está leyendo.", en: ["she is not reading", "she isn't reading", "she's not reading"] },
  { es: "Él no está trabajando.", en: ["he is not working", "he isn't working", "he's not working"] },
  { es: "Ella no está estudiando.", en: ["she is not studying", "she isn't studying", "she's not studying"] },
  { es: "Eso no está corriendo.", en: ["it is not running", "it isn't running", "it's not running"] },
  { es: "Él no está esperando.", en: ["he is not waiting", "he isn't waiting", "he's not waiting"] },
  { es: "Ella no está cantando.", en: ["she is not singing", "she isn't singing", "she's not singing"] }
];

/* ---------- INTRO ---------- */
function renderSession5Intro(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">SESIÓN 5</div>' +
      '<h2 class="ob-title">Negación y Verbos Auxiliares</h2>' +
      '<p class="ob-sub">Los auxiliares definen el tiempo de la oración. Y para negar, la palabra "not" siempre va después del auxiliar.</p>' +
      '<div class="ob-actions"><button id="s5Start" class="btn">Comenzar</button></div>' +
    '</div>';

  document.getElementById("s5Start").onclick = function () {
    renderSession5Aux(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Sesión cinco. Negación y verbos auxiliares. Los auxiliares definen el tiempo de la oración, y la palabra not siempre va después del auxiliar.", "narrator");
  }
}

/* ---------- AUXILIARES POR PERSONA ---------- */
function renderSession5Aux(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">VERBOS AUXILIARES</div>' +
      '<h2 class="ob-title">¿Quién define el tiempo?</h2>' +
      '<div class="s4-rule"><b>TIEMPO CONTINUO → auxiliar TO BE</b><br>1ª persona → ' + ssDisplayEn("AM") + '<br>2ªs personas → ' + ssDisplayEn("ARE") + '<br>3ªs personas → ' + ssDisplayEn("IS") + '</div>' +
      '<div class="s4-rule"><b>TIEMPO SIMPLE → auxiliar DO / DOES</b><br>1ª y 2ªs personas → ' + ssDisplayEn("DO") + '<br>3ªs personas (he, she, it) → ' + ssDisplayEn("DOES") + '</div>' +
      '<div class="s4-rule"><b>¿Para qué sirven?</b><br>Los verbos auxiliares acompañan al verbo principal para definir el tiempo o la modalidad de la oración.</div>' +
      '<div class="ob-actions"><button id="s5AuxNext" class="btn">Continuar</button></div>' +
    '</div>';

  document.getElementById("s5AuxNext").onclick = function () {
    renderSession5Rule(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("En el tiempo continuo el auxiliar es to be: am, are, is. En el tiempo simple el auxiliar es do, y does para terceras personas. Los auxiliares definen el tiempo de la oración.", "narrator");
  }
}

/* ---------- REGLA DE ORO DE LA NEGACION ---------- */
function renderSession5Rule(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">REGLA DE ORO</div>' +
      '<h2 class="ob-title">"not" después del auxiliar</h2>' +
      '<div class="s4-rule"><b>SIMPLE:</b> Sujeto + do/does + ' + ssDisplayEn("not") + ' + verbo (sin -ing).<br>' + ssDisplayEn("I do not run.") + ' = No corro.</div>' +
      '<div class="s4-rule"><b>CONTINUO:</b> Sujeto + am/is/are + ' + ssDisplayEn("not") + ' + verbo con -ing.<br>' + ssDisplayEn("He is not writing.") + ' = Él no está escribiendo.</div>' +
      '<div class="s4-rule"><b>Regla absoluta:</b> para negar en inglés, la palabra "not" debe estar después del auxiliar. Punto.</div>' +
      '<div class="ob-actions"><button id="s5RuleNext" class="btn">Ir a ejercicios</button></div>' +
    '</div>';

  document.getElementById("s5RuleNext").onclick = function () {
    renderSession5Exercise(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Para negar en inglés, la palabra not siempre va después del auxiliar. En simple: do not o does not, sin gerundio. En continuo: is not, are not, am not, con gerundio.", "narrator");
  }
}

/* ---------- 15 EJERCICIOS MEZCLADOS ---------- */
function renderSession5Exercise(container) {
  var rows = "";

  S5_EXERCISES.forEach(function (item, i) {
    rows +=
      '<div class="s4-row">' +
        '<div class="s4-es">' + (i + 1) + '. ' + item.es + '</div>' +
        '<input id="s5e' + i + '" class="s4-input" type="text" placeholder="Escribe la negación en inglés...">' +
        '<div id="s5f' + i + '" class="s4-answer"></div>' +
      '</div>';
  });

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">EJERCICIOS</div>' +
      '<h2 class="ob-title">Niega en inglés</h2>' +
      '<p class="ob-sub">Simple: 1ª y 2ª personas con do. Continuo: 3ªs personas con is + -ing. Recuerda: "not" después del auxiliar.</p>' +
      rows +
      '<div id="s5Score" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="s5Check" class="btn">Revisar</button>' +
        '<button id="s5Next" class="btn" disabled>Completar sesión</button>' +
      '</div>' +
    '</div>';

  document.getElementById("s5Check").onclick = function () {
    var score = 0;

    S5_EXERCISES.forEach(function (item, i) {
      var inp = document.getElementById("s5e" + i);
      var fb = document.getElementById("s5f" + i);
      var val = s4Norm(inp.value);
      var ok = item.en.indexOf(val) > -1;

      if (ok) score++;

      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + item.en[0] + ".";
    });

    window.__s5Score = score;

    document.getElementById("s5Score").textContent =
      "Resultado: " + score + "/" + S5_EXERCISES.length;

    document.getElementById("s5Next").disabled = false;
  };

  document.getElementById("s5Next").onclick = function () {
    renderSession5Complete(container, window.__s5Score || 0);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Quince ejercicios mezclados. Escribe la negación en inglés. Recuerda que not siempre va después del auxiliar.", "narrator");
  }
}

/* ---------- COMPLETAR ---------- */
function renderSession5Complete(container, score) {
  var s = ssGetSessions();

  s.session5Completed = true;
  s.session5Score = score;

  if (typeof appState !== "undefined") {
    appState.lastInteraction = "Sesión 5: Negación y Verbos Auxiliares";
  }

  ssSave();

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">SESIÓN 5</div>' +
      '<h2 class="ob-title">Sesión 5 completada</h2>' +
      '<div class="mp-profile-summary">' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Negaciones</div><div class="mp-profile-value">' + score + '/15</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Regla aplicada</div><div class="mp-profile-value">"not" después del auxiliar</div></div>' +
      '</div>' +
      '<p class="ob-sub">Dominaste la negación en los dos tiempos, sin mezclar personas.</p>' +
      '<div class="ob-actions"><button id="s5Back" class="btn">Volver al panel</button></div>' +
    '</div>';

  document.getElementById("s5Back").onclick = function () {
    renderSessionsPanel(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Sesión cinco completada. La palabra not ya siempre va después del auxiliar en tu mente. " + ssEnQuote("Excellent work."), "narrator");
  }
}

/* ============================================
   SESION 6: NIVEL 1 - VERBO TO BE
   Tres bloques internos:
   B1 Afirmativo | B2 Negativo | B3 Interrogativo
   Regla #9: toda palabra en ingles con su traduccion.
============================================ */

var S6_VOCAB = [
  { en: "student", es: "estudiante" },
  { en: "teacher", es: "maestro / maestra" },
  { en: "citizen", es: "ciudadano / ciudadana" },
  { en: "friend", es: "amigo / amiga" },
  { en: "book", es: "libro" },
  { en: "library", es: "biblioteca" },
  { en: "class", es: "clase" },
  { en: "campus", es: "campus" },
  { en: "pen", es: "bolígrafo" },
  { en: "bus", es: "autobús" },
  { en: "city", es: "ciudad" }
];

var S6_TABLE = [
  { es: "yo", en: "I", ans: "am" },
  { es: "tú / ustedes", en: "you", ans: "are" },
  { es: "nosotros", en: "we", ans: "are" },
  { es: "ellos / ellas", en: "they", ans: "are" },
  { es: "él", en: "he", ans: "is" },
  { es: "ella", en: "she", ans: "is" },
  { es: "eso", en: "it", ans: "is" }
];

var S6_EX_B1 = [
  { es: "Yo soy un estudiante.", en: ["i am a student"] },
  { es: "Tú eres un ciudadano.", en: ["you are a citizen"] },
  { es: "Él es un maestro.", en: ["he is a teacher"] },
  { es: "Ella está en la biblioteca.", en: ["she is in the library"] },
  { es: "Eso es un libro.", en: ["it is a book"] },
  { es: "Nosotros estamos en clase.", en: ["we are in class"] },
  { es: "Ellos son amigos.", en: ["they are friends"] },
  { es: "Ellas son estudiantes.", en: ["they are students"] },
  { es: "Ustedes son ciudadanos.", en: ["you are citizens"] },
  { es: "Yo estoy en el campus.", en: ["i am on the campus", "i am at the campus"] }
];

var S6_EX_B2 = [
  { es: "Yo no soy un maestro.", en: ["i am not a teacher"] },
  { es: "Tú no eres un ciudadano.", en: ["you are not a citizen"] },
  { es: "Él no está en la biblioteca.", en: ["he is not in the library"] },
  { es: "Ella no es una maestra.", en: ["she is not a teacher"] },
  { es: "Eso no es un bolígrafo.", en: ["it is not a pen"] },
  { es: "Nosotros no estamos en el autobús.", en: ["we are not on the bus"] },
  { es: "Ellos no son maestros.", en: ["they are not teachers"] },
  { es: "Ellas no son amigas.", en: ["they are not friends"] },
  { es: "Ustedes no son estudiantes.", en: ["you are not students"] },
  { es: "Yo no estoy en la ciudad.", en: ["i am not in the city"] }
];

var S6_EX_B3 = [
  { es: "¿Eres tú un estudiante?", en: ["are you a student"] },
  { es: "Sí, yo soy.", en: ["yes i am"] },
  { es: "¿Es él un maestro?", en: ["is he a teacher"] },
  { es: "No, él no es.", en: ["no he is not", "no he isn't"] },
  { es: "¿Está ella en la biblioteca?", en: ["is she in the library"] },
  { es: "Sí, ella está.", en: ["yes she is"] },
  { es: "¿Son ellos amigos?", en: ["are they friends"] },
  { es: "No, ellos no son.", en: ["no they are not", "no they aren't"] },
  { es: "¿Estamos nosotros en clase?", en: ["are we in class"] },
  { es: "Sí, nosotros estamos.", en: ["yes we are"] }
];

/* ---------- INTRO ---------- */
function renderSession6Intro(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">SESIÓN 6</div>' +
      '<h2 class="ob-title">Nivel 1: Verbo To Be</h2>' +
      '<p class="ob-sub">' + ssDisplayEn("to be") + ' (ser / estar): el verbo más importante del inglés.</p>' +
      '<p class="ob-sub">Tres bloques: afirmativo, negativo e interrogativo. ~15 min cada uno.</p>' +
      '<div class="s4-rule"><b>REGLA DE ORO #9 — CERO PALABRAS SIN TRADUCCIÓN:</b> toda palabra en inglés que veas o escuches mostrará SIEMPRE su traducción al español en pantalla, y el tutor la dirá en voz alta. Nunca se asume que ya conoces el significado.</div>' +
      '<div class="ob-actions"><button id="s6Start" class="btn">Comenzar</button></div>' +
    '</div>';

  document.getElementById("s6Start").onclick = function () {
    renderSession6B1(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Sesión seis. Nivel uno: el verbo to be. Significa ser o estar. Hoy lo dominamos en tres bloques: afirmativo, negativo e interrogativo. Regla de oro número nueve: cero palabras sin traducción. Toda palabra en inglés siempre con su traducción en pantalla y en voz.", "narrator");
  }
}

/* ---------- BLOQUE 1: AFIRMATIVO + TABLA INTERACTIVA ---------- */
function renderSession6B1(container) {
  var rows = "";

  S6_TABLE.forEach(function (item, i) {
    rows +=
      '<div class="s6-row">' +
        '<div class="n0-es">' + escapeHtml(item.es) + '</div>' +
        '<div class="n0-en">' + escapeHtml(item.en) + '</div>' +
        '<div class="s6-ans">' +
          '<input id="s6tv' + i + '" class="n0-select" type="text" placeholder="am / are / is" autocomplete="off" autocapitalize="off">' +
          '<div id="s6tvf' + i + '" class="s4-answer"></div>' +
        '</div>' +
      '</div>';
  });

  var vocabChips = S6_VOCAB.slice(0, 8).map(function (v) {
    return '<span class="ob-chip s6-chip">' + escapeHtml(v.en) + ' = ' + escapeHtml(v.es) + '</span>';
  }).join("");

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE 1</div>' +
      '<h2 class="ob-title">To Be Afirmativo</h2>' +
      '<div class="s4-rule"><b>' + ssDisplayEn("to be") + '</b> = ser / estar. Se conjuga según el bloque del Nivel 0.</div>' +
      '<div class="s6-vocab"><b>Vocabulario de este bloque:</b><br>' + vocabChips + '</div>' +
      '<div class="rod-channels">' +
        '<div class="rod-channel c1">' +
          '<div class="rod-channel-title">Bloque I</div>' +
          '<div class="rod-channel-pronouns">' + ssDisplayEn("I") + '</div>' +
          '<div class="rod-channel-verb">' + ssDisplayEn("am") + '</div>' +
          '<div class="n0-block-es">Yo soy / estoy</div>' +
        '</div>' +
        '<div class="rod-channel c2">' +
          '<div class="rod-channel-title">Bloque YOU-WE-THEY</div>' +
          '<div class="rod-channel-pronouns">' + ssDisplayEn("You, We, They") + '</div>' +
          '<div class="rod-channel-verb">' + ssDisplayEn("are") + '</div>' +
          '<div class="n0-block-es">Tú/ustedes son · Nosotros somos · Ellos son</div>' +
        '</div>' +
        '<div class="rod-channel c3">' +
          '<div class="rod-channel-title">Bloque HE-SHE-IT</div>' +
          '<div class="rod-channel-pronouns">' + ssDisplayEn("He, She, It") + '</div>' +
          '<div class="rod-channel-verb">' + ssDisplayEn("is") + '</div>' +
          '<div class="n0-block-es">Él es · Ella es · Eso es</div>' +
        '</div>' +
      '</div>' +
      '<div class="s4-rule">' +
        ssDisplayEn("I am a student.") + ' (yo soy un estudiante)<br>' +
        ssDisplayEn("You are a citizen.") + ' (tú eres un ciudadano)<br>' +
        ssDisplayEn("He is a teacher.") + ' (él es un maestro)<br>' +
        ssDisplayEn("She is in the library.") + ' (ella está en la biblioteca)<br>' +
        ssDisplayEn("It is a book.") + ' (eso es un libro)<br>' +
        ssDisplayEn("We are in class.") + ' (nosotros estamos en clase)<br>' +
        ssDisplayEn("They are friends.") + ' (ellos son amigos)' +
      '</div>' +
      '<p class="ob-sub">Completa la tabla: escribe <b>am</b>, <b>are</b> o <b>is</b> para cada persona. Primero piensa, luego revisa.</p>' +
      '<div class="n0-table">' +
        '<div class="n0-table-head"><span>Español</span><span>Inglés</span><span>am / are / is</span></div>' +
        rows +
      '</div>' +
      '<div id="s6TableScore" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="s6Check" class="btn">Revisar</button>' +
        '<button id="s6B1Next" class="btn" disabled>Continuar a ejercicios</button>' +
      '</div>' +
    '</div>';

  document.getElementById("s6Check").onclick = function () {
    var tableScore = 0;

    S6_TABLE.forEach(function (item, i) {
      var inp = document.getElementById("s6tv" + i);
      var fb = document.getElementById("s6tvf" + i);
      var ok = s4Norm(inp.value) === item.ans;

      if (ok) tableScore++;

      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + item.ans + ".";
    });

    window.__s6score = (window.__s6score || 0) + tableScore;

    document.getElementById("s6TableScore").textContent =
      "Resultado: " + tableScore + "/" + S6_TABLE.length;

    document.getElementById("s6B1Next").disabled = false;
  };

  document.getElementById("s6B1Next").onclick = function () {
    renderSession6B1Ex(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Bloque uno, afirmativo. El verbo to be significa ser o estar. I usa am. You, we, they usan are. He, she, it usan is. Ejemplos: I am a student, yo soy un estudiante. You are a citizen, tú eres un ciudadano. He is a teacher, él es un maestro. Completa la tabla con am, are o is.", "narrator");
  }
}

/* ---------- BLOQUE 1: EJERCICIOS DE TRADUCCION ---------- */
function renderSession6B1Ex(container) {
  var rows = "";

  S6_EX_B1.forEach(function (item, i) {
    rows +=
      '<div class="s4-row">' +
        '<div class="s4-es">' + (i + 1) + '. ' + item.es + '</div>' +
        '<input id="s6b1e' + i + '" class="s4-input" type="text" placeholder="Escribe en inglés...">' +
        '<div id="s6b1f' + i + '" class="s4-answer"></div>' +
      '</div>';
  });

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE 1 · EJERCICIOS</div>' +
      '<h2 class="ob-title">Traduce al inglés</h2>' +
      '<p class="ob-sub">Traduce cada oración usando el verbo to be. Recuerda el bloque de cada persona.</p>' +
      rows +
      '<div id="s6b1Score" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="s6b1Check" class="btn">Revisar</button>' +
        '<button id="s6b1Next" class="btn" disabled>Continuar a Negativo</button>' +
      '</div>' +
    '</div>';

  document.getElementById("s6b1Check").onclick = function () {
    var score = 0;

    S6_EX_B1.forEach(function (item, i) {
      var inp = document.getElementById("s6b1e" + i);
      var fb = document.getElementById("s6b1f" + i);
      var val = s4Norm(inp.value);
      var ok = item.en.indexOf(val) > -1;

      if (ok) score++;

      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + item.en[0] + ".";
    });

    window.__s6score = (window.__s6score || 0) + score;

    document.getElementById("s6b1Score").textContent =
      "Resultado: " + score + "/" + S6_EX_B1.length;

    document.getElementById("s6b1Next").disabled = false;
  };

  document.getElementById("s6b1Next").onclick = function () {
    renderSession6B2(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Diez oraciones para traducir al inglés. Recuerda: I am, you are, he is, she is, it is, we are, they are. Ejemplo: yo soy un estudiante, I am a student.", "narrator");
  }
}

/* ---------- BLOQUE 2: NEGATIVO ---------- */
function renderSession6B2(container) {
  var vocabChips = S6_VOCAB.slice(8, 11).map(function (v) {
    return '<span class="ob-chip s6-chip">' + escapeHtml(v.en) + ' = ' + escapeHtml(v.es) + '</span>';
  }).join("");

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE 2</div>' +
      '<h2 class="ob-title">To Be Negativo</h2>' +
      '<div class="s6-vocab"><b>Vocabulario de este bloque:</b><br>' + vocabChips + '</div>' +
      '<div class="s4-rule"><b>Regla de oro:</b> para negar, la palabra ' + ssDisplayEn("not") + ' (no) va justo después del auxiliar.</div>' +
      '<div class="s4-rule">' +
        ssDisplayEn("I am not a teacher.") + ' (yo no soy un maestro)<br>' +
        ssDisplayEn("You are not a citizen.") + ' (tú no eres un ciudadano)<br>' +
        ssDisplayEn("He is not in the library.") + ' (él no está en la biblioteca)<br>' +
        ssDisplayEn("It is not a pen.") + ' (eso no es un bolígrafo)<br>' +
        ssDisplayEn("They are not on the bus.") + ' (ellos no están en el autobús)' +
      '</div>' +
      '<div class="s4-rule"><b>Contracciones:</b> ' + ssDisplayEn("isn't") + ' (no es / no está) · ' + ssDisplayEn("aren't") + ' (no eres / no son).</div>' +
      '<div class="ob-actions"><button id="s6B2Next" class="btn">Ir a ejercicios</button></div>' +
    '</div>';

  document.getElementById("s6B2Next").onclick = function () {
    renderSession6B2Ex(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Bloque dos, negativo. Para negar, la palabra not va después del auxiliar. I am not, yo no soy. You are not, tú no eres. He is not, él no es. Las contracciones: isn't, aren't. Ejemplo: It is not a pen, eso no es un bolígrafo.", "narrator");
  }
}

/* ---------- BLOQUE 2: EJERCICIOS ---------- */
function renderSession6B2Ex(container) {
  var rows = "";

  S6_EX_B2.forEach(function (item, i) {
    rows +=
      '<div class="s4-row">' +
        '<div class="s4-es">' + (i + 1) + '. ' + item.es + '</div>' +
        '<input id="s6b2e' + i + '" class="s4-input" type="text" placeholder="Escribe la negación en inglés...">' +
        '<div id="s6b2f' + i + '" class="s4-answer"></div>' +
      '</div>';
  });

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE 2 · EJERCICIOS</div>' +
      '<h2 class="ob-title">Niega en inglés</h2>' +
      '<p class="ob-sub">Traduce cada oración en negativo. "not" siempre después del auxiliar.</p>' +
      rows +
      '<div id="s6b2Score" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="s6b2Check" class="btn">Revisar</button>' +
        '<button id="s6b2Next" class="btn" disabled>Continuar a Interrogativo</button>' +
      '</div>' +
    '</div>';

  document.getElementById("s6b2Check").onclick = function () {
    var score = 0;

    S6_EX_B2.forEach(function (item, i) {
      var inp = document.getElementById("s6b2e" + i);
      var fb = document.getElementById("s6b2f" + i);
      var val = s4Norm(inp.value);
      var ok = item.en.indexOf(val) > -1;

      if (ok) score++;

      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + item.en[0] + ".";
    });

    window.__s6score = (window.__s6score || 0) + score;

    document.getElementById("s6b2Score").textContent =
      "Resultado: " + score + "/" + S6_EX_B2.length;

    document.getElementById("s6b2Next").disabled = false;
  };

  document.getElementById("s6b2Next").onclick = function () {
    renderSession6B3(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Diez oraciones negativas para traducir al inglés. Recuerda: not después del auxiliar. Ejemplo: yo no soy un maestro, I am not a teacher.", "narrator");
  }
}

/* ---------- BLOQUE 3: INTERROGATIVO ---------- */
function renderSession6B3(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE 3</div>' +
      '<h2 class="ob-title">To Be Interrogativo</h2>' +
      '<div class="s4-rule"><b>Regla:</b> el auxiliar va <b>antes</b> del pronombre. Así de simple.</div>' +
      '<div class="s4-rule">' +
        ssDisplayEn("Am I?") + ' (¿soy yo? / ¿estoy yo?)<br>' +
        ssDisplayEn("Are you?") + ' (¿eres tú? / ¿son ustedes?)<br>' +
        ssDisplayEn("Is he?") + ' (¿es él?)<br>' +
        ssDisplayEn("Is she?") + ' (¿es ella?)<br>' +
        ssDisplayEn("Is it?") + ' (¿es eso?)<br>' +
        ssDisplayEn("Are we?") + ' (¿somos nosotros?)<br>' +
        ssDisplayEn("Are they?") + ' (¿son ellos?)' +
      '</div>' +
      '<div class="s4-rule"><b>Respuestas cortas:</b><br>' +
        ssDisplayEn("Yes, I am.") + ' (sí, lo soy) · ' + ssDisplayEn("No, I am not.") + ' (no, no lo soy)<br>' +
        ssDisplayEn("Yes, they are.") + ' (sí, lo son) · ' + ssDisplayEn("No, they are not.") + ' (no, no lo son)' +
      '</div>' +
      '<div class="s4-rule">' +
        ssDisplayEn("Are you a student?") + ' (¿eres tú un estudiante?) → ' + ssDisplayEn("Yes, I am.") + ' (sí, lo soy)<br>' +
        ssDisplayEn("Is he a teacher?") + ' (¿es él un maestro?) → ' + ssDisplayEn("No, he is not.") + ' (no, él no es)' +
      '</div>' +
      '<div class="ob-actions"><button id="s6B3Next" class="btn">Ir a ejercicios</button></div>' +
    '</div>';

  document.getElementById("s6B3Next").onclick = function () {
    renderSession6B3Ex(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Bloque tres, interrogativo. El auxiliar va antes del pronombre: Am I, are you, is he. Respuestas cortas: yes, I am; no, he is not. Ejemplo: Are you a student? ¿eres tú un estudiante?", "narrator");
  }
}

/* ---------- BLOQUE 3: EJERCICIOS ---------- */
function renderSession6B3Ex(container) {
  var rows = "";

  S6_EX_B3.forEach(function (item, i) {
    rows +=
      '<div class="s4-row">' +
        '<div class="s4-es">' + (i + 1) + '. ' + item.es + '</div>' +
        '<input id="s6b3e' + i + '" class="s4-input" type="text" placeholder="Escribe la pregunta o respuesta en inglés...">' +
        '<div id="s6b3f' + i + '" class="s4-answer"></div>' +
      '</div>';
  });

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE 3 · EJERCICIOS</div>' +
      '<h2 class="ob-title">Pregunta y responde</h2>' +
      '<p class="ob-sub">Traduce cada pregunta o respuesta corta. El auxiliar va antes del pronombre.</p>' +
      rows +
      '<div id="s6b3Score" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="s6b3Check" class="btn">Revisar</button>' +
        '<button id="s6b3Next" class="btn" disabled>Completar sesión</button>' +
      '</div>' +
    '</div>';

  document.getElementById("s6b3Check").onclick = function () {
    var score = 0;

    S6_EX_B3.forEach(function (item, i) {
      var inp = document.getElementById("s6b3e" + i);
      var fb = document.getElementById("s6b3f" + i);
      var val = s4Norm(inp.value);
      var ok = item.en.indexOf(val) > -1;

      if (ok) score++;

      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + item.en[0] + ".";
    });

    window.__s6score = (window.__s6score || 0) + score;

    document.getElementById("s6b3Score").textContent =
      "Resultado: " + score + "/" + S6_EX_B3.length;

    document.getElementById("s6b3Next").disabled = false;
  };

  document.getElementById("s6b3Next").onclick = function () {
    renderSession6Complete(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Diez preguntas y respuestas para traducir al inglés. Recuerda: el auxiliar va antes del pronombre. Ejemplo: ¿eres tú un estudiante? Are you a student?", "narrator");
  }
}

/* ---------- COMPLETAR ---------- */
function renderSession6Complete(container) {
  var s = ssGetSessions();
  var totalScore = window.__s6score || 0;

  s.session6Completed = true;
  s.session6Score = totalScore;

  if (typeof appState !== "undefined") {
    appState.lastInteraction = "Sesión 6: Nivel 1 Verbo To Be";
  }

  ssSave();

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">SESIÓN 6</div>' +
      '<h2 class="ob-title">Nivel 1 completado</h2>' +
      '<div class="mp-profile-summary">' +
        '<div class="mp-profile-item"><div class="mp-profile-label">To Be</div><div class="mp-profile-value">' + totalScore + '/27</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Dominado</div><div class="mp-profile-value">Afirmativo · Negativo · Interrogativo</div></div>' +
      '</div>' +
      '<p class="ob-sub">Ya conjugas el verbo to be en los tres modos. Regla #9 aplicada: todo inglés siempre con su traducción.</p>' +
      '<div class="ob-actions"><button id="s6Back" class="btn">Volver al panel</button></div>' +
    '</div>';

  document.getElementById("s6Back").onclick = function () {
    renderSessionsPanel(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Sesión seis completada. El verbo to be en afirmativo, negativo e interrogativo. " + ssEnQuote("Excellent work."), "narrator");
  }
}

/* ============================================
   SESION 7: NIVEL 1 - PREGUNTAS Y REPASO
   Tres bloques internos:
   B7 Preguntas simple (DO / DOES)
   B8 Preguntas continuo (AM / IS / ARE + -ing)
   B9 Repaso mezclado negación simple/continuo
   Regla #9: toda palabra en ingles con su traduccion.
============================================ */

var S7_VOCAB = [
  { en: "work", es: "trabajar" },
  { en: "study", es: "estudiar" },
  { en: "live", es: "vivir" },
  { en: "speak", es: "hablar" },
  { en: "read", es: "leer" },
  { en: "eat", es: "comer" },
  { en: "watch", es: "ver / mirar" },
  { en: "run", es: "correr" },
  { en: "need", es: "necesitar" },
  { en: "play", es: "jugar" },
  { en: "go", es: "ir" },
  { en: "sleep", es: "dormir" },
  { en: "write", es: "escribir" },
  { en: "dance", es: "bailar" },
  { en: "swim", es: "nadar" },
  { en: "city", es: "ciudad" },
  { en: "park", es: "parque" },
  { en: "water", es: "agua" },
  { en: "television", es: "televisión" },
  { en: "Monday", es: "lunes" },
  { en: "English", es: "inglés" }
];

var S7_TABLE_DO = [
  { es: "¿trabajas tú?", en: "you work", ans: "do" },
  { es: "¿estudia él?", en: "he study", ans: "does" },
  { es: "¿lee ella?", en: "she read", ans: "does" },
  { es: "¿comemos nosotros?", en: "we eat", ans: "do" },
  { es: "¿juegan ellos?", en: "they play", ans: "do" },
  { es: "¿va eso?", en: "it go", ans: "does" },
  { es: "¿duermo yo?", en: "I sleep", ans: "do" }
];

var S7_TABLE_AM = [
  { es: "¿estás trabajando tú?", en: "you working", ans: "are" },
  { es: "¿está estudiando él?", en: "he studying", ans: "is" },
  { es: "¿están comiendo ellos?", en: "they eating", ans: "are" },
  { es: "¿estoy escribiendo yo?", en: "I writing", ans: "am" },
  { es: "¿está leyendo ella?", en: "she reading", ans: "is" },
  { es: "¿estamos corriendo nosotros?", en: "we running", ans: "are" }
];

var S7_EX_B7 = [
  { es: "¿Trabajas tú?", en: ["do you work"] },
  { es: "¿Estudia ella?", en: ["does she study"] },
  { es: "¿Viven ellos en la ciudad?", en: ["do they live in the city"] },
  { es: "¿Hablas tú inglés?", en: ["do you speak english"] },
  { es: "¿Lee él libros?", en: ["does he read books"] },
  { es: "¿Comemos nosotros?", en: ["do we eat"] },
  { es: "¿Ve ella televisión?", en: ["does she watch television"] },
  { es: "¿Corren ellos en el parque?", en: ["do they run in the park"] },
  { es: "¿Necesitas tú agua?", en: ["do you need water"] },
  { es: "¿Trabaja él los lunes?", en: ["does he work on mondays"] },
  { es: "Sí, yo sí.", en: ["yes i do"] },
  { es: "No, él no.", en: ["no he doesn't", "no he does not"] }
];

var S7_EX_B8 = [
  { es: "¿Estás trabajando tú?", en: ["are you working"] },
  { es: "¿Está estudiando él?", en: ["is he studying"] },
  { es: "¿Están comiendo ellos?", en: ["are they eating"] },
  { es: "¿Está escribiendo ella?", en: ["is she writing"] },
  { es: "¿Estás leyendo tú?", en: ["are you reading"] },
  { es: "¿Estamos corriendo nosotros?", en: ["are we running"] },
  { es: "¿Está durmiendo él?", en: ["is he sleeping"] },
  { es: "¿Están bailando ellos?", en: ["are they dancing"] },
  { es: "Sí, yo sí.", en: ["yes i am"] },
  { es: "No, ellos no están.", en: ["no they are not", "no they aren't"] }
];

var S7_EX_B9 = [
  { es: "Yo no trabajo.", en: ["i do not work", "i don't work"] },
  { es: "Yo no estoy trabajando.", en: ["i am not working"] },
  { es: "Ella no estudia.", en: ["she does not study", "she doesn't study"] },
  { es: "Ella no está estudiando.", en: ["she is not studying"] },
  { es: "Ellos no viven en la ciudad.", en: ["they do not live in the city", "they don't live in the city"] },
  { es: "Ellos no están corriendo.", en: ["they are not running"] },
  { es: "Tú no hablas inglés.", en: ["you do not speak english", "you don't speak english"] },
  { es: "Tú no estás hablando.", en: ["you are not speaking"] },
  { es: "Él no ve televisión.", en: ["he does not watch television", "he doesn't watch television"] },
  { es: "Él no está viendo televisión.", en: ["he is not watching television"] },
  { es: "Nosotros no comemos.", en: ["we do not eat", "we don't eat"] },
  { es: "Nosotros no estamos comiendo.", en: ["we are not eating"] },
  { es: "Tú no trabajas.", en: ["you do not work", "you don't work"] },
  { es: "Tú no estás trabajando.", en: ["you are not working"] },
  { es: "Él no nada.", en: ["he does not swim", "he doesn't swim"] }
];

/* ---------- INTRO ---------- */
function renderSession7Intro(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">SESIÓN 7</div>' +
      '<h2 class="ob-title">Nivel 1: Preguntas y Repaso</h2>' +
      '<p class="ob-sub">' + ssDisplayEn("do") + ' / ' + ssDisplayEn("does") + ' (preguntas en simple) y ' + ssDisplayEn("am / is / are") + ' + -ing (preguntas en continuo).</p>' +
      '<p class="ob-sub">Tres bloques: preguntas simple, preguntas continuo y repaso mezclado. ~15 min cada uno.</p>' +
      '<div class="s4-rule"><b>REGLA DE ORO #9 — CERO PALABRAS SIN TRADUCCIÓN:</b> toda palabra en inglés que veas o escuches mostrará SIEMPRE su traducción al español en pantalla, y el tutor la dirá en voz alta. Nunca se asume que ya conoces el significado.</div>' +
      '<div class="ob-actions"><button id="s7Start" class="btn">Comenzar</button></div>' +
    '</div>';

  document.getElementById("s7Start").onclick = function () {
    renderSession7B7(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Sesión siete. Nivel uno: preguntas y repaso. Aprendemos a preguntar en presente simple con do y does, en presente continuo con am, is, are más ing. Y cerramos con un repaso mezclado de negación. Regla de oro número nueve: cero palabras sin traducción. Toda palabra en inglés siempre con su traducción en pantalla y en voz.", "narrator");
  }
}

/* ---------- BLOQUE 7: PREGUNTAS SIMPLE (DO / DOES) ---------- */
function renderSession7B7(container) {
  var rows = "";

  S7_TABLE_DO.forEach(function (item, i) {
    rows +=
      '<div class="s6-row">' +
        '<div class="n0-es">' + escapeHtml(item.es) + '</div>' +
        '<div class="n0-en">' + ssDisplayEn(item.en) + '</div>' +
        '<div class="s6-ans">' +
          '<input id="s7tv' + i + '" class="n0-select" type="text" placeholder="do / does" autocomplete="off" autocapitalize="off">' +
          '<div id="s7tvf' + i + '" class="s4-answer"></div>' +
        '</div>' +
      '</div>';
  });

  var vocabChips = S7_VOCAB.slice(0, 12).map(function (v) {
    return '<span class="ob-chip s6-chip">' + escapeHtml(v.en) + ' = ' + escapeHtml(v.es) + '</span>';
  }).join("");

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE 7</div>' +
      '<h2 class="ob-title">Preguntas en Simple</h2>' +
      '<div class="s6-vocab"><b>Vocabulario de este bloque:</b><br>' + vocabChips + '</div>' +
      '<div class="s4-rule"><b>Regla:</b> para preguntar en simple usamos el auxiliar ' + ssDisplayEn("do") + ' (1ª y 2ªs personas) o ' + ssDisplayEn("does") + ' (3ªs personas) <b>antes</b> del pronombre. El verbo va sin -s y sin -ing.</div>' +
      '<div class="s4-rule">' +
        ssDisplayEn("Do you work?") + ' (¿trabajas tú?)<br>' +
        ssDisplayEn("Does he study?") + ' (¿estudia él?)<br>' +
        ssDisplayEn("Do they live in the city?") + ' (¿viven ellos en la ciudad?)' +
      '</div>' +
      '<div class="s4-rule"><b>Respuestas cortas:</b><br>' +
        ssDisplayEn("Yes, I do.") + ' (sí, yo sí) · ' + ssDisplayEn("No, he doesn't.") + ' (no, él no)' +
      '</div>' +
      '<p class="ob-sub">Completa la tabla: escribe <b>do</b> o <b>does</b> para cada persona. Primero piensa, luego revisa.</p>' +
      '<div class="n0-table">' +
        '<div class="n0-table-head"><span>Español</span><span>Inglés</span><span>do / does</span></div>' +
        rows +
      '</div>' +
      '<div id="s7TableScore" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="s7Check" class="btn">Revisar</button>' +
        '<button id="s7B7Next" class="btn" disabled>Continuar a ejercicios</button>' +
      '</div>' +
    '</div>';

  document.getElementById("s7Check").onclick = function () {
    var tableScore = 0;

    S7_TABLE_DO.forEach(function (item, i) {
      var inp = document.getElementById("s7tv" + i);
      var fb = document.getElementById("s7tvf" + i);
      var ok = s4Norm(inp.value) === item.ans;

      if (ok) tableScore++;

      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + item.ans + ".";
    });

    window.__s7score = (window.__s7score || 0) + tableScore;

    document.getElementById("s7TableScore").textContent =
      "Resultado: " + tableScore + "/" + S7_TABLE_DO.length;

    document.getElementById("s7B7Next").disabled = false;
  };

  document.getElementById("s7B7Next").onclick = function () {
    renderSession7B7Ex(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Bloque siete, preguntas en presente simple. El auxiliar va antes del pronombre. Do para primera y segundas personas. Does para terceras personas. Ejemplos: do you work, ¿trabajas tú? Does he study, ¿estudia él? El verbo no lleva s ni ing. Completa la tabla con do o does.", "narrator");
  }
}

/* ---------- BLOQUE 7: EJERCICIOS ---------- */
function renderSession7B7Ex(container) {
  var rows = "";

  S7_EX_B7.forEach(function (item, i) {
    rows +=
      '<div class="s4-row">' +
        '<div class="s4-es">' + (i + 1) + '. ' + item.es + '</div>' +
        '<input id="s7b7e' + i + '" class="s4-input" type="text" placeholder="Escribe la pregunta en inglés...">' +
        '<div id="s7b7f' + i + '" class="s4-answer"></div>' +
      '</div>';
  });

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE 7 · EJERCICIOS</div>' +
      '<h2 class="ob-title">Pregunta en inglés</h2>' +
      '<p class="ob-sub">Traduce cada pregunta usando do o does. El verbo va sin -s y sin -ing.</p>' +
      rows +
      '<div id="s7b7Score" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="s7b7Check" class="btn">Revisar</button>' +
        '<button id="s7b7Next" class="btn" disabled>Continuar a Continuo</button>' +
      '</div>' +
    '</div>';

  document.getElementById("s7b7Check").onclick = function () {
    var score = 0;

    S7_EX_B7.forEach(function (item, i) {
      var inp = document.getElementById("s7b7e" + i);
      var fb = document.getElementById("s7b7f" + i);
      var val = s4Norm(inp.value);
      var ok = item.en.indexOf(val) > -1;

      if (ok) score++;

      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + item.en[0] + ".";
    });

    window.__s7score = (window.__s7score || 0) + score;

    document.getElementById("s7b7Score").textContent =
      "Resultado: " + score + "/" + S7_EX_B7.length;

    document.getElementById("s7b7Next").disabled = false;
  };

  document.getElementById("s7b7Next").onclick = function () {
    renderSession7B8(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Doce preguntas para traducir al inglés. Recuerda: do o does primero, el verbo sin s y sin ing. Ejemplo: ¿trabajas tú? Do you work.", "narrator");
  }
}

/* ---------- BLOQUE 8: PREGUNTAS CONTINUO (AM / IS / ARE + -ING) ---------- */
function renderSession7B8(container) {
  var rows = "";

  S7_TABLE_AM.forEach(function (item, i) {
    rows +=
      '<div class="s6-row">' +
        '<div class="n0-es">' + escapeHtml(item.es) + '</div>' +
        '<div class="n0-en">' + ssDisplayEn(item.en) + '</div>' +
        '<div class="s6-ans">' +
          '<input id="s7tv2' + i + '" class="n0-select" type="text" placeholder="am / is / are" autocomplete="off" autocapitalize="off">' +
          '<div id="s7tv2f' + i + '" class="s4-answer"></div>' +
        '</div>' +
      '</div>';
  });

  var vocabChips = S7_VOCAB.slice(12, 21).map(function (v) {
    return '<span class="ob-chip s6-chip">' + escapeHtml(v.en) + ' = ' + escapeHtml(v.es) + '</span>';
  }).join("");

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE 8</div>' +
      '<h2 class="ob-title">Preguntas en Continuo</h2>' +
      '<div class="s6-vocab"><b>Vocabulario de este bloque:</b><br>' + vocabChips + '</div>' +
      '<div class="s4-rule"><b>Regla:</b> para preguntar en continuo, el verbo to be (' + ssDisplayEn("am") + ' / ' + ssDisplayEn("is") + ' / ' + ssDisplayEn("are") + ') va <b>antes</b> del pronombre, y el verbo principal lleva -ing.</div>' +
      '<div class="s4-rule">' +
        ssDisplayEn("Are you working?") + ' (¿estás trabajando tú?)<br>' +
        ssDisplayEn("Is he studying?") + ' (¿está estudiando él?)<br>' +
        ssDisplayEn("Are they eating?") + ' (¿están comiendo ellos?)' +
      '</div>' +
      '<div class="s4-rule"><b>Contraste:</b><br>' +
        ssDisplayEn("Do you work?") + ' (¿trabajas tú? — rutina / hábito)<br>' +
        ssDisplayEn("Are you working?") + ' (¿estás trabajando? — ahora / en este momento)' +
      '</div>' +
      '<div class="s4-rule"><b>Respuestas cortas:</b><br>' +
        ssDisplayEn("Yes, I am.") + ' (sí, yo estoy) · ' + ssDisplayEn("No, they are not.") + ' (no, ellos no están)' +
      '</div>' +
      '<p class="ob-sub">Completa la tabla: escribe <b>am</b>, <b>is</b> o <b>are</b> para cada persona.</p>' +
      '<div class="n0-table">' +
        '<div class="n0-table-head"><span>Español</span><span>Inglés</span><span>am / is / are</span></div>' +
        rows +
      '</div>' +
      '<div id="s7TableScore2" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="s7Check2" class="btn">Revisar</button>' +
        '<button id="s7B8Next" class="btn" disabled>Continuar a ejercicios</button>' +
      '</div>' +
    '</div>';

  document.getElementById("s7Check2").onclick = function () {
    var tableScore = 0;

    S7_TABLE_AM.forEach(function (item, i) {
      var inp = document.getElementById("s7tv2" + i);
      var fb = document.getElementById("s7tv2f" + i);
      var ok = s4Norm(inp.value) === item.ans;

      if (ok) tableScore++;

      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + item.ans + ".";
    });

    window.__s7score = (window.__s7score || 0) + tableScore;

    document.getElementById("s7TableScore2").textContent =
      "Resultado: " + tableScore + "/" + S7_TABLE_AM.length;

    document.getElementById("s7B8Next").disabled = false;
  };

  document.getElementById("s7B8Next").onclick = function () {
    renderSession7B8Ex(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Bloque ocho, preguntas en presente continuo. El verbo to be va antes del pronombre y el verbo principal con ing. Ejemplos: are you working, ¿estás trabajando? Is he studying, ¿está estudiando él? Y la diferencia: do you work es rutina, are you working es ahora. Completa la tabla con am, is o are.", "narrator");
  }
}

/* ---------- BLOQUE 8: EJERCICIOS ---------- */
function renderSession7B8Ex(container) {
  var rows = "";

  S7_EX_B8.forEach(function (item, i) {
    rows +=
      '<div class="s4-row">' +
        '<div class="s4-es">' + (i + 1) + '. ' + item.es + '</div>' +
        '<input id="s7b8e' + i + '" class="s4-input" type="text" placeholder="Escribe la pregunta en inglés...">' +
        '<div id="s7b8f' + i + '" class="s4-answer"></div>' +
      '</div>';
  });

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE 8 · EJERCICIOS</div>' +
      '<h2 class="ob-title">Pregunta en Continuo</h2>' +
      '<p class="ob-sub">Traduce cada pregunta usando am / is / are + verbo con -ing.</p>' +
      rows +
      '<div id="s7b8Score" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="s7b8Check" class="btn">Revisar</button>' +
        '<button id="s7b8Next" class="btn" disabled>Continuar a Repaso</button>' +
      '</div>' +
    '</div>';

  document.getElementById("s7b8Check").onclick = function () {
    var score = 0;

    S7_EX_B8.forEach(function (item, i) {
      var inp = document.getElementById("s7b8e" + i);
      var fb = document.getElementById("s7b8f" + i);
      var val = s4Norm(inp.value);
      var ok = item.en.indexOf(val) > -1;

      if (ok) score++;

      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + item.en[0] + ".";
    });

    window.__s7score = (window.__s7score || 0) + score;

    document.getElementById("s7b8Score").textContent =
      "Resultado: " + score + "/" + S7_EX_B8.length;

    document.getElementById("s7b8Next").disabled = false;
  };

  document.getElementById("s7b8Next").onclick = function () {
    renderSession7B9(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Diez preguntas en continuo para traducir. Recuerda: am, is o are primero y el verbo con ing. Ejemplo: ¿estás trabajando tú? Are you working.", "narrator");
  }
}

/* ---------- BLOQUE 9: REPASO MEZCLADO NEGACION ---------- */
function renderSession7B9(container) {
  var vocabChips = S7_VOCAB.map(function (v) {
    return '<span class="ob-chip s6-chip">' + escapeHtml(v.en) + ' = ' + escapeHtml(v.es) + '</span>';
  }).join("");

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE 9</div>' +
      '<h2 class="ob-title">Repaso mezclado: Negación</h2>' +
      '<div class="s6-vocab"><b>Vocabulario de repaso:</b><br>' + vocabChips + '</div>' +
      '<div class="s4-rule"><b>Simple:</b> ' + ssDisplayEn("do not / does not") + ' (no) antes del verbo sin -ing.<br>' +
        ssDisplayEn("I do not work.") + ' (yo no trabajo) · ' + ssDisplayEn("He does not swim.") + ' (él no nada)' +
      '</div>' +
      '<div class="s4-rule"><b>Continuo:</b> ' + ssDisplayEn("am / is / are") + ' + ' + ssDisplayEn("not") + ' + verbo con -ing.<br>' +
        ssDisplayEn("I am not working.") + ' (yo no estoy trabajando) · ' + ssDisplayEn("They are not running.") + ' (ellos no están corriendo)' +
      '</div>' +
      '<div class="s4-rule"><b>Contracciones:</b> ' + ssDisplayEn("don't") + ' (do not) · ' + ssDisplayEn("doesn't") + ' (does not).</div>' +
      '<div class="ob-actions"><button id="s7B9Next" class="btn">Ir a ejercicios</button></div>' +
    '</div>';

  document.getElementById("s7B9Next").onclick = function () {
    renderSession7B9Ex(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Bloque nueve, repaso mezclado. En simple, do not o does not antes del verbo sin ing. I do not work, yo no trabajo. En continuo, am is are, más not, más verbo con ing. I am not working, yo no estoy trabajando. Las contracciones: don't y doesn't.", "narrator");
  }
}

/* ---------- BLOQUE 9: EJERCICIOS ---------- */
function renderSession7B9Ex(container) {
  var rows = "";

  S7_EX_B9.forEach(function (item, i) {
    rows +=
      '<div class="s4-row">' +
        '<div class="s4-es">' + (i + 1) + '. ' + item.es + '</div>' +
        '<input id="s7b9e' + i + '" class="s4-input" type="text" placeholder="Escribe la negación en inglés...">' +
        '<div id="s7b9f' + i + '" class="s4-answer"></div>' +
      '</div>';
  });

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE 9 · EJERCICIOS</div>' +
      '<h2 class="ob-title">Repaso: niega sin mezclar tiempos</h2>' +
      '<p class="ob-sub">Simple: do not / does not + verbo sin -ing. Continuo: am / is / are + not + verbo con -ing. Las contracciones también cuentan como correctas.</p>' +
      rows +
      '<div id="s7b9Score" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="s7b9Check" class="btn">Revisar</button>' +
        '<button id="s7b9Next" class="btn" disabled>Completar sesión</button>' +
      '</div>' +
    '</div>';

  document.getElementById("s7b9Check").onclick = function () {
    var score = 0;

    S7_EX_B9.forEach(function (item, i) {
      var inp = document.getElementById("s7b9e" + i);
      var fb = document.getElementById("s7b9f" + i);
      var val = s4Norm(inp.value);
      var ok = item.en.indexOf(val) > -1;

      if (ok) score++;

      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + item.en[0] + ".";
    });

    window.__s7score = (window.__s7score || 0) + score;

    document.getElementById("s7b9Score").textContent =
      "Resultado: " + score + "/" + S7_EX_B9.length;

    document.getElementById("s7b9Next").disabled = false;
  };

  document.getElementById("s7b9Next").onclick = function () {
    renderSession7Complete(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Quince oraciones mezcladas de negación. En simple do not o does not con verbo sin ing. En continuo am is are, más not, más verbo con ing. Las contracciones don't y doesn't también valen. Ejemplo: yo no trabajo, I do not work.", "narrator");
  }
}

/* ---------- COMPLETAR ---------- */
function renderSession7Complete(container) {
  var s = ssGetSessions();
  var totalScore = window.__s7score || 0;

  s.session7Completed = true;
  s.session7Score = totalScore;

  if (typeof appState !== "undefined") {
    appState.lastInteraction = "Sesión 7: Nivel 1 Preguntas y Repaso";
  }

  ssSave();

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">SESIÓN 7</div>' +
      '<h2 class="ob-title">Nivel 1 de preguntas completado</h2>' +
      '<div class="mp-profile-summary">' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Preguntas y repaso</div><div class="mp-profile-value">' + totalScore + '/50</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Dominado</div><div class="mp-profile-value">DO/DOES · AM/IS/ARE + -ING · Negación</div></div>' +
      '</div>' +
      '<p class="ob-sub">Ya preguntas en simple y en continuo, y repasas la negación sin mezclar tiempos. Regla #9 aplicada: todo inglés siempre con su traducción.</p>' +
      '<div class="ob-actions"><button id="s7Back" class="btn">Volver al panel</button></div>' +
    '</div>';

  document.getElementById("s7Back").onclick = function () {
    renderSessionsPanel(container);
  };

  if (typeof ssSpeak === "function") {
    ssSpeak("Sesión siete completada. Ya preguntas en presente simple con do y does, en continuo con am is are más ing, y repasas la negación sin mezclar tiempos. " + ssEnQuote("Excellent work."), "narrator");
  }
}

/* ---------- PANEL ACTUALIZADO: 5 SESIONES ---------- */
function renderSessionsPanel(container) {
  var s1 = ssSession1Done();
  var s2 = ssSession2Done();
  var s3 = ssSession3Done();
  var s4 = ssSession4Done();
  var s5 = ssSession5Done();

  var completedCount = 0;
  if (s1) completedCount++;
  if (s2) completedCount++;
  if (s3) completedCount++;
  if (s4) completedCount++;
  if (s5) completedCount++;

  var progress = Math.round((completedCount / 5) * 100);

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">Panel de sesiones</h2>' +
      '<p class="ob-sub">Tu progreso en el método gramatical puro.</p>' +
      '<div class="ss-progress-track"><div class="ss-progress-fill" style="width:' + progress + '%"></div></div>' +
      '<p class="ss-status">Progreso: ' + completedCount + '/5 sesiones</p>' +
      '<div class="ss-grid">' +
        '<div class="ss-card ' + (s1 ? "completed" : "available") + '">' +
          '<span class="ss-badge ' + (s1 ? "done" : "next") + '">Sesión 1</span>' +
          '<div class="ss-title">Primera conversación</div>' +
          '<div class="ss-status">' + (s1 ? "Completada" : "Disponible") + '</div>' +
        '</div>' +
        '<div class="ss-card ' + (s2 ? "completed" : (s1 ? "available" : "locked")) + '">' +
          '<span class="ss-badge ' + (s2 ? "done" : (s1 ? "next" : "locked")) + '">Sesión 2</span>' +
          '<div class="ss-title">Nivel 0: Singular, Plural y Pronombres</div>' +
          '<div class="ss-status">' + (s2 ? "Completada" : (s1 ? "Disponible" : "Bloqueada")) + '</div>' +
        '</div>' +
        '<div class="ss-card ' + (s3 ? "completed" : (s2 ? "available" : "locked")) + '">' +
          '<span class="ss-badge ' + (s3 ? "done" : (s2 ? "next" : "locked")) + '">Sesión 3</span>' +
          '<div class="ss-title">Filtro Maestro R.O.D.</div>' +
          '<div class="ss-status">' + (s3 ? "Completada" : (s2 ? "Disponible" : "Bloqueada")) + '</div>' +
        '</div>' +
        '<div class="ss-card ' + (s4 ? "completed" : (s3 ? "available" : "locked")) + '">' +
          '<span class="ss-badge ' + (s4 ? "done" : (s3 ? "next" : "locked")) + '">Sesión 4</span>' +
          '<div class="ss-title">Presente Simple vs Continuo</div>' +
          '<div class="ss-status">' + (s4 ? "Completada" : (s3 ? "Disponible" : "Bloqueada")) + '</div>' +
        '</div>' +
        '<div class="ss-card ' + (s5 ? "completed" : (s4 ? "available" : "locked")) + '">' +
          '<span class="ss-badge ' + (s5 ? "done" : (s4 ? "next" : "locked")) + '">Sesión 5</span>' +
          '<div class="ss-title">Negación y Verbos Auxiliares</div>' +
          '<div class="ss-status">' + (s5 ? "Completada" : (s4 ? "Disponible" : "Bloqueada")) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="ss-actions">' +
        '<button id="ssSession1Btn" class="ob-small-btn">' + (s1 ? "Repetir S1" : "Iniciar S1") + '</button>' +
        '<button id="ssSession2Btn" class="ob-small-btn" ' + (s1 ? "" : "disabled") + '>' + (s2 ? "Repetir S2" : "Iniciar S2") + '</button>' +
        '<button id="ssSession3Btn" class="ob-small-btn" ' + (s2 ? "" : "disabled") + '>' + (s3 ? "Repetir S3" : "Iniciar S3") + '</button>' +
        '<button id="ssSession4Btn" class="ob-small-btn" ' + (s3 ? "" : "disabled") + '>' + (s4 ? "Repetir S4" : "Iniciar S4") + '</button>' +
        '<button id="ssSession5Btn" class="btn" ' + (s4 ? "" : "disabled") + '>' + (s5 ? "Repetir S5" : "Continuar: Sesión 5") + '</button>' +
      '</div>' +
    '</div>';

  document.getElementById("ssSession1Btn").onclick = function () {
    if (typeof renderMissionProfileName === "function") renderMissionProfileName(container);
  };

  document.getElementById("ssSession2Btn").onclick = function () {
    if (s1 && typeof renderSession2Intro === "function") renderSession2Intro(container);
  };

  document.getElementById("ssSession3Btn").onclick = function () {
    if (s2 && typeof renderSession3Intro === "function") renderSession3Intro(container);
  };

  document.getElementById("ssSession4Btn").onclick = function () {
    if (s3) renderSession4Intro(container);
  };

  document.getElementById("ssSession5Btn").onclick = function () {
    if (s4) renderSession5Intro(container);
  };

  ssSpeak("Panel de sesiones. Progreso actual: " + completedCount + " de 5.", "narrator");
}

/* ---------- PREVIEW DE SIGUIENTE LECCION (con S5) ---------- */
function aurixNextLessonPreview() {
  var s = (typeof appState !== "undefined") ? appState : {};
  var sess = s.sessions || {};

  if (!s.mission1Completed) {
    return { title: "Sesión 1", preview: "Tu primera conversación: saludos y presentación en inglés." };
  }
  if (!sess.session2Completed) {
    return { title: "Sesión 2", preview: "Nivel 0: uno = singular, varios = plural, y los pronombres I, you, he, she, it, we, they." };
  }
  if (!sess.session3Completed) {
    return { title: "Sesión 3", preview: "Filtro Maestro R.O.D.: I usa AM; You, We, They usan ARE; He, She, It usan IS." };
  }
  if (!sess.session4Completed) {
    return { title: "Sesión 4", preview: "Presente Simple vs Continuo: sin -ING ser o estar básico; con -ING estar más ando o endo." };
  }
  if (!sess.session5Completed) {
    return { title: "Sesión 5", preview: "Negación y auxiliares: la palabra not siempre va después del auxiliar. Do para 1ª y 2ª, is más -ing para 3ªs." };
  }
  if (!sess.session6Completed) {
    return { title: "Sesión 6", preview: "Nivel 1: Verbo To Be en afirmativo, negativo e interrogativo. Todo en inglés con su traducción." };
  }
  if (!sess.session7Completed) {
    return { title: "Sesión 7", preview: "Nivel 1: Preguntas y Repaso. Do / does en simple, am / is / are + -ing en continuo, y repaso mezclado de negación." };
  }
  return { title: "Repaso", preview: "Practica speaking y rompe tus récords de acento." };
}


/* ============================================
   VIDEO YOUTUBE + INYECCION EN PANTALLAS TEORIA
============================================ */

(function () {
  if (window.__aurixVideoPatch) {
    return;
  }

  window.__aurixVideoPatch = true;

  function ytExtractId(url) {
    if (!url) {
      return null;
    }

    var m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);

    if (m) {
      return m[1];
    }

    if (/^[\w-]{11}$/.test(String(url).trim())) {
      return String(url).trim();
    }

    return null;
  }

  window.aurixAddVideo = function (container, storageKey) {
    if (!container || !container.querySelector) {
      return;
    }

    var card = container.querySelector(".ob-card") || container;

    if (card.querySelector(".yt-box")) {
      return;
    }

    var saved = "";

    try {
      saved = localStorage.getItem(storageKey) || "";
    } catch (e) {
      // Ignorar.
    }

    var box = document.createElement("div");
    box.className = "yt-box";

    box.innerHTML =
      '<div class="yt-head">🎬 Video de apoyo</div>' +
      '<div class="yt-frame" data-yt-frame></div>' +
      '<div class="yt-empty" data-yt-empty>Sin video todavía.<br>Pega un link de YouTube abajo.</div>' +
      '<div class="yt-controls">' +
        '<input class="s4-input yt-input" type="text" placeholder="Pega el link de YouTube..." value="' + saved.replace(/"/g, "&quot;") + '">' +
        '<button class="btn yt-load" type="button">Cargar</button>' +
      '</div>';

    var actions = card.querySelector(".ob-actions");

    if (actions) {
      card.insertBefore(box, actions);
    } else {
      card.appendChild(box);
    }

    var frame = box.querySelector("[data-yt-frame]");
    var empty = box.querySelector("[data-yt-empty]");
    var input = box.querySelector(".yt-input");
    var loadBtn = box.querySelector(".yt-load");

    function render(url) {
      var id = ytExtractId(url);

      if (id) {
        frame.innerHTML =
          '<iframe src="https://www.youtube.com/embed/' + id + '" ' +
          'title="Video de apoyo" frameborder="0" loading="lazy" ' +
          'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
          'allowfullscreen></iframe>';
        frame.style.display = "block";
        empty.style.display = "none";
      } else {
        frame.innerHTML = "";
        frame.style.display = "none";
        empty.style.display = "block";
      }
    }

    loadBtn.addEventListener("click", function () {
      var url = input.value.trim();

      try {
        localStorage.setItem(storageKey, url);
      } catch (e) {
        // Ignorar.
      }

      render(url);
    });

    render(saved);
  };

  function wrapWithVideo(fnName, key) {
    var orig = window[fnName];

    if (typeof orig !== "function" || orig.__ytWrapped) {
      return;
    }

    var wrapped = function () {
      var res = orig.apply(this, arguments);
      var container = arguments[0];

      if (container && container.querySelector) {
        window.aurixAddVideo(container, key);
      }

      return res;
    };

    wrapped.__ytWrapped = true;
    window[fnName] = wrapped;
  }

  /* Pantallas de teoria con video de apoyo */
  wrapWithVideo("renderSession3Rule", "aurix_yt_s3rule");
  wrapWithVideo("renderSession3Theory", "aurix_yt_s3theory");
  wrapWithVideo("renderSession4Intro", "aurix_yt_s4intro");
  wrapWithVideo("renderSession4Rule", "aurix_yt_s4rule");
  wrapWithVideo("renderSession5Aux", "aurix_yt_s5aux");
  wrapWithVideo("renderSession5Rule", "aurix_yt_s5rule");
})();

/* ============================================
   PRACTICA REAL: FRASES UNIDAS (R.O.D.)
   La teoria sigue estricta por canales;
   la practica usa las unidades reales.
============================================ */

(function () {
  if (window.__aurixPracticePatch) {
    return;
  }

  window.__aurixPracticePatch = true;

  /* Unidades reales del Filtro R.O.D. */
  var ROD_PRACTICE = [
    "I am",
    "You are",
    "We are",
    "They are",
    "He is",
    "She is",
    "It is"
  ];

  function setPractice(list) {
    window.__aurixPractice = list || null;
  }

  function wrapSet(fnName, list) {
    var orig = window[fnName];

    if (typeof orig !== "function" || orig.__prWrapped) {
      return;
    }

    var wrapped = function () {
      setPractice(list);
      return orig.apply(this, arguments);
    };

    wrapped.__prWrapped = true;
    window[fnName] = wrapped;
  }

  /* Pantallas del Filtro R.O.D.: practica unida */
  [
    "renderSession3Intro",
    "renderSession3Rule",
    "renderSession3Theory",
    "renderSession3Gerund",
    "renderSession3Contrast",
    "renderSession3Exercise",
    "renderSession3ExerciseA",
    "renderSession3ExerciseB",
    "renderSession3Complete"
  ].forEach(function (n) {
    wrapSet(n, ROD_PRACTICE);
  });

  /* Demas pantallas: usar las frases de la pantalla */
  [
    "renderSession2Intro",
    "renderSession2Theory",
    "renderSession2Pronouns",
    "renderSession2Blocks",
    "renderSession2Teach",
    "renderSession2Exercise",
    "renderSession2Table",
    "renderSession2Complete",
    "renderSession4Intro",
    "renderSession4Rule",
    "renderSession4Gerund",
    "renderSession4Contrast",
    "renderSession4ExerciseA",
    "renderSession4ExerciseB",
    "renderSession4Complete",
    "renderSession6Intro",
    "renderSession6B1",
    "renderSession6B1Ex",
    "renderSession6B2",
    "renderSession6B2Ex",
    "renderSession6B3",
    "renderSession6B3Ex",
    "renderSession6Complete",
    "renderSession7Intro",
    "renderSession7B7",
    "renderSession7B7Ex",
    "renderSession7B8",
    "renderSession7B8Ex",
    "renderSession7B9",
    "renderSession7B9Ex",
    "renderSession7Complete",
    "renderSessionsPanel"
  ].forEach(function (n) {
    wrapSet(n, null);
  });

  function refreshPracticeUI() {
    var select = document.getElementById("micPhraseSelect");
    var modal = document.getElementById("aurixMicModal");

    if (!select || !modal) {
      return;
    }

    var list = window.__aurixPractice;

    if (!list || !list.length) {
      var old = modal.querySelector(".pr-rows");
      if (old) {
        old.style.display = "none";
      }
      return;
    }

    /* Reconstruir el selector con las frases unidas */
    select.innerHTML = "";

    list.forEach(function (p) {
      var o = document.createElement("option");
      o.value = p;
      o.textContent = p;
      select.appendChild(o);
    });

    /* Filas visibles: una por frase unida */
    var rows = modal.querySelector(".pr-rows");

    if (!rows) {
      rows = document.createElement("div");
      rows.className = "pr-rows";
      select.parentNode.insertBefore(rows, select.nextSibling);
    }

    rows.style.display = "";
    rows.innerHTML = "";

    list.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pr-row-btn";
      b.innerHTML =
        '<span class="pr-row-phrase">"' + p + '"</span>' +
        '<span class="pr-row-icons">🔊 🎤</span>';

      b.addEventListener("click", function () {
        select.value = p;
        select.dispatchEvent(new Event("change"));

        if (window.AurixTTS) {
          window.AurixTTS.speakRichText('**"' + p + '"**', "aurix");
        }
      });

      rows.appendChild(b);
    });

    select.value = list[0];
    select.dispatchEvent(new Event("change"));
  }

  function watchModal() {
    var modal = document.getElementById("aurixMicModal");

    if (!modal) {
      setTimeout(watchModal, 800);
      return;
    }

    var wasHidden = modal.classList.contains("hidden");

    new MutationObserver(function () {
      var isHidden = modal.classList.contains("hidden");

      if (wasHidden && !isHidden) {
        setTimeout(refreshPracticeUI, 60);
      }

      wasHidden = isHidden;
    }).observe(modal, { attributes: true, attributeFilter: ["class"] });
  }

  watchModal();
})();

/* ============================================
   VOCES POR DEFECTO + PALABRAS COMO PALABRA
   Narrador: Google español de Estados Unidos
   AURIX:    Google UK English Female
   El subtitulo muestra el texto real; la voz
   recibe una normalizacion para que lea como
   palabra y no deletree: las palabras en
   MAYÚSCULAS y las cortas (AM, ARE, YOU, ...)
   se convierten a título para que el motor TTS
   no las lea como sigla. Solo los acronimos
   reales (ADN, MCER, TV, ...) se deletrean.
============================================ */

(function () {
  if (window.__aurixVoicePatch) {
    return;
  }

  window.__aurixVoicePatch = true;

  var NARRATOR_DEFAULT = "Google español de Estados Unidos";
  var AURIX_DEFAULT = "Google UK English Female";

  var SPELL_OUT = [
    "TTS", "OS", "AI", "API", "DB", "UI", "JSON", "UK", "MX", "US", "TV",
    "MVP", "MCER", "ADN"
  ];

  function pronounce(text) {
    return String(text)
      .replace(/\bAURIX\b/g, "Aurix")
      .replace(/\bA\.U\.R\.I\.X\./g, "Aurix")
      .replace(/\b[A-ZÁÉÍÓÚÜÑ]+(?:['’][A-ZÁÉÍÓÚÜÑ]+)*\b/g, function (w) {
        if (SPELL_OUT.indexOf(w) > -1) {
          return w;
        }
        return w.charAt(0) + w.slice(1).toLowerCase();
      })
      .replace(/\b[A-ZÁÉÍÓÚÜÑ]\b/g, function (w) {
        return w === "I" ? "I" : w.toLowerCase();
      });
  }

  window.aurixPronounce = pronounce;

  function overrideSpeakSegment(tts) {
    if (tts.__segmentOverridden) {
      return;
    }

    tts.__segmentOverridden = true;

    tts.speakSegmentFixed = function (segment) {
      this.showSegmentSubtitle(segment);

      var instance = this;
      var spokenText = pronounce(segment.text);

      return new Promise(function (resolve) {
        if (!("speechSynthesis" in window)) {
          var w = segment.text.split(/\s+/).length;
          setTimeout(resolve, Math.max(700, w * 180));
          return;
        }

        var utterance = new SpeechSynthesisUtterance(spokenText);
        var voice = instance.getSelectedVoice(segment.voiceRole);

        if (voice) {
          utterance.voice = voice;
        }

        utterance.lang = segment.voiceRole === "aurix" ? "en-US" : "es-MX";
        utterance.rate = segment.voiceRole === "aurix" ? 0.95 : 1;
        utterance.pitch = segment.voiceRole === "aurix" ? 1.06 : 0.95;
        utterance.volume = 1;

        var words = spokenText.split(/\s+/).length;
        var safetyMs = Math.min(30000, Math.max(2500, words * 850 + 1200));

        var finished = false;
        var safetyTimer = null;

        var finish = function () {
          if (finished) {
            return;
          }
          finished = true;
          if (safetyTimer) {
            clearTimeout(safetyTimer);
          }
          resolve();
        };

        safetyTimer = setTimeout(finish, safetyMs);

        utterance.onend = finish;
        utterance.onerror = finish;

        utterance.onboundary = function (event) {
          instance.handleBoundary(event, segment);
        };

        speechSynthesis.speak(utterance);
      });
    };

    tts.speakSegment = tts.speakSegmentFixed;
  }

  function applyDefaults() {
    var tts = window.AurixTTS;

    if (!tts) {
      setTimeout(applyDefaults, 500);
      return;
    }

    var changed = false;

    if (!tts.settings.narratorVoice || tts.settings.narratorVoice === "Auto") {
      tts.settings.narratorVoice = NARRATOR_DEFAULT;
      changed = true;
    }

    if (!tts.settings.aurixVoice || tts.settings.aurixVoice === "Auto") {
      tts.settings.aurixVoice = AURIX_DEFAULT;
      changed = true;
    }

    if (changed) {
      try {
        tts.saveSettings();
      } catch (e) {
        // Ignorar.
      }

      if (typeof tts.populateVoiceSelects === "function") {
        try {
          tts.populateVoiceSelects();
        } catch (e) {
          // Ignorar.
        }
      }
    }

    overrideSpeakSegment(tts);
  }

  applyDefaults();
})();

/* ============================================
   PANEL v3: LA TARJETA ES EL BOTON
   Se elimina la fila inferior de botones.
============================================ */

function renderSessionsPanel(container) {
  if (typeof aurixSetMenuEnabled === "function") {
    aurixSetMenuEnabled(true);
  }

  var S = [
    { num: 1, title: "Primera conversación", done: ssSession1Done(), unlocked: true, open: "profile" },
    { num: 2, title: "Nivel 0: Singular, Plural y Pronombres", done: ssSession2Done(), unlocked: ssSession1Done(), open: "s2" },
    { num: 3, title: "Filtro Maestro R.O.D.", done: ssSession3Done(), unlocked: ssSession2Done(), open: "s3" },
    { num: 4, title: "Presente Simple vs Continuo", done: ssSession4Done(), unlocked: ssSession3Done(), open: "s4" },
    { num: 5, title: "Negación y Verbos Auxiliares", done: ssSession5Done(), unlocked: ssSession4Done(), open: "s5" },
    { num: 6, title: "Nivel 1: Verbo To Be", done: ssSession6Done(), unlocked: ssSession5Done(), open: "s6" },
    { num: 7, title: "Nivel 1: Preguntas y Repaso", done: ssSession7Done(), unlocked: ssSession6Done(), open: "s7" }
  ];

  var total = S.length;
  var done = 0;
  S.forEach(function (s) { if (s.done) done++; });
  var pct = Math.round((done / total) * 100);

  /* Migración animada: detecta la sesión recién completada comparando
     con el último render del panel. */
  var prevDone = window.__ssDoneMap || null;
  var justNum = null;
  if (prevDone) {
    for (var ji = 0; ji < S.length; ji++) {
      if (S[ji].done && !prevDone["s" + S[ji].num]) { justNum = S[ji].num; break; }
    }
  }
  var newMap = {};
  S.forEach(function (s) { newMap["s" + s.num] = s.done; });
  window.__ssDoneMap = newMap;

  /* SIGUIENTE MISIÓN = primera sesión disponible */
  var next = null;
  for (var ni = 0; ni < S.length; ni++) {
    if (!S[ni].done && S[ni].unlocked) { next = S[ni]; break; }
  }

  function openSession(s) {
    var fns = {
      profile: function () { if (typeof renderMissionProfileName === "function") renderMissionProfileName(container); },
      s2: function () { renderSession2Intro(container); },
      s3: function () { renderSession3Intro(container); },
      s4: function () { renderSession4Intro(container); },
      s5: function () { renderSession5Intro(container); },
      s6: function () { renderSession6Intro(container); },
      s7: function () { renderSession7Intro(container); }
    };
    var fn = fns[s.open];
    if (fn) fn();
  }

  function ssToast(msg) {
    var t = document.getElementById("ssToast");

    if (!t) {
      t = document.createElement("div");
      t.id = "ssToast";
      t.className = "ss-toast";
      document.body.appendChild(t);
    }

    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._t);
    t._t = setTimeout(function () {
      t.classList.remove("show");
    }, 2600);
  }

  function rowHTML(s) {
    var cls = s.done ? "completed" : (s.unlocked ? "available" : "locked");
    var ico = s.done ? "✓" : (s.unlocked ? "▶" : "🔒");
    var act = s.done ? "Repasar" : (s.unlocked ? "Continuar" : "");
    var just = justNum === s.num ? " ss-just-done" : "";

    return (
      '<div class="ss-row ' + cls + just + '" data-ss="' + s.num + '">' +
        '<span class="ss-ico">' + ico + '</span>' +
        '<span class="ss-row-txt">' +
          '<span class="ss-row-num">SESIÓN ' + s.num + '</span>' +
          '<span class="ss-row-title">' + s.title + '</span>' +
        '</span>' +
        (act ? '<span class="ss-chip">' + act + '</span>' : '') +
      '</div>'
    );
  }

  function secHTML(key, label, rows, openByDefault) {
    var open = openByDefault && rows.length ? " open" : "";
    var chev = open ? "▾" : "▸";

    return (
      '<div class="ss-sec' + open + '" data-ss-sec="' + key + '">' +
        '<button class="ss-sec-head" type="button" data-ss-sec-toggle="' + key + '" aria-expanded="' + (open ? "true" : "false") + '">' +
          '<span class="ss-sec-title">' + label + ' <span class="ss-sec-count">(' + rows.length + ')</span></span>' +
          '<span class="ss-sec-chev">' + chev + '</span>' +
        '</button>' +
        '<div class="ss-sec-body" data-ss-sec-body="' + key + '">' +
          (rows.length ? rows.map(rowHTML).join("") : '<div class="ss-sec-empty">Aún no hay sesiones aquí.</div>') +
        '</div>' +
      '</div>'
    );
  }

  var doneRows = S.filter(function (s) { return s.done; });
  var pendingRows = S.filter(function (s) { return !s.done; });

  var heroHtml;

  if (next) {
    heroHtml =
      '<div class="ss-hero">' +
        '<div class="ss-hero-label">▶ SIGUIENTE MISIÓN</div>' +
        '<div class="ss-hero-title">SESIÓN ' + next.num + ' · ' + next.title + '</div>' +
        '<button class="btn ss-hero-cta" data-ss="' + next.num + '" type="button">Continuar</button>' +
      '</div>';
  } else {
    heroHtml =
      '<div class="ss-hero ss-hero-all">' +
        '<div class="ss-hero-label">🎉 PROGRESO COMPLETO</div>' +
        '<div class="ss-hero-title">Todas las sesiones completadas</div>' +
        '<button class="btn ss-hero-cta" data-ss="' + S[0].num + '" type="button">Repasar todo</button>' +
      '</div>';
  }

  container.innerHTML =
    '<div class="card glass ob-card ss-panel-card">' +
      '<div class="ss-progress-sticky">' +
        '<div class="ss-progress-row">' +
          '<span class="ss-progress-label">TU PROGRESO</span>' +
          '<span class="ss-progress-count">' + done + '/' + total + '</span>' +
        '</div>' +
        '<div class="ss-progress-track"><div class="ss-progress-fill" style="width:0%"></div></div>' +
      '</div>' +
      heroHtml +
      secHTML("done", "✓ COMPLETADAS", doneRows, Boolean(justNum)) +
      secHTML("pending", "⏳ PENDIENTES", pendingRows, true) +
      '<div class="mb-panel-section">' +
        '<div class="mb-panel-title">Bloques de Habilidades · Formato Maestro</div>' +
        '<p class="mb-panel-sub">Cada bloque: Gramática + Reading + Listening + Speaking + Writing (10 c/u). Todo en inglés con su traducción.</p>' +
        '<div class="ss-grid">' + mbPanelCards() + '</div>' +
      '</div>' +
    '</div>';

  /* Barra de progreso: se llena con animación hasta el nuevo porcentaje. */
  var progressFill = container.querySelector(".ss-progress-fill");

  if (progressFill) {
    requestAnimationFrame(function () {
      progressFill.style.width = pct + "%";
    });
  }

  /* Acordeón: ambas secciones pueden estar abiertas a la vez. */
  container.querySelectorAll(".ss-sec-head").forEach(function (head) {
    head.addEventListener("click", function () {
      var sec = head.closest(".ss-sec");
      var body = sec.querySelector(".ss-sec-body");
      var chev = head.querySelector(".ss-sec-chev");
      var open = sec.classList.toggle("open");
      head.setAttribute("aria-expanded", open ? "true" : "false");
      chev.textContent = open ? "▾" : "▸";
      body.style.maxHeight = open ? body.scrollHeight + "px" : "0px";
    });
  });

  /* Sección abierta por defecto: fija la altura real para la transición. */
  container.querySelectorAll(".ss-sec.open .ss-sec-body").forEach(function (body) {
    body.style.maxHeight = body.scrollHeight + "px";
  });

  /* Hero: continuar con CERO scroll. */
  var heroCta = container.querySelector(".ss-hero-cta");

  if (heroCta) {
    heroCta.addEventListener("click", function () {
      var num = parseInt(heroCta.getAttribute("data-ss"), 10);
      var i;

      for (i = 0; i < S.length; i++) {
        if (S[i].num === num) { openSession(S[i]); return; }
      }
    });
  }

  function bindRow(s) {
    var el = container.querySelector('.ss-row[data-ss="' + s.num + '"]');

    if (!el) return;

    el.addEventListener("click", function () {
      if (!s.done && !s.unlocked) {
        el.classList.add("ss-deny");
        setTimeout(function () { el.classList.remove("ss-deny"); }, 450);

        if (typeof ssSpeak === "function") {
          ssSpeak("Completa la sesión anterior para desbloquear esta sesión.", "narrator");
        }

        ssToast("Completa la sesión anterior para desbloquear");
        return;
      }

      openSession(s);
    });
  }

  S.forEach(bindRow);

  if (typeof mbBindPanelButtons === "function") {
    mbBindPanelButtons(container);
  }

  /* Migración visible: la sesión recién completada llega animada. */
  if (justNum) {
    ssToast("Sesión " + justNum + " completada. ¡Sigue así!");
  }

  if (typeof ssSpeak === "function") {
    ssSpeak("Panel de sesiones. Progreso: " + done + " de " + total + ". Toca una sesión para entrar.", "narrator");
  }
}

/* ============================================
   BOTON HOME: SIEMPRE DE VUELTA AL PANEL
============================================ */

(function () {
  if (window.__aurixHomeInjected) {
    return;
  }

  window.__aurixHomeInjected = true;

  function injectHome() {
    if (document.getElementById("aurixHomeBtn")) {
      return;
    }

    var b = document.createElement("button");
    b.id = "aurixHomeBtn";
    b.type = "button";
    b.className = "aurix-home-btn hidden";
    b.innerHTML = "🏠";
    b.setAttribute("aria-label", "Ir al panel principal");
    document.body.appendChild(b);

    b.addEventListener("click", function () {
      /* Limpia el historial y regresa al panel del usuario */
      if (window.__aurixHistory) {
        window.__aurixHistory.length = 0;
      }

      if (typeof renderSessionsPanel === "function" && typeof ensureOnboardingScreen === "function") {
        renderSessionsPanel(ensureOnboardingScreen());
      }

      if (typeof ssSpeak === "function") {
        ssSpeak("Panel principal.", "narrator");
      }
    });
  }

  /* Visible solo dentro del contenido (no en arranque) */
  setInterval(function () {
    var b = document.getElementById("aurixHomeBtn");

    if (!b) {
      return;
    }

    var show = Boolean(window.__aurixHistory && window.__aurixHistory.length >= 1);
    b.classList.toggle("hidden", !show);
  }, 600);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectHome);
  } else {
    injectHome();
  }
})();

/* ============================================
   TRANSCRIPCION COMPLETA (FRASES LARGAS)
   Acumula TODOS los finales entre reinicios
   del reconocimiento y repara el display.
============================================ */

(function () {
  if (window.__aurixAccPatch) {
    return;
  }

  window.__aurixAccPatch = true;

  var Base = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (Base && !Base.__accWrapped) {
    function AccSR() {
      var inst = new Base();
      var acc = "";

      inst.addEventListener("result", function (event) {
        var interim = "";
        var i, r;

        /* Acumular finales NUEVOS (desde resultIndex) */
        for (i = event.resultIndex; i < event.results.length; i++) {
          r = event.results[i];
          if (r.isFinal) {
            acc += r[0].transcript + " ";
          }
        }

        /* Interinos actuales para mostrar en vivo */
        for (i = 0; i < event.results.length; i++) {
          r = event.results[i];
          if (!r.isFinal) {
            interim += r[0].transcript + " ";
          }
        }

        window.__aurixFullTranscript = (acc + " " + interim)
          .replace(/\s+/g, " ")
          .trim();

        /* Reescribir el display con el texto COMPLETO */
        setTimeout(function () {
          var el = document.getElementById("micTranscript");

          if (el && window.__aurixFullTranscript) {
            el.textContent = window.__aurixFullTranscript;
          }
        }, 0);
      });

      return inst;
    }

    AccSR.prototype = Base.prototype;
    AccSR.__accWrapped = true;

    window.SpeechRecognition = AccSR;
    window.webkitSpeechRecognition = AccSR;
  }

  document.addEventListener("click", function (e) {
    var t = e.target;

    if (!t) {
      return;
    }

    /* Reset al iniciar una grabación nueva */
    if (t.id === "micRecordBtn" || (t.closest && t.closest("#micRecordBtn"))) {
      window.__aurixFullTranscript = "";
    }

    /* Antes de calificar, entregar la transcripción COMPLETA */
    if (t.id === "micStopBtn" || (t.closest && t.closest("#micStopBtn"))) {
      var full = window.__aurixFullTranscript || "";
      var el = document.getElementById("micTranscript");

      if (el && full && full.length > (el.textContent || "").length) {
        el.textContent = full;
      }
    }
  }, true);
})();

/* ============================================
   CANDADO: NUNCA "CORRECTO:" EN RESPUESTAS MALAS
============================================ */

(function () {
  if (window.__aurixClarify) {
    return;
  }

  window.__aurixClarify = true;

  document.addEventListener("click", function (e) {
    var id = e.target && e.target.id;

    if (!id) {
      return;
    }

    if (["s4GerundCheck", "s4CheckA", "s4CheckB", "s5Check"].indexOf(id) === -1) {
      return;
    }

    setTimeout(function () {
      document.querySelectorAll(".s4-input.bad").forEach(function (inp) {
        var fb = inp.parentNode.querySelector(".s4-answer");

        if (!fb || fb.querySelector(".fb-card")) {
          return;
        }

        var m = (fb.textContent || "").match(/Correcto:\s*(.+)$/);

        if (m) {
          fb.innerHTML =
            '<div class="fb-card fb-bad">' +
              '<div>❌ Incorrecto.</div>' +
              '<div class="fb-example">La forma correcta es: <b>' + m[1] + '</b></div>' +
              '<div class="fb-fixed">Revisa la regla de esta pantalla y vuelve a intentarlo.</div>' +
            '</div>';
        }
      });
    }, 150);
  });
})();

/* ============================================
   BIBLIOTECA AURIX A1
   Reglas del nivel + buscador + video + botones
   "Ver regla" dentro de cada error.
============================================ */

(function () {
  if (window.__aurixLibInjected) {
    return;
  }

  window.__aurixLibInjected = true;

  var LIB = [
    { id: "sing-plural", nivel: "A1", tema: "Nivel Cero", titulo: "Singular y Plural", keywords: ["singular", "plural", "uno", "varios", "muchos", "houses"], texto: "UNO = singular. VARIOS / MUCHOS / MÁS DE UNO = plural. En inglés, el plural generalmente agrega -S.", ejemplos: ["house → houses", "car → cars"], video: "" },
    { id: "pron-personas", nivel: "A1", tema: "Nivel Cero", titulo: "Pronombres por persona", keywords: ["pronombres", "persona", "you", "we", "they", "he", "she", "it"], texto: "1ª persona: I. 2ªs personas: You, We, They. 3ªs personas: He, She, It. Nunca se mezclan.", ejemplos: ["I → 1ª persona", "You, We, They → 2ªs personas", "He, She, It → 3ªs personas"], video: "" },
    { id: "rod", nivel: "A1", tema: "Verbo To Be", titulo: "Filtro Maestro R.O.D.", keywords: ["am", "are", "is", "rod", "filtro", "canal"], texto: "1ª persona → AM. 2ªs personas → ARE. 3ªs personas → IS. Cada canal tiene una única salida.", ejemplos: ["I am", "You / We / They are", "He / She / It is"], video: "" },
    { id: "tobe", nivel: "A1", tema: "Verbo To Be", titulo: "Verbo To Be (Ser / Estar)", keywords: ["to be", "ser", "estar", "soy", "estoy"], texto: "En inglés, SER y ESTAR son un solo verbo: To Be. La traducción depende del complemento.", ejemplos: ["I am = yo soy / estoy", "He is = él es / está"], video: "" },
    { id: "ger-general", nivel: "A1", tema: "Gerundio", titulo: "Gerundio: regla general", keywords: ["gerundio", "ing", "ando", "endo"], texto: "Al verbo se le agrega -ING.", ejemplos: ["work → working"], video: "" },
    { id: "ger-e", nivel: "A1", tema: "Gerundio", titulo: "Gerundio: -E muda", keywords: ["e muda", "write", "writing", "termina en e"], texto: "Si el verbo termina en -E muda, la E se reemplaza por -ING (se quita).", ejemplos: ["write → writing (no writeing)"], video: "" },
    { id: "ger-cvc", nivel: "A1", tema: "Gerundio", titulo: "Gerundio: C-V-C duplica", keywords: ["duplicar", "consonante", "run", "swim", "running"], texto: "Monosílabo consonante-vocal-consonante: la última consonante se duplica y luego -ING.", ejemplos: ["run → running", "swim → swimming"], video: "" },
    { id: "ger-y", nivel: "A1", tema: "Gerundio", titulo: "Gerundio: consonante + Y", keywords: ["y", "study", "studying"], texto: "Con consonante + Y, la Y se queda; solo agrega -ING.", ejemplos: ["study → studying"], video: "" },
    { id: "simple-continuo", nivel: "A1", tema: "Tiempos", titulo: "Simple vs Continuo (Regla de Oro)", keywords: ["simple", "continuo", "ing", "diferencia"], texto: "Sin -ING = Ser/Estar básico (Simple). Con -ING = Estar + Ando/Endo (Continuo).", ejemplos: ["It is a house.", "I am working."], video: "" },
    { id: "negacion", nivel: "A1", tema: "Negación", titulo: "Negación: NOT después del auxiliar", keywords: ["not", "negar", "negacion", "don't"], texto: "Para negar, la palabra NOT va siempre después del auxiliar.", ejemplos: ["I do not run.", "He is not writing."], video: "" },
    { id: "auxiliares", nivel: "A1", tema: "Negación", titulo: "Verbos auxiliares", keywords: ["auxiliar", "do", "does", "am", "is", "are"], texto: "Los auxiliares definen el tiempo de la oración. Continuo → am/is/are. Simple → do/does.", ejemplos: ["do (1ª y 2ªs personas)", "does (3ªs personas)"], video: "" },
    { id: "tercera-s", nivel: "A1", tema: "Tercera persona", titulo: "3ª persona del Simple: -S / -ES / -IES", keywords: ["tercera", "s", "es", "ies", "has", "goes"], texto: "Regla general: +S. Termina en O, X, S, SH, Z: +ES. Consonante + Y: la Y cambia a IES. have → has.", ejemplos: ["wait → waits", "go → goes", "study → studies", "have → has"], video: "" },
    { id: "pronombre-obligatorio", nivel: "A1", tema: "Reglas de oro", titulo: "El pronombre nunca se omite", keywords: ["pronombre", "omitir", "sujeto"], texto: "A diferencia del español, en inglés el pronombre siempre se escribe en todas las frases.", ejemplos: ["Corro. → I run."], video: "" },
    { id: "preposiciones", nivel: "A1", tema: "Preposiciones", titulo: "Preposiciones IN / ON / AT", keywords: ["in", "on", "at", "preposicion", "tiempo", "lugar"], texto: "AT: puntos específicos y horas. ON: superficies, días y fechas. IN: espacios cerrados, meses, años y estaciones.", ejemplos: ["at 3:00", "on Monday", "in September"], video: "" }
  ];

  function findRule(id) {
    for (var i = 0; i < LIB.length; i++) {
      if (LIB[i].id === id) return LIB[i];
    }
    return LIB[0];
  }

  function ytId(url) {
    if (!url) return null;
    var m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
    if (m) return m[1];
    if (/^[\w-]{11}$/.test(String(url).trim())) return String(url).trim();
    return null;
  }

  function libVideoUrl(rule) {
    try {
      var v = localStorage.getItem("aurix_lib_video_" + rule.id);
      if (v) return v;
    } catch (e) {}
    return rule.video || "";
  }

  function libSearch(q) {
    q = String(q || "").toLowerCase().trim();
    if (!q) return LIB.slice(0, 6);
    var words = q.split(/\s+/);
    return LIB.filter(function (r) {
      var hay = (r.titulo + " " + r.tema + " " + r.keywords.join(" ") + " " + r.texto).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) > -1; });
    });
  }

  var lastQuery = "";

  function showList(q) {
    lastQuery = q || "";
    var body = document.getElementById("libBody");
    var sug = document.getElementById("libSuggest");
    if (!body) return;
    if (sug) sug.innerHTML = "";

    var res = libSearch(lastQuery);

    if (!res.length) {
      body.innerHTML = '<div class="ms-sub">Sin resultados en Nivel A1 para "' + lastQuery + '".</div>';
      return;
    }

    body.innerHTML = res.map(function (r) {
      return '<div class="lib-item" data-lib="' + r.id + '">' +
        '<span class="lib-tema">' + r.tema + ' · ' + r.nivel + '</span>' +
        '<b>' + r.titulo + '</b>' +
      '</div>';
    }).join("");
  }

  function openRule(id) {
    var r = findRule(id);
    var body = document.getElementById("libBody");
    var sug = document.getElementById("libSuggest");
    if (!body) return;
    if (sug) sug.innerHTML = "";

    var vid = libVideoUrl(r);
    var yid = ytId(vid);
    var vidHtml = "";

    if (yid) {
      vidHtml = '<div class="yt-frame" style="display:block;"><iframe src="https://www.youtube.com/embed/' + yid + '" title="Video de la regla" frameborder="0" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
    }

    body.innerHTML =
      '<div class="lib-rule">' +
        '<span class="lib-tema">' + r.tema + ' · ' + r.nivel + '</span>' +
        '<h3 class="lib-title">' + r.titulo + '</h3>' +
        '<p class="lib-text">' + r.texto + '</p>' +
        r.ejemplos.map(function (x) { return '<div class="s4-rule">• ' + x + '</div>'; }).join("") +
        vidHtml +
        '<div class="yt-controls">' +
          '<input id="libVideoInput" class="s4-input yt-input" type="text" placeholder="Pega el link de YouTube de esta regla..." value="' + vid.replace(/"/g, "&quot;") + '">' +
          '<button id="libVideoSave" class="btn yt-load" type="button">Vincular</button>' +
        '</div>' +
        '<div class="ob-actions"><button id="libBack" class="ob-small-btn">← Volver</button></div>' +
      '</div>';

    document.getElementById("libVideoSave").addEventListener("click", function () {
      try {
        localStorage.setItem("aurix_lib_video_" + r.id, document.getElementById("libVideoInput").value.trim());
      } catch (e) {}
      openRule(id);
    });

    document.getElementById("libBack").addEventListener("click", function () {
      showList(lastQuery);
    });
  }

  function injectLib() {
    if (document.getElementById("libModal")) return;

    var fab = document.createElement("button");
    fab.id = "aurixLibFab";
    fab.type = "button";
    fab.className = "aurix-lib-fab";
    fab.innerHTML = "📚";
    fab.setAttribute("aria-label", "Biblioteca de reglas");
    document.body.appendChild(fab);

    var modal = document.createElement("div");
    modal.id = "libModal";
    modal.className = "mic-modal hidden";
    modal.innerHTML =
      '<div class="mic-card">' +
        '<div class="ms-title">📚 Biblioteca AURIX · Nivel A1</div>' +
        '<input id="libSearch" class="s4-input" type="text" placeholder="Busca: gerundio, not, preposiciones..." autocomplete="off">' +
        '<div id="libSuggest" class="lib-suggest"></div>' +
        '<div id="libBody" class="lib-body"></div>' +
        '<div class="ob-actions"><button id="libClose" class="btn">Cerrar</button></div>' +
      '</div>';
    document.body.appendChild(modal);

    fab.addEventListener("click", function () {
      window.aurixOpenLib();
    });

    document.getElementById("libClose").addEventListener("click", function () {
      modal.classList.add("hidden");
    });

    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.classList.add("hidden");
    });

    var input = document.getElementById("libSearch");
    var sug = document.getElementById("libSuggest");

    input.addEventListener("input", function () {
      var q = input.value.trim();

      if (!q) {
        sug.innerHTML = "";
        showList("");
        return;
      }

      var res = libSearch(q).slice(0, 5);

      sug.innerHTML = res.map(function (r) {
        return '<button class="lib-sug" type="button" data-lib="' + r.id + '">🔎 ' + r.titulo + '</button>';
      }).join("");

      showList(q);
    });

    sug.addEventListener("click", function (e) {
      var b = e.target.closest("[data-lib]");
      if (b) openRule(b.getAttribute("data-lib"));
    });

    document.getElementById("libBody").addEventListener("click", function (e) {
      var item = e.target.closest(".lib-item");
      if (item) openRule(item.getAttribute("data-lib"));
    });
  }

  window.aurixOpenLib = function (ruleId) {
    injectLib();
    document.getElementById("libModal").classList.remove("hidden");
    if (ruleId) openRule(ruleId);
    else showList("");
  };

  /* ---------- Detecta qué regla falló y agrega "Ver regla" ---------- */

  function detectRule(row, inp) {
    var user = (inp.value || "").toLowerCase().replace(/\s+/g, " ").trim();
    var es = row.querySelector(".s4-es");
    var label = es ? es.textContent : "";
    var fb = row.querySelector(".s4-answer");
    var m = fb ? (fb.textContent || "").match(/correcta es:\s*([a-z']+)/i) : null;
    var correct = m ? m[1].trim() : "";

    var vm = label.match(/"([a-z]+)"/i);

    if (vm) {
      var verb = vm[1].toLowerCase();
      if (user === verb + "ing") {
        return verb.slice(-1) === "e" ? "ger-e" : "ger-cvc";
      }
      if (user === verb.replace(/y$/, "") + "ing") return "ger-y";
      return "ger-general";
    }

    if (correct.indexOf(" not ") > -1 || correct.indexOf("n't") > -1) {
      if (user.indexOf(" not ") === -1 && user.indexOf("n't") === -1) return "negacion";
      if (!/\b(am|is|are|do|does)\b/.test(user)) return "auxiliares";
      if (correct.slice(-3) === "ing" && user.indexOf("ing") === -1) return "simple-continuo";
    }

    var cu = correct.split(" ");
    var uu = user.split(" ");

    if (/^(he|she|it)$/.test(cu[0]) && /s$/.test(cu[cu.length - 1]) && uu.length && !/s$/.test(uu[uu.length - 1])) {
      return "tercera-s";
    }

    if (correct && user && cu[0] !== uu[0]) return "pronombre-obligatorio";

    return "simple-continuo";
  }

  function attachRuleButtons() {
    document.querySelectorAll(".s4-row").forEach(function (row) {
      var inp = row.querySelector(".s4-input.bad");
      var fbBox = row.querySelector(".s4-answer");

      if (!inp || !fbBox) return;

      var fb = fbBox.querySelector(".fb-card.fb-bad") || fbBox;
      if (fb.querySelector(".lib-open-btn")) return;

      var rid = detectRule(row, inp);
      var rule = findRule(rid);

      var b = document.createElement("button");
      b.type = "button";
      b.className = "lib-open-btn";
      b.textContent = "📚 Ver regla: " + rule.titulo;
      b.addEventListener("click", function () {
        window.aurixOpenLib(rid);
      });

      fb.appendChild(b);
    });
  }

  document.addEventListener("click", function (e) {
    var id = e.target && e.target.id;
    if (["s4GerundCheck", "s4CheckA", "s4CheckB", "s5Check"].indexOf(id) === -1) return;
    setTimeout(attachRuleButtons, 250);
  });

  injectLib();
})();

/* ============================================
   BIBLIOTECA A1: VOCABULARIO OFICIAL
   Regla de producción: ningun bloque puede usar
   palabras fuera de esta biblioteca. Toda palabra
   nueva se agrega aqui primero, siempre con su
   traduccion.
============================================ */

var A1_VERBS = [
  { base: "be", es: "ser / estar", ing: "being", third: "is / am / are", rule_ing: "irregular", rule_third: "irregular" },
  { base: "work", es: "trabajar", ing: "working", third: "works", rule_ing: "regular", rule_third: "s" },
  { base: "study", es: "estudiar", ing: "studying", third: "studies", rule_ing: "y_sin_cambio", rule_third: "ies" },
  { base: "read", es: "leer", ing: "reading", third: "reads", rule_ing: "regular", rule_third: "s" },
  { base: "write", es: "escribir", ing: "writing", third: "writes", rule_ing: "quita_e", rule_third: "s" },
  { base: "run", es: "correr", ing: "running", third: "runs", rule_ing: "duplica_cvc", rule_third: "s" },
  { base: "sit", es: "sentarse", ing: "sitting", third: "sits", rule_ing: "duplica_cvc", rule_third: "s" },
  { base: "eat", es: "comer", ing: "eating", third: "eats", rule_ing: "regular", rule_third: "s" },
  { base: "play", es: "jugar / tocar", ing: "playing", third: "plays", rule_ing: "vocal_y_sin_cambio", rule_third: "s" },
  { base: "watch", es: "mirar / ver", ing: "watching", third: "watches", rule_ing: "regular", rule_third: "es" },
  { base: "go", es: "ir", ing: "going", third: "goes", rule_ing: "regular", rule_third: "es" },
  { base: "live", es: "vivir", ing: "living", third: "lives", rule_ing: "quita_e", rule_third: "s" },
  { base: "speak", es: "hablar", ing: "speaking", third: "speaks", rule_ing: "regular", rule_third: "s" },
  { base: "listen", es: "escuchar", ing: "listening", third: "listens", rule_ing: "regular", rule_third: "s" },
  { base: "dance", es: "bailar", ing: "dancing", third: "dances", rule_ing: "quita_e", rule_third: "es" },
  { base: "sing", es: "cantar", ing: "singing", third: "sings", rule_ing: "regular", rule_third: "s" },
  { base: "sleep", es: "dormir", ing: "sleeping", third: "sleeps", rule_ing: "regular", rule_third: "s" },
  { base: "think", es: "pensar", ing: "thinking", third: "thinks", rule_ing: "regular", rule_third: "s" },
  { base: "wait", es: "esperar", ing: "waiting", third: "waits", rule_ing: "regular", rule_third: "s" },
  { base: "walk", es: "caminar", ing: "walking", third: "walks", rule_ing: "regular", rule_third: "s" },
  { base: "travel", es: "viajar", ing: "traveling", third: "travels", rule_ing: "regular", rule_third: "s" },
  { base: "learn", es: "aprender", ing: "learning", third: "learns", rule_ing: "regular", rule_third: "s" },
  { base: "drink", es: "beber / tomar", ing: "drinking", third: "drinks", rule_ing: "regular", rule_third: "s" },
  { base: "open", es: "abrir", ing: "opening", third: "opens", rule_ing: "regular", rule_third: "s" },
  { base: "close", es: "cerrar", ing: "closing", third: "closes", rule_ing: "quita_e", rule_third: "s" },
  { base: "buy", es: "comprar", ing: "buying", third: "buys", rule_ing: "vocal_y_sin_cambio", rule_third: "s" },
  { base: "need", es: "necesitar", ing: "needing", third: "needs", rule_ing: "regular", rule_third: "s" },
  { base: "like", es: "gustar", ing: "liking", third: "likes", rule_ing: "quita_e", rule_third: "s" },
  { base: "have", es: "tener", ing: "having", third: "has", rule_ing: "quita_e", rule_third: "irregular" },
  { base: "stop", es: "detenerse", ing: "stopping", third: "stops", rule_ing: "duplica_cvc", rule_third: "s" },
  { base: "swim", es: "nadar", ing: "swimming", third: "swims", rule_ing: "duplica_cvc", rule_third: "s" },
  { base: "teach", es: "ensenar", ing: "teaching", third: "teaches", rule_ing: "regular", rule_third: "es" },
  { base: "do", es: "hacer", ing: "doing", third: "does", rule_ing: "regular", rule_third: "irregular" }
];

var A1_NOUNS = [
  { singular: "student", plural: "students", es: "estudiante", category: "escuela", rule_plural: "s" },
  { singular: "teacher", plural: "teachers", es: "maestro / maestra", category: "escuela", rule_plural: "s" },
  { singular: "class", plural: "classes", es: "clase", category: "escuela", rule_plural: "es" },
  { singular: "book", plural: "books", es: "libro", category: "escuela", rule_plural: "s" },
  { singular: "pen", plural: "pens", es: "boligrafo", category: "escuela", rule_plural: "s" },
  { singular: "computer", plural: "computers", es: "computadora", category: "escuela", rule_plural: "s" },
  { singular: "library", plural: "libraries", es: "biblioteca", category: "escuela", rule_plural: "ies" },
  { singular: "office", plural: "offices", es: "oficina", category: "escuela", rule_plural: "s" },
  { singular: "exam", plural: "exams", es: "examen", category: "escuela", rule_plural: "s" },
  { singular: "question", plural: "questions", es: "pregunta", category: "escuela", rule_plural: "s" },
  { singular: "word", plural: "words", es: "palabra", category: "escuela", rule_plural: "s" },
  { singular: "homework", plural: "", es: "tarea", category: "escuela", rule_plural: "sin_plural" },
  { singular: "email", plural: "emails", es: "correo electronico", category: "escuela", rule_plural: "s" },
  { singular: "citizen", plural: "citizens", es: "ciudadano / ciudadana", category: "ciudad", rule_plural: "s" },
  { singular: "friend", plural: "friends", es: "amigo / amiga", category: "ciudad", rule_plural: "s" },
  { singular: "house", plural: "houses", es: "casa", category: "ciudad", rule_plural: "s" },
  { singular: "car", plural: "cars", es: "carro / auto", category: "ciudad", rule_plural: "s" },
  { singular: "bus", plural: "buses", es: "autobus", category: "ciudad", rule_plural: "es" },
  { singular: "city", plural: "cities", es: "ciudad", category: "ciudad", rule_plural: "ies" },
  { singular: "street", plural: "streets", es: "calle", category: "ciudad", rule_plural: "s" },
  { singular: "apartment", plural: "apartments", es: "departamento", category: "ciudad", rule_plural: "s" },
  { singular: "table", plural: "tables", es: "mesa", category: "ciudad", rule_plural: "s" },
  { singular: "park", plural: "parks", es: "parque", category: "ciudad", rule_plural: "s" },
  { singular: "party", plural: "parties", es: "fiesta", category: "ciudad", rule_plural: "ies" },
  { singular: "store", plural: "stores", es: "tienda", category: "ciudad", rule_plural: "s" },
  { singular: "television", plural: "televisions", es: "television", category: "ciudad", rule_plural: "s" },
  { singular: "coffee", plural: "", es: "cafe", category: "ciudad", rule_plural: "sin_plural" },
  { singular: "water", plural: "", es: "agua", category: "ciudad", rule_plural: "sin_plural" },
  { singular: "food", plural: "", es: "comida", category: "ciudad", rule_plural: "sin_plural" },
  { singular: "day", plural: "days", es: "dia", category: "tiempo", rule_plural: "s" },
  { singular: "week", plural: "weeks", es: "semana", category: "tiempo", rule_plural: "s" },
  { singular: "month", plural: "months", es: "mes", category: "tiempo", rule_plural: "s" },
  { singular: "year", plural: "years", es: "ano", category: "tiempo", rule_plural: "s" },
  { singular: "morning", plural: "mornings", es: "manana", category: "tiempo", rule_plural: "s" },
  { singular: "night", plural: "nights", es: "noche", category: "tiempo", rule_plural: "s" },
  { singular: "Monday", plural: "Mondays", es: "lunes", category: "tiempo", rule_plural: "s" },
  { singular: "September", plural: "", es: "septiembre", category: "tiempo", rule_plural: "sin_plural" },
  { singular: "summer", plural: "", es: "verano", category: "tiempo", rule_plural: "sin_plural" },
  { singular: "English", plural: "", es: "ingles", category: "idiomas", rule_plural: "sin_plural" },
  { singular: "Spanish", plural: "", es: "espanol", category: "idiomas", rule_plural: "sin_plural" }
];

/* ============================================
   BIBLIOTECA AURIX v2: REGLAS COMPLETAS
   Cada tarjeta = TODAS las sub-reglas +
   ejemplos + errores comunes del método.
============================================ */

(function () {
  if (window.__aurixLibV2) {
    return;
  }

  window.__aurixLibV2 = true;

  var LIB2 = [
    {
      id: "sing-plural", nivel: "A1", tema: "Nivel Cero", titulo: "Singular y Plural",
      keywords: ["singular", "plural", "uno", "varios", "muchos", "s"],
      texto: "En inglés, como en español, distinguimos UNO (singular) de VARIOS (plural). El plural generalmente agrega -S.",
      secciones: [
        { sub: "Singular = UNO", texto: "Un solo elemento.", ejemplos: ["house = casa", "car = carro", "dog = perro"], error: "", ids: [] },
        { sub: "Plural = VARIOS / MUCHOS / MÁS DE UNO", texto: "Regla general: se agrega -S al final.", ejemplos: ["houses = casas", "cars = carros", "dogs = perros"], error: "Error común: olvidar la -S (house en lugar de houses).", ids: [] }
      ], video: ""
    },
    {
      id: "pron-personas", nivel: "A1", tema: "Nivel Cero", titulo: "Pronombres por persona",
      keywords: ["pronombres", "persona", "you", "we", "they", "he", "she", "it"],
      texto: "Los pronombres se clasifican en 3 personas gramaticales. Esta clasificación decide qué verbo se usa.",
      secciones: [
        { sub: "1ª persona", texto: "Quien habla.", ejemplos: ["I = yo"], error: "", ids: [] },
        { sub: "2ªs personas (PLURALES)", texto: "You es plural porque requiere mínimo dos personas: quien habla y quien escucha.", ejemplos: ["You = tú / ustedes", "We = nosotros", "They = ellos"], error: "", ids: [] },
        { sub: "3ªs personas (SINGULARES)", texto: "De quien se habla.", ejemplos: ["He = él", "She = ella", "It = eso / animal / cosa"], error: "Error común: mezclar personas confunde el verbo.", ids: [] }
      ], video: ""
    },
    {
      id: "rod", nivel: "A1", tema: "Verbo To Be", titulo: "Filtro Maestro R.O.D.",
      keywords: ["am", "are", "is", "rod", "filtro", "canal"],
      texto: "El Filtro conecta cada persona con su única forma de To Be. No hay salidas cruzadas.",
      secciones: [
        { sub: "Canal 1 — 1ª persona → AM", texto: "Exclusivo para I.", ejemplos: ["I am = yo soy / estoy"], error: "", ids: [] },
        { sub: "Canal 2 — 2ªs personas → ARE", texto: "Exclusivo para plurales You, We, They.", ejemplos: ["You are", "We are", "They are"], error: "", ids: [] },
        { sub: "Canal 3 — 3ªs personas → IS", texto: "Exclusivo para singulares He, She, It.", ejemplos: ["He is", "She is", "It is"], error: "Error común: I are o He are NO existen.", ids: [] }
      ], video: ""
    },
    {
      id: "tobe", nivel: "A1", tema: "Verbo To Be", titulo: "Verbo To Be (Ser / Estar)",
      keywords: ["to be", "ser", "estar", "soy", "estoy", "contracciones"],
      texto: "To Be unifica SER y ESTAR en un solo verbo. La traducción depende del complemento.",
      secciones: [
        { sub: "Conjugación con traducción", texto: "Presente.", ejemplos: ["I am = yo soy / estoy", "You are = tú eres / estás", "He is = él es / está", "We are = nosotros somos / estamos", "They are = ellos son / están"], error: "", ids: [] },
        { sub: "Contracciones", texto: "Forma corta afirmativa.", ejemplos: ["I'm", "you're", "he's", "she's", "it's", "we're", "they're"], error: "", ids: [] },
        { sub: "Negación", texto: "NOT después del verbo.", ejemplos: ["am not", "is not = isn't", "are not = aren't"], error: "", ids: [] }
      ], video: ""
    },
    {
      id: "gerundio", nivel: "A1", tema: "Gerundio", titulo: "El Gerundio (-ING): TODAS las reglas",
      keywords: ["gerundio", "ing", "ando", "endo", "write", "run", "study", "swim"],
      texto: "El gerundio equivale a -ANDO / -ENDO en español. Se usa en los tiempos continuos. CON -ING = estar + ando/endo.",
      secciones: [
        { sub: "Regla 1 — General: + ING", texto: "Al verbo en forma base se le agrega -ING.", ejemplos: ["work → working", "eat → eating", "play → playing"], error: "", ids: ["ger-general"] },
        { sub: "Regla 2 — Termina en -E muda", texto: "La -E se reemplaza por -ING (se quita).", ejemplos: ["write → writing", "dance → dancing"], error: "Error común: writeing (la E no se queda).", ids: ["ger-e"] },
        { sub: "Regla 3 — Monosílabo C-V-C", texto: "Consonante-Vocal-Consonante: se duplica la última consonante y se agrega -ING.", ejemplos: ["run → running", "swim → swimming", "sit → sitting"], error: "Error común: runing / swiming (falta duplicar).", ids: ["ger-cvc"] },
        { sub: "Regla 4 — Consonante + Y", texto: "La Y se queda sin cambios; solo se agrega -ING.", ejemplos: ["study → studying", "try → trying"], error: "Error común: studing (no se pierde la Y).", ids: ["ger-y"] }
      ], video: ""
    },
    {
      id: "simple-continuo", nivel: "A1", tema: "Tiempos", titulo: "Simple vs Continuo (Regla de Oro)",
      keywords: ["simple", "continuo", "ing", "diferencia"],
      texto: "Dos tiempos distintos. El -ING es lo único que los separa.",
      secciones: [
        { sub: "SIMPLE: sin -ING", texto: "Ser/estar básico o verbo solo. Estados, hábitos, identidad.", ejemplos: ["It is a house. = Es una casa.", "He writes. = Él escribe."], error: "", ids: [] },
        { sub: "CONTINUO: con -ING", texto: "Estar + ando/endo. Acciones en proceso.", ejemplos: ["I am working. = Estoy trabajando.", "He is writing. = Él está escribiendo."], error: "", ids: [] },
        { sub: "Regla de Oro", texto: "Sin -ING = Simple. Con -ING = Continuo.", ejemplos: ["He writes (simple) vs He is writing (continuo)"], error: "Error común: usar -ING en el simple.", ids: [] }
      ], video: ""
    },
    {
      id: "negacion", nivel: "A1", tema: "Negación", titulo: "Negación: NOT después del auxiliar",
      keywords: ["not", "negar", "negacion", "don't", "isn't"],
      texto: "Para negar en inglés, la palabra NOT va siempre después del auxiliar. Sin excepciones.",
      secciones: [
        { sub: "Negar en SIMPLE", texto: "do / does + not + verbo sin -ING.", ejemplos: ["I do not run.", "You do not dance.", "They do not sing."], error: "", ids: [] },
        { sub: "Negar en CONTINUO", texto: "am / is / are + not + verbo con -ING.", ejemplos: ["He is not writing.", "She is not reading.", "They are not sleeping."], error: "", ids: [] },
        { sub: "Contracciones", texto: "Forma corta.", ejemplos: ["don't", "doesn't", "isn't", "aren't"], error: "Error común: I run not (NOT sin auxiliar o antes del auxiliar).", ids: [] }
      ], video: ""
    },
    {
      id: "auxiliares", nivel: "A1", tema: "Negación", titulo: "Verbos auxiliares",
      keywords: ["auxiliar", "do", "does", "am", "is", "are"],
      texto: "Los auxiliares acompañan al verbo principal y definen el tiempo de la oración.",
      secciones: [
        { sub: "Auxiliar del CONTINUO: TO BE", texto: "Por persona.", ejemplos: ["1ª → am", "2ªs → are", "3ªs → is"], error: "", ids: [] },
        { sub: "Auxiliar del SIMPLE: DO / DOES", texto: "Por persona.", ejemplos: ["1ª y 2ªs → do", "3ªs → does"], error: "", ids: [] },
        { sub: "¿Para qué sirven?", texto: "Definen el tiempo y permiten negar y preguntar.", ejemplos: ["do not run (simple)", "is not writing (continuo)"], error: "", ids: [] }
      ], video: ""
    },
    {
      id: "tercera-s", nivel: "A1", tema: "Tercera persona", titulo: "3ª persona del Simple: -S / -ES / -IES / HAS",
      keywords: ["tercera", "s", "es", "ies", "has", "goes"],
      texto: "En el presente simple, la 3ª persona singular (he/she/it) transforma el verbo.",
      secciones: [
        { sub: "Regla general: + S", texto: "Se agrega -S.", ejemplos: ["wait → waits", "run → runs", "eat → eats"], error: "", ids: [] },
        { sub: "Termina en O, X, S, SH, Z: + ES", texto: "Se agrega -ES.", ejemplos: ["go → goes", "do → does"], error: "", ids: [] },
        { sub: "Consonante + Y: Y → IES", texto: "La Y cambia a IES.", ejemplos: ["study → studies", "try → tries"], error: "", ids: [] },
        { sub: "have → has", texto: "Irregular.", ejemplos: ["have → has"], error: "Error común: he write (falta la -S).", ids: [] }
      ], video: ""
    },
    {
      id: "pronombre-obligatorio", nivel: "A1", tema: "Reglas de oro", titulo: "El pronombre nunca se omite",
      keywords: ["pronombre", "omitir", "sujeto"],
      texto: "En inglés el pronombre siempre se escribe, aunque en español no aparezca.",
      secciones: [
        { sub: "Siempre escrito", texto: "Todas las frases llevan su pronombre.", ejemplos: ["Corro. → I run.", "Llueve. → It rains."], error: "Error común: Run. sin pronombre.", ids: [] }
      ], video: ""
    },
    {
      id: "preposiciones", nivel: "A1", tema: "Preposiciones", titulo: "Preposiciones IN / ON / AT",
      keywords: ["in", "on", "at", "preposicion", "tiempo", "lugar"],
      texto: "IN / ON / AT se usan para lugar y tiempo. Cada una tiene su territorio.",
      secciones: [
        { sub: "AT — hora y puntos específicos", texto: "Horas exactas y momentos.", ejemplos: ["at 3:00", "at 8:00 AM", "at night"], error: "", ids: [] },
        { sub: "ON — superficies, días y fechas", texto: "Días, fechas y calles.", ejemplos: ["on the table", "on Monday", "on May 1st", "on Main Street"], error: "", ids: [] },
        { sub: "IN — espacios cerrados y periodos largos", texto: "Meses, años, estaciones, lugares cerrados.", ejemplos: ["in the car", "in an apartment", "in September", "in summer", "in the morning"], error: "Error común: in Monday / at September.", ids: [] }
      ], video: ""
    },
    {
      id: "vocab-verbos", nivel: "A1", tema: "Vocabulario", titulo: "Verbos base del método",
      keywords: ["verbos", "run", "write", "work", "study", "traduccion"],
      texto: "Los verbos base del método con su traducción al español. Úsalos como referencia en los ejercicios.",
      secciones: [
        { sub: "Los 10 verbos", texto: "Forma base = sin -ING, sin -S.", ejemplos: ["run = correr", "dance = bailar", "write = escribir", "read = leer", "eat = comer", "sing = cantar", "sleep = dormir", "think = pensar", "try = intentar", "wait = esperar"], error: "", ids: [] },
        { sub: "Verbos adicionales", texto: "Para reglas especiales.", ejemplos: ["work = trabajar", "study = estudiar", "go = ir", "do = hacer", "have = tener"], error: "", ids: [] }
      ], video: ""
    },
    {
      id: "vocab-a1", nivel: "A1", tema: "Vocabulario", titulo: "Vocabulario Oficial A1 (73 palabras)",
      keywords: ["vocabulario", "verbos", "sustantivos", "palabras", "biblioteca", "run", "work", "student", "teacher", "city", "traduccion", "repaso"],
      texto: "Los 33 verbos y 40 sustantivos oficiales del Nivel A1 con traducción, formas y regla aplicada. Cero palabras sin traducción (Regla #9).",
      secciones: [
        { sub: "Vocabulario interactivo", texto: "Usa el buscador o los filtros por categoría. Toca 🔊 para escuchar cada palabra.", ejemplos: [], error: "", ids: [], vocab: true }
      ], video: ""
    }
  ];

  function findRule2(id) {
    for (var i = 0; i < LIB2.length; i++) {
      var r = LIB2[i];
      if (r.id === id) return r;
      for (var s = 0; s < r.secciones.length; s++) {
        if (r.secciones[s].ids && r.secciones[s].ids.indexOf(id) > -1) return r;
      }
    }
    return null;
  }

  function hlSection(rule, id) {
    for (var s = 0; s < rule.secciones.length; s++) {
      if (rule.secciones[s].ids && rule.secciones[s].ids.indexOf(id) > -1) return s;
    }
    return -1;
  }

  function ytId2(url) {
    if (!url) return null;
    var m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
    if (m) return m[1];
    if (/^[\w-]{11}$/.test(String(url).trim())) return String(url).trim();
    return null;
  }

  function videoUrl2(rule) {
    try {
      var v = localStorage.getItem("aurix_lib_video_" + rule.id);
      if (v) return v;
    } catch (e) {}
    return rule.video || "";
  }

  function search2(q) {
    q = String(q || "").toLowerCase().trim();
    if (!q) return LIB2;
    var words = q.split(/\s+/);
    return LIB2.filter(function (r) {
      var hay = (r.titulo + " " + r.tema + " " + r.keywords.join(" ") + " " + r.texto + " " +
        r.secciones.map(function (s) { return s.sub + " " + s.texto + " " + s.ejemplos.join(" "); }).join(" ")
      ).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) > -1; });
    });
  }

  var lastQ2 = "";

  function list2(q) {
    lastQ2 = q || "";
    var body = document.getElementById("lib2Body");
    if (!body) return;
    var res = search2(lastQ2);
    if (!res.length) {
      body.innerHTML = '<div class="ms-sub">Sin resultados en Nivel A1.</div>';
      return;
    }
    body.innerHTML = res.map(function (r) {
      return '<div class="lib-item" data-lib="' + r.id + '">' +
        '<span class="lib-tema">' + r.tema + ' · ' + r.nivel + '</span>' +
        '<b>' + r.titulo + '</b>' +
      '</div>';
    }).join("");
  }

  function renderVocab2() {
    var body = document.getElementById("lib2Body");
    if (!body) return;

    var html =
      '<div class="lib-rule">' +
        '<span class="lib-tema">Vocabulario · A1</span>' +
        '<h3 class="lib-title">Vocabulario Oficial A1</h3>' +
        '<p class="lib-text"><b>Regla de producción:</b> ningún bloque puede usar palabras fuera de esta biblioteca. Toda palabra nueva se agrega aquí primero, siempre con su traducción (Regla #9).</p>' +
        '<div class="vocab-filters">' +
          '<button class="vocab-tab active" data-vtab="verbs" type="button">Verbos (' + A1_VERBS.length + ')</button>' +
          '<button class="vocab-tab" data-vtab="nouns" type="button">Sustantivos (' + A1_NOUNS.length + ')</button>' +
        '</div>' +
        '<div class="vocab-cats" id="vocabCats"></div>' +
        '<input id="vocabSearch" class="s4-input" type="text" placeholder="Busca: run, correr, library, biblioteca..." autocomplete="off">' +
        '<div id="vocabList" class="vocab-list"></div>' +
        '<div class="ob-actions"><button id="lib2Back" class="ob-small-btn">← Volver</button></div>' +
      '</div>';

    body.innerHTML = html;

    var state = { tab: "verbs", cat: "" };

    function speak(text) {
      try {
        if (window.AurixTTS && typeof window.AurixTTS.speakRichText === "function") {
          window.AurixTTS.speakRichText('**"' + text + '"**', "aurix");
        }
      } catch (e) {}
    }

    function ruleLabel(r) {
      var labels = {
        "irregular": "irregular",
        "s": "+s",
        "es": "+es",
        "ies": "consonante+y → ies",
        "regular": "regular",
        "quita_e": "quita la -e",
        "duplica_cvc": "duplica la última consonante",
        "y_sin_cambio": "y sin cambio",
        "vocal_y_sin_cambio": "vocal + y sin cambio",
        "sin_plural": "sin plural"
      };
      return labels[r] || r;
    }

    function renderCats() {
      var cats = ["escuela", "ciudad", "tiempo", "idiomas"];
      var el = document.getElementById("vocabCats");
      if (!el) return;
      el.innerHTML = '<button class="vocab-cat' + (state.cat === "" ? " active" : "") + '" data-vcat="" type="button">Todas</button>' +
        cats.map(function (c) {
          return '<button class="vocab-cat' + (state.cat === c ? " active" : "") + '" data-vcat="' + c + '" type="button">' + c.charAt(0).toUpperCase() + c.slice(1) + '</button>';
        }).join("");
    }

    function renderList() {
      var listEl = document.getElementById("vocabList");
      var q = "";
      var qEl = document.getElementById("vocabSearch");
      if (qEl) q = (qEl.value || "").toLowerCase().trim();
      if (!listEl) return;

      var data = state.tab === "verbs" ? A1_VERBS : A1_NOUNS;

      var items = data.filter(function (w) {
        if (state.cat && w.category !== state.cat) return false;
        if (!q) return true;
        var hay = state.tab === "verbs"
          ? (w.base + " " + w.es + " " + w.ing + " " + w.third).toLowerCase()
          : (w.singular + " " + w.es + " " + w.plural).toLowerCase();
        return hay.indexOf(q) > -1;
      });

      if (!items.length) {
        listEl.innerHTML = '<div class="ms-sub">Sin resultados.</div>';
        return;
      }

      listEl.innerHTML = items.map(function (w) {
        if (state.tab === "verbs") {
          return '<div class="vocab-item" data-vword="' + escapeHtml(w.base) + '">' +
            '<span class="vocab-say">🔊</span>' +
            '<span class="vocab-en">' + escapeHtml(w.base) + '</span>' +
            '<span class="vocab-es">= ' + escapeHtml(w.es) + '</span>' +
            '<div class="vocab-forms">' +
              '<div class="vocab-form"><b>-ing:</b> ' + escapeHtml(w.ing) + ' <i>(' + ruleLabel(w.rule_ing) + ')</i></div>' +
              '<div class="vocab-form"><b>3ª persona:</b> ' + escapeHtml(w.third) + ' <i>(' + ruleLabel(w.rule_third) + ')</i></div>' +
            '</div>' +
          '</div>';
        }
        return '<div class="vocab-item" data-vword="' + escapeHtml(w.singular) + '">' +
          '<span class="vocab-say">🔊</span>' +
          '<span class="vocab-en">' + escapeHtml(w.singular) + (w.plural ? ' / ' + escapeHtml(w.plural) : '') + '</span>' +
          '<span class="vocab-es">= ' + escapeHtml(w.es) + '</span>' +
          '<div class="vocab-forms"><div class="vocab-form"><b>Plural:</b> ' + (w.plural ? escapeHtml(w.plural) : '—') + ' <i>(' + ruleLabel(w.rule_plural) + ')</i></div></div>' +
        '</div>';
      }).join("");
    }

    function bindCats() {
      var catsEl = document.getElementById("vocabCats");
      if (!catsEl) return;
      catsEl.addEventListener("click", function (e) {
        var b = e.target.closest("[data-vcat]");
        if (!b) return;
        state.cat = b.getAttribute("data-vcat") || "";
        renderCats();
        renderList();
      });
    }

    function bindSearch() {
      var qEl = document.getElementById("vocabSearch");
      if (!qEl) return;
      qEl.addEventListener("input", renderList);
    }

    function bindList() {
      var listEl = document.getElementById("vocabList");
      if (!listEl) return;
      listEl.addEventListener("click", function (e) {
        var say = e.target.closest(".vocab-say");
        if (say) {
          var item = say.closest(".vocab-item");
          if (item && item.getAttribute("data-vword")) speak(item.getAttribute("data-vword"));
          return;
        }
      });
    }

    document.querySelectorAll(".vocab-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.tab = btn.getAttribute("data-vtab");
        document.querySelectorAll(".vocab-tab").forEach(function (b) { b.classList.toggle("active", b === btn); });
        renderList();
      });
    });

    renderCats();
    renderList();
    bindCats();
    bindSearch();
    bindList();

    document.getElementById("lib2Back").addEventListener("click", function () {
      list2(lastQ2);
    });
  }

  function openRule2(id) {
    var rule = findRule2(id) || LIB2[0];

    if (rule.id === "vocab-a1") {
      renderVocab2();
      return;
    }

    var hi = hlSection(rule, id);
    var body = document.getElementById("lib2Body");
    var sug = document.getElementById("lib2Suggest");
    if (!body) return;
    if (sug) sug.innerHTML = "";

    var vid = videoUrl2(rule);
    var yid = ytId2(vid);
    var vidHtml = yid
      ? '<div class="yt-frame" style="display:block;"><iframe src="https://www.youtube.com/embed/' + yid + '" title="Video de la regla" frameborder="0" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>'
      : "";

    var html =
      '<div class="lib-rule">' +
        '<span class="lib-tema">' + rule.tema + ' · ' + rule.nivel + '</span>' +
        '<h3 class="lib-title">' + rule.titulo + '</h3>' +
        '<p class="lib-text">' + rule.texto + '</p>';

    rule.secciones.forEach(function (sec, i) {
      html +=
        '<div class="lib-sec' + (i === hi ? " lib-hl" : "") + '">' +
          '<div class="lib-sec-title">' + sec.sub + '</div>' +
          '<div class="lib-sec-text">' + sec.texto + '</div>' +
          sec.ejemplos.map(function (x) { return '<div class="s4-rule">• ' + x + '</div>'; }).join("") +
          (sec.error ? '<div class="lib-err">⚠ ' + sec.error + '</div>' : "") +
        '</div>';
    });

    html +=
        vidHtml +
        '<div class="yt-controls">' +
          '<input id="lib2VideoInput" class="s4-input yt-input" type="text" placeholder="Pega el link de YouTube de esta regla..." value="' + vid.replace(/"/g, "&quot;") + '">' +
          '<button id="lib2VideoSave" class="btn yt-load" type="button" data-rule="' + rule.id + '">Vincular</button>' +
        '</div>' +
        '<div class="ob-actions"><button id="lib2Back" class="ob-small-btn">← Volver</button></div>' +
      '</div>';

    body.innerHTML = html;
  }

  function ensureModal2() {
    if (document.getElementById("lib2Modal")) return;

    var modal = document.createElement("div");
    modal.id = "lib2Modal";
    modal.className = "mic-modal hidden";
    modal.innerHTML =
      '<div class="mic-card">' +
        '<div class="ms-title">📚 Biblioteca AURIX · Nivel A1</div>' +
        '<input id="lib2Search" class="s4-input" type="text" placeholder="Busca: gerundio, not, preposiciones..." autocomplete="off">' +
        '<div id="lib2Suggest" class="lib-suggest"></div>' +
        '<div id="lib2Body" class="lib-body"></div>' +
        '<div class="ob-actions"><button id="lib2Close" class="btn">Cerrar</button></div>' +
      '</div>';
    document.body.appendChild(modal);

    document.getElementById("lib2Close").addEventListener("click", function () {
      modal.classList.add("hidden");
    });

    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.classList.add("hidden");
    });

    document.getElementById("lib2Search").addEventListener("input", function () {
      var q = this.value.trim();
      var sug = document.getElementById("lib2Suggest");
      if (!q) {
        sug.innerHTML = "";
        list2("");
        return;
      }
      var res = search2(q).slice(0, 5);
      sug.innerHTML = res.map(function (r) {
        return '<button class="lib-sug" type="button" data-lib="' + r.id + '">🔎 ' + r.titulo + '</button>';
      }).join("");
      list2(q);
    });

    document.getElementById("lib2Suggest").addEventListener("click", function (e) {
      var b = e.target.closest("[data-lib]");
      if (b) openRule2(b.getAttribute("data-lib"));
    });

    document.getElementById("lib2Body").addEventListener("click", function (e) {
      var item = e.target.closest(".lib-item");
      if (item) {
        openRule2(item.getAttribute("data-lib"));
        return;
      }
      if (e.target.id === "lib2VideoSave") {
        var rid = e.target.getAttribute("data-rule");
        try {
          localStorage.setItem("aurix_lib_video_" + rid, document.getElementById("lib2VideoInput").value.trim());
        } catch (err) {}
        openRule2(rid);
        return;
      }
      if (e.target.id === "lib2Back") {
        list2(lastQ2);
      }
    });
  }

  window.aurixOpenLib = function (ruleId) {
    ensureModal2();
    var old = document.getElementById("libModal");
    if (old) old.classList.add("hidden");
    document.getElementById("lib2Modal").classList.remove("hidden");
    if (ruleId) openRule2(ruleId);
    else list2("");
  };
})();

/* ============================================
   MENU UNICO FLOTANTE: TODAS LAS BURBUJAS
   EN UN SOLO LUGAR + CIERRE AUTOMATICO
============================================ */

(function () {
  if (window.__aurixMenuDockInjected) {
    return;
  }

  window.__aurixMenuDockInjected = true;

  var ORDER = [
    "#aurixBackBtn",
    "#aurixHomeBtn",
    "#aurixProgressFab",
    "#cloudUserChip",
    "#aurixLibFab",
    ".aurix-settings-toggle",
    ".aurix-mic-fab",
    ".aurix-repeat",
    ".aurix-power-btn"
  ];

  var timer = null;

  function dock() {
    return document.getElementById("aurixMenuDock");
  }

  function launcher() {
    return document.getElementById("aurixMenuLauncher");
  }

  function collect() {
    var d = dock();
    if (!d) return;

    ORDER.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el && el.parentNode !== d) {
        d.appendChild(el);
      }
    });

    /* La flecha del setup de mic ahora guia al menu */
    document.querySelectorAll(".ms-arrow span").forEach(function (s) {
      s.textContent = "abre ☰ y toca 🎤";
    });
  }

  function disarm() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function armAutoClose() {
    disarm();
    timer = setTimeout(function () {
      setOpen(false);
    }, 6000);
  }

  function setOpen(open) {
    var d = dock();
    var l = launcher();
    if (!d || !l) return;

    d.classList.toggle("open", open);
    l.innerHTML = open ? "✕" : "☰";

    if (open) armAutoClose();
    else disarm();
  }

  /* El menu solo aparece tras el protocolo de inicio (post-ADN) */
  function setEnabled(enabled) {
    var d = dock();
    var l = launcher();

    if (d) d.classList.toggle("menu-enabled", enabled);
    if (l) l.classList.toggle("menu-enabled", enabled);
  }

  window.aurixSetMenuEnabled = setEnabled;

  function init() {
    if (document.getElementById("aurixMenuLauncher")) return;

    var d = document.createElement("div");
    d.id = "aurixMenuDock";
    document.body.appendChild(d);

    var l = document.createElement("button");
    l.id = "aurixMenuLauncher";
    l.type = "button";
    l.innerHTML = "☰";
    l.setAttribute("aria-label", "Menú");
    document.body.appendChild(l);

    setEnabled(false);

    l.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(!d.classList.contains("open"));
    });

    /* Tras usar cualquier opcion, el menu se va */
    d.addEventListener("click", function () {
      armAutoClose();
      setTimeout(function () {
        setOpen(false);
      }, 450);
    });

    /* Tocar fuera tambien lo cierra */
    document.addEventListener("click", function (e) {
      if (d.classList.contains("open") && !d.contains(e.target) && e.target !== l) {
        setOpen(false);
      }
    }, true);

    collect();
    setInterval(collect, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* ============================================
   FORMATO MAESTRO DE HABILIDADES (BLOQUES R/L/S/W)
   Cada bloque = Gramatica (TTS + tabla) + Reading(10)
   + Listening(10) + Speaking(10) + Writing(10).
   Voz: narrador en espanol, AURIX en ingles.
   Regla #9: todo ingles siempre con su traduccion.
============================================ */

var MB_PENDING = [
  { id: "N1-B1", titulo: "Números" },
  { id: "N1-B2", titulo: "Animales" },
  { id: "N1-B3", titulo: "Frutas y colores" },
  { id: "N1-B4", titulo: "Días y meses" },
  { id: "N1-B5", titulo: "Pronombres" },
  { id: "N1-B6", titulo: "Saludos" },
  { id: "N1-B7", titulo: "Preguntas DO / DOES" },
  { id: "N1-B8", titulo: "Preguntas continuo AM / IS / ARE + -ING" },
  { id: "N1-B9", titulo: "Repaso mezclado de negación" }
];

var MASTER_BLOCKS = [
  {
    id: "N1-B10",
    key: "b10",
    titulo: "Preposiciones de lugar: IN / ON / AT",
    opciones: ["in", "on", "at"],
    palabras: [
      { en: "in", es: "dentro de / en (espacios cerrados)" },
      { en: "on", es: "sobre / en (superficies)" },
      { en: "at", es: "en (punto específico)" }
    ],
    regla: "En español usamos UNA palabra, \"en\". En inglés hay TRES: in, on, at. Por eso NO traduzcas literal: aprende bloques fijos. IN = espacios cerrados (dentro de). ON = superficies (sobre). AT = punto específico.",
    guion: "Bloque 10. Preposiciones de lugar: in, on, at. Atención: en español usamos una sola palabra, en. En inglés hay tres: in, on, at. Por eso no traduzcas literal. Aprende bloques fijos. Bloque IN: espacios cerrados o dentro de. **\"In the city\"**, en la ciudad. **\"In the library\"**, en la biblioteca. **\"In the office\"**, en la oficina. **\"In the house\"**, en la casa. Bloque ON: superficies, sobre. **\"On the table\"**, sobre la mesa. **\"On the computer\"**, sobre la computadora. **\"On the book\"**, sobre el libro. **\"On the bus\"**, en el autobús. Bloque AT: punto específico. **\"At the store\"**, en la tienda. **\"At the party\"**, en la fiesta. Regla de oro: el pronombre siempre se escribe. Nunca digas \"is in the library\". Di: **\"He is in the library\"**, él está en la biblioteca. **\"It is on the table\"**, eso está sobre la mesa. **\"They are at the party\"**, ellos están en la fiesta. Ahora completa la tabla. Primero piensa, luego revisa.",
    tabla: [
      { en: "the library", es: "la biblioteca", ans: "in" },
      { en: "the table", es: "la mesa", ans: "on" },
      { en: "the city", es: "la ciudad", ans: "in" },
      { en: "the computer", es: "la computadora", ans: "on" },
      { en: "the store", es: "la tienda", ans: "at" },
      { en: "the car", es: "el carro", ans: "in" },
      { en: "the party", es: "la fiesta", ans: "at" },
      { en: "the office", es: "la oficina", ans: "in" },
      { en: "the book", es: "el libro", ans: "on" },
      { en: "the bus", es: "el autobús", ans: "on" }
    ],
    reading: {
      pasaje: [
        { en: "I am a student. I am in the library.", es: "Yo soy un estudiante. Yo estoy en la biblioteca." },
        { en: "The book is on the table. The pen is on the computer.", es: "El libro está sobre la mesa. El bolígrafo está sobre la computadora." },
        { en: "He is a citizen. He is at the store.", es: "Él es un ciudadano. Él está en la tienda." },
        { en: "She is a teacher. She is in the office.", es: "Ella es una maestra. Ella está en la oficina." },
        { en: "We are in the city. They are at the party. The friends are on the bus.", es: "Nosotros estamos en la ciudad. Ellos están en la fiesta. Los amigos están en el autobús." }
      ],
      preguntas: [
        { q: "Where is the student?", qes: "¿Dónde está el estudiante?", opts: [{ t: "in the library", es: "en la biblioteca" }, { t: "at the store", es: "en la tienda" }, { t: "on the bus", es: "en el autobús" }], ans: 0 },
        { q: "Where is the book?", qes: "¿Dónde está el libro?", opts: [{ t: "on the table", es: "sobre la mesa" }, { t: "in the table", es: "dentro de la mesa" }, { t: "at the table", es: "en la mesa (punto)" }], ans: 0 },
        { q: "Where is the pen?", qes: "¿Dónde está el bolígrafo?", opts: [{ t: "in the computer", es: "dentro de la computadora" }, { t: "on the computer", es: "sobre la computadora" }, { t: "at the computer", es: "en la computadora (punto)" }], ans: 1 },
        { q: "Where is the citizen?", qes: "¿Dónde está el ciudadano?", opts: [{ t: "at the store", es: "en la tienda" }, { t: "on the store", es: "sobre la tienda" }, { t: "in the bus", es: "en el autobús" }], ans: 0 },
        { q: "Where is the teacher?", qes: "¿Dónde está la maestra?", opts: [{ t: "in the office", es: "en la oficina" }, { t: "at the office", es: "en la oficina (punto)" }, { t: "on the office", es: "sobre la oficina" }], ans: 0 },
        { q: "Where are we?", qes: "¿Dónde estamos?", opts: [{ t: "in the city", es: "en la ciudad" }, { t: "on the city", es: "sobre la ciudad" }, { t: "at the city", es: "en la ciudad (punto)" }], ans: 0 },
        { q: "Where are they?", qes: "¿Dónde están ellos?", opts: [{ t: "in the party", es: "dentro de la fiesta" }, { t: "at the party", es: "en la fiesta" }, { t: "on the party", es: "sobre la fiesta" }], ans: 1 },
        { q: "Where are the friends?", qes: "¿Dónde están los amigos?", opts: [{ t: "on the bus", es: "en el autobús" }, { t: "in the bus", es: "dentro del autobús" }, { t: "at the bus", es: "en el autobús (punto)" }], ans: 0 },
        { q: "Is the book on the computer?", qes: "¿Está el libro sobre la computadora?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
        { q: "Is she in the office?", qes: "¿Está ella en la oficina?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 0 }
      ]
    },
    listening: [
      { audio: "He is in the car.", q: "Where is he?", qes: "¿Dónde está él?", opts: [{ t: "in the car", es: "en el carro" }, { t: "at the store", es: "en la tienda" }], ans: 0 },
      { audio: "The book is on the table.", q: "Where is the book?", qes: "¿Dónde está el libro?", opts: [{ t: "on the table", es: "sobre la mesa" }, { t: "in the library", es: "en la biblioteca" }], ans: 0 },
      { audio: "She is at the store.", q: "Where is she?", qes: "¿Dónde está ella?", opts: [{ t: "at the store", es: "en la tienda" }, { t: "in the office", es: "en la oficina" }], ans: 0 },
      { audio: "They are at the party.", q: "Where are they?", qes: "¿Dónde están?", opts: [{ t: "on the bus", es: "en el autobús" }, { t: "at the party", es: "en la fiesta" }], ans: 1 },
      { audio: "We are in the city.", q: "Where are we?", qes: "¿Dónde estamos?", opts: [{ t: "in the city", es: "en la ciudad" }, { t: "at the party", es: "en la fiesta" }], ans: 0 },
      { audio: "The pen is on the computer.", q: "Where is the pen?", qes: "¿Dónde está el bolígrafo?", opts: [{ t: "on the computer", es: "sobre la computadora" }, { t: "on the table", es: "sobre la mesa" }], ans: 0 },
      { audio: "I am on the bus.", q: "Where is the person?", qes: "¿Dónde está la persona?", opts: [{ t: "in the house", es: "en la casa" }, { t: "on the bus", es: "en el autobús" }], ans: 1 },
      { audio: "He is in the office.", q: "Where is he?", qes: "¿Dónde está él?", opts: [{ t: "in the office", es: "en la oficina" }, { t: "at the store", es: "en la tienda" }], ans: 0 },
      { audio: "She is in the house.", q: "Where is she?", qes: "¿Dónde está ella?", opts: [{ t: "in the house", es: "en la casa" }, { t: "on the house", es: "sobre la casa" }], ans: 0 },
      { audio: "It is on the book.", q: "Where is it?", qes: "¿Dónde está?", opts: [{ t: "on the book", es: "sobre el libro" }, { t: "in the book", es: "dentro del libro" }], ans: 0 }
    ],
    speaking: [
      { tipo: "Repetición", en: "I am in the library.", es: "Estoy en la biblioteca." },
      { tipo: "Repetición", en: "The book is on the table.", es: "El libro está sobre la mesa." },
      { tipo: "Repetición", en: "He is at the store.", es: "Él está en la tienda." },
      { tipo: "Lectura", en: "She is in the office.", es: "Ella está en la oficina." },
      { tipo: "Lectura", en: "They are at the party.", es: "Ellos están en la fiesta." },
      { tipo: "Lectura", en: "We are on the bus.", es: "Nosotros estamos en el autobús." },
      { tipo: "Respuesta", prompt: "Where is the book?", promptEs: "¿Dónde está el libro?", en: "The book is on the table.", es: "El libro está sobre la mesa." },
      { tipo: "Respuesta", prompt: "Where is she?", promptEs: "¿Dónde está ella?", en: "She is in the library.", es: "Ella está en la biblioteca." },
      { tipo: "Producción", prompt: "Di dónde estás tú (contexto estudiante).", en: "I am in the class.", es: "Estoy en la clase." },
      { tipo: "Producción", prompt: "Di dónde está un ciudadano.", en: "He is at the store.", es: "Él está en la tienda." }
    ],
    writing: [
      { es: "Él está en la biblioteca.", en: ["he is in the library"] },
      { es: "El libro está sobre la mesa.", en: ["the book is on the table"] },
      { es: "Nosotros estamos en la ciudad.", en: ["we are in the city"] },
      { es: "El bolígrafo está sobre la computadora.", en: ["the pen is on the computer"] },
      { es: "Ella está en la tienda.", en: ["she is at the store"] },
      { es: "Ellos están en la fiesta.", en: ["they are at the party"] },
      { es: "Yo estoy en el carro.", en: ["i am in the car"] },
      { es: "Tú estás en el autobús.", en: ["you are on the bus"] },
      { es: "Ella está en la oficina.", en: ["she is in the office"] },
      { es: "Eso está sobre el libro.", en: ["it is on the book"] }
    ]
  },
  {
    id: "N1-B11",
    key: "b11",
    titulo: "Preposiciones de tiempo: IN / ON / AT",
    opciones: ["in", "on", "at"],
    palabras: [
      { en: "in", es: "periodos largos (meses, estaciones, la mañana)" },
      { en: "on", es: "días de la semana" },
      { en: "at", es: "punto específico (la noche)" }
    ],
    regla: "Mismas palabras que en el lugar: in, on, at. IN = periodos largos (meses, estaciones, \"la mañana\"). ON = días de la semana. AT = punto específico; la noche es un punto: at night. No confundas: la mañana es IN, pero la noche es AT. Es un bloque fijo, no se traduce literal.",
    guion: "Bloque 11. Preposiciones de tiempo. Mismas palabras: in, on, at. Pero ahora con bloques de tiempo. Bloque IN: periodos largos. Meses, estaciones y la mañana. **\"In September\"**, en septiembre. **\"In summer\"**, en verano. **\"In the morning\"**, en la mañana. Bloque ON: días de la semana. **\"On Monday\"**, el lunes. **\"On Mondays\"**, los lunes. Bloque AT: punto específico. La noche es un punto: at night. **\"At night\"**, en la noche. No confundas: la mañana es in, pero la noche es at. Es un bloque fijo, no se traduce literal. **\"I study in the morning\"**, yo estudio en la mañana. **\"He works on Mondays\"**, él trabaja los lunes. **\"She reads at night\"**, ella lee en la noche. Recuerda: pronombre obligatorio siempre. Ahora completa la tabla. Primero piensa, luego revisa.",
    tabla: [
      { en: "Monday", es: "lunes", ans: "on" },
      { en: "September", es: "septiembre", ans: "in" },
      { en: "night", es: "noche", ans: "at" },
      { en: "the morning", es: "la mañana", ans: "in" },
      { en: "summer", es: "verano", ans: "in" },
      { en: "Mondays", es: "los lunes", ans: "on" }
    ],
    reading: {
      pasaje: [
        { en: "I am a student. I study in the morning. I do not study at night.", es: "Yo soy un estudiante. Yo estudio en la mañana. Yo no estudio en la noche." },
        { en: "He is a citizen. He works on Mondays.", es: "Él es un ciudadano. Él trabaja los lunes." },
        { en: "She is a teacher. She reads at night.", es: "Ella es una maestra. Ella lee en la noche." },
        { en: "We travel in September. They play in summer. The class is on Monday.", es: "Nosotros viajamos en septiembre. Ellos juegan en verano. La clase es el lunes." }
      ],
      preguntas: [
        { q: "When does the student study?", qes: "¿Cuándo estudia el estudiante?", opts: [{ t: "in the morning", es: "en la mañana" }, { t: "at night", es: "en la noche" }, { t: "on Monday", es: "el lunes" }], ans: 0 },
        { q: "Does the student study at night?", qes: "¿Estudia el estudiante en la noche?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
        { q: "When does he work?", qes: "¿Cuándo trabaja él?", opts: [{ t: "on Mondays", es: "los lunes" }, { t: "in summer", es: "en verano" }, { t: "at night", es: "en la noche" }], ans: 0 },
        { q: "When does she read?", qes: "¿Cuándo lee ella?", opts: [{ t: "at night", es: "en la noche" }, { t: "in the morning", es: "en la mañana" }, { t: "on summer", es: "en verano" }], ans: 0 },
        { q: "When do we travel?", qes: "¿Cuándo viajamos?", opts: [{ t: "in September", es: "en septiembre" }, { t: "on September", es: "en septiembre (día)" }, { t: "at September", es: "en septiembre (punto)" }], ans: 0 },
        { q: "When do they play?", qes: "¿Cuándo juegan ellos?", opts: [{ t: "in summer", es: "en verano" }, { t: "at summer", es: "en verano (punto)" }, { t: "on night", es: "en noche" }], ans: 0 },
        { q: "When is the class?", qes: "¿Cuándo es la clase?", opts: [{ t: "on Monday", es: "el lunes" }, { t: "in Monday", es: "en lunes" }, { t: "at Monday", es: "en lunes (punto)" }], ans: 0 },
        { q: "Does he work on Mondays?", qes: "¿Trabaja él los lunes?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 0 },
        { q: "Do they play in September?", qes: "¿Juegan ellos en septiembre?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
        { q: "Does she read in the morning?", qes: "¿Lee ella en la mañana?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 }
      ]
    },
    listening: [
      { audio: "I work on Mondays.", q: "When do I work?", qes: "¿Cuándo trabajo?", opts: [{ t: "on Mondays", es: "los lunes" }, { t: "at night", es: "en la noche" }], ans: 0 },
      { audio: "She studies in the morning.", q: "When does she study?", qes: "¿Cuándo estudia ella?", opts: [{ t: "in the morning", es: "en la mañana" }, { t: "on Monday", es: "el lunes" }], ans: 0 },
      { audio: "He reads at night.", q: "When does he read?", qes: "¿Cuándo lee él?", opts: [{ t: "at night", es: "en la noche" }, { t: "in the morning", es: "en la mañana" }], ans: 0 },
      { audio: "We travel in September.", q: "When do we travel?", qes: "¿Cuándo viajamos?", opts: [{ t: "in September", es: "en septiembre" }, { t: "on Mondays", es: "los lunes" }], ans: 0 },
      { audio: "They swim in summer.", q: "When do they swim?", qes: "¿Cuándo nadan?", opts: [{ t: "in summer", es: "en verano" }, { t: "at night", es: "en la noche" }], ans: 0 },
      { audio: "The class is on Monday.", q: "When is the class?", qes: "¿Cuándo es la clase?", opts: [{ t: "on Monday", es: "el lunes" }, { t: "in summer", es: "en verano" }], ans: 0 },
      { audio: "I do not work at night.", q: "When do I NOT work?", qes: "¿Cuándo NO trabajo?", opts: [{ t: "at night", es: "en la noche" }, { t: "on Mondays", es: "los lunes" }], ans: 0 },
      { audio: "He runs in the morning.", q: "When does he run?", qes: "¿Cuándo corre él?", opts: [{ t: "in the morning", es: "en la mañana" }, { t: "at night", es: "en la noche" }], ans: 0 },
      { audio: "She watches television at night.", q: "When does she watch television?", qes: "¿Cuándo mira TV?", opts: [{ t: "at night", es: "en la noche" }, { t: "in September", es: "en septiembre" }], ans: 0 },
      { audio: "We play on Mondays.", q: "When do we play?", qes: "¿Cuándo jugamos?", opts: [{ t: "on Mondays", es: "los lunes" }, { t: "in the morning", es: "en la mañana" }], ans: 0 }
    ],
    speaking: [
      { tipo: "Repetición", en: "I work on Mondays.", es: "Trabajo los lunes." },
      { tipo: "Repetición", en: "She studies in the morning.", es: "Ella estudia en la mañana." },
      { tipo: "Repetición", en: "He reads at night.", es: "Él lee en la noche." },
      { tipo: "Lectura", en: "We travel in September.", es: "Viajamos en septiembre." },
      { tipo: "Lectura", en: "They swim in summer.", es: "Ellos nadan en verano." },
      { tipo: "Lectura", en: "The class is on Monday.", es: "La clase es el lunes." },
      { tipo: "Respuesta", prompt: "When do you work?", promptEs: "¿Cuándo trabajas?", en: "I work on Mondays.", es: "Trabajo los lunes." },
      { tipo: "Respuesta", prompt: "When do you study?", promptEs: "¿Cuándo estudias?", en: "I study in the morning.", es: "Estudio en la mañana." },
      { tipo: "Producción", prompt: "Di cuándo estudias tú.", en: "I study in the morning.", es: "Estudio en la mañana." },
      { tipo: "Producción", prompt: "Di cuándo trabaja un ciudadano.", en: "He works on Mondays.", es: "Él trabaja los lunes." }
    ],
    writing: [
      { es: "Él trabaja los lunes.", en: ["he works on mondays"] },
      { es: "Ella estudia en la mañana.", en: ["she studies in the morning"] },
      { es: "Nosotros no miramos televisión en la noche.", en: ["we do not watch television at night", "we don't watch television at night"] },
      { es: "Ellos viajan en septiembre.", en: ["they travel in september"] },
      { es: "Yo nado en verano.", en: ["i swim in summer"] },
      { es: "¿Trabajas tú los lunes?", en: ["do you work on mondays"] },
      { es: "Ella lee en la noche.", en: ["she reads at night"] },
      { es: "Él corre en la mañana.", en: ["he runs in the morning"] },
      { es: "Nosotros jugamos los lunes.", en: ["we play on mondays"] },
      { es: "Él no trabaja en verano.", en: ["he does not work in summer"] }
    ]
  },
  {
    id: "N1-B12",
    key: "b12",
    titulo: "Pronombres de objeto: ME / YOU / HIM / HER / IT / US / THEM",
    opciones: ["me", "you", "him", "her", "it", "us", "them"],
    palabras: [
      { en: "me", es: "a mí / me" },
      { en: "you", es: "a ti / a ustedes / te" },
      { en: "him", es: "a él / lo" },
      { en: "her", es: "a ella / la" },
      { en: "it", es: "eso / lo" },
      { en: "us", es: "a nosotros / nos" },
      { en: "them", es: "a ellos / a ellas / los" }
    ],
    regla: "Recuerda la regla de oro: en inglés el sujeto SIEMPRE se escribe. Pero el pronombre de OBJETO es la persona o cosa que RECIBE la acción del verbo y va DESPUÉS del verbo. I cambia a me; he cambia a him; she cambia a her; we cambia a us; they cambia a them. You y it NO cambian.",
    guion: "Bloque 12. Pronombres de objeto. Recuerda la regla de oro: en inglés el sujeto siempre se escribe. Pero hoy vemos el OBJETO: la persona o cosa que recibe la acción del verbo. Cuando yo recibe la acción, cambia a me. **\"Me\"**, a mí. Cuando tú o ustedes reciben la acción, se queda you. **\"You\"**, a ti o a ustedes. Cuando él recibe la acción, cambia a him. **\"Him\"**, a él. Cuando ella recibe la acción, cambia a her. **\"Her\"**, a ella. Cuando eso recibe la acción, se queda it. **\"It\"**, eso. Cuando nosotros recibe la acción, cambia a us. **\"Us\"**, a nosotros. Cuando ellos o ellas reciben la acción, cambia a them. **\"Them\"**, a ellos o a ellas. Tabla de cambio: I cambia a me. He cambia a him. She cambia a her. We cambia a us. They cambia a them. You y it no cambian. Ejemplos: el objeto va después del verbo. **\"She teaches me\"**, ella me enseña a mí. **\"I watch him\"**, yo lo miro a él. **\"He watches her\"**, él la mira a ella. **\"We need it\"**, nosotros necesitamos eso. **\"You teach us\"**, tú nos enseñas a nosotros. **\"They watch them\"**, ellos los miran a ellos. Regla de oro: el sujeto siempre se escribe. Nunca digas solo teaches me. Di: **\"She teaches me\"**, ella me enseña a mí. Ahora completa la tabla. Primero piensa, luego revisa.",
    tabla: [
      { en: "I", es: "yo", ans: "me" },
      { en: "you", es: "tú", ans: "you" },
      { en: "he", es: "él", ans: "him" },
      { en: "she", es: "ella", ans: "her" },
      { en: "it", es: "eso", ans: "it" },
      { en: "we", es: "nosotros", ans: "us" },
      { en: "they", es: "ellos", ans: "them" },
      { en: "She teaches ___", es: "a mí", ans: "me" },
      { en: "I watch ___", es: "a él", ans: "him" },
      { en: "He watches ___", es: "a ella", ans: "her" },
      { en: "We need ___", es: "eso", ans: "it" },
      { en: "You teach ___", es: "a nosotros", ans: "us" },
      { en: "They watch ___", es: "a ellos", ans: "them" }
    ],
    reading: {
      pasaje: [
        { en: "I am a student. The teacher teaches me. I watch the teacher. I watch him.", es: "Yo soy un estudiante. El maestro me enseña a mí. Yo miro al maestro. Yo lo miro a él." },
        { en: "He is a citizen. He needs the book. He reads it.", es: "Él es un ciudadano. Él necesita el libro. Él lo lee." },
        { en: "She is a teacher. The students watch her.", es: "Ella es una maestra. Los estudiantes la miran a ella." },
        { en: "We are friends. They watch us. We watch them.", es: "Nosotros somos amigos. Ellos nos miran a nosotros. Nosotros los miramos a ellos." }
      ],
      preguntas: [
        { q: "Who teaches me?", qes: "¿Quién me enseña a mí?", opts: [{ t: "the teacher", es: "el maestro" }, { t: "the citizen", es: "el ciudadano" }, { t: "the student", es: "el estudiante" }], ans: 0 },
        { q: "Who do I watch?", qes: "¿A quién miro yo?", opts: [{ t: "him", es: "a él" }, { t: "her", es: "a ella" }, { t: "them", es: "a ellos" }], ans: 0 },
        { q: "What does he need?", qes: "¿Qué necesita él?", opts: [{ t: "the book", es: "el libro" }, { t: "the pen", es: "el bolígrafo" }, { t: "the computer", es: "la computadora" }], ans: 0 },
        { q: "What does he read?", qes: "¿Qué lee él?", opts: [{ t: "it", es: "eso / el libro" }, { t: "me", es: "a mí" }, { t: "us", es: "a nosotros" }], ans: 0 },
        { q: "Who do the students watch?", qes: "¿A quién miran los estudiantes?", opts: [{ t: "her", es: "a ella" }, { t: "him", es: "a él" }, { t: "me", es: "a mí" }], ans: 0 },
        { q: "Are we friends?", qes: "¿Somos amigos?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 0 },
        { q: "Who watches us?", qes: "¿Quién nos mira a nosotros?", opts: [{ t: "they", es: "ellos" }, { t: "he", es: "él" }, { t: "it", es: "eso" }], ans: 0 },
        { q: "Who do we watch?", qes: "¿A quién miramos nosotros?", opts: [{ t: "them", es: "a ellos" }, { t: "us", es: "a nosotros" }, { t: "me", es: "a mí" }], ans: 0 },
        { q: "Is she a student?", qes: "¿Es ella una estudiante?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
        { q: "Does he read the book?", qes: "¿Lee él el libro?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 0 }
      ]
    },
    listening: [
      { audio: "She teaches me.", q: "Who teaches?", qes: "¿Quién enseña?", opts: [{ t: "she", es: "ella" }, { t: "he", es: "él" }, { t: "they", es: "ellos" }], ans: 0 },
      { audio: "I watch him.", q: "Who do I watch?", qes: "¿A quién miro?", opts: [{ t: "him", es: "a él" }, { t: "her", es: "a ella" }, { t: "us", es: "a nosotros" }], ans: 0 },
      { audio: "He reads it.", q: "What does he read?", qes: "¿Qué lee él?", opts: [{ t: "it", es: "eso" }, { t: "them", es: "a ellos" }, { t: "me", es: "a mí" }], ans: 0 },
      { audio: "They watch us.", q: "Who watches us?", qes: "¿Quién nos mira?", opts: [{ t: "they", es: "ellos" }, { t: "she", es: "ella" }, { t: "I", es: "yo" }], ans: 0 },
      { audio: "We watch them.", q: "Who do we watch?", qes: "¿A quién miramos?", opts: [{ t: "them", es: "a ellos" }, { t: "him", es: "a él" }, { t: "it", es: "eso" }], ans: 0 },
      { audio: "He needs the book.", q: "What does he need?", qes: "¿Qué necesita?", opts: [{ t: "the book", es: "el libro" }, { t: "the pen", es: "el bolígrafo" }, { t: "water", es: "agua" }], ans: 0 },
      { audio: "The students watch her.", q: "Who do the students watch?", qes: "¿A quién miran?", opts: [{ t: "her", es: "a ella" }, { t: "him", es: "a él" }, { t: "them", es: "a ellos" }], ans: 0 },
      { audio: "I like it.", q: "What do I like?", qes: "¿Qué me gusta?", opts: [{ t: "it", es: "eso" }, { t: "him", es: "él" }, { t: "her", es: "ella" }], ans: 0 },
      { audio: "She watches them.", q: "Who does she watch?", qes: "¿A quién mira ella?", opts: [{ t: "them", es: "a ellos" }, { t: "us", es: "a nosotros" }, { t: "me", es: "a mí" }], ans: 0 },
      { audio: "You teach us.", q: "Who teaches us?", qes: "¿Quién nos enseña?", opts: [{ t: "you", es: "tú" }, { t: "they", es: "ellos" }, { t: "he", es: "él" }], ans: 0 }
    ],
    speaking: [
      { tipo: "Repetición", en: "She teaches me.", es: "Ella me enseña a mí." },
      { tipo: "Repetición", en: "I watch him.", es: "Yo lo miro a él." },
      { tipo: "Repetición", en: "We need it.", es: "Nosotros necesitamos eso." },
      { tipo: "Lectura", en: "The students watch her.", es: "Los estudiantes la miran a ella." },
      { tipo: "Lectura", en: "They watch us. We watch them.", es: "Ellos nos miran. Nosotros los miramos." },
      { tipo: "Lectura", en: "He needs the book. He reads it.", es: "Él necesita el libro. Él lo lee." },
      { tipo: "Respuesta", prompt: "Who teaches you?", promptEs: "¿Quién te enseña a ti?", en: "The teacher teaches me.", es: "El maestro me enseña." },
      { tipo: "Respuesta", prompt: "What do you read?", promptEs: "¿Qué lees tú?", en: "I read it.", es: "Lo leo." },
      { tipo: "Producción", prompt: "Di una frase con \"me\" (a mí).", en: "She teaches me.", es: "Ella me enseña a mí." },
      { tipo: "Producción", prompt: "Di una frase con \"them\" (a ellos).", en: "I watch them.", es: "Yo los miro a ellos." }
    ],
    writing: [
      { es: "Ella me enseña a mí.", en: ["she teaches me"] },
      { es: "Yo lo miro a él.", en: ["i watch him"] },
      { es: "Él la mira a ella.", en: ["he watches her"] },
      { es: "Nosotros necesitamos eso.", en: ["we need it"] },
      { es: "Tú nos enseñas a nosotros.", en: ["you teach us"] },
      { es: "Ellos los miran a ellos.", en: ["they watch them"] },
      { es: "Él necesita el libro. Él lo lee.", en: ["he needs the book he reads it"] },
      { es: "Los estudiantes la miran a ella.", en: ["the students watch her"] },
      { es: "A mí me gusta eso.", en: ["i like it"] },
      { es: "Ellos nos miran a nosotros.", en: ["they watch us"] }
    ]
  },
  {
    id: "N1-B13",
    key: "b13",
    titulo: "Adjetivos posesivos: MY / YOUR / HIS / HER / ITS / OUR / THEIR",
    opciones: ["my", "your", "his", "her", "its", "our", "their"],
    palabras: [
      { en: "my", es: "mi / mis" },
      { en: "your", es: "tu / tus" },
      { en: "his", es: "su (de él)" },
      { en: "her", es: "su (de ella)" },
      { en: "its", es: "su (de eso / de una cosa)" },
      { en: "our", es: "nuestro / nuestra" },
      { en: "their", es: "su (de ellos / de ellas)" },
      { en: "whose", es: "de quién (para preguntar posesión)" }
    ],
    regla: "Cada pronombre tiene su posesivo. Punto crítico para hispanohablantes: en español usamos UNA palabra, \"su\". En inglés \"su\" se divide en CUATRO formas: his si el dueño es él; her si la dueña es ella; its si el dueño es una cosa; their si los dueños son ellos. Nunca traduzcas \"su\" literal: mira SIEMPRE quién es el dueño. El posesivo va ANTES del sustantivo. Y recuerda: el sujeto siempre se escribe.",
    guion: "Bloque 13. Adjetivos posesivos: las palabras para decir mi, tu, su, nuestro. Cada pronombre tiene su posesivo. Escucha la tabla de cambio. **\"My\"**, mi o mis. **\"Your\"**, tu o tus. **\"His\"**, su, de él. **\"Her\"**, su, de ella. **\"Its\"**, su, de eso. **\"Our\"**, nuestro o nuestra. **\"Their\"**, su, de ellos o de ellas. Atención, punto crítico para hispanohablantes. En español usamos una palabra: su. En inglés, su se divide en cuatro formas: his si el dueño es él; her si la dueña es ella; its si el dueño es una cosa; their si los dueños son ellos. Nunca traduzcas su literal. Mira siempre quién es el dueño. Ejemplos: el posesivo va antes del sustantivo. **\"My book is on the table\"**, mi libro está sobre la mesa. **\"Your car is small\"**, tu carro es pequeño. **\"His class is on Monday\"**, su clase de él es el lunes. **\"Her library is big\"**, su biblioteca de ella es grande. **\"Its park is big\"**, su parque de eso es grande. **\"Our apartment is in the city\"**, nuestro departamento está en la ciudad. **\"Their homework is in the library\"**, su tarea de ellos está en la biblioteca. Regla de oro: el sujeto siempre se escribe. My book is on the table ya tiene sujeto: my book. Ahora completa la tabla. Primero piensa, luego revisa.",
    tabla: [
      { en: "I", es: "yo", ans: "my" },
      { en: "you", es: "tú", ans: "your" },
      { en: "he", es: "él", ans: "his" },
      { en: "she", es: "ella", ans: "her" },
      { en: "it", es: "eso", ans: "its" },
      { en: "we", es: "nosotros", ans: "our" },
      { en: "they", es: "ellos", ans: "their" },
      { en: "He is a citizen. ___ car is small.", es: "su de él", ans: "his" },
      { en: "She is a teacher. ___ class is on Monday.", es: "su de ella", ans: "her" },
      { en: "I am a student. ___ book is on the table.", es: "mi", ans: "my" },
      { en: "We are friends. ___ apartment is in the city.", es: "nuestro", ans: "our" },
      { en: "They are students. ___ homework is in the library.", es: "su de ellos", ans: "their" },
      { en: "It is a city. ___ park is big.", es: "su de eso", ans: "its" }
    ],
    reading: {
      pasaje: [
        { en: "I am a student. My book is on the table. My pen is on the computer.", es: "Yo soy un estudiante. Mi libro está sobre la mesa. Mi bolígrafo está sobre la computadora." },
        { en: "He is a citizen. His car is small. His house is in the city.", es: "Él es un ciudadano. Su carro es pequeño. Su casa está en la ciudad." },
        { en: "She is a teacher. Her class is on Monday. Her library is big.", es: "Ella es una maestra. Su clase es el lunes. Su biblioteca es grande." },
        { en: "We are friends. Our apartment is in the city.", es: "Nosotros somos amigos. Nuestro departamento está en la ciudad." },
        { en: "They are students. Their homework is in the library.", es: "Ellos son estudiantes. Su tarea está en la biblioteca." }
      ],
      preguntas: [
        { q: "Whose book is on the table?", qes: "¿De quién es el libro sobre la mesa?", opts: [{ t: "my", es: "mi, del estudiante" }, { t: "his", es: "de él" }, { t: "her", es: "de ella" }], ans: 0 },
        { q: "Where is my pen?", qes: "¿Dónde está mi bolígrafo?", opts: [{ t: "on the computer", es: "sobre la computadora" }, { t: "on the table", es: "sobre la mesa" }, { t: "in the park", es: "en el parque" }], ans: 0 },
        { q: "Whose car is small?", qes: "¿De quién es el carro pequeño?", opts: [{ t: "her", es: "de ella" }, { t: "his", es: "de él" }, { t: "our", es: "nuestro" }], ans: 1 },
        { q: "Where is his house?", qes: "¿Dónde está su casa de él?", opts: [{ t: "in the city", es: "en la ciudad" }, { t: "in the park", es: "en el parque" }, { t: "on the bus", es: "en el autobús" }], ans: 0 },
        { q: "When is her class?", qes: "¿Cuándo es su clase de ella?", opts: [{ t: "on Monday", es: "el lunes" }, { t: "at night", es: "en la noche" }, { t: "in summer", es: "en verano" }], ans: 0 },
        { q: "Is her library big?", qes: "¿Es grande su biblioteca de ella?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 0 },
        { q: "Whose apartment is in the city?", qes: "¿De quién es el departamento en la ciudad?", opts: [{ t: "our", es: "nuestro" }, { t: "their", es: "de ellos" }, { t: "my", es: "mi" }], ans: 0 },
        { q: "Where is their homework?", qes: "¿Dónde está su tarea de ellos?", opts: [{ t: "in the library", es: "en la biblioteca" }, { t: "in the class", es: "en la clase" }, { t: "on the table", es: "sobre la mesa" }], ans: 0 },
        { q: "Are they students?", qes: "¿Son ellos estudiantes?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 0 },
        { q: "Is his car big?", qes: "¿Es grande su carro de él?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 }
      ]
    },
    listening: [
      { audio: "My book is on the table.", q: "Where is the book?", qes: "¿Dónde está el libro?", opts: [{ t: "on the table", es: "sobre la mesa" }, { t: "on the computer", es: "sobre la computadora" }], ans: 0 },
      { audio: "His car is small.", q: "Whose car is small?", qes: "¿De quién es el carro pequeño?", opts: [{ t: "his", es: "de él" }, { t: "her", es: "de ella" }], ans: 0 },
      { audio: "Her class is on Monday.", q: "When is her class?", qes: "¿Cuándo es su clase?", opts: [{ t: "on Monday", es: "el lunes" }, { t: "at night", es: "en la noche" }], ans: 0 },
      { audio: "Our apartment is in the city.", q: "Where is our apartment?", qes: "¿Dónde está nuestro depto.?", opts: [{ t: "in the city", es: "en la ciudad" }, { t: "in the park", es: "en el parque" }], ans: 0 },
      { audio: "Their homework is in the library.", q: "Where is their homework?", qes: "¿Dónde está su tarea?", opts: [{ t: "in the library", es: "en la biblioteca" }, { t: "in the class", es: "en la clase" }], ans: 0 },
      { audio: "Your pen is on the computer.", q: "Where is your pen?", qes: "¿Dónde está tu bolígrafo?", opts: [{ t: "on the computer", es: "sobre la computadora" }, { t: "on the table", es: "sobre la mesa" }], ans: 0 },
      { audio: "Its park is big.", q: "What is big?", qes: "¿Qué es grande?", opts: [{ t: "its park", es: "su parque de eso" }, { t: "its house", es: "su casa de eso" }], ans: 0 },
      { audio: "My house is in the city.", q: "Where is my house?", qes: "¿Dónde está mi casa?", opts: [{ t: "in the city", es: "en la ciudad" }, { t: "on the bus", es: "en el autobús" }], ans: 0 },
      { audio: "His house is big.", q: "Is his house big?", qes: "¿Es grande su casa?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 0 },
      { audio: "Our class is on Monday.", q: "When is our class?", qes: "¿Cuándo es nuestra clase?", opts: [{ t: "on Monday", es: "el lunes" }, { t: "in summer", es: "en verano" }], ans: 0 }
    ],
    speaking: [
      { tipo: "Repetición", en: "My book is on the table.", es: "Mi libro está sobre la mesa." },
      { tipo: "Repetición", en: "His car is small.", es: "Su carro de él es pequeño." },
      { tipo: "Repetición", en: "Her class is on Monday.", es: "Su clase de ella es el lunes." },
      { tipo: "Lectura", en: "Our apartment is in the city.", es: "Nuestro departamento está en la ciudad." },
      { tipo: "Lectura", en: "Their homework is in the library.", es: "Su tarea de ellos está en la biblioteca." },
      { tipo: "Lectura", en: "Your pen is on the computer.", es: "Tu bolígrafo está sobre la computadora." },
      { tipo: "Respuesta", prompt: "Where is your book?", promptEs: "¿Dónde está tu libro?", en: "My book is on the table.", es: "Mi libro está sobre la mesa." },
      { tipo: "Respuesta", prompt: "When is your class?", promptEs: "¿Cuándo es tu clase?", en: "My class is on Monday.", es: "Mi clase es el lunes." },
      { tipo: "Producción", prompt: "Di una frase con \"my\" (mi).", en: "My pen is on the computer.", es: "Mi bolígrafo está sobre la computadora." },
      { tipo: "Producción", prompt: "Di una frase con \"our\" (nuestro).", en: "Our library is big.", es: "Nuestra biblioteca es grande." }
    ],
    writing: [
      { es: "Mi libro está sobre la mesa.", en: ["my book is on the table"] },
      { es: "Tu carro es pequeño.", en: ["your car is small"] },
      { es: "Su clase de él es el lunes.", en: ["his class is on monday"] },
      { es: "Su biblioteca de ella es grande.", en: ["her library is big"] },
      { es: "Nuestro departamento está en la ciudad.", en: ["our apartment is in the city"] },
      { es: "Su tarea de ellos está en la biblioteca.", en: ["their homework is in the library"] },
      { es: "Mi bolígrafo está sobre la computadora.", en: ["my pen is on the computer"] },
      { es: "Su casa de él está en la ciudad.", en: ["his house is in the city"] },
      { es: "Nuestra clase es en la mañana.", en: ["our class is in the morning"] },
      { es: "Sus amigos de ellos están en el parque.", en: ["their friends are in the park"] }
    ]
  },
  {
    id: "N1-B15",
    key: "b15",
    titulo: "There is / There are (hay)",
    opciones: ["there is", "there are", "Yes, there is.", "Yes, there are.", "No, there isn't.", "No, there aren't."],
    palabras: [
      { en: "there is", es: "hay (singular / uno)" },
      { en: "there are", es: "hay (plural / varios)" },
      { en: "there is not (isn't)", es: "no hay (singular)" },
      { en: "there are not (aren't)", es: "no hay (plural)" },
      { en: "Is there...?", es: "¿hay...? (singular)" },
      { en: "Are there...?", es: "¿hay...? (plural)" }
    ],
    regla: "En español, \"hay\" es una sola palabra para todo. En inglés se divide en DOS: THERE IS para singular (uno) y THERE ARE para plural (varios). Misma lógica de bloques de siempre. El negativo: not va después de is o are. La pregunta: is o are van PRIMERO, y las respuestas cortas repiten there. Regla de oro: aquí el sujeto es \"there\" y SIEMPRE se escribe. Nunca digas solo \"is a book\". Di \"There is a book\".",
    guion: "Bloque 15. Hoy aprendemos a decir hay en inglés: there is y there are. En español, hay es una sola palabra para todo. En inglés se divide en dos: there is para singular; there are para plural. Misma lógica de bloques de siempre. **\"There is a book\"**, hay un libro. **\"There are books\"**, hay libros. Ejemplos: **\"There is a pen on the computer\"**, hay un bolígrafo sobre la computadora. **\"There are students in the library\"**, hay estudiantes en la biblioteca. **\"There is a bus in the city\"**, hay un autobús en la ciudad. **\"There are cars in the city\"**, hay carros en la ciudad. Negativo: not va después de is o are. **\"There is not a book\"**, no hay un libro. **\"There are not books\"**, no hay libros. Preguntas: is o are van primero. Y las respuestas cortas repiten there. **\"Is there a book?\"**, ¿hay un libro? **\"Yes, there is\"**, sí, hay. **\"No, there isn't\"**, no, no hay. **\"Are there students?\"**, ¿hay estudiantes? **\"Yes, there are\"**, sí, hay. **\"No, there aren't\"**, no, no hay. Regla de oro: aquí el sujeto es there. Siempre se escribe. Nunca digas solo is a book. Di: **\"There is a book\"**, hay un libro. Ahora completa la tabla. Primero piensa, luego revisa.",
    tabla: [
      { en: "______ a book on the table.", es: "un libro", ans: "there is" },
      { en: "______ students in the library.", es: "estudiantes", ans: "there are" },
      { en: "______ a bus in the city.", es: "un autobús", ans: "there is" },
      { en: "______ cars in the city.", es: "carros", ans: "there are" },
      { en: "______ an email on the computer.", es: "un correo", ans: "there is" },
      { en: "______ books on the table.", es: "libros", ans: "there are" },
      { en: "______ a party in the house.", es: "una fiesta", ans: "there is" },
      { en: "______ friends in the park.", es: "amigos", ans: "there are" },
      { en: "Is there a book?", es: "sí", ans: "Yes, there is." },
      { en: "Are there students?", es: "no", ans: "No, there aren't." },
      { en: "Is there a bus?", es: "no", ans: "No, there isn't." },
      { en: "Are there cars?", es: "sí", ans: "Yes, there are." }
    ],
    reading: {
      pasaje: [
        { en: "I am in the library. There is a book on the table. There are students in the class.", es: "Yo estoy en la biblioteca. Hay un libro sobre la mesa. Hay estudiantes en la clase." },
        { en: "He is in the city. There is a bus. There are cars in the city. There are friends in the park.", es: "Él está en la ciudad. Hay un autobús. Hay carros en la ciudad. Hay amigos en el parque." },
        { en: "She is in the apartment. There is a television. There are books on the table. There is not a pen on the computer.", es: "Ella está en el departamento. Hay una televisión. Hay libros sobre la mesa. No hay un bolígrafo sobre la computadora." }
      ],
      preguntas: [
        { q: "Where is the person?", qes: "¿Dónde está la persona?", opts: [{ t: "in the library", es: "en la biblioteca" }, { t: "in the park", es: "en el parque" }, { t: "in the city", es: "en la ciudad" }], ans: 0 },
        { q: "What is on the table?", qes: "¿Qué hay sobre la mesa?", opts: [{ t: "a book", es: "un libro" }, { t: "a pen", es: "un bolígrafo" }, { t: "a computer", es: "una computadora" }], ans: 0 },
        { q: "Are there students in the class?", qes: "¿Hay estudiantes en la clase?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 0 },
        { q: "Is there a bus in the city?", qes: "¿Hay un autobús en la ciudad?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 0 },
        { q: "What is in the city?", qes: "¿Qué hay en la ciudad?", opts: [{ t: "cars", es: "carros" }, { t: "books", es: "libros" }, { t: "tables", es: "mesas" }], ans: 0 },
        { q: "Where are the friends?", qes: "¿Dónde hay amigos?", opts: [{ t: "in the park", es: "en el parque" }, { t: "in the class", es: "en la clase" }, { t: "in the office", es: "en la oficina" }], ans: 0 },
        { q: "Where is she?", qes: "¿Dónde está ella?", opts: [{ t: "in the apartment", es: "en el departamento" }, { t: "in the library", es: "en la biblioteca" }, { t: "in the store", es: "en la tienda" }], ans: 0 },
        { q: "Is there a television?", qes: "¿Hay una televisión?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 0 },
        { q: "Is there a pen on the computer?", qes: "¿Hay un bolígrafo sobre la computadora?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
        { q: "Are there books on the table?", qes: "¿Hay libros sobre la mesa?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 0 }
      ]
    },
    listening: [
      { audio: "There is a book on the table.", q: "What is on the table?", qes: "¿Qué hay sobre la mesa?", opts: [{ t: "a book", es: "un libro" }, { t: "a pen", es: "un bolígrafo" }], ans: 0 },
      { audio: "There are students in the library.", q: "Where are the students?", qes: "¿Dónde hay estudiantes?", opts: [{ t: "in the library", es: "en la biblioteca" }, { t: "in the park", es: "en el parque" }], ans: 0 },
      { audio: "There is a bus in the city.", q: "What is in the city?", qes: "¿Qué hay en la ciudad?", opts: [{ t: "a bus", es: "un autobús" }, { t: "a car", es: "un carro" }], ans: 0 },
      { audio: "There are cars in the city.", q: "What is in the city?", qes: "¿Qué hay en la ciudad?", opts: [{ t: "cars", es: "carros" }, { t: "buses", es: "autobuses" }], ans: 0 },
      { audio: "There is not a pen on the computer.", q: "Is there a pen on the computer?", qes: "¿Hay un bolígrafo sobre la computadora?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
      { audio: "Are there books on the table? Yes, there are.", q: "Are there books on the table?", qes: "¿Hay libros sobre la mesa?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 0 },
      { audio: "There is a television in the apartment.", q: "Where is the television?", qes: "¿Dónde hay una televisión?", opts: [{ t: "in the apartment", es: "en el depto." }, { t: "in the office", es: "en la oficina" }], ans: 0 },
      { audio: "There are friends in the park.", q: "Where are the friends?", qes: "¿Dónde hay amigos?", opts: [{ t: "in the park", es: "en el parque" }, { t: "in the class", es: "en la clase" }], ans: 0 },
      { audio: "Is there a party in the house? No, there isn't.", q: "Is there a party in the house?", qes: "¿Hay una fiesta en la casa?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
      { audio: "There is an exam on Monday.", q: "When is the exam?", qes: "¿Cuándo hay un examen?", opts: [{ t: "on Monday", es: "el lunes" }, { t: "at night", es: "en la noche" }], ans: 0 }
    ],
    speaking: [
      { tipo: "Repetición", en: "There is a book on the table.", es: "Hay un libro sobre la mesa." },
      { tipo: "Repetición", en: "There are students in the library.", es: "Hay estudiantes en la biblioteca." },
      { tipo: "Repetición", en: "There is not a pen on the computer.", es: "No hay un bolígrafo sobre la computadora." },
      { tipo: "Lectura", en: "There are cars in the city.", es: "Hay carros en la ciudad." },
      { tipo: "Lectura", en: "Is there a bus? Yes, there is.", es: "¿Hay un autobús? Sí, hay." },
      { tipo: "Lectura", en: "Are there books? No, there aren't.", es: "¿Hay libros? No, no hay." },
      { tipo: "Respuesta", prompt: "Is there a book on the table?", promptEs: "¿Hay un libro sobre la mesa?", en: "Yes, there is.", es: "Sí, hay." },
      { tipo: "Respuesta", prompt: "Are there students in the class?", promptEs: "¿Hay estudiantes en la clase?", en: "Yes, there are.", es: "Sí, hay." },
      { tipo: "Producción", prompt: "Di una cosa que hay en la biblioteca (there is).", en: "There is a book in the library.", es: "Hay un libro en la biblioteca." },
      { tipo: "Producción", prompt: "Di una cosa que hay en la ciudad (there are).", en: "There are cars in the city.", es: "Hay carros en la ciudad." }
    ],
    writing: [
      { es: "Hay un libro sobre la mesa.", en: ["there is a book on the table"] },
      { es: "Hay estudiantes en la biblioteca.", en: ["there are students in the library"] },
      { es: "Hay un autobús en la ciudad.", en: ["there is a bus in the city"] },
      { es: "Hay carros en la ciudad.", en: ["there are cars in the city"] },
      { es: "No hay un bolígrafo sobre la computadora.", en: ["there is not a pen on the computer"] },
      { es: "No hay libros en la clase.", en: ["there are not books in the class"] },
      { es: "¿Hay un examen el lunes?", en: ["is there an exam on monday"] },
      { es: "Sí, hay.", en: ["yes there is"] },
      { es: "¿Hay estudiantes en el parque?", en: ["are there students in the park"] },
      { es: "No, no hay.", en: ["no there aren't"] }
    ]
  },
  {
    id: "N1-B16",
    key: "b16",
    titulo: "Adverbios de frecuencia: ALWAYS / USUALLY / SOMETIMES / NEVER",
    opciones: ["always", "usually", "sometimes", "never", "I always study.", "He usually works.", "She is always in the library.", "They never eat in the park."],
    palabras: [
      { en: "always", es: "siempre (100%)" },
      { en: "usually", es: "usualmente (~80%)" },
      { en: "sometimes", es: "a veces (50%)" },
      { en: "never", es: "nunca (0%)" }
    ],
    regla: "Los adverbios de frecuencia dicen QUÉ TAN SEGUIDO haces algo. Regla 1: el adverbio va ANTES del verbo principal (I always study). Regla 2: con el verbo to be, el adverbio va DESPUÉS (She is always in the library). Regla de oro: el pronombre siempre se escribe. El adverbio NUNCA elimina el pronombre.",
    guion: "Bloque 16. Los adverbios de frecuencia: palabras que dicen qué tan seguido haces algo. Cuatro palabras nuevas. **\"Always\"**, siempre, cien por ciento. **\"Usually\"**, usualmente. **\"Sometimes\"**, a veces. **\"Never\"**, nunca, cero por ciento. Regla uno: el adverbio va ANTES del verbo principal. **\"I always study in the morning\"**, yo siempre estudio en la mañana. **\"He always works on Mondays\"**, él siempre trabaja los lunes. **\"She usually reads at night\"**, ella usualmente lee en la noche. **\"We sometimes play in the park\"**, nosotros a veces jugamos en el parque. **\"They never eat in the library\"**, ellos nunca comen en la biblioteca. Regla dos: con el verbo to be, el adverbio va DESPUÉS. **\"She is always in the library\"**, ella siempre está en la biblioteca. **\"He is never in the park\"**, él nunca está en el parque. Regla de oro: el pronombre siempre se escribe. El adverbio nunca elimina el pronombre. Ahora completa la tabla. Primero piensa, luego revisa.",
    tabla: [
      { en: "siempre", es: "100%", ans: "always" },
      { en: "nunca", es: "0%", ans: "never" },
      { en: "a veces", es: "50%", ans: "sometimes" },
      { en: "usualmente", es: "~80%", ans: "usually" },
      { en: "I study.", es: "always", ans: "I always study." },
      { en: "He works.", es: "usually", ans: "He usually works." },
      { en: "She is in the library.", es: "always", ans: "She is always in the library." },
      { en: "They eat in the park.", es: "never", ans: "They never eat in the park." }
    ],
    reading: {
      pasaje: [
        { en: "I am a student. I always study in the morning. I never study at night. I usually read books in the library.", es: "Yo soy un estudiante. Yo siempre estudio en la mañana. Yo nunca estudio en la noche. Yo usualmente leo libros en la biblioteca." },
        { en: "He is a citizen. He always works on Mondays. He sometimes walks in the park. He never watches television at night.", es: "Él es un ciudadano. Él siempre trabaja los lunes. Él a veces camina en el parque. Él nunca mira televisión en la noche." },
        { en: "She is a teacher. She is always in the office. She usually writes emails. She never eats in the class.", es: "Ella es una maestra. Ella siempre está en la oficina. Ella usualmente escribe correos. Ella nunca come en la clase." },
        { en: "We are friends. We sometimes play in the park. We never run in the library.", es: "Nosotros somos amigos. Nosotros a veces jugamos en el parque. Nosotros nunca corremos en la biblioteca." }
      ],
      preguntas: [
        { q: "Does the student study at night?", qes: "¿Estudia el estudiante en la noche?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
        { q: "When does the student always study?", qes: "¿Cuándo siempre estudia?", opts: [{ t: "in the morning", es: "en la mañana" }, { t: "at night", es: "en la noche" }, { t: "on Monday", es: "el lunes" }], ans: 0 },
        { q: "Where does the student usually read books?", qes: "¿Dónde usualmente lee?", opts: [{ t: "in the library", es: "en la biblioteca" }, { t: "in the park", es: "en el parque" }, { t: "in the city", es: "en la ciudad" }], ans: 0 },
        { q: "Does he always work on Mondays?", qes: "¿Siempre trabaja él los lunes?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 0 },
        { q: "What does he sometimes do?", qes: "¿Qué hace él a veces?", opts: [{ t: "walks in the park", es: "camina en el parque" }, { t: "watches television", es: "mira TV" }, { t: "runs in the library", es: "corre en la biblioteca" }], ans: 0 },
        { q: "Does he watch television at night?", qes: "¿Mira él TV en la noche?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
        { q: "Where is she always?", qes: "¿Dónde siempre está ella?", opts: [{ t: "in the office", es: "en la oficina" }, { t: "in the park", es: "en el parque" }, { t: "in the store", es: "en la tienda" }], ans: 0 },
        { q: "What does she usually write?", qes: "¿Qué usualmente escribe?", opts: [{ t: "emails", es: "correos" }, { t: "books", es: "libros" }, { t: "exams", es: "exámenes" }], ans: 0 },
        { q: "Do we sometimes play in the park?", qes: "¿A veces jugamos en el parque?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 0 },
        { q: "Do we run in the library?", qes: "¿Corremos en la biblioteca?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 }
      ]
    },
    listening: [
      { audio: "I always study in the morning.", q: "When does the person study?", qes: "¿Cuándo estudia?", opts: [{ t: "in the morning", es: "en la mañana" }, { t: "at night", es: "en la noche" }], ans: 0 },
      { audio: "He never watches television.", q: "Does he watch television?", qes: "¿Mira él TV?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
      { audio: "She usually reads at night.", q: "When does she usually read?", qes: "¿Cuándo usualmente lee?", opts: [{ t: "at night", es: "en la noche" }, { t: "in the morning", es: "en la mañana" }], ans: 0 },
      { audio: "We sometimes play in the park.", q: "Where do we sometimes play?", qes: "¿Dónde a veces jugamos?", opts: [{ t: "in the park", es: "en el parque" }, { t: "in the library", es: "en la biblioteca" }], ans: 0 },
      { audio: "They never eat in the library.", q: "Where do they never eat?", qes: "¿Dónde nunca comen?", opts: [{ t: "in the library", es: "en la biblioteca" }, { t: "in the park", es: "en el parque" }], ans: 0 },
      { audio: "He always works on Mondays.", q: "When does he always work?", qes: "¿Cuándo siempre trabaja?", opts: [{ t: "on Mondays", es: "los lunes" }, { t: "at night", es: "en la noche" }], ans: 0 },
      { audio: "She is always in the office.", q: "Where is she always?", qes: "¿Dónde siempre está?", opts: [{ t: "in the office", es: "en la oficina" }, { t: "in the park", es: "en el parque" }], ans: 0 },
      { audio: "I usually write emails.", q: "What does the person usually write?", qes: "¿Qué usualmente escribe?", opts: [{ t: "emails", es: "correos" }, { t: "books", es: "libros" }], ans: 0 },
      { audio: "We never run in the library.", q: "Where do we never run?", qes: "¿Dónde nunca corremos?", opts: [{ t: "in the library", es: "en la biblioteca" }, { t: "in the city", es: "en la ciudad" }], ans: 0 },
      { audio: "He sometimes walks in the park.", q: "What does he sometimes do?", qes: "¿Qué hace a veces?", opts: [{ t: "walks in the park", es: "camina en el parque" }, { t: "runs in the city", es: "corre en la ciudad" }], ans: 0 }
    ],
    speaking: [
      { tipo: "Repetición", en: "I always study in the morning.", es: "Yo siempre estudio en la mañana." },
      { tipo: "Repetición", en: "He never watches television.", es: "Él nunca mira televisión." },
      { tipo: "Repetición", en: "We sometimes play in the park.", es: "Nosotros a veces jugamos en el parque." },
      { tipo: "Lectura", en: "She usually reads at night.", es: "Ella usualmente lee en la noche." },
      { tipo: "Lectura", en: "They never eat in the library.", es: "Ellos nunca comen en la biblioteca." },
      { tipo: "Lectura", en: "She is always in the office.", es: "Ella siempre está en la oficina." },
      { tipo: "Respuesta", prompt: "Do you study in the morning?", promptEs: "¿Estudias en la mañana?", en: "Yes, I always study in the morning.", es: "Sí, yo siempre estudio en la mañana." },
      { tipo: "Respuesta", prompt: "Does he watch television at night?", promptEs: "¿Mira él TV en la noche?", en: "No, he never watches television.", es: "No, él nunca mira televisión." },
      { tipo: "Producción", prompt: "Di una cosa que SIEMPRE haces.", en: "I always study in the morning.", es: "Yo siempre estudio en la mañana." },
      { tipo: "Producción", prompt: "Di una cosa que NUNCA haces.", en: "I never eat in the library.", es: "Yo nunca como en la biblioteca." }
    ],
    writing: [
      { es: "Yo siempre estudio en la mañana.", en: ["i always study in the morning"] },
      { es: "Él siempre trabaja los lunes.", en: ["he always works on mondays"] },
      { es: "Ella usualmente lee en la noche.", en: ["she usually reads at night"] },
      { es: "Nosotros a veces jugamos en el parque.", en: ["we sometimes play in the park"] },
      { es: "Ellos nunca comen en la biblioteca.", en: ["they never eat in the library"] },
      { es: "Ella siempre está en la oficina.", en: ["she is always in the office"] },
      { es: "Él nunca mira televisión en la noche.", en: ["he never watches television at night"] },
      { es: "Yo usualmente escribo correos.", en: ["i usually write emails"] },
      { es: "¿Estudias tú a veces en la biblioteca?", en: ["do you sometimes study in the library"] },
      { es: "Nosotros nunca corremos en la ciudad.", en: ["we never run in the city"] }
    ]
  },
  {
    id: "N1-B17",
    key: "b17",
    titulo: "CAN / CAN'T: PODER / SABER",
    opciones: ["can", "can't", "He can swim.", "She can speak English.", "Can you swim?", "They can play."],
    palabras: [
      { en: "can", es: "poder / saber (habilidad)" },
      { en: "can't (cannot)", es: "no poder / no saber" }
    ],
    regla: "Can expresa poder o saber hacer algo. Regla 1: can NUNCA cambia: no existe 'cans' (He can swim, She can swim). Regla 2: después de can, el verbo va en forma base SIN la S (She can speak English, no 'she can speaks'). Regla 3: para negar se usa can't directo; para preguntar, can va primero (Can you speak English?). Regla de oro: el pronombre siempre se escribe: nunca digas solo 'can swim', di 'He can swim'.",
    guion: "Bloque 17. Hoy aprendemos can y can't: las palabras para decir que puedes o sabes hacer algo. **\"Can\"**, poder o saber. **\"Can't\"**, no poder o no saber. Regla uno: can NUNCA cambia. No existe cans en la tercera persona. He can, she can, it can. **\"I can swim\"**, yo puedo nadar. **\"He can swim\"**, él puede nadar. **\"She can swim\"**, ella puede nadar. Regla dos: después de can, el verbo va en forma base, normal, sin la S de la tercera persona. **\"She can speak English\"**, ella puede hablar inglés, o sabe hablar inglés. **\"He can read books\"**, él puede leer libros. No se dice he can reads. Regla tres: para negar, can't directo. Para preguntar, can va primero. **\"He can't swim\"**, él no puede nadar. **\"Can you speak English?\"**, ¿puedes hablar inglés? **\"Yes, I can\"**, sí, puedo. **\"No, I can't\"**, no, no puedo. Ejemplos con tu vocabulario. **\"I can study in the library\"**, yo puedo estudiar en la biblioteca. **\"We can play on Monday\"**, nosotros podemos jugar el lunes. **\"They can't watch television at night\"**, ellos no pueden mirar televisión en la noche. **\"Can she write emails?\"**, ¿puede escribir correos ella? **\"Yes, she can\"**, sí, puede. Regla de oro: el pronombre siempre se escribe. Nunca digas solo can swim. Di He can swim. Ahora completa la tabla. Primero piensa, luego revisa.",
    tabla: [
      { en: "He ___ swim.", es: "puede", ans: "can" },
      { en: "She ___ dance.", es: "no puede", ans: "can't" },
      { en: "They ___ play on Monday.", es: "pueden", ans: "can" },
      { en: "I ___ speak English.", es: "no puedo", ans: "can't" },
      { en: "He cans swim.", es: "error: cans", ans: "He can swim." },
      { en: "She can speaks English.", es: "error: speaks", ans: "She can speak English." },
      { en: "Can you swims?", es: "error: swims", ans: "Can you swim?" },
      { en: "They can playing.", es: "error: playing", ans: "They can play." }
    ],
    reading: {
      pasaje: [
        { en: "I am a student. I can speak English. I can read books in the library. I can't swim.", es: "Yo soy un estudiante. Yo puedo hablar inglés. Yo puedo leer libros en la biblioteca. Yo no puedo nadar." },
        { en: "He is a citizen. He can walk in the park. He can't dance.", es: "Él es un ciudadano. Él puede caminar en el parque. Él no puede bailar." },
        { en: "She is a teacher. She can teach the class. She can write emails. She can't play on Monday.", es: "Ella es una maestra. Ella puede enseñar la clase. Ella puede escribir correos. Ella no puede jugar el lunes." },
        { en: "We are friends. We can study in the library. We can play in the park. We can't eat in the class.", es: "Nosotros somos amigos. Nosotros podemos estudiar en la biblioteca. Nosotros podemos jugar en el parque. Nosotros no podemos comer en la clase." }
      ],
      preguntas: [
        { q: "What can the student speak?", qes: "¿Qué puede hablar el estudiante?", opts: [{ t: "English", es: "inglés" }, { t: "Spanish", es: "español" }, { t: "French", es: "francés" }], ans: 0 },
        { q: "Where can the student read books?", qes: "¿Dónde puede leer libros?", opts: [{ t: "in the library", es: "en la biblioteca" }, { t: "in the park", es: "en el parque" }, { t: "in the store", es: "en la tienda" }], ans: 0 },
        { q: "Can the student swim?", qes: "¿Puede nadar el estudiante?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
        { q: "What can he do?", qes: "¿Qué puede hacer él?", opts: [{ t: "walk in the park", es: "caminar en el parque" }, { t: "dance", es: "bailar" }, { t: "swim", es: "nadar" }], ans: 0 },
        { q: "Can he dance?", qes: "¿Puede bailar él?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
        { q: "What can she teach?", qes: "¿Qué puede enseñar ella?", opts: [{ t: "the class", es: "la clase" }, { t: "the park", es: "el parque" }, { t: "the bus", es: "el autobús" }], ans: 0 },
        { q: "What can she write?", qes: "¿Qué puede escribir ella?", opts: [{ t: "emails", es: "correos" }, { t: "exams", es: "exámenes" }, { t: "books", es: "libros" }], ans: 0 },
        { q: "Can she play on Monday?", qes: "¿Puede jugar ella el lunes?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
        { q: "Where can we study?", qes: "¿Dónde podemos estudiar?", opts: [{ t: "in the library", es: "en la biblioteca" }, { t: "in the class", es: "en la clase" }, { t: "on the bus", es: "en el autobús" }], ans: 0 },
        { q: "Can we eat in the class?", qes: "¿Podemos comer en la clase?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 }
      ]
    },
    listening: [
      { audio: "I can speak English.", q: "What can the person speak?", qes: "¿Qué puede hablar?", opts: [{ t: "English", es: "inglés" }, { t: "Spanish", es: "español" }], ans: 0 },
      { audio: "He can swim.", q: "What can he do?", qes: "¿Qué puede hacer él?", opts: [{ t: "swim", es: "nadar" }, { t: "run", es: "correr" }], ans: 0 },
      { audio: "She can't dance.", q: "Can she dance?", qes: "¿Puede bailar ella?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
      { audio: "We can play on Monday.", q: "When can we play?", qes: "¿Cuándo podemos jugar?", opts: [{ t: "on Monday", es: "el lunes" }, { t: "at night", es: "en la noche" }], ans: 0 },
      { audio: "They can study in the library.", q: "Where can they study?", qes: "¿Dónde pueden estudiar?", opts: [{ t: "in the library", es: "en la biblioteca" }, { t: "in the park", es: "en el parque" }], ans: 0 },
      { audio: "Can you write emails? Yes, I can.", q: "Can the person write emails?", qes: "¿Puede escribir correos?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 0 },
      { audio: "He can't watch television at night.", q: "When can't he watch television?", qes: "¿Cuándo no puede mirar TV?", opts: [{ t: "at night", es: "en la noche" }, { t: "in the morning", es: "en la mañana" }], ans: 0 },
      { audio: "She can teach the class.", q: "What can she teach?", qes: "¿Qué puede enseñar?", opts: [{ t: "the class", es: "la clase" }, { t: "the park", es: "el parque" }], ans: 0 },
      { audio: "Can they swim? No, they can't.", q: "Can they swim?", qes: "¿Pueden nadar?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
      { audio: "I can read books.", q: "What can the person read?", qes: "¿Qué puede leer?", opts: [{ t: "books", es: "libros" }, { t: "emails", es: "correos" }], ans: 0 }
    ],
    speaking: [
      { tipo: "Repetición", en: "I can speak English.", es: "Yo puedo hablar inglés." },
      { tipo: "Repetición", en: "He can swim.", es: "Él puede nadar." },
      { tipo: "Repetición", en: "She can't dance.", es: "Ella no puede bailar." },
      { tipo: "Lectura", en: "We can play on Monday.", es: "Nosotros podemos jugar el lunes." },
      { tipo: "Lectura", en: "Can you write emails? Yes, I can.", es: "¿Puedes escribir correos? Sí, puedo." },
      { tipo: "Lectura", en: "They can't eat in the class.", es: "Ellos no pueden comer en la clase." },
      { tipo: "Respuesta", prompt: "Can you swim?", promptEs: "¿Puedes nadar?", en: "Yes, I can.", es: "Sí, puedo." },
      { tipo: "Respuesta", prompt: "Can he speak English?", promptEs: "¿Puede él hablar inglés?", en: "Yes, he can.", es: "Sí, él puede." },
      { tipo: "Producción", prompt: "Di una cosa que PUEDES hacer.", en: "I can read books.", es: "Yo puedo leer libros." },
      { tipo: "Producción", prompt: "Di una cosa que NO PUEDES hacer.", en: "I can't swim.", es: "Yo no puedo nadar." }
    ],
    writing: [
      { es: "Yo puedo hablar inglés.", en: ["i can speak english"] },
      { es: "Él puede nadar.", en: ["he can swim"] },
      { es: "Ella no puede bailar.", en: ["she can't dance", "she cannot dance"] },
      { es: "Nosotros podemos jugar el lunes.", en: ["we can play on monday"] },
      { es: "Ellos pueden estudiar en la biblioteca.", en: ["they can study in the library"] },
      { es: "¿Puedes escribir correos?", en: ["can you write emails"] },
      { es: "Sí, puedo.", en: ["yes i can"] },
      { es: "No, no puedo.", en: ["no i can't", "no i cannot"] },
      { es: "Ella puede enseñar la clase.", en: ["she can teach the class"] },
      { es: "Nosotros no podemos comer en la clase.", en: ["we can't eat in the class", "we cannot eat in the class"] }
    ]
  },
  {
    id: "N1-B18",
    key: "b18",
    titulo: "IMPERATIVOS: ÓRDENES Y PROHIBICIONES",
    opciones: ["Don't", "Open", "Write", "Walk", "Don't eat in the class.", "Don't run in the library.", "Don't watch television at night.", "Don't sleep in the class."],
    palabras: [
      { en: "please", es: "por favor" },
      { en: "Don't...", es: "No... (prohibiciones, del bloque DO NOT)" }
    ],
    regla: "Los imperativos son órdenes y prohibiciones. Regla 1: la orden afirmativa usa el verbo en forma base SIN pronombre. ATENCIÓN: es el ÚNICO caso en inglés donde el sujeto no se escribe, la única excepción a la regla de oro del pronombre. Regla 2: para prohibir, Don't va primero (Don't eat in the class). Regla 3: con please la orden se vuelve amable (Please, open the book). Recuerda: en TODAS las demás frases el pronombre siempre se escribe, solo los comandos son la excepción.",
    guion: "Bloque 18. Hoy aprendemos los imperativos: órdenes y prohibiciones. En español: abre, cierra, lee, no comas. Regla uno: la orden afirmativa usa el verbo en forma base, sin pronombre. Atención: este es el ÚNICO caso en inglés donde el sujeto no se escribe. Es la única excepción a la regla de oro del pronombre. **\"Open the book\"**, abre el libro. **\"Close the book\"**, cierra el libro. **\"Read the book\"**, lee el libro. **\"Write the email\"**, escribe el correo. **\"Study in the library\"**, estudia en la biblioteca. Regla dos: para prohibir, don't va primero. Don't viene de do not, que ya conoces del bloque de las preguntas. **\"Don't eat in the class\"**, no comas en la clase. **\"Don't run in the library\"**, no corras en la biblioteca. **\"Don't watch television at night\"**, no mires televisión en la noche. Nota importante: en comandos, el sujeto you no se escribe. Pero recuerda: en TODAS las demás frases del inglés, el pronombre siempre se escribe. Solo los comandos son la excepción. Y con please, la orden se vuelve amable. **\"Please, open the book\"**, por favor, abre el libro. **\"Please, listen\"**, por favor, escucha. Ahora completa la tabla. Primero piensa, luego revisa.",
    tabla: [
      { en: "______ eat in the class.", es: "prohibición", ans: "Don't" },
      { en: "______ the book.", es: "abre", ans: "Open" },
      { en: "______ run in the library.", es: "prohibición", ans: "Don't" },
      { en: "______ the email.", es: "escribe", ans: "Write" },
      { en: "______ sleep in the class.", es: "prohibición", ans: "Don't" },
      { en: "______ in the park.", es: "camina", ans: "Walk" },
      { en: "Eat in the class.", es: "convierte en prohibición", ans: "Don't eat in the class." },
      { en: "Run in the library.", es: "convierte en prohibición", ans: "Don't run in the library." },
      { en: "Watch television at night.", es: "convierte en prohibición", ans: "Don't watch television at night." },
      { en: "Sleep in the class.", es: "convierte en prohibición", ans: "Don't sleep in the class." }
    ],
    reading: {
      pasaje: [
        { en: "In the class, the teacher writes: 'Open the book. Read the book. Write the email. Don't sleep in the class. Don't eat in the class.'", es: "En la clase, la maestra escribe: 'Abre el libro. Lee el libro. Escribe el correo. No duermas en la clase. No comas en la clase.'" },
        { en: "In the park, the citizen reads: 'Walk in the park. Don't run in the library. Study in the library. Don't watch television at night.'", es: "En el parque, el ciudadano lee: 'Camina en el parque. No corras en la biblioteca. Estudia en la biblioteca. No mires televisión en la noche.'" },
        { en: "The student writes: 'Please, listen. Open the book. Don't close the book.'", es: "El estudiante escribe: 'Por favor, escucha. Abre el libro. No cierres el libro.'" }
      ],
      preguntas: [
        { q: "Who writes in the class?", qes: "¿Quién escribe en la clase?", opts: [{ t: "the teacher", es: "la maestra" }, { t: "the citizen", es: "el ciudadano" }, { t: "the student", es: "el estudiante" }], ans: 0 },
        { q: "What does the teacher write?", qes: "¿Qué escribe la maestra?", opts: [{ t: "Open the book", es: "abre el libro" }, { t: "Close the book", es: "cierra el libro" }, { t: "Open the email", es: "abre el correo" }], ans: 0 },
        { q: "Does the teacher write \"Don't sleep in the class\"?", qes: "¿Escribe 'no duermas en la clase'?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 0 },
        { q: "Does the teacher write \"Eat in the class\"?", qes: "¿Escribe 'come en la clase'?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
        { q: "Who reads in the park?", qes: "¿Quién lee en el parque?", opts: [{ t: "the citizen", es: "el ciudadano" }, { t: "the teacher", es: "la maestra" }, { t: "the friends", es: "los amigos" }], ans: 0 },
        { q: "What does the citizen read?", qes: "¿Qué lee el ciudadano?", opts: [{ t: "Walk in the park", es: "camina en el parque" }, { t: "Run in the park", es: "corre en el parque" }, { t: "Sleep in the park", es: "duerme en el parque" }], ans: 0 },
        { q: "Where is \"Don't run\"?", qes: "¿Dónde es el 'no corras'?", opts: [{ t: "in the library", es: "en la biblioteca" }, { t: "in the park", es: "en el parque" }, { t: "in the city", es: "en la ciudad" }], ans: 0 },
        { q: "Who writes \"Please, listen\"?", qes: "¿Quién escribe 'por favor, escucha'?", opts: [{ t: "the student", es: "el estudiante" }, { t: "the teacher", es: "la maestra" }, { t: "the citizen", es: "el ciudadano" }], ans: 0 },
        { q: "Does the student write \"Don't close the book\"?", qes: "¿Escribe 'no cierres el libro'?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 0 },
        { q: "Does the student write \"Close the book\"?", qes: "¿Escribe 'cierra el libro'?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 }
      ]
    },
    listening: [
      { audio: "Open the book.", q: "What do you hear?", qes: "¿Qué escuchas?", opts: [{ t: "Open the book", es: "abre el libro" }, { t: "Close the book", es: "cierra el libro" }], ans: 0 },
      { audio: "Don't eat in the class.", q: "Where is \"don't eat\"?", qes: "¿Dónde es el 'no comas'?", opts: [{ t: "in the class", es: "en la clase" }, { t: "in the park", es: "en el parque" }], ans: 0 },
      { audio: "Write the email.", q: "What do you hear?", qes: "¿Qué escuchas?", opts: [{ t: "Write the email", es: "escribe el correo" }, { t: "Read the email", es: "lee el correo" }], ans: 0 },
      { audio: "Don't run in the library.", q: "Where is \"don't run\"?", qes: "¿Dónde es el 'no corras'?", opts: [{ t: "in the library", es: "en la biblioteca" }, { t: "in the city", es: "en la ciudad" }], ans: 0 },
      { audio: "Study in the library.", q: "Where is \"study\"?", qes: "¿Dónde es el 'estudia'?", opts: [{ t: "in the library", es: "en la biblioteca" }, { t: "in the class", es: "en la clase" }], ans: 0 },
      { audio: "Don't watch television at night.", q: "When is \"don't watch\"?", qes: "¿Cuándo es el 'no mires'?", opts: [{ t: "at night", es: "en la noche" }, { t: "in the morning", es: "en la mañana" }], ans: 0 },
      { audio: "Please, open the book.", q: "What do you hear?", qes: "¿Qué escuchas?", opts: [{ t: "open the book", es: "abre el libro" }, { t: "open the email", es: "abre el correo" }], ans: 0 },
      { audio: "Close the book.", q: "What do you hear?", qes: "¿Qué escuchas?", opts: [{ t: "Close the book", es: "cierra el libro" }, { t: "Close the email", es: "cierra el correo" }], ans: 0 },
      { audio: "Don't sleep in the class.", q: "Where is \"don't sleep\"?", qes: "¿Dónde es el 'no duermas'?", opts: [{ t: "in the class", es: "en la clase" }, { t: "in the house", es: "en la casa" }], ans: 0 },
      { audio: "Walk in the park.", q: "Where is \"walk\"?", qes: "¿Dónde es el 'camina'?", opts: [{ t: "in the park", es: "en el parque" }, { t: "in the library", es: "en la biblioteca" }], ans: 0 }
    ],
    speaking: [
      { tipo: "Repetición", en: "Open the book.", es: "Abre el libro." },
      { tipo: "Repetición", en: "Close the book.", es: "Cierra el libro." },
      { tipo: "Repetición", en: "Don't eat in the class.", es: "No comas en la clase." },
      { tipo: "Lectura", en: "Write the email.", es: "Escribe el correo." },
      { tipo: "Lectura", en: "Don't run in the library.", es: "No corras en la biblioteca." },
      { tipo: "Lectura", en: "Please, study in the library.", es: "Por favor, estudia en la biblioteca." },
      { tipo: "Respuesta", prompt: "Di en inglés: 'abre el libro'", promptEs: "Abre el libro.", en: "Open the book.", es: "Abre el libro." },
      { tipo: "Respuesta", prompt: "Di en inglés: 'no corras en la biblioteca'", promptEs: "No corras en la biblioteca.", en: "Don't run in the library.", es: "No corras en la biblioteca." },
      { tipo: "Producción", prompt: "Da una orden con 'the book'.", promptEs: "el libro", en: "Read the book.", es: "Lee el libro." },
      { tipo: "Producción", prompt: "Da una prohibición con 'the class'.", promptEs: "la clase", en: "Don't sleep in the class.", es: "No duermas en la clase." }
    ],
    writing: [
      { es: "Abre el libro.", en: ["open the book"] },
      { es: "Cierra el libro.", en: ["close the book"] },
      { es: "Lee el libro.", en: ["read the book"] },
      { es: "Escribe el correo.", en: ["write the email"] },
      { es: "Estudia en la biblioteca.", en: ["study in the library"] },
      { es: "No comas en la clase.", en: ["don't eat in the class", "do not eat in the class"] },
      { es: "No corras en la biblioteca.", en: ["don't run in the library", "do not run in the library"] },
      { es: "No mires televisión en la noche.", en: ["don't watch television at night", "do not watch television at night"] },
      { es: "Por favor, escucha.", en: ["please listen", "please, listen"] },
      { es: "No duermas en la clase.", en: ["don't sleep in the class", "do not sleep in the class"] }
    ]
  },
  {
    id: "N1-B19",
    key: "b19",
    tipo: "final",
    titulo: "Integración Final A1: FRASES + PÁRRAFOS + TEST TOEFL",
    guion: "Bloque 19. La integración final del nivel A1. Ahora combinas todo lo que aprendiste: pronombres, posesivos, there is, there are, presente simple, adverbios de frecuencia, can y los imperativos. Primero, diez frases de aplicación. Luego, párrafos integrados. Y al final, el test de cierre. Todo inglés con su traducción. Tú puedes.",
    frases: [
      { es: "Yo siempre estudio en la biblioteca en la mañana.", en: ["i always study in the library in the morning"] },
      { es: "Ella puede escribir correos en la oficina.", en: ["she can write emails in the office"] },
      { es: "Hay un libro sobre la mesa y hay bolígrafos sobre la computadora.", en: ["there is a book on the table and there are pens on the computer"] },
      { es: "Él nunca mira televisión en la noche.", en: ["he never watches television at night"] },
      { es: "Abre el libro y escribe el correo, por favor.", en: ["open the book and write the email please"] },
      { es: "Mi libro está en la biblioteca y su tarea de ellos está en la clase.", en: ["my book is in the library and their homework is in the class"] },
      { es: "Nosotros a veces caminamos en el parque en verano.", en: ["we sometimes walk in the park in summer"] },
      { es: "¿Puedes nadar? No, no puedo.", en: ["can you swim no i can't", "can you swim no i cannot"] },
      { es: "La maestra me enseña a mí y yo la miro a ella.", en: ["the teacher teaches me and i watch her"] },
      { es: "Este es mi bolígrafo y esos son sus exámenes de ellos.", en: ["this is my pen and those are their exams"] }
    ],
    parrafosEN: [
      { en: "Hello. I am a student. I always study in the library in the morning. I can speak English and I can write emails. My book is on the table and my pen is on the computer. The teacher teaches me and I watch her. There is an exam on Monday. Open the book and read the book, please. I never sleep in the class.", es: "Hola. Yo soy un estudiante. Yo siempre estudio en la biblioteca en la mañana. Yo puedo hablar inglés y yo puedo escribir correos. Mi libro está sobre la mesa y mi bolígrafo está sobre la computadora. La maestra me enseña a mí y yo la miro a ella. Hay un examen el lunes. Abre el libro y lee el libro, por favor. Yo nunca duermo en la clase." },
      { en: "He is a citizen. He usually works on Mondays and he sometimes walks in the park. He can't dance. He never watches television at night. His car is small and his house is in the city. There are cars in the city and there are friends in the park. We watch them and they watch us. Don't run in the library. Walk in the park, please.", es: "Él es un ciudadano. Él usualmente trabaja los lunes y él a veces camina en el parque. Él no puede bailar. Él nunca mira televisión en la noche. Su carro es pequeño y su casa está en la ciudad. Hay carros en la ciudad y hay amigos en el parque. Nosotros los miramos a ellos y ellos nos miran a nosotros. No corras en la biblioteca. Camina en el parque, por favor." }
    ],
    parrafosES: [
      { es: "Yo soy un estudiante. Yo siempre estudio en la biblioteca en la mañana. Yo puedo leer libros y escribir correos. Mi bolígrafo está sobre la computadora. La maestra me enseña a mí. Hay un examen el lunes. Abre el libro, por favor.", en: "I am a student. I always study in the library in the morning. I can read books and write emails. My pen is on the computer. The teacher teaches me. There is an exam on Monday. Open the book, please." },
      { es: "Ella es una maestra. Ella usualmente escribe correos en la oficina. Ella nunca come en la clase. Su biblioteca de ella es grande. Estos son nuestros libros y esos son sus exámenes de ellos. Nosotros podemos estudiar en la biblioteca. No duermas en la clase.", en: "She is a teacher. She usually writes emails in the office. She never eats in the class. Her library is big. These are our books and those are their exams. We can study in the library. Don't sleep in the class." }
    ],
    test: {
      reading: {
        pasaje: {
          en: "Ana is a student. She always studies in the library in the morning. She can speak English and she can write emails. Her book is on the table and her pen is on the computer. The teacher teaches her and she watches him. There is an exam on Monday. Luis is a citizen. He usually works on Mondays. He sometimes walks in the park. He can't swim. There are cars in the city and there are friends at the party. Don't eat in the class. Open the book and read the book, please.",
          es: "Ana es una estudiante. Ella siempre estudia en la biblioteca en la mañana. Ella puede hablar inglés y ella puede escribir correos. Su libro está sobre la mesa y su bolígrafo está sobre la computadora. La maestra le enseña a ella y ella lo mira a él. Hay un examen el lunes. Luis es un ciudadano. Él usualmente trabaja los lunes. Él a veces camina en el parque. Él no puede nadar. Hay carros en la ciudad y hay amigos en la fiesta. No comas en la clase. Abre el libro y lee el libro, por favor."
        },
        preguntas: [
          { q: "Where does Ana always study?", qes: "¿Dónde siempre estudia Ana?", opts: [{ t: "in the library", es: "en la biblioteca" }, { t: "in the park", es: "en el parque" }, { t: "at the party", es: "en la fiesta" }], ans: 0 },
          { q: "What can Ana write?", qes: "¿Qué puede escribir Ana?", opts: [{ t: "emails", es: "correos" }, { t: "exams", es: "exámenes" }, { t: "books", es: "libros" }], ans: 0 },
          { q: "When is the exam?", qes: "¿Cuándo es el examen?", opts: [{ t: "on Monday", es: "el lunes" }, { t: "in summer", es: "en verano" }, { t: "at night", es: "en la noche" }], ans: 0 },
          { q: "Can Luis swim?", qes: "¿Puede nadar Luis?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
          { q: "When does Luis usually work?", qes: "¿Cuándo usualmente trabaja Luis?", opts: [{ t: "on Mondays", es: "los lunes" }, { t: "in the morning", es: "en la mañana" }, { t: "at night", es: "en la noche" }], ans: 0 }
        ]
      },
      listening: [
        { audio: "I always study in the morning. I never study at night.", q: "When does the person never study?", qes: "¿Cuándo nunca estudia?", opts: [{ t: "at night", es: "en la noche" }, { t: "in the morning", es: "en la mañana" }], ans: 0 },
        { audio: "There is a book on the table and there are pens on the computer.", q: "What is on the computer?", qes: "¿Qué hay sobre la computadora?", opts: [{ t: "pens", es: "bolígrafos" }, { t: "a book", es: "un libro" }], ans: 0 },
        { audio: "She can write emails. She can't swim.", q: "What can't she do?", qes: "¿Qué no puede hacer?", opts: [{ t: "swim", es: "nadar" }, { t: "write emails", es: "escribir correos" }], ans: 0 },
        { audio: "Open the book and write the email, please.", q: "What does the person say to open?", qes: "¿Qué dice abrir?", opts: [{ t: "the book", es: "el libro" }, { t: "the email", es: "el correo" }], ans: 0 },
        { audio: "He usually works on Mondays. He sometimes walks in the park.", q: "Where does he sometimes walk?", qes: "¿Dónde a veces camina?", opts: [{ t: "in the park", es: "en el parque" }, { t: "on Mondays", es: "los lunes" }], ans: 0 }
      ],
      speaking: [
        { tipo: "Lectura", prompt: "I always study in the library in the morning.", promptEs: "Siempre estudio en la biblioteca en la mañana.", en: "I always study in the library in the morning.", es: "Yo siempre estudio en la biblioteca en la mañana." },
        { tipo: "Respuesta", prompt: "Can you speak English?", promptEs: "¿Puedes hablar inglés?", en: "Yes, I can.", es: "Sí, puedo." },
        { tipo: "Producción", prompt: "Di 3 frases sobre ti: una con 'always', una con 'can', una con 'there is'.", promptEs: "Siempre... Puedo... Hay...", en: "I always study in the morning. I can speak English. There is a book on the table.", es: "Yo siempre estudio en la mañana. Yo puedo hablar inglés. Hay un libro sobre la mesa." }
      ],
      writing: [
        { es: "Yo siempre estudio en la biblioteca y yo puedo escribir correos.", en: ["i always study in the library and i can write emails"] },
        { es: "Hay un libro sobre la mesa. No corras en la biblioteca.", en: ["there is a book on the table don't run in the library", "there is a book on the table do not run in the library", "there is a book on the table dont run in the library"] },
        { es: "Ella me enseña a mí y yo la miro a ella.", en: ["she teaches me and i watch her"] }
      ]
    }
  }
];

/* ============================================
   EXÁMENES DE NIVEL A1 (ARQUITECTURA DE 3 EVALUACIONES)
   TEST-DIAG-A1  -> inicio del nivel (línea base)
   TEST-MID-A1   -> después de B9 (mitad del nivel)
   TEST-PROD-FINAL-A1 -> cierre (producción por párrafos)
   Todos: Reading + Listening + Speaking + Writing.
============================================ */

var LEVEL_TESTS = [
  {
    id: "TEST-DIAG-A1",
    key: "diag",
    tipo: "diag",
    titulo: "Examen Inicial (Diagnóstico)",
    posicion: "inicio",
    guion: "Examen inicial de diagnóstico del nivel A1. No es para aprobar ni reprobar: mide tu línea base. Tienes lectura, escucha, voz y escritura. Todo inglés con su traducción. Responde con calma.",
    reading: {
      pasaje: {
        en: "Hello. I am Ana. I am a student. He is Luis. He is a teacher. They are in the library. The book is on the table.",
        es: "Hola. Yo soy Ana. Yo soy una estudiante. Él es Luis. Él es un maestro. Ellos están en la biblioteca. El libro está sobre la mesa."
      },
      preguntas: [
        { q: "Who is Ana?", qes: "¿Quién es Ana?", opts: [{ t: "a student", es: "una estudiante" }, { t: "a teacher", es: "una maestra" }, { t: "a citizen", es: "una ciudadana" }], ans: 0 },
        { q: "Who is Luis?", qes: "¿Quién es Luis?", opts: [{ t: "a student", es: "un estudiante" }, { t: "a teacher", es: "un maestro" }, { t: "a friend", es: "un amigo" }], ans: 1 },
        { q: "Where are they?", qes: "¿Dónde están?", opts: [{ t: "in the library", es: "en la biblioteca" }, { t: "in the city", es: "en la ciudad" }, { t: "on the bus", es: "en el autobús" }], ans: 0 },
        { q: "Where is the book?", qes: "¿Dónde está el libro?", opts: [{ t: "on the table", es: "sobre la mesa" }, { t: "on the computer", es: "sobre la computadora" }, { t: "in the park", es: "en el parque" }], ans: 0 },
        { q: "Is Ana a teacher?", qes: "¿Es Ana una maestra?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 }
      ]
    },
    listening: [
      { audio: "I am a student.", q: "What is the person?", qes: "¿Qué es la persona?", opts: [{ t: "a student", es: "un estudiante" }, { t: "a teacher", es: "un maestro" }], ans: 0 },
      { audio: "The pen is on the book.", q: "Where is the pen?", qes: "¿Dónde está el bolígrafo?", opts: [{ t: "on the book", es: "sobre el libro" }, { t: "on the table", es: "sobre la mesa" }], ans: 0 },
      { audio: "She is in the city.", q: "Where is she?", qes: "¿Dónde está ella?", opts: [{ t: "in the city", es: "en la ciudad" }, { t: "in the park", es: "en el parque" }], ans: 0 }
    ],
    speaking: [
      { tipo: "Lectura", en: "I am a student.", es: "Yo soy un estudiante." },
      { tipo: "Respuesta", prompt: "Are you a teacher?", promptEs: "¿Eres un maestro?", en: "No, I am not.", es: "No, no soy." }
    ],
    writing: [
      { es: "Yo soy un estudiante.", en: ["i am a student"] },
      { es: "Ella está en la biblioteca.", en: ["she is in the library"] }
    ]
  },
  {
    id: "TEST-MID-A1",
    key: "mid",
    tipo: "mid",
    titulo: "Examen Intermedio",
    posicion: "medio",
    guion: "Examen intermedio del nivel A1. Valida lo aprendido en los primeros nueve bloques: el verbo to be, el presente simple, el presente continuo y las preguntas con do y does. Tienes lectura, escucha, voz y escritura. Todo inglés con su traducción.",
    reading: {
      pasaje: {
        en: "Carlos is a student. He studies in the library every day. He is not working now. He is reading a book. Maria is a teacher. She does not watch television at night. She is writing an email. They are friends. They do not eat in the class.",
        es: "Carlos es un estudiante. Él estudia en la biblioteca todos los días. Él no está trabajando ahora. Él está leyendo un libro. Maria es una maestra. Ella no mira televisión en la noche. Ella está escribiendo un correo. Ellos son amigos. Ellos no comen en la clase."
      },
      preguntas: [
        { q: "What does Carlos do every day?", qes: "¿Qué hace Carlos todos los días?", opts: [{ t: "studies in the library", es: "estudia en la biblioteca" }, { t: "works in the office", es: "trabaja en la oficina" }, { t: "watches television", es: "mira TV" }], ans: 0 },
        { q: "Is Carlos working now?", qes: "¿Está trabajando Carlos ahora?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
        { q: "What does Maria NOT do at night?", qes: "¿Qué NO hace Maria en la noche?", opts: [{ t: "watch television", es: "mirar TV" }, { t: "read books", es: "leer libros" }, { t: "write emails", es: "escribir correos" }], ans: 0 },
        { q: "What is Maria doing?", qes: "¿Qué está haciendo Maria?", opts: [{ t: "writing an email", es: "escribiendo un correo" }, { t: "reading a book", es: "leyendo un libro" }, { t: "eating", es: "comiendo" }], ans: 0 },
        { q: "Do they eat in the class?", qes: "¿Comen ellos en la clase?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 }
      ]
    },
    listening: [
      { audio: "I do not work. I am studying.", q: "What is the person doing?", qes: "¿Qué está haciendo?", opts: [{ t: "studying", es: "estudiando" }, { t: "working", es: "trabajando" }], ans: 0 },
      { audio: "Does he study English? Yes, he does.", q: "Does he study English?", qes: "¿Estudia él inglés?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 0 },
      { audio: "She is not watching television. She is reading.", q: "What is she doing?", qes: "¿Qué está haciendo ella?", opts: [{ t: "reading", es: "leyendo" }, { t: "watching television", es: "mirando TV" }], ans: 0 },
      { audio: "Do they live in the city? No, they don't.", q: "Do they live in the city?", qes: "¿Viven en la ciudad?", opts: [{ t: "Yes", es: "Sí" }, { t: "No", es: "No" }], ans: 1 },
      { audio: "He works on Mondays.", q: "When does he work?", qes: "¿Cuándo trabaja?", opts: [{ t: "on Mondays", es: "los lunes" }, { t: "at night", es: "en la noche" }], ans: 0 }
    ],
    speaking: [
      { tipo: "Lectura", en: "I am not working. I am studying in the library.", es: "No estoy trabajando. Estoy estudiando en la biblioteca." },
      { tipo: "Respuesta", prompt: "Does she study English?", promptEs: "¿Estudia ella inglés?", en: "Yes, she does.", es: "Sí, ella estudia." },
      { tipo: "Producción", prompt: "Di una frase de rutina y una de 'ahora' (now).", promptEs: "rutina y now", en: "I work on Mondays. I am working now.", es: "Yo trabajo los lunes. Yo estoy trabajando ahora." }
    ],
    writing: [
      { es: "Él no trabaja los lunes.", en: ["he does not work on mondays", "he doesn't work on mondays"] },
      { es: "¿Estás estudiando tú?", en: ["are you studying"] },
      { es: "Nosotros no estamos comiendo en la clase.", en: ["we are not eating in the class", "we aren't eating in the class"] }
    ]
  },
  {
    id: "TEST-PROD-FINAL-A1",
    key: "prod",
    tipo: "prod",
    titulo: "Examen de Producción Final",
    posicion: "final",
    guion: "Examen final de producción del nivel A1. Primero lees y escuchas un párrafo en inglés y lo escribes en español. Después escribes párrafos en inglés y los lees en voz alta. Todo inglés con su traducción.",
    parrafos: [
      { dir: "en", en: "Good morning. We are in the class. The teacher is in the office. There are books on the table and there are pens on the computer. I can read the books and I can write the emails. My friend is in the library. He usually studies in the morning. We can sing and we can dance at the party. Don't sleep in the class. Listen, please.", es: "Buenos días. Nosotros estamos en la clase. El maestro está en la oficina. Hay libros sobre la mesa y hay bolígrafos sobre la computadora. Yo puedo leer los libros y yo puedo escribir los correos. Mi amigo está en la biblioteca. Él usualmente estudia en la mañana. Nosotros podemos cantar y podemos bailar en la fiesta. No duermas en la clase. Escucha, por favor." },
      { dir: "en", en: "She is a citizen. She lives in the city. Her apartment is small. There is a television in the apartment. She sometimes watches television at night. She can walk in the park in summer. There are friends in the park. They watch her and she watches them. Walk in the park, please.", es: "Ella es una ciudadana. Ella vive en la ciudad. Su departamento de ella es pequeño. Hay una televisión en el departamento. Ella a veces mira televisión en la noche. Ella puede caminar en el parque en verano. Hay amigos en el parque. Ellos la miran a ella y ella los mira a ellos. Camina en el parque, por favor." },
      { dir: "es", es: "Él es un ciudadano. Él siempre camina en la ciudad en la mañana. Él puede comprar comida en la tienda. Hay un autobús en la ciudad. No corras en la biblioteca.", en: "He is a citizen. He always walks in the city in the morning. He can buy food in the store. There is a bus in the city. Don't run in the library." },
      { dir: "es", es: "Nosotros somos estudiantes. Nosotros podemos estudiar en la biblioteca los lunes. Nuestra clase es en la mañana. La maestra nos enseña a nosotros y nosotros la miramos a ella.", en: "We are students. We can study in the library on Mondays. Our class is in the morning. The teacher teaches us and we watch her." },
      { dir: "es", es: "Ella es una maestra. Ella siempre escribe correos en la oficina. Ella puede cantar y bailar en la fiesta. Hay comida y agua en la fiesta. Ellos no beben café en la noche.", en: "She is a teacher. She always writes emails in the office. She can sing and dance at the party. There is food and water at the party. They do not drink coffee at night." }
    ]
  }
];

function mbBadgeNum(block) {
  return String(block.id).replace("N1-", "");
}

function mbScore(id) {
  window.__mbscores = window.__mbscores || {};
  return window.__mbscores[id] || 0;
}

function mbAddScore(id, n) {
  window.__mbscores = window.__mbscores || {};
  window.__mbscores[id] = (window.__mbscores[id] || 0) + n;
}

function mbSpeak(text) {
  if (typeof ssSpeak === "function") {
    ssSpeak(text, "narrator");
  }
}

function mbPlayEn(text) {
  if (typeof ssSpeak === "function") {
    ssSpeak('**"' + text + '"**', "narrator");
  }
}

function renderMasterFlow(container, block) {
  if (typeof appState !== "undefined") {
    appState.lastInteraction = "Bloque " + mbBadgeNum(block) + ": " + block.titulo;
  }
  if (block.tipo === "final") {
    renderFinalFlow(container, block);
  } else {
    renderMasterGrammar(container, block);
  }
}

/* ---------- GRAMATICA (TTS + TABLA) ---------- */
function renderMasterGrammar(container, block) {
  var b = block;
  var key = b.key;

  var pills = b.palabras.map(function (p) {
    return '<span class="mb-pill"><strong>' + escapeHtml(p.en) + '</strong> <span>= ' + escapeHtml(p.es) + '</span></span>';
  }).join("");

  var optsHtml = b.opciones.map(function (o) {
    return '<option value="' + o + '">' + o + '</option>';
  }).join("");

  var rows = b.tabla.map(function (item, i) {
    return '<div class="s6-row">' +
      '<div class="s6-es">' + escapeHtml(item.en) + ' <i>(' + escapeHtml(item.es) + ')</i></div>' +
      '<select id="mbg' + key + 'e' + i + '" class="n0-select"><option value="">?</option>' + optsHtml + '</select>' +
      '<div id="mbgf' + key + i + '" class="s4-answer"></div>' +
    '</div>';
  }).join("");

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE ' + mbBadgeNum(b) + ' · GRAMÁTICA</div>' +
      '<h2 class="ob-title">' + escapeHtml(b.titulo) + '</h2>' +
      '<p class="ob-sub">Palabras funcionales nuevas (se enseñan ANTES de usarse):</p>' +
      '<div class="mb-pills">' + pills + '</div>' +
      '<div class="s4-rule"><b>Regla de oro:</b> ' + escapeHtml(b.regla) + '</div>' +
      '<p class="ob-sub">Completa la tabla. Primero piensa, luego revisa.</p>' +
      rows +
      '<div id="mbgScore" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="mbgCheck" class="btn">Revisar</button>' +
        '<button id="mbgNext" class="btn" disabled>Continuar a Reading</button>' +
      '</div>' +
    '</div>';

  document.getElementById("mbgCheck").onclick = function () {
    var score = 0;
    b.tabla.forEach(function (item, i) {
      var sel = document.getElementById("mbg" + key + "e" + i);
      var fb = document.getElementById("mbgf" + key + i);
      var ok = sel.value === item.ans;
      if (ok) score++;
      sel.classList.remove("ok", "bad");
      sel.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + item.ans + ".";
    });
    mbAddScore(b.id, score);
    document.getElementById("mbgScore").textContent = "Resultado: " + score + "/" + b.tabla.length;
    document.getElementById("mbgNext").disabled = false;
  };

  document.getElementById("mbgNext").onclick = function () {
    renderMasterReading(container, b);
  };

  mbSpeak(b.guion);
}

/* ---------- READING (10) ---------- */
function renderMasterReading(container, block) {
  var b = block;

  var passage = b.reading.pasaje.map(function (l) {
    return '<div class="mb-passage-line">' + ssDisplayEn(l.en) + '<span class="mb-es">' + escapeHtml(l.es) + '</span></div>';
  }).join("");

  var questions = b.reading.preguntas.map(function (q, i) {
    var opts = q.opts.map(function (o, j) {
      return '<button type="button" class="mb-option" data-j="' + j + '">' +
        '<span class="mb-opt-en">' + escapeHtml(o.t) + '</span>' +
        '<span class="mb-opt-es">' + escapeHtml(o.es) + '</span>' +
      '</button>';
    }).join("");
    return '<div class="mb-question-card">' +
      '<div class="mb-question">' + (i + 1) + '. ' + escapeHtml(q.q) + '</div>' +
      '<div class="mb-question-es">' + escapeHtml(q.qes) + '</div>' +
      '<div class="mb-option-grid" data-q="' + i + '">' + opts + '</div>' +
      '<div class="mb-feedback"></div>' +
    '</div>';
  }).join("");

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE ' + mbBadgeNum(b) + ' · READING</div>' +
      '<h2 class="ob-title">Lee y comprende</h2>' +
      '<p class="ob-sub">Lee el texto y responde cada pregunta. Todo inglés con su traducción.</p>' +
      '<div class="mb-passage">' + passage + '</div>' +
      questions +
      '<div id="mbrScore" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="mbrNext" class="btn" disabled>Continuar a Listening</button>' +
      '</div>' +
    '</div>';

  var answered = 0;
  var total = b.reading.preguntas.length;

  container.querySelectorAll(".mb-question-card").forEach(function (card) {
    var qIndex = Number(card.querySelector(".mb-option-grid").dataset.q);
    var q = b.reading.preguntas[qIndex];
    var opts = card.querySelectorAll(".mb-option");

    opts.forEach(function (btn) {
      btn.onclick = function () {
        if (btn.disabled) return;
        opts.forEach(function (x) { x.disabled = true; });
        var ok = Number(btn.dataset.j) === q.ans;
        if (ok) {
          mbAddScore(b.id, 1);
        } else {
          opts[q.ans].classList.add("correct");
        }
        btn.classList.add(ok ? "correct" : "wrong");
        card.querySelector(".mb-feedback").textContent =
          ok ? "Correcto." : "Correcto: " + q.opts[q.ans].t + " (" + q.opts[q.ans].es + ").";
        answered++;
        document.getElementById("mbrScore").textContent = "Progreso: " + answered + "/" + total;
        if (answered === total) {
          document.getElementById("mbrNext").disabled = false;
        }
      };
    });
  });

  document.getElementById("mbrNext").onclick = function () {
    renderMasterListening(container, b, 0);
  };

  mbSpeak("Lectura del bloque " + mbBadgeNum(b) + ". Lee el texto y responde las diez preguntas. Recuerda: todo inglés con su traducción.");
}

/* ---------- LISTENING (10) ---------- */
function renderMasterListening(container, block, idx) {
  var b = block;
  var items = b.listening;

  if (idx >= items.length) {
    renderMasterSpeaking(container, b, 0);
    return;
  }

  var item = items[idx];

  var opts = item.opts.map(function (o, j) {
    return '<button type="button" class="mb-option" data-j="' + j + '">' +
      '<span class="mb-opt-en">' + escapeHtml(o.t) + '</span>' +
      '<span class="mb-opt-es">' + escapeHtml(o.es) + '</span>' +
    '</button>';
  }).join("");

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE ' + mbBadgeNum(b) + ' · LISTENING</div>' +
      '<h2 class="ob-title">Escucha y elige</h2>' +
      '<div class="mb-progress">Escucha ' + (idx + 1) + ' de ' + items.length + '</div>' +
      '<div class="mb-listen-card">' +
        '<div class="mb-question">' + escapeHtml(item.q) + '</div>' +
        '<div class="mb-question-es">' + escapeHtml(item.qes) + '</div>' +
        '<div class="mb-row-actions">' +
          '<button id="mblPlay" class="btn">🔊 Escuchar</button>' +
        '</div>' +
      '</div>' +
      '<div class="mb-option-grid">' + opts + '</div>' +
      '<div id="mblFeedback" class="mb-feedback"></div>' +
      '<div class="ob-actions">' +
        '<button id="mblNext" class="btn" disabled>Siguiente</button>' +
      '</div>' +
    '</div>';

  function play() {
    mbPlayEn(item.audio);
  }

  document.getElementById("mblPlay").onclick = play;

  container.querySelectorAll(".mb-option").forEach(function (btn) {
    btn.onclick = function () {
      if (btn.disabled) return;
      container.querySelectorAll(".mb-option").forEach(function (x) { x.disabled = true; });
      var ok = Number(btn.dataset.j) === item.ans;
      if (ok) {
        mbAddScore(b.id, 1);
      } else {
        container.querySelectorAll(".mb-option")[item.ans].classList.add("correct");
      }
      btn.classList.add(ok ? "correct" : "wrong");
      document.getElementById("mblFeedback").textContent =
        ok ? "Correcto." : "Correcto: " + item.opts[item.ans].t + " (" + item.opts[item.ans].es + ").";
      document.getElementById("mblNext").disabled = false;
    };
  });

  document.getElementById("mblNext").onclick = function () {
    renderMasterListening(container, b, idx + 1);
  };

  mbSpeak("Escucha el audio y elige la respuesta correcta. Audio " + (idx + 1) + " de " + items.length + ".");
  setTimeout(play, 700);
}

/* ---------- SPEAKING (10) ---------- */
function renderMasterSpeaking(container, block, idx) {
  var b = block;
  var items = b.speaking;

  if (idx >= items.length) {
    renderMasterWriting(container, b);
    return;
  }

  var item = items[idx];

  var promptHtml = "";
  if (item.prompt) {
    promptHtml = '<div class="mb-question">' + escapeHtml(item.prompt) + '</div>';
    if (item.promptEs) {
      promptHtml += '<div class="mb-question-es">' + escapeHtml(item.promptEs) + '</div>';
    }
  }

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE ' + mbBadgeNum(b) + ' · SPEAKING</div>' +
      '<h2 class="ob-title">Habla con AURIX</h2>' +
      '<div class="mb-progress">Voz ' + (idx + 1) + ' de ' + items.length + '</div>' +
      '<div class="mb-speak-card">' +
        '<div class="mb-speak-type">' + escapeHtml(item.tipo) + '</div>' +
        promptHtml +
        '<div class="mb-en">' + ssDisplayEn(item.en) + '</div>' +
        '<div class="mb-es">' + escapeHtml(item.es) + '</div>' +
        '<div class="mb-row-actions">' +
          '<button id="mbsPlay" class="ob-small-btn">🔊 Escuchar modelo</button>' +
          '<button id="mbsMic" class="btn">🎤 Practicar</button>' +
          '<button id="mbsOk" class="ob-small-btn">✓ Lo dije bien</button>' +
        '</div>' +
      '</div>' +
      '<div id="mbsFeedback" class="mb-feedback"></div>' +
      '<div class="ob-actions">' +
        '<button id="mbsNext" class="btn" disabled>Siguiente</button>' +
      '</div>' +
    '</div>';

  document.getElementById("mbsPlay").onclick = function () {
    mbPlayEn(item.en);
  };

  document.getElementById("mbsMic").onclick = function () {
    if (typeof window.aurixOpenMic === "function") {
      window.aurixOpenMic(item.en);
    } else {
      mbPlayEn(item.en);
    }
  };

  document.getElementById("mbsOk").onclick = function () {
    mbAddScore(b.id, 1);
    document.getElementById("mbsFeedback").textContent = "Registrado. Sigue así.";
    document.getElementById("mbsNext").disabled = false;
  };

  document.getElementById("mbsNext").onclick = function () {
    renderMasterSpeaking(container, b, idx + 1);
  };

  mbPlayEn(item.en);
}

/* ---------- WRITING (10) ---------- */
function renderMasterWriting(container, block) {
  var b = block;
  var key = b.key;

  var rows = b.writing.map(function (item, i) {
    return '<div class="s4-row">' +
      '<div class="s4-es">' + (i + 1) + '. ' + escapeHtml(item.es) + '</div>' +
      '<input id="mbw' + key + 'e' + i + '" class="s4-input" type="text" placeholder="Escribe en inglés...">' +
      '<div id="mbw' + key + 'f' + i + '" class="s4-answer"></div>' +
    '</div>';
  }).join("");

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE ' + mbBadgeNum(b) + ' · WRITING</div>' +
      '<h2 class="ob-title">Escribe en inglés</h2>' +
      '<p class="ob-sub">Traduce cada oración. El pronombre siempre se escribe.</p>' +
      rows +
      '<div id="mbwScore" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="mbwCheck" class="btn">Revisar</button>' +
        '<button id="mbwNext" class="btn" disabled>Completar bloque</button>' +
      '</div>' +
    '</div>';

  document.getElementById("mbwCheck").onclick = function () {
    var score = 0;
    b.writing.forEach(function (item, i) {
      var inp = document.getElementById("mbw" + key + "e" + i);
      var fb = document.getElementById("mbw" + key + "f" + i);
      var ok = item.en.indexOf(s4Norm(inp.value)) > -1;
      if (ok) score++;
      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + item.en[0] + ".";
    });
    mbAddScore(b.id, score);
    document.getElementById("mbwScore").textContent = "Resultado: " + score + "/" + b.writing.length;
    document.getElementById("mbwNext").disabled = false;
  };

  document.getElementById("mbwNext").onclick = function () {
    renderMasterComplete(container, b);
  };

  mbSpeak("Escritura del bloque " + mbBadgeNum(b) + ". Traduce las diez oraciones al inglés. Todo inglés con su traducción.");
}

/* ---------- COMPLETAR ---------- */
function renderMasterComplete(container, block) {
  var b = block;
  var total = mbScore(b.id);
  var max = b.tabla.length + b.reading.preguntas.length + b.listening.length + b.speaking.length + b.writing.length;

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE ' + mbBadgeNum(b) + ' COMPLETADO</div>' +
      '<h2 class="ob-title">Formato Maestro superado</h2>' +
      '<div class="mp-profile-summary">' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Puntaje</div><div class="mp-profile-value">' + total + '/' + max + '</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Habilidades</div><div class="mp-profile-value">Reading · Listening · Speaking · Writing</div></div>' +
      '</div>' +
      '<p class="ob-sub">Regla #9 aplicada: todo inglés siempre con su traducción. ' + ssEnQuote("Excellent work.") + '</p>' +
      '<div class="ob-actions"><button id="mbBack" class="btn">Volver al panel</button></div>' +
    '</div>';

  document.getElementById("mbBack").onclick = function () {
    renderSessionsPanel(container);
  };

  mbSpeak("Bloque " + mbBadgeNum(b) + " completado. Practicaste lectura, escucha, voz y escritura. " + ssEnQuote("Excellent work."));
}

/* ============================================
   BLOQUE 19 · INTEGRACIÓN FINAL A1 (RENDERER DEDICADO)
   Flujo: intro -> frases(10) -> párrafos EN-ES/ES-EN(4)
          -> TEST TOEFL (reading 5, listening 5,
             speaking 3, writing 3) -> completado.
   Regla #9: todo inglés siempre con su traducción.
============================================ */

function esNorm(t) {
  return String(t || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?¡¿;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderFinalFlow(container, block) {
  var b = block;
  var key = b.key;

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE ' + mbBadgeNum(b) + ' · INTEGRACIÓN FINAL A1</div>' +
      '<h2 class="ob-title">' + escapeHtml(b.titulo) + '</h2>' +
      '<p class="ob-sub">Cierre oficial del Nivel A1. Combina todo lo aprendido en B1-B18 y resuelve el Test Final estilo TOEFL iBT adaptado a A1.</p>' +
      '<div class="s4-rule"><b>Regla de oro:</b> todo inglés siempre con su traducción. El pronombre siempre se escribe (solo los imperativos son la excepción).</div>' +
      '<div class="ob-actions">' +
        '<button id="mbf' + key + 'Start" class="btn">Comenzar Integración</button>' +
      '</div>' +
    '</div>';

  document.getElementById("mbf" + key + "Start").onclick = function () {
    renderFinalFrases(container, b);
  };

  mbSpeak(b.guion);
}

/* ---------- FRASES DE APLICACIÓN (10) ---------- */
function renderFinalFrases(container, block) {
  var b = block;
  var key = b.key;

  var rows = b.frases.map(function (item, i) {
    return '<div class="s4-row">' +
      '<div class="s4-es">' + (i + 1) + '. ' + escapeHtml(item.es) + '</div>' +
      '<input id="mff' + key + 'e' + i + '" class="s4-input" type="text" placeholder="Escribe en inglés...">' +
      '<div id="mff' + key + 'f' + i + '" class="s4-answer"></div>' +
    '</div>';
  }).join("");

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE ' + mbBadgeNum(b) + ' · FRASES DE APLICACIÓN</div>' +
      '<h2 class="ob-title">Frases de aplicación</h2>' +
      '<p class="ob-sub">Escribe o di en inglés cada frase. Combina todo lo aprendido en B1-B18.</p>' +
      rows +
      '<div id="mffScore" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="mffCheck" class="btn">Revisar</button>' +
        '<button id="mffNext" class="btn" disabled>Continuar a Párrafos</button>' +
      '</div>' +
    '</div>';

  document.getElementById("mffCheck").onclick = function () {
    var score = 0;
    b.frases.forEach(function (item, i) {
      var inp = document.getElementById("mff" + key + "e" + i);
      var fb = document.getElementById("mff" + key + "f" + i);
      var ok = item.en.indexOf(s4Norm(inp.value)) > -1;
      if (ok) score++;
      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + item.en[0] + ".";
    });
    mbAddScore(b.id, score);
    document.getElementById("mffScore").textContent = "Resultado: " + score + "/" + b.frases.length;
    document.getElementById("mffNext").disabled = false;
  };

  document.getElementById("mffNext").onclick = function () {
    renderFinalParrafos(container, b, 0);
  };

  mbSpeak("Frases de aplicación del bloque final. Traduce las diez frases al inglés. Todo inglés con su traducción.");
}

/* ---------- PÁRRAFOS INTEGRADOS (4) ---------- */
function renderFinalParrafos(container, block, idx) {
  var b = block;
  var key = b.key;
  var items = [];
  b.parrafosEN.forEach(function (p) {
    items.push({ dir: "en-es", en: p.en, es: p.es });
  });
  b.parrafosES.forEach(function (p) {
    items.push({ dir: "es-en", en: p.en, es: p.es });
  });

  if (idx >= items.length) {
    renderFinalTestReading(container, b);
    return;
  }

  var item = items[idx];
  var esEn = item.dir === "en-es";

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">BLOQUE ' + mbBadgeNum(b) + ' · PÁRRAFOS INTEGRADOS</div>' +
      '<h2 class="ob-title">' + (esEn ? "Traduce al español" : "Traduce al inglés") + '</h2>' +
      '<div class="mb-progress">Párrafo ' + (idx + 1) + ' de ' + items.length + '</div>' +
      '<div class="mb-passage">' +
        '<div class="mb-passage-line">' + (esEn ? ssDisplayEn(item.en) : escapeHtml(item.es)) + '</div>' +
      '</div>' +
      '<div class="s4-row">' +
        '<div class="s4-es">' + (esEn ? "Escribe la traducción al español:" : "Escribe la traducción al inglés:") + '</div>' +
        '<textarea id="mfp' + key + 'ta" class="s4-input s4-textarea" placeholder="Escribe aquí tu traducción..."></textarea>' +
        '<div id="mfp' + key + 'f" class="s4-answer"></div>' +
      '</div>' +
      '<div class="ob-actions">' +
        '<button id="mfpCheck" class="btn">Revisar</button>' +
        '<button id="mfpNext" class="btn" disabled>Continuar</button>' +
      '</div>' +
    '</div>';

  document.getElementById("mfpCheck").onclick = function () {
    var ta = document.getElementById("mfp" + key + "ta");
    var fb = document.getElementById("mfp" + key + "f");
    var norm = esEn ? esNorm : s4Norm;
    var source = esEn ? item.es : item.en;
    var user = norm(ta.value);
    var sentences = source.split(". ").map(norm).filter(function (s) { return s.length > 0; });
    var ok = sentences.every(function (s) { return user.indexOf(s) > -1; });
    if (ok) mbAddScore(b.id, 1);
    ta.classList.remove("ok", "bad");
    ta.classList.add(ok ? "ok" : "bad");
    fb.textContent = ok ? "Correcto." : "Correcto: " + source + ".";
    document.getElementById("mfpNext").disabled = false;
  };

  document.getElementById("mfpNext").onclick = function () {
    renderFinalParrafos(container, b, idx + 1);
  };

  mbSpeak("Párrafo integrado " + (idx + 1) + " de " + items.length + ". Traduce el párrafo completo. Todo inglés con su traducción.");
}

/* ---------- TEST FINAL TOEFL · READING (5) ---------- */
function renderFinalTestReading(container, block) {
  var b = block;
  var key = b.key;
  var t = b.test.reading;

  var passageHtml = '<div class="mb-passage"><div class="mb-passage-line">' + ssDisplayEn(t.pasaje.en) + '</div></div>';

  var questions = t.preguntas.map(function (q, i) {
    var opts = q.opts.map(function (o, j) {
      return '<button type="button" class="mb-option" data-j="' + j + '">' +
        '<span class="mb-opt-en">' + escapeHtml(o.t) + '</span>' +
        '<span class="mb-opt-es">' + escapeHtml(o.es) + '</span>' +
      '</button>';
    }).join("");
    return '<div class="mb-question-card">' +
      '<div class="mb-question">' + (i + 1) + '. ' + escapeHtml(q.q) + '</div>' +
      '<div class="mb-question-es">' + escapeHtml(q.qes) + '</div>' +
      '<div class="mb-option-grid" data-q="' + i + '">' + opts + '</div>' +
      '<div class="mb-feedback"></div>' +
    '</div>';
  }).join("");

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">TEST FINAL A1 · READING</div>' +
      '<h2 class="ob-title">Lee y responde</h2>' +
      '<p class="ob-sub">La traducción completa se muestra al terminar el test.</p>' +
      passageHtml +
      questions +
      '<div id="mftrTrans" class="mb-es" style="display:none"></div>' +
      '<div class="ob-actions">' +
        '<button id="mftrNext" class="btn" disabled>Continuar a Listening</button>' +
      '</div>' +
    '</div>';

  var answered = 0;
  var total = t.preguntas.length;

  container.querySelectorAll(".mb-question-card").forEach(function (card) {
    var qIndex = Number(card.querySelector(".mb-option-grid").dataset.q);
    var q = t.preguntas[qIndex];
    var opts = card.querySelectorAll(".mb-option");

    opts.forEach(function (btn) {
      btn.onclick = function () {
        if (btn.disabled) return;
        opts.forEach(function (x) { x.disabled = true; });
        var ok = Number(btn.dataset.j) === q.ans;
        if (ok) {
          mbAddScore(b.id, 1);
        } else {
          opts[q.ans].classList.add("correct");
        }
        btn.classList.add(ok ? "correct" : "wrong");
        card.querySelector(".mb-feedback").textContent =
          ok ? "Correcto." : "Correcto: " + q.opts[q.ans].t + " (" + q.opts[q.ans].es + ").";
        answered++;
        if (answered === total) {
          var trans = document.getElementById("mftrTrans");
          trans.style.display = "block";
          trans.innerHTML = '<strong>Traducción completa:</strong> ' + escapeHtml(t.pasaje.es);
          document.getElementById("mftrNext").disabled = false;
        }
      };
    });
  });

  document.getElementById("mftrNext").onclick = function () {
    renderFinalTestListening(container, b, 0);
  };

  mbSpeak("Test final. Reading. Lee el texto y responde las cinco preguntas. La traducción completa se muestra al terminar el test.");
}

/* ---------- TEST FINAL TOEFL · LISTENING (5) ---------- */
function renderFinalTestListening(container, block, idx) {
  var b = block;
  var items = b.test.listening;

  if (idx >= items.length) {
    renderFinalTestSpeaking(container, b, 0);
    return;
  }

  var item = items[idx];

  var opts = item.opts.map(function (o, j) {
    return '<button type="button" class="mb-option" data-j="' + j + '">' +
      '<span class="mb-opt-en">' + escapeHtml(o.t) + '</span>' +
      '<span class="mb-opt-es">' + escapeHtml(o.es) + '</span>' +
    '</button>';
  }).join("");

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">TEST FINAL A1 · LISTENING</div>' +
      '<h2 class="ob-title">Escucha y elige</h2>' +
      '<div class="mb-progress">Escucha ' + (idx + 1) + ' de ' + items.length + '</div>' +
      '<div class="mb-listen-card">' +
        '<div class="mb-question">' + escapeHtml(item.q) + '</div>' +
        '<div class="mb-question-es">' + escapeHtml(item.qes) + '</div>' +
        '<div class="mb-row-actions">' +
          '<button id="mftlPlay" class="btn">🔊 Escuchar</button>' +
        '</div>' +
      '</div>' +
      '<div class="mb-option-grid">' + opts + '</div>' +
      '<div id="mftlFeedback" class="mb-feedback"></div>' +
      '<div class="ob-actions">' +
        '<button id="mftlNext" class="btn" disabled>Siguiente</button>' +
      '</div>' +
    '</div>';

  function play() {
    mbPlayEn(item.audio);
  }

  document.getElementById("mftlPlay").onclick = play;

  container.querySelectorAll(".mb-option").forEach(function (btn) {
    btn.onclick = function () {
      if (btn.disabled) return;
      container.querySelectorAll(".mb-option").forEach(function (x) { x.disabled = true; });
      var ok = Number(btn.dataset.j) === item.ans;
      if (ok) {
        mbAddScore(b.id, 1);
      } else {
        container.querySelectorAll(".mb-option")[item.ans].classList.add("correct");
      }
      btn.classList.add(ok ? "correct" : "wrong");
      document.getElementById("mftlFeedback").textContent =
        ok ? "Correcto." : "Correcto: " + item.opts[item.ans].t + " (" + item.opts[item.ans].es + ").";
      document.getElementById("mftlNext").disabled = false;
    };
  });

  document.getElementById("mftlNext").onclick = function () {
    renderFinalTestListening(container, b, idx + 1);
  };

  mbSpeak("Test final. Listening. Escucha el audio y elige la respuesta correcta. Audio " + (idx + 1) + " de " + items.length + ".");
  setTimeout(play, 700);
}

/* ---------- TEST FINAL TOEFL · SPEAKING (3) ---------- */
function renderFinalTestSpeaking(container, block, idx) {
  var b = block;
  var items = b.test.speaking;

  if (idx >= items.length) {
    renderFinalTestWriting(container, b);
    return;
  }

  var item = items[idx];

  var promptHtml = "";
  if (item.prompt) {
    promptHtml = '<div class="mb-question">' + escapeHtml(item.prompt) + '</div>';
    if (item.promptEs) {
      promptHtml += '<div class="mb-question-es">' + escapeHtml(item.promptEs) + '</div>';
    }
  }

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">TEST FINAL A1 · SPEAKING</div>' +
      '<h2 class="ob-title">Habla con AURIX</h2>' +
      '<div class="mb-progress">Voz ' + (idx + 1) + ' de ' + items.length + '</div>' +
      '<div class="mb-speak-card">' +
        '<div class="mb-speak-type">' + escapeHtml(item.tipo) + '</div>' +
        promptHtml +
        '<div class="mb-en">' + ssDisplayEn(item.en) + '</div>' +
        '<div class="mb-es">' + escapeHtml(item.es) + '</div>' +
        '<div class="mb-row-actions">' +
          '<button id="mftsPlay" class="ob-small-btn">🔊 Escuchar modelo</button>' +
          '<button id="mftsMic" class="btn">🎤 Practicar</button>' +
          '<button id="mftsOk" class="ob-small-btn">✓ Lo dije bien</button>' +
        '</div>' +
      '</div>' +
      '<div id="mftsFeedback" class="mb-feedback"></div>' +
      '<div class="ob-actions">' +
        '<button id="mftsNext" class="btn" disabled>Siguiente</button>' +
      '</div>' +
    '</div>';

  document.getElementById("mftsPlay").onclick = function () {
    mbPlayEn(item.en);
  };

  document.getElementById("mftsMic").onclick = function () {
    if (typeof window.aurixOpenMic === "function") {
      window.aurixOpenMic(item.en);
    } else {
      mbPlayEn(item.en);
    }
  };

  document.getElementById("mftsOk").onclick = function () {
    mbAddScore(b.id, 1);
    document.getElementById("mftsFeedback").textContent = "Registrado. Sigue así.";
    document.getElementById("mftsNext").disabled = false;
  };

  document.getElementById("mftsNext").onclick = function () {
    renderFinalTestSpeaking(container, b, idx + 1);
  };

  mbPlayEn(item.en);
}

/* ---------- TEST FINAL TOEFL · WRITING (3) ---------- */
function renderFinalTestWriting(container, block) {
  var b = block;
  var key = b.key;

  var rows = b.test.writing.map(function (item, i) {
    return '<div class="s4-row">' +
      '<div class="s4-es">' + (i + 1) + '. ' + escapeHtml(item.es) + '</div>' +
      '<input id="mftw' + key + 'e' + i + '" class="s4-input" type="text" placeholder="Escribe en inglés...">' +
      '<div id="mftw' + key + 'f' + i + '" class="s4-answer"></div>' +
    '</div>';
  }).join("");

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">TEST FINAL A1 · WRITING</div>' +
      '<h2 class="ob-title">Escribe en inglés</h2>' +
      '<p class="ob-sub">Traduce cada oración. El pronombre siempre se escribe.</p>' +
      rows +
      '<div id="mftwScore" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="mftwCheck" class="btn">Revisar</button>' +
        '<button id="mftwNext" class="btn" disabled>Terminar Test</button>' +
      '</div>' +
    '</div>';

  document.getElementById("mftwCheck").onclick = function () {
    var score = 0;
    b.test.writing.forEach(function (item, i) {
      var inp = document.getElementById("mftw" + key + "e" + i);
      var fb = document.getElementById("mftw" + key + "f" + i);
      var ok = item.en.indexOf(s4Norm(inp.value)) > -1;
      if (ok) score++;
      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + item.en[0] + ".";
    });
    mbAddScore(b.id, score);
    document.getElementById("mftwScore").textContent = "Resultado: " + score + "/" + b.test.writing.length;
    document.getElementById("mftwNext").disabled = false;
  };

  document.getElementById("mftwNext").onclick = function () {
    renderFinalComplete(container, b);
  };

  mbSpeak("Test final. Writing. Traduce las tres oraciones al inglés.");
}

/* ---------- INTEGRACIÓN COMPLETADA ---------- */
function renderFinalComplete(container, block) {
  var b = block;
  var total = b.frases.length + b.parrafosEN.length + b.parrafosES.length +
    b.test.reading.preguntas.length + b.test.listening.length +
    b.test.speaking.length + b.test.writing.length;
  var score = mbScore(b.id);

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">NIVEL A1 COMPLETADO</div>' +
      '<h2 class="ob-title">Integración Final superada</h2>' +
      '<div class="mp-profile-summary">' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Puntaje</div><div class="mp-profile-value">' + score + '/' + total + '</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Habilidades</div><div class="mp-profile-value">Reading · Listening · Speaking · Writing</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Cierre A1</div><div class="mp-profile-value">19 de 19 bloques · 100%</div></div>' +
      '</div>' +
      '<p class="ob-sub">Matriz MCER A1 cubierta: verb be, pronombres, posesivos, objeto, artículos, demostrativos, plurales, there is/are, presente simple y continuo, adverbios de frecuencia, preposiciones, can/can\'t, imperativos y preguntas básicas. ' + ssEnQuote("Excellent work.") + '</p>' +
      '<div class="ob-actions"><button id="mfbBack" class="btn">Volver al panel</button></div>' +
    '</div>';

  document.getElementById("mfbBack").onclick = function () {
    renderSessionsPanel(container);
  };

  mbSpeak("Nivel A1 completado. Felicidades. Practicaste lectura, escucha, voz y escritura con diecinueve bloques. " + ssEnQuote("Excellent work."));
}

/* ============================================
   EXÁMENES DE NIVEL A1 · RENDERIZADORES
   DIAG y MID: Reading → Listening → Speaking → Writing.
   PROD: párrafos EN (leer→escuchar→producir ES) y
         párrafos ES (escribir→decir en voz alta).
============================================ */

function renderLevelTest(container, test) {
  var t = test;
  var total = t.tipo === "prod"
    ? (t.parrafos.filter(function (p) { return p.dir === "en"; }).length * 3 +
       t.parrafos.filter(function (p) { return p.dir === "es"; }).length * 2)
    : (t.reading.preguntas.length + t.listening.length + t.speaking.length + t.writing.length);

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">' + t.id + '</div>' +
      '<h2 class="ob-title">' + escapeHtml(t.titulo) + '</h2>' +
      '<p class="ob-sub">' + escapeHtml(t.guion) + '</p>' +
      '<div class="mp-profile-summary">' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Habilidades</div><div class="mp-profile-value">Reading · Listening · Speaking · Writing</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Puntos</div><div class="mp-profile-value">' + total + '</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Nivel</div><div class="mp-profile-value">A1</div></div>' +
      '</div>' +
      '<div class="ob-actions"><button id="ltStart" class="btn">Comenzar Examen</button></div>' +
    '</div>';

  document.getElementById("ltStart").onclick = function () {
    if (t.tipo === "prod") {
      renderProdTest(container, t);
    } else {
      renderLTReading(container, t);
    }
  };

  mbSpeak(t.guion);
}

function renderLTReading(container, test) {
  var t = test;

  var passageHtml = '<div class="mb-passage"><div class="mb-passage-line">' + ssDisplayEn(t.reading.pasaje.en) + '</div></div>';

  var questions = t.reading.preguntas.map(function (q, i) {
    var opts = q.opts.map(function (o, j) {
      return '<button type="button" class="mb-option" data-j="' + j + '">' +
        '<span class="mb-opt-en">' + escapeHtml(o.t) + '</span>' +
        '<span class="mb-opt-es">' + escapeHtml(o.es) + '</span>' +
      '</button>';
    }).join("");
    return '<div class="mb-question-card">' +
      '<div class="mb-question">' + (i + 1) + '. ' + escapeHtml(q.q) + '</div>' +
      '<div class="mb-question-es">' + escapeHtml(q.qes) + '</div>' +
      '<div class="mb-option-grid" data-q="' + i + '">' + opts + '</div>' +
      '<div class="mb-feedback"></div>' +
    '</div>';
  }).join("");

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">' + t.id + ' · READING</div>' +
      '<h2 class="ob-title">Lee y responde</h2>' +
      '<p class="ob-sub">La traducción completa se muestra al terminar el test.</p>' +
      passageHtml +
      questions +
      '<div id="ltrTrans" class="mb-es" style="display:none"></div>' +
      '<div class="ob-actions">' +
        '<button id="ltrNext" class="btn" disabled>Continuar a Listening</button>' +
      '</div>' +
    '</div>';

  var answered = 0;
  var total = t.reading.preguntas.length;

  container.querySelectorAll(".mb-question-card").forEach(function (card) {
    var qIndex = Number(card.querySelector(".mb-option-grid").dataset.q);
    var q = t.reading.preguntas[qIndex];
    var opts = card.querySelectorAll(".mb-option");

    opts.forEach(function (btn) {
      btn.onclick = function () {
        if (btn.disabled) return;
        opts.forEach(function (x) { x.disabled = true; });
        var ok = Number(btn.dataset.j) === q.ans;
        if (ok) {
          mbAddScore(t.id, 1);
        } else {
          opts[q.ans].classList.add("correct");
        }
        btn.classList.add(ok ? "correct" : "wrong");
        card.querySelector(".mb-feedback").textContent =
          ok ? "Correcto." : "Correcto: " + q.opts[q.ans].t + " (" + q.opts[q.ans].es + ").";
        answered++;
        if (answered === total) {
          var trans = document.getElementById("ltrTrans");
          trans.style.display = "block";
          trans.innerHTML = '<strong>Traducción completa:</strong> ' + escapeHtml(t.reading.pasaje.es);
          document.getElementById("ltrNext").disabled = false;
        }
      };
    });
  });

  document.getElementById("ltrNext").onclick = function () {
    renderLTListening(container, t, 0);
  };

  mbSpeak("Examen. Reading. Lee el texto y responde las preguntas. La traducción completa se muestra al terminar el test.");
}

function renderLTListening(container, test, idx) {
  var t = test;
  var items = t.listening;

  if (idx >= items.length) {
    renderLTSpeaking(container, t, 0);
    return;
  }

  var item = items[idx];

  var opts = item.opts.map(function (o, j) {
    return '<button type="button" class="mb-option" data-j="' + j + '">' +
      '<span class="mb-opt-en">' + escapeHtml(o.t) + '</span>' +
      '<span class="mb-opt-es">' + escapeHtml(o.es) + '</span>' +
    '</button>';
  }).join("");

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">' + t.id + ' · LISTENING</div>' +
      '<h2 class="ob-title">Escucha y elige</h2>' +
      '<div class="mb-progress">Escucha ' + (idx + 1) + ' de ' + items.length + '</div>' +
      '<div class="mb-listen-card">' +
        '<div class="mb-question">' + escapeHtml(item.q) + '</div>' +
        '<div class="mb-question-es">' + escapeHtml(item.qes) + '</div>' +
        '<div class="mb-row-actions">' +
          '<button id="ltlPlay" class="btn">🔊 Escuchar</button>' +
        '</div>' +
      '</div>' +
      '<div class="mb-option-grid">' + opts + '</div>' +
      '<div id="ltlFeedback" class="mb-feedback"></div>' +
      '<div class="ob-actions">' +
        '<button id="ltlNext" class="btn" disabled>Siguiente</button>' +
      '</div>' +
    '</div>';

  function play() {
    mbPlayEn(item.audio);
  }

  document.getElementById("ltlPlay").onclick = play;

  container.querySelectorAll(".mb-option").forEach(function (btn) {
    btn.onclick = function () {
      if (btn.disabled) return;
      container.querySelectorAll(".mb-option").forEach(function (x) { x.disabled = true; });
      var ok = Number(btn.dataset.j) === item.ans;
      if (ok) {
        mbAddScore(t.id, 1);
      } else {
        container.querySelectorAll(".mb-option")[item.ans].classList.add("correct");
      }
      btn.classList.add(ok ? "correct" : "wrong");
      document.getElementById("ltlFeedback").textContent =
        ok ? "Correcto." : "Correcto: " + item.opts[item.ans].t + " (" + item.opts[item.ans].es + ").";
      document.getElementById("ltlNext").disabled = false;
    };
  });

  document.getElementById("ltlNext").onclick = function () {
    renderLTListening(container, t, idx + 1);
  };

  mbSpeak("Examen. Listening. Escucha el audio y elige la respuesta correcta. Audio " + (idx + 1) + " de " + items.length + ".");
  setTimeout(play, 700);
}

function renderLTSpeaking(container, test, idx) {
  var t = test;
  var items = t.speaking;

  if (idx >= items.length) {
    renderLTWriting(container, t);
    return;
  }

  var item = items[idx];

  var promptHtml = "";
  if (item.prompt) {
    promptHtml = '<div class="mb-question">' + escapeHtml(item.prompt) + '</div>';
    if (item.promptEs) {
      promptHtml += '<div class="mb-question-es">' + escapeHtml(item.promptEs) + '</div>';
    }
  }

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">' + t.id + ' · SPEAKING</div>' +
      '<h2 class="ob-title">Habla con AURIX</h2>' +
      '<div class="mb-progress">Voz ' + (idx + 1) + ' de ' + items.length + '</div>' +
      '<div class="mb-speak-card">' +
        '<div class="mb-speak-type">' + escapeHtml(item.tipo) + '</div>' +
        promptHtml +
        '<div class="mb-en">' + ssDisplayEn(item.en) + '</div>' +
        '<div class="mb-es">' + escapeHtml(item.es) + '</div>' +
        '<div class="mb-row-actions">' +
          '<button id="ltsPlay" class="ob-small-btn">🔊 Escuchar modelo</button>' +
          '<button id="ltsMic" class="btn">🎤 Practicar</button>' +
          '<button id="ltsOk" class="ob-small-btn">✓ Lo dije bien</button>' +
        '</div>' +
      '</div>' +
      '<div id="ltsFeedback" class="mb-feedback"></div>' +
      '<div class="ob-actions">' +
        '<button id="ltsNext" class="btn" disabled>Siguiente</button>' +
      '</div>' +
    '</div>';

  document.getElementById("ltsPlay").onclick = function () {
    mbPlayEn(item.en);
  };

  document.getElementById("ltsMic").onclick = function () {
    if (typeof window.aurixOpenMic === "function") {
      window.aurixOpenMic(item.en);
    } else {
      mbPlayEn(item.en);
    }
  };

  document.getElementById("ltsOk").onclick = function () {
    mbAddScore(t.id, 1);
    document.getElementById("ltsFeedback").textContent = "Registrado. Sigue así.";
    document.getElementById("ltsNext").disabled = false;
  };

  document.getElementById("ltsNext").onclick = function () {
    renderLTSpeaking(container, t, idx + 1);
  };

  mbPlayEn(item.en);
}

function renderLTWriting(container, test) {
  var t = test;
  var rows = t.writing.map(function (item, i) {
    return '<div class="s4-row">' +
      '<div class="s4-es">' + (i + 1) + '. ' + escapeHtml(item.es) + '</div>' +
      '<input id="ltw' + i + '" class="s4-input" type="text" placeholder="Escribe en inglés...">' +
      '<div id="ltwf' + i + '" class="s4-answer"></div>' +
    '</div>';
  }).join("");

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">' + t.id + ' · WRITING</div>' +
      '<h2 class="ob-title">Escribe en inglés</h2>' +
      '<p class="ob-sub">Traduce cada oración. El pronombre siempre se escribe.</p>' +
      rows +
      '<div id="ltwScore" class="s4-score"></div>' +
      '<div class="ob-actions">' +
        '<button id="ltwCheck" class="btn">Revisar</button>' +
        '<button id="ltwNext" class="btn" disabled>Terminar Examen</button>' +
      '</div>' +
    '</div>';

  document.getElementById("ltwCheck").onclick = function () {
    var score = 0;
    t.writing.forEach(function (item, i) {
      var inp = document.getElementById("ltw" + i);
      var fb = document.getElementById("ltwf" + i);
      var ok = item.en.indexOf(s4Norm(inp.value)) > -1;
      if (ok) score++;
      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + item.en[0] + ".";
    });
    mbAddScore(t.id, score);
    document.getElementById("ltwScore").textContent = "Resultado: " + score + "/" + t.writing.length;
    document.getElementById("ltwNext").disabled = false;
  };

  document.getElementById("ltwNext").onclick = function () {
    renderLTComplete(container, t);
  };

  mbSpeak("Examen. Writing. Traduce las oraciones al inglés.");
}

function renderLTComplete(container, test) {
  var t = test;
  var total = t.reading.preguntas.length + t.listening.length + t.speaking.length + t.writing.length;
  var score = mbScore(t.id);
  var pct = Math.round((score / total) * 100);

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">' + t.id + ' COMPLETADO</div>' +
      '<h2 class="ob-title">' + escapeHtml(t.titulo) + ' · superado</h2>' +
      '<div class="mp-profile-summary">' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Puntaje</div><div class="mp-profile-value">' + score + '/' + total + '</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Precisión</div><div class="mp-profile-value">' + pct + '%</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Habilidades</div><div class="mp-profile-value">Reading · Listening · Speaking · Writing</div></div>' +
      '</div>' +
      '<p class="ob-sub">' + (pct >= 60 ? "Excelente trabajo." : "Buen intento. Puedes repasar los bloques y volver a intentarlo.") + ' ' + ssEnQuote("Keep going.") + '</p>' +
      '<div class="ob-actions"><button id="ltBack" class="btn">Volver al panel</button></div>' +
    '</div>';

  document.getElementById("ltBack").onclick = function () {
    renderSessionsPanel(container);
  };

  mbSpeak("Examen completado. Puntaje: " + score + " de " + total + ". " + (pct >= 60 ? "Excelente trabajo." : "Buen intento. Puedes repasar los bloques."));
}

/* ---------- EXAMEN DE PRODUCCIÓN FINAL (por párrafos) ---------- */
function renderProdTest(container, test) {
  var steps = [];
  test.parrafos.forEach(function (p) {
    if (p.dir === "en") {
      steps.push({ kind: "read", p: p });
      steps.push({ kind: "listen", p: p });
      steps.push({ kind: "prodES", p: p });
    } else {
      steps.push({ kind: "write", p: p });
      steps.push({ kind: "speak", p: p });
    }
  });
  renderProdStep(container, test, steps, 0);
}

function renderProdStep(container, test, steps, idx) {
  if (idx >= steps.length) {
    renderProdComplete(container, test, steps.length);
    return;
  }

  var step = steps[idx];
  var p = step.p;
  var num = idx + 1;
  var total = steps.length;

  var kindLabel = {
    read: "READING · Lee el párrafo en inglés",
    listen: "LISTENING · Escúchalo, sin leer",
    prodES: "PRODUCCIÓN ES · Escríbelo en español",
    write: "WRITING · Escríbelo en inglés",
    speak: "SPEAKING · Léelo en voz alta"
  }[step.kind];

  var inner = "";

  if (step.kind === "read") {
    inner =
      '<div class="mb-passage"><div class="mb-passage-line">' + ssDisplayEn(p.en) + '</div></div>' +
      '<div class="mb-es">' + escapeHtml(p.es) + '</div>' +
      '<div class="ob-actions"><button id="psNext" class="btn">Lo leí · Continuar</button></div>';
  } else if (step.kind === "listen") {
    inner =
      '<p class="ob-sub">Audio sin texto: escucha el mismo párrafo.</p>' +
      '<div class="mb-row-actions"><button id="psPlay" class="btn">🔊 Escuchar</button></div>' +
      '<div class="ob-actions"><button id="psNext" class="btn">Escuché · Continuar</button></div>';
  } else if (step.kind === "prodES") {
    inner =
      '<p class="ob-sub">Escríbelo y dilo en español.</p>' +
      '<div class="s4-row">' +
        '<div class="s4-es">Escribe en español:</div>' +
        '<input id="psInput" class="s4-input" type="text" placeholder="Escribe en español...">' +
        '<div id="psFeedback" class="s4-answer"></div>' +
      '</div>' +
      '<div class="ob-actions">' +
        '<button id="psCheck" class="btn">Revisar</button>' +
        '<button id="psNext" class="btn" disabled>Continuar</button>' +
      '</div>';
  } else if (step.kind === "write") {
    inner =
      '<p class="ob-sub">Escribe en inglés este párrafo en español.</p>' +
      '<div class="mb-es">' + escapeHtml(p.es) + '</div>' +
      '<div class="s4-row">' +
        '<div class="s4-es">Escribe en inglés:</div>' +
        '<input id="psInput" class="s4-input" type="text" placeholder="Escribe en inglés...">' +
        '<div id="psFeedback" class="s4-answer"></div>' +
      '</div>' +
      '<div class="ob-actions">' +
        '<button id="psCheck" class="btn">Revisar</button>' +
        '<button id="psNext" class="btn" disabled>Continuar</button>' +
      '</div>';
  } else if (step.kind === "speak") {
    inner =
      '<p class="ob-sub">Léelo en voz alta.</p>' +
      '<div class="mb-en">' + ssDisplayEn(p.en) + '</div>' +
      '<div class="mb-es">' + escapeHtml(p.es) + '</div>' +
      '<div class="mb-row-actions">' +
        '<button id="psPlay" class="ob-small-btn">🔊 Escuchar modelo</button>' +
        '<button id="psMic" class="btn">🎤 Practicar</button>' +
        '<button id="psOk" class="ob-small-btn">✓ Lo dije bien</button>' +
      '</div>' +
      '<div id="psFeedback" class="mb-feedback"></div>' +
      '<div class="ob-actions"><button id="psNext" class="btn" disabled>Siguiente</button></div>';
  }

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">' + test.id + ' · PRODUCCIÓN</div>' +
      '<h2 class="ob-title">' + kindLabel + '</h2>' +
      '<div class="mb-progress">Paso ' + num + ' de ' + total + '</div>' +
      inner +
    '</div>';

  if (step.kind === "read") {
    document.getElementById("psNext").onclick = function () {
      mbAddScore(test.id, 1);
      renderProdStep(container, test, steps, idx + 1);
    };
  } else if (step.kind === "listen") {
    document.getElementById("psPlay").onclick = function () {
      mbPlayEn(p.en);
    };
    document.getElementById("psNext").onclick = function () {
      mbAddScore(test.id, 1);
      renderProdStep(container, test, steps, idx + 1);
    };
    setTimeout(function () { mbPlayEn(p.en); }, 600);
  } else if (step.kind === "prodES") {
    document.getElementById("psCheck").onclick = function () {
      var inp = document.getElementById("psInput");
      var fb = document.getElementById("psFeedback");
      var ok = esNorm(inp.value) === esNorm(p.es);
      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + p.es;
      if (ok) mbAddScore(test.id, 1);
      document.getElementById("psNext").disabled = false;
    };
    document.getElementById("psNext").onclick = function () {
      renderProdStep(container, test, steps, idx + 1);
    };
  } else if (step.kind === "write") {
    document.getElementById("psCheck").onclick = function () {
      var inp = document.getElementById("psInput");
      var fb = document.getElementById("psFeedback");
      var ok = s4Norm(inp.value) === s4Norm(p.en);
      inp.classList.remove("ok", "bad");
      inp.classList.add(ok ? "ok" : "bad");
      fb.textContent = ok ? "Correcto." : "Correcto: " + p.en;
      if (ok) mbAddScore(test.id, 1);
      document.getElementById("psNext").disabled = false;
    };
    document.getElementById("psNext").onclick = function () {
      renderProdStep(container, test, steps, idx + 1);
    };
  } else if (step.kind === "speak") {
    document.getElementById("psPlay").onclick = function () {
      mbPlayEn(p.en);
    };
    document.getElementById("psMic").onclick = function () {
      if (typeof window.aurixOpenMic === "function") {
        window.aurixOpenMic(p.en);
      } else {
        mbPlayEn(p.en);
      }
    };
    document.getElementById("psOk").onclick = function () {
      mbAddScore(test.id, 1);
      document.getElementById("psFeedback").textContent = "Registrado. Sigue así.";
      document.getElementById("psNext").disabled = false;
    };
    document.getElementById("psNext").onclick = function () {
      renderProdStep(container, test, steps, idx + 1);
    };
    mbPlayEn(p.en);
  }
}

function renderProdComplete(container, test, total) {
  var score = mbScore(test.id);
  var pct = Math.round((score / total) * 100);

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">' + test.id + ' COMPLETADO</div>' +
      '<h2 class="ob-title">Nivel A1 · Producción superada</h2>' +
      '<div class="mp-profile-summary">' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Puntaje</div><div class="mp-profile-value">' + score + '/' + total + '</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Precisión</div><div class="mp-profile-value">' + pct + '%</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Habilidades</div><div class="mp-profile-value">Reading · Listening · Writing · Speaking</div></div>' +
      '</div>' +
      '<p class="ob-sub">Producción oral y escrita del nivel A1 evaluada por párrafos. ' + ssEnQuote("Great job.") + '</p>' +
      '<div class="ob-actions"><button id="pbBack" class="btn">Volver al panel</button></div>' +
    '</div>';

  document.getElementById("pbBack").onclick = function () {
    renderSessionsPanel(container);
  };

  mbSpeak("Examen de producción final completado. Puntaje: " + score + " de " + total + ". " + (pct >= 60 ? "Gran trabajo." : "Buen intento. Puedes repasar los bloques."));
}

/* ---------- TARJETAS DEL PANEL ---------- */
function mbTestCard(t) {
  var status = t.tipo === "prod" ? "Examen Final · Producción"
    : t.tipo === "mid" ? "Examen · Mitad de Nivel"
    : "Examen · Línea Base";
  var badge = String(t.id).replace("TEST-", "").replace("-FINAL-A1", "").replace("-A1", "");
  return '<div class="ss-card available">' +
      '<span class="ss-badge next">' + badge + '</span>' +
      '<div class="ss-title">' + escapeHtml(t.titulo) + '</div>' +
      '<div class="ss-status">' + status + '</div>' +
      '<button id="mbBtn' + t.key + '" class="ob-small-btn">Iniciar</button>' +
    '</div>';
}

function mbPanelCards() {
  var html = "";

  LEVEL_TESTS.forEach(function (t) {
    if (t.posicion === "inicio") html += mbTestCard(t);
  });

  MB_PENDING.forEach(function (p) {
    html +=
      '<div class="ss-card locked">' +
        '<span class="ss-badge locked">' + p.id.replace("N1-", "") + '</span>' +
        '<div class="ss-title">' + escapeHtml(p.titulo) + '</div>' +
        '<div class="ss-status">Próximamente</div>' +
      '</div>';
  });

  LEVEL_TESTS.forEach(function (t) {
    if (t.posicion === "medio") html += mbTestCard(t);
  });

  MASTER_BLOCKS.forEach(function (b) {
    var status = b.tipo === "final" ? "Integración Final · A1" : "Formato Maestro · A1";
    html +=
      '<div class="ss-card available">' +
        '<span class="ss-badge next">' + mbBadgeNum(b) + '</span>' +
        '<div class="ss-title">' + escapeHtml(b.titulo) + '</div>' +
        '<div class="ss-status">' + status + '</div>' +
        '<button id="mbBtn' + b.key + '" class="ob-small-btn">Iniciar</button>' +
      '</div>';
  });

  LEVEL_TESTS.forEach(function (t) {
    if (t.posicion === "final") html += mbTestCard(t);
  });

  return html;
}

function mbBindPanelButtons(container) {
  MASTER_BLOCKS.forEach(function (b) {
    var btn = document.getElementById("mbBtn" + b.key);
    if (btn) {
      btn.onclick = function () {
        renderMasterFlow(container, b);
      };
    }
  });

  LEVEL_TESTS.forEach(function (t) {
    var btn = document.getElementById("mbBtn" + t.key);
    if (btn) {
      btn.onclick = function () {
        renderLevelTest(container, t);
      };
    }
  });
}
