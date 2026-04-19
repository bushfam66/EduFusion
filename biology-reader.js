// ============================================
// BIOLOGY READER - TEXTBOOK FUNCTIONALITY
// ============================================

// State Management
let currentPage = 1;
let totalPages = 3;
let touchStartX = 0;
let touchEndX = 0;
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
function initializeReader() {
    console.log('Initializing Biology Reader...');
    showPage(1);
    updatePageIndicators();
    setupTouchGestures();
    setupHighlighting();
    updateVideoControls();
}

function setupEventListeners() {
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') previousPage();
        if (e.key === 'ArrowRight') nextPage();
    });

    // Touch gestures for mobile
    document.querySelector('.textbook-pages-container').addEventListener('touchstart', handleTouchStart, false);
    document.querySelector('.textbook-pages-container').addEventListener('touchend', handleTouchEnd, false);
}

// ============================================
// PAGE NAVIGATION
// ============================================
function showPage(pageNum) {
    const pages = document.querySelectorAll('.textbook-page');
    pages.forEach(page => {
        page.classList.remove('active', 'slide-in-right', 'slide-in-left', 'slide-out-left', 'slide-out-right');
    });

    const targetPage = document.querySelector(`[data-page="${pageNum}"]`);
    if (targetPage) {
        targetPage.classList.add('active', 'slide-in-right');
        currentPage = pageNum;
        updatePageIndicators();
        loadHighlights();
        window.scrollTo(0, 0);
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
    container.addEventListener('touchstart', handleTouchStart, false);
    container.addEventListener('touchend', handleTouchEnd, false);
}

function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swiped left - go to next page
            nextPage();
        } else {
            // Swiped right - go to previous page
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
        notes.push({
            id: noteEl.dataset.id,
            title: noteEl.querySelector('.note-title').value,
            content: noteEl.querySelector('.note-content').value,
            page: currentPage,
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
    stopSpeech();
    
    const pageContent = document.getElementById(`pageContent${currentPage}`);
    if (!pageContent) return;

    const text = pageContent.innerText;
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get settings
    const speed = parseFloat(document.getElementById('ttsSpeed').value);
    const pitch = parseFloat(document.getElementById('ttsPitch').value);
    
    utterance.rate = speed;
    utterance.pitch = pitch;
    utterance.volume = 1;
    
    currentSpeakerUtterance = utterance;
    window.speechSynthesis.speak(utterance);
}

function pauseSpeech() {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
    } else if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }
}

function stopSpeech() {
    window.speechSynthesis.cancel();
    currentSpeakerUtterance = null;
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
