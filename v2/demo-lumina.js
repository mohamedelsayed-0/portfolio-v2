// Lumina toy: text -> LaTeX. Tokenizer + recursive grammar; DOM spans/classes, textContent only.
(function(){
"use strict";
var mount=document.getElementById("demo-lumina-mount");
if(!mount)return;
var GN="alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega".split(" ");
var GC="αβγδεζηθικλμνξοπρστυφχψω",GL={},GU={};
for(var gi=0;gi<GN.length;gi++){GL[GN[gi]]=GC.charAt(gi);GU[GN[gi].charAt(0).toUpperCase()+GN[gi].slice(1)]=GC.charAt(gi).toUpperCase();}
var OPMAP={"^":"caret","_":"underscore","/":"slash","*":"star","+":"plus","-":"minus","=":"eq","(":"lparen",")":"rparen","<":"lt",">":"gt"};
function tokenize(str){
var out=[],i=0,n=str.length;
while(i<n){
var c=str.charAt(i);
if(/\s/.test(c)){i++;continue;}
if(/[A-Za-z]/.test(c)){
var j=i+1;
while(j<n&&/[A-Za-z]/.test(str.charAt(j)))j++;
out.push({type:"ident",text:str.slice(i,j)});i=j;continue;
}
if(/[0-9]/.test(c)){
var k=i+1;
while(k<n&&/[0-9.]/.test(str.charAt(k)))k++;
out.push({type:"num",text:str.slice(i,k)});i=k;continue;
}
if(c==="<"&&str.charAt(i+1)==="="){out.push({type:"le",text:"<="});i+=2;continue;}
if(c===">"&&str.charAt(i+1)==="="){out.push({type:"ge",text:">="});i+=2;continue;}
if(c==="!"&&str.charAt(i+1)==="="){out.push({type:"ne",text:"!="});i+=2;continue;}
out.push({type:OPMAP[c]||"other",text:c});i++;
}
return out;
}
var toks=[],pos=0,RULES=null;
function atEnd(){return pos>=toks.length;}
function peek(){return atEnd()?null:toks[pos];}
function adv(){return toks[pos++];}
function isId(t,w){return !!t&&t.type==="ident"&&t.text.toLowerCase()===w;}
function fire(cat){if(RULES)RULES[cat]=1;}
function seqUntil(stop){
var ch=[];
while(!atEnd()){
if(stop(peek()))break;
var before=pos,node=parseItem();
if(node)ch.push(node);
if(pos===before)pos++;
}
return{kind:"seq",children:ch};
}
function parseItem(){
var t=peek();
if(!t)return null;
if(isId(t,"integral"))return parseIntegral();
if(isId(t,"sum"))return parseSum();
return parseAtomOrOp();
}
function parseIntegral(){
adv();
if(isId(peek(),"of"))adv();
var body=seqUntil(function(t){return isId(t,"dx");});
if(isId(peek(),"dx"))adv();
var lo=null,hi=null;
if(isId(peek(),"from")){
adv();lo=parseAtomOrOp();
if(isId(peek(),"to")){adv();hi=parseAtomOrOp();}
}
fire("integral");
return{kind:"int",lo:lo,hi:hi,body:body};
}
function parseSum(){
adv();
if(isId(peek(),"from"))adv();
var idx=null,lo=null,hi=null;
if(peek()&&peek().type==="ident")idx=adv().text;
if(peek()&&peek().type==="eq"){adv();lo=parseAtomOrOp();}
if(isId(peek(),"to")){adv();hi=parseAtomOrOp();}
if(isId(peek(),"of"))adv();
fire("sum");
return{kind:"sum",idx:idx,lo:lo,hi:hi,body:seqUntil(function(){return false;})};
}
function parseSqrt(){
adv();
if(peek()&&peek().type==="lparen"){
adv();
var inner=seqUntil(function(t){return t.type==="rparen";});
if(peek()&&peek().type==="rparen")adv();
fire("sqrt");
return{kind:"sqrt",inner:inner};
}
fire("text-escape");
return{kind:"unknown",text:"sqrt"};
}
function parsePrimary(){
var t=peek();
if(!t)return null;
if(t.type==="ident"){
var lw=t.text.toLowerCase();
if(lw==="sqrt")return parseSqrt();
if(lw==="infinity"){adv();fire("infinity");return{kind:"sym",latex:"\\infty",uni:"∞"};}
if(GL.hasOwnProperty(t.text)){adv();fire("greek");return{kind:"sym",latex:"\\"+t.text,uni:GL[t.text]};}
if(GU.hasOwnProperty(t.text)){adv();fire("greek");return{kind:"sym",latex:"\\"+t.text,uni:GU[t.text]};}
adv();
if(t.text.length===1)return{kind:"word",text:t.text};
fire("text-escape");
return{kind:"unknown",text:t.text};
}
if(t.type==="num"){adv();return{kind:"text",value:t.text};}
if(t.type==="lparen"){
adv();
var inner=seqUntil(function(tok){return tok.type==="rparen";});
if(peek()&&peek().type==="rparen")adv();
return{kind:"paren",inner:inner};
}
adv();
return{kind:"text",value:t.text};
}
function parsePostfix(node){
for(;;){
var t=peek();
if(!t)break;
if(t.type==="caret"){
adv();var exp=parsePrimary();
if(exp===null){node={kind:"seq",children:[node,{kind:"text",value:"^"}]};break;}
fire("sup/sub");node={kind:"sup",base:node,exp:exp};
}else if(t.type==="underscore"){
adv();var sub=parsePrimary();
if(sub===null){node={kind:"seq",children:[node,{kind:"text",value:"_"}]};break;}
fire("sup/sub");node={kind:"sub",base:node,sub:sub};
}else if(t.type==="slash"){
adv();var den=parsePrimary();
if(den===null){node={kind:"seq",children:[node,{kind:"text",value:"/"}]};break;}
fire("fraction");node={kind:"frac",num:node,den:den};
}else break;
}
return node;
}
var SYM={star:["\\cdot","·","multiply"],le:["\\le","≤","comparison"],ge:["\\ge","≥","comparison"],ne:["\\ne","≠","comparison"]};
var LIT={plus:"+",minus:"-",eq:"=",lt:"<",gt:">",rparen:")"};
function parseAtomOrOp(){
var t=peek();
if(!t)return null;
if(SYM[t.type]){adv();var y=SYM[t.type];fire(y[2]);return{kind:"sym",latex:y[0],uni:y[1]};}
if(LIT[t.type]){adv();return{kind:"text",value:LIT[t.type]};}
if(t.type==="other"){adv();return{kind:"text",value:t.text};}
return parsePostfix(parsePrimary());
}
function parseProgram(tokens){
toks=tokens;pos=0;
return seqUntil(function(){return false;});
}
function toLatex(node){
if(!node)return"";
switch(node.kind){
case"seq":
var parts=[];
for(var i=0;i<node.children.length;i++){var s=toLatex(node.children[i]);if(s)parts.push(s);}
return parts.join(" ");
case"text":return node.value;
case"word":return node.text;
case"unknown":return"\\text{"+node.text+"}";
case"sym":return node.latex;
case"sup":return toLatex(node.base)+"^{"+toLatex(node.exp)+"}";
case"sub":return toLatex(node.base)+"_{"+toLatex(node.sub)+"}";
case"frac":return"\\frac{"+toLatex(node.num)+"}{"+toLatex(node.den)+"}";
case"sqrt":return"\\sqrt{"+toLatex(node.inner)+"}";
case"paren":return"("+toLatex(node.inner)+")";
case"int":
var si="\\int";
if(node.lo)si+="_{"+toLatex(node.lo)+"}";
if(node.hi)si+="^{"+toLatex(node.hi)+"}";
return si+" "+toLatex(node.body)+" \\,dx";
case"sum":
var ss="\\sum";
if(node.idx)ss+="_{"+node.idx+"="+toLatex(node.lo)+"}";
if(node.hi)ss+="^{"+toLatex(node.hi)+"}";
return ss+" "+toLatex(node.body);
default:return"";
}
}
function el(tag,cls,child){
var e=document.createElement(tag);
if(cls)e.className=cls;
if(child)e.appendChild(child);
return e;
}
function buildPreview(node){
if(!node)return document.createDocumentFragment();
var e,frag,i;
switch(node.kind){
case"seq":
frag=document.createDocumentFragment();
for(i=0;i<node.children.length;i++){
if(i>0)frag.appendChild(document.createTextNode(" "));
frag.appendChild(buildPreview(node.children[i]));
}
return frag;
case"text":case"word":case"unknown":return document.createTextNode(node.value||node.text);
case"sym":return document.createTextNode(node.uni);
case"sup":
e=el("span","lx-sup-wrap",buildPreview(node.base));
e.appendChild(el("sup","lx-sup",buildPreview(node.exp)));
return e;
case"sub":
e=el("span","lx-sub-wrap",buildPreview(node.base));
e.appendChild(el("sub","lx-sub",buildPreview(node.sub)));
return e;
case"frac":
e=el("span","lx-frac");
e.appendChild(el("span","lx-num",buildPreview(node.num)));
e.appendChild(el("span","lx-den",buildPreview(node.den)));
return e;
case"sqrt":
e=el("span","lx-sqrt");
e.appendChild(el("span","lx-sqrt-sign")).textContent="√";
e.appendChild(el("span","lx-sqrt-body",buildPreview(node.inner)));
return e;
case"paren":
frag=document.createDocumentFragment();
frag.appendChild(document.createTextNode("("));
frag.appendChild(buildPreview(node.inner));
frag.appendChild(document.createTextNode(")"));
return frag;
case"int":
case"sum":
var isSum=node.kind==="sum";
e=el("span","lx-int"+(isSum?" lx-sum":""));
e.appendChild(el("span","lx-int-op")).textContent=isSum?"∑":"∫";
var loEl=el("span","lx-lo");
if(isSum&&node.idx)loEl.appendChild(document.createTextNode(node.idx+"="));
loEl.appendChild(buildPreview(node.lo));
var bounds=el("span","lx-bounds",el("span","lx-hi",buildPreview(node.hi)));
bounds.appendChild(loEl);
e.appendChild(bounds);
frag=document.createDocumentFragment();
frag.appendChild(e);
frag.appendChild(document.createTextNode(" "));
frag.appendChild(el("span","lx-int-body",buildPreview(node.body)));
if(!isSum)frag.appendChild(document.createTextNode("  dx"));
return frag;
default:return document.createDocumentFragment();
}
}
function convert(raw){
var truncated=false,text=raw;
if(text.length>2000){text=text.slice(0,2000);truncated=true;}
RULES={};
var ast=parseProgram(tokenize(text));
var latex=toLatex(ast),frag=buildPreview(ast);
var ruleCount=0;
for(var k in RULES)if(RULES.hasOwnProperty(k))ruleCount++;
return{latex:latex,frag:frag,tokenCount:toks.length,ruleCount:ruleCount,truncated:truncated};
}
var ta=el("textarea","lumina-in");
ta.setAttribute("spellcheck","false");
ta.setAttribute("aria-label","plain text to convert to LaTeX");
ta.value="integral of alpha x^2 dx from 0 to infinity";
var rd=el("div","lumina-render");
var sp=el("pre","lumina-src");
var cb=el("button","demo-btn");
cb.type="button";
cb.textContent="copy";
var leftHead=el("div","lum-head");
leftHead.textContent="plain text";
var leftPane=el("div","lum-pane");
leftPane.appendChild(leftHead);
leftPane.appendChild(ta);
var rightHead=el("div","lum-head");
rightHead.textContent="rendered";
var card=el("div","lum-card");
card.appendChild(rd);
var latexHead=el("div");
latexHead.className="lum-head lum-latex-head";
latexHead.appendChild(document.createTextNode("latex "));
latexHead.appendChild(cb);
var rightPane=el("div","lum-pane");
rightPane.appendChild(rightHead);
rightPane.appendChild(card);
rightPane.appendChild(latexHead);
rightPane.appendChild(sp);
var ro=el("div","demo-readout");
mount.appendChild(leftPane);
mount.appendChild(rightPane);
mount.appendChild(ro);
cb.addEventListener("click",function(){
if(!navigator.clipboard||!navigator.clipboard.writeText)return;
navigator.clipboard.writeText(sp.textContent).then(function(){
cb.textContent="copied";
setTimeout(function(){cb.textContent="copy";},1200);
},function(){});
});
function update(){
var raw=ta.value;
while(rd.firstChild)rd.removeChild(rd.firstChild);
rd.classList.toggle("lx-display",raw.indexOf("\n")===-1&&raw.trim().length>0);
if(raw.length===0){
sp.textContent="";
ro.textContent="0 tokens · 0 rules";
return;
}
var r=convert(raw);
rd.appendChild(r.frag);
sp.textContent=r.latex;
var stat=r.tokenCount+" tokens · "+r.ruleCount+" rules";
if(r.truncated)stat+=" · truncated";
ro.textContent=stat;
}
var dt=null;
ta.addEventListener("input",function(){
clearTimeout(dt);
dt=setTimeout(update,120);
});
update();
})();
