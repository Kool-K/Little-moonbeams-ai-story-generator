(() => {
  const moralInput = document.getElementById('moralInput');
  const typeCards = Array.from(document.querySelectorAll('.type-card'));
  const timerBtns = document.querySelectorAll('.timer-btn');
  const generateBtn = document.getElementById('generateBtn');

  const voiceRow = document.querySelector('.voice-row');
  const customSelectDisplay = document.querySelector('.custom-select-display');
  const customSelectValue = document.getElementById('customSelectValue');
  const customOptionsList = document.getElementById('customSelectOptions');

  const storyTitle = document.getElementById('storyTitle');
  const storyCard = document.querySelector('.story.card');
  const storyContainer = document.getElementById('storyContainer');
  const timerDisplay = document.getElementById('timerDisplay');

  const playBtn = document.getElementById('playBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const stopBtn = document.getElementById('stopBtn');

  const sleepOverlay = document.getElementById('sleepOverlay');

  // --- State Variables ---
  let selectedType = null;
  let currentStory = null;
  let selectedVoiceName = null;
  // timer variables representing sessions
  let sessionTimeoutId = null; // ID for the main timer ->shows the overlay
  let sessionIntervalId = null; // ID for the timer -> updates the countdown display

  // For chunked speech
  let speechQueue = [];
  let currentChunkIndex = 0;
  let isPaused = false;
  let isSpeaking = false;

  // Voice Population + voice Dropdown Logic
  function populateVoiceList() {
    if (typeof speechSynthesis === 'undefined') return;
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) return;
    customOptionsList.innerHTML = '';
    voices.forEach(voice => {
      const optionItem = document.createElement('li');
      optionItem.textContent = `${voice.name} (${voice.lang})`;
      optionItem.setAttribute('data-name', voice.name);
      optionItem.addEventListener('click', () => {
        customSelectValue.textContent = optionItem.textContent;
        selectedVoiceName = voice.name;
        customOptionsList.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
        optionItem.classList.add('selected');
        voiceRow.classList.remove('open');
      });
      customOptionsList.appendChild(optionItem);
    });
    const options = Array.from(customOptionsList.querySelectorAll('li'));
    const bestOption =
      options.find(opt => opt.getAttribute('data-name') === 'Google हिन्दी') ||
      options.find(opt => opt.textContent.includes('hi-IN')) ||
      options.find(opt => opt.textContent.includes('en-IN')) ||
      options.find(opt => opt.textContent.includes('Google')) ||
      options[0];
    if (bestOption) {
      bestOption.click();
    }
  }

  customSelectDisplay.addEventListener('click', () => {
    voiceRow.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!voiceRow.contains(e.target)) {
      voiceRow.classList.remove('open');
    }
  });

  //  Event Listeners & Main App Flow
  typeCards.forEach(card => {
    card.addEventListener('click', () => {
      typeCards.forEach(c => c.setAttribute('aria-pressed', 'false'));
      card.setAttribute('aria-pressed', 'true');
      selectedType = card.dataset.type;
    });
  });


  //  buttons directly start the session timer.
  // They are the ONLY things that can start or change the timer when new timer is chosen by user older is scrapped
  timerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      timerBtns.forEach(b => b.classList.remove('active-timer'));
      btn.classList.add('active-timer');
      const minutes = Number(btn.dataset.value);
      startSessionTimer(minutes); // Call the new session timer function
    });
  });


  generateBtn.addEventListener('click', async () => {
    const moral = moralInput.value.trim();
    if (!moral) { alert('Please type a moral or theme.'); return; }
    if (!selectedType) { alert('Please pick a story type.'); return; }
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating…';
    storyTitle.textContent = `A story about ${moral}...`;
    storyContainer.innerHTML = `<p class="placeholder">The moonbeams are gathering your story...</p>`;
    try {
      const response = await fetch('https://ketakis-little-moonbeams-ai-story.onrender.com/generate_story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyType: selectedType,
          moral: moral,
        })
      });
      if (!response.ok) { throw new Error(`Server error: ${response.status}`); }
      const data = await response.json();
      currentStory = data;
      storyTitle.textContent = data.title;
      storyContainer.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = data.text;
      p.style.lineHeight = '1.7';
      storyContainer.appendChild(p);
      storyCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      speak(currentStory);
      
    } catch (err) {
      console.error("Fetch Error:", err);
      storyTitle.textContent = "Couldn't create a story";
      storyContainer.innerHTML = `<p class="placeholder">Oops! Something went wrong. Please check your connection and that the backend server is running.</p>`;
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = '✨ Generate Story';
    }
  });


  //  Speech Synthesis with Chunking
  let keepAliveInterval = null;
  function splitIntoChunks(text) {
    const chunks = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
    return chunks ? chunks.map(c => c.trim()).filter(c => c) : [];
  }

  function speak(story) {
    if (!('speechSynthesis' in window)) return;
    stopSpeech();
    speechQueue = splitIntoChunks(story.title + ". " + story.text);
    currentChunkIndex = 0;
    isPaused = false;
    isSpeaking = true;
    keepAliveInterval = setInterval(() => {
      speechSynthesis.resume();
    }, 5000);
    setTimeout(() => {
      speakNextChunk();
    }, 250);
  }

  function speakNextChunk() {
    if (currentChunkIndex >= speechQueue.length) {
      stopSpeech();
      return;
    }
    if (!isPaused) {
      const chunk = speechQueue[currentChunkIndex];
      const utterance = new SpeechSynthesisUtterance(chunk);
      const voices = speechSynthesis.getVoices();
      utterance.voice = voices.find(v => v.name === selectedVoiceName) || voices[0];
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onend = () => {
        currentChunkIndex++;
        speakNextChunk();
      };
      speechSynthesis.speak(utterance);
    }
  }

  function stopSpeech() {
    isSpeaking = false;
    isPaused = false;
    currentChunkIndex = 0;
    speechQueue = [];
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    speechSynthesis.cancel();
  }

  playBtn.addEventListener('click', () => {
    if (!currentStory) return;
    if (isPaused) {
      isPaused = false;
      keepAliveInterval = setInterval(() => { speechSynthesis.resume(); }, 5000);
      speechSynthesis.resume();
    } else if (!isSpeaking) {
      speak(currentStory);
    }
  });

  pauseBtn.addEventListener('click', () => {
    if (speechSynthesis.speaking && !isPaused) {
      isPaused = true;
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
      speechSynthesis.pause();
    }
  });

  stopBtn.addEventListener('click', () => {
    stopSpeech();
  });


  // persistent timer that is independent of story generation.

  /**
   * Starts the main session timer.
   * @param {number} minutes - The total duration for the session.
   */
  function startSessionTimer(minutes) {
    clearSessionTimer(); //clear any existing timer before starting a new one.

    if (minutes <= 0) {
      return; // If "No Timer" is selected,clear existing it and stop.
    }

    const endTime = Date.now() + minutes * 60 * 1000;

    // main timer that will trigger the goodnight screen
    sessionTimeoutId = setTimeout(() => {
      activateSleepOverlay();
      clearSessionTimer();
    }, minutes * 60 * 1000);

    // This timer updates the visual countdown every sec
    sessionIntervalId = setInterval(() => {
      const timeLeft = endTime - Date.now();
      if (timeLeft < 0) {
        clearSessionTimer();
        return;
      }
      const remainingMinutes = Math.floor((timeLeft / 1000) / 60);
      const remainingSeconds = Math.floor((timeLeft / 1000) % 60);
      timerDisplay.textContent = `${String(remainingMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }, 1000);

    timerDisplay.classList.add('visible');
  }

  /**
   * Clears all timer-related processes and hides the display.
   */
  function clearSessionTimer() {
    if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
    if (sessionIntervalId) clearInterval(sessionIntervalId);
    sessionTimeoutId = null;
    sessionIntervalId = null;
    timerDisplay.classList.remove('visible');
  }

  function activateSleepOverlay() {
    sleepOverlay.classList.add('active');
    sleepOverlay.setAttribute('aria-hidden', 'false');
    // Stop any story that is currently on
    if (speechSynthesis.speaking) {
      stopSpeech();
    }
    sleepOverlay.addEventListener('click', deactivateSleepOverlay, { once: true });
    document.addEventListener('keydown', deactivateSleepOverlayOnce);
  }

  function deactivateSleepOverlay() {
    sleepOverlay.classList.remove('active');
    sleepOverlay.setAttribute('aria-hidden', 'true');
    clearSessionTimer(); // Clear any leftover timer logic
    document.removeEventListener('keydown', deactivateSleepOverlayOnce);

    timerBtns.forEach(btn => {
      btn.classList.remove('active-timer');
      if (btn.dataset.value === "0") {
        btn.classList.add('active-timer');
      }
    });
  }

  function deactivateSleepOverlayOnce(e) {
    if (e.key === 'Escape' || e.key === 'Enter') deactivateSleepOverlay();
  }


  // --- Init Setup ---
  window.addEventListener('beforeunload', () => {
    try { speechSynthesis.cancel(); } catch (e) { }
    clearSessionTimer();
  });

  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.onvoiceschanged = populateVoiceList;
    populateVoiceList();
  }

})();