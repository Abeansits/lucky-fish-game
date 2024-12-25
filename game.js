// Game data
const RODS = [
    { id: 'basic', name: 'Basic Rod', luckBonus: 1, description: 'A simple fishing rod' },
    { id: 'lucky', name: 'Lucky Rod', luckBonus: 1.5, description: 'Slightly increases rare fish chance' },
    { id: 'rare', name: 'Rare Hunter', luckBonus: 2, description: 'Good chance for rare fish' },
    { id: 'legendary', name: 'Legend Catcher', luckBonus: 3, description: 'Best chance for legendary fish' }
];

const FISH = [
    // Common fish (40% base chance) - Speed bonus
    { id: 'anchovy', name: 'Anchovy', rarity: 'common', baseChance: 0.4, emoji: '🐟', buff: { type: 'speed', value: 0.1, duration: 30 } },
    { id: 'herring', name: 'Herring', rarity: 'common', baseChance: 0.4, emoji: '🐟', buff: { type: 'speed', value: 0.1, duration: 30 } },
    { id: 'sardine', name: 'Sardine', rarity: 'common', baseChance: 0.4, emoji: '🐟', buff: { type: 'speed', value: 0.1, duration: 30 } },
    
    // Uncommon fish (30% base chance) - Double catch chance
    { id: 'mackerel', name: 'Mackerel', rarity: 'uncommon', baseChance: 0.3, emoji: '🐠', buff: { type: 'double_catch', value: 0.2, duration: 45 } },
    { id: 'bass', name: 'Bass', rarity: 'uncommon', baseChance: 0.3, emoji: '🐠', buff: { type: 'double_catch', value: 0.2, duration: 45 } },
    
    // Rare fish (20% base chance) - Extra luck
    { id: 'salmon', name: 'Salmon', rarity: 'rare', baseChance: 0.2, emoji: '🐡', buff: { type: 'luck', value: 0.15, duration: 60 } },
    { id: 'tuna', name: 'Tuna', rarity: 'rare', baseChance: 0.2, emoji: '🐡', buff: { type: 'luck', value: 0.15, duration: 60 } },
    
    // Legendary fish (10% base chance) - Major luck boost
    { id: 'shark', name: 'Great White Shark', rarity: 'legendary', baseChance: 0.1, emoji: '🦈', buff: { type: 'luck', value: 0.3, duration: 90 } },
    { id: 'whale', name: 'Blue Whale', rarity: 'legendary', baseChance: 0.1, emoji: '🐋', buff: { type: 'luck', value: 0.3, duration: 90 } }
];

// Game state
let selectedRod = RODS[0];
let inventory = [];
let activeBuffs = [];

// Create audio elements
const eatingSound = new Audio('Eating.mp3');
const commonSound = new Audio('Common.mp3');
const uncommonSound = new Audio('Uncommon.mp3');

// Function to play catch sound based on rarity
function playCatchSound(rarity) {
    switch(rarity) {
        case 'common':
            commonSound.currentTime = 0;
            commonSound.play();
            break;
        case 'uncommon':
            uncommonSound.currentTime = 0;
            uncommonSound.play();
            break;
        // For rare and legendary, we'll use uncommon sound as fallback
        case 'rare':
        case 'legendary':
            uncommonSound.currentTime = 0;
            uncommonSound.play();
            break;
    }
}

// DOM Elements
const rodsContainer = document.getElementById('rods-container');
const fishButton = document.getElementById('fish-button');
const fishCollection = document.getElementById('fish-collection');
const activeBuffsContainer = document.getElementById('active-buffs');

// Initialize game
function initGame() {
    renderRods();
    renderInventory();
    renderBuffs();
    initializeSwimmingFish();
    
    // Start the buff timer update loop
    setInterval(updateBuffTimers, 100); // Update every 100ms for smooth countdown
}

// Render fishing rods
function renderRods() {
    rodsContainer.innerHTML = RODS.map(rod => `
        <div class="rod-item ${rod.id === selectedRod.id ? 'selected' : ''}" 
             onclick="selectRod('${rod.id}')">
            <h3>${rod.name}</h3>
            <p>${rod.description}</p>
            <small>Luck Bonus: x${rod.luckBonus}</small>
        </div>
    `).join('');
}

// Select a rod
function selectRod(rodId) {
    selectedRod = RODS.find(rod => rod.id === rodId);
    renderRods();
}

// Calculate total luck bonus from buffs
function calculateTotalLuckBonus() {
    const luckBuffs = activeBuffs.filter(buff => buff.type === 'luck');
    return 1 + luckBuffs.reduce((sum, buff) => sum + buff.value, 0);
}

