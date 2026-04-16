window.IBSS_AUDIO = (function(){
  let enabled = false;
  let ctx = null;

  function unlock(){
    if(!ctx){
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function beep(freq=440){
    if(!enabled || !ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  return {
    toggle(){
      enabled = !enabled;
      unlock();
      return enabled;
    },
    isEnabled(){
      return enabled;
    },
    beep
  }
})();
