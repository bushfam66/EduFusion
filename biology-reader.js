// ============================================
// BIOLOGY READER - TEXTBOOK FUNCTIONALITY
// ============================================

// State Management
const API_BASE_URL = (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) ? window.location.origin : 'http://localhost:3000';
let currentPage = 1;
let totalPages = 3;
let touchStartX = null;
let touchStartY = null;
let touchCurrentX = null;
let touchCurrentY = null;
let isDragging = false;
let dragThreshold = 60;
let velocity = 0;
let lastTouchTime = 0;
let activeAnalysisPage = null;
let apiAvailable = false;
let noteMode = 'text'; // 'pen' or 'text'
let currentSpeakerUtterance = null;
let fontSize = 16;
let lineSpacing = 1.6;
let videos = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeReader();
    setupEventListeners();
    loadVideosFromStorage();
    loadNotesFromStorage();
    loadSettingsFromStorage();
});

// ============================================
// INITIALIZATION
// ============================================
async function initializeReader() {
    console.log('Initializing Biology Reader...');
    showPage(1);
    updatePageIndicators();
    setupTouchGestures();
    setupHighlighting();
    updateVideoControls();
    initializeTextToSpeech();
    await checkApiStatus();
}

function setupEventListeners() {
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') previousPage();
        if (e.key === 'ArrowRight') nextPage();
    });

    // Chat enter key
    const chatInput = document.getElementById('chatQuestion');
    if (chatInput) {
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                askAnalysisQuestion();
            }
        });
    }
}

// ============================================
// PAGE NAVIGATION
// ============================================
function showPage(pageNum) {
    const pages = document.querySelectorAll('.textbook-page');
    const currentActivePage = document.querySelector('.textbook-page.active');
    const targetPage = document.querySelector(`[data-page="${pageNum}"]`);

    if (!targetPage) return;

    // Determine slide direction
    const direction = pageNum > currentPage ? 'right' : 'left';
    const slideInClass = direction === 'right' ? 'slide-in-right' : 'slide-in-left';
    const slideOutClass = direction === 'right' ? 'slide-out-left' : 'slide-out-right';

    // Add slide-out animation to current page
    if (currentActivePage && currentActivePage !== targetPage) {
        currentActivePage.classList.add(slideOutClass);
        currentActivePage.classList.remove('active');

        // Remove slide-out class after animation
        setTimeout(() => {
            currentActivePage.classList.remove(slideOutClass);
        }, 600);
    }

    // Add slide-in animation to target page
    targetPage.classList.add('active', slideInClass);

    // Remove slide-in class after animation completes
    setTimeout(() => {
        targetPage.classList.remove(slideInClass);
    }, 600);

    currentPage = pageNum;
    updatePageIndicators();
    loadHighlights();

    // Smooth scroll to top with easing
    const pageContent = targetPage.querySelector('.page-content');
    if (pageContent) {
        pageContent.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        showPage(currentPage + 1);
    }
}

function previousPage() {
    if (currentPage > 1) {
        showPage(currentPage - 1);
    }
}

function goToPage(pageNum) {
    showPage(pageNum);
}

function updatePageIndicators() {
    const dots = document.querySelectorAll('.page-dot');
    dots.forEach(dot => {
        dot.classList.remove('active');
        if (parseInt(dot.dataset.page) === currentPage) {
            dot.classList.add('active');
        }
    });
}

// ============================================
// TOUCH GESTURES & SWIPE
// ============================================
function setupTouchGestures() {
    const container = document.querySelector('.textbook-pages-container');
    if (!container) return;

    container.style.touchAction = 'pan-y';

    container.addEventListener('pointerdown', handlePointerStart, { passive: true });
    container.addEventListener('pointermove', handlePointerMove, { passive: false });
    container.addEventListener('pointerup', handlePointerEnd, { passive: true });
    container.addEventListener('pointercancel', handlePointerEnd, { passive: true });
    container.addEventListener('pointerleave', handlePointerEnd, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: false });

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: false });
}

function handleWheel(e) {
    const currentPageEl = document.querySelector('.textbook-page.active');
    if (!currentPageEl) return;

    currentPageEl.scrollTop += e.deltaY;
    e.preventDefault();
}

