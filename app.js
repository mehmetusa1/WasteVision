/* ═══════════════════════════════════════════════════════
   WasteVision – app.js  |  Solana Devnet + Phantom
   ═══════════════════════════════════════════════════════ */

// ─── 1. SOLANA CONFIG ────────────────────────────────────
const PROGRAM_ID_STR = "11111111111111111111111111111111"; // deploy sonrası güncelle
const SOLANA_NETWORK = "https://api.devnet.solana.com";
const EXPLORER_BASE  = "https://explorer.solana.com/tx/";
const EXPLORER_QUERY = "?cluster=devnet";

// SPL / System IDs
const TOKEN_PROGRAM_ID_STR  = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const ATA_PROGRAM_ID_STR    = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bsW";
const SYSTEM_PROGRAM_ID_STR = "11111111111111111111111111111111";
const SYSVAR_RENT_STR       = "SysvarRent111111111111111111111111111111111";

// Ödül oranları – Rust programı ile birebir
const REWARD_RATES = { 0:5, 1:3, 2:10, 3:2, 4:1, 5:1, 6:1 };
const WASTE_TYPES  = ["Plastik","Cam","Metal","Kağıt","Organik","Tehlikeli","E-Atık"];
const WVT_DECIMALS = 9;
const MIN_AMOUNT   = 100;

// ─── 2. STATE ────────────────────────────────────────────
var connection = null;
var userPublicKey = null;
var isConnected   = false;
var aiModel       = null;
var aiPredictedType = null;

// DOM refs
var elBtnConnect, elBtnDisconnect, elAddressPill, elWalletAddr,
    elBalanceBadge, elWvtBalance, elWalletWarning, elTxStatus,
    elTxMessage, elTxTableBody, elRewardAmount, elBtnRecord;

// İzmir çöp noktaları (korundu)
var IZMIR_BINS = [
  { name:"Konak Meydanı",   lat:38.4189, lon:27.1287 },
  { name:"Alsancak Kordon", lat:38.4385, lon:27.1420 },
  { name:"Karşıyaka Çarşı",lat:38.4552, lon:27.1121 },
  { name:"Bornova Meydan",  lat:38.4633, lon:27.2166 },
  { name:"Buca Hasanağa",   lat:38.3813, lon:27.1651 }
];

// ─── 3. INIT ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function(){
  elBtnConnect    = document.getElementById("btnConnectWallet");
  elBtnDisconnect = document.getElementById("btnDisconnectWallet");
  elAddressPill   = document.getElementById("addressPill");
  elWalletAddr    = document.getElementById("walletAddress");
  elBalanceBadge  = document.getElementById("balanceBadge");
  elWvtBalance    = document.getElementById("wvtBalance");
  elWalletWarning = document.getElementById("walletWarning");
  elTxStatus      = document.getElementById("txStatus");
  elTxMessage     = document.getElementById("txMessage");
  elTxTableBody   = document.getElementById("txTableBody");
  elRewardAmount  = document.getElementById("rewardAmount");
  elBtnRecord     = document.getElementById("btnRecord");

  connection = new solanaWeb3.Connection(SOLANA_NETWORK, "confirmed");
  _initIntersections();
  _initScroll();
  _initDemoStats();
  _initAI();

  // Phantom otomatik bağlan
  if(window.solana && window.solana.isPhantom && !localStorage.getItem("wv_disconnected")){
    window.solana.connect({ onlyIfTrusted: true })
      .then(function(r){ _onConnected(r.publicKey); })
      .catch(function(){});
  }
});

