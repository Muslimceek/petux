import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import { StartScreen, GameOverScreen, ShopScreen, HUD, PauseScreen } from './components/UIOverlays';
import { GameState, PlayerData, DRONE_COLORS } from './types';
import { loadPlayerData, savePlayerData } from './utils/storage';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState<number>(0);
  const [playerData, setPlayerData] = useState<PlayerData>(loadPlayerData());

  // Save data whenever it changes
  useEffect(() => {
    savePlayerData(playerData);
  }, [playerData]);

  const handleStartGame = () => {
    setScore(0);
    setGameState(GameState.PLAYING);
  };

  const handleAddCoins = (amount: number) => {
    setPlayerData(prev => ({
      ...prev,
      totalCoins: prev.totalCoins + amount
    }));
  };

  const handleBuyColor = (id: string, cost: number) => {
    const color = DRONE_COLORS.find(c => c.id === id);
    if (!color) return;

    if (playerData.totalCoins >= cost && !playerData.unlockedColors.includes(color.hex)) {
      setPlayerData(prev => ({
        ...prev,
        totalCoins: prev.totalCoins - cost,
        unlockedColors: [...prev.unlockedColors, color.hex],
        color: color.hex // Auto equip
      }));
    }
  };

  const handleSelectColor = (hex: string) => {
    if (playerData.unlockedColors.includes(hex)) {
      setPlayerData(prev => ({ ...prev, color: hex }));
    }
  };

  const togglePause = () => {
    if (gameState === GameState.PLAYING) {
      setGameState(GameState.PAUSED);
    } else if (gameState === GameState.PAUSED) {
      setGameState(GameState.PLAYING);
    }
  };

  const handleQuitGame = () => {
    setGameState(GameState.MENU);
  };

  return (
    <div className="relative w-full h-screen bg-[#FAFAFA] overflow-hidden select-none">
      {/* Game Layer */}
      <GameCanvas 
        gameState={gameState} 
        setGameState={setGameState} 
        setScore={setScore} 
        addCoins={handleAddCoins}
        playerColor={playerData.color}
      />

      {/* UI Overlay Layer */}
      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && (
        <HUD score={score} togglePause={togglePause} />
      )}

      {gameState === GameState.MENU && (
        <StartScreen 
          startGame={handleStartGame} 
          openShop={() => setGameState(GameState.SHOP)}
          playerData={playerData}
        />
      )}

      {gameState === GameState.GAME_OVER && (
        <GameOverScreen 
          startGame={handleStartGame}
          openShop={() => setGameState(GameState.SHOP)}
          currentScore={score}
          playerData={playerData}
        />
      )}

      {gameState === GameState.PAUSED && (
        <PauseScreen 
          togglePause={togglePause}
          quitGame={handleQuitGame}
        />
      )}

      {gameState === GameState.SHOP && (
        <ShopScreen 
          closeShop={() => setGameState(GameState.MENU)}
          playerData={playerData}
          buyColor={handleBuyColor}
          selectColor={handleSelectColor}
        />
      )}
    </div>
  );
};

export default App;