/* Galaxia optimizada: más fluida, más grande y más frases */
(() => {
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  const bgCanvas = document.getElementById('bg-canvas');
  const bgCtx = bgCanvas.getContext('2d');
  const planetCanvas = document.getElementById('planet-canvas');
  const pCtx = planetCanvas.getContext('2d');

  function resize() {
    const w = Math.max(360, window.innerWidth);
    const h = Math.max(320, window.innerHeight);
    bgCanvas.style.width = w + 'px';
    bgCanvas.style.height = h + 'px';
    planetCanvas.style.width = w + 'px';
    planetCanvas.style.height = h + 'px';
    bgCanvas.width = Math.round(w * dpr);
    bgCanvas.height = Math.round(h * dpr);
    planetCanvas.width = Math.round(w * dpr);
    planetCanvas.height = Math.round(h * dpr);
    bgCtx.setTransform(dpr,0,0,dpr,0,0);
    pCtx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize', resize);
  resize();

  // Particle system (optimized)
  const area = window.innerWidth * window.innerHeight;
  let PARTICLE_COUNT = Math.min(1400, Math.round(area / 18000)); // more particles but capped
  PARTICLE_COUNT = Math.max(250, PARTICLE_COUNT);
  const particles = new Float32Array(PARTICLE_COUNT * 5); // x,y,r,alpha,vel
  function initParticles(){
    for(let i=0;i<PARTICLE_COUNT;i++){
      const base = i*5;
      particles[base] = Math.random()*window.innerWidth; // x
      particles[base+1] = Math.random()*window.innerHeight; // y
      particles[base+2] = Math.random()*1.8 + 0.6; // r
      particles[base+3] = Math.random()*0.9 + 0.15; // alpha
      particles[base+4] = (Math.random()*0.5 + 0.05) * (Math.random() > 0.6 ? 1.6 : 1.0); // vel factor
    }
  }
  initParticles();

  // Planet config larger
  let planet = {
    x: window.innerWidth * 0.46,
    y: window.innerHeight * 0.34,
    baseRadius: Math.min(window.innerWidth, window.innerHeight) * 0.12,
    radius: Math.min(window.innerWidth, window.innerHeight) * 0.12,
    hue: 270
  };

  // Audio setup (lightweight)
  const audioEl = document.getElementById('bg-audio');
  let audioCtx, analyser, dataArray;
  function setupAudio() {
    try{
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = audioCtx.createMediaElementSource(audioEl);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      src.connect(analyser);
      analyser.connect(audioCtx.destination);
      dataArray = new Uint8Array(analyser.frequencyBinCount);
    }catch(e){
      console.warn('Audio no disponible', e);
    }
  }

  // Efficient draw loop
  let last = performance.now();
  function draw(now){
    const dt = Math.min(40, now - last); // cap delta to avoid big jumps
    last = now;
    const w = bgCanvas.width / dpr, h = bgCanvas.height / dpr;

    // Background gradient
    bgCtx.clearRect(0,0,w,h);
    const g = bgCtx.createLinearGradient(0,0,0,h);
    g.addColorStop(0, 'rgba(18,8,22,0.98)');
    g.addColorStop(1, 'rgba(6,2,12,0.95)');
    bgCtx.fillStyle = g;
    bgCtx.fillRect(0,0,w,h);

    // Soft radial blobs (cheap)
    bgCtx.globalCompositeOperation = 'lighter';
    for(let i=0;i<2;i++){
      const rx = (Math.sin(now/4200 + i*2.3) * 0.5 + 0.5) * w;
      const ry = (Math.cos(now/3300 + i*1.7) * 0.5 + 0.5) * h;
      const rad = Math.max(w,h) * (i===0?0.56:0.38);
      const grd = bgCtx.createRadialGradient(rx, ry, rad*0.02, rx, ry, rad);
      grd.addColorStop(0, 'rgba(140,60,200,0.06)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      bgCtx.fillStyle = grd;
      bgCtx.fillRect(0,0,w,h);
    }
    bgCtx.globalCompositeOperation = 'source-over';

    // Particles (batch drawing)
    bgCtx.save();
    bgCtx.beginPath();
    for(let i=0;i<PARTICLE_COUNT;i++){
      const base = i*5;
      let x = particles[base], y = particles[base+1], r = particles[base+2], a = particles[base+3], v = particles[base+4];
      // motion
      x += v * (0.6 + 0.4*Math.sin(now/7000 + i));
      y += v * 0.4 + 0.06*Math.cos(now/6000 + i);
      // wrap
      if(x > w + 20) x = -20;
      if(y > h + 20) y = -20;
      if(x < -40) x = w + 20;
      if(y < -40) y = h + 20;
      particles[base] = x; particles[base+1] = y;
      // draw small rects for perf and subtle sparkle using fillRect
      bgCtx.globalAlpha = a * 0.95;
      bgCtx.fillStyle = 'white';
      bgCtx.fillRect(x - r*0.5, y - r*0.5, r, r);
    }
    bgCtx.restore();
    bgCtx.globalAlpha = 1;

    // Planet (on separate canvas)
    pCtx.clearRect(0,0,w,h);

    // audioFactor safe
    let audioFactor = 0;
    if(analyser && dataArray){
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for(let i=0;i<dataArray.length;i++) sum += dataArray[i];
      audioFactor = (sum / dataArray.length) / 255;
    }

    // Smoothly approach target radius
    const targetRadius = planet.baseRadius * (1 + audioFactor*0.18 + 0.03*Math.sin(now/600));
    planet.radius += (targetRadius - planet.radius) * 0.12;

    const cx = planet.x, cy = planet.y;

    // halo (soft)
    const halo = pCtx.createRadialGradient(cx, cy, planet.radius*0.4, cx, cy, planet.radius*3.6);
    halo.addColorStop(0, `rgba(180,120,255,${0.18 + audioFactor*0.38})`);
    halo.addColorStop(1, 'rgba(6,3,12,0)');
    pCtx.fillStyle = halo;
    pCtx.beginPath();
    pCtx.arc(cx, cy, planet.radius*3.6, 0, Math.PI*2);
    pCtx.fill();

    // ring (thicker, rotated)
    pCtx.save();
    pCtx.translate(cx, cy);
    pCtx.rotate(Math.sin(now/2400)*0.28);
    pCtx.beginPath();
    pCtx.ellipse(0, 0, planet.radius*2.1, planet.radius*0.45, 0, 0, Math.PI*2);
    pCtx.lineWidth = Math.max(2, planet.radius*0.16);
    pCtx.strokeStyle = 'rgba(190,140,255,0.7)';
    pCtx.stroke();
    pCtx.restore();

    // globe gradient
    const globe = pCtx.createRadialGradient(cx - planet.radius*0.36, cy - planet.radius*0.36, planet.radius*0.08, cx, cy, planet.radius);
    globe.addColorStop(0, `rgba(220,180,255,${0.98 - audioFactor*0.25})`);
    globe.addColorStop(1, 'rgba(60,18,80,1)');
    pCtx.fillStyle = globe;
    pCtx.beginPath();
    pCtx.arc(cx, cy, planet.radius, 0, Math.PI*2);
    pCtx.fill();

    // glossy specular
    const spec = pCtx.createRadialGradient(cx - planet.radius*0.32, cy - planet.radius*0.45, 1, cx - planet.radius*0.32, cy - planet.radius*0.45, planet.radius*0.8);
    spec.addColorStop(0, 'rgba(255,255,255,0.9)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    pCtx.fillStyle = spec;
    pCtx.beginPath();
    pCtx.arc(cx - planet.radius*0.32, cy - planet.radius*0.45, planet.radius*0.8, 0, Math.PI*2);
    pCtx.fill();

    requestAnimationFrame(draw);
  }

  // Phrases handling: GPU transforms + staggered appearance for perf
  const phrasesRoot = document.getElementById('phrases');
  const phraseEls = Array.from(phrasesRoot.querySelectorAll('.phrase'));

  function positionPhrasesInitial(){
    for(const el of phraseEls){
      const x = parseFloat(el.dataset.x) || 50;
      const y = parseFloat(el.dataset.y) || 50;
      el.style.left = x + '%';
      el.style.top = y + '%';
      if(el.textContent.includes('Anhelo')) el.classList.add('highlight');
    }
    // staggered show
    phraseEls.forEach((el, i) => {
      setTimeout(()=> el.classList.add('show'), 300 + i*140);
    });
  }
  positionPhrasesInitial();

  // drift with requestAnimationFrame but only update transform (GPU)
  function drift(now){
    for(const el of phraseEls){
      const seed = parseFloat(el.dataset.x)*13 + parseFloat(el.dataset.y)*7;
      const dx = Math.sin((now/4200) + seed) * (6 + (seed%7));
      const dy = Math.cos((now/3600) + seed*0.92) * (4 + (seed%5));
      el.style.transform = `translate3d(calc(-50% + ${dx}px), calc(-50% + ${dy}px), 0)`;
      // subtle opacity pulse using CSS calc via style
      const op = 0.82 + 0.12*Math.sin((now/1500) + seed);
      el.style.opacity = op;
    }
    requestAnimationFrame(drift);
  }

  // Mouse parallax but throttled via simple smoothing
  let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
  window.addEventListener('mousemove', (e)=>{
    targetX = (e.clientX / window.innerWidth) - 0.5;
    targetY = (e.clientY / window.innerHeight) - 0.5;
  });
  function smoothMouse(){
    mouseX += (targetX - mouseX) * 0.08;
    mouseY += (targetY - mouseY) * 0.08;
    planet.x = window.innerWidth*0.46 + mouseX * 80;
    planet.y = window.innerHeight*0.34 + mouseY * 60;
    // adjust phrases slightly
    for(const el of phraseEls){
      const px = parseFloat(el.dataset.x);
      const py = parseFloat(el.dataset.y);
      const offsetX = mouseX * 6 * (1 + (px-50)/50);
      const offsetY = mouseY * 6 * (1 + (py-50)/60);
      el.style.left = `calc(${px}% + ${offsetX}px)`;
      el.style.top = `calc(${py}% + ${offsetY}px)`;
    }
    requestAnimationFrame(smoothMouse);
  }

  // Play/pause and audio resume gesture
  const playBtn = document.getElementById('play-toggle');
  let playing = false;
  function togglePlay(){
    if(!audioCtx) setupAudio();
    if(!playing){
      audioEl.play();
      playBtn.textContent = '⏸';
      playing = true;
      if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } else {
      audioEl.pause();
      playBtn.textContent = '▶';
      playing = false;
    }
  }
  playBtn.addEventListener('click', togglePlay);

  // Init
  requestAnimationFrame(draw);
  requestAnimationFrame(drift);
  requestAnimationFrame(smoothMouse);

  // auto setup audio on first interaction to satisfy browser policies
  window.addEventListener('pointerdown', function onFirst(){
    setupAudio();
    window.removeEventListener('pointerdown', onFirst);
  });
})();