function handleTouchStart(e) {
    if (!e.touches || e.touches.length > 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchCurrentX = touchStartX;
    touchCurrentY = touchStartY;
    isDragging = false;
    velocity = 0;
    lastTouchTime = Date.now();
}

function handlePointerStart(e) {
    touchStartX = e.clientX;
    touchStartY = e.clientY;
    touchCurrentX = touchStartX;
    touchCurrentY = touchStartY;
    isDragging = false;
    velocity = 0;
    lastTouchTime = Date.now();
}

function handleTouchMove(e) {
    if (touchStartX === null) return;
    if (!e.touches || e.touches.length === 0) return;

    touchCurrentX = e.touches[0].clientX;
    touchCurrentY = e.touches[0].clientY;

    processDragMove(e);
}

function handlePointerMove(e) {
    if (touchStartX === null) return;

    touchCurrentX = e.clientX;
    touchCurrentY = e.clientY;

    processDragMove(e);
}

function processDragMove(e) {
    const deltaX = touchCurrentX - touchStartX;
    const deltaY = touchCurrentY - touchStartY;

    if (!isDragging && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isDragging = true;
    }

    if (isDragging) {
        const currentTime = Date.now();
        const timeDelta = currentTime - lastTouchTime;
        if (timeDelta > 0) {
            velocity = deltaX / timeDelta;
        }
        lastTouchTime = currentTime;

        const currentPageEl = document.querySelector('.textbook-page.active');
        if (currentPageEl) {
            const translateX = Math.max(Math.min(deltaX, 120), -120);
            const scale = 1 - Math.min(Math.abs(translateX) / 120, 0.08);
            currentPageEl.style.transform = `translateX(${translateX}px) scale(${scale})`;
            currentPageEl.style.transition = 'none';
            currentPageEl.classList.add('dragging');
        }

        e.preventDefault();
    }
}

function handleTouchEnd(e) {
    handlePointerEnd(e);
}

function handlePointerEnd(e) {
    if (!isDragging) {
        touchStartX = null;
        return;
    }

    const deltaX = touchCurrentX - touchStartX;
    const deltaY = touchCurrentY - touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    const currentPageEl = document.querySelector('.textbook-page.active');
    if (currentPageEl) {
        currentPageEl.style.transition = 'transform 0.25s ease-out';
        currentPageEl.style.transform = '';
        currentPageEl.classList.remove('dragging');
    }

    const isHorizontalSwipe = absDeltaX > absDeltaY && absDeltaX > dragThreshold;
    const isFastSwipe = Math.abs(velocity) > 0.7;

    if (isHorizontalSwipe || isFastSwipe) {
        if (deltaX < -dragThreshold || (deltaX < -25 && isFastSwipe)) {
            smoothPageTransition('next');
        } else if (deltaX > dragThreshold || (deltaX > 25 && isFastSwipe)) {
            smoothPageTransition('prev');
        }
    }

    touchStartX = null;
    touchStartY = null;
    touchCurrentX = null;
    touchCurrentY = null;
    isDragging = false;
}

function smoothPageTransition(direction) {
    if (direction === 'next' && currentPage < totalPages) {
        nextPage();
    } else if (direction === 'prev' && currentPage > 1) {
        previousPage();
    }
}

function showDetailedAnalysis(pageNum) {
    activeAnalysisPage = pageNum;
    const panel = document.getElementById('analysisPanel');
    const body = document.getElementById('analysisBody');
    const chatMessages = document.getElementById('chatMessages');
    const questionInput = document.getElementById('chatQuestion');
    const pageElement = document.querySelector(`[data-page="${pageNum}"] h2`);
    const topicTitle = pageElement ? pageElement.textContent : `Topic ${pageNum}`;
    const analysis = getTopicAnalysis(pageNum, topicTitle);

    body.innerHTML = analysis.map(section => `<p>${section}</p>`).join('');
    chatMessages.innerHTML = '';
    questionInput.value = '';
    panel.classList.add('open');
}

function closeAnalysisPanel() {
    const panel = document.getElementById('analysisPanel');
    panel.classList.remove('open');
}

async function askAnalysisQuestion() {
    const input = document.getElementById('chatQuestion');
    const question = input.value.trim();
    if (!question) return;

    const pageNum = activeAnalysisPage || currentPage;
    const pageElement = document.querySelector(`[data-page="${pageNum}"] h2`);
    const topicTitle = pageElement ? pageElement.textContent : `Topic ${pageNum}`;

    appendChatMessage('user', question);
    input.value = '';

    try {
        const aiResponse = getLocalAIResponse(question, pageNum, topicTitle);
        appendChatMessage('ai', aiResponse);
    } catch (error) {
        console.error('AI chat error:', error);
        appendChatMessage('ai', getLocalAIResponse(question, pageNum, topicTitle));
    }
}

function appendChatMessage(role, text) {
    const messages = document.getElementById('chatMessages');
    if (!messages) return;
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${role}`;
    messageEl.innerHTML = `<strong>${role === 'user' ? 'You' : 'EduFusion AI'}:</strong> ${text}`;
    messages.appendChild(messageEl);
    messages.scrollTop = messages.scrollHeight;
}

function getChatResponse(question, pageNum, topicTitle) {
    return getLocalAIResponse(question, pageNum, topicTitle);
}

function getLocalAIResponse(question, pageNum, topicTitle) {
    const lower = question.toLowerCase();
    const topic = topicTitle.toLowerCase();

    if (lower.includes('mitosis') || lower.includes('meiosis') || topic.includes('cell structure')) {
        if (lower.includes('difference')) {
            return 'Mitosis makes two identical diploid cells for growth and repair, while meiosis makes four genetically unique haploid cells for reproduction.';
        }
        if (lower.includes('cell division')) {
            return 'Cell division creates new cells. Mitosis makes identical body cells, while meiosis makes sex cells with half the number of chromosomes.';
        }
    }

    if (lower.includes('photosynthesis') || topic.includes('photosynthesis')) {
        if (lower.includes('light')) {
            return 'Plants capture sunlight with chlorophyll and use it to power chemical reactions that make glucose.';
        }
        if (lower.includes('glucose') || lower.includes('sugar')) {
            return 'Glucose is the sugar produced by photosynthesis. Plants use it for energy and store the excess as starch.';
        }
        return 'Photosynthesis is the process by which plants turn light, water, and carbon dioxide into glucose and oxygen inside chloroplasts.';
    }

    if (lower.includes('dna') || lower.includes('gene') || lower.includes('chromosome')) {
        if (lower.includes('inherit') || lower.includes('inheritance')) {
            return 'Inheritance happens when parents pass genes to their children. Genes are instructions in DNA that determine traits.';
        }
        if (lower.includes('dominant') || lower.includes('recessive')) {
            return 'A dominant allele shows its trait when present. A recessive allele only shows its trait when both copies are recessive.';
        }
        return 'DNA is the molecule that carries genetic information. Genes are segments of DNA that define traits and are passed down through inheritance.';
    }

    if (lower.includes('cell membrane') || lower.includes('membrane')) {
        return 'The cell membrane is a protective barrier that controls what enters and leaves the cell. It keeps the cell stable and safe.';
    }

    if (lower.includes('chlorophyll')) {
        return 'Chlorophyll is the green pigment in plants that absorbs sunlight for photosynthesis.';
    }

    if (lower.includes('organelles') || lower.includes('mitochondria') || lower.includes('nucleus') || lower.includes('ribosome')) {
        return 'Organelles are the small structures inside cells that do special jobs. The nucleus stores DNA and mitochondria make energy.';
    }

    if (lower.includes('what is') || lower.includes('explain') || lower.includes('how does') || lower.includes('why')) {
        return `Here is a clear answer for ${topicTitle}: ${getTopicExplanation(pageNum)} If you want more detail on one part, ask a follow-up question.`;
    }

    return `Here is a helpful answer about ${topicTitle}: ${getTopicExplanation(pageNum)} Ask another question for more detail.`;
}

async function checkApiStatus() {
    const statusEl = document.getElementById('apiStatus');
    if (!statusEl) return;

    statusEl.textContent = 'Local AI chat ready';
    statusEl.classList.add('online');
    statusEl.classList.remove('warning', 'offline');
}

function getTopicExplanation(pageNum) {
    const explanations = {
        1: 'Cells are built around a complex internal system. The membrane controls exchange, the nucleus stores information, mitochondria make energy, and organelles coordinate growth, repair, and survival. Each component has a unique purpose that contributes to the full function of the living cell.',
        2: 'Photosynthesis is powered by light energy and takes place inside chloroplasts. The first stage captures energy from sunlit light, and the second stage uses that energy to transform carbon dioxide into sugar. It is the foundation for plant growth and the food chain.',
        3: 'Genetics is the study of how traits are inherited. Chromosomes carry genes, and each gene can exist in different forms called alleles. The combination of alleles inherited from parents creates the traits you see and determines how organisms vary.'
    };
    return explanations[pageNum] || 'This topic explores fundamental principles and can be understood step-by-step by breaking each concept down.';
}

function getTopicAnalysis(pageNum, topicTitle) {
    const analysisMap = {
        1: [
            `In ${topicTitle}, we explore the fundamental architecture of cells and the distinct roles that each component plays. The cell membrane, nucleus, mitochondria, ribosomes, endoplasmic reticulum, and Golgi apparatus work together in a coordinated system to keep the cell alive, reproduce, and respond to its environment.`,
            `The cell membrane is the boundary that regulates exchanges between the cell and its environment. It is made up of a phospholipid bilayer with embedded proteins that allow selective transport, communication, and protection. Understanding this barrier is crucial because it determines how nutrients, waste, and signals move in and out of the cell.`,
            `Eukaryotic cells contain organelles that specialize in specific tasks. The nucleus stores DNA and directs protein production, mitochondria generate energy through cellular respiration, ribosomes build proteins, the endoplasmic reticulum synthesizes and processes molecules, and the Golgi apparatus packages and ships them. This compartmentalization is what enables complex life to exist.`,
            `Cell division is the process that produces new cells. Mitosis results in two genetically identical diploid daughter cells used for growth and repair, while meiosis creates four genetically diverse haploid cells used for reproduction. Each stage of mitosis and meiosis ensures accurate replication and distribution of chromosomes, which is why errors can lead to serious health consequences.`
        ],
        2: [
            `${topicTitle} explains how plants convert light into chemical energy through a two-stage process inside chloroplasts. The light-dependent reactions capture light energy to split water molecules and create ATP and NADPH, while the Calvin cycle uses those energy carriers to fix carbon dioxide into glucose.`,
            `During the light-dependent reactions, chlorophyll absorbs photons and energizes electrons. These high-energy electrons travel through an electron transport chain, producing ATP and reducing NADP+ to NADPH. Oxygen is released as a byproduct when water molecules are split to replace lost electrons.`,
            `The Calvin cycle occurs in the stroma and is sometimes called the dark reactions because it does not directly require light. It uses ATP and NADPH made in the light-dependent stage to convert carbon dioxide into glyceraldehyde-3-phosphate, which is then assembled into glucose and other carbohydrates.`,
            `Several environmental factors influence the rate of photosynthesis: light intensity, temperature, carbon dioxide concentration, and water availability. Understanding how each factor affects enzyme activity and reaction rates helps explain why plants grow better under certain conditions and why photosynthesis can become limited under stress.`
        ],
        3: [
            `In ${topicTitle}, you learn how traits are passed from one generation to the next through genes and chromosomes. DNA stores hereditary information in sequences of nucleotide bases, and genes are specific sections of DNA that code for proteins. The arrangement of alleles in pairs determines the traits an organism expresses.`,
            `Gregor Mendel’s laws of segregation and independent assortment describe how different versions of genes separate into gametes and combine during fertilization. Segregation ensures each gamete gets one allele from each gene pair, while independent assortment means genes on different chromosomes are inherited independently, creating genetic diversity.`,
            `Dominant alleles mask the effect of recessive alleles in heterozygous individuals. Only when both alleles are recessive does the recessive trait appear. This explains why some traits seem to skip generations and why carriers can pass on traits without showing them.`,
            `Mitosis and meiosis are both forms of cell division, but they serve different purposes. Mitosis creates identical cells for body growth and repair, maintaining chromosome number, while meiosis reduces chromosome number by half to create sex cells. Meiosis also introduces genetic variation through crossing over and independent assortment, which is the basis for inheritance and evolution.`
        ]
    };

    return analysisMap[pageNum] || [`Detailed analysis for ${topicTitle} is currently unavailable.`];
}

function handleSwipe() {
    // Legacy function - kept for backward compatibility
    const swipeThreshold = 50;
    const diff = touchStartX - touchCurrentX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            nextPage();
        } else {
            previousPage();
        }
    }
}

// ============================================
// TEXT HIGHLIGHTING
// ============================================
function setupHighlighting() {
    document.addEventListener('mouseup', function() {
        const selectedText = window.getSelection();
        if (selectedText.toString().length > 0) {
            showHighlightMenu(selectedText);
        }
    });
}

function showHighlightMenu(selection) {
    const menu = document.createElement('div');
    menu.className = 'highlight-menu';
    
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = (rect.top - 50) + 'px';
    menu.style.left = rect.left + 'px';

    menu.innerHTML = `
        <button onclick="highlightText(this, 'yellow')" title="Yellow">
            <i class="fas fa-highlighter" style="color: #FFD700;"></i>
        </button>
        <button onclick="highlightText(this, 'green')" title="Green">
            <i class="fas fa-highlighter" style="color: #90EE90;"></i>
        </button>
        <button onclick="highlightText(this, 'pink')" title="Pink">
            <i class="fas fa-highlighter" style="color: #FFB6C1;"></i>
        </button>
        <button onclick="highlightText(this, 'blue')" title="Blue">
            <i class="fas fa-highlighter" style="color: #87CEEB;"></i>
        </button>
    `;

    document.body.appendChild(menu);
    setTimeout(() => menu.remove(), 5000);
}

function highlightText(button, color) {
    const selection = window.getSelection();
    if (selection.toString().length > 0) {
        const span = document.createElement('span');
        span.className = `highlight highlight-${color}`;
        
        const colorMap = {
            'yellow': '#FFD700',
            'green': '#90EE90',
            'pink': '#FFB6C1',
            'blue': '#87CEEB'
        };
        
        span.style.backgroundColor = colorMap[color];
        span.style.cursor = 'pointer';
        span.onclick = function(e) {
            e.stopPropagation();
            removeHighlight(this);
        };

        const range = selection.getRangeAt(0);
        range.surroundContents(span);
        selection.removeAllRanges();

        // Remove menu
        const menu = document.querySelector('.highlight-menu');
        if (menu) menu.remove();

        // Save highlights
        saveHighlights();
    }
}

function removeHighlight(element) {
    const parent = element.parentNode;
    while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
    saveHighlights();
}

function saveHighlights() {
    const pageNum = currentPage;
    const content = document.getElementById(`pageContent${pageNum}`);
    if (content) {
        localStorage.setItem(`highlights_page_${pageNum}`, content.innerHTML);
    }
}

function loadHighlights() {
    const pageNum = currentPage;
    const saved = localStorage.getItem(`highlights_page_${pageNum}`);
    if (saved) {
        document.getElementById(`pageContent${pageNum}`).innerHTML = saved;
    }
}

// ============================================
// STICKY NOTES
// ============================================
function toggleNotesPanel() {
    const panel = document.getElementById('notesPanel');
    panel.classList.toggle('open');
}

function createNewNote() {
    const note = {
        id: Date.now(),
        page: currentPage,
        title: `Note on Page ${currentPage}`,
        content: '',
        mode: 'text',
        color: '#FFE082'
    };

    const notesList = document.getElementById('notesList');
    const noteElement = createNoteElement(note);
    notesList.appendChild(noteElement);

    // Focus on text input if exists
    const input = noteElement.querySelector('textarea');
    if (input) input.focus();

    saveNotesToStorage();
}

function createNoteElement(note) {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'sticky-note';
    noteDiv.style.backgroundColor = note.color;
    noteDiv.dataset.id = note.id;

    const colors = ['#FFE082', '#81C784', '#64B5F6', '#E57373'];
    
    noteDiv.innerHTML = `
        <div class="note-header">
            <input type="text" class="note-title" value="${note.title}" placeholder="Note title">
            <div class="note-colors">
                ${colors.map(c => `<span class="color-dot" style="background-color: ${c};" onclick="changeNoteColor(${note.id}, '${c}')"></span>`).join('')}
            </div>
            <button class="note-delete" onclick="deleteNote(${note.id})"><i class="fas fa-trash"></i></button>
        </div>
        <textarea class="note-content" placeholder="Type your notes here...">${note.content}</textarea>
        <div class="note-footer">
            <small>Page ${note.page}</small>
            <button class="note-save-btn" onclick="saveNote(${note.id})">Save</button>
        </div>
    `;

    // Add event listeners for saving
    const textarea = noteDiv.querySelector('.note-content');
    const titleInput = noteDiv.querySelector('.note-title');
    
    textarea.addEventListener('change', () => saveNote(note.id));
    titleInput.addEventListener('change', () => saveNote(note.id));

    return noteDiv;
}

function changeNoteColor(noteId, color) {
    const note = document.querySelector(`[data-id="${noteId}"]`);
    if (note) {
        note.style.backgroundColor = color;
        updateNoteInStorage(noteId, { color: color });
    }
}

function saveNote(noteId) {
    const noteElement = document.querySelector(`[data-id="${noteId}"]`);
    if (noteElement) {
        const title = noteElement.querySelector('.note-title').value;
        const content = noteElement.querySelector('.note-content').value;
        updateNoteInStorage(noteId, { title, content });
    }
}

function deleteNote(noteId) {
    const note = document.querySelector(`[data-id="${noteId}"]`);
    if (note && confirm('Delete this note?')) {
        note.remove();
        saveNotesToStorage();
    }
}

function switchNoteMode(mode) {
    noteMode = mode;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.${mode}-tool`).classList.add('active');
}

