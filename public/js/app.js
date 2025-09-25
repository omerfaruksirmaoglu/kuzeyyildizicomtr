let currentEntries = [];
let hintTimers = new Map();
let nextCountdownInterval;
let isSimMode = false;
let previewIndex = null;
let currentSimSpeed = 1;

let serverSkewMs = 0; // serverNow - clientNow
const STATE_KEY = 'kuzey_app_state_v1';

function loadState() {
    try {
        return JSON.parse(localStorage.getItem(STATE_KEY)) || { answers: {}, hints: {} };
    } catch {
        return { answers: {}, hints: {} };
    }
}

function saveState(state) {
    try {
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {}
}

async function syncServerTimeSkew() {
    try {
        const r = await fetch('/api/server-time');
        if (!r.ok) return;
        const data = await r.json();
        serverSkewMs = new Date(data.nowIso).getTime() - Date.now();
    } catch (e) {
        // ignore; fallback to client clock
        serverSkewMs = 0;
    }
}


// Check authentication and load content
async function initialize() {
    await syncServerTimeSkew();
    // Check for preview mode
    const urlParams = new URLSearchParams(window.location.search);
    previewIndex = urlParams.get('previewIndex');
    if (previewIndex !== null) {
        previewIndex = parseInt(previewIndex);
    }
    
    try {
        const response = await fetch('/api/auth-status');
        const data = await response.json();
        
        if (!data.loggedIn) {
            window.location.href = '/login.html';
            return;
        }
        
        isSimMode = data.simMode;
        
        if (previewIndex !== null && isSimMode) {
            // Preview mode - load specific content
            loadPreviewContent(previewIndex);
            showPreviewMode();
            startCountdowns();
        } else {
            // Normal mode
            loadContent();
            startCountdowns();
            setInterval(loadContent, 30000); // Refresh every 30 seconds
        }
    } catch (error) {
        console.error('Initialization failed:', error);
    }
}

async function loadContent() {
    try {
        const currentSlotResponse = await fetch('/api/current-slot');
        const currentSlot = await currentSlotResponse.json();
        
        if (currentSlot.index >= 0) {
            await loadEntries(currentSlot.index);
        }
        
        updateTimeline(currentSlot);
        updateCountdowns(currentSlot.msToNext, currentSlot.nextEntryIso);
    } catch (error) {
        console.error('Failed to load content:', error);
    }
}

async function loadEntries(maxIndex) {
    const contentArea = document.getElementById('contentArea');
    
    // Load all accessible entries up to maxIndex
    for (let i = 0; i <= maxIndex; i++) {
        if (currentEntries[i]) continue; // Already loaded
        
        try {
            const response = await fetch(`/api/entry?index=${i}`);
            if (!response.ok) continue;
            
            const entry = await response.json();
            currentEntries[i] = entry;
            
            const entryEl = createEntryElement(entry, i);
            contentArea.appendChild(entryEl);
            
            // Trigger floating hearts animation
            floatHearts(entryEl);
            
            // Special handling for the password entry
            if (entry.question && entry.answer === "İYİ Kİ DOĞDUN SEVGİLİM") {
                setupPasswordEntry(entryEl, i);
            } else if (entry.question) {
                setupQuestionEntry(entryEl, i);
            }
            
        } catch (error) {
            console.error(`Failed to load entry ${i}:`, error);
        }
    }
}

async function loadPreviewContent(maxIndex) {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = ''; // Clear existing content
    currentEntries = [];
    
    // Load all entries up to the preview index
    for (let i = 0; i <= maxIndex; i++) {
        try {
            const response = await fetch(`/api/entry?index=${i}`);
            if (!response.ok) continue;
            
            const entry = await response.json();
            currentEntries[i] = entry;
            
            const entryEl = createEntryElement(entry, i);
            contentArea.appendChild(entryEl);
            
            // Trigger floating hearts animation
            floatHearts(entryEl);
            
            // Special handling for the password entry
            if (entry.question && entry.answer === "İYİ Kİ DOĞDUN SEVGİLİM") {
                setupPasswordEntry(entryEl, i);
            } else if (entry.question) {
                setupQuestionEntry(entryEl, i);
            }
            
        } catch (error) {
            console.error(`Failed to load entry ${i}:`, error);
        }
    }
    
    // Update timeline for preview
    updateTimelinePreview(maxIndex);
}

function showPreviewMode() {
    // Update countdown displays to show preview mode
    document.getElementById('topCountdown').textContent = 'Önizleme Modu';
    document.getElementById('footerCountdown').textContent = `İçerik Önizlemesi: ${previewIndex + 1}. giriş`;
    
    // Add preview banner
    const banner = document.createElement('div');
    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: rgba(251, 191, 36, 0.9);
        color: #92400e;
        text-align: center;
        padding: 0.5rem;
        font-weight: 600;
        z-index: 1001;
        backdrop-filter: blur(10px);
    `;
    banner.innerHTML = `
        📋 Önizleme Modu Aktif - İçerik ${previewIndex + 1} 
        <button onclick="window.close()" style="margin-left: 1rem; background: rgba(0,0,0,0.1); border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;">
            Kapat
        </button>
    `;
    document.body.appendChild(banner);
    
    // Adjust app-bar position
    document.querySelector('.app-bar').style.top = '40px';
}

function updateTimelinePreview(maxIndex) {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '';
    
    // Create dots for preview mode
    const totalSlots = 11; // Approximate number of slots
    
    for (let i = 0; i < totalSlots; i++) {
        const dot = document.createElement('div');
        dot.className = 'timeline-dot';
        
        if (i <= maxIndex) {
            dot.classList.add('past');
        }
        
        if (i === maxIndex) {
            dot.classList.add('current');
        }
        
        timeline.appendChild(dot);
    }
}

function createEntryElement(entry, index) {
    const entryEl = document.createElement('div');
    entryEl.className = 'entry-card fade-up';
    entryEl.dataset.index = index;
    
    let html = '';
    
    // Entry header with order and time
    const entryTime = new Date(entry.atIso);
    const timeStr = entryTime.toLocaleString('tr-TR', { 
        timeZone: 'Europe/Istanbul',
        hour: '2-digit',
        minute: '2-digit'
    });
    const dateStr = entryTime.toLocaleDateString('tr-TR', {
        timeZone: 'Europe/Istanbul',
        day: 'numeric',
        month: 'short'
    });
    
    html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: var(--border-subtle);">
        <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="background: var(--accent); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1.1rem;">
                #${index + 1}
            </div>
            <div>
                <div style="font-weight: 600; font-size: 1.1rem; color: var(--accent);">${timeStr}</div>
                <div style="font-size: 0.875rem; color: var(--muted);">${dateStr}</div>
            </div>
        </div>
    </div>`;
    
    // Pre-content note
    if (entry.preContentNote) {
        html += `<div style="background: rgba(251, 191, 36, 0.1); border: 1px solid #FCD34D; border-radius: var(--radius-xl); padding: 1rem; margin-bottom: 1.5rem; text-align: center; font-weight: 500;">
            ${entry.preContentNote}
        </div>`;
    }
    
    // Main message
    if (entry.message) {
        html += `<div class="entry-message">${entry.message}</div>`;
    }
    
    // Media content
    if (entry.media && entry.media.length > 0) {
        html += '<div class="entry-media">';
                entry.media.forEach(media => {
            if (media.kind === 'image') {
                html += `<img src="${media.src}" alt="${media.alt || ''}" loading="lazy">`;
            } else if (media.kind === 'video') {
                html += `<video controls${media.poster ? ` poster="${media.poster}"` : ''}>
                    <source src="${media.src}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>`;
            } else if (media.kind === 'audio') {
                html += `<div class="audio-block">
                    <audio controls src="${media.src}" style="width: 100%;"></audio>
                    <div style="margin-top: 0.5rem;">
                        <a class="btn btn-secondary" href="${media.src}" download>
                            ${media.label || media.alt || 'Ses dosyasını indir'}
                        </a>
                    </div>
                </div>`;
            }
        });
        html += '</div>';
    }
    
    // Question section
    if (entry.question) {
        html += `
        <div class="question-section">
            <h3>${entry.question}</h3>
            <div style="margin-top: 1rem;">
                <input type="text" class="input answer-input" placeholder="Cevabınızı yazın..." data-index="${index}">
                <button onclick="submitAnswer(${index})" class="btn btn-primary" style="margin-top: 1rem; width: 100%;">
                    Cevabı Gönder
                </button>
            </div>
            
            <div class="hint-section" data-index="${index}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>İpucu:</span>
                    <button class="btn btn-secondary hint-btn" data-index="${index}" disabled>
                        <span class="hint-timer">10:00</span>
                    </button>
                </div>
                <div class="hint-list" id="hintList${index}"></div>
            </div>
        </div>`;
    }
    
    // CTA button
    if (entry.cta) {
        html += `
        <div style="text-align: center; margin-top: 2rem;">
            <button onclick="showCTA(${index})" class="btn btn-primary">
                ${entry.cta.label}
            </button>
        </div>`;
    }
    
    entryEl.innerHTML = html;
    return entryEl;
}


function setupQuestionEntry(entryEl, index) {
    const entry = currentEntries[index];
    const entryKey = entry.atIso; // unique per slot
    const state = loadState();

    // If already answered correctly, render the post-answer state and skip hint timers
    if (state.answers && state.answers[entryKey] && state.answers[entryKey].correct) {
        showAnswerResult(index, true);
        if (entry.mediaAfterAnswer) {
            showPostAnswerMedia(index, entry.mediaAfterAnswer);
        }
        // No need to setup hint timers
        return;
    }

    const hintBtn = entryEl.querySelector(`[data-index="${index}"].hint-btn`);
    if (!hintBtn) return;

    if (!entry.hints || entry.hints.length === 0) {
        // No hints available
        hintBtn.disabled = true;
        hintBtn.querySelector('.hint-timer').textContent = 'İpucu Yok';
        return;
    }

    // Restore already shown hints (if any)
    const hintsState = (state.hints && state.hints[entryKey]) ? state.hints[entryKey] : { shown: 0 };
    const alreadyShown = Math.min(hintsState.shown || 0, entry.hints.length);
    if (alreadyShown > 0) {
        const hintListEl = document.getElementById(`hintList${index}`);
        for (let i = 0; i < alreadyShown; i++) {
            const hintEl = document.createElement('li');
            hintEl.textContent = `💡 ${entry.hints[i]}`;
            hintListEl.appendChild(hintEl);
        }
    }

    // Start / resume hint timer based on content release time (Turkey time in schedule)
    startHintTimer(index);
}



function setupPasswordEntry(entryEl, index) {
    const entry = currentEntries[index];
    const entryKey = entry.atIso;
    const state = loadState();
    
    // If already answered (persisted), render success state immediately
    if (state.answers && state.answers[entryKey] && state.answers[entryKey].correct) {
        showAnswerResult(index, true);
        return;
    }

    // Wire inputs
    const input = entryEl.querySelector('.answer-input');
    const submitBtn = entryEl.querySelector('button');
    submitBtn.onclick = () => checkSpecialPassword(index);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkSpecialPassword(index);
    });

    // Start hint timers same as normal questions
    const hintBtn = entryEl.querySelector(`[data-index="${index}"].hint-btn`);
    if (hintBtn) {
        if (!entry.hints || entry.hints.length === 0) {
            hintBtn.disabled = true;
            hintBtn.querySelector('.hint-timer').textContent = 'İpucu Yok';
        } else {
            // Restore already shown hints
            const hintsState = (state.hints && state.hints[entryKey]) ? state.hints[entryKey] : { shown: 0 };
            const alreadyShown = Math.min(hintsState.shown || 0, entry.hints.length);
            if (alreadyShown > 0) {
                const hintListEl = document.getElementById(`hintList${index}`);
                for (let i = 0; i < alreadyShown; i++) {
                    const hintEl = document.createElement('li');
                    hintEl.textContent = `💡 ${entry.hints[i]}`;
                    hintListEl.appendChild(hintEl);
                }
            }
            startHintTimer(index);
        }
    }
}


