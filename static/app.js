// ==========================================================================
// Application State
// ==========================================================================
let releaseNotes = [];
let activeFilter = 'all';
let searchQuery = '';
let selectedNote = null;

// Constant for Twitter URL character count representation
const TWITTER_URL_LENGTH = 23;

// ==========================================================================
// DOM Elements
// ==========================================================================
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = refreshBtn.querySelector('.spinner');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const filterPills = document.getElementById('filter-pills');
const notesGrid = document.getElementById('notes-grid');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const emptyState = document.getElementById('empty-state');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Drawer Elements
const tweetDrawer = document.getElementById('tweet-drawer');
const drawerOverlay = document.getElementById('tweet-drawer-overlay');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const refCategory = document.getElementById('ref-category');
const refDate = document.getElementById('ref-date');
const refText = document.getElementById('ref-text');
const tweetTextarea = document.getElementById('tweet-textarea');
const currentLengthEl = document.getElementById('current-char-count');
const progressIndicator = document.getElementById('progress-indicator');
const charCounter = document.getElementById('char-counter');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const shareTweetBtn = document.getElementById('share-tweet-btn');

// Toast Element
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// ==========================================================================
// Initialize App
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes(false);
    setupEventListeners();
    initProgressRing();
});

// ==========================================================================
// API Integration
// ==========================================================================
async function fetchReleaseNotes(forceRefresh = false) {
    showState('loading');
    
    // Animate spinner during fetch
    refreshIcon.classList.remove('paused');
    refreshBtn.disabled = true;
    
    try {
        const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'success') {
            releaseNotes = data.notes;
            renderNotes();
        } else {
            showError(data.message || 'Failed to fetch release notes.');
        }
    } catch (error) {
        showError('Network error occurred. Please check your connection and try again.');
        console.error('Fetch error:', error);
    } finally {
        refreshIcon.classList.add('paused');
        refreshBtn.disabled = false;
    }
}

// ==========================================================================
// Event Listeners Setup
// ==========================================================================
function setupEventListeners() {
    // Refresh button click
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search input change
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        renderNotes();
    });
    
    // Clear search button click
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderNotes();
        searchInput.focus();
    });
    
    // Filter pills click
    filterPills.addEventListener('click', (e) => {
        const pill = e.target.closest('.pill');
        if (!pill) return;
        
        // Remove active class from all pills
        filterPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        
        activeFilter = pill.dataset.filter;
        renderNotes();
    });
    
    // Reset filters button
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        filterPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        filterPills.querySelector('[data-filter="all"]').classList.add('active');
        
        activeFilter = 'all';
        renderNotes();
    });
    
    // Retry button click
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Drawer Close actions
    closeDrawerBtn.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);
    
    // Escape key closes drawer
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDrawer();
    });
    
    // Textarea input
    tweetTextarea.addEventListener('input', updateCharCount);
    
    // Clipboard copy
    copyTweetBtn.addEventListener('click', copyTweetToClipboard);
    
    // X/Twitter Web Intent share
    shareTweetBtn.addEventListener('click', postToTwitter);
}

// ==========================================================================
// Rendering & Filtering Notes
// ==========================================================================
function renderNotes() {
    // Filter the notes array based on search and pills
    const filteredNotes = releaseNotes.filter(note => {
        const matchesCategory = activeFilter === 'all' || note.category === activeFilter;
        const matchesSearch = !searchQuery || 
                              note.title.toLowerCase().includes(searchQuery) ||
                              note.category.toLowerCase().includes(searchQuery) ||
                              note.text.toLowerCase().includes(searchQuery) ||
                              note.date.toLowerCase().includes(searchQuery);
                              
        return matchesCategory && matchesSearch;
    });
    
    // Clear grid
    notesGrid.innerHTML = '';
    
    if (filteredNotes.length === 0) {
        showState(releaseNotes.length === 0 ? 'error' : 'empty');
        return;
    }
    
    showState('grid');
    
    // Create elements
    filteredNotes.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';
        
        // Match category for badge CSS
        const catClass = `badge-${note.category.toLowerCase()}`;
        
        card.innerHTML = `
            <div>
                <div class="card-header-meta">
                    <span class="date-badge">
                        <i class="fa-regular fa-calendar"></i> ${note.date}
                    </span>
                    <span class="category-badge ${catClass}">${note.category}</span>
                </div>
                <div class="card-body">
                    ${note.html}
                </div>
            </div>
            <div class="card-actions">
                <button class="btn-card-tweet" data-id="${note.id}">
                    <i class="fa-brands fa-x-twitter"></i> Tweet This
                </button>
            </div>
        `;
        
        // Attach listener for the specific tweet button
        card.querySelector('.btn-card-tweet').addEventListener('click', () => {
            openTweetDrawer(note);
        });
        
        notesGrid.appendChild(card);
    });
}