function clearCurrentNote() {
    if (confirm('Clear all notes on this page?')) {
        document.querySelectorAll('.sticky-note').forEach(note => {
            if (note.querySelector('small').textContent.includes(`Page ${currentPage}`)) {
                note.remove();
            }
        });
        saveNotesToStorage();
    }
}

function saveNotesToStorage() {
    const notes = [];
    document.querySelectorAll('.sticky-note').forEach(noteEl => {
        const pageText = noteEl.querySelector('.note-footer small')?.textContent || `Page ${currentPage}`;
        const pageNumber = parseInt(pageText.replace(/\D/g, ''), 10) || currentPage;
        notes.push({
            id: noteEl.dataset.id,
            title: noteEl.querySelector('.note-title').value,
            content: noteEl.querySelector('.note-content').value,
            page: pageNumber,
            color: noteEl.style.backgroundColor
        });
    });
    localStorage.setItem('biologyNotes', JSON.stringify(notes));
}

function loadNotesFromStorage() {
    const saved = localStorage.getItem('biologyNotes');
    if (saved) {
        const notes = JSON.parse(saved);
        const notesList = document.getElementById('notesList');
        notes.forEach(note => {
            const noteElement = createNoteElement(note);
            notesList.appendChild(noteElement);
        });
    }
}

