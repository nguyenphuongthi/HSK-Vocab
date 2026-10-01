// Phát âm bằng giọng đọc tiếng Trung có sẵn của trình duyệt (nếu máy có).
import { useEffect, useState } from 'react';

function zhVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'zh-CN') ||
    voices.find((v) => /^zh[-_]/i.test(v.lang) && !/HK|TW/i.test(v.lang)) ||
    voices.find((v) => /^zh/i.test(v.lang)) ||
    null
  );
}

export function useCanSpeak() {
  const [ok, setOk] = useState(() => !!zhVoice());
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const update = () => setOk(!!zhVoice());
    update();
    synth.addEventListener('voiceschanged', update);
    return () => synth.removeEventListener('voiceschanged', update);
  }, []);
  return ok;
}

export function speak(text) {
  const synth = window.speechSynthesis;
  const voice = zhVoice();
  if (!synth || !voice) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/……/g, '，'));
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 1;
  synth.speak(u);
}
