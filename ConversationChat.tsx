import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  sendFreeTalkMessage,
  generateSessionSummary,
  freeTalkStore,
  LEVEL_LABELS,
  FreeTalkLevel,
  FreeTalkSpeed,
  FreeTalkTurn,
  STORAGE_VERSION,
} from "../services/freeTalkService";
import { Mic, MicOff, Send, AlertTriangle, ShieldAlert, Play, RotateCcw, X, Sparkles } from "lucide-react";

type Phase = "onboarding" | "resume" | "conversation" | "finished";

const KICKOFF_PHRASE = "I'm ready to meet my new friend.";

const SUGGESTIONS = [
  "Tell me about your day",
  "What do you enjoy doing?",
  "Let's talk about my family",
  "How was your weekend?",
  "What makes you happy?",
  "Tell me about your job",
  "Let's talk about a movie you love",
  "What do you dream about?",
];

function cleanTTS(text: string): string {
  return text
    .replace(/[*_~`#]/g, "")
    .replace(/\n+/g, ". ")
    .trim();
}

function playTransition() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Ignorar.
  }
}

const MicOrb: React.FC<{
  state: "idle" | "listening" | "processing" | "speaking";
  onClick: () => void;
  title?: string;
}> = ({ state, onClick, title }) => (
  <div className="relative flex items-center justify-center select-none" style={{ width: 190, height: 190 }}>
    <div className="absolute w-[190px] h-[190px] rounded-full bg-gradient-to-r from-[#00f0ff]/30 via-[#4facfe]/25 to-[#7f00ff]/30 blur-3xl" />
    <div
      className={`absolute w-[160px] h-[160px] rounded-full border transition-all duration-500 ${
        state === "listening" ? "border-[#00f0ff]/60 animate-ping opacity-50" : "border-[#00f0ff]/20"
      }`}
    />
    <div className="absolute w-[150px] h-[150px] rounded-full border border-[#7f00ff]/40" />
    <button
      onClick={onClick}
      title={title}
      className="relative w-[130px] h-[130px] rounded-full bg-gradient-to-tr from-[#00f2fe] via-[#4facfe] to-[#7f00ff] p-[2.5px] shadow-[0_0_45px_rgba(0,242,254,0.45)] transition-transform duration-500 group"
    >
      <div className="w-full h-full rounded-full bg-[#0a0c12] flex items-center justify-center overflow-hidden shadow-inner">
        {state === "speaking" ? (
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-5 bg-[#00f0ff] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-8 bg-[#00f0ff] rounded-full animate-bounce" style={{ animationDelay: "120ms" }} />
            <span className="w-1.5 h-10 bg-[#7f00ff] rounded-full animate-bounce" style={{ animationDelay: "240ms" }} />
            <span className="w-1.5 h-6 bg-[#00f0ff] rounded-full animate-bounce" style={{ animationDelay: "360ms" }} />
          </div>
        ) : state === "processing" ? (
          <Sparkles className="w-8 h-8 text-[#00f0ff] animate-spin" />
        ) : (
          <div
            className={`p-3 rounded-full bg-[#0a0c12]/60 border border-[#00f0ff]/40 group-hover:border-[#00f0ff] transition-all ${
              state === "listening" ? "shadow-[0_0_20px_rgba(0,242,254,0.5)]" : ""
            }`}
          >
            {state === "listening" ? (
              <MicOff className="w-7 h-7 text-[#00f0ff] animate-pulse" />
            ) : (
              <Mic className="w-7 h-7 text-[#00f0ff]" />
            )}
          </div>
        )}
      </div>
    </button>
  </div>
);

export const ConversationChat: React.FC<{ onExit?: () => void }> = ({ onExit }) => {
  const [phase, setPhase] = useState<Phase>("onboarding");
  const [obStep, setObStep] = useState(0);
  const [nickname, setNickname] = useState<string>(freeTalkStore.getNickname());
  const [level, setLevel] = useState<FreeTalkLevel>(freeTalkStore.getLevel());
  const [speed, setSpeed] = useState<FreeTalkSpeed>(freeTalkStore.getSpeed());
  const [messages, setMessages] = useState<FreeTalkTurn[]>([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [panicOn, setPanicOn] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [listening, setListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [micStatus, setMicStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [finishing, setFinishing] = useState(false);
  const [summary, setSummary] = useState<{ en: string; es: string }>({ en: "", es: "" });

  const recognitionRef = useRef<any>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesRef = useRef<FreeTalkTurn[]>([]);
  const historyReadyRef = useRef(false);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (phase === "conversation") {
      listEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, phase, isProcessing]);

  /* ---------- TTS ---------- */
  const stopSpeaking = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    speechRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speakNow = useCallback(
    (text: string, lang: string, rate: number) => {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const clean = cleanTTS(text);
      if (!clean) return;
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = lang;
      u.rate = rate;
      u.pitch = 1;
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find((v) => v.lang.startsWith(lang.split("-")[0]));
      if (match) u.voice = match;
      u.onstart = () => setIsSpeaking(true);
      u.onend = () => setIsSpeaking(false);
      u.onerror = () => setIsSpeaking(false);
      speechRef.current = u;
      window.speechSynthesis.speak(u);
    },
    []
  );

  const speakNarrator = useCallback(
    (text: string) => speakNow(text, "es-MX", 0.95),
    [speakNow]
  );

  const speakFriend = useCallback(
    (text: string) => speakNow(text, "en-US", parseFloat(speed)),
    [speakNow, speed]
  );

  /* ---------- Speech Recognition ---------- */
  const ensureRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;
    if (recognitionRef.current) return recognitionRef.current;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      setLiveTranscript(final || interim);
      if (final.trim()) {
        setListening(false);
        sendMessage(final.trim());
      }
    };
    rec.onerror = () => {
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      setLiveTranscript("");
    };
    recognitionRef.current = rec;
    return rec;
  }, []);

  const toggleListening = () => {
    const rec = ensureRecognition();
    if (!rec) {
      alert("Tu navegador no soporta reconocimiento de voz. Puedes escribir tus mensajes.");
      return;
    }
    if (listening) {
      rec.stop();
      setListening(false);
      return;
    }
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  /* ---------- Mic test ---------- */
  const runMicTest = async () => {
    setMicStatus("testing");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicStatus("ok");
      speakNarrator("¡Perfecto! Tu micrófono funciona muy bien.");
    } catch {
      setMicStatus("fail");
      speakNarrator(
        "No detectamos tu micrófono. Para la mejor experiencia te recomendamos contactar a nuestro equipo para resolverlo. Si continúas sin micrófono, la experiencia de hablar se pierde."
      );
    }
  };

  /* ---------- Conversation ---------- */
  const sendMessage = useCallback(
    async (text: string, opts?: { silent?: boolean; asStart?: boolean }) => {
      if (isProcessing) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      const current = messagesRef.current;
      const newMessages: FreeTalkTurn[] = opts?.asStart
        ? current
        : [...current, { role: "user", text: trimmed }];
      if (!opts?.asStart) {
        setMessages(newMessages);
      }
      setInputText("");
      setLiveTranscript("");
      setIsProcessing(true);

      try {
        const history = (opts?.asStart ? [] : current).map((m) => ({
          role: m.role,
          text: m.text,
        }));
        const resume = freeTalkStore.getSummary().es || undefined;
        const data = await sendFreeTalkMessage(trimmed, history, {
          level,
          nickname,
          resume,
        });
        const assistant: FreeTalkTurn = {
          role: "assistant",
          text: data.reply,
          spanish: data.spanish || "",
        };
        const next = [...newMessages, assistant];
        setMessages(next);
        freeTalkStore.saveHistory(next);
        historyReadyRef.current = true;
        setPhase("conversation");
        if (!opts?.silent) {
          speakFriend(data.reply);
        }
      } catch (err: any) {
        const assistant: FreeTalkTurn = {
          role: "assistant",
          text: "Hmm, I didn't catch that. Could you say it again?",
          spanish: "Mmm, no te entendí. ¿Puedes decirlo otra vez?",
        };
        const next = [...newMessages, assistant];
        setMessages(next);
        freeTalkStore.saveHistory(next);
        setPhase("conversation");
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, level, nickname, speakFriend]
  );

  const startFirstMessage = useCallback(async () => {
    playTransition();
    setMessages([]);
    historyReadyRef.current = false;
    setPhase("conversation");
    await sendMessage(KICKOFF_PHRASE, { asStart: true, silent: true });
    const first = messagesRef.current[0];
    if (first) {
      speakFriend(first.text);
    }
  }, [sendMessage, speakFriend]);

  /* ---------- Onboarding / Resume narrator ---------- */
  useEffect(() => {
    if (phase === "onboarding") {
      if (obStep === 0) {
        speakNarrator(
          "¡Hola! Bienvenido a tu espacio de conversación libre en inglés. Aquí practicarás speaking sin gramática, sin reglas y sin calificaciones: solo conversación con un amigo que se adapta a ti. Primero, dime: ¿cómo te llamas?"
        );
      } else if (obStep === 1) {
        speakNarrator(
          "Tienes tres controles. Primero: el regulador de palabras, con tres niveles de respuesta, de cortas a largas, y un modo nativo sin filtro. Segundo: el velocímetro de la voz, lento, medio o normal. Y tercero: el botón de pánico: si no entiendes algo, tócalo y verás la traducción al español. Tú controlas todo."
        );
      } else if (obStep === 2) {
        speakNarrator("Probemos tu micrófono. Toca el botón y di una palabra en voz alta.");
      } else if (obStep === 3) {
        speakNarrator(
          "Ajusta los controles a tu gusto: qué tan cortas quieres mis respuestas, y a qué velocidad quieres escucharme. Puedes cambiarlos cuando quieras."
        );
      } else if (obStep === 4) {
        playTransition();
        speakNarrator(
          "¡Todo listo! Para activar el modo conversación, di la frase de inicio en inglés. Después de eso, todo será en inglés."
        );
      }
    } else if (phase === "resume") {
      const s = freeTalkStore.getSummary();
      const saved = freeTalkStore.loadHistory();
      setMessages(saved);
      historyReadyRef.current = saved.length > 0;
      const name = freeTalkStore.getNickname() || "amigo";
      setNickname(name);
      const resumeText =
        s.es ||
        "La última vez tuvimos una buena conversación en inglés, y me encantó conocerte.";
      setTimeout(() => {
        speakNarrator(
          "¡Hola " +
            name +
            "! Qué gusto verte de nuevo. Recordando nuestra última plática: " +
            cleanTTS(resumeText) +
            " ¿Quieres seguir practicando? Cuando estés listo, di la frase de inicio para activar la conversación en inglés."
        );
      }, 700);
    }
  }, [phase, obStep, speakNarrator]);

  useEffect(() => {
    return () => stopSpeaking();
  }, [stopSpeaking]);

  /* ---------- Finish session ---------- */
  const finishSession = async () => {
    if (finishing) return;
    setFinishing(true);
    stopSpeaking();
    const history = messagesRef.current.map((m) => ({ role: m.role, text: m.text }));
    let s = { en: "", es: "" };
    try {
      const data = await generateSessionSummary(history, nickname);
      s = { en: data.summary_en, es: data.summary_es };
    } catch {
      s = { en: "We had a nice conversation.", es: "Tuvimos una linda conversación." };
    }
    freeTalkStore.setSummary(s.en, s.es);
    freeTalkStore.markCompleted();
    freeTalkStore.saveHistory(messagesRef.current);
    setSummary(s);
    setFinishing(false);
    setPhase("finished");
    setTimeout(() => {
      speakNarrator(
        "Gracias " +
          (nickname || "amigo") +
          ". Me guardé todo lo que platicamos. Nos vemos muy pronto para seguir conversando."
      );
    }, 600);
  };

  const startNewSession = () => {
    freeTalkStore.reset();
    setMessages([]);
    setNickname("");
    setSummary({ en: "", es: "" });
    setLevel("1");
    setSpeed("0.7");
    setMicStatus("idle");
    setObStep(0);
    setPhase("onboarding");
  };

  /* ---------- Reset ---------- */
  const handleResetApp = () => {
    if (!window.confirm("¿Borrar todo el historial y empezar el protocolo desde el inicio?")) {
      return;
    }
    stopSpeaking();
    try {
      recognitionRef.current?.abort?.();
    } catch {
      // Ignorar.
    }
    recognitionRef.current = null;

    freeTalkStore.reset();
    freeTalkStore.setVersion(STORAGE_VERSION);

    setMessages([]);
    messagesRef.current = [];
    setNickname("");
    setSummary({ en: "", es: "" });
    setLevel("1");
    setSpeed("0.7");
    setMicStatus("idle");
    setPanicOn(false);
    setListening(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setLiveTranscript("");
    setInputText("");
    setObStep(0);
    setPhase("onboarding");
  };

  const sayKickoff = () => {
    const rec = ensureRecognition();
    if (!rec) {
      startFirstMessage();
      return;
    }
    toggleListening();
  };

  const kickoff = (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-sm text-[#849495] font-code uppercase tracking-widest">
        Frase de inicio
      </p>
      <p className="text-xl md:text-2xl font-geist font-semibold text-white cyan-glow px-4 py-3 rounded-xl border border-[#00f0ff]/40 bg-[#0e0e0e]/80">
        "{KICKOFF_PHRASE}"
      </p>
      <div className="flex gap-3">
        <button onClick={sayKickoff} className="ft-btn-primary flex items-center gap-2">
          <Mic className="w-4 h-4" /> Decirla
        </button>
        <button onClick={startFirstMessage} className="ft-btn-secondary flex items-center gap-2">
          <Play className="w-4 h-4" /> Enviarla
        </button>
      </div>
    </div>
  );

  const renderOnboarding = () => {
    let content: React.ReactNode = null;
    if (obStep === 0) {
      content = (
        <div className="flex flex-col gap-4 max-w-md w-full">
          <h2 className="text-2xl font-geist font-bold text-white">Bienvenido a tu espacio de conversación</h2>
          <p className="text-sm text-[#849495] leading-relaxed">
            Practica <b className="text-white">speaking libre</b> en inglés: sin gramática, sin reglas, sin
            calificaciones. Un amigo virtual que se adapta a tu nivel y se interesa por lo que te importa.
          </p>
          <label className="text-xs text-[#849495] uppercase tracking-widest">¿Cómo te llamas?</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Tu nombre / nickname"
            className="ft-input"
          />
          <button
            onClick={() => {
              const name = nickname.trim();
              if (!name) {
                speakNarrator("Dime tu nombre para continuar, por favor.");
                return;
              }
              freeTalkStore.setNickname(name);
              setObStep(1);
            }}
            className="ft-btn-primary"
          >
            Continuar
          </button>
        </div>
      );
    }
    if (obStep === 1) {
      content = (
        <div className="flex flex-col gap-4 max-w-md w-full">
          <h2 className="text-xl font-geist font-bold text-white">Tus tres controles</h2>
          <div className="ft-card">
            <p className="text-sm text-white font-semibold">🎚 Regulador de palabras</p>
            <p className="text-xs text-[#849495]">
              Mis respuestas serán cortas (3 a 5 palabras), medianas (4 a 8), largas (5 a 10) o nativas sin filtro.
              Tú eliges.
            </p>
          </div>
          <div className="ft-card">
            <p className="text-sm text-white font-semibold">🎛 Velocímetro de la voz</p>
            <p className="text-xs text-[#849495]">
              Escúchame lento (0.5), medio (0.7) o normal (1.0). Nada de anglosajones a toda velocidad.
            </p>
          </div>
          <div className="ft-card">
            <p className="text-sm text-white font-semibold">🚨 Botón de pánico</p>
            <p className="text-xs text-[#849495]">
              Si no entiendes algo, tócalo y verás al instante la traducción al español. Las traducciones siempre
              están ocultas hasta que tú las pidas.
            </p>
          </div>
          <button onClick={() => setObStep(2)} className="ft-btn-primary">
            Continuar
          </button>
        </div>
      );
    }
    if (obStep === 2) {
      const canContinue = micStatus === "ok" || micStatus === "fail";
      content = (
        <div className="flex flex-col gap-4 max-w-md w-full">
          <h2 className="text-xl font-geist font-bold text-white">Prueba de micrófono</h2>
          <p className="text-sm text-[#849495]">El micrófono es el corazón de esta experiencia. Vamos a probarlo.</p>
          {micStatus === "idle" || micStatus === "testing" ? (
            <button onClick={runMicTest} disabled={micStatus === "testing"} className="ft-btn-primary flex items-center justify-center gap-2">
              {micStatus === "testing" ? <ShieldAlert className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
              {micStatus === "testing" ? "Probando..." : "Probar micrófono"}
            </button>
          ) : micStatus === "ok" ? (
            <div className="ft-card border border-[#00ff88]/40">
              <p className="text-sm text-[#00ff88] font-semibold">✔ Micrófono funcionando</p>
              <p className="text-xs text-[#849495]">Perfecto, estás listo para hablar.</p>
            </div>
          ) : (
            <div className="ft-card border border-amber-400/50">
              <p className="text-sm text-amber-300 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> No detectamos tu micrófono
              </p>
              <p className="text-xs text-[#849495] leading-relaxed">
                Puede ser un permiso o un problema del dispositivo. <b className="text-white">Recomendamos contactar a nuestro equipo</b>{" "}
                para ayudarte a resolverlo: la experiencia de hablar se pierde sin micrófono.
              </p>
            </div>
          )}
          {micStatus === "fail" && (
            <div className="flex gap-3">
              <button onClick={() => setPhase("finished")} className="ft-btn-secondary flex-1">
                Salir
              </button>
              <button onClick={() => setObStep(3)} className="ft-btn-primary flex-1">
                Continuar sin micrófono
              </button>
            </div>
          )}
          {canContinue && (
            <button onClick={() => setObStep(3)} className="ft-btn-primary">
              Continuar
            </button>
          )}
        </div>
      );
    }
    if (obStep === 3) {
      content = (
        <div className="flex flex-col gap-4 max-w-md w-full">
          <h2 className="text-xl font-geist font-bold text-white">Ajusta tus controles</h2>
          <div>
            <p className="text-xs text-[#849495] uppercase tracking-widest mb-2">Longitud de mis respuestas</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LEVEL_LABELS) as FreeTalkLevel[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`ft-pill ${level === l ? "ft-pill-active" : ""}`}
                >
                  {LEVEL_LABELS[l].label}
                  <span className="block text-[10px] opacity-70">{LEVEL_LABELS[l].range}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-[#849495] uppercase tracking-widest mb-2">Velocidad de la voz</p>
            <div className="flex flex-wrap gap-2">
              {(["0.5", "0.7", "1.0"] as FreeTalkSpeed[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`ft-pill ${speed === s ? "ft-pill-active" : ""}`}
                >
                  {s === "0.5" ? "Lento · 0.5" : s === "0.7" ? "Medio · 0.7" : "Normal · 1.0"}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              freeTalkStore.setLevel(level);
              freeTalkStore.setSpeed(speed);
              freeTalkStore.markReady();
              setObStep(4);
            }}
            className="ft-btn-primary"
          >
            Continuar
          </button>
        </div>
      );
    }
    // obStep 4: kickoff
    content = (
      <div className="flex flex-col gap-4 max-w-md w-full">
        <h2 className="text-xl font-geist font-bold text-white">¡Todo listo!</h2>
        <p className="text-sm text-[#849495] leading-relaxed">
          Ya conoces los controles y ajustaste tus parámetros. Desde este momento, la conversación es{" "}
          <b className="text-white">100% en inglés</b>. Di la frase de inicio para activar el modo conversación.
        </p>
        {kickoff}
      </div>
    );
    return (
      <div className="flex flex-col items-center gap-5 w-full">
        <MicOrb
          state={micStatus === "testing" ? "processing" : "idle"}
          onClick={() => {
            if (obStep === 2 && micStatus !== "testing") runMicTest();
            else if (obStep === 4) sayKickoff();
          }}
          title="Toca para hablar"
        />
        {content}
      </div>
    );
  };

  const renderResume = () => {
    const s = freeTalkStore.getSummary();
    return (
      <div className="flex flex-col gap-4 max-w-md w-full">
        <h2 className="text-2xl font-geist font-bold text-white">
          ¡Hola de nuevo, {nickname || "amigo"}! 👋
        </h2>
        <div className="ft-card">
          <p className="text-sm text-white font-semibold mb-1">Nuestra última conversación</p>
          <p className="text-sm text-[#849495] leading-relaxed">{s.es || "Platicamos en inglés y me encantó conocerte."}</p>
        </div>
        <p className="text-sm text-[#849495] leading-relaxed">
          ¿Quieres seguir practicando? Di la frase de inicio para retomar la conversación{" "}
          <b className="text-white">en inglés</b>.
        </p>
        {kickoff}
      </div>
    );
  };

  const renderFinished = () => (
    <div className="flex flex-col gap-4 max-w-md w-full">
      <h2 className="text-2xl font-geist font-bold text-white">Conversación guardada 💾</h2>
      <div className="ft-card">
        <p className="text-xs text-[#849495] uppercase tracking-widest mb-1">Resumen (español)</p>
        <p className="text-sm text-white leading-relaxed">{summary.es}</p>
      </div>
      <div className="ft-card">
        <p className="text-xs text-[#849495] uppercase tracking-widest mb-1">Summary (English)</p>
        <p className="text-sm text-white leading-relaxed">{summary.en}</p>
      </div>
      <p className="text-xs text-[#849495]">
        La próxima vez que vengas, el narrador te leerá este resumen y retomaremos donde quedamos.
      </p>
      <div className="flex gap-3">
        <button onClick={startNewSession} className="ft-btn-primary flex-1 flex items-center justify-center gap-2">
          <RotateCcw className="w-4 h-4" /> Nueva conversación
        </button>
        {onExit && (
          <button onClick={onExit} className="ft-btn-secondary">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  const renderConversation = () => (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto gap-3">
      {showControls && (
        <div className="ft-card !py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#849495] font-code uppercase tracking-widest">CONTROLES</span>
            <button
              onClick={() => setShowControls(false)}
              className="ft-pill !px-2 !py-1 text-[10px]"
              title="Ocultar controles"
            >
              ✕ Cerrar
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.keys(LEVEL_LABELS) as FreeTalkLevel[]).map((l) => (
              <button
                key={l}
                onClick={() => {
                  setLevel(l);
                  freeTalkStore.setLevel(l);
                }}
                className={`ft-pill !px-2 !py-1 text-[10px] ${level === l ? "ft-pill-active" : ""}`}
                title={LEVEL_LABELS[l].range}
              >
                {LEVEL_LABELS[l].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {(["0.5", "0.7", "1.0"] as FreeTalkSpeed[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSpeed(s);
                  freeTalkStore.setSpeed(s);
                }}
                className={`ft-pill !px-2 !py-1 text-[10px] ${speed === s ? "ft-pill-active" : ""}`}
              >
                {s === "0.5" ? "🐢" : s === "0.7" ? "🐇" : "🐆"} {s}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <button
              onClick={() => setPanicOn(!panicOn)}
              className={`ft-pill !px-3 !py-1.5 text-[11px] ${panicOn ? "ft-pill-danger-on" : "ft-pill-danger"}`}
              title="Mostrar traducción al español"
            >
              🚨 {panicOn ? "Traducción visible" : "Pánico"}
            </button>
            <button
              onClick={finishSession}
              disabled={finishing}
              className="ft-pill !px-3 !py-1.5 text-[11px]"
              title="Terminar conversación"
            >
              {finishing ? "Guardando..." : "⏹ Terminar"}
            </button>
          </div>
        </div>
      )}
      <div className="flex justify-center py-1">
        <MicOrb
          state={listening ? "listening" : isProcessing ? "processing" : isSpeaking ? "speaking" : "idle"}
          onClick={toggleListening}
          title={listening ? "Detener micrófono" : "Toca para hablar"}
        />
      </div>
      <div className="flex-1 overflow-y-auto ft-scroll px-1 space-y-3">
        {messages.length === 0 && !isProcessing && (
          <div className="text-center py-6">
            <p className="text-sm text-[#849495] font-code uppercase tracking-widest">Conversando...</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`ft-bubble ${m.role === "user" ? "ft-bubble-user" : "ft-bubble-ai"}`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`text-[10px] font-code uppercase tracking-widest ${m.role === "user" ? "text-[#c1c7cf]" : "text-[#00f0ff]"}`}>
                {m.role === "user" ? (nickname || "Tú") : "Tu amigo"}
              </span>
              <span className="text-[10px] text-[#849495]">{i + 1}</span>
            </div>
            <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{m.text}</p>
            {m.role === "assistant" && panicOn && m.spanish && (
              <p className="mt-1.5 pt-1.5 border-t border-[#00f0ff]/15 text-xs text-[#7df4ff] leading-relaxed">
                🇪🇸 {m.spanish}
              </p>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="ft-bubble ft-bubble-ai">
            <p className="text-xs text-[#00f0ff] font-code animate-pulse">typing...</p>
          </div>
        )}
        {listening && (
          <div className="ft-bubble ft-bubble-user border-[#00f0ff]/60">
            <p className="text-xs text-[#00f0ff] font-code animate-pulse">
              🎤 {liveTranscript || "Escuchando..."}
            </p>
          </div>
        )}
        <div ref={listEndRef} />
      </div>
      <div className="flex gap-2 overflow-x-auto ft-scroll pb-1">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => sendMessage(s)}
            disabled={isProcessing}
            className="ft-chip whitespace-nowrap"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(inputText)}
          placeholder="Escribe en inglés..."
          className="ft-input flex-1"
          disabled={isProcessing}
        />
        <button
          onClick={() => sendMessage(inputText)}
          disabled={!inputText.trim() || isProcessing}
          className="ft-send"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  /* ---------- Boot v3: onboarding limpio o bienvenida de regreso ---------- */
  useEffect(() => {
    // Reset forzado por URL: ?reset=1
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reset") === "1") {
        freeTalkStore.reset();
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch {
      // Ignorar.
    }

    if (freeTalkStore.getVersion() !== STORAGE_VERSION) {
      freeTalkStore.reset();
      freeTalkStore.setVersion(STORAGE_VERSION);
    }

    const savedName = freeTalkStore.getNickname() || "";
    const savedHistory = freeTalkStore.loadHistory();
    const savedSummary = freeTalkStore.getSummary();

    setNickname(savedName);
    setLevel(freeTalkStore.getLevel());
    setSpeed(freeTalkStore.getSpeed());

    const returning =
      savedHistory.length > 0 || Boolean(savedSummary?.es || savedSummary?.en);

    console.log("[ConversationChat] boot v3 → returning:", returning);

    if (returning && savedName) {
      setPhase("resume");
    } else {
      setObStep(0);
      setPhase("onboarding");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerLabel =
    phase === "conversation"
      ? "CONVERSACIÓN LIBRE · INGLÉS"
      : phase === "resume"
      ? "BIENVENIDO DE NUEVO"
      : phase === "finished"
      ? "SESIÓN GUARDADA"
      : "CONVERSACIÓN LIBRE · ESPAÑOL";

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#0a0c12] text-white overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-[#00f0ff]/10 blur-[120px]" />
      <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0a0c12]/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] animate-pulse" />
          <h1 className="font-geist font-bold text-xs md:text-sm tracking-widest uppercase">{headerLabel}</h1>
        </div>
        <div className="flex items-center gap-2">
          {nickname && phase === "conversation" && (
            <span className="text-[11px] text-[#00ff88] font-semibold">{nickname}</span>
          )}
          <button onClick={stopSpeaking} className="ft-pill !px-2 !py-1 text-[10px]" title="Silenciar voz">
            🔇
          </button>
          {phase === "conversation" && (
            <button
              onClick={() => setShowControls((v) => !v)}
              className={`ft-pill !px-2 !py-1 text-[10px] ${showControls ? "ft-pill-active" : ""}`}
              title="Mostrar u ocultar controles (nivel, velocidad, pánico)"
            >
              ⚙ <span className="hidden sm:inline">Controles</span>
            </button>
          )}
          <button
            onClick={handleResetApp}
            className="ft-pill !px-2 !py-1 text-[10px] hover:border-red-500/60 hover:text-red-300"
            title="Limpiar historial y empezar el protocolo desde el inicio"
          >
            🗑 <span className="hidden sm:inline">Reiniciar</span>
          </button>
          {onExit && (
            <button onClick={onExit} className="ft-pill !px-2 !py-1 text-[10px]" title="Salir">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>
      <main className="relative z-10 flex-1 overflow-y-auto ft-scroll px-4 py-5 flex items-start justify-center">
        {phase === "onboarding" && renderOnboarding()}
        {phase === "resume" && renderResume()}
        {phase === "conversation" && (
          <div className="h-full w-full flex flex-col">{renderConversation()}</div>
        )}
        {phase === "finished" && renderFinished()}
      </main>
    </div>
  );
};
