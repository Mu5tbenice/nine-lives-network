/* ═══════════════════════════════════════════════════════════
   SPELL CARD PARTICLE + HOLO ENGINE
   Shared by: spellbook, dashboard, map, arena
   Reads data-* attributes from .spell-card elements

   data-color    = hex color for particles
   data-glow     = hex color for glow (defaults to color)
   data-particle  = ember | wisp | spore | stardust
   data-foil-s   = foil shine strength (0-1)
   data-foil-w   = foil warmth (0-1)
   data-num      = particle count (default 50)
   ═══════════════════════════════════════════════════════════ */

function hexToRgb(h){
  return{r:parseInt(h.slice(1,3),16),g:parseInt(h.slice(3,5),16),b:parseInt(h.slice(5,7),16)};
}

/* Particle types per house */
var PARTICLE_MAP={
  smoulders:'ember',darktide:'stardust',stonebark:'spore',
  nighthollow:'wisp',stormrage:'stardust',dawnbringer:'stardust',
  manastorm:'stardust',plaguemire:'spore',ashenvale:'stardust',
  universal:'stardust'
};

function initSpellCard(card){
  var canvas=card.querySelector('.sc-particles');
  if(!canvas)return;
  var glowEl=card.querySelector('.sc-glow');
  var borderEl=card.querySelector('.sc-border');
  var foilEl=card.querySelector('.sc-foil');
  var rainbowEl=card.querySelector('.sc-rainbow');
  var ctx=canvas.getContext('2d');
  var color=card.dataset.color||'#D4A64B';
  var glow=card.dataset.glow||color;
  var pType=card.dataset.particle||'stardust';
  var foilS=parseFloat(card.dataset.foilS||0.18);
  var foilW=parseFloat(card.dataset.foilW||0.1);
  var numP=parseInt(card.dataset.num||50);
  var rgb=hexToRgb(color);
  var glowRgb=hexToRgb(glow);
  var w,h,mouseX=-1,mouseY=-1,normX=0.5,normY=0.5;
  var isHover=false,shimmer=Math.random()*360;
  var particles=[];

  function resize(){
    var r=card.getBoundingClientRect();
    w=r.width;h=r.height;
    canvas.width=w*2;canvas.height=h*2;
    canvas.style.width=w+'px';canvas.style.height=h+'px';
    ctx.setTransform(2,0,0,2,0,0);
  }
  resize();

  function makeP(){
    return{x:Math.random()*w,y:Math.random()*h,
      vx:(Math.random()-0.5)*0.2,vy:-Math.random()*0.3-0.05,
      size:Math.random()*2.8+0.8,alpha:Math.random()*0.45+0.12,
      baseAlpha:Math.random()*0.45+0.12,
      life:Math.random()*400+200,maxLife:Math.random()*400+200,
      pulse:Math.random()*Math.PI*2,pulseSpeed:Math.random()*0.02+0.005,
      trail:[]};
  }
  function resetP(p){
    p.x=Math.random()*w;p.y=Math.random()*h;
    p.vx=(Math.random()-0.5)*0.2;p.vy=-Math.random()*0.3-0.05;
    p.size=Math.random()*2.2+0.5;p.alpha=p.baseAlpha;p.life=p.maxLife;p.trail=[];
  }
  for(var i=0;i<numP;i++)particles.push(makeP());

  function update(){
    ctx.clearRect(0,0,w,h);
    shimmer+=0.5;
    if(borderEl)borderEl.style.setProperty('--shimmer',shimmer+'deg');

    if(isHover&&foilEl){
      var angle=Math.atan2(normY-0.5,normX-0.5)*180/Math.PI+90;
      var dc=Math.sqrt(Math.pow(normX-0.5,2)+Math.pow(normY-0.5,2));
      var s=foilS*(0.4+dc*1.2),wm=foilW*(0.4+dc*1.2);
      foilEl.style.setProperty('--foil-angle',angle+'deg');
      foilEl.style.setProperty('--foil-s',s);
      foilEl.style.setProperty('--foil-w',wm);
      if(rainbowEl)rainbowEl.style.setProperty('--foil-angle',angle+'deg');
    }

    for(var i=0;i<particles.length;i++){
      var p=particles[i];p.pulse+=p.pulseSpeed;p.life--;
      if(pType==='wisp'){p.trail.push({x:p.x,y:p.y});if(p.trail.length>6)p.trail.shift();}

      if(isHover&&mouseX>0){
        var dx=mouseX-p.x,dy=mouseY-p.y,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<80){
          var f=((80-dist)/80)*0.1;
          if(pType==='ember'){p.vx-=dx/dist*f*0.5;p.vy-=f*2;}
          else if(pType==='wisp'){p.vx+=(-dy/dist)*f*1.5;p.vy+=(dx/dist)*f*1.5;}
          else if(pType==='spore'){p.vx+=dx/dist*f*0.2;p.vy-=0.08;}
          else{p.vx+=dx/dist*f;p.vy+=dy/dist*f;}
          p.alpha=Math.min(0.75,p.baseAlpha+((80-dist)/80)*0.4);
        }else{p.alpha+=(p.baseAlpha-p.alpha)*0.03;}
      }else{p.alpha+=(p.baseAlpha-p.alpha)*0.03;}

      p.vx*=0.97;p.vy*=0.97;
      if(pType==='ember'){p.vy-=0.02;p.vx+=Math.sin(p.pulse)*0.01;}
      else if(pType==='wisp'){p.vx+=Math.sin(p.pulse*1.2)*0.008;p.vy+=Math.cos(p.pulse*0.6)*0.008;}
      else if(pType==='spore'){p.vx+=Math.sin(p.pulse*0.4)*0.008;p.vy+=Math.cos(p.pulse*0.3)*0.006;}
      else{p.vx+=Math.sin(p.pulse)*0.005;p.vy+=Math.cos(p.pulse*0.7)*0.005;}
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<-5)p.x=w+5;if(p.x>w+5)p.x=-5;
      if(p.y<-5)p.y=h+5;if(p.y>h+5)p.y=-5;
      if(p.life<=0)resetP(p);

      var pa=p.alpha*(0.6+0.4*Math.sin(p.pulse));
      ctx.save();
      if(p.trail.length>2){
        ctx.beginPath();ctx.moveTo(p.trail[0].x,p.trail[0].y);
        for(var t=1;t<p.trail.length;t++)ctx.lineTo(p.trail[t].x,p.trail[t].y);
        ctx.strokeStyle='rgba('+glowRgb.r+','+glowRgb.g+','+glowRgb.b+','+(pa*0.08)+')';
        ctx.lineWidth=0.5;ctx.stroke();
      }
      if(pType==='ember'){
        var g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*3);
        g.addColorStop(0,'rgba(255,200,120,'+pa+')');
        g.addColorStop(0.3,'rgba('+rgb.r+','+rgb.g+','+rgb.b+','+(pa*0.4)+')');
        g.addColorStop(1,'transparent');
        ctx.fillStyle=g;ctx.fillRect(p.x-p.size*3,p.y-p.size*3,p.size*6,p.size*6);
        ctx.beginPath();ctx.arc(p.x,p.y,p.size*0.4,0,Math.PI*2);
        ctx.fillStyle='rgba(255,240,200,'+pa*0.7+')';ctx.fill();
      }else if(pType==='wisp'){
        var g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*3);
        g.addColorStop(0,'rgba('+glowRgb.r+','+glowRgb.g+','+glowRgb.b+','+pa*0.5+')');
        g.addColorStop(1,'transparent');
        ctx.fillStyle=g;ctx.fillRect(p.x-p.size*3,p.y-p.size*3,p.size*6,p.size*6);
      }else if(pType==='spore'){
        var g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*2.5);
        g.addColorStop(0,'rgba('+glowRgb.r+','+glowRgb.g+','+glowRgb.b+','+pa*0.5+')');
        g.addColorStop(0.5,'rgba('+rgb.r+','+rgb.g+','+rgb.b+','+(pa*0.2)+')');
        g.addColorStop(1,'transparent');
        ctx.fillStyle=g;ctx.fillRect(p.x-p.size*2.5,p.y-p.size*2.5,p.size*5,p.size*5);
      }else{
        var g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*2);
        g.addColorStop(0,'rgba(255,255,255,'+pa+')');
        g.addColorStop(0.3,'rgba('+glowRgb.r+','+glowRgb.g+','+glowRgb.b+','+pa*0.4+')');
        g.addColorStop(1,'transparent');
        ctx.fillStyle=g;ctx.fillRect(p.x-p.size*2,p.y-p.size*2,p.size*4,p.size*4);
        ctx.strokeStyle='rgba(255,255,255,'+(pa*0.15)+')';ctx.lineWidth=0.3;
        ctx.beginPath();ctx.moveTo(p.x-p.size,p.y);ctx.lineTo(p.x+p.size,p.y);ctx.stroke();
        ctx.beginPath();ctx.moveTo(p.x,p.y-p.size);ctx.lineTo(p.x,p.y+p.size);ctx.stroke();
      }
      ctx.restore();
    }
    requestAnimationFrame(update);
  }

  /* 3D tilt */
  var tiltX=0,tiltY=0,tX=0,tY=0;
  function tiltLoop(){
    tiltX+=(tX-tiltX)*0.06;tiltY+=(tY-tiltY)*0.06;
    card.style.transform='perspective(1000px) rotateX('+tiltX+'deg) rotateY('+tiltY+'deg)'+(isHover?' translateY(-5px) scale(1.015)':'');
    requestAnimationFrame(tiltLoop);
  }
  tiltLoop();

  card.addEventListener('mouseenter',function(){isHover=true;});
  card.addEventListener('mouseleave',function(){
    isHover=false;mouseX=-1;mouseY=-1;tX=0;tY=0;
    if(glowEl)glowEl.style.opacity='0';
  });
  card.addEventListener('mousemove',function(e){
    var r=card.getBoundingClientRect();
    mouseX=e.clientX-r.left;mouseY=e.clientY-r.top;
    normX=mouseX/w;normY=mouseY/h;
    tX=(normY-0.5)*-12;tY=(normX-0.5)*12;
    if(glowEl){
      glowEl.style.background='radial-gradient(140px circle at '+mouseX+'px '+mouseY+'px, '+glow+'18, transparent 70%)';
      glowEl.style.opacity='1';
    }
  });

  update();
}

/* Init all spell cards on page */
function initAllSpellCards(){
  document.querySelectorAll('.spell-card[data-color]').forEach(initSpellCard);
}

/* Auto-init when DOM ready */
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',initAllSpellCards);
}else{
  setTimeout(initAllSpellCards,50);
}