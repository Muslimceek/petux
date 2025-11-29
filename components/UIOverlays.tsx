import React from 'react';
import { GameState, DRONE_COLORS, PlayerData } from '../types';

interface UIProps {
  gameState: GameState;
  startGame: () => void;
  openShop: () => void;
  closeShop: () => void;
  playerData: PlayerData;
  buyColor: (id: string, cost: number) => void;
  selectColor: (colorHex: string) => void;
  currentScore: number;
  togglePause: () => void;
  quitGame: () => void;
}

// Liquid Glass Button
const Button: React.FC<{ onClick: () => void; children: React.ReactNode; variant?: 'primary' | 'secondary' }> = ({ onClick, children, variant = 'primary' }) => (
  <button
    onClick={onClick}
    className={`
      w-full h-16 rounded-2xl text-lg font-bold tracking-tight transition-all duration-300 transform active:scale-95 touch-manipulation flex items-center justify-center shadow-lg backdrop-blur-md
      ${variant === 'primary' 
        ? 'bg-black/90 text-white hover:bg-black' 
        : 'bg-white/40 border border-white/60 text-slate-800 hover:bg-white/60'}
    `}
  >
    {children}
  </button>
);

export const StartScreen: React.FC<Pick<UIProps, 'startGame' | 'openShop' | 'playerData'>> = ({ startGame, openShop, playerData }) => (
  <div className="absolute inset-0 z-10 flex flex-col bg-white/30 backdrop-blur-sm">
    <div className="flex-1 flex flex-col items-center justify-center pt-20">
      <div className="w-32 h-32 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full blur-3xl opacity-20 absolute top-1/4"></div>
      <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-none mb-4 text-center z-10 relative">
        MUSLIM<br/><span className="text-4xl md:text-6xl font-light tracking-widest text-slate-600">GRAVITY RUSH</span>
      </h1>
      <p className="text-xs font-bold tracking-[0.3em] text-slate-400 uppercase mt-4">
        Premium Edition
      </p>
    </div>
    
    {/* Liquid Glass Bottom Sheet */}
    <div className="w-full bg-white/60 backdrop-blur-3xl p-8 pb-12 rounded-t-[3rem] shadow-[0_-20px_60px_rgba(0,0,0,0.05)] border-t border-white/40">
      <div className="max-w-md mx-auto flex flex-col gap-4">
        <Button onClick={startGame}>BEGIN JOURNEY</Button>
        <Button onClick={openShop} variant="secondary">
          COLLECTION — {playerData.totalCoins} 
          <span className="ml-1 text-amber-500">☾</span>
        </Button>
        <div className="mt-4 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-widest opacity-60">
          Tap to Invert Gravity
        </div>
      </div>
    </div>
  </div>
);

export const GameOverScreen: React.FC<Pick<UIProps, 'startGame' | 'openShop' | 'currentScore' | 'playerData'>> = ({ startGame, openShop, currentScore, playerData }) => (
  <div className="absolute inset-0 z-10 flex flex-col justify-end bg-slate-900/10 backdrop-blur-sm animate-in fade-in duration-300">
    <div className="w-full bg-white/80 backdrop-blur-3xl p-8 pb-12 rounded-t-[3rem] shadow-2xl border-t border-white/50">
      <div className="max-w-md mx-auto text-center">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Distance Traveled</h2>
        <h1 className="text-8xl font-black text-slate-900 tracking-tighter leading-none mb-8 font-mono">
          {currentScore}
        </h1>
        
        <div className="flex flex-col gap-4">
          <Button onClick={startGame}>TRY AGAIN</Button>
          <Button onClick={openShop} variant="secondary">STORE ({playerData.totalCoins})</Button>
        </div>
      </div>
    </div>
  </div>
);

export const PauseScreen: React.FC<Pick<UIProps, 'togglePause' | 'quitGame'>> = ({ togglePause, quitGame }) => (
  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-2xl animate-in zoom-in-95 duration-200">
    <div className="w-full max-w-md p-8 text-center">
      <h2 className="text-6xl font-black text-slate-900 tracking-tighter mb-12">PAUSED</h2>
      <div className="flex flex-col gap-4">
        <Button onClick={togglePause}>RESUME</Button>
        <Button onClick={quitGame} variant="secondary">EXIT TO MENU</Button>
      </div>
    </div>
  </div>
);

