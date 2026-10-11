/*
 * DVAGO VAD helper — uses @ricky0123/vad-web (Silero ONNX) loaded from CDN on demand.
 * Falls back silently if the library can't be loaded.
 */
(function (root) {
  const CDN_VAD = 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.17/dist/bundle.min.js';
  const CDN_ORT = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/';
  let loaded = null;

  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[data-vad="${src}"]`)) return res();
      const s = document.createElement('script'); s.src = src; s.dataset.vad = src;
      s.onload = res; s.onerror = () => rej(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  async function init() {
    if (loaded) return loaded;
    if (!root.AudioContext && !root.webkitAudioContext) throw new Error('AudioContext not available');
    try {
      await loadScript(CDN_VAD);
      // vad-web sets window.vad
      if (root.vad && root.vad.utils && typeof root.vad.MicVAD === 'function') {
        loaded = root.vad; return loaded;
      }
    } catch (e) {}
    throw new Error('VAD library could not load');
  }

  /**
   * Start a VAD session on the microphone.
   * @param {Object} opts
   * @param {Function} opts.onSpeechStart
   * @param {Function} opts.onSpeechEnd  called when ~1.5s silence after speech
   * @param {Function} opts.onError
   * @returns {Promise<{destroy:Function, pause:Function, start:Function}>}
   */
  async function startMic(opts = {}) {
    const vad = await init();
    const inst = await vad.MicVAD.new({
      // Models/wasm files are also hosted on jsdelivr via the same CDN
      baseAssetPath: 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.17/dist/',
      onnxWASMBasePath: CDN_ORT,
      positiveSpeechThreshold: 0.6,
      negativeSpeechThreshold: 0.4,
      preSpeechPadFrames: 2,
      redemptionFrames: 24, // ~1.5s silence after speech
      minSpeechFrames: 4,
      submitUserSpeechOnPause: false,
      onSpeechStart: () => { try { opts.onSpeechStart && opts.onSpeechStart(); } catch (e) {} },
      onSpeechEnd: (audio) => { try { opts.onSpeechEnd && opts.onSpeechEnd(audio); } catch (e) {} },
      onVADMisfire: () => {},
      onFrameProcessed: opts.onFrame ? ({ isSpeech, notSpeech }) => opts.onFrame(isSpeech) : undefined
    });
    inst.start();
    return {
      pause() { try { inst.pause(); } catch (e) {} },
      resume() { try { inst.start(); } catch (e) {} },
      destroy() { try { inst.destroy ? inst.destroy() : inst.pause(); } catch (e) {} }
    };
  }

  root.VAD = { init, startMic, isSupported: () => !!(root.AudioContext || root.webkitAudioContext) };
})(window);
