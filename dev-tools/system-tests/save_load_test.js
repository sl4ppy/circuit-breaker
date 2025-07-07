// Circuit Breaker - Save/Load System Test Script
// Run this in the browser console to test the save/load functionality

console.log('🎮 Circuit Breaker - Save/Load System Test');
console.log('==========================================');

// Wait for game to be available
function waitForGame() {
  return new Promise((resolve) => {
    const checkGame = () => {
      if (window.game && window.game.openSaveLoadMenu) {
        resolve(window.game);
      } else {
        setTimeout(checkGame, 100);
      }
    };
    checkGame();
  });
}

async function runSaveLoadTests() {
  const game = await waitForGame();
  console.log('✅ Game instance found');

  // Test 1: Open Save/Load Menu
  console.log('\n🧪 Test 1: Opening Save/Load Menu');
  try {
    game.openSaveLoadMenu();
    console.log('✅ Save/Load menu opened successfully');
  } catch (error) {
    console.error('❌ Failed to open save/load menu:', error);
  }

  // Test 2: Check Storage Manager
  console.log('\n🧪 Test 2: Testing Storage Manager');
  try {
    const storageManager = game.storageManager;
    if (storageManager) {
      console.log('✅ StorageManager found');
      
      // Test creating new progress
      const newProgress = storageManager.createNewProgress();
      console.log('✅ New progress created:', {
        level: newProgress.currentLevel,
        score: newProgress.totalScore,
        lives: newProgress.lives,
        achievements: newProgress.achievements.size
      });

      // Test saving progress
      const saveSuccess = storageManager.saveProgress(newProgress, 0);
      console.log('✅ Save test:', saveSuccess ? 'SUCCESS' : 'FAILED');

      // Test loading progress
      const loadedProgress = storageManager.loadProgress(0);
      console.log('✅ Load test:', loadedProgress ? 'SUCCESS' : 'FAILED');

      // Test save slots
      const slots = storageManager.getSaveSlots();
      console.log('✅ Save slots found:', slots.length);

      // Test storage info
      const storageInfo = storageManager.getStorageInfo();
      console.log('✅ Storage info:', storageInfo);
    } else {
      console.error('❌ StorageManager not found');
    }
  } catch (error) {
    console.error('❌ Storage Manager test failed:', error);
  }

  // Test 3: Check Achievement Manager
  console.log('\n🧪 Test 3: Testing Achievement Manager');
  try {
    const achievementManager = game.achievementManager;
    if (achievementManager) {
      console.log('✅ AchievementManager found');
      
      // Get all achievements
      const allAchievements = achievementManager.getAllAchievements();
      console.log('✅ Total achievements:', allAchievements.length);

      // Get unlocked achievements
      const unlockedAchievements = achievementManager.getUnlockedAchievements();
      console.log('✅ Unlocked achievements:', unlockedAchievements.length);

      // Get achievement stats
      const stats = achievementManager.getAchievementStats();
      console.log('✅ Achievement stats:', stats);

      // Test unlocking an achievement
      const unlockSuccess = achievementManager.unlockAchievement('first_goal');
      console.log('✅ Achievement unlock test:', unlockSuccess ? 'SUCCESS' : 'FAILED (already unlocked)');
    } else {
      console.error('❌ AchievementManager not found');
    }
  } catch (error) {
    console.error('❌ Achievement Manager test failed:', error);
  }

  // Test 4: Test Game Progress Integration
  console.log('\n🧪 Test 4: Testing Game Progress Integration');
  try {
    // Check if game progress exists
    if (game.gameProgress) {
      console.log('✅ Game progress found:', {
        currentLevel: game.gameProgress.currentLevel,
        totalScore: game.gameProgress.totalScore,
        lives: game.gameProgress.lives,
        gamesPlayed: game.gameProgress.gamesPlayed,
        totalGoalsReached: game.gameProgress.totalGoalsReached,
        totalBallsLost: game.gameProgress.totalBallsLost,
        playTime: game.gameProgress.playTime
      });
    } else {
      console.error('❌ Game progress not found');
    }
  } catch (error) {
    console.error('❌ Game Progress test failed:', error);
  }

  // Test 5: Test Save/Load Menu UI
  console.log('\n🧪 Test 5: Testing Save/Load Menu UI');
  try {
    const saveLoadMenu = game.saveLoadMenu;
    if (saveLoadMenu) {
      console.log('✅ SaveLoadMenu found');
      console.log('✅ Menu visible:', saveLoadMenu.isMenuVisible());
      
      // Test menu methods
      console.log('✅ Menu methods available:', {
        show: typeof saveLoadMenu.show === 'function',
        hide: typeof saveLoadMenu.hide === 'function',
        handlePointerMove: typeof saveLoadMenu.handlePointerMove === 'function',
        handlePointerDown: typeof saveLoadMenu.handlePointerDown === 'function',
        handleKeyPress: typeof saveLoadMenu.handleKeyPress === 'function'
      });
    } else {
      console.error('❌ SaveLoadMenu not found');
    }
  } catch (error) {
    console.error('❌ Save/Load Menu UI test failed:', error);
  }

  console.log('\n🎉 Save/Load System Test Complete!');
  console.log('\n📋 Manual Test Instructions:');
  console.log('1. Press "L" on the main menu to open Save/Load menu');
  console.log('2. Use arrow keys to navigate between save slots');
  console.log('3. Press Enter to load a slot, N for new game, D for delete');
  console.log('4. Press Escape to close the menu');
  console.log('5. Play the game to see auto-save and achievement tracking');
}

// Run the tests
runSaveLoadTests().catch(console.error); 