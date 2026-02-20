/* ═══════════════════════════════════════════════════════════
   card-particles.js — Nine Lives Network v4.2

   Provides:
   - initSpellCard(cardEl) — init ONE card (particles + foil)
   - initAllSpellCards()   — init ALL cards on page
   - initParticles(canvas) — canvas particles (reads data from parent card)
   - initCards(container)  — alias used by card-v4.js
   ═══════════════════════════════════════════════════════════ */

function initSpellCard(el) {
  if (!el) return;
  var cv = el.querySelector('canvas.sc-particles');
  if (cv && !cv._pi) { cv._pi = true; initParticles(cv); }
  if (!el._fi) {
    el._fi = true;
    el.addEventListener('mousemove', function(e) {
      var r = el.getBoundingClientRect(), mx = (e.clientX-r.left)/r.width, my = (e.clientY-r.top)/r.height;
      var a = 135+(mx-0.5)*60+(my-0.5)*40, fm = parseFloat(el.style.getPropertyValue('--foil-mult'))||0;
      var f = el.querySelector('.sc-foil'), rb = el.querySelector('.sc-rainbow'), g = el.querySelector('.sc-glow'), b = el.querySelector('.sc-border');
      if(f) f.style.background='linear-gradient('+a+'deg,transparent 0%,rgba(255,255,255,0) 20%,rgba(255,255,255,'+(fm*0.2)+') 40%,rgba(255,230,180,'+(fm*0.14)+') 50%,rgba(255,255,255,'+(fm*0.2)+') 60%,rgba(255,255,255,0) 80%,transparent 100%)';
      if(rb) rb.style.background='linear-gradient('+a+'deg,transparent 10%,rgba(255,50,50,'+(fm*0.07)+') 22%,rgba(255,165,0,'+(fm*0.07)+') 30%,rgba(255,255,0,'+(fm*0.07)+') 38%,rgba(0,255,120,'+(fm*0.07)+') 46%,rgba(0,180,255,'+(fm*0.07)+') 54%,rgba(128,0,255,'+(fm*0.07)+') 62%,rgba(255,0,180,'+(fm*0.07)+') 70%,transparent 85%)';
      if(g){var hc=el.dataset.color||'#D4A64B'; g.style.background='radial-gradient(circle at '+(mx*100)+'% '+(my*100)+'%,'+hc+'1a,transparent 45%)';}
      if(b){var h2=el.dataset.color||'#D4A64B'; b.style.background=el.classList.contains('spell-card--legendary')?'conic-gradient(from '+a+'deg,transparent,'+h2+',#FFD700,'+h2+',transparent)':'conic-gradient(from '+a+'deg,transparent,'+h2+' 8%,transparent 16%)';}
    });
  }
}

function initAllSpellCards() {
  document.querySelectorAll('.spell-card').forEach(initSpellCard);
}

