import { useState, useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import L from 'leaflet'
import type { TxEntry } from '../App'

// Fix Leaflet icons in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const WASTE_TYPES = ['Plastik','Cam','Metal','Kağıt','Organik','Tehlikeli','E-Atık']
const REWARD_RATES: Record<number,number> = {0:5,1:3,2:10,3:2,4:1,5:1,6:1}

interface Props {
  wslBalance: number
  onSuccess: (entry: TxEntry) => void
}

type Status = 'idle' | 'signing' | 'success' | 'error'
type AiStatus = 'init' | 'loading_model' | 'ready' | 'analyzing' | 'done' | 'error'
type LocStatus = 'idle' | 'fetching' | 'success' | 'error'

// mobilenet global olarak window üzerinden erişilir (CDN script)
declare global { interface Window { mobilenet: any } }

export default function RecordWaste({ wslBalance, onSuccess }: Props) {
  const { publicKey, signMessage, connected } = useWallet()

  // General State
  const [wasteType,  setWasteType]  = useState<number | null>(null)
  const [amountGrams,setAmountGrams]= useState(0)
  const [status,     setStatus]     = useState<Status>('idle')
  const [errorMsg,   setErrorMsg]   = useState('')

  // Developer Mode
  const [devMode, setDevMode] = useState(false)

  // AI State
  const [aiStatus, setAiStatus] = useState<AiStatus>('init')
  const [aiModel, setAiModel]   = useState<any>(null)
  const [imgUrl, setImgUrl]     = useState<string | null>(null)
  const [aiConfidence, setAiConfidence] = useState('')
  const [aiRaw, setAiRaw]       = useState('')

  // Geolocation State
  const [locStatus, setLocStatus] = useState<LocStatus>('idle')
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null)
  const [nearestBin, setNearestBin] = useState<{lat: number, lon: number, dist: number} | null>(null)
  const [allBins, setAllBins] = useState<{lat: number, lon: number}[]>([])
  
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<L.Map | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 1. Load MobileNet Model
  useEffect(() => {
    let mounted = true
    const loadModel = async () => {
      // window.mobilenet CDN üzerinden yüklenir
      if (typeof window.mobilenet === 'undefined') {
        if (mounted) setAiStatus('error')
        return
      }
      setAiStatus('loading_model')
      try {
        const model = await window.mobilenet.load({ version: 2, alpha: 1.0 })
        if (mounted) {
          setAiModel(model)
          setAiStatus('ready')
        }
      } catch (err) {
        console.error("Model loading error:", err)
        if (mounted) setAiStatus('error')
      }
    }
    loadModel()
    return () => { mounted = false }
  }, [])

  // 2. Leaflet Map Rendering
  useEffect(() => {
    if (locStatus === 'success' && mapRef.current && userCoords) {
      if (!leafletMapRef.current) {
        leafletMapRef.current = L.map(mapRef.current).setView(userCoords, 16)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(leafletMapRef.current)
      }

      const map = leafletMapRef.current
      // Clear existing layers (except tiles)
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Circle) {
          map.removeLayer(layer)
        }
      })

      // User Marker
      L.marker(userCoords).addTo(map).bindPopup("Siz buradasınız").openPopup()
      L.circle(userCoords, { radius: 50, color: 'rgba(0,229,168,0.5)', fillOpacity: 0.1 }).addTo(map)

      // Bin Markers
      const binIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
      })

      allBins.forEach(b => {
        L.marker([b.lat, b.lon], { icon: binIcon }).addTo(map).bindPopup("Geri Dönüşüm Noktası")
      })

      map.setView(userCoords, 16)
    }

    // Leaflet haritasını component unmount olduğunda temizle (StrictMode uyumlu)
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
  }, [locStatus, userCoords, allBins])

  // Haversine Formula for distance (meters)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // 3. Image AI Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length) return
    const url = URL.createObjectURL(e.target.files[0])
    setImgUrl(url)
    setAiStatus('analyzing')
    setWasteType(null)
    setLocStatus('idle')
    setUserCoords(null)
    setNearestBin(null)
  }

  const handleImageLoad = async () => {
    if (aiStatus !== 'analyzing' || !aiModel || !imgRef.current) return
    try {
      const predictions = await aiModel.classify(imgRef.current)
      if (!predictions || !predictions.length) throw new Error('No predictions')
      
      const best = predictions[0].className.toLowerCase()
      const prob = (predictions[0].probability * 100).toFixed(1)
      
      setAiRaw(best)
      setAiConfidence(`%${prob}`)

      let t = 4 // Default Organik
      let estGrams = 100
      if (best.match(/bottle|plastic|jug/)) { t = 0; estGrams = 30 }
      else if (best.match(/glass|cup|goblet/)) { t = 1; estGrams = 200 }
      else if (best.match(/can|tin|pop bottle/)) { t = 2; estGrams = 15 }
      else if (best.match(/paper|carton|envelope|book/)) { t = 3; estGrams = 50 }
      else if (best.match(/battery|chemical/)) { t = 5; estGrams = 50 }
      else if (best.match(/computer|laptop|phone|monitor|mouse|keyboard|television/)) { t = 6; estGrams = 1500 }

      setWasteType(t)
      setAmountGrams(estGrams)
      setAiStatus('done')
      
      // Auto trigger location verification after AI is done
      verifyLocation()
    } catch (err) {
      console.error(err)
      setAiStatus('error')
      setTimeout(() => {
        setAiStatus('ready')
        setImgUrl(null)
      }, 3000)
    }
  }

  // 4. Geolocation & Overpass Handlers
  const verifyLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Tarayıcınız konum servisini desteklemiyor.")
      return
    }
    
    setLocStatus('fetching')
    setErrorMsg('')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setUserCoords([lat, lon])

        try {
          // Fetch recycling amenities within 150m (to ensure we see some on map for demo)
          const query = `[out:json];node(around:200,${lat},${lon})["amenity"="recycling"];out;`
          const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
          const data = await res.json()
          
          const bins = data.elements.map((e: any) => ({ lat: e.lat, lon: e.lon }))
          setAllBins(bins)

          if (bins.length > 0) {
            let minD = Infinity
            // dist alanını baştan hesaplayarak başlat (ilk eleman güncellenmeyebilir)
            let nearest = { ...bins[0], dist: calculateDistance(lat, lon, bins[0].lat, bins[0].lon) }
            minD = nearest.dist
            bins.forEach((b: any) => {
              const d = calculateDistance(lat, lon, b.lat, b.lon)
              if (d < minD) { minD = d; nearest = { ...b, dist: d } }
            })
            setNearestBin(nearest)
          } else {
            setNearestBin(null)
          }
          
          setLocStatus('success')
        } catch (err) {
          console.error(err)
          setErrorMsg("Overpass API'den konum verisi alınırken hata oluştu.")
          setLocStatus('error')
        }
      },
      (err) => {
        console.error(err)
        setErrorMsg("Konum izni reddedildi veya konum alınamadı.")
        setLocStatus('error')
      },
      { enableHighAccuracy: true }
    )
  }

  const resetAi = () => {
    setImgUrl(null)
    setWasteType(null)
    setAiStatus('ready')
    setLocStatus('idle')
    setUserCoords(null)
    setNearestBin(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (leafletMapRef.current) {
      leafletMapRef.current.remove()
      leafletMapRef.current = null
    }
  }

  const rewardPreview = wasteType !== null 
    ? ((amountGrams / 1000) * REWARD_RATES[wasteType]).toFixed(3)
    : '0.000'

  const isLocationValid = devMode || (nearestBin !== null && nearestBin.dist <= 50)

  // 5. Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey || !signMessage) return
    if (wasteType === null || amountGrams === 0) { setErrorMsg('Önce yapay zeka ile fotoğraf analiz edilmelidir.'); return }
    
    if (!isLocationValid) {
      setErrorMsg('You are too far from a recycling center. Please move closer to claim your reward.')
      return
    }

    setStatus('signing')
    setErrorMsg('')

    const msgText = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '  WasteVision Protokolü',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      `Atık Türü  : ${WASTE_TYPES[wasteType]}`,
      `Miktar     : ${amountGrams} gram`,
      `Konum      : Onaylandı ${devMode ? '(Dev Mode)' : ''}`,
      `Ödül       : +10 WSL`,
      `Ağ         : Solana Testnet`,
      `Tarih      : ${new Date().toLocaleString('tr-TR')}`,
      `Cüzdan     : ${publicKey.toString().slice(0,8)}...`,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'Bu imza atık kaydınızı onaylar.',
      'Herhangi bir token transferi',
      'veya gas ücreti gerçekleşmez.',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ].join('\n')

    try {
      const encoded   = new TextEncoder().encode(msgText)
      const signature = await signMessage(encoded)
      // Buffer polyfill'e güvenmek yerine native Uint8Array → hex dönüşümü
      const sigHex = Array.from(signature)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      const entry: TxEntry = {
        sig:       sigHex,
        wasteType: wasteType,
        amountKg:  amountGrams / 1000,
        wvt:       10,
        time:      new Date().toLocaleTimeString('tr-TR'),
      }
      onSuccess(entry)
      setStatus('success')
      resetAi()
      setAmountGrams(0)
      setTimeout(() => setStatus('idle'), 4000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata'
      if (msg.includes('rejected') || msg.includes('cancelled') || msg.includes('User rejected')) {
        setErrorMsg('⛔ İşlem kullanıcı tarafından iptal edildi.')
      } else {
        setErrorMsg('❌ Hata: ' + msg)
      }
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  return (
    <div className="wv-form-card">
      <div className="wv-form-header d-flex justify-content-between align-items-center">
        <div>
          <i className="bi bi-file-earmark-plus me-2"/>Yeni Atık Kaydı
        </div>
        <div className="d-flex gap-2 align-items-center">
          {devMode && <span className="badge bg-warning text-dark"><i className="bi bi-bug me-1"/>Dev Mode Active</span>}
          <div className="form-check form-switch m-0 ms-2" title="Geliştirici Modu (Konum Bypası)">
            <input className="form-check-input" type="checkbox" role="switch" id="devModeSwitch" 
              checked={devMode} onChange={e => setDevMode(e.target.checked)} />
          </div>
        </div>
      </div>

      {!connected && (
        <div className="alert wv-alert-warning d-flex align-items-center gap-2 mb-3" role="alert">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0"/>
          <span>İşlem yapabilmek için önce <strong>Phantom cüzdanınızı bağlamanız</strong> gerekiyor.</span>
        </div>
      )}

      {status === 'signing' && (
        <div className="wv-tx-status">
          <div className="wv-tx-inner">
            <div className="wv-spinner"/>
            <span>İşlem Onaylanıyor...<br/>
              <small className="text-muted">Phantom cüzdanınızda imzayı onaylayın</small>
            </span>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="alert d-flex align-items-center gap-2 mb-3"
          style={{background:'rgba(0,229,168,0.15)',border:'1px solid rgba(0,229,168,0.4)',borderRadius:12,color:'#00e5a8'}}>
          <i className="bi bi-check-circle-fill fs-5"/>
          <div>
            <strong>10 WSL cüzdanınıza eklendi! 🎉</strong><br/>
            <small style={{color:'rgba(255,255,255,0.6)'}}>İmza başarıyla doğrulandı. Bakiye güncellendi.</small>
          </div>
        </div>
      )}

      {errorMsg && status !== 'success' && (
        <div className="alert d-flex align-items-center gap-2 mb-3"
          style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:12,color:'#f87171'}}>
          <i className="bi bi-x-circle-fill flex-shrink-0"/>
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="row g-3">

          {/* AI Image Dropzone */}
          <div className="col-12 text-center position-relative mt-2 mb-2">
            {!connected && (
              <div id="aiDropzoneOverlay"
                className="position-absolute w-100 h-100 d-flex flex-column justify-content-center align-items-center"
                style={{top:0, left:0, zIndex:10, background:'rgba(1,28,71,0.85)', backdropFilter:'blur(3px)', borderRadius:14}}>
                <i className="bi bi-wallet2 text-accent fs-1 mb-2"></i>
                <h5 className="text-white fw-bold">Bağlantı Bekleniyor</h5>
                <p className="small text-white-50 mb-0">Fotoğraf yüklemek için cüzdanınızı bağlayın.</p>
              </div>
            )}

            {!imgUrl ? (
              <div className="wv-ai-dropzone" onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} accept="image/*" className="d-none" onChange={handleFileChange} />
                <div className="wv-upload-icon">
                  {aiStatus === 'loading_model' ? <div className="spinner-border text-accent"/> : <i className="bi bi-camera"></i>}
                </div>
                <h5>
                  {aiStatus === 'init' || aiStatus === 'loading_model' ? 'Yapay Zeka Yükleniyor (~10MB)' : 'Atık Fotoğrafını Yükle veya Çek'}
                </h5>
                <p className="text-muted small mb-0">
                  {aiStatus === 'error' ? 'Model yüklenemedi. Sayfayı yenileyin.' : 'Tıklayarak kameranızı açabilir veya fotoğraf seçebilirsiniz'}
                </p>
              </div>
            ) : (
              <div className="wv-ai-preview mt-3">
                <div className="wv-preview-img-wrap position-relative mx-auto" style={{maxWidth: 300, borderRadius: 'var(--radius-md)', overflow: 'hidden'}}>
                  <img ref={imgRef} src={imgUrl} alt="Atık" className="w-100" onLoad={handleImageLoad} crossOrigin="anonymous" />
                  
                  {aiStatus === 'analyzing' && (
                    <div className="wv-scan-overlay">
                      <div className="wv-scan-line"></div>
                      <span className="wv-scan-text">Yapay Zeka Analiz Ediyor...</span>
                    </div>
                  )}
                </div>

                {aiStatus === 'done' && wasteType !== null && (
                  <div className="wv-ai-result mt-3 p-3" style={{background: 'rgba(0,229,168,0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0,229,168,0.3)'}}>
                    <div className="wv-ai-match fw-bold fs-5">
                      <i className="bi bi-robot me-2 text-accent"></i>
                      <span className="text-primary-emphasis text-white">Tespit Edilen: {WASTE_TYPES[wasteType]}</span>
                    </div>
                    <p className="small text-muted mb-0 mt-1">Eminlik: {aiConfidence}</p>
                    <p className="small text-muted mb-0">Model Tahmini: {aiRaw}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Location Verification UI */}
          {aiStatus === 'done' && (
            <div className="col-12 mt-3">
              <div className="p-3" style={{background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)'}}>
                <h6 className="text-white mb-3"><i className="bi bi-geo-alt-fill text-accent me-2"/>Konum Doğrulama</h6>
                
                {locStatus === 'fetching' && (
                  <div className="text-center py-3">
                    <div className="spinner-border text-accent spinner-border-sm mb-2"/>
                    <p className="small text-muted mb-0">Yakındaki geri dönüşüm noktaları aranıyor (Overpass API)...</p>
                  </div>
                )}

                {locStatus === 'success' && (
                  <>
                    <div ref={mapRef} style={{height: 180, width: '100%', borderRadius: 8, marginBottom: 12, zIndex: 1}}></div>
                    
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        {nearestBin ? (
                          <>
                            <span className="small text-muted d-block">En yakın kutuya mesafe:</span>
                            <span className={`fw-bold fs-5 ${nearestBin.dist <= 50 ? 'text-success' : 'text-danger'}`}>
                              {Math.round(nearestBin.dist)} metre
                            </span>
                          </>
                        ) : (
                          <span className="text-danger small">Yakında geri dönüşüm kutusu bulunamadı.</span>
                        )}
                      </div>
                      
                      <div>
                        {isLocationValid ? (
                          <span className="badge bg-success"><i className="bi bi-check-circle me-1"/>Onaylandı</span>
                        ) : (
                          <span className="badge bg-danger"><i className="bi bi-x-circle me-1"/>Çok Uzak</span>
                        )}
                      </div>
                    </div>
                  </>
                )}
                
                {locStatus === 'error' && (
                  <div className="text-center py-3">
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={verifyLocation}>
                      <i className="bi bi-arrow-clockwise me-1"/> Tekrar Dene
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Miktar */}
          <div className="col-12">
            <label className="form-label text-white-50 small mb-1">
              Yapay Zeka Tahmini Ağırlık
            </label>
            <div className="d-flex align-items-center p-2 rounded"
              style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',color:'#fff', height: '42px'}}>
              {aiStatus === 'done' ? (
                <><i className="bi bi-robot text-accent me-2"/> {amountGrams} gram (Tahmini)</>
              ) : (
                <span className="text-muted small">Analiz bekleniyor...</span>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="col-12 mt-4">
            {!connected ? (
              <WalletMultiButton className="btn wv-btn-primary w-100 wv-btn-record" />
            ) : (
              <button type="submit"
                className={`btn w-100 wv-btn-record ${isLocationValid ? 'wv-btn-primary' : 'btn-secondary'}`}
                disabled={status==='signing' || amountGrams === 0 || wasteType === null || (!isLocationValid && !devMode)}>
                {status === 'signing' ? (
                  <><span className="spinner-border spinner-border-sm me-2"/>İşlem Onaylanıyor...</>
                ) : wasteType === null ? (
                  <><i className="bi bi-camera me-2"/>Önce Fotoğraf Yükleyin</>
                ) : !isLocationValid ? (
                  <><i className="bi bi-geo-alt me-2"/>Konum Doğrulanamadı</>
                ) : (
                  <><i className="bi bi-pen me-2"/>Phantom ile İmzala &amp; Kazan</>
                )}
              </button>
            )}
          </div>
          
          {/* Reset Action */}
          {aiStatus === 'done' && (
            <div className="col-12 text-center mt-2">
              <button type="button" className="btn btn-link text-muted small" onClick={resetAi}>
                <i className="bi bi-arrow-counterclockwise me-1"/> Süreci Başa Al
              </button>
            </div>
          )}

        </div>
      </form>
    </div>
  )
}
