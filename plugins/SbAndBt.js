(() => {
  'use strict';

  if (window.__HYDROGEN_MAP_SKYBOX_TEXTURES__) return;
  window.__HYDROGEN_MAP_SKYBOX_TEXTURES__ = true;

  const PLUGIN_ID = 'map-skybox-textures';

  function loadEnabled() {
    try {
      const raw = localStorage.getItem('sm_plugin_' + PLUGIN_ID);
      const settings = raw ? JSON.parse(raw) : {};
      return typeof settings.enabled === 'boolean' ? settings.enabled : false;
    } catch (error) {
      console.warn('[MapSkyboxTextures] Could not load settings:', error);
      return false;
    }
  }

  let enabled = loadEnabled();
  let refreshInterval = null;
  let settingsObserver = null;

  function saveEnabled() {
    try {
      localStorage.setItem(
        'sm_plugin_' + PLUGIN_ID,
        JSON.stringify({ enabled })
      );
    } catch (error) {
      console.error('[MapSkyboxTextures] Could not save settings:', error);
    }
  }

  function handleVisibilityChange() {
    if (!document.hidden && enabled) {
      ensureMapPanel();
      ensureSkyPanel();
    }
  }

  function handleWindowFocus() {
    if (enabled) {
      ensureMapPanel();
      ensureSkyPanel();
    }
  }

  // ============================================================
  // SHARED HELPERS
  // ============================================================
  function setInputValue(inp,val){
    if(!inp)return;
    const proto=inp instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
    const setter=Object.getOwnPropertyDescriptor(proto,'value').set;
    setter.call(inp,val);
    inp.dispatchEvent(new Event('input',{bubbles:true}));
    inp.dispatchEvent(new Event('change',{bubbles:true}));
    inp.dispatchEvent(new Event('blur',{bubbles:true}));
  }
  function injectStripStyle(){
    if(document.getElementById('tex-strips-style'))return;
    const st=document.createElement('style');
    st.id='tex-strips-style';
    st.textContent=`#fake-tex-strip::-webkit-scrollbar,#skybox-strip::-webkit-scrollbar{height:6px;background:transparent}#fake-tex-strip::-webkit-scrollbar-track,#skybox-strip::-webkit-scrollbar-track{background:transparent}#fake-tex-strip::-webkit-scrollbar-thumb,#skybox-strip::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:3px}#fake-tex-strip::-webkit-scrollbar-thumb:hover,#skybox-strip::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.3)}#fake-tex-strip,#skybox-strip{scrollbar-color:rgba(255,255,255,0.15) transparent;scrollbar-width:thin;padding-bottom:8px}`;
    document.head.appendChild(st);
  }
  function makeStrip(id){
    const strip=document.createElement('div');
    strip.id=id;
    Object.assign(strip.style,{display:'flex',gap:'8px',margin:'6px 0 6px',padding:'0',background:'transparent',border:'none',overflowX:'auto',overflowY:'hidden',whiteSpace:'nowrap',scrollBehavior:'smooth',WebkitOverflowScrolling:'touch'});
    strip.addEventListener('wheel',e=>{if(e.deltaY!==0){e.preventDefault();strip.scrollLeft+=e.deltaY}},{passive:false});
    return strip;
  }
  function makeSquare(url,title,onClick){
    const s=document.createElement('div');
    s.className='tex-sq';
    s.title=title;
    Object.assign(s.style,{flex:'0 0 auto',width:'72px',height:'72px',cursor:'pointer',backgroundImage:`url("${url}")`,backgroundSize:'cover',backgroundPosition:'center',imageRendering:'pixelated',backgroundColor:'transparent',border:'none',transition:'none'});
    s.addEventListener('click',e=>{e.stopPropagation();onClick()});
    return s;
  }
  function makeSaveButton(wrapId,onSave){
    const wrap=document.createElement('div');
    wrap.id=wrapId;
    Object.assign(wrap.style,{display:'flex',justifyContent:'center',margin:'4px 0 12px'});
    const btn=document.createElement('button');
    btn.id='export-'+wrapId;
    btn.className='button rectangle';
    btn.setAttribute('data-v-b9ada706','');
    btn.setAttribute('data-v-240e6834','');
    btn.setAttribute('data-v-d1073b42','');
    btn.style.cssText='background-color: var(--green-4, #2ecc71); --hover-color: var(--green-5, #27ae60); --top: var(--green-5, #27ae60); --bottom: var(--green-6, #1e8449);';
    btn.innerHTML='<div class="triangle" data-v-b9ada706=""></div><div class="text" data-v-b9ada706=""> Save </div><div class="WWmwwnM" data-v-b9ada706=""><div class="border-top border" data-v-b9ada706=""></div><div class="border-bottom border" data-v-b9ada706=""></div></div>';
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const ok=onSave();
      if(ok===false)return;
      const textEl=btn.querySelector('.text');
      if(textEl)textEl.textContent='Saving...';
      setTimeout(()=>location.reload(),300);
    });
    wrap.appendChild(btn);
    return wrap;
  }

  // ============================================================
  // STATE (persists across re-injections)
  // ============================================================
  const state={
    map:{url:'',built:false,strip:null,saveWrap:null},
    sky:{urls:{},isPack:false,built:false,strip:null,saveWrap:null,box:null}
  };

  // ============================================================
  // 1) MAP TEXTURE PANEL
  // ============================================================
  const MAP_API='https://raw.githubusercontent.com/imnotkoolkid/KCH/refs/heads/main/data/texture.json';
  const MAP_LS_KEY='SETTINGS___SETTING/BLOCKS___SETTING/TEXTURE_URL___SETTING';

  function findMapInput(){
    return document.querySelector('label.wrapper-input.keybind-input input.input')||
           document.querySelector('label.wrapper-input.keybind-input input')||
           document.querySelector('input[placeholder="Paste image url..."]')||null;
  }
  function applyMapTexture(u){
    const c=document.getElementById('map-texture-canvas');
    if(c){
      const img=new Image();img.crossOrigin='Anonymous';
      img.onload=()=>{const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height)};
      img.onerror=()=>console.warn('failed to load',u);
      img.src=u;
    }
    state.map.url=u;
    setInputValue(findMapInput(),u);
  }
  function buildMapStrip(data){
    if(!state.map.strip)return;
    state.map.strip.innerHTML='';
    data.forEach(t=>{
      const u=(t.textureImage||'').replace(/^http:\/\//i,'https://');
      if(!u)return;
      state.map.strip.appendChild(makeSquare(u,`${t.owner||'Unknown'} · ${(t.tags||[]).join(', ')}`,()=>applyMapTexture(u)));
    });
    state.map.built=true;
  }
  function ensureMapPanel(){
    const c=document.getElementById('map-texture-canvas');
    if(!c)return;
    if(!document.getElementById('fake-tex-strip')){
      if(!state.map.strip)state.map.strip=makeStrip('fake-tex-strip');
      state.map.strip.innerHTML=state.map.strip.innerHTML;
      c.insertAdjacentElement('afterend',state.map.strip);
    }
    if(!document.getElementById('map-save-wrap')){
      if(!state.map.saveWrap){
        state.map.saveWrap=makeSaveButton('map-save-wrap',()=>{
          if(!state.map.url){console.warn('No texture selected yet');return false}
          try{localStorage.setItem(MAP_LS_KEY,JSON.stringify(state.map.url));console.log('✅ saved map texture:',MAP_LS_KEY,'=',JSON.stringify(state.map.url))}
          catch(err){console.warn('save failed:',err)}
          return true;
        });
      }
      state.map.strip.insertAdjacentElement('afterend',state.map.saveWrap);
    }
    if(!state.map.built){
      const strip = state.map.strip;
      fetch(MAP_API).then(r=>r.json()).then(d=>{
        if (!enabled || state.map.strip !== strip) return;
        console.log(`✅ loaded ${d.length} map textures`);
        buildMapStrip(d);
      }).catch(err=>console.warn('map API failed:',err));
    }
  }

  // ============================================================
  // 2) SKYBOX PANEL
  // ============================================================
  const SKY_API='https://raw.githubusercontent.com/imnotkoolkid/KCH/refs/heads/main/data/skyboxes.json';
  const SKY_LS_PREFIX='SETTINGS___SETTING/SKYBOX___SETTING/TEXTURE_IMG';

  // MATCHES YOUR SCREEN ORDER: Front, Back, Up, Down, Left, Right
  const FACE_ORDER=['front','back','up','down','left','right'];

  function findSkyFaceInput(box,face){
    const labels=[...box.querySelectorAll('.element .label')];
    const target=labels.find(l=>l.textContent.trim().toLowerCase()===face);
    if(!target)return null;
    const row=target.closest('.element');
    return row?.querySelector('label.wrapper-input.keybind-input input.input')||null;
  }
  function drawSkyFace(box,face,url){
    const u=(url||'').replace(/^http:\/\//i,'https://');
    if(!u)return;

    // Try to match standard IDs first
    const idMap={
      'WWnwmwN-canvas-up':'up',
      'WWnwmwN-canvas-down':'down',
      'WWnwmwN-canvas-back':'back',
      'WWnwmwN-canvas-front':'front',
      'WWnwmwN-canvas-mwNMnWW':'front',
      'WWnwmwN-canvas-left':'left',
      'WWnwmwN-canvas-right':'right'
    };

    let drawn=false;
    Object.entries(idMap).forEach(([id,f])=>{
      if(f!==face)return;
      const cv=document.getElementById(id);
      if(!cv)return;
      drawn=true;
      const img=new Image();img.crossOrigin='Anonymous';
      img.onload=()=>{const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);ctx.drawImage(img,0,0,cv.width,cv.height)};
      img.onerror=()=>console.warn('failed to load',face,u);
      img.src=u;
    });

    // Fallback: search by ID string containing face name
    if(!drawn) {
      box.querySelectorAll('canvas').forEach(cv=>{
        if(!cv.id.toLowerCase().includes(face))return;
        if(cv.dataset.skyboxDrawn)return;
        const img=new Image();img.crossOrigin='Anonymous';
        img.onload=()=>{const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);ctx.drawImage(img,0,0,cv.width,cv.height);cv.dataset.skyboxDrawn='1'};
        img.src=u;
      });
    }
  }
  function applySkyFace(box,face,url){
    const u=(url||'').replace(/^http:\/\//i,'https://');
    if(!u)return;
    state.sky.urls[face]=u;
    setInputValue(findSkyFaceInput(box,face),u);
    box.querySelectorAll('canvas').forEach(cv=>{if(cv.id.toLowerCase().includes(face))delete cv.dataset.skyboxDrawn});
    drawSkyFace(box,face,u);
  }
  function selectSkyItem(box,item){
    state.sky.isPack=!!item.isPack;
    state.sky.urls={};
    if(item.isPack){
      const imgMap={};
      (item.images||[]).forEach(({name,url})=>{imgMap[name]=url});
      FACE_ORDER.forEach(face=>{if(imgMap[face])applySkyFace(box,face,imgMap[face])});
    } else {
      const u=(item.url||'').replace(/^http:\/\//i,'https://');
      FACE_ORDER.forEach(face=>applySkyFace(box,face,u));
    }
  }
  function buildSkyStrip(box,data){
    if(!state.sky.strip)return;
    state.sky.strip.innerHTML='';
    const list=data.skyboxes||data;
    list.forEach(item=>{
      const thumb=item.isPack
        ? (item.images?.find(i=>i.name==='front')?.url||item.images?.[0]?.url||'')
        : item.url;
      if(!thumb)return;
      const u=thumb.replace(/^http:\/\//i,'https://');
      state.sky.strip.appendChild(makeSquare(u,`${item.name||item.id||'Skybox'}${item.owner?' · '+item.owner:''}${item.isPack?' (pack)':''}`,()=>selectSkyItem(box,item)));
    });
    state.sky.built=true;
  }
  function ensureSkyPanel(){
    const headerEl=[...document.querySelectorAll('.header')].find(h=>h.textContent.trim().toLowerCase().startsWith('skybox'));
    if(!headerEl)return;
    const box=headerEl.closest('.box');
    if(!box)return;
    state.sky.box=box;
    if(!document.getElementById('skybox-strip')){
      if(!state.sky.strip)state.sky.strip=makeStrip('skybox-strip');
      const firstFaceRow=[...box.querySelectorAll('.element')].find(el=>{
        const l=el.querySelector('.label');
        return l&&FACE_ORDER.includes(l.textContent.trim().toLowerCase());
      });
      if(firstFaceRow)firstFaceRow.parentNode.insertBefore(state.sky.strip,firstFaceRow);
      else box.appendChild(state.sky.strip);
    }
    if(!document.getElementById('sky-save-wrap')){
      if(!state.sky.saveWrap){
        state.sky.saveWrap=makeSaveButton('sky-save-wrap',()=>{
          if(!Object.keys(state.sky.urls).length){console.warn('No skybox selected yet');return false}
          try{
            FACE_ORDER.forEach((face,idx)=>{
              const key=SKY_LS_PREFIX+(idx+1)+'___SETTING';
              const val=state.sky.urls[face]||'';
              if(val)localStorage.setItem(key,JSON.stringify(val));
            });
            console.log('✅ saved skybox:',FACE_ORDER.map((f,i)=>({key:SKY_LS_PREFIX+(i+1)+'___SETTING',face:f,url:state.sky.urls[f]})));
          }catch(err){console.warn('sky save failed:',err)}
          return true;
        });
      }
      state.sky.strip.insertAdjacentElement('afterend',state.sky.saveWrap);
    }
    if(!state.sky.built){
      const strip = state.sky.strip;
      fetch(SKY_API).then(r=>r.json()).then(d=>{
        if (!enabled || state.sky.strip !== strip) return;
        console.log('✅ loaded skyboxes');
        buildSkyStrip(box,d);
      }).catch(err=>console.warn('sky API failed:',err));
    }
  }

  // ============================================================
  // BOOT + PERSISTENCE
  // ============================================================
  function startFeature() {
    if (!enabled || refreshInterval !== null) return;

    injectStripStyle();
    ensureMapPanel();
    ensureSkyPanel();

    refreshInterval = setInterval(() => {
      if (!enabled) return;
      injectStripStyle();
      ensureMapPanel();
      ensureSkyPanel();
    }, 250);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    console.log('✅ map texture + skybox strips injected (persistent, polling + visibility)');
  }

  function stopFeature() {
    if (refreshInterval !== null) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }

    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleWindowFocus);

    document.getElementById('fake-tex-strip')?.remove();
    document.getElementById('map-save-wrap')?.remove();
    document.getElementById('skybox-strip')?.remove();
    document.getElementById('sky-save-wrap')?.remove();
    document.getElementById('tex-strips-style')?.remove();

    state.map = {url:'',built:false,strip:null,saveWrap:null};
    state.sky = {urls:{},isPack:false,built:false,strip:null,saveWrap:null,box:null};
  }

  function el(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
  }

  function makeToggleControl() {
    const root = el('div', 'sm-plugin-toggle-control');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'sm-plugin-checkbox';
    checkbox.checked = enabled;

    const segment = el('div', 'sm-plugin-seg');
    const pill = el('span', 'sm-plugin-seg-pill');

    const offButton = el(
      'button',
      'sm-plugin-seg-btn sm-plugin-seg-off',
      'Disabled'
    );
    offButton.type = 'button';

    const onButton = el(
      'button',
      'sm-plugin-seg-btn sm-plugin-seg-on',
      'Enabled'
    );
    onButton.type = 'button';

    function sync() {
      checkbox.checked = enabled;
      offButton.classList.toggle('sm-selected', !enabled);
      onButton.classList.toggle('sm-selected', enabled);
      offButton.setAttribute('aria-pressed', String(!enabled));
      onButton.setAttribute('aria-pressed', String(enabled));
    }

    function setState(value) {
      if (enabled === value) return;

      segment.classList.remove('sm-plugin-seg-go');
      void segment.offsetWidth;
      segment.classList.add('sm-plugin-seg-go');

      enabled = value;
      saveEnabled();

      if (enabled) {
        startFeature();
      } else {
        stopFeature();
      }

      sync();
    }

    offButton.addEventListener('click', () => setState(false));
    onButton.addEventListener('click', () => setState(true));
    checkbox.addEventListener('change', () => setState(checkbox.checked));

    segment.append(pill, offButton, onButton);
    root.append(checkbox, segment);
    sync();

    return root;
  }

  function createSettings() {
    const card = el('div', 'sm-card');
    card.dataset.hydrogenPlugin = PLUGIN_ID;

    const header = el('div', 'sm-card-head');
    header.classList.add('sm-plugin-header');

    const heading = el('div', 'sm-plugin-heading');
    heading.append(
      el('div', 'sm-card-title', 'Map & Skybox Textures'),
      el(
        'div',
        'sm-card-desc',
        'Browse and apply custom map textures and skyboxes.'
      )
    );

    header.append(heading, makeToggleControl());
    card.appendChild(header);

    return card;
  }

  function addSettings() {
    const pluginsTab = document.getElementById('tab-plugins');

    if (!pluginsTab) return false;

    if (
      pluginsTab.querySelector(
        '[data-hydrogen-plugin="' + PLUGIN_ID + '"]'
      )
    ) {
      return true;
    }

    pluginsTab.appendChild(createSettings());
    return true;
  }

  function start() {
    addSettings();

    if (!document.getElementById('tab-plugins')) {
      settingsObserver = new MutationObserver(() => {
        if (addSettings()) {
          settingsObserver.disconnect();
          settingsObserver = null;
        }
      });

      settingsObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }

    if (enabled) startFeature();
  }

  if (document.body) {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  }
})();