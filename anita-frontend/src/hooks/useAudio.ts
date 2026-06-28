import { useRef, useState } from 'react';

// ============================================================
// 音频钩子返回类型
// ============================================================
export type UseAudioReturn = {
  audioEnabled: boolean;        // 音频系统是否已初始化
  initAudio: () => void;        // 初始化音频上下文（由用户交互触发）
  playTypingSound: () => void;  // 打字机音效：方波短促哔声
  playAlarmSound: () => void;   // 警报音效：锯齿波频率扫描
};

// ============================================================
// Hook 主体
// ============================================================
export function useAudio(): UseAudioReturn {

  // --- 状态与引用 ---
  const [audioEnabled, setAudioEnabled] = useState(false);
  // audioEnabled 用 useState：需要触发重渲染（按钮文字/颜色变化）
  // audioCtxRef 用 useRef：AudioContext 是浏览器原生对象，变化不需要重渲染
  const audioCtxRef = useRef<AudioContext | null>(null);

  // --- 初始化音频上下文 ---
  // 由用户交互（点击/发送消息）触发，浏览器要求必须在用户手势中创建 AudioContext
  // 生成 50Hz 机房底噪（正弦波极低频嗡嗡声，永久播放）
  const initAudio = () => {
    // 已创建过则跳过，避免重复创建
    if (audioCtxRef.current) {
      // 如果被浏览器挂起（长时间无交互），强制唤醒
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      return;
    }

    // webkitAudioContext 为 Safari 兼容写法
    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

    // 创建 50Hz 正弦波底噪，音量极低（0.05），模拟机房/设施电气噪音
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    osc.type = 'sine';
    osc.frequency.value = 50;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    osc.start(); // 永不停止，直到页面关闭

    setAudioEnabled(true);

    // 如果 AudioContext 创建后立即被挂起，强制恢复
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  // --- 打字机音效 ---
  // 方波（square），600~1000Hz 随机频率，30ms 指数衰减
  // 信号链路：OscillatorNode → GainNode → 扬声器
  // 每收到 AI 的一个字触发一次，模拟终端字符输出的电子哔声
  const playTypingSound = () => {
    if (!audioCtxRef.current) return;
    // 恢复可能被挂起的音频上下文
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();

    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();

    // 方波：棱角分明，谐波丰富，像电子蜂鸣器
    osc.type = 'square';
    // 频率随机 600~1000Hz，避免每次音高相同产生单调感
    osc.frequency.value = 600 + Math.random() * 400;

    // 音量包络：瞬间达到 0.02，30ms 内指数衰减到 0.001（接近静音）
    // exponentialRamp 比 linearRamp 更自然，模拟真实声音的衰减曲线
    gain.gain.setValueAtTime(0.02, audioCtxRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.03);

    // 连接节点：振荡器 → 增益 → 扬声器
    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    osc.start();
    osc.stop(audioCtxRef.current.currentTime + 0.03);
    // stop 后振荡器自动断开连接并被垃圾回收，不会内存泄漏
  };

  // --- 警报音效 ---
  // 锯齿波（sawtooth），400→800→400Hz 频率扫描，0.8s 衰减
  // 受击（扣血/掉理智/新威胁）时播放，比打字声更响更持久
  const playAlarmSound = () => {
    if (!audioCtxRef.current) return;
    // 恢复可能被挂起的音频上下文
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();

    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();

    // 锯齿波：比方波更尖锐刺耳，含所有谐波，适合危险警报
    osc.type = 'sawtooth';

    // 频率包络：先升后降，模拟救护车警报 "呜↗哇↘" 效果
    // linearRamp 匀速变化，听起来机械、紧迫
    osc.frequency.setValueAtTime(400, audioCtxRef.current.currentTime);       // t=0:   400Hz
    osc.frequency.linearRampToValueAtTime(800, audioCtxRef.current.currentTime + 0.2); // t=0.2: 升到 800Hz
    osc.frequency.linearRampToValueAtTime(400, audioCtxRef.current.currentTime + 0.4); // t=0.4: 降回 400Hz

    // 音量包络：0.2 起始（是打字声的 10 倍），0.8s 指数衰减到静音
    // 频率在 0.4s 完成扫描，但声音到 0.8s 才消失 → 余音逐渐消散
    gain.gain.setValueAtTime(0.2, audioCtxRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    osc.start();
    osc.stop(audioCtxRef.current.currentTime + 0.8);
  };

  return {
    audioEnabled,
    initAudio,
    playTypingSound,
    playAlarmSound
  };
}