async function checkSpecialPassword(index) {
    const input = document.querySelector(`[data-index="${index}"].answer-input`);
    const password = input.value.trim();
    
    try {
        const response = await fetch('/api/check-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Persist correct answer for special entry
            try {
                const entry = currentEntries[index];
                const st = loadState();
                const key = entry.atIso;
                if (!st.answers) st.answers = {};
                st.answers[key] = { correct: true, answeredAt: new Date(Date.now() + serverSkewMs).toISOString() };
                saveState(st);
            } catch {}
            fireConfetti();
            showAnswerResult(index, true);
            
            // Redirect to gift countdown
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 5000); // 12 saniye gecikme
        } else {
            showToast('Yanlış Cevap Tekrar Dene ❤️');
            input.classList.add('shake');
            setTimeout(() => input.classList.remove('shake'), 500);
        }
    } catch (error) {
        console.error('Password check failed:', error);
        showToast('Bir hata oluştu');
    }
}

async function submitAnswer(index) {
    const entry = currentEntries[index];
    const input = document.querySelector(`[data-index="${index}"].answer-input`);
    const userAnswer = input.value.trim();
    
    // Normalize and compare
    const normalizedUser = userAnswer.normalize('NFC').toLowerCase();
    const normalizedCorrect = entry.answer.normalize('NFC').toLowerCase();
    
    if (normalizedUser === normalizedCorrect) {
        // Persist correct answer state
        try {
            const st = loadState();
            const key = entry.atIso;
            if (!st.answers) st.answers = {};
            st.answers[key] = { correct: true, answeredAt: new Date(Date.now() + serverSkewMs).toISOString() };
            saveState(st);
        } catch {}
        fireConfetti();
        showAnswerResult(index, true);
        clearHintTimer(index);
        
        // Show post-answer media if available
        if (entry.mediaAfterAnswer) {
            showPostAnswerMedia(index, entry.mediaAfterAnswer);
        }
    } else {
        showLocalError(input, 'Yanlış, tekrar dene ❤️');
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 500);
    }
}