// ─── 4. WALLET ───────────────────────────────────────────
function connectWallet(){
  if(!window.solana || !window.solana.isPhantom){
    _showToast("Phantom cüzdanı bulunamadı! phantom.app adresinden yükleyin.","error");
    window.open("https://phantom.app/","_blank");
    return;
  }
  localStorage.removeItem("wv_disconnected");
  elBtnConnect.disabled = true;
  elBtnConnect.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Bağlanıyor...';

  window.solana.connect()
    .then(function(r){ _onConnected(r.publicKey); })
    .catch(function(e){ _showToast("Bağlantı reddedildi: "+e.message,"error"); })
    .finally(function(){
      elBtnConnect.disabled = false;
      elBtnConnect.innerHTML = '<i class="bi bi-wallet2 me-2"></i>Phantom Bağla';
    });
}
window.connectWallet = connectWallet;

function disconnectWallet(){
  if(window.solana) window.solana.disconnect();
  userPublicKey = null; isConnected = false;
  localStorage.setItem("wv_disconnected","true");
  _updateWalletUI();
  _showToast("Cüzdan bağlantısı kesildi.","info");
}
window.disconnectWallet = disconnectWallet;

function _onConnected(pubkey){
  userPublicKey = pubkey;
  isConnected   = true;
  _updateWalletUI();
  _showToast("✅ Phantom bağlandı!","success");
  _refreshBalance();
  _refreshPlatformStats();

  window.solana.on("disconnect", function(){ disconnectWallet(); });
  window.solana.on("accountChanged", function(k){
    if(k){ userPublicKey=k; _updateWalletUI(); _refreshBalance(); }
    else  { disconnectWallet(); }
  });
}

function _updateWalletUI(){
  if(isConnected && userPublicKey){
    var s = userPublicKey.toString();
    elWalletAddr.textContent = s.slice(0,4)+"..."+s.slice(-4);
    elAddressPill.classList.remove("d-none");
    elBalanceBadge.classList.remove("d-none");
    elBtnConnect.classList.add("d-none");
    elBtnDisconnect.classList.remove("d-none");
    elWalletWarning.classList.add("d-none");
    var el = document.getElementById("footerContractAddr");
    if(el) el.textContent = PROGRAM_ID_STR;
    var ov = document.getElementById("aiDropzoneOverlay");
    if(ov) ov.classList.add("d-none");
  } else {
    elAddressPill.classList.add("d-none");
    elBalanceBadge.classList.add("d-none");
    elBtnConnect.classList.remove("d-none");
    elBtnDisconnect.classList.add("d-none");
    elWalletWarning.classList.remove("d-none");
    elWvtBalance.textContent = "0.00";
    var ov2 = document.getElementById("aiDropzoneOverlay");
    if(ov2) ov2.classList.remove("d-none");
  }
}

// ─── 5. PDA HELPERS ──────────────────────────────────────
function getProgramId(){
  return new solanaWeb3.PublicKey(PROGRAM_ID_STR);
}
function findPDA(seeds){
  return solanaWeb3.PublicKey.findProgramAddressSync(seeds, getProgramId());
}
function getProgramStatePDA(){ return findPDA([Buffer.from("program-state")]); }
function getUserStatsPDA(pk){ return findPDA([Buffer.from("user-stats"), pk.toBuffer()]); }
function getMintAuthorityPDA(){ return findPDA([Buffer.from("mint-authority")]); }
function getWvtMintPDA(){ return findPDA([Buffer.from("wvt-mint")]); }

async function getATA(mint, owner){
  var [ata] = await solanaWeb3.PublicKey.findProgramAddress(
    [ owner.toBuffer(),
      new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID_STR).toBuffer(),
      mint.toBuffer() ],
    new solanaWeb3.PublicKey(ATA_PROGRAM_ID_STR)
  );
  return ata;
}

// ─── 6. BORSH SERIALISATION ──────────────────────────────
function borshU8(v){ return new Uint8Array([v & 0xff]); }
function borshU64(v){
  var b = new Uint8Array(8), val = BigInt(v);
  for(var i=0;i<8;i++){ b[i]=Number(val & 0xffn); val>>=8n; }
  return b;
}
function borshString(s){
  var enc = new TextEncoder().encode(s);
  var len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, enc.length, true);
  return concat(len, enc);
}
function concat(...arrays){
  var total = arrays.reduce(function(a,b){ return a+b.length; },0);
  var out = new Uint8Array(total), offset=0;
  arrays.forEach(function(a){ out.set(a,offset); offset+=a.length; });
  return out;
}
async function getDiscriminator(name){
  var data = new TextEncoder().encode(name);
  var hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash).slice(0,8);
}

