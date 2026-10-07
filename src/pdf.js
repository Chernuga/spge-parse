import pdfjsLib from 'pdfjs-dist';
import { RECT, GRID, DAY_HEIGHT, X_DIV, TOLERANCE, MAIN_SIZES, MAIN_SIZE_TOL, CYR_UPPER, CLASS_LETTER_ORDER } from './constants.js';
import { state } from './state.js';
import { reportInput } from './dom.js';
import { parseReport, sortLessonsByClassThenTime, generateCombinedReportFromLessons } from './parse.js';

// The pdf.js worker cannot be inlined into the single-file build, so it is
// loaded from the CDN exactly like the original single-file app did.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

// ==================== PDF PROCESSING ====================
async function renderVectorBg(operatorList) {
    const ops = operatorList.fnArray, args = operatorList.argsArray;
    let chunks = [], m = [1,0,0,1,0,0], fill = 'black', stroke = 'black', lw = 1, font = 'sans-serif', fsize = 12, pts = [];
    function mat(s) { return `matrix(${s[0]},${s[1]},${s[2]},${s[3]},${s[4]},${s[5]})`; }
    function xform(mm) { const a=mm[0]*m[0]+mm[1]*m[2], b=mm[0]*m[1]+mm[1]*m[3], c=mm[2]*m[0]+mm[3]*m[2], d=mm[2]*m[1]+mm[3]*m[3], e=mm[4]*m[0]+mm[5]*m[2]+m[4], f=mm[4]*m[1]+mm[5]*m[3]+m[5]; m=[a,b,c,d,e,f]; }
    function flush() { if(pts.length<2) return; let d='M'+pts[0].x+','+pts[0].y; for(let i=1;i<pts.length;i++) d+='L'+pts[i].x+','+pts[i].y; let s=''; if(fill!=='none') s+='fill:'+fill+';'; if(stroke!=='none') s+='stroke:'+stroke+';stroke-width:'+lw+';'; if(s) chunks.push(`<path d="${d}" style="${s}" transform="${mat(m)}"/>`); pts=[]; }
    for(let i=0;i<ops.length;i++){ const op=ops[i], arg=args[i]; try{ switch(op){ case pdfjsLib.OPS.transform: xform(arg); break; case pdfjsLib.OPS.moveTo: flush(); pts.push({x:arg[0],y:arg[1]}); break; case pdfjsLib.OPS.lineTo: pts.push({x:arg[0],y:arg[1]}); break; case pdfjsLib.OPS.curveTo: pts.push({x:arg[4],y:arg[5]}); break; case pdfjsLib.OPS.closePath: if(pts.length) pts.push(pts[0]); break; case pdfjsLib.OPS.fill: flush(); break; case pdfjsLib.OPS.stroke: flush(); break; case pdfjsLib.OPS.fillStroke: flush(); break; case pdfjsLib.OPS.setFillRGBColor: fill=`rgb(${Math.round(arg[0]*255)},${Math.round(arg[1]*255)},${Math.round(arg[2]*255)})`; break; case pdfjsLib.OPS.setStrokeRGBColor: stroke=`rgb(${Math.round(arg[0]*255)},${Math.round(arg[1]*255)},${Math.round(arg[2]*255)})`; break; case pdfjsLib.OPS.setFont: font=arg[0]; fsize=arg[1]; break; case pdfjsLib.OPS.showText: chunks.push(`<text x="${m[4]}" y="${m[5]}" font-family="${font}" font-size="${fsize}" fill="${fill}" transform="${mat(m)}">${(arg[0]||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</text>`); break; case pdfjsLib.OPS.showSpacedText: let t=''; (arg[0]||[]).forEach(item=>{ t+=typeof item==='string'?item:typeof item==='number'?String.fromCharCode(item):''; }); chunks.push(`<text x="${m[4]}" y="${m[5]}" font-family="${font}" font-size="${fsize}" fill="${fill}" transform="${mat(m)}">${t.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</text>`); break; } } catch(e){} }
    flush(); return chunks.join('\n');
}