// Calculate catch speed bonus
function calculateSpeedBonus() {
    const speedBuffs = activeBuffs.filter(buff => buff.type === 'speed');
    return 1 - speedBuffs.reduce((sum, buff) => sum + buff.value, 0);
}

// Check for double catch
function shouldDoubleCatch() {
    const doubleBuffs = activeBuffs.filter(buff => buff.type === 'double_catch');
    const totalChance = doubleBuffs.reduce((sum, buff) => sum + buff.value, 0);
    return Math.random() < totalChance;
}

// Catch a fish
function catchFish() {
    // Disable button temporarily
    fishButton.disabled = true;
    
    // Calculate catch time with speed bonus
    const catchTime = 1500 * calculateSpeedBonus();
    
    // Add fishing animation
    const pond = document.getElementById('pond');
    pond.style.animation = `fishing ${catchTime}ms ease-in-out`;
    
    setTimeout(() => {
        const caught = calculateCatch();
        addToInventory(caught);
        
        // Check for double catch
        if (shouldDoubleCatch()) {
            addToInventory(caught);
            showNotification('Double Catch! 🎯', `You caught an extra ${caught.name}!`);
        }
        
        // Reset button and animation
        fishButton.disabled = false;
        pond.style.animation = '';
    }, catchTime);
}

// Calculate which fish is caught
function calculateCatch() {
    const random = Math.random();
    let chanceSum = 0;
    
    // Apply rod's luck bonus and buff bonuses to rare and legendary fish chances
    const totalLuckBonus = selectedRod.luckBonus * calculateTotalLuckBonus();
    
    const adjustedFish = FISH.map(fish => ({
        ...fish,
        adjustedChance: fish.rarity === 'rare' || fish.rarity === 'legendary' 
            ? fish.baseChance * totalLuckBonus 
            : fish.baseChance
    }));
    
    // Normalize chances
    const totalChance = adjustedFish.reduce((sum, fish) => sum + fish.adjustedChance, 0);
    const normalizedFish = adjustedFish.map(fish => ({
        ...fish,
        normalizedChance: fish.adjustedChance / totalChance
    }));
    
    // Select fish based on normalized chances
    for (const fish of normalizedFish) {
        chanceSum += fish.normalizedChance;
        if (random <= chanceSum) {
            return fish;
        }
    }
    
    return normalizedFish[0];
}

// Add caught fish to inventory
function addToInventory(fish) {
    inventory.push({
        ...fish,
        id: `${fish.id}_${Date.now()}` // Unique ID for each catch
    });
    renderInventory();
    
    // Play catch sound and show notification
    playCatchSound(fish.rarity);
    showCatchNotification(fish);
}

// Render inventory
function renderInventory() {
    const groupedFish = inventory.reduce((acc, fish) => {
        if (!acc[fish.id]) {
            acc[fish.id] = {
                ...fish,
                count: 0
            };
        }
        acc[fish.id].count++;
        return acc;
    }, {});

    fishCollection.innerHTML = Object.values(groupedFish)
        .map(fish => `
            <div class="fish-item ${fish.rarity}">
                <span>${fish.emoji}</span>
                <span>${fish.name}</span>
                <span>x${fish.count}</span>
                <button class="eat-button" onclick="eatFish('${fish.id}')">🍽️ Eat</button>
            </div>
        `)
        .join('');
}

// Add buff
function addBuff(fish) {
    const buff = {
        ...fish.buff,
        id: Date.now(),
        name: fish.name,
        rarity: fish.rarity,
        emoji: fish.emoji,
        startTime: Date.now(),
        endTime: Date.now() + (fish.buff.duration * 1000)
    };
    
    // Remove any existing buff of the same type
    activeBuffs = activeBuffs.filter(b => b.type !== buff.type);
    
    // Add the new buff
    activeBuffs.push(buff);
    renderBuffs();
    
    // Set timeout to remove buff
    setTimeout(() => {
        activeBuffs = activeBuffs.filter(b => b.id !== buff.id);
        renderBuffs();
    }, fish.buff.duration * 1000);
}

// Render buffs
function renderBuffs() {
    activeBuffsContainer.innerHTML = activeBuffs.map(buff => {
        const timeLeft = Math.ceil((buff.endTime - Date.now()) / 1000);
        const totalDuration = (buff.endTime - buff.startTime) / 1000;
        const progress = (timeLeft / totalDuration) * 100;
        
        let buffText = '';
        switch(buff.type) {
            case 'luck':
                buffText = `+${buff.value * 100}% Luck`;
                break;
            case 'speed':
                buffText = `+${buff.value * 100}% Speed`;
                break;
            case 'double_catch':
                buffText = `${buff.value * 100}% Double Catch`;
                break;
        }
        
        return `
            <div class="buff-item ${buff.rarity}" data-buff-id="${buff.id}">
                <div class="buff-progress" style="transform: scaleX(${progress / 100})"></div>
                <div class="buff-content">
                    <span>${buff.emoji}</span>
                    <span>${buffText}</span>
                    <span class="buff-timer">${timeLeft}s</span>
                </div>
            </div>
        `;
    }).join('');
}