// ─── 7. BALANCE ──────────────────────────────────────────
async function _refreshBalance(){
  if(!userPublicKey) return;
  try {
    var [mint] = getWvtMintPDA();
    var ata = await getATA(mint, userPublicKey);
    var info = await connection.getTokenAccountBalance(ata);
    var formatted = parseFloat(info.value.uiAmountString).toFixed(2);
    elWvtBalance.textContent = formatted;
  } catch(e){ elWvtBalance.textContent = "0.00"; }
}

// ─── 8. PLATFORM STATS ───────────────────────────────────
async function _refreshPlatformStats(){
  try {
    var [statePDA] = getProgramStatePDA();
    var info = await connection.getAccountInfo(statePDA);
    if(!info) return;
    var data = info.data;
    // discriminator=8, authority=32, total_waste=8, total_records=8
    var offset = 8+32;
    var totalWasteGrams = Number(new DataView(data.buffer, data.byteOffset+offset, 8).getBigUint64(0, true));
    offset+=8;
    var totalRecords = Number(new DataView(data.buffer, data.byteOffset+offset, 8).getBigUint64(0, true));
    _animateCounter("totalWaste", Math.floor(totalWasteGrams/1000));
    _animateCounter("totalUsers", totalRecords);
  } catch(e){}
}

// ─── 9. RECORD WASTE ─────────────────────────────────────
async function handleRecordWaste(event){
  if(event) event.preventDefault();
  if(!isConnected || !userPublicKey){
    _showToast("Lütfen önce Phantom cüzdanınızı bağlayın!","warning"); return;
  }
  if(aiPredictedType === null){
    _showToast("Lütfen önce bir atık fotoğrafı yükleyin.","warning"); return;
  }

  var wasteType   = aiPredictedType;
  var amountGrams = 500;
  var location    = "AI Destekli Konum Tahmini";
  var rawEl       = document.getElementById("aiRawClass");
  var description = "AI Tespit: " + (rawEl ? rawEl.textContent.replace("Model Tahmini: ","") : "Bilinmiyor");

  _setFormLoading(true);
  _showTxStatus("Phantom onayı bekleniyor...");

  try {
    var programId       = getProgramId();
    var [statePDA]      = getProgramStatePDA();
    var [userStatsPDA]  = getUserStatsPDA(userPublicKey);
    var [mintAuthPDA]   = getMintAuthorityPDA();
    var [mintPDA]       = getWvtMintPDA();
    var userATA         = await getATA(mintPDA, userPublicKey);

    var disc = await getDiscriminator("global:record_waste");
    var ix_data = concat(
      disc,
      borshU8(wasteType),
      borshU64(amountGrams),
      borshString(location),
      borshString(description)
    );

    var keys = [
      { pubkey: userPublicKey,  isSigner:true,  isWritable:true  },
      { pubkey: userStatsPDA,   isSigner:false, isWritable:true  },
      { pubkey: statePDA,       isSigner:false, isWritable:true  },
      { pubkey: mintPDA,        isSigner:false, isWritable:true  },
      { pubkey: mintAuthPDA,    isSigner:false, isWritable:false },
      { pubkey: userATA,        isSigner:false, isWritable:true  },
      { pubkey: new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID_STR),  isSigner:false, isWritable:false },
      { pubkey: new solanaWeb3.PublicKey(ATA_PROGRAM_ID_STR),    isSigner:false, isWritable:false },
      { pubkey: solanaWeb3.SystemProgram.programId,              isSigner:false, isWritable:false },
      { pubkey: new solanaWeb3.PublicKey(SYSVAR_RENT_STR),       isSigner:false, isWritable:false }
    ];

    var ix = new solanaWeb3.TransactionInstruction({ programId:programId, keys:keys, data:Buffer.from(ix_data) });
    var tx = new solanaWeb3.Transaction().add(ix);
    var { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPublicKey;

    var signed = await window.solana.signTransaction(tx);
    var sig    = await connection.sendRawTransaction(signed.serialize());
    _showTxStatus("İşlem gönderildi... " + sig.slice(0,10) + "...");
    await connection.confirmTransaction(sig, "confirmed");

    _setFormLoading(false);
    _hideTxStatus();
    var kg = (amountGrams/1000).toFixed(2);
    _showToast("✅ " + kg + " kg " + WASTE_TYPES[wasteType] + " kaydedildi! TX onaylandı.","success");
    _addTxToTable({ sig:sig, wasteType:wasteType, amountKg:kg,
      wvt:((amountGrams * REWARD_RATES[wasteType]) / 1000).toFixed(3),
      status:"Başarılı", time: new Date().toLocaleTimeString("tr-TR") });
    _refreshBalance();
    _refreshPlatformStats();
    _resetAiForm();

  } catch(err){
    _setFormLoading(false);
    _hideTxStatus();
    if(err.code===4001 || (err.message && err.message.includes("rejected"))){
      _showToast("⛔ İşlem kullanıcı tarafından iptal edildi.","warning");
    } else {
      _showToast("❌ Hata: " + (err.message||"Bilinmeyen hata"),"error");
    }
  }
}
window.handleRecordWaste = handleRecordWaste;

