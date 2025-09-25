let currentTab = 'config';
let selectedEntryIndex = null;
let scheduleData = [];

async function initialize() {
    await loadConfig();
    await loadSchedule();
    await checkSimulation();
}

function showTab(tabName) {
    // Update nav
    document.querySelectorAll('.admin-nav button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Update panels
    document.getElementById('configPanel').classList.toggle('hide', tabName !== 'config');
    document.getElementById('schedulePanel').classList.toggle('hide', tabName !== 'schedule');
    document.getElementById('contentPanel').classList.toggle('hide', tabName !== 'content');
    
    currentTab = tabName;
}

async function loadConfig() {
    try {
        const response = await fetch('/api/admin/config');
        const config = await response.json();
        
        document.getElementById('startAtIso').value = config.startAtIso.replace('+03:00', '');
        document.getElementById('endAtIso').value = config.endAtIso.replace('+03:00', '');
        document.getElementById('timezone').value = config.timezone;
        document.getElementById('giftMessage').value = config.giftMessage;
    } catch (error) {
        console.error('Failed to load config:', error);
    }
}

async function saveConfig() {
    try {
        const config = {
            startAtIso: document.getElementById('startAtIso').value + '+03:00',
            endAtIso: document.getElementById('endAtIso').value + '+03:00',
            timezone: document.getElementById('timezone').value,
            giftMessage: document.getElementById('giftMessage').value,
            requireUserLogin: true,
            requireAdminLogin: true
        };
        
        const response = await fetch('/api/admin/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        
        if (response.ok) {
            showToast('Config saved successfully');
        } else {
            showToast('Failed to save config');
        }
    } catch (error) {
        console.error('Failed to save config:', error);
        showToast('Failed to save config');
    }
}

async function loadSchedule() {
    try {
        const response = await fetch('/api/admin/schedule');
        scheduleData = await response.json();
        renderScheduleList();
    } catch (error) {
        console.error('Failed to load schedule:', error);
    }
}

function renderScheduleList() {
    const listEl = document.getElementById('scheduleList');
    listEl.innerHTML = '';
    
    scheduleData.forEach((entry, index) => {
        const entryEl = document.createElement('div');
        entryEl.className = 'card';
        entryEl.style.padding = '1rem';
        entryEl.style.marginBottom = '1rem';
        entryEl.style.cursor = 'pointer';
        
        const date = new Date(entry.atIso);
        const timeStr = date.toLocaleString('tr-TR', { 
            timeZone: 'Europe/Istanbul',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        entryEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${timeStr}</strong> - ${entry.type}
                    <div class="text-muted" style="font-size: 0.875rem;">
                        ${entry.message ? entry.message.substring(0, 100) + '...' : 'No message'}
                    </div>
                </div>
                <div>
                    <button onclick="editEntry(${index})" class="btn btn-secondary" style="padding: 0.5rem; margin-right: 0.5rem;">Edit</button>
                    <button onclick="deleteEntry(${index})" class="btn btn-secondary" style="padding: 0.5rem; background: rgba(239, 68, 68, 0.1); color: #EF4444;">Delete</button>
                </div>
            </div>
        `;
        
        listEl.appendChild(entryEl);
    });
}

function previewEntry(index) {
    window.open(`/app.html?previewIndex=${index}`, '_blank');
}

function previewAll() {
    window.open('/app.html?previewIndex=999', '_blank');
}

function editEntry(index) {
    selectedEntryIndex = index;
    showTab('content');
    loadContentEditor(scheduleData[index]);
}

function loadContentEditor(entry = null) {
    const editor = document.getElementById('contentEditor');
    
    if (!entry) {
        editor.innerHTML = '<p class="text-muted">Select an entry from the Day Controller to edit its content.</p>';
        return;
    }
    
    editor.innerHTML = `
        <form id="contentForm">
            <div class="form-group">
                <label for="entryAtIso">Time (ISO)</label>
                <input type="datetime-local" id="entryAtIso" class="input" value="${entry.atIso.replace('+03:00', '')}" required>
            </div>
            
            <div class="form-group">
                <label for="entryType">Type</label>
                <select id="entryType" class="input">
                    <option value="message" ${entry.type === 'message' ? 'selected' : ''}>Message</option>
                    <option value="question" ${entry.type === 'question' ? 'selected' : ''}>Question</option>
                    <option value="media" ${entry.type === 'media' ? 'selected' : ''}>Media</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="entryMessage">Message</label>
                <textarea id="entryMessage" class="input textarea" style="min-height: 200px;">${entry.message || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label for="preContentNote">Pre-Content Note</label>
                <textarea id="preContentNote" class="input textarea">${entry.preContentNote || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label>Media</label>
                <div id="mediaList"></div>
                <button type="button" onclick="addMedia()" class="btn btn-secondary">Add Media</button>
            </div>
            
            <div id="questionFields" class="form-group" style="display: ${entry.type === 'question' ? 'block' : 'none'};">
                <label for="entryQuestion">Question</label>
                <textarea id="entryQuestion" class="input textarea">${entry.question || ''}</textarea>
                
                <label for="entryAnswer">Answer</label>
                <input type="text" id="entryAnswer" class="input" value="${entry.answer || ''}">
                
                <label>Hints</label>
                <div id="hintsList"></div>
                <button type="button" onclick="addHint()" class="btn btn-secondary">Add Hint</button>
                
                <label for="postAnswerMessage">Post-Answer Message</label>
                <textarea id="postAnswerMessage" class="input textarea">${entry.postAnswerMessage || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label>CTA Button</label>
                <input type="text" id="ctaLabel" class="input" placeholder="Button label" value="${entry.cta?.label || ''}" style="margin-bottom: 0.5rem;">
                <textarea id="ctaMessage" class="input textarea" placeholder="Message after clicking CTA">${entry.cta?.afterCtaMessage || ''}</textarea>
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn btn-primary">Save Entry</button>
                <button type="button" onclick="cancelEdit()" class="btn btn-secondary">Cancel</button>
            </div>
        </form>
    `;
    
    // Load media and hints
    loadMediaList(entry.media || []);
    loadHintsList(entry.hints || []);
    
    // Type change handler
    document.getElementById('entryType').addEventListener('change', (e) => {
        const questionFields = document.getElementById('questionFields');
        questionFields.style.display = e.target.value === 'question' ? 'block' : 'none';
    });
    
    // Form submit handler
    document.getElementById('contentForm').addEventListener('submit', saveEntry);
}

function loadMediaList(mediaList) {
    const container = document.getElementById('mediaList');
    container.innerHTML = '';
    
    mediaList.forEach((media, index) => {
        const mediaEl = document.createElement('div');
        mediaEl.style.cssText = 'display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; padding: 1rem; background: var(--surface-dark); border-radius: var(--radius-xl);';
        
        mediaEl.innerHTML = `
            <select class="input" style="width: 120px;" data-media-index="${index}">
                <option value="image" ${media.kind === 'image' ? 'selected' : ''}>Image</option>
                <option value="video" ${media.kind === 'video' ? 'selected' : ''}>Video</option>
                <option value="audio" ${media.kind === 'audio' ? 'selected' : ''}>Audio</option>
            </select>
            <input type="text" class="input" placeholder="Source URL" data-media-src="${index}" style="flex: 1;">
            <input type="text" class="input" placeholder="Alt/Poster (Audio için İndirme Etiketi)" data-media-alt="${index}" style="width: 150px;">
            <button type="button" class="btn" style="padding: 0.5rem;" onclick="uploadMediaFor(${index})">Upload</button>
            <button type="button" onclick="removeMedia(${index})" class="btn btn-secondary" style="padding: 0.5rem;">Remove</button>
        `;
        
        container.appendChild(mediaEl);
    });
}

function addMedia() {
    const container = document.getElementById('mediaList');
    const index = container.children.length;
    
    const mediaEl = document.createElement('div');
    mediaEl.style.cssText = 'display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; padding: 1rem; background: var(--surface-dark); border-radius: var(--radius-xl);';
    
    mediaEl.innerHTML = `
        <select class="input" style="width: 120px;" data-media-index="${index}">
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
        </select>
        <input type="text" class="input" placeholder="Source URL" data-media-src="${index}" style="flex: 1;">
        <input type="text" class="input" placeholder="Alt/Poster (Audio için İndirme Etiketi)" data-media-alt="${index}" style="width: 150px;">
        <button type="button" onclick="removeMedia(${index})" class="btn btn-secondary" style="padding: 0.5rem;">Remove</button>
    `;
    
    container.appendChild(mediaEl);
}

function uploadMediaFor(index) {
    // Geçici file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png,.gif,.mp4,.webm,.mov,.mp3,.wav,.m4a,.ogg,.flac,.aac';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const form = new FormData();
        form.append('file', file);
        try {
            const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            // Uzantıdan tür tespiti
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            let kind = 'image';
            if (['mp4','webm','mov'].includes(ext)) kind = 'video';
            if (['mp3','wav','m4a','ogg','flac','aac'].includes(ext)) kind = 'audio';
            const container = document.getElementById('mediaList');
            const row = container.children[index];
            if (row) {
                row.querySelector(`[data-media-index="${index}"]`).value = kind;
                row.querySelector(`[data-media-src="${index}"]`).value = data.path;
                const altInput = row.querySelector(`[data-media-alt="${index}"]`);
                if (altInput && !altInput.value) {
                    if (kind === 'video') altInput.placeholder = 'Poster URL (optional)';
                    else if (kind === 'image') altInput.placeholder = 'Alt text';
                    else if (kind === 'audio') altInput.placeholder = 'İndirme etiketi (örn: "Şarkıyı indir")';
                }
            }
        } catch (err) {
            alert('Upload failed: ' + err.message);
            console.error(err);
        }
    };
    input.click();
}

function removeMedia(index) {
    const container = document.getElementById('mediaList');
    container.children[index].remove();
    
    // Re-index remaining items
    Array.from(container.children).forEach((child, newIndex) => {
        child.querySelector('[data-media-index]').dataset.mediaIndex = newIndex;
        child.querySelector('[data-media-src]').dataset.mediaSrc = newIndex;
        child.querySelector('[data-media-alt]').dataset.mediaAlt = newIndex;
        child.querySelector('button').onclick = () => removeMedia(newIndex);
    });
}

function loadHintsList(hints) {
    const container = document.getElementById('hintsList');
    container.innerHTML = '';
    
    hints.forEach((hint, index) => {
        const hintEl = document.createElement('div');
        hintEl.style.cssText = 'display: flex; gap: 1rem; align-items: center; margin-bottom: 0.5rem;';
        
        hintEl.innerHTML = `
            <input type="text" class="input" value="${hint}" data-hint-index="${index}" style="flex: 1;">
            <button type="button" onclick="removeHint(${index})" class="btn btn-secondary" style="padding: 0.5rem;">Remove</button>
        `;
        
        container.appendChild(hintEl);
    });
}

function addHint() {
    const container = document.getElementById('hintsList');
    const index = container.children.length;
    
    const hintEl = document.createElement('div');
    hintEl.style.cssText = 'display: flex; gap: 1rem; align-items: center; margin-bottom: 0.5rem;';
    
    hintEl.innerHTML = `
        <input type="text" class="input" placeholder="Enter hint..." data-hint-index="${index}" style="flex: 1;">
        <button type="button" onclick="removeHint(${index})" class="btn btn-secondary" style="padding: 0.5rem;">Remove</button>
    `;
    
    container.appendChild(hintEl);
}

function removeHint(index) {
    const container = document.getElementById('hintsList');
    container.children[index].remove();
    
    // Re-index remaining items
    Array.from(container.children).forEach((child, newIndex) => {
        child.querySelector('[data-hint-index]').dataset.hintIndex = newIndex;
        child.querySelector('button').onclick = () => removeHint(newIndex);
    });
}

async function saveEntry(e) {
    e.preventDefault();
    
    if (selectedEntryIndex === null) return;
    
    // Collect form data
    const formData = {
        atIso: document.getElementById('entryAtIso').value + '+03:00',
        type: document.getElementById('entryType').value,
        message: document.getElementById('entryMessage').value,
        preContentNote: document.getElementById('preContentNote').value || undefined,
        media: collectMediaData(),
        question: document.getElementById('entryQuestion').value || null,
        answer: document.getElementById('entryAnswer').value || null,
        hints: collectHintsData(),
        postAnswerMessage: document.getElementById('postAnswerMessage').value || undefined,
        cta: collectCTAData()
    };
    
    // Update schedule
    scheduleData[selectedEntryIndex] = formData;
    
    try {
        const response = await fetch('/api/admin/schedule', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scheduleData)
        });
        
        if (response.ok) {
            showToast('Entry saved successfully');
            renderScheduleList();
        } else {
            showToast('Failed to save entry');
        }
    } catch (error) {
        console.error('Failed to save entry:', error);
        showToast('Failed to save entry');
    }
}

function collectMediaData() {
    const mediaList = [];
    const container = document.getElementById('mediaList');
    
    Array.from(container.children).forEach((child, index) => {
        const kind = child.querySelector(`[data-media-index="${index}"]`).value;
        const src = child.querySelector(`[data-media-src="${index}"]`).value;
        const altPoster = child.querySelector(`[data-media-alt="${index}"]`).value;
        
        if (src) {
            const media = { kind, src };
            if (altPoster) {
                media[kind === 'video' ? 'poster' : 'alt'] = altPoster;
            }
            mediaList.push(media);
        }
    });
    
    return mediaList;
}

function collectHintsData() {
    const hints = [];
    const container = document.getElementById('hintsList');
    
    Array.from(container.children).forEach((child, index) => {
        const hint = child.querySelector(`[data-hint-index="${index}"]`).value.trim();
        if (hint) {
            hints.push(hint);
        }
    });
    
    return hints;
}

function collectCTAData() {
    const label = document.getElementById('ctaLabel').value.trim();
    const message = document.getElementById('ctaMessage').value.trim();
    
    if (label && message) {
        return { label, afterCtaMessage: message };
    }
    
    return undefined;
}

function addEntry() {
    const newEntry = {
        atIso: new Date().toISOString(),
        type: 'message',
        message: '',
        media: [],
        question: null,
        answer: null,
        hints: []
    };
    
    scheduleData.push(newEntry);
    selectedEntryIndex = scheduleData.length - 1;
    
    renderScheduleList();
    showTab('content');
    loadContentEditor(newEntry);
}

function deleteEntry(index) {
    if (confirm('Are you sure you want to delete this entry?')) {
        scheduleData.splice(index, 1);
        renderScheduleList();
        
        if (selectedEntryIndex === index) {
            selectedEntryIndex = null;
            loadContentEditor();
        }
    }
}

function cancelEdit() {
    selectedEntryIndex = null;
    loadContentEditor();
}

async function exportSchedule() {
    const dataStr = JSON.stringify(scheduleData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'schedule.json';
    link.click();
}

function importSchedule() {
    document.getElementById('importFile').click();
}

async function setSimulation() {
    const timeInput = document.getElementById('simTimeInput');
    const speedInput = document.getElementById('simSpeedInput');
    const isoTime = timeInput.value ? timeInput.value + '+03:00' : null;
    const speed = parseFloat(speedInput.value);
    
    try {
        const response = await fetch('/api/admin/sim-time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ previewAtIso: isoTime, speed: speed })
        });
        
        if (response.ok) {
            showToast('Simulation time and speed set');
            checkSimulation();
        } else {
            showToast('Failed to set simulation');
        }
    } catch (error) {
        console.error('Failed to set simulation:', error);
        showToast('Failed to set simulation');
    }
}

async function clearSimulation() {
    try {
        const response = await fetch('/api/admin/sim-time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ previewAtIso: null })
        });
        
        if (response.ok) {
            showToast('Simulation cleared');
            document.getElementById('simSpeedInput').value = 1;
            checkSimulation();
        }
    } catch (error) {
        console.error('Failed to clear simulation:', error);
    }
}

async function checkSimulation() {
    try {
        const response = await fetch('/api/admin/sim-time');
        const data = await response.json();
        
        const banner = document.getElementById('simBanner');
        if (data.previewAtIso) {
            document.getElementById('simTime').textContent = 
                `${new Date(data.previewAtIso).toLocaleString('tr-TR')} (Speed: x${data.speed})`;
            banner.classList.remove('hide');
            document.getElementById('simTimeInput').value = data.previewAtIso.substring(0, 16);
            document.getElementById('simSpeedInput').value = data.speed;
        } else {
            banner.classList.add('hide');
            document.getElementById('simTimeInput').value = '';
            document.getElementById('simSpeedInput').value = 1;
        }
    } catch (error) {
        console.error('Failed to check simulation:', error);
    }
}

async function setSpeed(multiplier) {
    document.getElementById('simSpeedInput').value = multiplier;
    
    try {
        const response = await fetch('/api/admin/set-sim-speed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ speed: multiplier })
        });
        
        if (response.ok) {
            showToast(`Speed set to ${multiplier}x`);
            checkSimulation();
        } else {
            showToast('Failed to set speed');
        }
    } catch (error) {
        console.error('Failed to set speed:', error);
        showToast('Failed to set speed');
    }
}

async function advanceSimulation(unit, amount) {
    try {
        const response = await fetch('/api/admin/advance-sim-time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ unit, amount })
        });
        
        if (response.ok) {
            showToast(`Simulation advanced by ${amount} ${unit}(s)`);
            checkSimulation();
        } else {
            showToast('Failed to advance simulation');
        }
    } catch (error) {
        console.error('Failed to advance simulation:', error);
        showToast('Failed to advance simulation');
    }
}
function showToast(message) {
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

async function logout() {
    try {
        await fetch('/api/admin/logout', { method: 'POST' });
        window.location.href = '/admin-login.html';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// Event Handlers
document.getElementById('configForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveConfig();
});

document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const importedData = JSON.parse(text);
        
        if (Array.isArray(importedData)) {
            scheduleData = importedData;
            await fetch('/api/admin/schedule', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scheduleData)
            });
            
            renderScheduleList();
            showToast('Schedule imported successfully');
        } else {
            showToast('Invalid schedule format');
        }
    } catch (error) {
        console.error('Import failed:', error);
        showToast('Import failed');
    }
});

// Initialize
initialize();