// Start the buff countdown update loop
function updateBuffTimers() {
    const buffElements = document.querySelectorAll('.buff-item');
    buffElements.forEach(buffElement => {
        const buffId = buffElement.dataset.buffId;
        const buff = activeBuffs.find(b => b.id.toString() === buffId);
        if (buff) {
            const timeLeft = Math.ceil((buff.endTime - Date.now()) / 1000);
            const totalDuration = (buff.endTime - buff.startTime) / 1000;
            const progress = (timeLeft / totalDuration) * 100;
            
            const timerElement = buffElement.querySelector('.buff-timer');
            const progressElement = buffElement.querySelector('.buff-progress');
            
            if (timerElement) timerElement.textContent = `${timeLeft}s`;
            if (progressElement) progressElement.style.transform = `scaleX(${progress / 100})`;
        }
    });
}

// Add eat fish function
function eatFish(fishId) {
    // Find and remove one instance of the fish
    const index = inventory.findIndex(fish => fish.id.startsWith(fishId));
    if (index !== -1) {
        const fish = inventory[index];
        
        // Play eating sound
        eatingSound.currentTime = 0;
        eatingSound.play();
        
        // Add buff from eating
        addBuff(fish);
        
        // Remove the fish
        inventory.splice(index, 1);
        renderInventory();
        
        // Show eating notification
        showEatingNotification(fish);
    }
}

// Show generic notification
function showNotification(title, message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        animation: slideIn 0.5s ease-out;
        z-index: 1000;
    `;
    notification.innerHTML = `
        <h3>${title}</h3>
        <p>${message}</p>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease-in';
        setTimeout(() => notification.remove(), 500);
    }, 2000);
}

// Show eating notification
function showEatingNotification(fish) {
    const buffDescription = (() => {
        switch(fish.buff.type) {
            case 'luck':
                return `+${fish.buff.value * 100}% Luck for ${fish.buff.duration}s`;
            case 'speed':
                return `+${fish.buff.value * 100}% Fishing Speed for ${fish.buff.duration}s`;
            case 'double_catch':
                return `${fish.buff.value * 100}% Double Catch Chance for ${fish.buff.duration}s`;
            default:
                return '';
        }
    })();
    
    showNotification('Yum! 😋', `You ate the ${fish.name}\nGained: ${buffDescription}`);
}

// Show catch notification
function showCatchNotification(fish) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        animation: slideIn 0.5s ease-out;
        z-index: 1000;
    `;
    notification.innerHTML = `
        <h3>You caught a ${fish.rarity} fish!</h3>
        <p>${fish.emoji} ${fish.name}</p>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease-in';
        setTimeout(() => notification.remove(), 500);
    }, 2000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fishing {
        0% { transform: scale(1); }
        50% { transform: scale(0.95); }
        100% { transform: scale(1); }
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Event listeners
fishButton.addEventListener('click', catchFish);

// Swimming fish functionality
function createSwimmingFish() {
    const fish = document.createElement('div');
    fish.className = 'swimming-fish';
    
    // Randomly select a fish emoji from our collection
    const fishEmojis = FISH.map(f => f.emoji);
    const randomEmoji = fishEmojis[Math.floor(Math.random() * fishEmojis.length)];
    fish.textContent = randomEmoji;
    
    // Random starting position and direction
    const goingRight = Math.random() > 0.5;
    const verticalPos = Math.random() * 80 + 10; // Keep fish within 10-90% of height
    const duration = Math.random() * 10000 + 5000; // 5-15 seconds to cross
    
    fish.style.cssText = `
        --start-pos: ${goingRight ? '-50px' : 'calc(100% + 50px)'};
        --end-pos: ${goingRight ? 'calc(100% + 50px)' : '-50px'};
        --vertical-pos: ${verticalPos}%;
        --swim-duration: ${duration}ms;
        --direction: ${goingRight ? -1 : 1};
    `;
    
    // Remove fish when animation ends
    fish.addEventListener('animationend', () => fish.remove());
    
    return fish;
}

function initializeSwimmingFish() {
    const pond = document.getElementById('pond');
    
    // Initial fish
    for (let i = 0; i < 5; i++) {
        pond.appendChild(createSwimmingFish());
    }
    
    // Add new fish periodically
    setInterval(() => {
        if (pond.querySelectorAll('.swimming-fish').length < 8) { // Keep max 8 fish
            pond.appendChild(createSwimmingFish());
        }
    }, 2000);
}

// Initialize the game
initGame(); 