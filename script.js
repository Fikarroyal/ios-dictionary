document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultsArea = document.getElementById('resultsArea');
    const searchHistoryList = document.getElementById('searchHistoryList');
    const darkModeToggle = document.getElementById('darkModeToggle');

    // --- Application State ---
    let searchHistory = JSON.parse(localStorage.getItem('dictionarySearchHistory')) || [];
    const MAX_HISTORY_ITEMS = 10; // Limit the number of history items

    // --- Utility Functions ---

    // Function to fetch data from the dictionary API
    async function fetchWordData(word) {
        resultsArea.innerHTML = '<p class="welcome-message">Searching...</p>'; // Loading message
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            if (!response.ok) {
                // Check if the word is not found (404 status) or other errors
                if (response.status === 404) {
                    throw new Error(`Sorry, we couldn't find a definition for "${word}". Please check your spelling.`);
                }
                throw new Error('Something went wrong. Please try again later.');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching word data:', error);
            resultsArea.innerHTML = `<p class="error-message">${error.message}</p>`;
            return null;
        }
    }

    // Function to display results in the UI
    function displayResults(data) {
        if (!data || data.length === 0) {
            resultsArea.innerHTML = '<p class="error-message">No results found for that word.</p>';
            return;
        }

        resultsArea.innerHTML = ''; // Clear results area

        data.forEach(wordEntry => {
            const wordCard = document.createElement('div');
            wordCard.classList.add('word-card');

            // Word Title & Phonetics
            const wordTitle = document.createElement('h2');
            wordTitle.classList.add('word-title');
            wordTitle.innerHTML = `${wordEntry.word}`;
            
            // Add phonetics if available
            const phoneticsText = wordEntry.phonetics.find(p => p.text)?.text;
            if (phoneticsText) {
                const phoneticsSpan = document.createElement('span');
                phoneticsSpan.classList.add('phonetics');
                phoneticsSpan.textContent = phoneticsText;
                wordTitle.appendChild(phoneticsSpan);
            }
            wordCard.appendChild(wordTitle);

            // Audio Playback
            const audioSrc = wordEntry.phonetics.find(p => p.audio && p.audio.length > 0)?.audio;
            if (audioSrc) {
                const audioDiv = document.createElement('div');
                audioDiv.classList.add('audio-playback');
                audioDiv.innerHTML = `<audio controls><source src="${audioSrc}" type="audio/mpeg">Your browser does not support the audio element.</audio>`;
                wordCard.appendChild(audioDiv);
            }

            // Meanings
            wordEntry.meanings.forEach(meaning => {
                const meaningSection = document.createElement('div');
                meaningSection.classList.add('meaning-section');

                const partOfSpeech = document.createElement('h3');
                partOfSpeech.classList.add('part-of-speech');
                partOfSpeech.textContent = meaning.partOfSpeech;
                meaningSection.appendChild(partOfSpeech);

                const definitionsList = document.createElement('ol');
                definitionsList.classList.add('definitions');
                meaning.definitions.forEach(def => {
                    const listItem = document.createElement('li');
                    listItem.classList.add('definition-item');
                    listItem.innerHTML = `<span class="definition-text">${def.definition}</span>`;
                    if (def.example) {
                        listItem.innerHTML += `<p class="example-usage">"${def.example}"</p>`;
                    }
                    definitionsList.appendChild(listItem);
                });
                meaningSection.appendChild(definitionsList);

                // Synonyms
                if (meaning.synonyms && meaning.synonyms.length > 0) {
                    const synonymSection = document.createElement('div');
                    synonymSection.classList.add('synonym-section');
                    synonymSection.innerHTML = `<span class="label">Synonyms:</span> <span class="synonyms">${meaning.synonyms.join(', ')}</span>`;
                    meaningSection.appendChild(synonymSection);
                }

                // Antonyms
                if (meaning.antonyms && meaning.antonyms.length > 0) {
                    const antonymSection = document.createElement('div');
                    antonymSection.classList.add('antonym-section');
                    antonymSection.innerHTML = `<span class="label">Antonyms:</span> <span class="antonyms">${meaning.antonyms.join(', ')}</span>`;
                    meaningSection.appendChild(antonymSection);
                }

                wordCard.appendChild(meaningSection);
            });

            resultsArea.appendChild(wordCard);
        });
    }

    // Function to add search to history
    function addSearchToHistory(word) {
        const lowerCaseWord = word.toLowerCase();
        // Check if the word is already the first item (most recent)
        if (searchHistory.length > 0 && searchHistory[0] === lowerCaseWord) {
            return; // Don't add if it's already the latest search
        }
        
        // Remove if it exists elsewhere in history to move it to the front
        searchHistory = searchHistory.filter(item => item !== lowerCaseWord);
        
        searchHistory.unshift(lowerCaseWord); // Add to the beginning
        if (searchHistory.length > MAX_HISTORY_ITEMS) {
            searchHistory.pop(); // Remove the oldest if limit exceeded
        }
        localStorage.setItem('dictionarySearchHistory', JSON.stringify(searchHistory));
        displaySearchHistory();
    }

    // Function to display search history
    function displaySearchHistory() {
        searchHistoryList.innerHTML = '';
        if (searchHistory.length === 0) {
            searchHistoryList.innerHTML = '<li>No recent searches.</li>';
            return;
        }
        searchHistory.forEach(word => {
            const listItem = document.createElement('li');
            
            const link = document.createElement('a');
            link.href = "#"; 
            link.dataset.word = word;
            link.textContent = word;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                searchInput.value = word; // Populate search input
                performSearch(word);
            });
            listItem.appendChild(link);

            // Add delete button for history item
            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('history-delete-btn');
            deleteBtn.innerHTML = '<i class="fas fa-times"></i>'; // 'x' icon
            deleteBtn.title = `Remove "${word}" from history`;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent link click
                deleteSearchFromHistory(word);
            });
            listItem.appendChild(deleteBtn);

            searchHistoryList.appendChild(listItem);
        });
    }

    // Function to delete a search term from history
    function deleteSearchFromHistory(wordToRemove) {
        searchHistory = searchHistory.filter(item => item !== wordToRemove);
        localStorage.setItem('dictionarySearchHistory', JSON.stringify(searchHistory));
        displaySearchHistory(); // Refresh history list
    }

    // Function to perform search
    async function performSearch(word) {
        if (!word.trim()) {
            resultsArea.innerHTML = '<p class="error-message">Please enter a word to search.</p>';
            return;
        }
        const data = await fetchWordData(word.trim().toLowerCase());
        if (data) {
            displayResults(data);
            addSearchToHistory(word.trim());
        }
    }

    // --- Event Listeners ---

    // Search when button is clicked
    searchBtn.addEventListener('click', () => {
        performSearch(searchInput.value);
    });

    // Search when Enter is pressed in input
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch(searchInput.value);
        }
    });

    // --- Dark Mode Implementation ---

    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
        updateDarkModeIcon();
    }

    function updateDarkModeIcon() {
        const icon = darkModeToggle.querySelector('i');
        if (document.body.classList.contains('dark-mode')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    darkModeToggle.addEventListener('click', toggleDarkMode);

    // Initialize mode preference on page load
    // This is robust. If it's not working, try clearing your browser's local storage.
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    } else if (savedTheme === 'light') {
        document.body.classList.remove('dark-mode');
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        // If no preference is saved, follow OS preference
        document.body.classList.add('dark-mode');
    }
    updateDarkModeIcon(); // Ensure the icon reflects the initial mode

    // --- Application Initialization ---
    displaySearchHistory();
    resultsArea.innerHTML = '<p class="welcome-message">Start by searching for a word to see its definition and more!</p>';
});