// ═══════════════════════════════════════════════════════════════
//  WasteVision – Anchor Program (Solana Devnet)
//  Atık kaydı ve WVT SPL Token ödüllendirme sistemi
// ═══════════════════════════════════════════════════════════════

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Token, TokenAccount},
};

declare_id!("BZmQnBUZS1aQfjXCC7y4LnVxjjujzT6jvDhNrdforWA3");

// ──────────────────────────────────────────
// Sabitler
// ──────────────────────────────────────────
pub const MIN_AMOUNT: u64 = 100; // Minimum 100 gram
pub const MAX_LOCATION_LEN: usize = 100;
pub const MAX_DESCRIPTION_LEN: usize = 200;

// WVT token: 9 decimal (Solana standardı)
// 1 WVT = 1_000_000_000 base units
// Ödül: (gram * rate * 10^9) / 1000 = gram * rate * 10^6 base unit
pub const WVT_DECIMALS: u8 = 9;

// ──────────────────────────────────────────
// Program
// ──────────────────────────────────────────
#[program]
pub mod waste_vision {
    use super::*;

    /// Programı başlatır: ProgramState ve WVT Mint oluşturur.
    /// Yalnızca bir kez çağrılır (deployer tarafından).
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.program_state;
        state.authority = ctx.accounts.authority.key();
        state.total_waste_recorded = 0;
        state.total_records = 0;
        state.bump = ctx.bumps.program_state;
        state.mint_bump = ctx.bumps.wvt_mint;

        msg!("WasteVision başlatıldı! WVT Mint: {}", ctx.accounts.wvt_mint.key());
        Ok(())
    }

    /// Atık kaydeder ve kullanıcıya WVT token basar.
    /// Solidity recordWasteAndMint() fonksiyonunun Solana karşılığı.
    pub fn record_waste(
        ctx: Context<RecordWaste>,
        waste_type: u8,
        amount_in_grams: u64,
        location: String,
        description: String,
    ) -> Result<()> {
        // ── Doğrulama ──────────────────────────────────
        require!(
            amount_in_grams >= MIN_AMOUNT,
            WasteVisionError::AmountTooSmall
        );
        require!(waste_type <= 6, WasteVisionError::InvalidWasteType);
        require!(!location.is_empty(), WasteVisionError::EmptyLocation);
        require!(
            location.len() <= MAX_LOCATION_LEN,
            WasteVisionError::LocationTooLong
        );
        require!(
            description.len() <= MAX_DESCRIPTION_LEN,
            WasteVisionError::DescriptionTooLong
        );

        // ── Ödül Hesaplama ─────────────────────────────
        // Solidity ile birebir aynı oran tablosu
        let reward_rate: u64 = match waste_type {
            0 => 5,  // Plastik:   5 WVT/kg
            1 => 3,  // Cam:       3 WVT/kg
            2 => 10, // Metal:    10 WVT/kg
            3 => 2,  // Kağıt:    2 WVT/kg
            _ => 1,  // Organik/Tehlikeli/E-Atık: 1 WVT/kg
        };

        // (gram * rate * 10^9) / 1000 = base units (9 decimal)
        let tokens_to_mint = amount_in_grams
            .checked_mul(reward_rate)
            .ok_or(WasteVisionError::Overflow)?
            .checked_mul(1_000_000_u64) // 10^9 / 1000 = 10^6
            .ok_or(WasteVisionError::Overflow)?;

        require!(tokens_to_mint > 0, WasteVisionError::AmountTooSmall);

        // ── UserStats Güncelle ─────────────────────────
        let stats = &mut ctx.accounts.user_stats;
        if stats.user == Pubkey::default() {
            // İlk kullanım: başlat
            stats.user = ctx.accounts.user.key();
            stats.bump = ctx.bumps.user_stats;
        }
        stats.total_waste_grams = stats
            .total_waste_grams
            .checked_add(amount_in_grams)
            .ok_or(WasteVisionError::Overflow)?;
        stats.record_count = stats
            .record_count
            .checked_add(1)
            .ok_or(WasteVisionError::Overflow)?;
        stats.wvt_earned = stats
            .wvt_earned
            .checked_add(tokens_to_mint)
            .ok_or(WasteVisionError::Overflow)?;

        // ── ProgramState Güncelle ──────────────────────
        let state = &mut ctx.accounts.program_state;
        state.total_waste_recorded = state
            .total_waste_recorded
            .checked_add(amount_in_grams)
            .ok_or(WasteVisionError::Overflow)?;
        state.total_records = state
            .total_records
            .checked_add(1)
            .ok_or(WasteVisionError::Overflow)?;

        // ── WVT SPL Token Mint ─────────────────────────
        // PDA imzası: ["mint-authority"]
        let mint_auth_seeds: &[&[u8]] = &[b"mint-authority", &[ctx.bumps.mint_authority]];
        let signer_seeds = &[mint_auth_seeds];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.wvt_mint.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::mint_to(cpi_ctx, tokens_to_mint)?;

        // ── Event Emit ─────────────────────────────────
        emit!(WasteRecorded {
            recorder: ctx.accounts.user.key(),
            waste_type,
            amount_in_grams,
            minted_tokens: tokens_to_mint,
            record_count: stats.record_count,
            location: location.clone(),
        });

        msg!(
            "Atık kaydedildi: {}g {} türü → {} WVT basıldı",
            amount_in_grams,
            waste_type,
            tokens_to_mint
        );

        Ok(())
    }
}