// ─── 10. TX TABLE ────────────────────────────────────────
function _addTxToTable(data){
  var empty = elTxTableBody ? elTxTableBody.querySelector(".wv-tx-empty") : null;
  if(empty) empty.remove();
  var shortSig = data.sig.slice(0,8)+"..."+data.sig.slice(-6);
  var href = EXPLORER_BASE + data.sig + EXPLORER_QUERY;
  var row = document.createElement("tr");
  row.innerHTML =
    '<td><a href="'+href+'" target="_blank" class="tx-hash">'+shortSig+'</a></td>'+
    '<td>'+(WASTE_TYPES[data.wasteType]||"Bilinmiyor")+'</td>'+
    '<td>'+data.amountKg+' kg</td>'+
    '<td class="text-accent fw-bold">+'+data.wvt+' WVT</td>'+
    '<td><span class="badge-success">'+data.status+'</span></td>'+
    '<td>'+data.time+'</td>';
  if(elTxTableBody) elTxTableBody.prepend(row);
}

// ─── 11. UI HELPERS ──────────────────────────────────────
function _setFormLoading(v){
  var bt=elBtnRecord.querySelector(".btn-text"), bl=elBtnRecord.querySelector(".btn-loading");
  elBtnRecord.disabled=v;
  if(bt) bt.classList.toggle("d-none",v);
  if(bl) bl.classList.toggle("d-none",!v);
}
function _showTxStatus(m){ if(elTxMessage) elTxMessage.textContent=m; if(elTxStatus) elTxStatus.classList.remove("d-none"); }
function _hideTxStatus(){ if(elTxStatus) elTxStatus.classList.add("d-none"); }
function _showToast(msg,type){
  type=type||"success";
  var el=document.getElementById("wvToast"), body=document.getElementById("toastBody");
  if(!el||!body){ console.log("[Toast]",msg); return; }
  var icons={success:"bi-check-circle-fill",error:"bi-x-circle-fill",warning:"bi-exclamation-triangle-fill",info:"bi-info-circle-fill"};
  var colors={success:"var(--accent)",error:"#f87171",warning:"var(--accent-3)",info:"var(--accent-2)"};
  body.innerHTML='<i class="bi '+(icons[type]||icons.success)+' me-2" style="color:'+(colors[type]||colors.success)+'"></i>'+msg;
  el.className="toast wv-toast align-items-center border-0 toast-"+type;
  bootstrap.Toast.getOrCreateInstance(el,{delay:5000}).show();
}