function updateNoteInStorage(noteId, updates) {
    let notes = [];
    const saved = localStorage.getItem('biologyNotes');
    if (saved) {
        notes = JSON.parse(saved);
    }
    
    const noteIndex = notes.findIndex(n => n.id == noteId);
    if (noteIndex !== -1) {
        notes[noteIndex] = { ...notes[noteIndex], ...updates };
        localStorage.setItem('biologyNotes', JSON.stringify(notes));
    }
}

// ============================================
// TEXT TO SPEECH
// ============================================
function toggleTextToSpeech() {
    const controls = document.getElementById('ttsControls');
    controls.classList.toggle('open');
}

function speakCurrentPage() {
    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
        alert('Text-to-Speech is not supported on this device.');
        return;
    }

    stopSpeech();
    
    const pageContent = document.getElementById(`pageContent${currentPage}`);
    if (!pageContent) {
        console.warn('Page content not found');
        return;
    }

    // Extract text - use textContent for better compatibility
    const text = pageContent.textContent.trim();
    if (!text) {
        alert('No text content found on this page.');
        return;
    }

    try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Get settings
        const speed = parseFloat(document.getElementById('ttsSpeed').value) || 1;
        const pitch = parseFloat(document.getElementById('ttsPitch').value) || 1;
        
        utterance.rate = Math.max(0.5, Math.min(2, speed));
        utterance.pitch = Math.max(0.5, Math.min(2, pitch));
        utterance.volume = 1;
        utterance.lang = 'en-US';
        
        // Add event listeners for better feedback
        utterance.onstart = function() {
            console.log('Speech started');
            const speakBtn = document.querySelector('.btn-tts');
            if (speakBtn) speakBtn.style.opacity = '0.6';
        };
        
        utterance.onend = function() {
            console.log('Speech ended');
            const speakBtn = document.querySelector('.btn-tts');
            if (speakBtn) speakBtn.style.opacity = '1';
        };
        
        utterance.onerror = function(event) {
            console.error('Speech error:', event.error);
            alert('Error during text-to-speech: ' + event.error);
        };
        
        currentSpeakerUtterance = utterance;
        
        // Cancel any ongoing speech before starting new
        window.speechSynthesis.cancel();
        
        // Use a small timeout to ensure the cancel completes
        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 100);
    } catch (error) {
        console.error('TTS Error:', error);
        alert('Failed to initialize text-to-speech: ' + error.message);
    }
}