function showAnswerResult(index, isCorrect) {
    const entry = currentEntries[index];
    const entryEl = document.querySelector(`[data-index="${index}"]`);
    const questionSection = entryEl.querySelector('.question-section');
    
    if (isCorrect && entry.postAnswerMessage) {
        questionSection.innerHTML = `
        <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid #22C55E; border-radius: var(--radius-xl); padding: 1.5rem; text-align: center;">
            <h3 style="color: #22C55E; margin-bottom: 1rem;">✅ Doğru Cevap!</h3>
            <div class="entry-message">${entry.postAnswerMessage}</div>
        </div>`;
    }
}

function showPostAnswerMedia(index, mediaList) {
    const entryEl = document.querySelector(`[data-index="${index}"]`);
    const questionSection = entryEl.querySelector('.question-section');
    
    let mediaHtml = '<div class="entry-media" style="margin-top: 1.5rem;">';
    mediaList.forEach(media => {
        if (media.kind === 'image') {
            mediaHtml += `<img src="${media.src}" alt="${media.alt || ''}" loading="lazy">`;
        } else if (media.kind === 'video') {
            mediaHtml += `<video controls${media.poster ? ` poster="${media.poster}"` : ''}>
                <source src="${media.src}" type="video/mp4">
                Your browser does not support the video tag.
            </video>`;
        } else if (media.kind === 'audio') {
            mediaHtml += `<div class="audio-block">
                <audio controls src="${media.src}" style="width: 100%;"></audio>
                <div style="margin-top: 0.5rem;">
                    <a class="btn btn-secondary" href="${media.src}" download>
                        ${media.label || media.alt || 'Ses dosyasını indir'}
                    </a>
                </div>
            </div>`;
        }
    });
    mediaHtml += '</div>';
    
    questionSection.insertAdjacentHTML('beforeend', mediaHtml);
}


