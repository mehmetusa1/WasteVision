/* ═══════════════════════════════════════════════════════
   WasteVision – app.js
   Ethers.js v5 + MetaMask + Smart Contract Integration
   ═══════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────
// GLOBAL FORWARD-DECLARATIONS
// HTML inline onclick="connectWallet()" çağrılarının
// DOMContentLoaded'dan önce de çalışması için stub'lar.
// Gerçek implementasyonlar aşağıda DOMContentLoaded içinde
// window.xxx üzerine yazılır.
// ─────────────────────────────────────────────────────────
window.connectWallet = function () { _connectWallet(); };
window.disconnectWallet = function () { _disconnectWallet(); };
window.handleRecordWaste = function (e) { _handleRecordWaste(e); };
window.copyContractAddress = function () { _copyContractAddress(); };

// ─────────────────────────────────────────────
// 1. SMART CONTRACT CONFIGURATION
// ─────────────────────────────────────────────

const CONTRACT_ADDRESS = "0x785763E9Cd4cAcfE3988662C0BB5A19382FC05E8";

const CONTRACT_ABI =
  [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "initialOwner",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "allowance",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "needed",
          "type": "uint256"
        }
      ],
      "name": "ERC20InsufficientAllowance",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "balance",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "needed",
          "type": "uint256"
        }
      ],
      "name": "ERC20InsufficientBalance",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "approver",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidApprover",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidReceiver",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidSender",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidSpender",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "mint",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "wasteType",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "amountInGrams",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "location",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        }
      ],
      "name": "recordWasteAndMint",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "transfer",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "transferFrom",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "recorder",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint8",
          "name": "wasteType",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amountInGrams",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "mintedTokens",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "recordId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "location",
          "type": "string"
        }
      ],
      "name": "WasteRecorded",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "recordId",
          "type": "uint256"
        }
      ],
      "name": "getRecord",
      "outputs": [
        {
          "components": [
            {
              "internalType": "address",
              "name": "recorder",
              "type": "address"
            },
            {
              "internalType": "uint8",
              "name": "wasteType",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "amountInGrams",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "location",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "description",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "mintedTokens",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            }
          ],
          "internalType": "struct WasteVision.WasteRecord",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getUserRecordIds",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MIN_AMOUNT",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalRecords",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "totalWasteByUser",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalWasteRecorded",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "userRecordIds",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "wasteRecords",
      "outputs": [
        {
          "internalType": "address",
          "name": "recorder",
          "type": "address"
        },
        {
          "internalType": "uint8",
          "name": "wasteType",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "amountInGrams",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "location",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "mintedTokens",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];
// ─────────────────────────────────────────────
// 2. APP STATE (global — shared with DOMContentLoaded)
// ─────────────────────────────────────────────

var provider = null;
var signer = null;
var contract = null;
var userAddr = null;
var isConnected = false;

var WASTE_TYPES = ["Plastik", "Cam", "Metal", "Kağıt/Karton", "Organik", "Tehlikeli", "E-Atık"];
var txHistory = [];
var aiModel = null;
var aiPredictedType = null;

var IZMIR_BINS = [
  { name: "Konak Meydanı", lat: 38.4189, lon: 27.1287 },
  { name: "Alsancak Kordon", lat: 38.4385, lon: 27.1420 },
  { name: "Karşıyaka Çarşı", lat: 38.4552, lon: 27.1121 },
  { name: "Bornova Meydan", lat: 38.4633, lon: 27.2166 },
  { name: "Buca Hasanağa", lat: 38.3813, lon: 27.1651 }
];

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  var R = 6371; // Dünya yarıçapı (km)
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // km
  return Math.round(d * 1000); // metre döndür
}

// Türlere göre kg başına ödül miktarları (Sözleşmedekiyle uyumlu)
function getRewardRate(type) {
  var rates = {
    0: 5,  // Plastik
    1: 3,  // Cam
    2: 10, // Metal
    3: 2,  // Kağıt
    4: 1,  // Organik
    5: 1,  // Tehlikeli
    6: 1   // E-Atık
  };
  return rates[type] || 1;
}

// ─────────────────────────────────────────────
// 3. BOOT – DOM hazır olunca başlat
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {

  // ── DOM References ────────────────────────
  var elBtnConnect = document.getElementById('btnConnectWallet');
  var elBtnDisconnect = document.getElementById('btnDisconnectWallet');
  var elAddressPill = document.getElementById('addressPill');
  var elWalletAddr = document.getElementById('walletAddress');
  var elBalanceBadge = document.getElementById('balanceBadge');
  var elWvtBalance = document.getElementById('wvtBalance');
  var elWalletWarning = document.getElementById('walletWarning');
  var elTxStatus = document.getElementById('txStatus');
  var elTxMessage = document.getElementById('txMessage');
  var elTxTableBody = document.getElementById('txTableBody');
  var elRewardAmount = document.getElementById('rewardAmount');
  var elBtnRecord = document.getElementById('btnRecord');

  // ─────────────────────────────────────────────
  // 4. WALLET CONNECTION – Ethers.js v5
  // ─────────────────────────────────────────────

  function _connectWallet() {
    if (typeof window.ethereum === 'undefined') {
      _showToast('MetaMask bulunamadı! Lütfen yükleyin.', 'error');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    // Kullanıcı bağlan butonuna basarsa, çıkış bayrağını temizle
    localStorage.removeItem('wv_disconnected');

    elBtnConnect.disabled = true;
    elBtnConnect.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Bağlanıyor...';

    // Ethers.js v5: ethers.providers.Web3Provider
    provider = new ethers.providers.Web3Provider(window.ethereum, 'any');

    // Her seferinde MetaMask onay/hesap seçme penceresini zorla açması için permission iste
    provider.send('wallet_requestPermissions', [{ eth_accounts: {} }])
      .then(function () {
        return provider.send('eth_requestAccounts', []);
      })
      .then(function () {
        // Ethers.js v5: provider.getSigner()
        signer = provider.getSigner();
        return signer.getAddress();
      })
      .then(function (addr) {
        userAddr = addr;
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        isConnected = true;
        _updateWalletUI();

        // Event listeners (duplicates önlemi)
        if (window.ethereum.removeAllListeners) {
          window.ethereum.removeAllListeners('accountsChanged');
          window.ethereum.removeAllListeners('chainChanged');
        }
        window.ethereum.on('accountsChanged', _handleAccountsChanged);
        window.ethereum.on('chainChanged', function () { window.location.reload(); });

        _showToast('✅ Cüzdan başarıyla bağlandı!', 'success');
        console.log('[WasteVision] Connected:', userAddr);

        return _refreshBalance();
      })
      .catch(function (err) {
        console.error('[WasteVision] connectWallet error:', err);
        _showToast(_parseError(err), 'error');
      })
      .finally(function () {
        elBtnConnect.disabled = false;
        elBtnConnect.innerHTML = '<i class="bi bi-wallet2 me-2"></i>Cüzdanı Bağla';
      });
  }

  // Gerçek implementasyonu global stub'a bağla
  window.connectWallet = _connectWallet;

  function _disconnectWallet() {
    provider = null;
    signer = null;
    contract = null;
    userAddr = null;
    isConnected = false;
    _updateWalletUI();
    _showToast('Cüzdan bağlantısı kesildi.', 'info');
    if (window.ethereum && window.ethereum.removeListener) {
      window.ethereum.removeListener('accountsChanged', _handleAccountsChanged);
    }
    // Kullanıcı bilerek çıkış yaptıysa localStorage'a kaydet ki oto-bağlanmasın
    localStorage.setItem('wv_disconnected', 'true');
  }
  window.disconnectWallet = _disconnectWallet;

  function _handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      _disconnectWallet();
    } else {
      userAddr = accounts[0];
      signer = provider.getSigner();
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      _updateWalletUI();
      _refreshBalance();
    }
  }

  function _updateWalletUI() {
    if (isConnected && userAddr) {
      var short = userAddr.slice(0, 6) + '...' + userAddr.slice(-4);
      elWalletAddr.textContent = short;
      elAddressPill.classList.remove('d-none');
      elBalanceBadge.classList.remove('d-none');
      elBtnConnect.classList.add('d-none');
      elBtnDisconnect.classList.remove('d-none');
      elWalletWarning.classList.add('d-none');
      var footerAddr = document.getElementById('footerContractAddr');
      if (footerAddr) footerAddr.textContent = CONTRACT_ADDRESS;
      // Aktifleşen Upload Alanı
      var aiOverlay = document.getElementById('aiDropzoneOverlay');
      if (aiOverlay) aiOverlay.classList.add('d-none');
    } else {
      elAddressPill.classList.add('d-none');
      elBalanceBadge.classList.add('d-none');
      elBtnConnect.classList.remove('d-none');
      elBtnDisconnect.classList.add('d-none');
      elWalletWarning.classList.remove('d-none');
      elWvtBalance.textContent = '0.00';
      // Pasifleşen Upload Alanı
      var aiOverlay = document.getElementById('aiDropzoneOverlay');
      if (aiOverlay) aiOverlay.classList.remove('d-none');
    }
  }

  // ─────────────────────────────────────────────
  // 5. WVT BALANCE
  // ─────────────────────────────────────────────

  function _refreshBalance() {
    if (!contract || !userAddr) return Promise.resolve();
    return contract.balanceOf(userAddr)
      .then(function (raw) {
        // Ethers.js v5: ethers.utils.formatUnits(value, decimals)
        var formatted = parseFloat(ethers.utils.formatUnits(raw, 18)).toFixed(2);
        elWvtBalance.textContent = formatted;
        _animateCounter('totalMinted', parseInt(formatted));
      })
      .catch(function (err) {
        console.warn('[WasteVision] refreshBalance:', err.message);
        elWvtBalance.textContent = '0.00'; // Hata durumunda ERR yerine 0 dolsun
      });
  }

  // ─────────────────────────────────────────────
  // 6. RECORD WASTE & MINT (AI INTEGRATED)
  // ─────────────────────────────────────────────

  function _handleRecordWaste(event) {
    if (event) event.preventDefault();

    if (!isConnected || !contract) {
      _showToast('Lütfen önce cüzdanınızı bağlayın!', 'warning');
      return;
    }

    if (aiPredictedType === null) {
      _showToast('Lütfen önce bir atık fotoğrafı yükleyin.', 'warning');
      return;
    }

    var wasteType = aiPredictedType;
    var amountKg = 0.5; // Sabit AI varsayımı
    var amountGrams = 500;
    var locationVal = "AI Destekli Konum Tahmini";

    var rawClassEl = document.getElementById('aiRawClass');
    var descriptionVal = "AI Tespit: " + (rawClassEl ? rawClassEl.textContent.replace('Model Tahmini: ', '') : 'Bilinmiyor');

    _setFormLoading(true);
    _showTxStatus('MetaMask onayı bekleniyor...');

    // Gas estimate → TX gönder
    contract.estimateGas.recordWasteAndMint(wasteType, amountGrams, locationVal, descriptionVal)
      .then(function (gasEst) {
        return gasEst.mul(120).div(100); // %20 buffer
      })
      .catch(function (e) {
        console.warn('[WasteVision] Gas estimate failed:', e.message);
        return undefined;
      })
      .then(function (gasLimit) {
        var txOptions = gasLimit ? { gasLimit: gasLimit } : {};
        return contract.recordWasteAndMint(
          wasteType,      // uint8
          amountGrams,    // uint256
          locationVal,    // string
          descriptionVal, // string
          txOptions
        );
      })
      .then(function (tx) {
        _showTxStatus('İşlem gönderildi... TX: ' + tx.hash.slice(0, 10) + '...');
        return tx.wait();
      })
      .then(function (receipt) {
        _setFormLoading(false);
        _hideTxStatus();
        _showToast('✅ ' + amountKg + ' kg ' + WASTE_TYPES[wasteType] + ' kaydedildi! TX onaylandı.', 'success');
        _addTxToTable({
          hash: receipt.transactionHash,
          wasteType: wasteType,
          amountKg: amountKg,
          wvt: (amountKg * getRewardRate(wasteType)).toFixed(2),
          status: 'Başarılı',
          time: new Date().toLocaleTimeString('tr-TR')
        });
        _refreshBalance();
        _resetAiForm(); // Formu sıfırla
      })
      .catch(function (err) {
        _setFormLoading(false);
        _hideTxStatus();
        _showToast(_parseError(err), 'error');
      });
  }
  window.handleRecordWaste = _handleRecordWaste;

  // ─────────────────────────────────────────────
  // 7. UI HELPERS
  // ─────────────────────────────────────────────

  function _setFormLoading(loading) {
    var btnText = elBtnRecord.querySelector('.btn-text');
    var btnLoading = elBtnRecord.querySelector('.btn-loading');
    elBtnRecord.disabled = loading;
    if (btnText) btnText.classList.toggle('d-none', loading);
    if (btnLoading) btnLoading.classList.toggle('d-none', !loading);
  }

  function _showTxStatus(msg) {
    if (elTxMessage) elTxMessage.textContent = msg;
    if (elTxStatus) elTxStatus.classList.remove('d-none');
  }

  function _hideTxStatus() {
    if (elTxStatus) elTxStatus.classList.add('d-none');
  }

  function _showToast(message, type) {
    type = type || 'success';
    var toastEl = document.getElementById('wvToast');
    var toastBody = document.getElementById('toastBody');
    if (!toastEl || !toastBody) { console.log('[Toast]', message); return; }

    var icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };
    var colors = { success: 'var(--accent)', error: '#f87171', warning: 'var(--accent-3)', info: 'var(--accent-2)' };

    var icon = icons[type] || icons.success;
    toastBody.innerHTML = '<i class="bi ' + icon + ' me-2" style="color:' + (colors[type] || colors.success) + '"></i>' + message;
    toastEl.className = 'toast wv-toast align-items-center border-0 toast-' + type;

    var toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 5000 });
    toast.show();
  }

  function _parseError(err) {
    if (err.code === 4001 || err.code === 'ACTION_REJECTED')
      return '⛔ İşlem kullanıcı tarafından iptal edildi.';
    if (err.code === -32603)
      return '❌ Kontrat hatası. Gas limitini kontrol edin.';
    if (err.message && err.message.indexOf('insufficient funds') !== -1)
      return '💸 Yetersiz bakiye. Gas ücreti için ETH gerekiyor.';
    return 'Hata: ' + (err.reason || err.message || 'Bilinmeyen hata.');
  }

  function _copyContractAddress() {
    navigator.clipboard.writeText(CONTRACT_ADDRESS)
      .then(function () { _showToast('Kontrat adresi kopyalandı!', 'info'); })
      .catch(function () { _showToast('Kopyalama başarısız.', 'error'); });
  }
  window.copyContractAddress = _copyContractAddress;

  // ─────────────────────────────────────────────
  // 8. TRANSACTION TABLE
  // ─────────────────────────────────────────────

  function _addTxToTable(data) {
    var hash = data.hash, wasteType = data.wasteType, amountKg = data.amountKg,
      wvt = data.wvt, status = data.status, time = data.time;

    var emptyRow = elTxTableBody ? elTxTableBody.querySelector('.wv-tx-empty') : null;
    if (emptyRow) emptyRow.remove();

    txHistory.unshift(data);
    if (txHistory.length > 20) txHistory.pop();

    var shortHash = hash.slice(0, 8) + '...' + hash.slice(-6);
    var typeName = WASTE_TYPES[wasteType] || 'Bilinmiyor';

    var row = document.createElement('tr');
    row.innerHTML =
      '<td><a href="https://etherscan.io/tx/' + hash + '" target="_blank" class="tx-hash">' + shortHash + '</a></td>' +
      '<td>' + typeName + '</td>' +
      '<td>' + amountKg + ' kg</td>' +
      '<td class="text-accent fw-bold">+' + wvt + ' WVT</td>' +
      '<td><span class="badge-success">' + status + '</span></td>' +
      '<td>' + time + '</td>';

    if (elTxTableBody) elTxTableBody.prepend(row);
  }

  // ─────────────────────────────────────────────
  // 9. AI MOBILENET INTEGRATION
  // ─────────────────────────────────────────────

  if (typeof mobilenet !== 'undefined') {
    console.log("[WasteVision] Downloading MobileNet...");
    _showToast("Yapay Zeka indirilmeye başlandı. (Yaklaşık 4MB)", "info");

    // İstikrarlı sürüm kilitlendi (tfjs 3.21.0 & mobilenet 2.1.0)
    // alpha: 0.25 kullanılarak model 16MB'dan 4MB'a düşürüldü, hız inanılmaz arttı.
    mobilenet.load({
      version: 2,
      alpha: 0.25
    }).then(function (model) {
      aiModel = model;
      _showToast("✅ Yapay Zeka başarıyla yüklendi, fotoğraf seçebilirsiniz!", "success");
      console.log("[WasteVision] MobileNet loaded!");
    }).catch(function (err) {
      _showToast("❌ Model yükleme hatası! İnternetiniz modeli engelliyor olabilir.", "error");
      console.error("MobileNet load error", err);
    });
  } else {
    _showToast("❌ TensorFlow kütüphanesi çekilemiyor.", "error");
  }

  function _handleImageUpload(e) {
    if (!e.target.files || e.target.files.length === 0) return;
    var file = e.target.files[0];

    var imgUrl = URL.createObjectURL(file);
    var imgEl = document.getElementById('aiImagePreview');
    imgEl.src = imgUrl;

    document.getElementById('aiDropzone').classList.add('d-none');
    document.getElementById('aiPreviewBox').classList.remove('d-none');
    document.getElementById('aiScanOverlay').classList.remove('d-none');
    document.getElementById('aiResultArea').classList.add('d-none');

    elBtnRecord.disabled = true;
    document.getElementById('btnRecordText').innerHTML = '<i class="bi bi-cpu me-2"></i>Yapay Zeka Analiz Ediyor...';

    imgEl.onload = function () {
      // Loop with setInterval instead of event recursion to avoid losing event target
      var retryCount = 0;
      var checkModelTimer = setInterval(function () {
        if (aiModel) {
          clearInterval(checkModelTimer);
          aiModel.classify(imgEl).then(function (predictions) {
            _processAiPredictions(predictions);
          }).catch(function (err) {
            _showToast("Analiz hatası oluştu.", "error");
            _resetAiForm();
          });
        } else {
          retryCount++;
          if (retryCount > 15) { // 30 saniye sonra vazgeç
            clearInterval(checkModelTimer);
            _showToast("Yapay zeka modeli yüklenemediği için analiz iptal edildi.", "error");
            _resetAiForm();
          } else if (retryCount % 2 === 0) {
            _showToast("Yapay zeka modeli hala indiriliyor, lütfen bekleyin (" + retryCount * 2 + "s)...", "info");
          }
        }
      }, 2000);
    };
  }
  window.handleImageUpload = _handleImageUpload;

  function _resetAiForm() {
    document.getElementById('aiDropzone').classList.remove('d-none');
    document.getElementById('aiPreviewBox').classList.add('d-none');

    var inputEl = document.getElementById('aiImageInput');
    if (inputEl) inputEl.value = "";

    document.getElementById('aiImagePreview').src = "";
    document.getElementById('btnResetAi').classList.add('d-none');
    aiPredictedType = null;

    var locStatus = document.getElementById('aiLocationStatus');
    var locIcon = document.getElementById('aiLocationIcon');
    var locText = document.getElementById('aiLocationText');
    if (locStatus && locIcon && locText) {
      locStatus.style.borderColor = 'rgba(255,255,255,0.1)';
      locIcon.className = 'bi bi-geo-alt-fill text-muted mt-1';
      locText.textContent = 'Konum kontrol ediliyor...';
    }

    elBtnRecord.disabled = true;
    document.getElementById('btnRecordText').innerHTML = '<i class="bi bi-image me-2"></i>Önce Fotoğraf Yükleyin';
    elRewardAmount.textContent = '– WVT';
  }
  window.resetAiForm = _resetAiForm;

  function _processAiPredictions(predictions) {
    document.getElementById('aiScanOverlay').classList.add('d-none');
    document.getElementById('aiResultArea').classList.remove('d-none');

    if (!predictions || predictions.length === 0) return;

    var bestMatch = predictions[0].className.toLowerCase();
    var prob = (predictions[0].probability * 100).toFixed(1);

    document.getElementById('aiRawClass').textContent = 'Model Tahmini: ' + bestMatch;
    document.getElementById('aiConfidence').textContent = 'Eminlik: %' + prob;

    var mappedType = 4; // Default Organik
    if (bestMatch.includes('bottle') || bestMatch.includes('plastic') || bestMatch.includes('jug')) mappedType = 0;
    else if (bestMatch.includes('glass') || bestMatch.includes('cup') || bestMatch.includes('goblet')) mappedType = 1;
    else if (bestMatch.includes('can') || bestMatch.includes('tin') || bestMatch.includes('pop bottle')) mappedType = 2; // Metal/Kutu
    else if (bestMatch.includes('paper') || bestMatch.includes('carton') || bestMatch.includes('envelope') || bestMatch.includes('book')) mappedType = 3;
    else if (bestMatch.includes('battery') || bestMatch.includes('chemical')) mappedType = 5;
    else if (bestMatch.includes('computer') || bestMatch.includes('laptop') || bestMatch.includes('phone') || bestMatch.includes('monitor') || bestMatch.includes('mouse') || bestMatch.includes('keyboard') || bestMatch.includes('television')) mappedType = 6;

    aiPredictedType = mappedType;
    var typeName = WASTE_TYPES[mappedType];

    document.getElementById('aiDetectedType').innerHTML = 'Tespit Edilen: <strong>' + typeName + '</strong>';

    var expectedKg = 0.5;
    var rewardStr = (expectedKg * getRewardRate(mappedType)).toFixed(2);
    elRewardAmount.textContent = '~' + rewardStr + ' WVT (Tahmini)';

    _verifyLocationAndEnableMint();
  }

  function _verifyLocationAndEnableMint() {
    var locStatus = document.getElementById('aiLocationStatus');
    var locText = document.getElementById('aiLocationText');
    var locIcon = document.getElementById('aiLocationIcon');
    var btnRecordText = document.getElementById('btnRecordText');

    if (!navigator.geolocation) {
      if (locIcon) locIcon.className = 'bi bi-x-circle-fill text-danger mt-1';
      if (locText) locText.innerHTML = '<strong class="text-danger">Hata:</strong> Tarayıcınız konum özelliğini desteklemiyor.';
      return;
    }

    navigator.geolocation.getCurrentPosition(function (position) {
      var userLat = position.coords.latitude;
      var userLon = position.coords.longitude;

      var nearestBin = null;
      var minDistance = Infinity;

      for (var i = 0; i < IZMIR_BINS.length; i++) {
        var bin = IZMIR_BINS[i];
        var dist = getDistanceFromLatLonInM(userLat, userLon, bin.lat, bin.lon);
        if (dist < minDistance) {
          minDistance = dist;
          nearestBin = bin;
        }
      }

      if (minDistance <= 50) {
        if (locStatus) locStatus.style.borderColor = 'rgba(0, 229, 168, 0.4)';
        if (locIcon) locIcon.className = 'bi bi-check-circle-fill text-accent mt-1';
        if (locText) locText.innerHTML = '<strong class="text-accent">Doğrulandı:</strong> ' + nearestBin.name + ' istasyonuna ' + minDistance + 'm mesafedesiniz.';

        elBtnRecord.disabled = false;
        btnRecordText.innerHTML = '<i class="bi bi-send-check me-2"></i>WVT Mint Et';
      } else {
        if (locStatus) locStatus.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        if (locIcon) locIcon.className = 'bi bi-exclamation-triangle-fill text-danger mt-1';
        if (locText) locText.innerHTML = '<strong class="text-danger">Çok Uzaksınız:</strong> En yakın nokta ' + nearestBin.name + ' (' + minDistance + 'm). Max sınır 50m.';

        elBtnRecord.disabled = true;
        btnRecordText.innerHTML = '<i class="bi bi-lock me-2"></i>Konumunuz Uzak';
      }
      document.getElementById('btnResetAi').classList.remove('d-none');
    }, function (error) {
      if (locStatus) locStatus.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      if (locIcon) locIcon.className = 'bi bi-x-circle-fill text-danger mt-1';
      if (locText) locText.innerHTML = '<strong class="text-danger">İzin Reddedildi:</strong> İşlem için sistemdeki konum iznini vermelisiniz.';
      document.getElementById('btnResetAi').classList.remove('d-none');
    }, { enableHighAccuracy: true });
  }

  // ─────────────────────────────────────────────
  // 10. ANIMATED COUNTERS
  // ─────────────────────────────────────────────

  function _animateCounter(id, target, duration) {
    duration = duration || 1500;
    var el = document.getElementById(id);
    if (!el || isNaN(target)) return;
    var start = parseInt(el.textContent.replace(/\D/g, '')) || 0;
    var range = target - start;
    if (range === 0) return;
    var startTime = performance.now();

    function update(now) {
      var elapsed = now - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + range * ease).toLocaleString('tr-TR');
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  // ─────────────────────────────────────────────
  // 11. INTERSECTION OBSERVER – counter trigger
  // ─────────────────────────────────────────────

  var counterObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var el = entry.target;
        var target = parseInt(el.dataset.target);
        _animateCounter(el.id, target, 2000);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.counter').forEach(function (el) {
    counterObserver.observe(el);
  });

  // ─────────────────────────────────────────────
  // 12. NAVBAR SCROLL EFFECT
  // ─────────────────────────────────────────────

  var mainNav = document.getElementById('mainNav');
  if (mainNav) {
    window.addEventListener('scroll', function () {
      mainNav.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  // ─────────────────────────────────────────────
  // 13. AUTO-RECONNECT (İptal Edildi - Kullanıcı İstediğinde Bağlanacak)
  // ─────────────────────────────────────────────
  // Kod bilerek yorum satırına alındı
  /*
  if (typeof window.ethereum !== 'undefined') {
    if (localStorage.getItem('wv_disconnected') !== 'true') {
      window.ethereum.request({ method: 'eth_accounts' })
        .then(function (accounts) {
          if (accounts && accounts.length > 0) _connectWallet();
        })
        .catch(function (e) {});
    }
  }
  */

  // ─────────────────────────────────────────────
  // 14. DEMO STATS ANIMATION (hero)
  // ─────────────────────────────────────────────

  setTimeout(function () {
    _animateCounter('totalWaste', 12847, 2000);
    _animateCounter('totalMinted', 48320, 2200);
    _animateCounter('totalUsers', 1203, 1800);
  }, 600);

}); // end DOMContentLoaded