function pauseSpeech() {
    if (!('speechSynthesis' in window)) return;
    
    try {
        if (window.speechSynthesis.speaking) {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            } else {
                window.speechSynthesis.pause();
            }
        }
    } catch (error) {
        console.error('Pause error:', error);
    }
}

function stopSpeech() {
    if (!('speechSynthesis' in window)) return;
    
    try {
        window.speechSynthesis.cancel();
        currentSpeakerUtterance = null;
        const speakBtn = document.querySelector('.btn-tts');
        if (speakBtn) speakBtn.style.opacity = '1';
    } catch (error) {
        console.error('Stop error:', error);
    }
}

function initializeTextToSpeech() {
    if (!('speechSynthesis' in window)) {
        console.warn('Text-to-Speech API not supported on this device');
        disableTTSControls();
        return;
    }

    // Preload voices - on some browsers, voices load asynchronously
    const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('Available voices:', voices.length);
        
        if (voices.length === 0) {
            console.warn('No voices available yet, retrying...');
            setTimeout(loadVoices, 500);
        }
    };

    // Load voices immediately and also on voiceschanged event
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
}

function disableTTSControls() {
    const ttsBtn = document.querySelector('.text-to-speech-btn');
    if (ttsBtn) {
        ttsBtn.disabled = true;
        ttsBtn.style.opacity = '0.5';
        ttsBtn.title = 'Text-to-Speech not supported on this device';
    }
}

