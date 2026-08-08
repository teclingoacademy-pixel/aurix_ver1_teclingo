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

function startExperience() {
  if (window.AurixTTS) {
    window.AurixTTS.init();
    window.AurixTTS.setEnabled(true);
  }

  if (localStorage.getItem("aurix_power_state_v1") === "off") {
    return;
  }

  startSplashSequence();
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

btnContinue.addEventListener("click", async function () {
  activationMessage.textContent = "Personalizando experiencia...";

  if (window.AurixTTS) {
    await window.AurixTTS.speakRichText("Comenzando personalización.", "narrator");
  }

  resumeJourney();
});

function resumeJourney() {
  const container = ensureOnboardingScreen();

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

  if (window.AurixTTS) {
    window.AurixTTS.speakRichText("¿Cómo quieres que te llame tu coach?", "narrator");
  }

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

  if (window.AurixTTS) {
    window.AurixTTS.speakRichText("¿Para qué quieres aprender inglés?", "narrator");
  }
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

  if (window.AurixTTS) {
    window.AurixTTS.speakRichText(
      "Esta comprobación dura 2 minutos. " +
      "No es un examen para aprobar ni reprobar. " +
      "Sirve para ubicarte y que tu coach pueda ayudarte mejor. " +
      "Intenta ser honesto. " +
      "Si respondes muy alto, el contenido puede ser difícil. " +
      "Si respondes muy bajo, puede ser aburrido.",
      "narrator"
    );
  }
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

  if (window.AurixTTS) {
    window.AurixTTS.speakRichText("¿Qué texto entiendes mejor?", "narrator");
  }
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

  if (window.AurixTTS) {
    window.AurixTTS.speakRichText("Ahora califica del 1 al 10.", "narrator");
  }
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

  if (window.AurixTTS) {
    window.AurixTTS.speakRichText("¿Cuánto tiempo realista puedes dedicar por día?", "narrator");
  }
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

  if (window.AurixTTS) {
    window.AurixTTS.speakRichText("Elige la ruta que más te guste.", "narrator");
  }
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

  if (window.AurixTTS) {
    window.AurixTTS.speakRichText(
      "Tu ADN de aprendizaje está listo. " +
      "Meta: " + (appState.goalLabel || "Sin definir") + ". " +
      "Nivel provisional: " + (appState.level || "Sin definir") + ". " +
      "Tiempo diario: " + (appState.minutes ? appState.minutes + " minutos" : "Sin definir") + ". " +
      "Ruta: " + (appState.routeLabel || "Sin definir") + ". " +
      '**"Let us start."**',
      "narrator"
    );
  }
}

/* ============================================
   AURIX FIRST MISSION
============================================ */

function enQuote(text) {
  return '**"' + text + '"**';
}

function renderPlaceholder(container) {
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
      </div>
    </div>
  `;

  document.getElementById("missionRepeatBtn").addEventListener("click", function () {
    renderMissionIntro(container);
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

    btn.addEventListener("click", async function () {
      if (powerAnimating) {
        return;
      }

      powerAnimating = true;

      try {
        if (isPowerOn()) {
          await powerOff();
        } else {
          await powerOn(false);
        }
      } finally {
        powerAnimating = false;
      }
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

    if (!btn || !overlay) {
      return;
    }

    var on = isPowerOn();

    btn.classList.toggle("on", on);
    btn.classList.toggle("off", !on);
    btn.setAttribute("aria-pressed", String(on));

    overlay.classList.toggle("hidden", on);
  }

  async function powerOff() {
    if (!isPowerOn()) {
      return;
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

    updatePowerUI();

    if (window.AurixTTS) {
      window.AurixTTS.cancel();
    }

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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectPowerUI);
  } else {
    injectPowerUI();
  }
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
      '<p class="ob-sub">Puedes decir: ' + displayEn("My name is " + (name || "Alex") + ".") + '</p>' +
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
      '<p class="ob-sub">En inglés puedes decir: ' + displayEn("I am 25 years old.") + '</p>' +
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
      "Perfecto. Puedes decir: " + mpEnQuote("I am " + ageValue + " years old."),
      "narrator"
    );

    renderMissionProfileFrom(container);
  });

  mpSpeak(
    "¿Cuántos años tienes? Puedes decir: " +
    mpEnQuote("I am " + (age || 25) + " years old."),
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
      '<p class="ob-sub">En inglés puedes decir: ' + displayEn("I am from Mexico.") + '</p>' +
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
      "Excelente. Puedes decir: " + mpEnQuote("I am from " + place + "."),
      "narrator"
    );

    renderMissionProfileOccupation(container);
  });

  mpSpeak(
    "¿De dónde eres? Puedes decir: " + mpEnQuote("I am from Mexico."),
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
      '<p class="ob-sub">En inglés puedes decir: ' + displayEn("I work.") + ' o ' + displayEn("I study.") + '</p>' +
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
    mpEnQuote("I work.") +
    " o " +
    mpEnQuote("I study."),
    "narrator"
  );
}

function renderMissionProfileLikes(container) {
  var profile = mpGetProfile();
  var likeThing = profile.likeThing || "";

  var likes = [
    "music",
    "travel",
    "food",
    "sports",
    "movies",
    "technology",
    "learning English"
  ];

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">¿Qué te gusta?</h2>' +
      '<p class="ob-sub">En inglés puedes decir: ' + displayEn("I like music.") + '</p>' +
      '<div class="mp-grid">' +
        likes.map(function (item) {
          return '<button class="ob-chip mp-like-chip" data-like="' + item + '">' + item + '</button>';
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
    "¿Qué te gusta? Puedes decir: " + mpEnQuote("I like music."),
    "narrator"
  );
}

function renderMissionFinalIntro(container) {
  var fullIntro = mpBuildFullIntro();

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">AURIX OS</div>' +
      '<h2 class="ob-title">Tu presentación completa</h2>' +
      '<p class="ob-sub">Escucha cómo quedó tu introducción en inglés.</p>' +
      '<div class="mp-final">' +
        displayEn(fullIntro) +
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
    "Escucha tu presentación completa. " + mpEnQuote(fullIntro),
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
    "Hello.",
    "My name is ...",
    "I am ... years old.",
    "I am from ...",
    "I work.",
    "I study.",
    "I like ...",
    "Nice to meet you."
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
        phrases.map(function (phrase) {
          return '<div class="mp-phrase">' + displayEn(phrase) + '</div>';
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
          '<div class="ss-title">Nivel Cero: Singular y Plural</div>' +
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
        '</div>' +
        '<div class="rod-channel c2">' +
          '<div class="rod-channel-title">2das Personas</div>' +
          '<div class="rod-channel-pronouns">' + ssDisplayEn("You, We, They") + '</div>' +
          '<div class="rod-channel-verb">' + ssDisplayEn("ARE") + '</div>' +
        '</div>' +
        '<div class="rod-channel c3">' +
          '<div class="rod-channel-title">3ras Personas</div>' +
          '<div class="rod-channel-pronouns">' + ssDisplayEn("He, She, It") + '</div>' +
          '<div class="rod-channel-verb">' + ssDisplayEn("IS") + '</div>' +
        '</div>' +
      '</div>' +
      '<p class="ob-sub">Regla de Oro: El verbo cambia según el canal. No hay excepciones en el presente simple.</p>' +
      '<div class="ob-actions"><button id="s3Next" class="btn">Practicar Filtro</button></div>' +
    '</div>';
    
  document.getElementById("s3Next").onclick = function() { renderSession3Exercise(container, 0, 0); };
  ssSpeak("Los tres canales. Primera persona: I, usa AM. Segundas personas: You, We, They, usan ARE. Terceras personas: He, She, It, usan IS.", "narrator");
}

var ROD_EXERCISES = [
  { pronoun: "I", correct: "AM" },
  { pronoun: "She", correct: "IS" },
  { pronoun: "They", correct: "ARE" },
  { pronoun: "We", correct: "ARE" },
  { pronoun: "It", correct: "IS" },
  { pronoun: "You", correct: "ARE" },
  { pronoun: "He", correct: "IS" }
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
      
      var msg = (isCorrect ? "Correcto. " : "Incorrecto. ") + ex.pronoun + " usa " + ex.correct + ".";
      document.getElementById("s3Feedback").textContent = msg;
      await ssSpeak((isCorrect ? "Correcto. " : "Casi. ") + ssEnQuote(ex.pronoun) + " usa " + ssEnQuote(ex.correct), "narrator");
      
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
        '<div class="mp-profile-item"><div class="mp-profile-label">2das Personas</div><div class="mp-profile-value">' + ssDisplayEn("YOU/WE/THEY ARE") + '</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">3ras Personas</div><div class="mp-profile-value">' + ssDisplayEn("HE/SHE/IT IS") + '</div></div>' +
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
   SESION 2: NIVEL CERO (SINGULAR Y PLURAL)
============================================ */

var S2_EXERCISES = [
  { word: "cat", correct: "singular" },
  { word: "cats", correct: "plural" },
  { word: "book", correct: "singular" },
  { word: "books", correct: "plural" },
  { word: "box", correct: "singular" },
  { word: "boxes", correct: "plural" },
  { word: "child", correct: "singular" },
  { word: "children", correct: "plural" }
];

function renderSession2Intro(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">SESIÓN 2</div>' +
      '<h2 class="ob-title">Nivel Cero: Singular y Plural</h2>' +
      '<p class="ob-sub">Antes de los pronombres, el cimiento: saber si hablamos de una cosa o de muchas.</p>' +
      '<p class="ob-sub">Cero relleno. Solo estructura.</p>' +
      '<div class="ob-actions"><button id="s2Start" class="btn">Iniciar Nivel Cero</button></div>' +
    '</div>';

  document.getElementById("s2Start").onclick = function() { renderSession2Theory(container); };
  ssSpeak("Sesión dos. Nivel Cero. Singular y Plural. Antes de los pronombres, el cimiento: saber si hablamos de una cosa o de muchas.", "narrator");
}

function renderSession2Theory(container) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">TEORÍA</div>' +
      '<h2 class="ob-title">Una cosa o muchas</h2>' +
      '<div class="mp-profile-summary">' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Singular</div><div class="mp-profile-value">' + ssDisplayEn("a cat") + ' (un gato)</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Plural</div><div class="mp-profile-value">' + ssDisplayEn("cats") + ' (gatos)</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Regla</div><div class="mp-profile-value">+ s / + es</div></div>' +
      '</div>' +
      '<p class="ob-sub">La <strong>-s</strong> al final indica que hay más de uno. Singular se refiere a una sola cosa; plural a varias.</p>' +
      '<p class="ob-sub">Hay irregulares como ' + ssDisplayEn("child") + ' → ' + ssDisplayEn("children") + ', que se memorizan como palabra nueva.</p>' +
      '<div class="ob-actions"><button id="s2Next" class="btn">Practicar</button></div>' +
    '</div>';

  document.getElementById("s2Next").onclick = function() { renderSession2Exercise(container, 0, 0); };
  ssSpeak("Una cosa o muchas. Singular es una sola cosa. Plural son varias. La marca más común del plural es la letra s. Hay irregulares como child y children.", "narrator");
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
        (isCorrect ? "Correcto. " : "Incorrecto. ") + '"' + ex.word + '" es ' + (ex.correct === "singular" ? "singular" : "plural") + ".";
      await ssSpeak((isCorrect ? "Correcto. " : "Casi. ") + ssEnQuote(ex.word) + " es " + ssEnQuote(ex.correct === "singular" ? "singular" : "plural"), "narrator");

      setTimeout(function() {
        renderSession2Exercise(container, index + 1, score);
      }, 1800);
    };
  });

  ssSpeak("¿Singular o plural? " + ssEnQuote(ex.word), "narrator");
}

function renderSession2Table(container, score) {
  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">CONSOLIDACIÓN</div>' +
      '<h2 class="ob-title">Nivel Cero dominado</h2>' +
      '<p class="ob-sub">Distinguir singular de plural es el cimiento del idioma. Sin esto no hay canales, no hay filtro, no hay verbo.</p>' +
      '<div class="mp-profile-summary">' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Singular</div><div class="mp-profile-value">una cosa</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Plural</div><div class="mp-profile-value">más de una + s</div></div>' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Irregulares</div><div class="mp-profile-value">child → children</div></div>' +
      '</div>' +
      '<div class="ob-actions"><button id="s2Finish" class="btn">Completar Sesión 2</button></div>' +
    '</div>';

  document.getElementById("s2Finish").onclick = function() { renderSession2Complete(container, score); };
  ssSpeak("Consolidación. Singular es una cosa. Plural son varias. La marca más común es la s.", "narrator");
}

function renderSession2Complete(container, score) {
  var sessions = ssGetSessions();
  sessions.session2Completed = true;
  sessions.session2Score = score;
  appState.lastInteraction = "Sesión 2: Nivel Cero Singular/Plural";
  ssSave();

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">SESIÓN 2</div>' +
      '<h2 class="ob-title">Nivel Cero Dominado</h2>' +
      '<p class="ob-sub">Ya distingues una cosa de muchas. Ese es el cimiento estructural.</p>' +
      '<div class="mp-profile-summary">' +
        '<div class="mp-profile-item"><div class="mp-profile-label">Puntaje</div><div class="mp-profile-value">' + score + '/' + S2_EXERCISES.length + '</div></div>' +
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

  container.innerHTML =
    '<div class="dna2-wrap">' +
      '<canvas id="dna2Stars"></canvas>' +
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
      var a = 0.25 + 0.55 * Math.abs(Math.sin(st.tw + t * 0.001 * st.sp));

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

        if (typeof renderOnboardingStep === "function") {
          renderOnboardingStep("welcome");
        }
      }, 700);

      return;
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  if (typeof ssSpeak === "function") {
    ssSpeak("Construyendo tu ADN de aprendizaje.", "narrator");
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
    return "Tu siguiente paso: Sesión 2, Nivel Cero, Singular y Plural.";
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

  var u = new SpeechSynthesisUtterance(text);
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
      preview: "Nivel Cero: uno = singular, varios = plural. House y Houses, car y cars."
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

/* Sin intro para quien regresa: directo al punto */
async function startSplashSequence() {
  if (aurixIsReturningUser()) {
    showScreen(document.getElementById("splash3"));
    return;
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

/* Ruta inicial: quien regresa cae directo en el punto */
(function () {
  if (window.__aurixSkipIntroInjected) {
    return;
  }

  window.__aurixSkipIntroInjected = true;

  setTimeout(function () {
    if (aurixIsReturningUser()) {
      var dotScreen = document.getElementById("splash3");

      if (dotScreen && typeof showScreen === "function") {
        showScreen(dotScreen);
      }
    }
  }, 60);
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
  { v: "work", a: "working" },
  { v: "write", a: "writing" },
  { v: "run", a: "running" },
  { v: "study", a: "studying" },
  { v: "swim", a: "swimming" }
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
        '<div class="s4-es">' + ssDisplayEn(item.v) + ' → ?</div>' +
        '<input id="s4g' + i + '" class="s4-input" type="text" placeholder="Escribe el gerundio...">' +
        '<div id="s4gf' + i + '" class="s4-answer"></div>' +
      '</div>';
  });

  container.innerHTML =
    '<div class="card glass ob-card">' +
      '<div class="badge">MORFOLOGÍA</div>' +
      '<h2 class="ob-title">El Gerundio (-ING)</h2>' +
      '<div class="s4-rule"><b>Regla general:</b> + ING → work → working</div>' +
      '<div class="s4-rule"><b>Termina en -E muda:</b> quita la E + ING → write → writing</div>' +
      '<div class="s4-rule"><b>Monosílabo C-V-C:</b> duplica consonante + ING → run → running</div>' +
      '<div class="s4-rule"><b>Consonante + Y:</b> solo + ING (sin cambios) → study → studying</div>' +
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
      '<div class="s4-rule"><b>3ª persona del SIMPLE:</b><br>• General: + S → He runs.<br>• Termina en O, X, S, SH, Z: + ES → He goes.<br>• Consonante + Y: Y → IES → He tries.<br>• have → has.</div>' +
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
          '<div class="ss-title">Nivel Cero: Singular y Plural</div>' +
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

  /* Mostrar el setup en la pantalla de inicio si falta configuracion */
  setInterval(function () {
    var s3 = document.getElementById("splash3");

    if (s3 && s3.classList.contains("active") && !setupDone()) {
      var o = document.getElementById("micSetupOverlay");

      if (!o || o.classList.contains("hidden")) {
        showOverlay();
      }
    }
  }, 600);
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

  /* 3) Vigilante de voz para puntaje fallback */
  var watch = { raf: 0, voiced: 0, total: 0, active: false };

  function stopVoiceWatch() {
    watch.active = false;
    if (watch.raf) {
      cancelAnimationFrame(watch.raf);
    }
    watch.raf = 0;
  }

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
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
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
    "renderSession2Teach",
    "renderSession2Exercise",
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
    "renderSession4Complete"
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