async function renderImageBg(page, viewport) {
    const scale = 2; const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
    const renderViewport = viewport.clone({scale}); canvas.width = renderViewport.width; canvas.height = renderViewport.height;
    await page.render({canvasContext:ctx, viewport:renderViewport}).promise;
    const dataUrl = canvas.toDataURL('image/png');
    return `<image width="${viewport.width}" height="${viewport.height}" href="${dataUrl}"/>`;
}

async function getBackgroundSvg(page) {
    const viewport = page.getViewport({scale:1.0}); const w=viewport.width, h=viewport.height;
    let vectorContent='';
    try { const ops=await page.getOperatorList(); if(ops.fnArray.length>0) vectorContent=await renderVectorBg(ops); } catch(e){ console.warn(e); }
    if(!vectorContent.trim()) vectorContent=await renderImageBg(page, viewport);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n${vectorContent}\n</svg>`;
}

function matrixToString(m) { return `matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`; }
function getRootBBox(el, root) {
    try {
        const lb = el.getBBox(); if(lb.width===0&&lb.height===0){ lb.width=0.1; lb.height=0.1; }
        const cm = el.getCTM(), cr = root.getCTM(); if(!cm||!cr) return null;
        const inv = cr.inverse(), tr = inv.multiply(cm);
        const pts = [{x:lb.x,y:lb.y},{x:lb.x+lb.width,y:lb.y},{x:lb.x,y:lb.y+lb.height},{x:lb.x+lb.width,y:lb.y+lb.height}]
            .map(p => { const sp = root.createSVGPoint(); sp.x=p.x; sp.y=p.y; return sp.matrixTransform(tr); });
        const xs = pts.map(p=>p.x), ys = pts.map(p=>p.y);
        return {x:Math.min(...xs), y:Math.min(...ys), width:Math.max(...xs)-Math.min(...xs), height:Math.max(...ys)-Math.min(...ys)};
    } catch(e) { return null; }
}
function getFill(p) {
    let f = p.getAttribute('fill'); if(f&&f!=='none') return f;
    const s = p.getAttribute('style'); if(s) { const m = s.match(/fill\s*:\s*([^;]+)/i); if(m) return m[1].trim(); }
    const cs = window.getComputedStyle(p); if(cs&&cs.fill&&cs.fill!=='none') return cs.fill;
    return 'none';
}

async function extractText(page, h) {
    const tc = await page.getTextContent(); let els = [];
    tc.items.forEach(it => {
        if(!it.str) return; const m = it.transform; if(!m||m.length<6) return;
        const fy = h - m[5]; const mat = `matrix(${m[0]},${m[1]},${m[2]},${m[3]},${m[4]},${fy})`;
        const col = it.color ? `rgb(${it.color[0]},${it.color[1]},${it.color[2]})` : 'black';
        els.push(`<text font-size="1" font-family="${it.fontName||'sans-serif'}" fill="${col}" transform="${mat}">${it.str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</text>`);
    });
    return els.join('\n');
}

async function extractPaths(page) {
    const ops = await page.getOperatorList(); if(ops.fnArray.length===0) return '';
    let els=[], st={matrix:[1,0,0,1,0,0],fillColor:'black',strokeColor:'black',lineWidth:1}, stack=[], segs=[];
    function sv(){ stack.push(JSON.parse(JSON.stringify(st))); }
    function rs(){ if(stack.length) st=stack.pop(); }
    function tp(x,y){ const [a,b,c,d,e,f]=st.matrix; return {x:a*x+c*y+e, y:b*x+d*y+f}; }
    function ms(){ const m=st.matrix; return `matrix(${m[0]},${m[1]},${m[2]},${m[3]},${m[4]},${m[5]})`; }
    function at(tm){ const m=st.matrix; st.matrix=[tm[0]*m[0]+tm[1]*m[2], tm[0]*m[1]+tm[1]*m[3], tm[2]*m[0]+tm[3]*m[2], tm[2]*m[1]+tm[3]*m[3], tm[4]*m[0]+tm[5]*m[2]+m[4], tm[4]*m[1]+tm[5]*m[3]+m[5]]; }
    function sp(){ segs=[]; }
    function am(x,y){ segs.push({type:'M',pts:[tp(x,y)]}); }
    function al(x,y){ segs.push({type:'L',pts:[tp(x,y)]}); }
    function ac(x1,y1,x2,y2,x3,y3){ segs.push({type:'C',pts:[tp(x1,y1),tp(x2,y2),tp(x3,y3)]}); }
    function cp(){ segs.push({type:'Z',pts:[]}); }
    function bd(){ if(!segs.length) return ''; let d=''; segs.forEach(s=>{ const p=s.pts; if(s.type==='M') d+=`M${p[0].x},${p[0].y} `; else if(s.type==='L') d+=`L${p[0].x},${p[0].y} `; else if(s.type==='C') d+=`C${p[0].x},${p[0].y} ${p[1].x},${p[1].y} ${p[2].x},${p[2].y} `; else if(s.type==='Z') d+='Z '; }); return d.trim(); }
    function fl(pt){ if(!segs.length) return; const d=bd(); if(!d) return; let style=''; if(pt==='fill'||pt==='both') style+=`fill:${st.fillColor};`; if(pt==='stroke'||pt==='both') style+=`stroke:${st.strokeColor};stroke-width:${st.lineWidth};`; if(!style) return; els.push(`<path d="${d}" style="${style}" transform="${ms()}"/>`); sp(); }
    for(let i=0;i<ops.fnArray.length;i++){
        const op=ops.fnArray[i], arg=ops.argsArray[i];
        try{
            switch(op){
                case pdfjsLib.OPS.save: sv(); break; case pdfjsLib.OPS.restore: rs(); break;
                case pdfjsLib.OPS.transform: at(arg); break; case pdfjsLib.OPS.moveTo: am(arg[0],arg[1]); break;
                case pdfjsLib.OPS.lineTo: al(arg[0],arg[1]); break; case pdfjsLib.OPS.curveTo: ac(arg[0],arg[1],arg[2],arg[3],arg[4],arg[5]); break;
                case pdfjsLib.OPS.curveTo2: al(arg[2],arg[3]); break; case pdfjsLib.OPS.curveTo3: al(arg[4],arg[5]); break;
                case pdfjsLib.OPS.closePath: cp(); break; case pdfjsLib.OPS.rectangle: sp(); am(arg[0],arg[1]); al(arg[0]+arg[2],arg[1]); al(arg[0]+arg[2],arg[1]+arg[3]); al(arg[0],arg[1]+arg[3]); cp(); break;
                case pdfjsLib.OPS.fill: fl('fill'); break; case pdfjsLib.OPS.stroke: fl('stroke'); break; case pdfjsLib.OPS.fillStroke: fl('both'); break;
                case pdfjsLib.OPS.endPath: sp(); break;
                case pdfjsLib.OPS.setFillRGBColor: st.fillColor=`rgb(${Math.round(arg[0]*255)},${Math.round(arg[1]*255)},${Math.round(arg[2]*255)})`; break;
                case pdfjsLib.OPS.setStrokeRGBColor: st.strokeColor=`rgb(${Math.round(arg[0]*255)},${Math.round(arg[1]*255)},${Math.round(arg[2]*255)})`; break;
                case pdfjsLib.OPS.setLineWidth: st.lineWidth=arg[0]; break;
            }
        }catch(e){}
    }
    return els.join('\n');
}

async function convertPageToRawSvg(page) {
    const vp = page.getViewport({scale:1}); const w=vp.width, h=vp.height;
    const pSvg = await extractPaths(page); const tSvg = await extractText(page, h);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n${pSvg}\n${tSvg}\n</svg>`;
}

function detectClassFromSVG(svg) {
    try {
        const doc = new DOMParser().parseFromString(svg,'image/svg+xml'); const svgEl = doc.querySelector('svg'); if(!svgEl) return '?';
        const texts = svgEl.querySelectorAll('text'); if(!texts.length) return '?';
        const raw = texts[texts.length-1].textContent.trim(); if(!raw) return '?';
        const parts = raw.split('-'); if(parts.length===2) return parts[0].trim() + (CYR_UPPER[parts[1].trim()] || parts[1].trim().toUpperCase());
        return raw;
    } catch(e){ return '?'; }
}

function filterSVG(svg) {
    const div = document.createElement('div'); div.style.cssText='position:absolute;visibility:hidden;width:0;height:0;'; div.innerHTML=svg; document.body.appendChild(div);
    let res='';
    try{
        const svgEl = div.querySelector('svg'); if(!svgEl) throw new Error('no svg');
        const root = svgEl, newSvg = document.createElementNS('http://www.w3.org/2000/svg','svg');
        for(let a of svgEl.attributes) if(a.name!=='xmlns') newSvg.setAttribute(a.name,a.value);
        if(!newSvg.getAttribute('xmlns')) newSvg.setAttribute('xmlns','http://www.w3.org/2000/svg');
        svgEl.querySelectorAll('path, text').forEach(el => {
            if(el.tagName.toLowerCase()==='text' && !el.textContent.trim()) return;
            try{
                const lb = el.getBBox(); if(lb.width===0&&lb.height===0){lb.width=0.1;lb.height=0.1;}
                const ce=el.getCTM(), cr=root.getCTM(); if(!ce||!cr) return;
                const inv=cr.inverse(), tr=inv.multiply(ce);
                const pts=[{x:lb.x,y:lb.y},{x:lb.x+lb.width,y:lb.y},{x:lb.x,y:lb.y+lb.height},{x:lb.x+lb.width,y:lb.y+lb.height}]
                    .map(p=>{const sp=root.createSVGPoint();sp.x=p.x;sp.y=p.y;return sp.matrixTransform(tr);});
                const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
                const bb={x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
                if(bb.x>=RECT.minX && bb.x+bb.width<=RECT.maxX && bb.y>=RECT.minY && bb.y+bb.height<=RECT.maxY) {
                    const clone = el.cloneNode(true); clone.removeAttribute('transform'); clone.setAttribute('transform', matrixToString(tr)); newSvg.appendChild(clone);
                }
            }catch(e){}
        });
        res = new XMLSerializer().serializeToString(newSvg);
    } finally { document.body.removeChild(div); }
    return res;
}

function computeGroupBBox(g, orig) {
    const tmp = document.createElementNS('http://www.w3.org/2000/svg','svg');
    ['viewBox','width','height'].forEach(a=>{const v=orig.getAttribute(a); if(v) tmp.setAttribute(a,v);});
    if(!tmp.getAttribute('viewBox')) tmp.setAttribute('viewBox','0 0 1000 600');
    tmp.style.cssText='position:absolute;visibility:hidden;pointer-events:none;'; document.body.appendChild(tmp);
    const clone = g.cloneNode(true); tmp.appendChild(clone);
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    clone.querySelectorAll('text').forEach(t=>{
        try{
            const bb = t.getBBox(); if(bb.width===0&&bb.height===0) return;
            const ctm = t.getCTM(); if(!ctm) return;
            [{x:bb.x,y:bb.y},{x:bb.x+bb.width,y:bb.y},{x:bb.x,y:bb.y+bb.height},{x:bb.x+bb.width,y:bb.y+bb.height}]
                .forEach(p=>{const sp=tmp.createSVGPoint();sp.x=p.x;sp.y=p.y;const tp=sp.matrixTransform(ctm); if(tp.x<minX)minX=tp.x; if(tp.y<minY)minY=tp.y; if(tp.x>maxX)maxX=tp.x; if(tp.y>maxY)maxY=tp.y;});
        }catch(e){}
    });
    document.body.removeChild(tmp);
    if(!isFinite(minX)) return null;
    return {x:minX,y:minY,width:maxX-minX,height:maxY-minY};
}

function groupTextsInSVG(svg) {
    const doc = new DOMParser().parseFromString(svg,'image/svg+xml'); const svgEl = doc.querySelector('svg'); if(!svgEl) throw new Error('no svg');
    const children = Array.from(svgEl.childNodes), newKids=[];
    let i=0; const groups=[];
    const isMain = n => n.nodeType===1 && n.tagName.toLowerCase()==='text' && MAIN_SIZES.some(s=>Math.abs(parseFloat((n.getAttribute('transform')||'').match(/matrix\(\s*([+-]?\d*\.?\d+)/)?.[1]||0)-s)<MAIN_SIZE_TOL);
    while(i<children.length) {
        const node = children[i];
        if(node.nodeType===1 && node.tagName.toLowerCase()==='text') {
            if(isMain(node)) {
                const items=[node]; let j=i+1;
                while(j<children.length && children[j].nodeType===1 && children[j].tagName.toLowerCase()==='text' && !isMain(children[j])) { items.push(children[j]); j++; }
                const g=document.createElementNS('http://www.w3.org/2000/svg','g'); items.forEach(it=>g.appendChild(it)); newKids.push(g); groups.push(g); i=j;
            } else { newKids.push(node); i++; }
        } else { newKids.push(node); i++; }
    }
    groups.forEach((g,idx)=>{
        g.setAttribute('id','block-'+(idx+1));
        const bb = computeGroupBBox(g, svgEl);
        if(bb) {
            const r = document.createElementNS('http://www.w3.org/2000/svg','rect');
            r.setAttribute('x',bb.x); r.setAttribute('y',bb.y); r.setAttribute('width',bb.width); r.setAttribute('height',bb.height); r.setAttribute('fill','#0f0');
            g.insertBefore(r, g.firstChild);
        }
    });
    while(svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
    newKids.forEach(c=>svgEl.appendChild(c));
    return { svgString: new XMLSerializer().serializeToString(svgEl), groupCount: groups.length };
}

function snapAndExtend(svg) {
    const doc = new DOMParser().parseFromString(svg,'image/svg+xml'); const svgEl = doc.querySelector('svg');
    svgEl.querySelectorAll('g').forEach(g=>{
        const r = g.querySelector('rect[fill="#0f0"]'); if(!r) return;
        const x=parseFloat(r.getAttribute('x')), y=parseFloat(r.getAttribute('y')), w=parseFloat(r.getAttribute('width')), h=parseFloat(r.getAttribute('height'));
        let cs=Math.floor((x-GRID.xMin)/GRID.colW), ce=Math.ceil((x+w-GRID.xMin)/GRID.colW)-1; cs=Math.max(0,Math.min(GRID.cols-1,cs)); ce=Math.max(0,Math.min(GRID.cols-1,ce)); if(cs>ce){r.remove();return;}
        let rs=Math.floor((y-GRID.yMin)/GRID.rowH), re=Math.ceil((y+h-GRID.yMin)/GRID.rowH)-1; rs=Math.max(0,Math.min(GRID.rows-1,rs)); re=Math.max(0,Math.min(GRID.rows-1,re)); if(rs>re){r.remove();return;}
        if((re-rs+1)===3 && rs>0) rs--;
        const nx=GRID.xMin+cs*GRID.colW, ny=GRID.yMin+rs*GRID.rowH, nw=(ce-cs+1)*GRID.colW, nh=(re-rs+1)*GRID.rowH;
        const p=document.createElementNS('http://www.w3.org/2000/svg','path'); p.setAttribute('d',`M${nx},${ny}h${nw}v${nh}h${-nw}Z`); p.setAttribute('fill',r.getAttribute('fill')||'#0f0');
        g.insertBefore(p,r); g.removeChild(r);
    });
    return new XMLSerializer().serializeToString(svgEl);
}

async function sampleColorFromSvgAt(bgSvgString, x, y) {
    const blob = new Blob([bgSvgString], {type:'image/svg+xml'}); const url = URL.createObjectURL(blob); const img = new Image();
    await new Promise((resolve,reject)=>{ img.onload=resolve; img.onerror=reject; img.src=url; });
    const parser = new DOMParser(); const doc = parser.parseFromString(bgSvgString,'image/svg+xml'); const svgEl = doc.querySelector('svg');
    let w=800,h=600;
    if(svgEl){ const vb=svgEl.getAttribute('viewBox'); if(vb){ const parts=vb.split(/\s+/); if(parts.length===4){ w=parseFloat(parts[2]); h=parseFloat(parts[3]); } } else { w=parseFloat(svgEl.getAttribute('width'))||w; h=parseFloat(svgEl.getAttribute('height'))||h; } }
    const canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h; const ctx = canvas.getContext('2d');
    ctx.drawImage(img,0,0,w,h); const pixel = ctx.getImageData(Math.round(x),Math.round(y),1,1).data; URL.revokeObjectURL(url);
    return `rgba(${pixel[0]},${pixel[1]},${pixel[2]},${pixel[3]/255})`;
}

async function recolorForegroundPaths(fgSvgString, bgSvgString) {
    const parser = new DOMParser(); const doc = parser.parseFromString(fgSvgString,'image/svg+xml'); const svg = doc.querySelector('svg');
    if(!svg) return fgSvgString;
    const paths = svg.querySelectorAll('path');
    for(const path of paths){
        const d = path.getAttribute('d'); if(!d) continue;
        const match = d.match(/M\s*([\d.]+)\s*,\s*([\d.]+)/); if(!match) continue;
        const x=parseFloat(match[1]), y=parseFloat(match[2]);
        const sampleX=x+5, sampleY=y+5;
        try { const color = await sampleColorFromSvgAt(bgSvgString, sampleX, sampleY); path.setAttribute('fill', color); } catch(e){}
    }
    return new XMLSerializer().serializeToString(svg);
}

function processSVGToReport(svg, classLabel) {
    const div = document.createElement('div'); div.style.cssText='position:absolute;visibility:hidden;width:0;height:0;'; div.innerHTML=svg; document.body.appendChild(div);
    let blocks=[];
    try{
        const svgEl = div.querySelector('svg'); const root=svgEl;
        svgEl.querySelectorAll('g[id^="block-"]').forEach(g=>{
            const path=g.querySelector('path'); if(!path) return;
            const texts=Array.from(g.querySelectorAll('text')); const cnt=texts.length; if(cnt!==3&&cnt!==4) return;
            const bb = getRootBBox(path, root); if(!bb) return;
            const minX=bb.x, minY=bb.y, w=bb.width, h=bb.height; const maxX=minX+w, centerY=minY+h/2;
            const subject=texts[0]?.textContent?.trim()||'', teacher=texts[1]?.textContent?.trim()||'', room=texts[2]?.textContent?.trim()||'';
            const color=getFill(path);
            let dayIdx=Math.floor((centerY-RECT.minY)/DAY_HEIGHT+0.001); dayIdx=Math.max(0,Math.min(4,dayIdx));
            let startDiv=Math.round((minX-RECT.minX)/X_DIV); startDiv=Math.max(0,Math.min(8,startDiv));
            let endDiv=Math.round((maxX-RECT.minX)/X_DIV); endDiv=Math.max(0,Math.min(8,endDiv));
            blocks.push({minX,minY,maxX,width:w,height:h,textCount:cnt,subject,teacher,room,color,startDiv,endDiv,dayIdx});
        });
    } finally { document.body.removeChild(div); }
    const classify = b => {
        const h=b.height, cnt=b.textCount, cy=b.minY+h/2, dayTop=RECT.minY+b.dayIdx*DAY_HEIGHT;
        if(Math.abs(h-DAY_HEIGHT)<=TOLERANCE && cnt===3) return {type:1,week:'C',group:0};
        if(Math.abs(h-DAY_HEIGHT/2)<=TOLERANCE && cnt===3) { const half=Math.round((cy-dayTop)/(DAY_HEIGHT/2)-0.5); return {type:2,week:half===0?'A':'B',group:0}; }
        if(Math.abs(h-DAY_HEIGHT/2)<=TOLERANCE && cnt===4) { const half=Math.round((cy-dayTop)/(DAY_HEIGHT/2)-0.5); return {type:3,week:'C',group:half===0?1:2}; }
        if(Math.abs(h-DAY_HEIGHT/4)<=TOLERANCE && cnt===4) { const q=Math.round((cy-dayTop)/(DAY_HEIGHT/4)-0.5); const idx=Math.min(3,Math.max(0,q)); return {type:4,week:idx<=1?'A':'B',group:idx%2===0?1:2}; }
        return {type:0,week:'',group:0};
    };
    blocks.forEach(b=>{const c=classify(b);b.type=c.type;b.week=c.week;b.group=c.group;});
    blocks.sort((a,b)=>a.dayIdx-b.dayIdx||a.startDiv-b.startDiv||a.minY-b.minY);
    return blocks.map(b=>`Start: ${b.startDiv}\nEnd: ${b.endDiv}\nDay: ${b.dayIdx}\nSubject: ${b.subject}\nRoom: ${b.room}\nClass: ${classLabel}\nTeacher: ${b.teacher}\nColor: ${b.color}\nType: ${b.type}\nWeek: ${b.week}\nGroup: ${b.group}`).join('\n\n');
}

export async function processPDFBuffer(arrayBuffer, grade) {
    const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    const numPages = pdf.numPages; const pages = [];
    for(let i=1;i<=numPages;i++){
        const page = await pdf.getPage(i);
        const rawSvg = await convertPageToRawSvg(page);
        const bgSvg = await getBackgroundSvg(page);
        const classLabel = detectClassFromSVG(rawSvg) || `${grade}?`;
        pages.push({rawSvg, bgSvg, classLabel, grade, pageNum:i, report:null, recoloredSvg:null});
    }
    return pages;
}

export async function processAllPages(pagesArray) {
    if(pagesArray.length===0) throw new Error('No pages');
    pagesArray.sort((a,b)=>{
        if(a.grade!==b.grade) return a.grade - b.grade;
        const aL=(a.classLabel||'').slice(-1).toUpperCase();
        const bL=(b.classLabel||'').slice(-1).toUpperCase();
        const ai=CLASS_LETTER_ORDER.indexOf(aL), bi=CLASS_LETTER_ORDER.indexOf(bL);
        if(ai!==-1 && bi!==-1 && ai!==bi) return ai - bi;
        if(ai!==-1 && bi===-1) return -1;
        if(ai===-1 && bi!==-1) return 1;
        return (a.classLabel||'').localeCompare(b.classLabel||'');
    });
    for(const p of pagesArray) {
        const filtered = filterSVG(p.rawSvg);
        const grouped = groupTextsInSVG(filtered);
        const snapped = snapAndExtend(grouped.svgString);
        const recolored = await recolorForegroundPaths(snapped, p.bgSvg);
        p.recoloredSvg = recolored;
        p.report = processSVGToReport(recolored, p.classLabel);
        await new Promise(r => setTimeout(r,0));
    }
    return pagesArray;
}

export function mergeNewPages(newPagesArray) {
    const existingClasses = new Set(state.allLessons.map(l => l.className));
    let addedCount=0, skippedCount=0; const newLessons=[];
    for(const page of newPagesArray) {
        if(page.report) {
            const lessons = parseReport(page.report);
            const classSet = new Set(lessons.map(l => l.className));
            const alreadyHas = [...classSet].some(c => existingClasses.has(c));
            if(alreadyHas) { skippedCount += lessons.length; continue; }
            newLessons.push(...lessons); addedCount += lessons.length;
        }
    }
    if(newLessons.length > 0) {
        state.allLessons = sortLessonsByClassThenTime([...state.allLessons, ...newLessons]);
        state.combinedReportText = generateCombinedReportFromLessons(state.allLessons);
        reportInput.value = state.combinedReportText;
    }
    return { added: addedCount, skipped: skippedCount };
}

export async function fetchPDFViaNetlifyFunction(url) {
    const response = await fetch(`/api/fetch-pdf?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error(`Netlify function returned ${response.status}`);
    return await response.arrayBuffer();
}

export function getGradeFromFilename(filename) {
    const match = filename.match(/(\d+)/);
    if(match) { const n = parseInt(match[1]); if(n>=8 && n<=12) return n; }
    return 0;
}