function copyProgramId(){
  navigator.clipboard.writeText(PROGRAM_ID_STR)
    .then(function(){ _showToast("Program ID kopyalandı!","info"); })
    .catch(function(){ _showToast("Kopyalama başarısız.","error"); });
}
window.copyProgramId = copyProgramId;

// ─── 12. AI – MobileNet (korundu) ────────────────────────
function _initAI(){
  if(typeof mobilenet === "undefined"){
    _showToast("❌ TensorFlow kütüphanesi çekilemiyor.","error"); return;
  }
  _showToast("Yapay Zeka indiriliyor (~10MB)","info");
  mobilenet.load({version:2,alpha:1.0}).then(function(m){
    aiModel=m;
    _showToast("✅ Yapay Zeka hazır!","success");
  }).catch(function(){ _showToast("❌ Model yükleme hatası!","error"); });
}

function handleImageUpload(e){
  if(!e.target.files||!e.target.files.length) return;
  var imgUrl=URL.createObjectURL(e.target.files[0]);
  var imgEl=document.getElementById("aiImagePreview");
  imgEl.src=imgUrl;
  document.getElementById("aiDropzone").classList.add("d-none");
  document.getElementById("aiPreviewBox").classList.remove("d-none");
  document.getElementById("aiScanOverlay").classList.remove("d-none");
  document.getElementById("aiResultArea").classList.add("d-none");
  elBtnRecord.disabled=true;
  document.getElementById("btnRecordText").innerHTML='<i class="bi bi-cpu me-2"></i>Yapay Zeka Analiz Ediyor...';
  imgEl.onload=function(){
    var tries=0, t=setInterval(function(){
      if(aiModel){ clearInterval(t);
        aiModel.classify(imgEl).then(_processAiPredictions).catch(function(){ _showToast("Analiz hatası.","error"); _resetAiForm(); });
      } else if(++tries>15){ clearInterval(t); _showToast("Model yüklenemedi.","error"); _resetAiForm(); }
    },2000);
  };
}
window.handleImageUpload = handleImageUpload;

function _processAiPredictions(predictions){
  document.getElementById("aiScanOverlay").classList.add("d-none");
  document.getElementById("aiResultArea").classList.remove("d-none");
  if(!predictions||!predictions.length) return;
  var best=predictions[0].className.toLowerCase(), prob=(predictions[0].probability*100).toFixed(1);
  document.getElementById("aiRawClass").textContent="Model Tahmini: "+best;
  document.getElementById("aiConfidence").textContent="Eminlik: %"+prob;
  var t=4;
  if(best.match(/bottle|plastic|jug/)) t=0;
  else if(best.match(/glass|cup|goblet/)) t=1;
  else if(best.match(/can|tin|pop bottle/)) t=2;
  else if(best.match(/paper|carton|envelope|book/)) t=3;
  else if(best.match(/battery|chemical/)) t=5;
  else if(best.match(/computer|laptop|phone|monitor|mouse|keyboard|television/)) t=6;
  aiPredictedType=t;
  document.getElementById("aiDetectedType").innerHTML="Tespit Edilen: <strong>"+WASTE_TYPES[t]+"</strong>";
  var rewardWVT=((500 * REWARD_RATES[t])/1000).toFixed(3);
  elRewardAmount.textContent="~"+rewardWVT+" WVT (Tahmini)";
  _verifyLocationAndEnableMint();
}

