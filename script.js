/**
 * Reaction Time Game
 * A simple game to test user reaction times with visual feedback and sound effects.
 */
document.addEventListener('DOMContentLoaded', () => {
    // =====================================================================
    // DOM ELEMENTS
    // =====================================================================
    const body = document.body;
    const startButton = document.getElementById('start-button');
    const instructions = document.getElementById('instructions');
    const bestTimeElement = document.getElementById('best-time');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const volumeToggleBtn = document.getElementById('volume-toggle-btn');
    const resultModal = document.getElementById('result-modal');
    const reactionTimeElement = document.getElementById('reaction-time');
    const performanceRating = document.getElementById('performance-rating');
    const rankValue = document.getElementById('rank-value');
    const avgValue = document.getElementById('avg-value');
    const shareButton = document.getElementById('share-button');
    const tryAgainButton = document.getElementById('try-again-button');
    
    // Create hint meter
    const hintMeter = document.createElement('div');
    hintMeter.id = 'hint-meter';
    hintMeter.innerHTML = '<div class="hint-progress"></div>';
    document.getElementById('game-container').appendChild(hintMeter);
    const hintProgress = document.querySelector('.hint-progress');
    
    // =====================================================================
    // GAME STATE AND VARIABLES
    // =====================================================================
    let gameState = 'idle';  // States: idle, waiting, ready
    let startTime;
    let endTime;
    let timeoutId;
    let hintInterval;
    let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    let reactionTimes = JSON.parse(localStorage.getItem('reactionTimes') || '[]');
    let bestTime = localStorage.getItem('bestTime') ? parseInt(localStorage.getItem('bestTime')) : null;
    
    // =====================================================================
    // SOUND EFFECTS
    // =====================================================================
    const sounds = {
        click: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
        ready: new Audio('https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3'),
        success: new Audio('https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3'),
        failure: new Audio('https://assets.mixkit.co/active_storage/sfx/546/546-preview.mp3'),
        theme: new Audio('https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3')
    };
    
    // Preload all sounds
    for (const sound in sounds) {
        sounds[sound].load();
    }
    
    // =====================================================================
    // INITIALIZATION
    // =====================================================================
    // Initialize volume button
    volumeToggleBtn.innerHTML = soundEnabled ? 
        '<i class="fas fa-volume-up"></i>' : 
        '<i class="fas fa-volume-mute"></i>';
    
    // Theme handling
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    // Update the best time display if available
    if (bestTime) {
        bestTimeElement.textContent = bestTime;
    }
    
    // =====================================================================
    // UTILITY FUNCTIONS
    // =====================================================================
    /**
     * Toggles between light and dark themes
     */
    function toggleTheme(e) {
        e.stopPropagation();
        const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        playSound('theme');
    }
    
    /**
     * Toggles sound effects on/off
     */
    function toggleSound(e) {
        e.stopPropagation();
        soundEnabled = !soundEnabled;
        volumeToggleBtn.innerHTML = soundEnabled ? 
            '<i class="fas fa-volume-up"></i>' : 
            '<i class="fas fa-volume-mute"></i>';
        localStorage.setItem('soundEnabled', soundEnabled);
    }
    
    /**
     * Plays a sound effect with error handling
     */
    function playSound(sound) {
        if (soundEnabled && sounds[sound]) {
            try {
                sounds[sound].currentTime = 0;
                const playPromise = sounds[sound].play();
                
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        console.error(`Error playing ${sound} sound:`, e);
                        // Try to reload and play again
                        sounds[sound].load();
                        sounds[sound].play().catch(err => console.error("Second attempt failed:", err));
                    });
                }
            } catch (e) {
                console.error("Exception playing sound:", e);
            }
        }
    }
    
    /**
     * Calculates average reaction time from history
     * Filters out failures (-1 values)
     */
    function getAverageTime() {
        if (reactionTimes.length === 0) return 0;
        
        const validTimes = reactionTimes.filter(time => time > 0);
        if (validTimes.length === 0) return 0;
        
        const sum = validTimes.reduce((a, b) => a + b, 0);
        return Math.round(sum / validTimes.length);
    }
    
    /**
     * Returns performance rating based on reaction time
     */
    function getPerformanceRating(time) {
        if (time < 200) return "Inhuman";
        if (time < 250) return "Lightning";
        if (time < 300) return "Excellent";
        if (time < 350) return "Very Good";
        if (time < 400) return "Good";
        if (time < 450) return "Average";
        if (time < 500) return "Slow";
        return "Very Slow";
    }
    
    /**
     * Calculates player's rank based on reaction times history
     */
    function getRank() {
        if (reactionTimes.length <= 1) return "1/1";
        
        const lastTime = reactionTimes[reactionTimes.length - 1];
        
        // For failures, always rank them at the bottom
        if (lastTime === -1) return `${reactionTimes.length}/${reactionTimes.length}`;
        
        // Only rank actual times (not failures)
        const validTimes = reactionTimes.filter(time => time > 0);
        if (validTimes.length === 0) return "1/1";
        
        const sortedTimes = [...validTimes].sort((a, b) => a - b);
        const position = sortedTimes.indexOf(lastTime) + 1;
        return `${position}/${validTimes.length}`;
    }
    
    /**
     * Copies text to clipboard
     */
    function copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
    
    // =====================================================================
    // GAME FUNCTIONALITY
    // =====================================================================
    /**
     * Shows the result modal with the player's score
     */
    function showResultModal(time) {
        if (time === -1) {
            // Failure case (too early)
            reactionTimeElement.textContent = "Too Early";
            performanceRating.textContent = "Failed";
            document.querySelector('.ms').style.display = 'none';
        } else {
            // Success case
            reactionTimeElement.textContent = time;
            performanceRating.textContent = getPerformanceRating(time);
            document.querySelector('.ms').style.display = 'inline';
        }
        
        // Update stats
        rankValue.textContent = getRank();
        avgValue.textContent = `${getAverageTime()}ms`;
        
        // Show the modal
        resultModal.classList.remove('hidden');
    }
    
    /**
     * Starts the game
     */
    function startGame() {
        if (gameState !== 'idle') return;
        
        playSound('click');
        gameState = 'waiting';
        body.className = '';
        startButton.style.display = 'none';
        instructions.textContent = 'Wait for green...';
        resultModal.classList.add('hidden');
        
        // Show and reset hint meter
        hintMeter.style.display = 'block';
        hintProgress.style.width = '0%';
        
        // Random delay between 1-5 seconds
        const delay = Math.floor(Math.random() * 4000) + 1000;
        
        // Update hint meter progress
        let elapsedTime = 0;
        const updateInterval = 100; // Update every 100ms
        hintInterval = setInterval(() => {
            elapsedTime += updateInterval;
            const progress = (elapsedTime / delay) * 100;
            hintProgress.style.width = `${Math.min(progress, 100)}%`;
        }, updateInterval);
        
        // Set timer to change to ready state
        timeoutId = setTimeout(() => {
            clearInterval(hintInterval);
            gameState = 'ready';
            startTime = Date.now();
            body.classList.add('ready');
            instructions.textContent = 'Click now!';
            playSound('ready');
        }, delay);
    }

    /**
     * Handles player's click event
     */
    function handleClick(e) {
        // Ignore clicks on UI controls
        if (e.target === themeToggleBtn || themeToggleBtn.contains(e.target) || 
            e.target === volumeToggleBtn || volumeToggleBtn.contains(e.target) ||
            e.target === shareButton || shareButton.contains(e.target) ||
            e.target === tryAgainButton || tryAgainButton.contains(e.target)) {
            return;
        }
        
        switch (gameState) {
            case 'waiting':
                // Player clicked too soon
                clearTimeout(timeoutId);
                clearInterval(hintInterval);
                gameState = 'idle';
                body.className = 'too-soon';
                instructions.textContent = 'Too soon! Click the button to try again';
                startButton.style.display = 'inline-block';
                startButton.textContent = 'Try Again';
                playSound('failure');
                
                // Hide hint meter
                hintMeter.style.display = 'none';
                
                // Record this as a failure in reaction times
                const failureTime = -1; // Use -1 to indicate too early
                reactionTimes.push(failureTime);
                if (reactionTimes.length > 10) {
                    reactionTimes.shift(); // Keep only last 10 attempts
                }
                localStorage.setItem('reactionTimes', JSON.stringify(reactionTimes));
                
                // Show result modal with failure message
                showResultModal(failureTime);
                break;
            
            case 'ready':
                // Player reacted to the green light
                endTime = Date.now();
                const reactionTime = endTime - startTime;
                
                // Hide hint meter
                hintMeter.style.display = 'none';
                
                // Save to history
                reactionTimes.push(reactionTime);
                if (reactionTimes.length > 10) {
                    reactionTimes.shift(); // Keep only last 10 attempts
                }
                localStorage.setItem('reactionTimes', JSON.stringify(reactionTimes));
                
                // Update best time if this is better
                if (bestTime === null || reactionTime < bestTime) {
                    bestTime = reactionTime;
                    localStorage.setItem('bestTime', bestTime);
                    bestTimeElement.textContent = bestTime;
                }
                
                // Reset game state
                gameState = 'idle';
                body.className = '';
                instructions.textContent = 'Test your reflexes. Click as soon as the screen turns green.';
                startButton.style.display = 'inline-block';
                startButton.textContent = 'Click When Ready';
                playSound('success');
                
                // Show result modal
                showResultModal(reactionTime);
                break;
        }
    }

    /**
     * Resets the game to idle state
     */
    function resetGame() {
        resultModal.classList.add('hidden');
        gameState = 'idle';
        body.className = '';
        instructions.textContent = 'Test your reflexes. Click as soon as the screen turns green.';
        startButton.style.display = 'inline-block';
        startButton.textContent = 'Click When Ready';
        hintMeter.style.display = 'none';
    }
    
    /**
     * Shares the player's result
     */
    function shareResult() {
        const lastResult = reactionTimes[reactionTimes.length - 1];
        const text = `My reaction time is ${lastResult}ms (${getPerformanceRating(lastResult)})! Test your reflexes too!`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Reaction Time Game',
                text: text,
                url: window.location.href
            }).catch(err => {
                console.error('Share failed:', err);
                alert('Copied to clipboard: ' + text);
                copyToClipboard(text);
            });
        } else {
            alert('Copied to clipboard: ' + text);
            copyToClipboard(text);
        }
    }

    // =====================================================================
    // EVENT LISTENERS
    // =====================================================================
    // Main game interaction
    body.addEventListener('click', handleClick);
    
    // UI controls
    themeToggleBtn.addEventListener('click', toggleTheme);
    volumeToggleBtn.addEventListener('click', toggleSound);
    
    // Button handlers
    startButton.addEventListener('click', (e) => {
        e.stopPropagation();
        startGame();
    });
    
    tryAgainButton.addEventListener('click', (e) => {
        e.stopPropagation();
        resetGame();
    });
    
    shareButton.addEventListener('click', (e) => {
        e.stopPropagation();
        shareResult();
    });
}); 