// State toggling utilities
function showState(state) {
    loadingState.style.display = state === 'loading' ? 'flex' : 'none';
    errorState.style.display = state === 'error' ? 'flex' : 'none';
    emptyState.style.display = state === 'empty' ? 'flex' : 'none';
    notesGrid.style.display = state === 'grid' ? 'grid' : 'none';
}

function showError(msg) {
    errorMessage.textContent = msg;
    showState('error');
}

// ==========================================================================
// Tweet Drawer Logic
// ==========================================================================
function openTweetDrawer(note) {
    selectedNote = note;
    
    // Set metadata reference in the drawer
    refCategory.textContent = note.category;
    // Clear previous category badge styling classes and apply active class
    refCategory.className = 'category-badge ' + `badge-${note.category.toLowerCase()}`;
    refDate.textContent = note.date;
    refText.textContent = note.text;
    
    // Prepare the initial tweet text draft
    // Limit and format the tweet smartly
    const hashtags = '#BigQuery #GoogleCloud';
    const link = note.link;
    const datePrefix = `BigQuery Update (${note.date}) [${note.category}]: `;
    
    // Length calculations for default drafting
    // Twitter URLs count as 23 characters
    const templateFixedLen = datePrefix.length + 2 + hashtags.length + 2 + TWITTER_URL_LENGTH; // 2 spacing newlines/spaces
    const maxTextLen = 280 - templateFixedLen - 5; // minus some safety margin and '...'
    
    let textDraft = note.text;
    if (textDraft.length > maxTextLen) {
        textDraft = textDraft.substring(0, maxTextLen) + '...';
    }
    
    const initialTweet = `${datePrefix}${textDraft}\n\n${hashtags}\n${link}`;
    
    tweetTextarea.value = initialTweet;
    updateCharCount();
    
    // Open drawer classes
    tweetDrawer.classList.add('active');
    drawerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Lock background scrolling
}

function closeDrawer() {
    tweetDrawer.classList.remove('active');
    drawerOverlay.classList.remove('active');
    document.body.style.overflow = ''; // Restore background scrolling
    selectedNote = null;
}

// ==========================================================================
// Tweet Character Counting (URL aware)
// ==========================================================================
function updateCharCount() {
    const text = tweetTextarea.value;
    
    // Calculate character length according to Twitter URL parsing standards
    // Match URLs using regex
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    // Text length without URLs
    const textWithoutUrls = text.replace(urlRegex, '');
    
    // Total count: normal character count + 23 chars for each URL
    const totalCount = textWithoutUrls.length + (urls.length * TWITTER_URL_LENGTH);
    
    // Update counter text
    currentLengthEl.textContent = totalCount;
    
    // Update character limit alerts/styles
    charCounter.className = 'char-counter';
    if (totalCount > 260 && totalCount <= 280) {
        charCounter.classList.add('warning');
    } else if (totalCount > 280) {
        charCounter.classList.add('danger');
    }
    
    // Update SVG progress ring
    setProgressRing(totalCount);
    
    // Enable/disable Post button
    shareTweetBtn.disabled = totalCount === 0 || totalCount > 280;
    if (totalCount > 280) {
        shareTweetBtn.style.opacity = 0.5;
        shareTweetBtn.style.cursor = 'not-allowed';
    } else {
        shareTweetBtn.style.opacity = 1;
        shareTweetBtn.style.cursor = 'pointer';
    }
}

// ==========================================================================
// SVG Circular Progress Ring
// ==========================================================================
let ringCircumference = 0;

function initProgressRing() {
    const radius = progressIndicator.r.baseVal.value;
    ringCircumference = radius * 2 * Math.PI;
    
    progressIndicator.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
    progressIndicator.style.strokeDashoffset = ringCircumference;
}

function setProgressRing(charCount) {
    const limit = 280;
    const ratio = Math.min(charCount / limit, 1);
    const offset = ringCircumference - (ratio * ringCircumference);
    
    progressIndicator.style.strokeDashoffset = offset;
    
    // Change progress color based on usage
    if (charCount > limit) {
        progressIndicator.style.stroke = '#ff5252'; // Red
    } else if (charCount > 260) {
        progressIndicator.style.stroke = '#ff9f43'; // Orange
    } else {
        progressIndicator.style.stroke = '#00f2fe'; // Blue accent
    }
}

// ==========================================================================
// Clipboard Copy & Sharing
// ==========================================================================
function copyTweetToClipboard() {
    const text = tweetTextarea.value;
    if (!text) return;
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Tweet copied to clipboard!');
    }).catch(err => {
        console.error('Could not copy text: ', err);
        showToast('Failed to copy. Please copy manually.');
    });
}

function postToTwitter() {
    const text = tweetTextarea.value;
    if (!text) return;
    
    // Build Twitter Intent URL
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
}

// Toast animation
function showToast(msg) {
    toastMessage.textContent = msg;
    toast.classList.add('active');
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 2500);
}