// ============================================
// SETTINGS
// ============================================
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('open');
}

function changeFontSize(direction) {
    if (direction === 'increase') {
        fontSize += 2;
    } else if (direction === 'decrease') {
        fontSize = Math.max(12, fontSize - 2);
    }
    
    const pages = document.querySelectorAll('.textbook-page');
    pages.forEach(page => {
        page.style.fontSize = fontSize + 'px';
    });
    
    document.getElementById('fontSizeDisplay').textContent = fontSize + 'px';
    localStorage.setItem('fontSize', fontSize);
}

function changeTheme(theme) {
    document.body.classList.remove('theme-intergalactic', 'theme-plain', 'theme-pink', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('textbookTheme', theme);
}

function changeLineSpacing(spacing) {
    lineSpacing = spacing;
    const pages = document.querySelectorAll('.textbook-page');
    pages.forEach(page => {
        page.style.lineHeight = spacing;
    });
    localStorage.setItem('lineSpacing', spacing);
}

function loadSettingsFromStorage() {
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        fontSize = parseInt(savedFontSize);
        const pages = document.querySelectorAll('.textbook-page');
        pages.forEach(page => {
            page.style.fontSize = fontSize + 'px';
        });
        document.getElementById('fontSizeDisplay').textContent = fontSize + 'px';
    }

    const savedLineSpacing = localStorage.getItem('lineSpacing');
    if (savedLineSpacing) {
        lineSpacing = parseFloat(savedLineSpacing);
        const pages = document.querySelectorAll('.textbook-page');
        pages.forEach(page => {
            page.style.lineHeight = lineSpacing;
        });
    }

    const savedTheme = localStorage.getItem('textbookTheme');
    if (savedTheme) {
        document.getElementById('themeSelect').value = savedTheme;
        changeTheme(savedTheme);
    }
}

