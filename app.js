"use strict";
const CFG = window.BODA_CONFIG || {};
const TOKEN = new URLSearchParams(location.search).get('i') || '';
const DEMO = new URLSearchParams(location.search).get('demo') === '1';
const $ = id => document.getElementById(id);
let INVITACION=null, CORTE_CERRADO=false, BUSY=false;
const API = (CFG.apiUrl||'').replace(/\/$/,'');
function mensaje(txt,fallo=false){const c=$('resultado');c.className=fallo?'error':'success';c.textContent=txt;}
function mapa(dir){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(dir);}
function texto(id,v){$(id).textContent=String(v??'');}
function contador(iso){const fin=new Date(iso).getTime();function paso(){let s=Math.max(0,fin-Date.now());texto('days',Math.floor(s/86400000));texto('hours',String(Math.floor(s/3600000)%24).padStart(2,'0'));texto('minutes',String(Math.floor(s/60000)%60).padStart(2,'0'));texto('seconds',String(Math.floor(s/1000)%60).padStart(2,'0'));}paso();setInterval(paso,1000);}
function habilitarBotones(si){$('btnConfirmar').disabled=!si;$('btnNo').disabled=!si;}
function limitarSeleccion(){const c=[...$('choices').querySelectorAll('input:checked')].length;[...$('choices').querySelectorAll('input')].forEach(i=>i.disabled=(c>=INVITACION.cupos&&!i.checked)||CORTE_CERRADO||BUSY);}
function mostrar(datos){
 if(!datos || !datos.evento || !datos.invitacion || typeof datos.rsvpAbierto!=='boolean' || !datos.fechaCorteLegible){throw new Error('No pudimos cargar tu invitación. Intenta de nuevo en unos minutos o contacta a los novios.');}
 INVITACION=datos.invitacion;const e=datos.evento;CORTE_CERRADO=!datos.rsvpAbierto;
 texto('saludo',saludoLimpio(INVITACION));texto('mensajePersonal',INVITACION.mensaje||'Nos haría muy felices compartir este día contigo.');
 texto('cuposMensaje','Hemos reservado '+INVITACION.cupos+(INVITACION.cupos===1?' lugar especialmente para ti.':' lugares especialmente para ustedes.'));
 ['iglesia','recepcion'].forEach(id=>texto(id,e[id]));texto('dirIglesia',e.direccionIglesia);texto('dirRecepcion',e.direccionRecepcion);texto('horaIglesia',e.horaIglesia);texto('horaRecepcion',e.horaRecepcion);texto('vestimenta',e.dressCode);texto('codigoRegalo','Código: '+e.codigoRegalo);
 $('mapaIglesia').href=mapa(e.direccionIglesia);$('mapaRecepcion').href=mapa(e.direccionRecepcion);
 if(e.urlRegalos&&/^https:\/\//.test(e.urlRegalos)){$('btnRegalos').href=e.urlRegalos;}else{$('btnRegalos').classList.add('hidden');$('regalosAviso').classList.remove('hidden');}
 texto('deadline','Confirma tu asistencia hasta el '+datos.fechaCorteLegible+'.');contador(e.fechaISO);
 const cont=$('choices');cont.replaceChildren();
 INVITACION.invitados.forEach((nom,idx)=>{const fila=document.createElement('label');fila.className='choice';const input=document.createElement('input');input.type='checkbox';input.value=String(idx);input.checked=INVITACION.indicesConfirmados.includes(idx);input.addEventListener('change',limitarSeleccion);const span=document.createElement('span');span.textContent=nom;fila.append(input,span);cont.append(fila);});
 $('restricciones').value=INVITACION.restricciones||'';
 $('btnNo').textContent=INVITACION.cupos===1?'No podré asistir':'No podremos asistir';
 const estado=INVITACION.estado;
 texto('rsvpState',estado==='CONFIRMADA'?'¡Ya recibimos tu confirmación! Puedes modificarla hasta la fecha de cierre.':estado==='NO_ASISTE'?'Nos informaste que no asistirás. Puedes cambiar tu respuesta hasta la fecha de cierre.':'Marca a las personas que asistirán y confirma tu respuesta.');
 $('loading').classList.add('hidden');$('rsvpBody').classList.remove('hidden');
 if(CORTE_CERRADO){$('rsvpForm').classList.add('hidden');$('closedBox').classList.remove('hidden');texto('closedText','La fecha límite fue el '+datos.fechaCorteLegible+'. '+(estado==='CONFIRMADA'?'Tu confirmación quedó registrada.':estado==='NO_ASISTE'?'Registramos que no asistirás.':'No tenemos una respuesta registrada para esta invitación.')+' Si necesitas realizar algún cambio, contacta directamente a los novios.');}
 else{$('rsvpForm').classList.remove('hidden');$('closedBox').classList.add('hidden');limitarSeleccion();}
}
// Quita "Querido/a/os/as" del saludo de la planilla y pone mayúscula inicial.
function saludoLimpio(inv){let s=String(inv.saludo||'').trim().replace(/^quer(?:id[oa]s?)\s+/i,'').trim();if(!s){const n=inv.invitados||[];s=n.length>1?n.slice(0,-1).join(', ')+' y '+n[n.length-1]:(n[0]||'');}return s.charAt(0).toLocaleUpperCase('es')+s.slice(1);}
function errorCarga(err){
 const msg=(err&&err.message)||'No pudimos abrir la invitación. Contacta a los novios.';
 texto('saludo','¡Ups!');texto('mensajePersonal',msg);texto('cuposMensaje','');
 const l=$('loading');l.className='error';l.replaceChildren(document.createTextNode(msg+' '));
 const b=document.createElement('button');b.type='button';b.className='btn';b.style.marginTop='10px';b.textContent='Reintentar';b.addEventListener('click',()=>location.reload());l.append(document.createElement('br'),b);
}
// JSONP solo para LECTURA: ContentService redirige a googleusercontent.com, sin CORS.
// El token identifica un solo grupo; el backend NUNCA devuelve toda la lista.
// LECTURA: primero fetch (CORS, no lo bloquean los navegadores de celular); si falla, JSONP como respaldo.
async function leerInvitacion(){
 if(!API || !/\/exec$/.test(API))throw new Error('Configura apiUrl en config.js con tu enlace /exec.');
 try{return await leerConFetch();}
 catch(e){if(e&&e.servidor)throw e;return await leerConJsonp();}
}
async function leerConFetch(){
 const url=new URL(API);url.searchParams.set('accion','leer');url.searchParams.set('i',TOKEN);url.searchParams.set('callback','cb');url.searchParams.set('_',String(Date.now()));
 const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),15000);
 try{
  const r=await fetch(url.toString(),{method:'GET',mode:'cors',credentials:'omit',redirect:'follow',cache:'no-store',signal:ctl.signal});
  const txt=(await r.text()).trim();
  const m=txt.match(/^cb\(([\s\S]*)\);?$/);if(!m)throw new Error('respuesta no válida');
  const res=JSON.parse(m[1]);
  if(res&&res.ok&&res.data)return res.data;
  const err=new Error(res&&res.error||'No se pudo consultar la invitación.');err.servidor=true;throw err;
 }finally{clearTimeout(t);}
}
function leerConJsonp(){return new Promise((resolve,reject)=>{
 if(!API || !/\/exec$/.test(API))return reject(new Error('Configura apiUrl en config.js con tu enlace /exec.'));
 const cb='__boda_'+Math.random().toString(36).slice(2)+Date.now().toString(36);let done=false;
 const script=document.createElement('script');let timer;
 function clean(){if(done)return;done=true;clearTimeout(timer);delete window[cb];script.remove();}
 window[cb]=res=>{clean();if(res?.ok&&res.data)resolve(res.data);else reject(new Error(res?.error||'No se pudo consultar la invitación.'));};
 script.onerror=()=>{clean();reject(new Error('No pudimos conectarnos para cargar tu invitación. Revisa tu conexión e inténtalo de nuevo.'));};
 const url=new URL(API);url.searchParams.set('accion','leer');url.searchParams.set('i',TOKEN);url.searchParams.set('callback',cb);url.searchParams.set('_',String(Date.now()));script.src=url.toString();
 timer=setTimeout(()=>{clean();reject(new Error('La invitación tardó demasiado en cargar. Actualiza la página para intentarlo de nuevo.'));},18000);
 document.head.appendChild(script);
});}
// ENVÍO: POST opaco (sin CORS). No afirmamos éxito hasta comprobar en Sheets con otra lectura.
async function guardarEnSheets(payload){
 const cuerpo=new URLSearchParams({accion:'guardar',payload:JSON.stringify(payload)});
 await fetch(API,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:cuerpo.toString(),redirect:'follow'});
 // El POST no permite leer la respuesta desde GitHub Pages; verificamos el estado guardado.
 for(let t=0;t<7;t++){
  await new Promise(r=>setTimeout(r,t===0?900:1250));
  try{
   const dato=await leerInvitacion();const x=dato.invitacion;
   const esperado=payload.respuesta==='SI'?'CONFIRMADA':'NO_ASISTE';
   const a=JSON.stringify([...payload.indices].sort((x,y)=>x-y));
   const b=JSON.stringify([...x.indicesConfirmados].sort((x,y)=>x-y));
   if(x.estado===esperado&&a===b&&String(x.restricciones||'').trim()===String(payload.restricciones||'').trim())return dato;
   if(!dato.rsvpAbierto)throw new Error('El plazo para confirmar ya está cerrado.');
  }catch(e){if(/plazo.*cerrado/.test(e.message))throw e;}
 }
 throw new Error('No pudimos comprobar que tu respuesta se guardó. Actualiza la página para revisarla antes de volver a enviarla, o contacta a los novios.');
}
async function enviar(asistira){
 if(BUSY||CORTE_CERRADO)return;
 const indices=[...$('choices').querySelectorAll('input:checked')].map(i=>Number(i.value));
 if(asistira&&!indices.length){mensaje('Selecciona al menos a una persona que asistirá.',true);return;}
 BUSY=true;habilitarBotones(false);limitarSeleccion();mensaje('Guardando tu respuesta…');
 try{
  if(DEMO){await new Promise(r=>setTimeout(r,450));INVITACION.estado=asistira?'CONFIRMADA':'NO_ASISTE';mensaje('Modo demostración: no se modificó Google Sheets.');return;}
  const payload={token:TOKEN,respuesta:asistira?'SI':'NO',indices:asistira?indices:[],restricciones:$('restricciones').value};
  const actualizado=await guardarEnSheets(payload);INVITACION=actualizado.invitacion;CORTE_CERRADO=!actualizado.rsvpAbierto;
  // Refleja en pantalla lo que quedó guardado en Sheets (por ejemplo, desmarca todo si respondió que no).
  [...$('choices').querySelectorAll('input')].forEach(i=>i.checked=INVITACION.indicesConfirmados.includes(Number(i.value)));
  mensaje(asistira?'¡Gracias! Tu asistencia quedó registrada.':'Gracias por avisarnos. Registramos que no podrás asistir.');
  texto('rsvpState',asistira?'¡Confirmación recibida! Puedes modificarla hasta la fecha de cierre.':'Registramos tu respuesta. Puedes cambiarla hasta la fecha de cierre.');
 }catch(e){mensaje(e?.message||'No fue posible guardar tu respuesta.',true);}finally{BUSY=false;habilitarBotones(true);limitarSeleccion();}
}
$('rsvpForm').addEventListener('submit',e=>{e.preventDefault();enviar(true);});$('btnNo').addEventListener('click',()=>enviar(false));
const audioBoda=$('musicAudio');audioBoda.loop=true;
function actualizarMusica(sonando){$('musicToggle').textContent=sonando?'Ⅱ':'▶';texto('musicStatus',sonando?'Nuestra canción':'Toca play para escuchar nuestra canción');}
function reproducirMusica(){const p=audioBoda.play();if(p?.then)p.then(()=>actualizarMusica(true)).catch(()=>actualizarMusica(false));}
document.body.style.overflow='hidden'; // la página no se desplaza detrás del sobre
$('openEnvelope').addEventListener('click',()=>{$('openCover').classList.add('is-open');document.body.style.overflow='';reproducirMusica();});
$('musicToggle').addEventListener('click',()=>audioBoda.paused?reproducirMusica():(audioBoda.pause(),actualizarMusica(false)));
audioBoda.addEventListener('pause',()=>actualizarMusica(false));audioBoda.addEventListener('playing',()=>actualizarMusica(true));
const DEMO_DATA={evento:{fechaISO:'2027-02-20T17:30:00-03:00',iglesia:'Iglesia de San Ignacio',direccionIglesia:'Padre Alonso de Ovalle 1494, Santiago, Chile',horaIglesia:'17:30 horas',recepcion:'Casona San Ignacio',direccionRecepcion:'Caupolicán 8611, Quilicura, Chile',horaRecepcion:'19:30 horas',dressCode:'Etiqueta formal',codigoRegalo:'17794426',urlRegalos:''},fechaCorteLegible:'20 de enero de 2027',rsvpAbierto:true,invitacion:{saludo:'Queridos Camila y Diego',invitados:['Camila','Diego'],cupos:2,mensaje:'Qué alegría compartir este día con ustedes.',estado:'PENDIENTE',indicesConfirmados:[],restricciones:''}};
if(DEMO){try{mostrar(DEMO_DATA);}catch(e){errorCarga(e);}}
else if(!/^[a-f0-9]{12,32}$/.test(TOKEN)){errorCarga(new Error('Falta un código de invitación válido en el enlace.'));}
else{leerInvitacion().then(mostrar).catch(errorCarga);}
