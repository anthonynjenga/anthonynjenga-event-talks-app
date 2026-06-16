// ==========================================================================
// Application State
// ==========================================================================
let releaseNotes = [];
let activeFilter = 'all';
let searchQuery = '';
let selectedNote = null;
let activeView = localStorage.getItem('viewMode') || 'grid';

// Constant for Twitter URL character count representation
const TWITTER_URL_LENGTH = 23;

// ==========================================================================
// DOM Elements
// ==========================================================================
const refreshBtn = document.getElementById('refresh-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
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

// View Toggle & Stats DOM Elements
const viewGridBtn = document.getElementById('view-grid-btn');
const viewListBtn = document.getElementById('view-list-btn');
const statsBar = document.getElementById('stats-bar');
const statusIndicatorDot = document.getElementById('status-indicator-dot');
const syncStatusText = document.getElementById('sync-status');
const visibleCountEl = document.getElementById('visible-count');
const totalCountEl = document.getElementById('total-count');
const categoryStatsContainer = document.getElementById('category-stats');

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
const styleOptions = document.getElementById('style-options');
const autoShortenBtn = document.getElementById('auto-shorten-btn');

// Toast Element
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// ==========================================================================
// Initialize App
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initViewMode();
    fetchReleaseNotes(false);
    setupEventListeners();
    initProgressRing();
});