function _verifyLocationAndEnableMint(){
  var locStatus=document.getElementById("aiLocationStatus"),
      locText=document.getElementById("aiLocationText"),
      locIcon=document.getElementById("aiLocationIcon"),
      btnText=document.getElementById("btnRecordText");
  if(!navigator.geolocation){
    locIcon.className="bi bi-x-circle-fill text-danger mt-1";
    locText.innerHTML="<strong class='text-danger'>Hata:</strong> Tarayıcınız konum desteklemiyor."; return;
  }
  navigator.geolocation.getCurrentPosition(function(pos){
    var uLat=pos.coords.latitude, uLon=pos.coords.longitude;
    var nearest=IZMIR_BINS[0], minD=Infinity;
    IZMIR_BINS.forEach(function(b){
      var d=_haversine(uLat,uLon,b.lat,b.lon);
      if(d<minD){ minD=d; nearest=b; }
    });
    if(minD<=50){
      locStatus.style.borderColor="rgba(0,229,168,0.4)";
      locIcon.className="bi bi-check-circle-fill text-accent mt-1";
      locText.innerHTML="<strong class='text-accent'>Doğrulandı:</strong> "+nearest.name+" ("+minD+"m)";
      elBtnRecord.disabled=false;
      btnText.innerHTML='<i class="bi bi-send-check me-2"></i>WVT Mint Et';
    } else {
      locStatus.style.borderColor="rgba(239,68,68,0.4)";
      locIcon.className="bi bi-exclamation-triangle-fill text-danger mt-1";
      locText.innerHTML="<strong class='text-danger'>Çok Uzaksınız:</strong> En yakın: "+nearest.name+" ("+minD+"m). Max 50m.";
      elBtnRecord.disabled=true;
      btnText.innerHTML='<i class="bi bi-lock me-2"></i>Konumunuz Uzak';
    }
    document.getElementById("btnResetAi").classList.remove("d-none");
  }, function(){
    locIcon.className="bi bi-x-circle-fill text-danger mt-1";
    locText.innerHTML="<strong class='text-danger'>İzin Reddedildi:</strong> Konum izni gerekli.";
    document.getElementById("btnResetAi").classList.remove("d-none");
  },{enableHighAccuracy:true});
}

function _haversine(lat1,lon1,lat2,lon2){
  var R=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
  var a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))*1000);
}

function _resetAiForm(){
  document.getElementById("aiDropzone").classList.remove("d-none");
  document.getElementById("aiPreviewBox").classList.add("d-none");
  var inp=document.getElementById("aiImageInput"); if(inp) inp.value="";
  document.getElementById("aiImagePreview").src="";
  document.getElementById("btnResetAi").classList.add("d-none");
  aiPredictedType=null;
  elBtnRecord.disabled=true;
  document.getElementById("btnRecordText").innerHTML='<i class="bi bi-image me-2"></i>Önce Fotoğraf Yükleyin';
  elRewardAmount.textContent="– WVT";
}
window.resetAiForm = _resetAiForm;

// ─── 13. COUNTERS & SCROLL ───────────────────────────────
function _animateCounter(id,target,duration){
  duration=duration||1500;
  var el=document.getElementById(id); if(!el||isNaN(target)) return;
  var start=parseInt(el.textContent.replace(/\D/g,""))||0, range=target-start;
  if(!range) return;
  var t0=performance.now();
  (function upd(now){ var p=Math.min((now-t0)/duration,1), e=1-Math.pow(1-p,3);
    el.textContent=Math.round(start+range*e).toLocaleString("tr-TR");
    if(p<1) requestAnimationFrame(upd);
  })(t0);
}

function _initIntersections(){
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ _animateCounter(e.target.id,parseInt(e.target.dataset.target),2000); obs.unobserve(e.target); }
    });
  },{threshold:0.3});
  document.querySelectorAll(".counter").forEach(function(el){ obs.observe(el); });
}

function _initScroll(){
  var nav=document.getElementById("mainNav");
  if(nav) window.addEventListener("scroll",function(){ nav.classList.toggle("scrolled",window.scrollY>50); },{passive:true});
}

function _initDemoStats(){
  setTimeout(function(){
    _animateCounter("totalWaste",12847,2000);
    _animateCounter("totalMinted",48320,2200);
    _animateCounter("totalUsers",1203,1800);
  },600);
}