function getUserRole() {
    if (document.body.classList.contains('teacher-mode')) {
        return 'teacher';
    }
    if (document.body.classList.contains('student-mode')) {
        return 'student';
    }
    return localStorage.getItem('userRole') || 'student';
}

function isTeacher() {
    return getUserRole() === 'teacher';
}

function updateVideoControls() {
    const addButton = document.querySelector('.btn-add-video');
    if (addButton) {
        addButton.style.display = isTeacher() ? 'flex' : 'none';
    }
}

// ============================================
// VIDEOS
// ============================================
function showVideoUploadModal() {
    if (!isTeacher()) {
        alert('Only teachers can add video notes.');
        return;
    }
    document.getElementById('videoModal').classList.add('open');
}

function closeVideoModal() {
    document.getElementById('videoModal').classList.remove('open');
    document.getElementById('videoUrl').value = '';
    document.getElementById('videoDescription').value = '';
    document.getElementById('videoFile').value = '';
}

function saveVideo() {
    if (!isTeacher()) {
        alert('Only teachers can add video notes.');
        return;
    }

    const url = document.getElementById('videoUrl').value;
    const description = document.getElementById('videoDescription').value;
    const file = document.getElementById('videoFile').files[0];

    if (!url && !file) {
        alert('Please enter a video URL or select a file');
        return;
    }

    const video = {
        id: Date.now(),
        title: description || 'Video',
        url: url,
        uploaded: !!file
    };

    videos.push(video);
    saveVideosToStorage();
    renderVideos();
    closeVideoModal();
}

