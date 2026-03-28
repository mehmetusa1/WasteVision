// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WasteVision is ERC20, Ownable {

    // ─── Sabitler ────────────────────────────────────────
    uint256 public constant MIN_AMOUNT = 100; // Minimum 100 gram

    // ─── Atık Türleri ────────────────────────────────────
    enum WasteType {
        Plastic,    // 0
        Glass,      // 1
        Metal,      // 2
        Paper,      // 3
        Organic,    // 4
        Hazardous,  // 5
        EWaste      // 6
    }

    struct WasteRecord {
        address recorder;
        uint8   wasteType;
        uint256 amountInGrams;
        string  location;
        string  description;
        uint256 mintedTokens;
        uint256 timestamp;
    }

    WasteRecord[] public wasteRecords;
    mapping(address => uint256[]) public userRecordIds;
    mapping(address => uint256)   public totalWasteByUser;
    uint256 public totalWasteRecorded;

    event WasteRecorded(
        address indexed recorder,
        uint8   indexed wasteType,
        uint256         amountInGrams,
        uint256         mintedTokens,
        uint256         recordId,
        string          location
    );

    constructor(address initialOwner)
        ERC20("WasteVision Token", "WVT")
        Ownable(initialOwner)
    {}

    /**
     * @notice Atık kaydeder ve türüne göre farklı miktarda WVT basar.
     */
    function recordWasteAndMint(
        uint8   wasteType,
        uint256 amountInGrams,
        string  calldata location,
        string  calldata description
    ) external {
        require(amountInGrams >= MIN_AMOUNT, "WasteVision: Minimum 100 gram");
        require(wasteType <= uint8(WasteType.EWaste), "WasteVision: Gecersiz tur");
        require(bytes(location).length > 0, "WasteVision: Konum bos olamaz");

        // ─── ÖDÜL HESAPLAMA (Fiyat Listesi) ───
        uint256 rewardRate;

        if (wasteType == uint8(WasteType.Plastic)) {
            rewardRate = 5 * 10**18;  // Plastik: 5 WVT per kg
        } else if (wasteType == uint8(WasteType.Glass)) {
            rewardRate = 3 * 10**18;  // Cam: 3 WVT per kg
        } else if (wasteType == uint8(WasteType.Metal)) {
            rewardRate = 10 * 10**18; // Metal: 10 WVT per kg
        } else if (wasteType == uint8(WasteType.Paper)) {
            rewardRate = 2 * 10**18;  // Kagit: 2 WVT per kg
        } else {
            rewardRate = 1 * 10**18;  // Digerleri (Organik vb.): 1 WVT per kg
        }

        // Gram üzerinden hesapla: (gram * oran) / 1000
        uint256 tokensToMint = (amountInGrams * rewardRate) / 1000;
        require(tokensToMint > 0, "WasteVision: Miktar cok kucuk");

        // Kaydı oluştur
        uint256 recordId = wasteRecords.length;
        wasteRecords.push(WasteRecord({
            recorder:      msg.sender,
            wasteType:     wasteType,
            amountInGrams: amountInGrams,
            location:      location,
            description:   description,
            mintedTokens:  tokensToMint,
            timestamp:     block.timestamp
        }));

        userRecordIds[msg.sender].push(recordId);
        totalWasteByUser[msg.sender] += amountInGrams;
        totalWasteRecorded           += amountInGrams;

        // Hesaplanan miktar kadar WVT bas
        _mint(msg.sender, tokensToMint);

        emit WasteRecorded(msg.sender, wasteType, amountInGrams, tokensToMint, recordId, location);
    }

    function getUserRecordIds(address user) external view returns (uint256[] memory) {
        return userRecordIds[user];
    }

    function getRecord(uint256 recordId) external view returns (WasteRecord memory) {
        require(recordId < wasteRecords.length, "WasteVision: Kayit bulunamadi");
        return wasteRecords[recordId];
    }

    function totalRecords() external view returns (uint256) {
        return wasteRecords.length;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}