export const ShopScreen: React.FC<Pick<UIProps, 'closeShop' | 'playerData' | 'buyColor' | 'selectColor'>> = ({ closeShop, playerData, buyColor, selectColor }) => (
  <div className="absolute inset-0 z-20 flex flex-col bg-[#F8FAFC]">
    {/* Header */}
    <div className="px-8 pt-16 pb-6 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex justify-between items-end sticky top-0 z-30">
      <h2 className="text-5xl font-black text-slate-900 tracking-tighter">GALLERY</h2>
      <div className="text-right">
        <div className="text-xl font-black font-mono text-slate-800">{playerData.totalCoins} <span className="text-amber-500">☾</span></div>
      </div>
    </div>

    {/* List */}
    <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
      <div className="grid grid-cols-1 gap-4 max-w-xl mx-auto pb-32">
        {DRONE_COLORS.map((color) => {
          const isUnlocked = playerData.unlockedColors.includes(color.hex);
          const isSelected = playerData.color === color.hex;
          const canAfford = playerData.totalCoins >= color.price;

          return (
            <div 
              key={color.id} 
              onClick={() => {
                if (isUnlocked) selectColor(color.hex);
                else if (canAfford) buyColor(color.id, color.price);
              }}
              className={`
                relative p-5 rounded-[2rem] border transition-all duration-300 active:scale-[0.98] overflow-hidden
                ${isSelected 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-xl' 
                  : 'bg-white border-white/50 text-slate-800 shadow-sm hover:shadow-md'}
              `}
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-5">
                  <div 
                    className={`w-14 h-14 rounded-full shadow-inner relative overflow-hidden ring-4 ${isSelected ? 'ring-white/20' : 'ring-slate-50'}`}
                    style={{ background: `linear-gradient(135deg, ${color.gradient?.[0] || color.hex}, ${color.gradient?.[1] || color.hex})` }}
                  >
                     <div className="absolute top-1 left-3 w-4 h-2 bg-white/40 rounded-full blur-[2px] transform -rotate-45"></div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight leading-none">{color.name}</h3>
                    <p className={`text-xs font-mono mt-1 font-medium ${isSelected ? 'text-white/50' : 'text-slate-400'}`}>
                      {isUnlocked ? 'OWNED' : `${color.price} CRESCENTS`}
                    </p>
                  </div>
                </div>
                
                {!isUnlocked && (
                  <div className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wide ${canAfford ? 'bg-black text-white' : 'bg-slate-100 text-slate-300'}`}>
                    Unlock
                  </div>
                )}
                {isSelected && (
                  <div className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                       <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Close Button */}
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40">
      <button 
        onClick={closeShop}
        className="w-16 h-16 bg-white/90 backdrop-blur-xl border border-white/50 rounded-full shadow-2xl flex items-center justify-center text-2xl text-slate-900 hover:scale-110 transition-transform"
      >
        ✕
      </button>
    </div>
  </div>
);

export const HUD: React.FC<{ score: number; togglePause: () => void }> = ({ score, togglePause }) => (
  <div className="absolute top-0 left-0 w-full p-6 pt-12 flex justify-between items-start pointer-events-none z-10">
    <div className="bg-white/60 backdrop-blur-xl px-8 py-3 rounded-full border border-white/40 shadow-sm flex items-center gap-2">
      <span className="text-amber-500 font-bold text-xl">☾</span>
      <span className="text-slate-900 font-mono text-3xl font-black tracking-tighter leading-none">{score}</span>
    </div>

    <button 
      onClick={togglePause}
      className="pointer-events-auto w-14 h-14 bg-white/60 backdrop-blur-xl rounded-full border border-white/40 shadow-sm flex items-center justify-center active:bg-white/80 transition-colors"
    >
      <div className="flex gap-1.5">
        <div className="w-1.5 h-5 bg-slate-900 rounded-full"></div>
        <div className="w-1.5 h-5 bg-slate-900 rounded-full"></div>
      </div>
    </button>
  </div>
);