// Circuit Breaker - Audio System Test Script
// Run this in the browser console to test audio functionality

console.log('🎵 Starting Circuit Breaker Audio System Test...');

// Test 1: Check if AudioManager is available
function testAudioManagerAvailability() {
  console.log('Test 1: AudioManager Availability');
  
  if (typeof window.game !== 'undefined' && window.game.audioManager) {
    console.log('✅ AudioManager found');
    return true;
  } else {
    console.log('❌ AudioManager not found');
    return false;
  }
}

// Test 2: Test sound effects
function testSoundEffects() {
  console.log('Test 2: Sound Effects');
  
  if (!window.game?.audioManager) {
    console.log('❌ AudioManager not available');
    return false;
  }
  
  const audioManager = window.game.audioManager;
  const sounds = ['ui_click', 'ui_hover', 'ui_slide', 'bounce', 'target', 'level_complete', 'game_over'];
  
  sounds.forEach((sound, index) => {
    setTimeout(() => {
      console.log(`🔊 Playing ${sound}...`);
      audioManager.playSound(sound);
    }, index * 500);
  });
  
  console.log('✅ Sound effects test initiated');
  return true;
}

// Test 3: Test volume controls
function testVolumeControls() {
  console.log('Test 3: Volume Controls');
  
  if (!window.game?.audioManager) {
    console.log('❌ AudioManager not available');
    return false;
  }
  
  const audioManager = window.game.audioManager;
  
  // Test master volume
  audioManager.setMasterVolume(0.5);
  console.log('✅ Master volume set to 50%');
  
  // Test SFX volume
  audioManager.setSFXVolume(0.7);
  console.log('✅ SFX volume set to 70%');
  
  // Test music volume
  audioManager.setMusicVolume(0.6);
  console.log('✅ Music volume set to 60%');
  
  // Play a test sound
  audioManager.playSound('ui_click');
  
  return true;
}

// Test 4: Test mute functionality
function testMuteFunctionality() {
  console.log('Test 4: Mute Functionality');
  
  if (!window.game?.audioManager) {
    console.log('❌ AudioManager not available');
    return false;
  }
  
  const audioManager = window.game.audioManager;
  
  // Test mute
  audioManager.setEnabled(false);
  console.log('🔇 Audio muted');
  
  // Try to play sound (should be silent)
  audioManager.playSound('ui_click');
  
  // Unmute after 1 second
  setTimeout(() => {
    audioManager.setEnabled(true);
    console.log('🔊 Audio unmuted');
    audioManager.playSound('ui_click');
  }, 1000);
  
  return true;
}

// Test 5: Test audio context resume
function testAudioContextResume() {
  console.log('Test 5: Audio Context Resume');
  
  if (!window.game?.audioManager) {
    console.log('❌ AudioManager not available');
    return false;
  }
  
  const audioManager = window.game.audioManager;
  
  // Check if context is suspended
  if (audioManager.isContextSuspended && audioManager.isContextSuspended()) {
    console.log('⏸️ Audio context is suspended, attempting to resume...');
    audioManager.resumeContext().then(() => {
      console.log('✅ Audio context resumed');
      audioManager.playSound('ui_click');
    });
  } else {
    console.log('✅ Audio context is active');
    audioManager.playSound('ui_click');
  }
  
  return true;
}

// Test 6: Test music transitions
function testMusicTransitions() {
  console.log('Test 6: Music Transitions');
  
  if (!window.game?.audioManager) {
    console.log('❌ AudioManager not available');
    return false;
  }
  
  const audioManager = window.game.audioManager;
  
  // Test fade to new music
  audioManager.fadeToMusic('Dead_Space.mp3', 2.0).then(() => {
    console.log('✅ Music transition initiated');
  });
  
  return true;
}

// Test 7: Performance test
function testAudioPerformance() {
  console.log('Test 7: Audio Performance');
  
  if (!window.game?.audioManager) {
    console.log('❌ AudioManager not available');
    return false;
  }
  
  const audioManager = window.game.audioManager;
  const startTime = performance.now();
  
  // Play multiple sounds rapidly
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      audioManager.playSound('ui_click');
    }, i * 100);
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`✅ Performance test completed in ${duration.toFixed(2)}ms`);
  
  return true;
}

// Run all tests
function runAllTests() {
  console.log('🚀 Running all audio tests...\n');
  
  const tests = [
    testAudioManagerAvailability,
    testSoundEffects,
    testVolumeControls,
    testMuteFunctionality,
    testAudioContextResume,
    testMusicTransitions,
    testAudioPerformance
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach((test, index) => {
    try {
      const result = test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Test ${index + 1} failed with error:`, error);
      failed++;
    }
    
    // Add delay between tests
    setTimeout(() => {
      console.log(`\n--- Test ${index + 1} completed ---\n`);
    }, (index + 1) * 2000);
  });
  
  // Final results
  setTimeout(() => {
    console.log('\n🎯 FINAL TEST RESULTS:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  }, tests.length * 2000 + 1000);
}

// Export test functions for manual testing
window.audioTests = {
  testAudioManagerAvailability,
  testSoundEffects,
  testVolumeControls,
  testMuteFunctionality,
  testAudioContextResume,
  testMusicTransitions,
  testAudioPerformance,
  runAllTests
};

console.log('🎵 Audio test script loaded. Run audioTests.runAllTests() to start testing.'); 