function initParticles(canvas, type, color) {
  if (!canvas || !canvas.getContext) return;
  var card = canvas.closest('.spell-card');
  type = type || (card && card.dataset.particle) || 'mote';
  color = color || (card && (card.dataset.color || card.dataset.glow)) || '#D4A64B';
  if (!color || color.length < 4) return;

  var ctx = canvas.getContext('2d'), par = canvas.parentElement;
  var W = par ? par.offsetWidth : 240, H = par ? par.offsetHeight : 380;
  if (!W || !H) return;
  canvas.width = W; canvas.height = H;

  var R = parseInt(color.slice(1,3),16)||200, G = parseInt(color.slice(3,5),16)||180, B = parseInt(color.slice(5,7),16)||100;
  var rar = card ? (card.dataset.rarity||'common') : 'common';
  var cnt = ({common:0,basic:0,uncommon:5,rare:8,epic:12,legendary:18})[rar] || 6;
  if (!cnt) return;

  var tm = {rain:'bubble',spark:'lightning',wind:'leaf',shadow:'wisp',arcane:'rune',toxic:'spore',light:'mote',stardust:'mote'};
  var dt = tm[type] || type, pts = [], tk = 0, af;

  function mp() {
    switch(dt) {
      case 'ember': return {x:Math.random()*W,y:H+Math.random()*20,r:Math.random()*2+.5,vx:(Math.random()-.5)*.6,vy:-(Math.random()*1.2+.4),ph:Math.random()*6.28};
      case 'bubble': return {x:Math.random()*W,y:H+Math.random()*30,rd:Math.random()*3+1.5,vy:-(Math.random()*.5+.2),ph:Math.random()*6.28};
      case 'lightning': return {x:Math.random()*W,y:Math.random()*H,ln:Math.random()*18+6,an:Math.random()*6.28,a:0,ma:Math.random()*.8+.2,ti:Math.random()*120,cd:Math.random()*80+30,br:~~(Math.random()*3)+1};
      case 'leaf': return {x:Math.random()*W,y:-Math.random()*20,rd:Math.random()*4+2.5,vx:Math.random()*.3+.1,vy:Math.random()*.4+.2,a:Math.random()*.4+.3,ph:Math.random()*6.28,sp:Math.random()*.03+.01};
      case 'wisp': return {cx:W*.3+Math.random()*W*.4,cy:H*.3+Math.random()*H*.4,ra:Math.random()*40+15,an:Math.random()*6.28,sp:(Math.random()*.015+.005)*(Math.random()>.5?1:-1),rd:Math.random()*2+.5,a:Math.random()*.4+.1,tr:[]};
      case 'rune': return {x:Math.random()*W,y:Math.random()*H,ma:Math.random()*.6+.25,ti:Math.random()*80,du:Math.random()*60+40,cd:Math.random()*50+20,sz:Math.random()*10+5,gl:~~(Math.random()*6)};
      case 'spore': return {x:Math.random()*W,y:H+Math.random()*20,rd:Math.random()*2+1,vx:(Math.random()-.5)*.4,vy:-(Math.random()*.6+.15),a:Math.random()*.4+.1,ph:Math.random()*6.28,ex:Math.random()*.008+.002,mr:Math.random()*4+2};
      case 'petal': return {x:Math.random()*W,y:-Math.random()*20,rd:Math.random()*3+1.2,vx:(Math.random()-.5)*.2,vy:Math.random()*.4+.15,a:Math.random()*.35+.25,ro:Math.random()*6.28,rs:(Math.random()-.5)*.02};
      default: return {x:Math.random()*W,y:Math.random()*H,rd:Math.random()*2+.8,vx:(Math.random()-.5)*.15,vy:-(Math.random()*.3+.05),ph:Math.random()*6.28,pu:Math.random()*.02+.01};
    }
  }
  for(var i=0;i<cnt;i++) pts.push(mp());

  function dr(){
    ctx.clearRect(0,0,W,H); tk++;
    for(var i=0;i<pts.length;i++){
      var p=pts[i],c;
      switch(dt){
        case 'ember':
          p.x+=p.vx+Math.sin(p.ph)*.3;p.y+=p.vy;p.ph+=.04;c=.5+Math.sin(tk*.2+p.ph)*.5;
          if(p.y<-10){p.y=H+10;p.x=Math.random()*W;}
          var gd=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*3);
          gd.addColorStop(0,'rgba(255,200,50,'+(c*.6)+')');gd.addColorStop(.4,'rgba(255,100,20,'+(c*.35)+')');gd.addColorStop(1,'rgba(255,50,0,0)');
          ctx.fillStyle=gd;ctx.fillRect(p.x-p.r*3,p.y-p.r*3,p.r*6,p.r*6);
          ctx.beginPath();ctx.arc(p.x,p.y,p.r*.5,0,6.28);ctx.fillStyle='rgba(255,240,200,'+(c*.7)+')';ctx.fill();break;
        case 'bubble':
          p.x+=Math.sin(p.ph)*.3;p.y+=p.vy;p.ph+=.02;
          if(p.y<-10){p.y=H+10;p.x=Math.random()*W;}
          ctx.beginPath();ctx.arc(p.x,p.y,p.rd,0,6.28);ctx.strokeStyle='rgba('+R+','+G+','+B+',0.35)';ctx.lineWidth=.8;ctx.stroke();break;
        case 'lightning':
          p.ti--;if(p.ti<=0){p.a=p.ma;p.ti=p.cd;p.x=Math.random()*W;p.y=Math.random()*H;}
          if(p.a>0){ctx.strokeStyle='rgba(255,255,100,'+p.a+')';ctx.lineWidth=1.5;ctx.shadowColor='rgba(255,255,150,0.5)';ctx.shadowBlur=6;
          var bx=p.x,by=p.y;ctx.beginPath();ctx.moveTo(bx,by);
          for(var s=0;s<p.br+2;s++){bx+=Math.cos(p.an)*p.ln/(p.br+2)+(Math.random()-.5)*6;by+=Math.sin(p.an)*p.ln/(p.br+2)+(Math.random()-.5)*4;ctx.lineTo(bx,by);}
          ctx.stroke();ctx.shadowBlur=0;p.a*=.8;if(p.a<.02)p.a=0;}break;
        case 'leaf':
          p.x+=p.vx+Math.sin(p.ph)*.4;p.y+=p.vy;p.ph+=p.sp;
          if(p.y>H+10){p.y=-10;p.x=Math.random()*W;}
          ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.sin(p.ph)*.5);ctx.scale(1,.5+Math.abs(Math.sin(p.ph))*.5);
          ctx.beginPath();ctx.ellipse(0,0,p.rd,p.rd*.6,0,0,6.28);ctx.fillStyle='rgba('+R+','+G+','+B+','+p.a+')';ctx.fill();ctx.restore();break;
        case 'wisp':
          p.an+=p.sp;var wx=p.cx+Math.cos(p.an)*p.ra,wy=p.cy+Math.sin(p.an)*p.ra*.6;
          p.tr.push({x:wx,y:wy,a:p.a});if(p.tr.length>8)p.tr.shift();
          for(var t=0;t<p.tr.length;t++){var pt=p.tr[t];ctx.beginPath();ctx.arc(pt.x,pt.y,p.rd*(.3+t/p.tr.length*.7),0,6.28);ctx.fillStyle='rgba('+R+','+G+','+B+','+(t/p.tr.length*pt.a*.5)+')';ctx.fill();}
          var wg=ctx.createRadialGradient(wx,wy,0,wx,wy,p.rd*2.5);wg.addColorStop(0,'rgba('+R+','+G+','+B+','+p.a+')');wg.addColorStop(1,'rgba('+R+','+G+','+B+',0)');
          ctx.fillStyle=wg;ctx.fillRect(wx-p.rd*2.5,wy-p.rd*2.5,p.rd*5,p.rd*5);break;
        case 'rune':
          var gl=['\u25C6','\u2726','\u2B21','\u25B3','\u263D','\u2295'];p.ti--;
          if(p.ti<=0){p.ti=p.du+p.cd;p.x=10+Math.random()*(W-20);p.y=10+Math.random()*(H-20);}
          if(p.ti>p.cd){var pr=(p.ti-p.cd)/p.du,fa=pr<.2?pr/.2:pr>.7?(1-pr)/.3:1;
          ctx.font=p.sz+'px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
          ctx.fillStyle='rgba('+R+','+G+','+B+','+(fa*p.ma)+')';ctx.shadowColor='rgba('+R+','+G+','+B+',0.4)';ctx.shadowBlur=8;
          ctx.fillText(gl[p.gl],p.x,p.y);ctx.shadowBlur=0;}break;
        case 'spore':
          p.x+=p.vx+Math.sin(p.ph)*.2;p.y+=p.vy;p.ph+=.025;p.rd=Math.min(p.rd+p.ex,p.mr);p.a*=.998;
          if(p.y<-10||p.a<.02){p.y=H+10;p.x=Math.random()*W;p.rd=Math.random()*2+1;p.a=Math.random()*.4+.1;}
          var sg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.rd*2);sg.addColorStop(0,'rgba('+R+','+G+','+B+','+(p.a*.6)+')');sg.addColorStop(1,'rgba('+R+','+G+','+B+',0)');
          ctx.fillStyle=sg;ctx.fillRect(p.x-p.rd*2,p.y-p.rd*2,p.rd*4,p.rd*4);break;
        case 'petal':
          p.x+=p.vx;p.y+=p.vy;p.ro+=p.rs;if(p.y>H+10){p.y=-10;p.x=Math.random()*W;}
          ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.ro);ctx.fillStyle='rgba('+R+','+G+','+B+','+p.a+')';
          ctx.beginPath();ctx.moveTo(-p.rd,0);ctx.lineTo(0,-p.rd*.7);ctx.lineTo(p.rd,p.rd*.3);ctx.lineTo(-p.rd*.3,p.rd*.6);ctx.closePath();ctx.fill();ctx.restore();break;
        default:
          p.x+=p.vx;p.y+=p.vy;p.ph+=p.pu;var ma=.35+Math.sin(p.ph)*.35;
          if(p.y<-5){p.y=H+5;p.x=Math.random()*W;}
          var mg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.rd*4);mg.addColorStop(0,'rgba('+R+','+G+','+B+','+ma+')');mg.addColorStop(.4,'rgba('+R+','+G+','+B+','+(ma*.4)+')');mg.addColorStop(1,'rgba('+R+','+G+','+B+',0)');
          ctx.fillStyle=mg;ctx.fillRect(p.x-p.rd*4,p.y-p.rd*4,p.rd*8,p.rd*8);break;
      }
    }
    af=requestAnimationFrame(dr);
  }
  dr();
  canvas._stopParticles=function(){cancelAnimationFrame(af);};
}