function renderVideos() {
    const container = document.getElementById('videosContainer');
    container.innerHTML = '';

    if (videos.length === 0) {
        container.innerHTML = '<div class="video-placeholder"><i class="fas fa-play-circle"></i><p>No videos yet</p></div>';
        return;
    }

    videos.forEach(video => {
        const videoDiv = document.createElement('div');
        videoDiv.className = 'video-card';
        
        const isYoutube = video.url.includes('youtube.com') || video.url.includes('youtu.be');
        let embedUrl = video.url;
        
        // Convert YouTube URL to embed format
        if (isYoutube) {
            const videoId = video.url.split('v=')[1] || video.url.split('/')[3];
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }

        const canManageVideo = isTeacher();
        
        videoDiv.innerHTML = `
            <div class="video-wrapper">
                ${isYoutube ? `
                    <iframe width="100%" height="200" src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
                ` : `
                    <video width="100%" height="200" controls>
                        <source src="${video.url}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                `}
            </div>
            <div class="video-info">
                <p class="video-title">${video.title}</p>
                ${canManageVideo ? `
                    <button class="btn-delete-video" onclick="deleteVideo(${video.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        `;

        container.appendChild(videoDiv);
    });
}

function deleteVideo(videoId) {
    if (confirm('Delete this video?')) {
        videos = videos.filter(v => v.id !== videoId);
        saveVideosToStorage();
        renderVideos();
    }
}

function saveVideosToStorage() {
    localStorage.setItem('biologyVideos', JSON.stringify(videos));
}

function loadVideosFromStorage() {
    const saved = localStorage.getItem('biologyVideos');
    if (saved) {
        videos = JSON.parse(saved);
        renderVideos();
    }
}

// ============================================
// NAVIGATION
// ============================================
function goBack() {
    window.history.back();
}
