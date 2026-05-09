import { useMemo, useState, useEffect } from 'react'
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import RecordWaste from './components/RecordWaste'
import { type Lang, t } from './i18n'

const WASTE_TYPES_EN = ['Plastic','Glass','Metal','Paper','Organic','Hazardous','E-Waste']
const WASTE_TYPES_TR = ['Plastik','Cam','Metal','Kağıt','Organik','Tehlikeli','E-Atık']
const REWARD_RATES: Record<number,number> = {0:5,1:3,2:10,3:2,4:1,5:1,6:1}

export interface TxEntry {
  sig: string; wasteType: number; amountKg: number; wvt: number; time: string
}

function WasteVisionApp() {
  const { publicKey } = useWallet()
  const [wslBalance, setWslBalance] = useState(0)
  const [txLog, setTxLog]           = useState<TxEntry[]>([])
  const [scrolled, setScrolled]     = useState(false)
  const [lang, setLang]             = useState<Lang>('en')

  const tr = t(lang)
  const WASTE_TYPES = lang === 'en' ? WASTE_TYPES_EN : WASTE_TYPES_TR

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  const handleSuccess = (entry: TxEntry) => {
    setWslBalance(p => p + 10)
    setTxLog(p => [entry, ...p.slice(0,19)])
  }

  const shortAddr = publicKey
    ? publicKey.toString().slice(0,4)+'...'+publicKey.toString().slice(-4)
    : null

  return (
    <>
      {/* ── NAVBAR ── */}
      <nav className={`navbar navbar-expand-lg navbar-dark wv-navbar fixed-top${scrolled?' scrolled':''}`} id="mainNav">
        <div className="container-xl">
          <a className="navbar-brand d-flex align-items-center gap-2" href="#">
            <span className="wv-logo-icon"><i className="bi bi-recycle" /></span>
            <span className="wv-brand-text">Waste<span className="text-accent">Vision</span></span>
          </a>
          <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="navMenu">
            <ul className="navbar-nav mx-auto gap-1">
              {(['#hero','#features','#record','#stats','#how'] as const).map((h,i) => (
                <li key={h} className="nav-item">
                  <a className="nav-link" href={h}>{[tr.nav_home, tr.nav_features, tr.nav_record, tr.nav_stats, tr.nav_how][i]}</a>
                </li>
              ))}
            </ul>
            <div className="d-flex align-items-center gap-3 ms-lg-4">
              {/* Language Toggle */}
              <button
                id="langToggleBtn"
                onClick={() => setLang(l => l === 'en' ? 'tr' : 'en')}
                className="btn btn-sm"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: '#fff',
                  borderRadius: 20,
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: 1,
                  padding: '4px 14px',
                  transition: 'all .2s',
                }}
                title="Switch Language"
              >
                {lang === 'en' ? '🇹🇷 TR' : '🇬🇧 EN'}
              </button>

              {publicKey && (
                <>
                  <div className="wv-balance-badge">
                    <i className="bi bi-coin text-accent" />
                    <span className="wv-balance-label">{tr.wsl_balance}</span>
                    <span className="wv-balance-value">{wslBalance}</span>
                    <span className="wv-balance-unit">WSL</span>
                  </div>
                  <div className="wv-address-pill">
                    <span className="wv-dot" /><span>{shortAddr}</span>
                  </div>
                </>
              )}
              <WalletMultiButton className="btn wv-btn-connect" />
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="wv-hero text-center" id="hero">
        <div className="wv-particles" aria-hidden="true">
          {Array(8).fill(0).map((_,i)=><span key={i}/>)}
        </div>
        <div className="container position-relative">
          <div className="wv-hero-badge mb-4"><i className="bi bi-stars me-2"/>{tr.hero_badge}</div>
          <h1 className="wv-hero-title">{tr.hero_title1}<br/><span className="text-gradient">{tr.hero_title2}</span></h1>
          <p className="wv-hero-sub mt-3 mb-5">
            {tr.hero_sub}<br/>
            <strong>{tr.hero_sub2}</strong>{tr.hero_sub3}
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <a href="#record" className="btn wv-btn-primary btn-lg"><i className="bi bi-plus-circle me-2"/>{tr.hero_btn_record}</a>
            <a href="#how"    className="btn wv-btn-outline btn-lg"><i className="bi bi-play-circle me-2"/>{tr.hero_btn_how}</a>
          </div>
          <div className="wv-hero-stats mt-5">
            <div className="wv-stat-card"><span className="wv-stat-num">12,847</span><span className="wv-stat-label">{tr.hero_stat1}</span></div>
            <div className="wv-stat-card"><span className="wv-stat-num">{wslBalance}</span><span className="wv-stat-label">{tr.hero_stat2}</span></div>
            <div className="wv-stat-card"><span className="wv-stat-num">{txLog.length}</span><span className="wv-stat-label">{tr.hero_stat3}</span></div>
          </div>
          <div className="text-center mt-3">
            <span className="badge rounded-pill bg-success bg-opacity-10 text-success border border-success border-opacity-25 small px-3">
              <span className="wv-dot-green me-1"/>{tr.hero_live}
            </span>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="wv-section" id="features">
        <div className="container-xl">
          <div className="wv-section-header text-center mb-5">
            <span className="wv-label">{tr.features_label}</span>
            <h2 className="wv-section-title">{tr.features_title}</h2>
          </div>
          <div className="row g-4">
            {[
              {icon:'bi-shield-check', title:tr.feat1_title, desc:tr.feat1_desc, cls:''},
              {icon:'bi-award',        title:tr.feat2_title, desc:tr.feat2_desc, cls:'accent-2'},
              {icon:'bi-globe-europe-africa',title:tr.feat3_title,desc:tr.feat3_desc,cls:'accent-3'},
              {icon:'bi-graph-up-arrow',title:tr.feat4_title,desc:tr.feat4_desc, cls:'accent-4'},
              {icon:'bi-lock',         title:tr.feat5_title, desc:tr.feat5_desc, cls:'accent-5'},
              {icon:'bi-recycle',      title:tr.feat6_title, desc:tr.feat6_desc, cls:'accent-6'},
            ].map(f=>(
              <div key={f.title} className="col-lg-4 col-md-6">
                <div className="wv-feature-card h-100">
                  <div className={`wv-feature-icon ${f.cls}`}><i className={`bi ${f.icon}`}/></div>
                  <h5>{f.title}</h5><p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RECORD WASTE ── */}
      <section className="wv-section wv-section-alt" id="record">
        <div className="container-xl">
          <div className="row align-items-center g-5">
            <div className="col-lg-5">
              <span className="wv-label">{tr.record_label}</span>
              <h2 className="wv-section-title mt-2">{tr.record_title}</h2>
              <p className="wv-section-sub">{tr.record_sub}</p>
              <ul className="wv-checklist mt-4">
                <li><i className="bi bi-check-circle-fill"/> {tr.check1}</li>
                <li><i className="bi bi-check-circle-fill"/> {tr.check2}</li>
                <li><i className="bi bi-check-circle-fill"/> {tr.check3}</li>
                <li><i className="bi bi-check-circle-fill"/> {tr.check4}</li>
              </ul>
            </div>
            <div className="col-lg-7">
              <RecordWaste wslBalance={wslBalance} onSuccess={handleSuccess} lang={lang} />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="wv-section" id="stats">
        <div className="container-xl">
          <div className="wv-section-header text-center mb-5">
            <span className="wv-label">{tr.stats_label}</span>
            <h2 className="wv-section-title">{tr.stats_title}</h2>
          </div>
          <div className="row g-4">
            {[
              {icon:'bi-trash3',  val:'12,847',              unit:tr.stat1_unit, cls:''},
              {icon:'bi-coin',    val:wslBalance.toString(), unit:tr.stat2_unit, cls:'accent-2'},
              {icon:'bi-people',  val:'1,203',               unit:tr.stat3_unit, cls:'accent-3'},
              {icon:'bi-tree',    val:'642',                 unit:tr.stat4_unit, cls:'accent-4'},
            ].map(s=>(
              <div key={s.unit} className="col-lg-3 col-md-6">
                <div className="wv-stats-big text-center">
                  <div className={`wv-stats-icon ${s.cls}`}><i className={`bi ${s.icon}`}/></div>
                  <div className="wv-stats-value">{s.val}</div>
                  <div className="wv-stats-unit">{s.unit}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="wv-section wv-section-alt" id="how">
        <div className="container-xl">
          <div className="wv-section-header text-center mb-5">
            <span className="wv-label">{tr.how_label}</span>
            <h2 className="wv-section-title">{tr.how_title}</h2>
          </div>
          <div className="row g-4 justify-content-center">
            {[
              {n:'01',icon:'bi-wallet2',       title:tr.step1_title, desc:tr.step1_desc, cls:''},
              {n:'02',icon:'bi-clipboard-data',title:tr.step2_title, desc:tr.step2_desc, cls:'accent-2'},
              {n:'03',icon:'bi-pen',           title:tr.step3_title, desc:tr.step3_desc, cls:'accent-3'},
              {n:'04',icon:'bi-trophy',        title:tr.step4_title, desc:tr.step4_desc, cls:'accent-4'},
            ].map(s=>(
              <div key={s.n} className="col-lg-3 col-md-6 text-center">
                <div className="wv-step">
                  <div className="wv-step-num">{s.n}</div>
                  <div className={`wv-step-icon ${s.cls}`}><i className={`bi ${s.icon}`}/></div>
                  <h6>{s.title}</h6><p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TX LOG ── */}
      <section className="wv-section" id="txlog">
        <div className="container-xl">
          <div className="wv-section-header text-center mb-4">
            <span className="wv-label">{tr.tx_label}</span>
            <h2 className="wv-section-title">{tr.tx_title}</h2>
          </div>
          <div className="wv-tx-table-wrap">
            <table className="table wv-tx-table">
              <thead><tr>
                <th>{tr.tx_col_sig}</th>
                <th>{tr.tx_col_type}</th>
                <th>{tr.tx_col_amount}</th>
                <th>{tr.tx_col_wsl}</th>
                <th>{tr.tx_col_status}</th>
                <th>{tr.tx_col_time}</th>
              </tr></thead>
              <tbody>
                {txLog.length===0 ? (
                  <tr className="wv-tx-empty">
                    <td colSpan={6} className="text-center py-5">
                      <i className="bi bi-inbox display-6 d-block mb-2 text-muted"/>
                      <span className="text-muted">{tr.tx_empty}</span>
                    </td>
                  </tr>
                ) : txLog.map((e,i)=>(
                  <tr key={i}>
                    <td><a href={`https://explorer.solana.com/tx/${e.sig}?cluster=testnet`} target="_blank" rel="noreferrer" className="tx-hash">{e.sig.slice(0,8)}...{e.sig.slice(-6)}</a></td>
                    <td>{WASTE_TYPES[e.wasteType]||'?'}</td>
                    <td>{e.amountKg} kg</td>
                    <td className="text-accent fw-bold">+10 WSL</td>
                    <td><span className="badge-success">{tr.tx_signed}</span></td>
                    <td>{e.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="wv-footer">
        <div className="container-xl">
          <div className="row g-4 align-items-start">
            <div className="col-lg-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="wv-logo-icon sm"><i className="bi bi-recycle"/></span>
                <span className="wv-brand-text">Waste<span className="text-accent">Vision</span></span>
              </div>
              <p className="text-muted small">{tr.footer_desc}</p>
              <div className="d-flex gap-3 mt-3">
                {['twitter-x','discord','github','telegram'].map(s=>(
                  <a key={s} href="#" className="wv-social-btn"><i className={`bi bi-${s}`}/></a>
                ))}
              </div>
            </div>
            <div className="col-lg-2 offset-lg-1">
              <h6 className="wv-footer-title">{tr.footer_platform}</h6>
              <ul className="list-unstyled wv-footer-links">
                {[['#features',tr.nav_features],['#record',tr.nav_record],['#stats',tr.nav_stats],['#how',tr.nav_how]].map(([h,txt])=>(
                  <li key={h}><a href={h}>{txt}</a></li>
                ))}
              </ul>
            </div>
            <div className="col-lg-2">
              <h6 className="wv-footer-title">{tr.footer_resources}</h6>
              <ul className="list-unstyled wv-footer-links">
                <li><a href="#">{tr.footer_docs}</a></li>
                <li><a href="#">{tr.footer_anchor}</a></li>
                <li><a href="https://explorer.solana.com/?cluster=testnet" target="_blank" rel="noreferrer">{tr.footer_explorer}</a></li>
              </ul>
            </div>
            <div className="col-lg-3">
              <h6 className="wv-footer-title">{tr.footer_network}</h6>
              <div className="wv-contract-address">
                <code id="footerContractAddr">Solana Testnet</code>
              </div>
              <p className="text-muted small mt-3"><i className="bi bi-shield-check me-1 text-accent"/>{tr.footer_signed}</p>
            </div>
          </div>
          <hr className="wv-footer-divider"/>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <p className="text-muted small mb-0">{tr.footer_copy}</p>
            <p className="text-muted small mb-0"><i className="bi bi-leaf me-1 text-accent"/>{tr.footer_green}</p>
          </div>
        </div>
      </footer>
    </>
  )
}

export default function App() {
  const network  = WalletAdapterNetwork.Testnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])
  const wallets  = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WasteVisionApp />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