// ==========================================================================
// API Integration
// ==========================================================================
async function fetchReleaseNotes(forceRefresh = false) {
    showState('loading');
    if (statsBar) statsBar.style.display = 'none';
    
    // Animate spinner during fetch
    refreshIcon.classList.remove('paused');
    refreshBtn.disabled = true;
    
    try {
        const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'success') {
            releaseNotes = data.notes;
            
            // Update sync / query status
            if (syncStatusText) {
                syncStatusText.textContent = `Last Synced: ${data.last_updated || 'Just now'}`;
            }
            if (statsBar) {
                statsBar.style.display = 'flex';
            }
            
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
    // Theme toggle click
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Refresh button click
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Export to CSV click
    exportCsvBtn.addEventListener('click', exportToCSV);
    
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

    // Style pills click
    styleOptions.addEventListener('click', (e) => {
        const pill = e.target.closest('.style-pill');
        if (!pill) return;
        
        styleOptions.querySelectorAll('.style-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        
        activeTweetStyle = pill.dataset.style;
        applyTweetTemplate();
    });
    
    // Auto-shorten click
    autoShortenBtn.addEventListener('click', autoShortenTweet);

    // View toggle clicks
    viewGridBtn.addEventListener('click', () => setViewMode('grid'));
    viewListBtn.addEventListener('click', () => setViewMode('list'));
}

// ==========================================================================
// Rendering & Filtering Notes
// ==========================================================================
function renderNotes() {
    // Filter the notes array based on search and pills
    const filteredNotes = releaseNotes.filter(note => {
        const matchesCategory = activeFilter === 'all' || note.category === activeFilter;
        const matchesSearch = !searchQuery || 
                              note.category.toLowerCase().includes(searchQuery) ||
                              note.text.toLowerCase().includes(searchQuery) ||
                              note.date.toLowerCase().includes(searchQuery);
                              
        return matchesCategory && matchesSearch;
    });
    
    // Update Counts & Stats
    if (visibleCountEl && totalCountEl) {
        visibleCountEl.textContent = filteredNotes.length;
        totalCountEl.textContent = releaseNotes.length;
    }
    
    // Update Category Stats Breakdown
    if (categoryStatsContainer) {
        categoryStatsContainer.innerHTML = '';
        const counts = {};
        filteredNotes.forEach(note => {
            counts[note.category] = (counts[note.category] || 0) + 1;
        });
        
        Object.keys(counts).sort().forEach(cat => {
            const count = counts[cat];
            const badge = document.createElement('span');
            badge.className = `stat-pill badge-${cat.toLowerCase()}`;
            badge.innerHTML = `${cat}: <span>${count}</span>`;
            categoryStatsContainer.appendChild(badge);
        });
    }
    
    // Clear container
    notesGrid.innerHTML = '';
    
    if (filteredNotes.length === 0) {
        showState(releaseNotes.length === 0 ? 'error' : 'empty');
        return;
    }
    
    if (activeView === 'grid') {
        notesGrid.className = 'notes-grid';
        showState('grid');
        
        filteredNotes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'note-card';
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
                    <button class="btn-card-copy" title="Copy Plain Text">
                        <i class="fa-regular fa-copy"></i> Copy
                    </button>
                    <button class="btn-card-tweet" data-id="${note.id}">
                        <i class="fa-brands fa-x-twitter"></i> Tweet
                    </button>
                </div>
            `;
            
            card.querySelector('.btn-card-tweet').addEventListener('click', () => {
                openTweetDrawer(note);
            });
            
            card.querySelector('.btn-card-copy').addEventListener('click', () => {
                copyNoteToClipboard(note);
            });
            
            notesGrid.appendChild(card);
        });
    } else {
        notesGrid.className = 'notes-list';
        showState('list');
        
        filteredNotes.forEach(note => {
            const row = document.createElement('div');
            row.className = 'note-row';
            row.setAttribute('data-id', note.id);
            const catClass = `badge-${note.category.toLowerCase()}`;
            
            // Extract a clean short snippet for the title
            const maxSnippetLen = 75;
            let titleSnippet = note.text;
            if (titleSnippet.length > maxSnippetLen) {
                titleSnippet = titleSnippet.substring(0, maxSnippetLen).trim() + '...';
            }
            
            row.innerHTML = `
                <div class="row-header">
                    <div class="row-left">
                        <span class="row-date">${note.date}</span>
                        <span class="row-category category-badge ${catClass}">${note.category}</span>
                        <span class="row-title">${titleSnippet}</span>
                    </div>
                    <div class="row-right">
                        <span class="row-expand-icon"><i class="fa-solid fa-chevron-down"></i></span>
                    </div>
                </div>
                <div class="row-details">
                    <div class="row-content">
                        ${note.html}
                    </div>
                    <div class="row-actions">
                        <button class="btn-card-copy" title="Copy Plain Text">
                            <i class="fa-regular fa-copy"></i> Copy
                        </button>
                        <button class="btn-card-tweet" data-id="${note.id}">
                            <i class="fa-brands fa-x-twitter"></i> Tweet
                        </button>
                    </div>
                </div>
            `;
            
            // Expand/collapse click listener
            row.addEventListener('click', (e) => {
                if (e.target.closest('.btn-card-copy') || e.target.closest('.btn-card-tweet') || e.target.closest('a')) {
                    return; // Don't toggle on button or link clicks
                }
                row.classList.toggle('expanded');
            });
            
            row.querySelector('.btn-card-tweet').addEventListener('click', () => {
                openTweetDrawer(note);
            });
            
            row.querySelector('.btn-card-copy').addEventListener('click', () => {
                copyNoteToClipboard(note);
            });
            
            notesGrid.appendChild(row);
        });
    }
}

// State toggling utilities
function showState(state) {
    loadingState.style.display = state === 'loading' ? 'flex' : 'none';
    errorState.style.display = state === 'error' ? 'flex' : 'none';
    emptyState.style.display = state === 'empty' ? 'flex' : 'none';
    notesGrid.style.display = (state === 'active' || state === 'grid' || state === 'list') ? '' : 'none';
}

function showError(msg) {
    errorMessage.textContent = msg;
    showState('error');
}

// ==========================================================================
// Tweet Drawer Logic
// ==========================================================================
let activeTweetStyle = 'professional';

function openTweetDrawer(note) {
    selectedNote = note;
    
    // Set metadata reference in the drawer
    refCategory.textContent = note.category;
    // Clear previous category badge styling classes and apply active class
    refCategory.className = 'category-badge ' + `badge-${note.category.toLowerCase()}`;
    refDate.textContent = note.date;
    refText.textContent = note.text;
    
    // Reset active style to professional style
    activeTweetStyle = 'professional';
    styleOptions.querySelectorAll('.style-pill').forEach(p => p.classList.remove('active'));
    styleOptions.querySelector('[data-style="professional"]').classList.add('active');
    
    // Apply template (automatically truncate on initial load if needed)
    applyTweetTemplate(true);
    
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
        autoShortenBtn.style.display = 'inline-flex';
    } else {
        shareTweetBtn.style.opacity = 1;
        shareTweetBtn.style.cursor = 'pointer';
        autoShortenBtn.style.display = 'none';
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

// Copy single release note plaintext to clipboard
function copyNoteToClipboard(note) {
    if (!note || !note.text) return;
    
    const formattedText = `[${note.date}] [${note.category}]\n${note.text}\nSource: ${note.link}`;
    
    navigator.clipboard.writeText(formattedText).then(() => {
        showToast('Release note copied!');
    }).catch(err => {
        console.error('Could not copy note: ', err);
        showToast('Failed to copy. Please copy manually.');
    });
}

// Export currently active/filtered release notes to CSV
function exportToCSV() {
    if (releaseNotes.length === 0) {
        showToast('No release notes available to export.');
        return;
    }
    
    const filteredNotes = releaseNotes.filter(note => {
        const matchesCategory = activeFilter === 'all' || note.category === activeFilter;
        const matchesSearch = !searchQuery || 
                              note.title.toLowerCase().includes(searchQuery) ||
                              note.category.toLowerCase().includes(searchQuery) ||
                              note.text.toLowerCase().includes(searchQuery) ||
                              note.date.toLowerCase().includes(searchQuery);
                              
        return matchesCategory && matchesSearch;
    });
    
    if (filteredNotes.length === 0) {
        showToast('No filtered release notes to export.');
        return;
    }
    
    const headers = ['Date', 'Category', 'Update Content', 'Link'];
    
    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        let str = String(val);
        str = str.replace(/"/g, '""');
        if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
            str = `"${str}"`;
        }
        return str;
    };
    
    const rows = filteredNotes.map(note => [
        escapeCSV(note.date),
        escapeCSV(note.category),
        escapeCSV(note.text),
        escapeCSV(note.link)
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    let filterSuffix = activeFilter !== 'all' ? `-${activeFilter.toLowerCase()}` : '';
    let searchSuffix = searchQuery ? `-${searchQuery.replace(/[^a-z0-9]/gi, '_').toLowerCase()}` : '';
    const dateStr = new Date().toISOString().slice(0, 10);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `bigquery-release-notes-${dateStr}${filterSuffix}${searchSuffix}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Exported ${filteredNotes.length} notes to CSV!`);
}

// Initialize Theme (handles dark-theme as default, loads local storage preference)
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
    }
}

// Toggle Theme (swaps between dark-theme and light-theme)
function toggleTheme() {
    if (document.body.classList.contains('light-theme')) {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        showToast('Switched to Dark Mode');
    } else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
        showToast('Switched to Light Mode');
    }
}

// Initialize View Mode (grid or list)
function initViewMode() {
    if (activeView === 'list') {
        viewGridBtn.classList.remove('active');
        viewListBtn.classList.add('active');
    } else {
        viewGridBtn.classList.add('active');
        viewListBtn.classList.remove('active');
    }
}

// Set View Mode and re-render
function setViewMode(view) {
    if (activeView === view) return;
    activeView = view;
    localStorage.setItem('viewMode', view);
    initViewMode();
    renderNotes();
}

// Build the tweet text draft using a specific note, style, and maxTextLength constraint
function buildTweetText(note, style, maxTextLength = null) {
    if (!note) return '';
    const hashtags = '#BigQuery #GoogleCloud';
    const link = note.link;
    const date = note.date;
    const category = note.category;
    let description = note.text;
    
    if (maxTextLength !== null && description.length > maxTextLength) {
        description = description.substring(0, maxTextLength) + '...';
    }
    
    if (style === 'hype') {
        return `🚨 BigQuery Alert! 🚨 [${category}] (${date})\n\n${description}\n\n${hashtags}\n${link}`;
    } else if (style === 'minimal') {
        return `New in #BigQuery (${category}): ${description} ${link}`;
    } else { // default to 'professional'
        return `BigQuery Update (${date}) [${category}]: ${description}\n\n${hashtags}\n${link}`;
    }
}

// Get the base length of the tweet with empty text (resolves URL size correctly)
function getTweetBaseLength(note, style) {
    const dummyNote = { ...note, text: '' };
    const dummyTweet = buildTweetText(dummyNote, style);
    
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = dummyTweet.match(urlRegex) || [];
    const textWithoutUrls = dummyTweet.replace(urlRegex, '');
    
    return textWithoutUrls.length + (urls.length * TWITTER_URL_LENGTH);
}

// Apply the selected tweet template style to the textarea
function applyTweetTemplate(autoTruncateInitial = false) {
    if (!selectedNote) return;
    
    // Check if we need to auto-truncate on load to prevent initial overflows
    if (autoTruncateInitial) {
        const baseLen = getTweetBaseLength(selectedNote, activeTweetStyle);
        const remainingChars = 280 - baseLen;
        
        if (selectedNote.text.length > remainingChars) {
            const maxTextLen = Math.max(0, remainingChars - 3);
            tweetTextarea.value = buildTweetText(selectedNote, activeTweetStyle, maxTextLen);
            updateCharCount();
            return;
        }
    }
    
    // Normal template application without automatic truncating
    tweetTextarea.value = buildTweetText(selectedNote, activeTweetStyle);
    updateCharCount();
}

// Auto-shortens the text currently inside the editor to fit the limit
function autoShortenTweet() {
    if (!selectedNote) return;
    
    const baseLen = getTweetBaseLength(selectedNote, activeTweetStyle);
    const remainingChars = 280 - baseLen;
    const maxTextLen = Math.max(0, remainingChars - 3);
    
    tweetTextarea.value = buildTweetText(selectedNote, activeTweetStyle, maxTextLen);
    updateCharCount();
    showToast('Tweet text auto-fitted!');
}