function startHintTimer(index) {
    const entry = currentEntries[index];
    const entryKey = entry.atIso;
    const hintBtn = document.querySelector(`[data-index="${index}"].hint-btn`);
    if (!hintBtn) return;

    const timerEl = hintBtn.querySelector('.hint-timer');

    // Load state
    const state = loadState();
    if (!state.hints) state.hints = {};
    if (!state.hints[entryKey]) state.hints[entryKey] = { shown: 0 };

    // How many hints are already revealed
    let shownCount = Math.min(state.hints[entryKey].shown || 0, (entry.hints || []).length);

    // Helper to enable button to reveal next hint
    function enableHintButton() {
        if (!entry.hints || shownCount >= entry.hints.length) {
            hintBtn.disabled = true;
            hintBtn.classList.remove('pulse-glow');
            timerEl.textContent = 'Tüm İpuçları Gösterildi';
            clearHintTimer(index);
            return;
        }
        hintBtn.disabled = false;
        hintBtn.classList.add('pulse-glow');
        timerEl.textContent = 'İpucu Hazır';
        hintBtn.onclick = () => {
            showNextHint(index);
            // Increment shown count and persist
            const st = loadState();
            if (!st.hints) st.hints = {};
            if (!st.hints[entryKey]) st.hints[entryKey] = { shown: 0 };
            st.hints[entryKey].shown = Math.min((st.hints[entryKey].shown || 0) + 1, entry.hints.length);
            saveState(st);
            shownCount = st.hints[entryKey].shown;
            // After revealing, continue to next timer
            startHintTimer(index);
        };
    }

    // Determine the target unlock time for the next hint:
    // Each hint unlocks at (atIso + 10min * hintNumber)
    const nextHintNumber = shownCount + 1;
    if (!entry.hints || nextHintNumber > entry.hints.length) {
        // All hints done
        hintBtn.disabled = true;
        hintBtn.classList.remove('pulse-glow');
        timerEl.textContent = 'Tüm İpuçları Gösterildi';
        clearHintTimer(index);
        return;
    }

    // Compute unlock time relative to schedule's atIso (which already encodes Europe/Istanbul)
    const atMs = new Date(entry.atIso).getTime();
    const unlockMs = atMs + nextHintNumber * 10 * 60 * 1000;

    // Clear previous timer if any
    clearHintTimer(index);

    // If already past unlock time, enable immediately
    const nowMs = Date.now() + serverSkewMs;
    let msLeft = unlockMs - nowMs;
    if (msLeft <= 0) {
        enableHintButton();
        return;
    }

    // Otherwise, show live countdown that survives refresh (since it's based on absolute time)
    const tick = () => {
        const now = Date.now() + serverSkewMs;
        msLeft = Math.max(0, unlockMs - now);

        const totalSeconds = Math.floor(msLeft / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (msLeft <= 0) {
            clearInterval(timer);
            enableHintButton();
        }
    };

    tick();
    const timer = setInterval(tick, 1000);
    hintTimers.set(index, timer);
}


function clearHintTimer(index) {
    const timer = hintTimers.get(index);
    if (timer) {
        clearInterval(timer);
        hintTimers.delete(index);
    }
}

function showNextHint(index) {
    const entry = currentEntries[index];
    const hintListEl = document.getElementById(`hintList${index}`);
    const currentHints = hintListEl.children.length;
    
    if (currentHints < entry.hints.length) {
        const hint = entry.hints[currentHints];
        const hintEl = document.createElement('li');
        hintEl.textContent = `💡 ${hint}`;
        hintListEl.appendChild(hintEl);
        
        // Reset timer for next hint
        if (currentHints + 1 < entry.hints.length) {
            const hintBtn = document.querySelector(`[data-index="${index}"].hint-btn`);
            hintBtn.disabled = true;
            hintBtn.classList.remove('pulse-glow');
            startHintTimer(index);
        } else {
            // All hints shown
            const hintBtn = document.querySelector(`[data-index="${index}"].hint-btn`);
            hintBtn.disabled = true;
            hintBtn.classList.remove('pulse-glow');
            hintBtn.querySelector('.hint-timer').textContent = 'Tüm İpuçları Gösterildi';
            clearHintTimer(index);
        }
    }
}

function updateTimeline(currentSlot) {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '';
    
    // Create dots for the two-day period
    const totalSlots = 11; // Approximate number of slots
    
    for (let i = 0; i < totalSlots; i++) {
        const dot = document.createElement('div');
        dot.className = 'timeline-dot';
        
        if (i < currentSlot.index) {
            dot.classList.add('past');
        } else if (i === currentSlot.index) {
            dot.classList.add('current');
        }
        
        timeline.appendChild(dot);
    }
}

function updateCountdowns(msToNext, nextEntryIso) {
    if (msToNext <= 0) {
        document.getElementById('topCountdown').textContent = 'İYİ Kİ DOĞDUN SEVGİLİM';
        document.getElementById('footerCountdown').textContent = 'SENİ ÇOK SEVİYORUM 💙';
        return;
    }
    
    const hours = Math.floor(msToNext / (1000 * 60 * 60));
    const minutes = Math.floor((msToNext % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((msToNext % (1000 * 60)) / 1000);
    
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Format next entry time
    let footerText = `Bir Sonraki Gizemli İçeriğe Kalan Süre : ${timeStr}`;
    if (nextEntryIso) {
        const nextTime = new Date(nextEntryIso);
        const nextTimeStr = nextTime.toLocaleString('tr-TR', { 
            timeZone: 'Europe/Istanbul',
            hour: '2-digit',
            minute: '2-digit'
        });
        const nextDateStr = nextTime.toLocaleDateString('tr-TR', {
            timeZone: 'Europe/Istanbul',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        footerText += `\n🩵${nextDateStr} - Saat ${nextTimeStr} 🩵`;
    }
    
    document.getElementById('topCountdown').textContent = timeStr;
    document.getElementById('footerCountdown').textContent = footerText;
}

function startCountdowns() {
    nextCountdownInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/current-slot');
            const currentSlot = await response.json();
            updateCountdowns(currentSlot.msToNext, currentSlot.nextEntryIso);
            // Update global simulation speed
            currentSimSpeed = currentSlot.simulationSpeed || 1;
        } catch (error) {
            console.error('Failed to update countdown:', error);
        }
    }, 1000);
}

function showCTA(index) {
    const entry = currentEntries[index];
    if (!entry.cta) return;
    
    const modal = document.getElementById('ctaModal');
    const content = document.getElementById('ctaModalContent');
    
    content.innerHTML = `
        <h2 style="margin-bottom: 1.5rem;">${entry.cta.label}</h2>
        <div class="entry-message">${entry.cta.afterCtaMessage}</div>
    `;
    
    modal.classList.remove('hide');
}

function closeModal() {
    document.getElementById('ctaModal').classList.add('hide');
}

function showToast(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--surface);
        backdrop-filter: blur(20px);
        border: var(--border-subtle);
        border-radius: var(--radius-xl);
        padding: 1rem 1.5rem;
        box-shadow: var(--shadow-soft);
        z-index: 1000;
        animation: fadeUp 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeUp 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showLocalError(inputElement, message) {
    // Remove any existing local error message for this input's parent section
    const questionSection = inputElement.closest('.question-section');
    if (questionSection) {
        const existingError = questionSection.querySelector('.local-error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    const errorEl = document.createElement('div');
    errorEl.className = 'local-error-message';
    errorEl.textContent = message;
    errorEl.style.cssText = `
        color: #EF4444;
        font-size: 0.875rem;
        margin-top: 0.5rem;
        text-align: center;
        animation: fadeUp 0.3s ease;
        padding: 0.5rem;
        background: rgba(239, 68, 68, 0.1);
        border-radius: var(--radius-xl);
        border: 1px solid rgba(239, 68, 68, 0.2);
    `;
    
    // Insert error message after the input element
    inputElement.parentNode.insertBefore(errorEl, inputElement.nextSibling);

    // Remove message after 3 seconds
    setTimeout(() => {
        errorEl.style.animation = 'fadeUp 0.3s ease reverse';
        setTimeout(() => errorEl.remove(), 300);
    }, 3000);
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// Close modal on outside click
document.getElementById('ctaModal').addEventListener('click', (e) => {
    if (e.target.id === 'ctaModal') {
        closeModal();
    }
});

// Initialize the app
initialize();