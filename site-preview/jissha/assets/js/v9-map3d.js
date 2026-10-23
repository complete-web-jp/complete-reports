/* v9：#network の立体地図（R08_2026_10_13）
   ・#network が画面に近づいたら three.min.js と地図データを読み込み、SVG の模式図と入れ替える。
   ・WebGL が使えない／読み込みに失敗したときは何もしない＝従来の SVG がそのまま出る。
   ・動き3つ: [B] 読み進めると視点が拠点を巡る ／ [C] 時刻で光が変わる ／ [D] 雪（12〜2月は最初から降る）
   ・main.js / motion.js / v8-motion.js は触らない。 */
(function(){
"use strict";
var sec=document.getElementById("network");if(!sec)return;
var host=sec.querySelector(".net-map"),grid=sec.querySelector(".net-grid");if(!host||!grid)return;
var base=((document.currentScript&&document.currentScript.src)||"").replace(/[^\/]*$/,"");
var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
try{var probe=document.createElement("canvas");if(!(probe.getContext("webgl")||probe.getContext("experimental-webgl")))return;}catch(e){return;}

function load(src,cb){var s=document.createElement("script");s.src=src;s.async=true;s.onload=function(){cb(true);};s.onerror=function(){cb(false);};document.head.appendChild(s);}
var started=false;
function start(){
  if(started)return;started=true;
  var need=2,ok=true;function done(r){ok=ok&&r;if(--need===0&&ok&&window.THREE&&window.COMPLETE_MAPDATA){try{build(window.THREE,window.COMPLETE_MAPDATA);}catch(e){sec.classList.remove("has-3d");if(window.console)console.warn("v9-map3d",e);}}}
  if(window.THREE)done(true);else load(base+"vendor/three.min.js",done);
  if(window.COMPLETE_MAPDATA)done(true);else load(base+"../data/sapporo-mapdata.js",done);
}
if(window.IntersectionObserver){var io=new IntersectionObserver(function(en){if(en[0].isIntersecting){io.disconnect();start();}},{rootMargin:"700px 0px"});io.observe(sec);}else{start();}

function build(T,D){
  var wrap=document.createElement("div");wrap.className="net-3d";
  wrap.innerHTML='<div class="n3-stage" aria-label="札幌圏の立体地図。左右にドラッグで回転します。"><canvas></canvas><div class="n3-labels"></div>'+
    '<div class="n3-clock" aria-hidden="true">10:00</div>'+
    '<div class="n3-credit">地図データ：国土地理院（地理院タイル・ベクトルタイル提供実験）を加工して作成</div></div>'+
    '<div class="n3-ctl"><button type="button" class="n3-btn n3-play" aria-pressed="false">一日を再生</button>'+
    '<input type="range" class="n3-time" min="4" max="22" step="0.25" value="10" aria-label="時刻">'+
    '<button type="button" class="n3-btn n3-snow" aria-pressed="false">雪</button></div>';
  host.appendChild(wrap);
  var stage=wrap.querySelector(".n3-stage"),canvas=wrap.querySelector("canvas"),labelsEl=wrap.querySelector(".n3-labels"),clockEl=wrap.querySelector(".n3-clock");
  var playEl=wrap.querySelector(".n3-play"),timeEl=wrap.querySelector(".n3-time"),snowEl=wrap.querySelector(".n3-snow");
  var renderer=new T.WebGLRenderer({canvas:canvas,antialias:true,alpha:true,powerPreference:"high-performance"});
  /* 描画できなくなった端末（GPUの都合で WebGL が落ちた等）は従来の SVG へ戻す */
  var dead=false;
  function fallback(why){if(dead)return;dead=true;sec.classList.remove("has-3d");wrap.remove();var st=sec.querySelector(".n3-steps");if(st)st.remove();if(window.console)console.warn("v9-map3d fallback:",why);}
  canvas.addEventListener("webglcontextlost",function(e){e.preventDefault();fallback("context lost");},false);
  var gl=renderer.getContext();if(!gl||gl.isContextLost()){fallback("no context");return;}
  /* 診断（URL に #v9debug を付けたときだけ。舞台の上に WebGL の状態と console の警告を出す） */
  var dbg=null;
  if(/v9debug/.test(location.hash)){
    dbg=document.createElement("pre");dbg.style.cssText="position:absolute;left:8px;top:8px;right:8px;max-height:70%;overflow:auto;margin:0;padding:8px;font:11px/1.4 monospace;background:rgba(0,0,0,.72);color:#9f9;z-index:9;white-space:pre-wrap;pointer-events:auto";stage.appendChild(dbg);
    var lines=[];function log(x){lines.push(String(x));dbg.textContent=lines.join("\n");}
    try{var ri=gl.getExtension("WEBGL_debug_renderer_info");log("ua: "+navigator.userAgent);log("gl: "+gl.getParameter(gl.VERSION)+" / "+(ri?gl.getParameter(ri.UNMASKED_VENDOR_WEBGL)+" / "+gl.getParameter(ri.UNMASKED_RENDERER_WEBGL):"(no debug info)"));
      log("dpr "+window.devicePixelRatio+" maxTex "+gl.getParameter(gl.MAX_TEXTURE_SIZE)+" maxRB "+gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)+" aniso "+renderer.capabilities.getMaxAnisotropy()+" webgl2 "+renderer.capabilities.isWebGL2);}catch(e){log("info err "+e.message);}
    ["warn","error"].forEach(function(k){var o=console[k];console[k]=function(){try{log(k+": "+Array.prototype.map.call(arguments,function(a){return typeof a==="string"?a:JSON.stringify(a);}).join(" ").slice(0,600));}catch(e){}return o.apply(console,arguments);};});
    window.addEventListener("error",function(e){log("window.error: "+e.message);});
    setTimeout(function(){try{log("after 3s: glError="+gl.getError()+" buffer="+gl.drawingBufferWidth+"x"+gl.drawingBufferHeight+" calls="+renderer.info.render.calls+" tris="+renderer.info.render.triangles+" programs="+renderer.info.programs.length+" lost="+gl.isContextLost());
      var px=new Uint8Array(4);gl.readPixels(Math.floor(gl.drawingBufferWidth/2),Math.floor(gl.drawingBufferHeight/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);log("center px(after frame, may be cleared)="+Array.prototype.join.call(px,","));
      renderer.info.programs.forEach(function(pg){if(pg.diagnostics)log("program diag: "+JSON.stringify(pg.diagnostics).slice(0,400));});}catch(e){log("diag err "+e.message);}},3000);
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputEncoding=T.sRGBEncoding;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.setClearColor(0x000000,0);
  var scene=new T.Scene(),camera=new T.PerspectiveCamera(30,4/3,0.1,300);
  var hemi=new T.HemisphereLight(0xffffff,0xcfc8bc,0.62);scene.add(hemi);
  var sun=new T.DirectionalLight(0xfff6ea,0.62);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  var sc=sun.shadow.camera;sc.left=-15;sc.right=15;sc.top=15;sc.bottom=-15;sc.near=1;sc.far=70;sun.shadow.bias=-0.0008;sun.shadow.normalBias=0.04;sun.shadow.radius=4;scene.add(sun);

  var MW=20,UNIT=MW/D.km[0],MH=D.km[1]*UNIT,EX=2.0,Q=4095;
  var bin=atob(D.dem.b64),dem=new Uint16Array(bin.length/2);for(var i=0;i<dem.length;i++)dem[i]=bin.charCodeAt(i*2)|(bin.charCodeAt(i*2+1)<<8);
  var GW=D.dem.w,GH=D.dem.h;
  function hAt(u,v){var x=Math.min(GW-1.001,Math.max(0,u*(GW-1))),y=Math.min(GH-1.001,Math.max(0,v*(GH-1))),x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
    var a=dem[y0*GW+x0],b=dem[y0*GW+x0+1],c=dem[(y0+1)*GW+x0],d=dem[(y0+1)*GW+x0+1];return ((a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy)/1000*UNIT*EX;}
  function pos(u,v,lift){return new T.Vector3((u-0.5)*MW,hAt(u,v)+(lift||0),(v-0.5)*MH);}

  /* 道路・川・区境を1枚に描いて地形へ貼る */
  var TW=2048,TH=Math.round(TW*MH/MW),tex=document.createElement("canvas");tex.width=TW;tex.height=TH;
  var PLACES=[["手稲区",519,796],["北区",1291,793],["東区",2050,1081],["西区",850,1690],["中央区",1394,1968],["白石区",2122,1715],["厚別区",2715,1957],["豊平区",2007,2606],["清田区",2400,2900],["南区",914,3532],["江別市",3336,881],["北広島市",2998,3024]];
  var NATURE=[["手稲山",197,1572],["藻岩山",1316,2270],["豊平川",1287,3022],["石狩川",3139,714]];
  var FONT="'Noto Sans JP','BIZ UDPGothic','Hiragino Sans','Yu Gothic',sans-serif";
  function drawMap(){
    var c=tex.getContext("2d"),sx=TW/Q,sy=TH/Q;
    c.fillStyle="#f6f3ee";c.fillRect(0,0,TW,TH);
    function path(a,close){c.beginPath();for(var i=0;i<a.length;i+=2){var x=a[i]*sx,y=a[i+1]*sy;if(i)c.lineTo(x,y);else c.moveTo(x,y);}if(close)c.closePath();}
    function lines(list,color,w,dash){c.strokeStyle=color;c.lineWidth=w;c.lineJoin="round";c.lineCap="round";c.setLineDash(dash||[]);list.forEach(function(a){path(a);c.stroke();});c.setLineDash([]);}
    c.fillStyle="#c5d5d9";D.water.forEach(function(a){path(a,true);c.fill();});
    lines(D.river,"#b3c8cd",2.4);lines(D.bound,"#bdb5a8",1.6,[2,7]);lines(D.pref,"#e2dbcf",2.2);
    lines(D.nat,"#ffffff",6);lines(D.nat,"#cdc4b4",3.2);lines(D.rail,"#8f887c",2.2,[9,6]);lines(D.hw,"#ffffff",8);lines(D.hw,"#8a8377",4.4);
    c.textAlign="center";c.textBaseline="middle";c.lineWidth=7;c.strokeStyle="rgba(246,243,238,.9)";
    c.font="700 30px "+FONT;c.fillStyle="#8c857a";PLACES.forEach(function(p){c.strokeText(p[0],p[1]*sx,p[2]*sy);c.fillText(p[0],p[1]*sx,p[2]*sy);});
    c.font="400 24px "+FONT;NATURE.forEach(function(p,i){c.fillStyle=i<2?"#8c857a":"#6f8c97";var y=p[2]*sy+(i<2?26:0);c.strokeText(p[0],p[1]*sx,y);c.fillText(p[0],p[1]*sx,y);});
  }
  drawMap();
  var mapTex=new T.CanvasTexture(tex);mapTex.encoding=T.sRGBEncoding;mapTex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  if(document.fonts&&document.fonts.ready){document.fonts.ready.then(function(){drawMap();mapTex.needsUpdate=true;});}

  var world=new T.Group();scene.add(world);
  var g=new T.PlaneGeometry(MW,MH,GW-1,GH-1),pa=g.attributes.position;for(var j=0;j<pa.count;j++)pa.setZ(j,dem[j]/1000*UNIT*EX);g.computeVertexNormals();
  var terrain=new T.Mesh(g,new T.MeshStandardMaterial({map:mapTex,roughness:1,metalness:0}));terrain.rotation.x=-Math.PI/2;terrain.castShadow=true;terrain.receiveShadow=true;world.add(terrain);
  var baseBox=new T.Mesh(new T.BoxGeometry(MW,0.5,MH),new T.MeshStandardMaterial({color:0xe6e0d6,roughness:1}));baseBox.position.y=-0.252;baseBox.castShadow=true;world.add(baseBox);

  /* [D] 雪：地形に薄い白の層を重ね、粒を降らせる */
  var snowMat=new T.MeshStandardMaterial({color:0xffffff,roughness:0.9,transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  var snowLayer=new T.Mesh(g,snowMat);snowLayer.rotation.x=-Math.PI/2;snowLayer.receiveShadow=true;snowLayer.visible=false;world.add(snowLayer);
  var FL=1400,fpos=new Float32Array(FL*3),fsp=new Float32Array(FL);
  for(var f=0;f<FL;f++){fpos[f*3]=(Math.random()-0.5)*MW*1.1;fpos[f*3+1]=Math.random()*7;fpos[f*3+2]=(Math.random()-0.5)*MH*1.1;fsp[f]=0.5+Math.random()*0.9;}
  var fgeo=new T.BufferGeometry();fgeo.setAttribute("position",new T.BufferAttribute(fpos,3));
  var flakeMat=new T.PointsMaterial({color:0xffffff,size:0.075,transparent:true,opacity:0,depthWrite:false});
  var flakes=new T.Points(fgeo,flakeMat);flakes.visible=false;world.add(flakes);

  /* [C] 夜の灯り：実際の道路の上に点を置く（灯りそのものは演出） */
  var lightMat=new T.PointsMaterial({color:0xffc46a,size:0.06,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});
  (function(){var p=[];[D.hw,D.nat,D.pref].forEach(function(list,ci){list.forEach(function(a){for(var i=0;i+3<a.length;i+=2){var x0=a[i]/Q,y0=a[i+1]/Q,x1=a[i+2]/Q,y1=a[i+3]/Q,len=Math.hypot(x1-x0,y1-y0),n=Math.max(1,Math.round(len/(ci===2?0.02:0.011)));
    for(var k=0;k<n;k++){var u=x0+(x1-x0)*k/n,v=y0+(y1-y0)*k/n;if(u<0.01||u>0.99||v<0.01||v>0.99)continue;var q=pos(u,v,0.03);p.push(q.x,q.y,q.z);}}});});
    var lg=new T.BufferGeometry();lg.setAttribute("position",new T.Float32BufferAttribute(p,3));world.add(new T.Points(lg,lightMat));})();

  /* 拠点（表記は従来の NETWORK 図に合わせる） */
  var SITES=[
    {id:"hq",name:"本社営業所",sub:"中央区",addr:"札幌市中央区",hq:true,h:1.5,left:true,az:0.5},
    {id:"kitago",name:"白石営業所",sub:"北郷",addr:"札幌市白石区北郷",h:0.75,dy:12,az:-0.35},
    {id:"yoneshato",name:"車庫",sub:"東米里",addr:"札幌市白石区東米里",h:1.05,az:0.6},
    {id:"higashi",name:"東区営業所",sub:"東雁来",addr:"札幌市東区東雁来",h:1.5,left:true,az:-0.5},
    {id:"wattsu",name:"北広島営業所",sub:"輪厚",addr:"北広島市輪厚",h:1.2,az:0.9}
  ];
  var orange=new T.MeshStandardMaterial({color:0xe8650f,roughness:0.45,emissive:0xe8650f,emissiveIntensity:0}),inkMat=new T.MeshStandardMaterial({color:0x2b2926,roughness:0.6}),dotMat=new T.MeshStandardMaterial({color:0x2b2926,roughness:0.6,emissive:0xffce1f,emissiveIntensity:0});
  var labelItems=[],movers=[],by={};
  SITES.forEach(function(s){
    var uv=D.sites[s.id];s.p=pos(uv[0],uv[1],0);by[s.id]=s;
    var pin=new T.Group();pin.position.copy(s.p);
    var stem=new T.Mesh(new T.CylinderGeometry(0.022,0.022,s.h,8),inkMat);stem.position.y=s.h/2;stem.castShadow=true;pin.add(stem);
    var head=new T.Mesh(new T.SphereGeometry(s.hq?0.2:0.15,24,16),orange);head.position.y=s.h;head.castShadow=true;pin.add(head);
    var ring=new T.Mesh(new T.RingGeometry(0.2,0.3,36),new T.MeshBasicMaterial({color:0xe8650f,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=0.03;pin.add(ring);
    world.add(pin);
    var el=document.createElement("div");el.className="n3-lb";el.innerHTML="<b></b><span></span>";el.firstChild.textContent=s.name;el.lastChild.textContent=s.sub;labelsEl.appendChild(el);
    var anchor=new T.Object3D();anchor.position.set(0,s.h+0.12,0);pin.add(anchor);
    s.el=el;labelItems.push({el:el,obj:anchor,dx:s.left?-9:9,dy:s.dy||-13,left:!!s.left});
  });
  [["hq","higashi"],["hq","kitago"],["kitago","yoneshato"],["higashi","yoneshato"],["hq","wattsu"],["yoneshato","wattsu"]].forEach(function(r,i){
    var a=by[r[0]].p,b=by[r[1]].p,len=a.distanceTo(b),mid=a.clone().add(b).multiplyScalar(0.5);mid.y=Math.max(a.y,b.y)+len*0.28+0.25;
    var cv=new T.QuadraticBezierCurve3(a.clone().setY(a.y+0.04),mid,b.clone().setY(b.y+0.04));
    world.add(new T.Mesh(new T.TubeGeometry(cv,48,0.024,6),orange));
    for(var k=0;k<2;k++){var dot=new T.Mesh(new T.SphereGeometry(0.085,14,10),dotMat);world.add(dot);movers.push({cv:cv,dot:dot,ph:i*0.17+k*0.93,sp:0.5/len+0.05,rank:(i*2+k*7)%12});}
  });

  /* [B] 読み進めると視点が拠点を巡る */
  var HOME=pos(0.55,0.5,0),AZ0=1.82;HOME.y=0.2;
  var cam={tg:HOME.clone(),r:30,az:AZ0,pol:0.92},to={tg:HOME.clone(),r:30,az:AZ0,pol:0.92};
  function fit(){var a=stage.clientWidth/Math.max(1,stage.clientHeight);return a<1.2?Math.min(1.9,1.22/a):1;}
  var STEPS=[{t:"札幌圏の全体",s:"4つの営業所と車庫",site:null,az:AZ0}].concat(SITES.map(function(s){return {t:s.name,s:s.addr,site:s,az:AZ0+s.az};})).concat([{t:"全体へ戻る",s:"",site:null,az:1.45}]);
  var stepsEl=document.createElement("ol");stepsEl.className="n3-steps";stepsEl.setAttribute("aria-label","拠点を順に見る");
  STEPS.forEach(function(st,i){var li=document.createElement("li"),b=document.createElement("button");b.type="button";b.className="n3-step";b.innerHTML="<b></b><span></span>";b.firstChild.textContent=st.t;b.lastChild.textContent=st.s;
    b.addEventListener("click",function(){go(i,true);});li.appendChild(b);stepsEl.appendChild(li);st.li=li;});
  grid.appendChild(stepsEl);
  sec.classList.add("has-3d");
  var cur=-1;
  function go(i){
    if(i===cur)return;cur=i;var st=STEPS[i],s=st.site;
    STEPS.forEach(function(x,k){x.li.classList.toggle("on",k===i);});
    if(!s){to.tg.copy(HOME);to.r=25*fit();to.pol=0.92;}else{to.tg.copy(s.p);to.tg.y+=0.4;to.r=9.5*Math.min(1.5,fit());to.pol=1.04;}
    var d=st.az-to.az;to.az+=Math.atan2(Math.sin(d),Math.cos(d));
    SITES.forEach(function(x){x.el.classList.toggle("on",!!s&&x.id===s.id);});
  }
  var ticking=false;
  function pickStep(){
    ticking=false;var vh=window.innerHeight,narrow=window.matchMedia("(max-width:860px)").matches,line=vh*(narrow?0.8:0.5),best=0,bd=1e9;
    STEPS.forEach(function(st,i){var r=st.li.getBoundingClientRect(),c=(r.top+r.bottom)/2,d=Math.abs(c-line);if(d<bd){bd=d;best=i;}});
    go(best);
  }
  window.addEventListener("scroll",function(){if(!ticking){ticking=true;requestAnimationFrame(pickStep);}},{passive:true});

  var ptr=null,lastTouch=performance.now()-9000,sway=0;
  stage.addEventListener("pointerdown",function(e){ptr={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false,id:e.pointerId,touch:e.pointerType==="touch"};lastTouch=performance.now();});
  window.addEventListener("pointermove",function(e){if(!ptr||e.pointerId!==ptr.id)return;var dx=e.clientX-ptr.x,dy=e.clientY-ptr.y;
    if(!ptr.moved&&Math.hypot(e.clientX-ptr.sx,e.clientY-ptr.sy)>7){ptr.moved=true;stage.classList.add("dragging");}
    if(ptr.moved){to.az+=dx*0.0075;if(!ptr.touch)to.pol=Math.min(1.35,Math.max(0.35,to.pol-dy*0.005));}ptr.x=e.clientX;ptr.y=e.clientY;lastTouch=performance.now();});
  function endPtr(e){if(!ptr||e.pointerId!==ptr.id)return;ptr=null;stage.classList.remove("dragging");}
  window.addEventListener("pointerup",endPtr);window.addEventListener("pointercancel",endPtr);

  /* [C] 時刻で光が変わる。便の増減と灯りは演出 */
  var hour=10,playing=false,night=0,snow=0,snowTo=0;
  function lerp(a,b,t){return a+(b-a)*t;}
  function mix(c1,c2,t){return "rgb("+Math.round(lerp(c1[0],c2[0],t))+","+Math.round(lerp(c1[1],c2[1],t))+","+Math.round(lerp(c1[2],c2[2],t))+")";}
  var cDay=new T.Color(0xfff6ea),cLow=new T.Color(0xffa85c),cSkyD=new T.Color(0xffffff),cSkyN=new T.Color(0x8c9bb8),cGrD=new T.Color(0xcfc8bc),cGrN=new T.Color(0x2a2c36);
  function applyTime(){
    var fr=(hour-5)/(19-5),el=Math.sin(Math.PI*Math.min(1,Math.max(0,fr))),day=Math.pow(Math.max(0,el),0.55);
    if(hour<5||hour>19){day=0;el=0;}
    var a=Math.PI*Math.min(1,Math.max(0,fr)),ce=Math.cos(el*1.05),R=24;
    sun.position.set(R*ce*Math.cos(a),R*Math.max(0.12,Math.sin(el*1.05)),R*ce*Math.sin(a)*0.8-4);
    sun.intensity=0.7*day;sun.color.copy(cLow).lerp(cDay,Math.min(1,el*1.6));
    hemi.intensity=lerp(0.11,0.62,day);hemi.color.copy(cSkyN).lerp(cSkyD,day);hemi.groundColor.copy(cGrN).lerp(cGrD,day);
    night=1-Math.min(1,day*1.7);
    lightMat.opacity=night*0.95;orange.emissiveIntensity=night*0.9;dotMat.emissiveIntensity=night*1.2;
    var w=snow*(1-night);
    stage.style.background="linear-gradient("+mix([lerp(255,214,w),lerp(255,219,w),lerp(255,223,w)],[38,34,31],night)+","+mix([lerp(236,190,w),lerp(231,196,w),lerp(223,201,w)],[14,12,10],night)+")";
    stage.classList.toggle("night",night>0.55);
    var hh=Math.floor(hour),mm=Math.round((hour-hh)*60);if(mm===60){hh++;mm=0;}clockEl.textContent=(hh<10?"0":"")+hh+":"+(mm<10?"0":"")+mm;
    var act=hour<6?0.08:hour<9?lerp(0.08,1,(hour-6)/3):hour<18?1:hour<21.5?lerp(1,0.15,(hour-18)/3.5):0.15,n=Math.round(act*movers.length);
    movers.forEach(function(m){m.dot.visible=m.rank<n;});
  }
  timeEl.addEventListener("input",function(){hour=parseFloat(timeEl.value);applyTime();});
  playEl.addEventListener("click",function(){playing=!playing;playEl.setAttribute("aria-pressed",playing?"true":"false");playEl.textContent=playing?"止める":"一日を再生";});
  function setSnow(on){snowTo=on?1:0;snowEl.setAttribute("aria-pressed",on?"true":"false");if(reduce)snow=snowTo;}
  snowEl.addEventListener("click",function(){setSnow(!snowTo);});
  var month=new Date().getMonth()+1;if(month===12||month<=2)setSnow(true);

  function size(){var w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  if(window.ResizeObserver){new ResizeObserver(function(){size();var s=cur>=0?STEPS[cur].site:null;to.r=s?9.5*Math.min(1.5,fit()):25*fit();}).observe(stage);}else{window.addEventListener("resize",size);}
  var onScreen=true;if(window.IntersectionObserver){new IntersectionObserver(function(en){onScreen=en[0].isIntersecting;}).observe(stage);}
  var wp=new T.Vector3(),clock=new T.Clock();
  function place(l){l.obj.getWorldPosition(wp);wp.project(camera);if(wp.z>1){l.el.hidden=true;return;}l.el.hidden=false;
    l.el.style.transform="translate("+(((wp.x+1)/2)*stage.clientWidth+l.dx).toFixed(1)+"px,"+(((1-wp.y)/2)*stage.clientHeight+l.dy).toFixed(1)+"px)"+(l.left?" translateX(-100%)":"");}
  function frame(){
    if(dead)return;requestAnimationFrame(frame);try{tick();}catch(e){fallback(e&&e.message);}}
  function tick(){
    var dt=Math.min(clock.getDelta(),0.05),now=performance.now();
    if(!onScreen||document.hidden)return;
    if(playing){hour+=dt*1.5;if(hour>22)hour=4;timeEl.value=hour;applyTime();}
    if(snow!==snowTo){snow=snowTo>snow?Math.min(1,snow+dt/5):Math.max(0,snow-dt/2.5);applyTime();}
    snowLayer.visible=snow>0.001;snowMat.opacity=snow*0.5;flakes.visible=snowTo>0||snow>0.02;flakeMat.opacity=Math.min(1,(snowTo?1:snow)*1.2)*0.95;
    if(flakes.visible&&!reduce){for(var i=0;i<FL;i++){var y=fpos[i*3+1]-fsp[i]*dt;if(y<0)y+=7;fpos[i*3+1]=y;fpos[i*3]+=Math.sin(now*0.0006+i)*dt*0.12;}fgeo.attributes.position.needsUpdate=true;}
    var k=1-Math.exp(-dt*3.6);
    cam.tg.lerp(to.tg,k);cam.r+=(to.r-cam.r)*k;cam.az+=(to.az-cam.az)*(1-Math.exp(-dt*(ptr?9:3.2)));cam.pol+=(to.pol-cam.pol)*k;
    var idle=(!reduce&&!ptr&&now-lastTouch>3500)?1:0;sway+=(idle-sway)*(1-Math.exp(-dt*1.2));
    var az=cam.az+Math.sin(now*0.00022)*0.22*sway;
    camera.position.set(cam.tg.x+cam.r*Math.sin(cam.pol)*Math.cos(az),cam.tg.y+cam.r*Math.cos(cam.pol),cam.tg.z+cam.r*Math.sin(cam.pol)*Math.sin(az));camera.lookAt(cam.tg);
    var tt=reduce?0.35:now*0.001;movers.forEach(function(m){if(!m.dot.visible)return;var u=(tt*m.sp+m.ph)%2;if(u>1)u=2-u;m.dot.position.copy(m.cv.getPoint(u));});
    renderer.render(scene,camera);labelItems.forEach(place);
  }
  size();applyTime();go(0);cam.r=to.r*1.1;pickStep();frame();
  setTimeout(function(){try{var err=gl.getError();if(err&&err!==gl.CONTEXT_LOST_WEBGL){fallback("gl error "+err);}}catch(e){fallback(e&&e.message);}},4000);
}
})();
