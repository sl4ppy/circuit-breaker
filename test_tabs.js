// Test script for stats menu tab switching
// Run this in the browser console when the stats menu is open

console.log('🧪 Testing Stats Menu Tab Switching...');

function testTabSwitching() {
  if (!window.game || !window.game['statsMenu']) {
    console.log('❌ Stats menu not available. Make sure to open the stats menu first (press T from main menu).');
    return;
  }

  const statsMenu = window.game['statsMenu'];
  
  console.log('✅ Stats menu found');
  console.log('📊 Current tab:', statsMenu['currentTab']);
  
  // Test tab switching
  console.log('\n🔄 Testing tab switching...');
  
  // Test each tab
  const tabs = ['overview', 'levels', 'performance', 'sessions'];
  const keyCodes = ['Digit1', 'Digit2', 'Digit3', 'Digit4'];
  
  tabs.forEach((tab, index) => {
    console.log(`\nTesting tab ${index + 1} (${tab})...`);
    
    // Simulate key press
    statsMenu.handleInput(keyCodes[index]);
    
    // Check if tab changed
    const newTab = statsMenu['currentTab'];
    if (newTab === tab) {
      console.log(`✅ Tab ${index + 1} working correctly`);
    } else {
      console.log(`❌ Tab ${index + 1} failed. Expected: ${tab}, Got: ${newTab}`);
    }
  });
  
  console.log('\n🎉 Tab switching test complete!');
  console.log('💡 Try pressing 1-4 keys in the stats menu to switch tabs.');
}

// Run the test
testTabSwitching(); 