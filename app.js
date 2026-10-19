// Initialize Telegram WebApp
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.enableClosingConfirmation();
}

// Elements
const callContainer = document.querySelector('.call-container');
const callTimerEl = document.getElementById('callTimer');
const botStatusEl = document.getElementById('botStatus');
const botMessageEl = document.getElementById('botMessage');
const userMessageEl = document.getElementById('userMessage');
const muteBtn = document.getElementById('muteBtn');
const endCallBtn = document.getElementById('endCallBtn');

// State
let isMuted = false;
let isSpeaking = false;
let isProcessing = false;
let callDuration = 0;
let timerInterval = null;
let recognition = null;
let recognitionActive = false;

// Call Timer
function startTimer() {
  timerInterval = setInterval(() => {
    callDuration++;
    const minutes = String(Math.floor(callDuration / 60)).padStart(2, '0');
    const seconds = String(callDuration % 60).padStart(2, '0');
    callTimerEl.textContent = `${minutes}:${seconds}`;
  }, 1000);
}

// Vietnamese Speech Synthesis
function speakVietnamese(text) {
  if (!('speechSynthesis' in window)) {
    console.warn("Trình duyệt không hỗ trợ SpeechSynthesis");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'vi-VN';
  utterance.rate = 1.05;
  utterance.pitch = 1.0;

  // Find best Vietnamese voice
  const voices = window.speechSynthesis.getVoices();
  const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VIE'));
  if (viVoice) utterance.voice = viVoice;

  utterance.onstart = () => {
    isSpeaking = true;
    setSpeakingState();
    if (recognition && recognitionActive) {
      try { recognition.stop(); } catch (e) {}
    }
  };

  utterance.onend = () => {
    isSpeaking = false;
    isProcessing = false;
    setListeningState();
    if (recognition && !isMuted) {
      try { recognition.start(); } catch (e) {}
    }
  };

  utterance.onerror = () => {
    isSpeaking = false;
    isProcessing = false;
    setListeningState();
  };

  window.speechSynthesis.speak(utterance);
}

// Setup Speech Recognition
function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    botStatusEl.textContent = "Thiết bị không hỗ trợ Web Speech. Vui lòng thử trên Chrome hoặc Safari.";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'vi-VN';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    recognitionActive = true;
    if (!isSpeaking && !isProcessing) setListeningState();
  };

  recognition.onresult = (event) => {
    if (isSpeaking || isProcessing) return;

    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    const currentText = (finalTranscript || interimTranscript).trim();
    if (currentText) {
      userMessageEl.style.display = 'block';
      userMessageEl.textContent = `Thầy: "${currentText}"`;
    }

    if (finalTranscript.trim().length > 1) {
      processUserSpeech(finalTranscript.trim());
    }
  };

  recognition.onerror = (e) => {
    console.warn("Speech recognition error:", e);
    if (e.error === 'not-allowed') {
      botStatusEl.textContent = "Vui lòng cấp quyền Micro trong Telegram!";
    }
  };

  recognition.onend = () => {
    recognitionActive = false;
    if (!isSpeaking && !isProcessing && !isMuted) {
      try { recognition.start(); } catch (e) {}
    }
  };

  try {
    recognition.start();
  } catch (e) {}
}

// Conversation Logic
async function processUserSpeech(text) {
  if (isProcessing) return;
  isProcessing = true;
  setProcessingState();

  // Natural responses for Athena
  let reply = "Dạ Thầy Minh, em đã ghi nhận ý kiến của Thầy và đang tiến hành xử lý ạ.";
  const lower = text.toLowerCase();

  if (lower.includes("chào") || lower.includes("alo") || lower.includes("ơi")) {
    reply = "Dạ, em chào Thầy Minh! Em đang lắng nghe Thầy trao đổi đây ạ.";
  } else if (lower.includes("vi sinh") || lower.includes("dự án") || lower.includes("phản biện")) {
    reply = "Dạ Thầy, phiếu phản biện dự án vi sinh đã được em cập nhật các tiêu chí khoa học, Thầy cần em bổ sung phần nào không ạ?";
  } else if (lower.includes("khỏe không") || lower.includes("thế nào")) {
    reply = "Dạ em luôn sẵn sàng 24/7 để đồng hành cùng Thầy ạ. Công việc hôm nay của Thầy thế nào rồi ạ?";
  } else if (lower.includes("cảm ơn") || lower.includes("tốt lắm")) {
    reply = "Dạ, được hỗ trợ Thầy là niềm vui của em ạ!";
  } else {
    reply = `Dạ Thầy, em hiểu rồi ạ. Về nội dung "${text}", em sẽ đối chiếu ngay với hồ sơ dự án ạ.`;
  }

  botMessageEl.textContent = `"${reply}"`;
  speakVietnamese(reply);
}

// State Handlers
function setListeningState() {
  callContainer.classList.remove('speaking');
  callContainer.classList.add('listening');
  botStatusEl.textContent = "🎙️ Đang lắng nghe Thầy Minh...";
  botStatusEl.style.color = "#38bdf8";
}

function setSpeakingState() {
  callContainer.classList.remove('listening');
  callContainer.classList.add('speaking');
  botStatusEl.textContent = "🤖 Athena đang trả lời...";
  botStatusEl.style.color = "#a855f7";
}

function setProcessingState() {
  callContainer.classList.remove('listening', 'speaking');
  botStatusEl.textContent = "⚡ Athena đang xử lý...";
  botStatusEl.style.color = "#f59e0b";
}

// Mute Button
muteBtn.addEventListener('click', () => {
  isMuted = !isMuted;
  if (isMuted) {
    muteBtn.classList.add('active');
    document.getElementById('micLabel').textContent = "Đã tắt";
    if (recognition) try { recognition.stop(); } catch (e) {}
    botStatusEl.textContent = "Micro đã tắt.";
  } else {
    muteBtn.classList.remove('active');
    document.getElementById('micLabel').textContent = "Micro";
    if (recognition && !isSpeaking) try { recognition.start(); } catch (e) {}
    setListeningState();
  }
});

// End Call Button
endCallBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  window.speechSynthesis.cancel();
  if (recognition) try { recognition.stop(); } catch (e) {}
  botStatusEl.textContent = "Cuộc gọi đã kết thúc.";
  setTimeout(() => {
    if (tg) tg.close();
    else window.close();
  }, 500);
});

// Start
window.addEventListener('DOMContentLoaded', () => {
  startTimer();
  setupSpeechRecognition();
  setTimeout(() => {
    speakVietnamese("Chào Thầy Minh! Em là Athena, em sẵn sàng trao đổi cùng Thầy qua giọng nói rồi ạ.");
  }, 1000);
});