// ──────────────────────────────────────────
// Hesap Yapıları (Account Contexts)
// ──────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// ProgramState: Global istatistikler
    /// PDA seed: ["program-state"]
    #[account(
        init,
        payer = authority,
        space = ProgramState::SPACE,
        seeds = [b"program-state"],
        bump
    )]
    pub program_state: Account<'info, ProgramState>,

    /// WVT Token Mint (PDA)
    /// PDA seed: ["wvt-mint"]
    #[account(
        init,
        payer = authority,
        mint::decimals = WVT_DECIMALS,
        mint::authority = mint_authority,
        seeds = [b"wvt-mint"],
        bump
    )]
    pub wvt_mint: Account<'info, Mint>,

    /// Mint Authority PDA (token basma yetkisi)
    /// PDA seed: ["mint-authority"]
    /// CHECK: Sadece PDA imzası için kullanılır
    #[account(
        seeds = [b"mint-authority"],
        bump
    )]
    pub mint_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct RecordWaste<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// UserStats: Kullanıcı başına istatistikler
    /// PDA seed: ["user-stats", user_pubkey]
    #[account(
        init_if_needed,
        payer = user,
        space = UserStats::SPACE,
        seeds = [b"user-stats", user.key().as_ref()],
        bump
    )]
    pub user_stats: Account<'info, UserStats>,

    /// ProgramState: Global istatistikler
    #[account(
        mut,
        seeds = [b"program-state"],
        bump = program_state.bump
    )]
    pub program_state: Account<'info, ProgramState>,

    /// WVT Mint (PDA)
    #[account(
        mut,
        seeds = [b"wvt-mint"],
        bump = program_state.mint_bump
    )]
    pub wvt_mint: Account<'info, Mint>,

    /// Mint Authority PDA
    /// CHECK: Sadece CPI imzası için kullanılır
    #[account(
        seeds = [b"mint-authority"],
        bump
    )]
    pub mint_authority: UncheckedAccount<'info>,

    /// Kullanıcının WVT Token Hesabı (ATA)
    /// Yoksa otomatik oluşturulur
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = wvt_mint,
        associated_token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

// ──────────────────────────────────────────
// Hesap Veri Yapıları (On-Chain State)
// ──────────────────────────────────────────

/// Global program durumu
#[account]
pub struct ProgramState {
    pub authority: Pubkey,         // 32
    pub total_waste_recorded: u64, // 8  – toplam gram
    pub total_records: u64,        // 8  – toplam kayıt sayısı
    pub bump: u8,                  // 1
    pub mint_bump: u8,             // 1  – wvt-mint bump
}

impl ProgramState {
    pub const SPACE: usize = 8 + 32 + 8 + 8 + 1 + 1 + 64; // 64 byte reserve
}

/// Kullanıcı başına istatistikler (Solidity'deki mapping karşılığı)
#[account]
pub struct UserStats {
    pub user: Pubkey,              // 32
    pub total_waste_grams: u64,    // 8
    pub record_count: u64,         // 8
    pub wvt_earned: u64,           // 8  – base units
    pub bump: u8,                  // 1
}

impl UserStats {
    pub const SPACE: usize = 8 + 32 + 8 + 8 + 8 + 1 + 64; // 64 byte reserve
}

// ──────────────────────────────────────────
// Olaylar (Events)
// ──────────────────────────────────────────

#[event]
pub struct WasteRecorded {
    pub recorder: Pubkey,
    pub waste_type: u8,
    pub amount_in_grams: u64,
    pub minted_tokens: u64,
    pub record_count: u64,
    pub location: String,
}

// ──────────────────────────────────────────
// Hata Kodları
// ──────────────────────────────────────────

#[error_code]
pub enum WasteVisionError {
    #[msg("Minimum 100 gram atık kaydedilmelidir")]
    AmountTooSmall,
    #[msg("Geçersiz atık türü (0-6 aralığında olmalı)")]
    InvalidWasteType,
    #[msg("Konum boş olamaz")]
    EmptyLocation,
    #[msg("Konum çok uzun (max 100 karakter)")]
    LocationTooLong,
    #[msg("Açıklama çok uzun (max 200 karakter)")]
    DescriptionTooLong,
    #[msg("Matematiksel taşma hatası")]
    Overflow,
}
