// ==============================================================================
// Final script.js for Little Moonbeams (v6.1 - with Chunked Player Controls Fix)
// ==============================================================================

(() => {
  // --- 1. Get all the elements from the HTML ---
  const moralInput = document.getElementById('moralInput');
  const typeCards = Array.from(document.querySelectorAll('.type-card'));
  const timerBtns = document.querySelectorAll('.timer-btn');
  const generateBtn = document.getElementById('generateBtn');

  const voiceRow = document.querySelector('.voice-row');
  const customSelectDisplay = document.querySelector('.custom-select-display');
  const customSelectValue = document.getElementById('customSelectValue');
  const customOptionsList = document.getElementById('customSelectOptions');

  const storyTitle = document.getElementById('storyTitle');
  const storyCard = document.querySelector('.story.card'); // Add this line
  const storyContainer = document.getElementById('storyContainer');
  const timerDisplay = document.getElementById('timerDisplay');

  const playBtn = document.getElementById('playBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const stopBtn = document.getElementById('stopBtn');

  const sleepOverlay = document.getElementById('sleepOverlay');

  // --- 2. State Variables ---
  let selectedType = null;
  let currentStory = null;
  let selectedSleepMinutes = 0;
  let sleepTimerId = null;
  let sleepTimerIntervalId = null;
  let selectedVoiceName = null;

  // For chunked speech
  let speechQueue = [];
  let currentChunkIndex = 0;
  let isPaused = false;
  let isSpeaking = false;
  let currentUtterance = null;

  // --- 3. Voice Population & Custom Dropdown Logic ---
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

  // --- 4. Event Listeners & Main App Flow ---
  typeCards.forEach(card => {
    card.addEventListener('click', () => {
      typeCards.forEach(c => c.setAttribute('aria-pressed', 'false'));
      card.setAttribute('aria-pressed', 'true');
      selectedType = card.dataset.type;
    });
  });

  timerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      timerBtns.forEach(b => b.classList.remove('active-timer'));
      btn.classList.add('active-timer');
      selectedSleepMinutes = Number(btn.dataset.value);
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
          duration: selectedSleepMinutes
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
      startSleepTimerIfNeeded();
    } catch (err) {
      console.error("Fetch Error:", err);
      storyTitle.textContent = "Couldn't create a story";
      storyContainer.innerHTML = `<p class="placeholder">Oops! Something went wrong. Please check your connection and that the backend server is running.</p>`;
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = '✨ Generate Story';
    }
  });

  // --- 5. Speech Synthesis with Chunking (Improved) ---

  // This is a "keep-alive" timer to prevent the speech engine from sleeping.
  let keepAliveInterval = null;

  function splitIntoChunks(text) {
    // This is a more robust way to split the text into sentences.
    // It ensures that punctuation is kept with the sentence and doesn't get isolated.
    const chunks = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
    return chunks ? chunks.map(c => c.trim()).filter(c => c) : [];
  }

  function speak(story) {
    if (!('speechSynthesis' in window)) return;
    // Use our new, dedicated function to stop everything and reset.
    stopSpeech();

    speechQueue = splitIntoChunks(story.title + ". " + story.text);
    currentChunkIndex = 0;
    isPaused = false;
    isSpeaking = true;

    // This is the "keep-alive" trick. We will ping the speech engine every 5 seconds
    // to keep it "warm" and prevent it from creating awkward pauses between sentences.
    keepAliveInterval = setInterval(() => {
      speechSynthesis.resume();
    }, 5000);

    // This delay prevents the very first word of the title from being cut off.
    setTimeout(() => {
      speakNextChunk();
    }, 250);
  }

  function speakNextChunk() {
    if (currentChunkIndex >= speechQueue.length) {
      // We've reached the end of the story, so we stop everything.
      stopSpeech();
      return;
    }

    if (!isPaused) {
      const chunk = speechQueue[currentChunkIndex];
      const utterance = new SpeechSynthesisUtterance(chunk);
      const voices = speechSynthesis.getVoices();

      // We set the voice on every single chunk to prevent it from changing mid-story.
      utterance.voice = voices.find(v => v.name === selectedVoiceName) || voices[0];
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // When this sentence is finished, automatically move to the next one.
      utterance.onend = () => {
        currentChunkIndex++;
        speakNextChunk();
      };

      speechSynthesis.speak(utterance);
    }
  }

  // --- 6. Player Controls (Improved Logic) ---

  // A new, dedicated function to stop and reset everything cleanly.
  function stopSpeech() {
    isSpeaking = false;
    isPaused = false;
    currentChunkIndex = 0;
    speechQueue = [];
    // IMPORTANT: We must clear the keep-alive timer when we stop.
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
      // When we resume, we also need to restart our keep-alive timer.
      keepAliveInterval = setInterval(() => { speechSynthesis.resume(); }, 5000);
      speechSynthesis.resume();
    } else if (!isSpeaking) {
      speak(currentStory);
    }
  });

  pauseBtn.addEventListener('click', () => {
    if (speechSynthesis.speaking && !isPaused) {
      isPaused = true;
      // We must stop the keep-alive timer when paused, or it will force a resume!
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
      speechSynthesis.pause();
    }
  });

  stopBtn.addEventListener('click', () => {
    // The stop button now just calls our new, clean stop function.
    stopSpeech();
  });

  // --- 7. Sleep Timer Logic ---
  function startSleepTimerIfNeeded() {
    clearSleepTimer();
    const minutes = selectedSleepMinutes;
    if (!minutes) return;
    const endTime = Date.now() + minutes * 60 * 1000;
    sleepTimerId = setTimeout(() => {
      activateSleepOverlay();
      try { speechSynthesis.cancel(); } catch (e) { }
      clearSleepTimer();
    }, minutes * 60 * 1000);
    sleepTimerIntervalId = setInterval(() => {
      const timeLeft = endTime - Date.now();
      if (timeLeft < 0) { clearSleepTimer(); return; }
      const remainingMinutes = Math.floor((timeLeft / 1000) / 60);
      const remainingSeconds = Math.floor((timeLeft / 1000) % 60);
      timerDisplay.textContent = `${String(remainingMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }, 1000);
    timerDisplay.classList.add('visible');
  }

  function clearSleepTimer() {
    if (sleepTimerId) clearTimeout(sleepTimerId);
    if (sleepTimerIntervalId) clearInterval(sleepTimerIntervalId);
    sleepTimerId = null;
    sleepTimerIntervalId = null;
    timerDisplay.classList.remove('visible');
  }

  function activateSleepOverlay() {
    sleepOverlay.classList.add('active');
    sleepOverlay.setAttribute('aria-hidden', 'false');
    sleepOverlay.addEventListener('click', deactivateSleepOverlay, { once: true });
    document.addEventListener('keydown', deactivateSleepOverlayOnce);
  }

  function deactivateSleepOverlay() {
    sleepOverlay.classList.remove('active');
    sleepOverlay.setAttribute('aria-hidden', 'true');
    clearSleepTimer();
    document.removeEventListener('keydown', deactivateSleepOverlayOnce);
  }

  function deactivateSleepOverlayOnce(e) {
    if (e.key === 'Escape' || e.key === 'Enter') deactivateSleepOverlay();
  }

  // --- 8. Initial Setup ---
  window.addEventListener('beforeunload', () => {
    try { speechSynthesis.cancel(); } catch (e) { }
    clearSleepTimer();
  });

  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.onvoiceschanged = populateVoiceList;
    populateVoiceList();
  }

})();
