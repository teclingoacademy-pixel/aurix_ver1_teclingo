window.AurixVoice = (function () {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  let current = null;

  function start(options) {
    if (!SpeechRecognition) return false;

    if (current) {
      stop();
    }

    const recognition = new SpeechRecognition();
    current = recognition;

    recognition.lang = options.lang || "en-US";
    recognition.interimResults = options.interimResults !== false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = function (event) {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (options.onResult) {
        options.onResult({ final: final, interim: interim });
      }
    };

    recognition.onend = function () {
      current = null;

      if (options.onEnd) {
        options.onEnd();
      }
    };

    recognition.onerror = function (event) {
      if (options.onError) {
        options.onError(event.error || "error");
      }
    };

    try {
      recognition.start();
    } catch (error) {
      current = null;

      if (options.onError) {
        options.onError("not-allowed");
      }

      return false;
    }

    return true;
  }

  function stop() {
    if (current) {
      current.stop();
      current = null;
    }
  }

  return {
    supported: Boolean(SpeechRecognition),
    start: start,
    stop: stop,
    isListening: function () {
      return Boolean(current);
    }
  };
})();
