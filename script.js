let html5QrCode = null;
let allContactsData = [];

window.onload = function() {
    // Set this to 'true' to use the hardcoded debug data below.
    // Set to 'false' to fetch from the Google Spreadsheet URL.
    const DEBUG_MODE = false;

    // Local Storage Keys
    const SPREADSHEET_ID_STORAGE_KEY = 'contactHub_spreadsheetId';
    const SHEET_GID_STORAGE_KEY = 'contactHub_sheetGid';
    const FORM_ID_STORAGE_KEY = 'contactHub_formId'; // New local storage key for form ID

    // Functions to get/set from Local Storage
    function getStoredSpreadsheetId() {
        return localStorage.getItem(SPREADSHEET_ID_STORAGE_KEY);
    }

    function setStoredSpreadsheetId(id) {
        localStorage.setItem(SPREADSHEET_ID_STORAGE_KEY, id);
    }

    function getStoredSheetGid() {
        return localStorage.getItem(SHEET_GID_STORAGE_KEY);
    }

    function setStoredSheetGid(gid) {
        localStorage.setItem(SHEET_GID_STORAGE_KEY, gid);
    }

    function getStoredFormId() { // New function to get stored form ID
        return localStorage.getItem(FORM_ID_STORAGE_KEY);
    }

    function setStoredFormId(id) { // New function to set stored form ID
        localStorage.setItem(FORM_ID_STORAGE_KEY, id);
    }

    // Get 'sid' (spreadsheet ID), 'gid' (sheet GID), and 'fid' (form ID) from the URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const sidFromUrl = urlParams.get('sid');
    const gidFromUrl = urlParams.get('gid');
    const fidFromUrl = urlParams.get('fid'); // Get fid from URL

    let googleSpreadsheetTSVUrl;
    let currentSid;
    let currentGid;
    let currentFormUrl; // This will be constructed from currentFormId
    let currentFormId; // Declare currentFormId

    // Logic for Spreadsheet ID (sid) and GID
    if (sidFromUrl) {
        currentSid = sidFromUrl;
        setStoredSpreadsheetId(sidFromUrl);
        if (gidFromUrl) {
            currentGid = gidFromUrl;
            setStoredSheetGid(gidFromUrl);
        } else {
            currentGid = getStoredSheetGid() || '0'; // Use stored gid or default to '0'
        }
    } else {
        currentSid = getStoredSpreadsheetId();
        currentGid = getStoredSheetGid() || '0'; // Use stored gid or default to '0'
    }

    if (currentSid) {
        googleSpreadsheetTSVUrl = `https://docs.google.com/spreadsheets/d/e/${currentSid}/pub?output=tsv&gid=${currentGid}`;
    }

    // Logic for Form ID (fid) and constructing Form URL
    if (fidFromUrl) {
        currentFormId = fidFromUrl;
        setStoredFormId(fidFromUrl);
    } else {
        currentFormId = getStoredFormId();
    }

    if (currentFormId) {
        currentFormUrl = `https://docs.google.com/forms/d/e/${currentFormId}/viewform`;
    }


    const headerMapping = {
        'Timestamp': 'timestamp',
        'ID': 'id',
        'Display Name': 'display name',
        'Subtitle': 'subtitle',
        'Contact Number': 'contact number',
        'Email Address': 'email',
        'LinkedIn ID': 'linkedin_id',
        'Instagram ID': 'instagram_id'
    };

    // Debug data in JSON format (mimics the structure we want after parsing)
    const debugJsonData = [
            { id: '1', 'display name': 'Alice Wonderland (Old)', subtitle: 'Curious Explorer', 'contact number': '111-222-3333', email: 'alice@example.com', linkedin_id: 'alice_w', instagram_id: 'alice_insta', timestamp: '2024-01-15T10:00:00Z' },
            { id: '2', 'display name': 'Bob The Builder', subtitle: 'Can We Fix It?', 'contact number': '', email: 'bob@example.com', linkedin_id: '', instagram_id: 'bob_builds', timestamp: '2024-02-20T11:30:00Z' },
            { id: '1', 'display name': 'Alice Wonderland (New)', subtitle: 'Updated Explorer', 'contact number': '111-222-3334', email: 'alice.new@example.com', linkedin_id: 'alice_w_new', instagram_id: 'alice_insta_new', timestamp: '2024-03-01T14:45:00Z' }, // Newer entry for ID 1
            { id: '3', 'display name': 'Charlie Chaplin', subtitle: 'The Little Tramp', 'contact number': '444-555-6666', email: '', linkedin_id: '', instagram_id: '', timestamp: '2024-01-10T09:00:00Z' },
            { id: '4', 'display name': 'Diana Prince', subtitle: 'Amazonian Warrior', 'contact number': '555-123-4567', email: 'diana@example.com', linkedin_id: 'diana_p', instagram_id: 'wonder_woman', timestamp: '2024-04-05T16:00:00Z' },
            { id: '5', 'display name': 'Ethan Hunt', subtitle: 'Impossible Missions', 'contact number': '888-999-0000', email: 'ethan@example.com', linkedin_id: 'ethan_h', instagram_id: 'imf_agent', timestamp: '2024-03-15T08:00:00Z' },
            { id: '6', 'display name': 'Fiona Shrek', subtitle: 'Ogre Princess', 'contact number': '777-666-5555', email: 'fiona@example.com', linkedin_id: 'fiona_s', instagram_id: 'ogre_princess', timestamp: '2024-02-01T13:00:00Z' },
            { id: '7', 'display name': 'Groot', subtitle: 'I Am Groot', 'contact number': '101-202-3030', email: 'groot@example.com', linkedin_id: '', instagram_id: 'we_are_groot', timestamp: '2024-01-25T17:00:00Z' }
        ];

    // --- Tab Elements ---
    const tabContactCardBtn = document.getElementById('tab-contact-card');
    const tabFavoritesBtn = document.getElementById('tab-favorites');
    const contactCardTabContent = document.getElementById('contact-card-tab-content');
    const favoritesTabContent = document.getElementById('favorites-tab-content');

    // NEW: All Contacts Tab Elements
    const tabAllContactsBtn = document.getElementById('tab-all-contacts');
    const allContactsTabContent = document.getElementById('all-contacts-tab-content');
    const allContactsList = document.getElementById('all-contacts-list');
    const noAllContactsMessage = document.getElementById('no-all-contacts-message');
    // NEW: All Contacts Search Element
    const allContactsSearchInput = document.getElementById('all-contacts-search');


    // --- Contact Card Elements ---
    const contactCard = document.getElementById('contact-card');
    const cardInner = document.getElementById('card-inner');
    const cardFront = document.getElementById('card-front');
    const cardBack = document.getElementById('card-back');
    const notFoundDiv = document.getElementById('not-found');
    const errorMessageDiv = document.getElementById('error-message');

    const displayNameFrontElem = document.getElementById('display-name-front');
    const subtitleFrontElem = document.getElementById('subtitle-front');

    const displayNameBackElem = document.getElementById('display-name-back');
    const contactNumberRow = document.getElementById('contact-number-row');
    const contactNumberElem = document.getElementById('contact-number');
    const emailRow = document.getElementById('email-row');
    const emailElem = document.getElementById('email');
    const linkedinRow = document.getElementById('linkedin-row');
    const linkedinLink = document.getElementById('linkedin-link');
    const instagramRow = document = document.getElementById('instagram-row');
    const instagramLink = document.getElementById('instagram-link');
    const saveContactBtn = document.getElementById('save-contact-btn');
    const favoriteBtn = document.getElementById('favorite-btn');
    const favoriteIcon = document.getElementById('favorite-icon');
    const favoriteText = document.getElementById('favorite-text');

    let currentContactData = null; // Store the fetched contact data for the contact card view
    // let allContactsData = []; // Store all contacts data once fetched

    // --- Favorites List Elements ---
    const favoritedContactsList = document.getElementById('favorited-contacts-list');
    const noFavoritesMessage = document.getElementById('no-favorites-message');

    // --- QR Scan Elements ---
    const scanQrBtn = document.getElementById('scan-qr-btn');
    // Changed ID from 'my-qr-reader' to 'reader'
    const qrReaderDiv = document.getElementById('reader');
    const qrScanStatus = document.getElementById('qr-scan-status');

    // --- New Redirect Message Elements ---
    const redirectMessageDiv = document.getElementById('redirect-message');
    const countdownTimerElem = document.getElementById('countdown-timer');
    const editFormLinkElem = document.getElementById('edit-form-link');


    // --- Local Storage Functions for Favorites ---
    const FAVORITES_STORAGE_KEY = 'favoritedContactIds';

    function getFavoritedContactIds() {
        try {
            const storedIds = localStorage.getItem(FAVORITES_STORAGE_KEY);
            return storedIds ? JSON.parse(storedIds) : [];
        } catch (e) {
            console.error("Error reading from local storage:", e);
            return [];
        }
    }

    function saveFavoritedContactIds(ids) {
        try {
            localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
        } catch (e) {
            console.error("Error writing to local storage:", e);
        }
    }

    function isContactFavorited(id) {
        const favoritedIds = getFavoritedContactIds();
        return favoritedIds.includes(id);
    }

    function toggleContactFavorite(id) {
        let favoritedIds = getFavoritedContactIds();
        if (favoritedIds.includes(id)) {
            // Remove from favorites
            favoritedIds = favoritedIds.filter(favId => favId !== id);
            console.log(`Unfavorited contact ID: ${id}`);
        } else {
            // Add to favorites
            favoritedIds.push(id);
            console.log(`Favorited contact ID: ${id}`);
        }
        saveFavoritedContactIds(favoritedIds);
        // Update button state if on contact card, re-render favorites list if on that tab
        if (currentContactData && currentContactData.id === id) {
            updateFavoriteButtonState(id);
        }
        if (favoritesTabContent.style.display !== 'none') {
            renderFavoritedContacts(); // Re-render the list if favorites tab is active
        }
        if (allContactsTabContent.style.display !== 'none') { // NEW: Re-render all contacts if that tab is active
            filterAllContacts(); // Re-render with current filter
        }
    }

    function updateFavoriteButtonState(contactId) {
        if (isContactFavorited(contactId)) {
            favoriteIcon.setAttribute('fill', 'gold'); // Filled star
            favoriteText.textContent = 'Favorited';
            favoriteBtn.classList.add('bg-yellow-600', 'hover:bg-yellow-700');
            favoriteBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
        } else {
            favoriteIcon.setAttribute('fill', 'currentColor'); // Outline star (default color)
            favoriteText.textContent = 'Favorite';
            favoriteBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-600');
            favoriteBtn.classList.remove('bg-yellow-600', 'hover:bg-yellow-700');
        }
    }
    // --- End Local Storage Functions ---


    // --- General UI Functions ---
    function showErrorMessage(message) {
        contactCardTabContent.style.display = 'block'; // Ensure card content is visible for error
        contactCard.style.display = 'none';
        notFoundDiv.style.display = 'none';
        errorMessageDiv.style.display = 'block';
        errorMessageDiv.querySelector('p:first-child').textContent = message;
        saveContactBtn.style.display = 'none'; // Hide buttons on error
        favoriteBtn.style.display = 'none';
        stopQrScanner();
    }

    function showNotFoundMessage() {
        contactCardTabContent.style.display = 'block'; // Ensure card content is visible for not found
        contactCard.style.display = 'none';
        errorMessageDiv.style.display = 'none';
        notFoundDiv.style.display = 'block';
        saveContactBtn.style.display = 'none'; // Hide buttons on not found
        favoriteBtn.style.display = 'none';
        stopQrScanner();
    }

    // Function to generate and download vCard
    function generateVCard() {
        if (!currentContactData) {
            console.error("No contact data available to generate vCard.");
            return;
        }

        const name = currentContactData['display name'] || 'Unknown Contact';
        const tel = currentContactData['contact number'] || '';
        const email = currentContactData.email || '';
        const linkedinId = currentContactData.linkedin_id || '';
        const instagramId = currentContactData.instagram_id || '';

        let vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\n`;

        if (tel) {
            vcard += `TEL;TYPE=WORK,VOICE:${tel}\n`;
        }
        if (email) {
            vcard += `EMAIL;TYPE=INTERNET:${email}\n`;
        }
        if (linkedinId) {
            vcard += `URL;TYPE=LinkedIn:https://www.linkedin.com/in/${linkedinId}\n`;
        }
        if (instagramId) {
            vcard += `URL;TYPE=Instagram:https://www.instagram.com/${instagramId}\n`;
        }
        vcard += `END:VCARD`;

        const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${name.replace(/\s+/g, '_')}.vcf`; // Sanitize filename
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Clean up the URL object
    }

    // --- QR Scanner Logic ---
    function startQrScanner() {
        qrReaderDiv.style.display = 'block';
        qrScanStatus.textContent = 'Scanning for QR code...';
        scanQrBtn.style.display = 'none';
        contactCard.style.display = 'none';
        notFoundDiv.style.display = 'none';
        errorMessageDiv.style.display = 'none';
        redirectMessageDiv.style.display = 'none'; // Hide redirect message if scanner starts

        if (!html5QrCode) {
            // Initialize Html5Qrcode with the ID of the reader element
            html5QrCode = new Html5Qrcode("reader");
        }

        // Configuration for the QR scanner
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        };

        // Start the QR code scanner preferring the back camera ('environment')
        html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
            .catch(err => {
                console.error("Failed to start QR scanner:", err);
                qrScanStatus.textContent = `Error starting scanner: ${err.message}`;
                showErrorMessage("Failed to start QR scanner. Please ensure camera access and try again.");
            });
    }

    function stopQrScanner() {
        console.log("Stopping QR scanner...");
        // Check if html5QrCode is initialized and currently scanning
        if (html5QrCode && html5QrCode.isScanning) {
            try {
                html5QrCode.stop()
                    .then(() => {
                        console.log("QR scanner stopped.");
                    })
                    .catch((err) => {
                        console.warn("Failed to stop QR scanner:", err);
                    });
            } catch (err) {
                console.warn("Failed to stop QR scanner (sync error):", err);
            }
        }
        qrReaderDiv.style.display = 'none';
        scanQrBtn.style.display = 'flex';
        qrScanStatus.textContent = '';
    }

    function onScanSuccess(decodedText, decodedResult) {
        console.log(`QR Code scanned: ${decodedText}`);
        qrScanStatus.textContent = `QR Code scanned: ${decodedText}`;
        stopQrScanner(); // Stop scanner after successful scan

        try {
            const scannedUrl = new URL(decodedText);
            const isSameOriginIgnoringProtocol = scannedUrl.hostname === window.location.hostname && scannedUrl.port === window.location.port;
            if (isSameOriginIgnoringProtocol) {

                const scannedId = scannedUrl.searchParams.get('id');
                const editId = scannedUrl.searchParams.get('edit_id');

                if (scannedId) {
                    qrScanStatus.style.display = 'none';
                    loadContactCard(scannedId);
                    switchTab('contact-card');
                } else if (editId) {
                    qrScanStatus.style.display = 'none';
                    redirectToPrefilledForm(editId);
                }
                else {
                    qrScanStatus.textContent = "QR code is from this site but no 'id' or 'edit_id' parameter found.";
                    showNotFoundMessage();
                }
            } else {
                qrScanStatus.textContent = `Scanned QR code is not for this website. URL: ${decodedText}`;
                if (!currentContactData) {
                        showNotFoundMessage();
                } else {
                    contactCard.style.display = 'block';
                    notFoundDiv.style.display = 'none';
                    errorMessageDiv.style.display = 'none';
                }
            }
        } catch (e) {
            qrScanStatus.textContent = "Scanned content is not a valid URL or could not be processed.";
            console.error("Error processing scanned QR code:", e);
            if (!currentContactData) {
                showNotFoundMessage();
            } else {
                contactCard.style.display = 'block';
                notFoundDiv.style.display = 'none';
                errorMessageDiv.style.display = 'none';
            }
        }
    }

    // New function to redirect to prefilled Google Form
    function redirectToPrefilledForm(contactId) {
        if (!currentFormUrl) { // Check if currentFormUrl is defined
            showErrorMessage("Form ID (fid) not provided in the URL or local storage. Please provide it as a URL parameter (e.g., ?fid=YOUR_FORM_ID) or ensure it was set previously.");
            return;
        }

        const contactToEdit = allContactsData.find(contact => contact.id === contactId);

        const googleFormBaseUrl = currentFormUrl; // Use the dynamic form URL
        const entryIds = {
            'id': 'entry.425553741',
            'display name': 'entry.1611557554',
            'subtitle': 'entry.1394933389',
            'email': 'entry.1411329335',
            'contact number': 'entry.285755920',
            'linkedin_id': 'entry.76271349',
            'instagram_id': 'entry.1255579483'
        };

        let prefilledUrl = `${googleFormBaseUrl}?usp=pp_url`;

        for (const key in entryIds) {
            // Ensure the 'id' field always uses the contactId from the URL
            // and other fields use data from contactToEdit if found, else empty string.
            const value = (key === 'id') ? contactId : (contactToEdit && contactToEdit[key]) || '';
            prefilledUrl += `&${entryIds[key]}=${encodeURIComponent(value)}`;
        }

        // Display the contact card first (will show 'not found' if contactToEdit is null)
        loadContactCard(contactId);
        switchTab('contact-card');

        // Show the redirect message and link
        redirectMessageDiv.style.display = 'block';
        editFormLinkElem.href = prefilledUrl;

        let countdown = 5;
        countdownTimerElem.textContent = countdown;

        const interval = setInterval(() => {
            countdown--;
            countdownTimerElem.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(interval);
                window.open(prefilledUrl, '_blank'); // Open in new tab
            }
        }, 1000);

        console.log("Prefilled Google Form link generated:", prefilledUrl);
    }

    // --- Contact Card Logic ---
    function loadContactCard(idToLoad) {
        // Reset card state
        contactCard.classList.remove('flipped');
        saveContactBtn.style.display = 'none';
        favoriteBtn.style.display = 'none';
        redirectMessageDiv.style.display = 'none'; // Hide redirect message if a new card is loaded

        const foundContact = allContactsData.find(contact => contact.id === idToLoad)
        if (!foundContact) {
            fetchAndProcessData(); // Fetch data if not found
        }


        if (foundContact) {
            currentContactData = foundContact; // Store the data

            // Populate front of the card
            displayNameFrontElem.textContent = foundContact['display name'];
            subtitleFrontElem.innerHTML = foundContact['subtitle'] || '';

            // Populate back of the card
            displayNameBackElem.textContent = foundContact['display name'];

            // Conditionally display contact number
            if (foundContact['contact number']) {
                contactNumberElem.textContent = foundContact['contact number'];
                contactNumberRow.style.display = 'flex';
            } else {
                contactNumberRow.style.display = 'none';
            }

            // Conditionally display email
            if (foundContact.email) {
                emailElem.textContent = foundContact.email;
                emailRow.style.display = 'flex';
            } else {
                emailRow.style.display = 'none';
            }

            // Conditionally display LinkedIn
            if (foundContact.linkedin_id) {
                linkedinLink.textContent = foundContact.linkedin_id;
                linkedinLink.href = `https://www.linkedin.com/in/${foundContact.linkedin_id}`;
                linkedinRow.style.display = 'flex';
            } else {
                linkedinRow.style.display = 'none';
            }

            // Conditionally display Instagram
            if (foundContact.instagram_id) {
                instagramLink.textContent = foundContact.instagram_id;
                instagramLink.href = `https://www.instagram.com/${foundContact.instagram_id}`;
                instagramRow.style.display = 'flex';
            } else {
                instagramRow.style.display = 'none';
            }

            contactCard.style.display = 'block';
            notFoundDiv.style.display = 'none';
            errorMessageDiv.style.display = 'none';

            updateFavoriteButtonState(currentContactData.id); // Update favorite button for this contact

        } else {
            showNotFoundMessage();
        }
    }

    // --- Favorites List Logic ---
    function renderFavoritedContacts() {
        favoritedContactsList.innerHTML = ''; // Clear previous list
        const favoritedIds = getFavoritedContactIds();

        if (favoritedIds.length === 0) {
            noFavoritesMessage.style.display = 'block';
            return;
        } else {
            noFavoritesMessage.style.display = 'none';
        }

        const favoritedContacts = allContactsData.filter(contact => favoritedIds.includes(contact.id));

        if (favoritedContacts.length === 0) {
            noFavoritesMessage.style.display = 'block';
            return;
        }

        favoritedContacts.forEach(contact => {
            const contactItem = document.createElement('div');
            contactItem.className = 'contact-item bg-gray-50 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between';

            contactItem.innerHTML = `
                <div class="contact-details mb-2 sm:mb-0">
                    <h3 class="text-xl font-semibold text-gray-800">${contact['display name']}</h3>
                    ${contact.subtitle ? `<p class="text-md text-gray-500">${contact.subtitle}</p>` : ''}
                    ${contact['contact number'] ? `<p class="text-sm text-gray-600 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg>${contact['contact number']}</p>` : ''}
                    ${contact.email ? `<p class="text-sm text-gray-600 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>${contact.email}</p>` : ''}
                    ${contact.linkedin_id ? `<p class="text-sm text-gray-600 flex items-center"><svg class="h-4 w-4 mr-1 text-blue-700" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0zM7.35 20.47H3.66V9.1H7.35v11.37zM5.5 7.5a2 2 0 11-.01-4.01A2 2 0 015.5 7.5zm14.97 12.97h-3.69v-5.61c0-1.33-.02-3.05-1.86-3.05-1.86 0-2.14 1.45-2.14 2.96v5.7h-3.69V9.1h3.55v1.64h.05c.49-.93 1.68-1.9 3.48-1.9 3.73 0 4.42 2.45 4.42 5.63v6.05z"/></svg><a href="https://www.linkedin.com/in/${contact.linkedin_id}" target="_blank" class="text-blue-600 hover:underline">${contact.linkedin_id}</a></p>` : ''}
                    ${contact.instagram_id ? `<p class="text-sm text-gray-600 flex items-center"><svg class="h-4 w-4 mr-1 text-pink-600" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.204-.012 3.584-.07 4.85-0.148 3.252-1.691 4.771-4.919 4.919-1.266.058-1.644.069-4.85.069s-3.584-.012-4.85-.07c-3.252-0.148-4.771-1.691-4.919-4.919-0.058-1.265-0.069-1.645-0.069-4.849 0-3.204.012-3.584.07-4.85 0.148-3.252 1.691-4.771 4.919-4.919 1.265-0.058 1.645-0.069 4.849-0.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98C.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.28.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.44-.645 1.44-1.44s-.645-1.44-1.44-1.44z"/></svg><a href="https://www.instagram.com/${contact.instagram_id}" target="_blank" class="text-blue-600 hover:underline">${contact.instagram_id}</a></p>` : ''}
                </div>
                <div class="contact-actions w-full sm:w-auto mt-2 sm:mt-0">
                    <button class="unfavorite-btn px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition duration-300 ease-in-out text-sm" data-id="${contact.id}">Unfavorite</button>
                    <a href="#" class="view-card-link px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition duration-300 ease-in-out text-sm flex items-center justify-center" data-id="${contact.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                        </svg>
                        View Card
                    </a>
                </div>
            `;
            favoritedContactsList.appendChild(contactItem);
        });

        // Add event listeners to unfavorite buttons
        document.querySelectorAll('.unfavorite-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const contactId = event.target.dataset.id;
                toggleContactFavorite(contactId);
            });
        });

        // Add event listeners to view card links
        document.querySelectorAll('.view-card-link').forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent default link behavior
                const contactId = event.target.dataset.id;
                switchTab('contact-card'); // Switch to contact card tab
                loadContactCard(contactId); // Load the specific contact
            });
        });
    }

    // --- NEW: All Contacts List Logic ---
    function renderAllContacts(contactsToRender = allContactsData) { // Added parameter
        allContactsList.innerHTML = ''; // Clear previous list

        if (contactsToRender.length === 0) { // Use contactsToRender
            noAllContactsMessage.style.display = 'block';
            return;
        } else {
            noAllContactsMessage.style.display = 'none';
        }

        contactsToRender.forEach(contact => { // Iterate over contactsToRender
            const contactItem = document.createElement('div');
            contactItem.className = 'contact-item bg-gray-50 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between';

            // Reusing the same structure as favorited contacts for consistency
            contactItem.innerHTML = `
                <div class="contact-details mb-2 sm:mb-0">
                    <h3 class="text-xl font-semibold text-gray-800">${contact['display name']}</h3>
                    ${contact.subtitle ? `<p class="text-md text-gray-500">${contact.subtitle}</p>` : ''}
                    ${contact['contact number'] ? `<p class="text-sm text-gray-600 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg>${contact['contact number']}</p>` : ''}
                    ${contact.email ? `<p class="text-sm text-gray-600 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>${contact.email}</p>` : ''}
                    ${contact.linkedin_id ? `<p class="text-sm text-gray-600 flex items-center"><svg class="h-4 w-4 mr-1 text-blue-700" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0zM7.35 20.47H3.66V9.1H7.35v11.37zM5.5 7.5a2 2 0 11-.01-4.01A2 2 0 015.5 7.5zm14.97 12.97h-3.69v-5.61c0-1.33-.02-3.05-1.86-3.05-1.86 0-2.14 1.45-2.14 2.96v5.7h-3.69V9.1h3.55v1.64h.05c.49-.93 1.68-1.9 3.48-1.9 3.73 0 4.42 2.45 4.42 5.63v6.05z"/></svg><a href="https://www.linkedin.com/in/${contact.linkedin_id}" target="_blank" class="text-blue-600 hover:underline">${contact.linkedin_id}</a></p>` : ''}
                    ${contact.instagram_id ? `<p class="text-sm text-gray-600 flex items-center"><svg class="h-4 w-4 mr-1 text-pink-600" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.204-.012 3.584-.07 4.85-0.148 3.252-1.691 4.771-4.919 4.919-1.266.058-1.644.069-4.85.069s-3.584-.012-4.85-.07c-3.252-0.148-4.771-1.691-4.919-4.919-0.058-1.265-0.069-1.645-0.069-4.849 0-3.204.012-3.584.07-4.85 0.148-3.252 1.691-4.771 4.919-4.919 1.265-0.058 1.645-0.069 4.849-0.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98C.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.28.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.44-.645 1.44-1.44s-.645-1.44-1.44-1.44z"/></svg><a href="https://www.instagram.com/${contact.instagram_id}" target="_blank" class="text-blue-600 hover:underline">${contact.instagram_id}</a></p>` : ''}
                </div>
                <div class="contact-actions w-full sm:w-auto mt-2 sm:mt-0">
                    <button class="favorite-toggle-btn px-4 py-2 bg-yellow-500 text-white rounded-lg shadow-md hover:bg-yellow-600 transition duration-300 ease-in-out text-sm flex items-center justify-center" data-id="${contact.id}">
                        <svg class="h-4 w-4 mr-1 favorite-icon" fill="${isContactFavorited(contact.id) ? 'gold' : 'currentColor'}" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" d="M10 18.35L3.618 20l.707-7.071L.293 8.382l7.071-.707L10 1l2.626 6.674 7.071.707-4.032 4.547.707 7.071L10 18.35z" clip-rule="evenodd"></path>
                        </svg>
                        <span class="favorite-text">${isContactFavorited(contact.id) ? 'Favorited' : 'Favorite'}</span>
                    </button>
                    <a href="#" class="view-card-link px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition duration-300 ease-in-out text-sm flex items-center justify-center" data-id="${contact.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                        </svg>
                        View Card
                    </a>
                </div>
            `;
            allContactsList.appendChild(contactItem);
        });

        // Add event listeners to favorite toggle buttons in "All Contacts" tab
        document.querySelectorAll('#all-contacts-list .favorite-toggle-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const contactId = event.target.dataset.id || event.target.closest('button').dataset.id;
                toggleContactFavorite(contactId);
                // Update the button's state immediately after toggling
                const icon = button.querySelector('.favorite-icon');
                const text = button.querySelector('.favorite-text');
                if (isContactFavorited(contactId)) {
                    icon.setAttribute('fill', 'gold');
                    text.textContent = 'Favorited';
                } else {
                    icon.setAttribute('fill', 'currentColor');
                    text.textContent = 'Favorite';
                }
            });
        });

        // Add event listeners to view card links
        document.querySelectorAll('#all-contacts-list .view-card-link').forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent default link behavior
                const contactId = event.target.dataset.id;
                switchTab('contact-card'); // Switch to contact card tab
                loadContactCard(contactId); // Load the specific contact
            });
        });
    }

    // NEW: Function to filter all contacts
    function filterAllContacts() {
        const searchTerm = allContactsSearchInput.value.toLowerCase();
        const filtered = allContactsData.filter(contact => {
            return (contact['display name'] && contact['display name'].toLowerCase().includes(searchTerm)) ||
                   (contact.subtitle && contact.subtitle.toLowerCase().includes(searchTerm)) ||
                   (contact.email && contact.email.toLowerCase().includes(searchTerm)) ||
                   (contact['contact number'] && contact['contact number'].includes(searchTerm));
        });
        renderAllContacts(filtered);
    }

    // --- Data Fetching and Initialization ---
    async function fetchAndProcessData() {
        let dataSourcePromise;
        if (DEBUG_MODE) {
            dataSourcePromise = Promise.resolve(debugJsonData); // Directly use debug JSON data
        } else {
            // Check if googleSpreadsheetTSVUrl is defined before fetching
            if (!googleSpreadsheetTSVUrl) {
                showErrorMessage("Spreadsheet ID (sid) not provided in the URL or local storage. Please provide it as a URL parameter (e.g., ?sid=YOUR_SPREADSHEET_ID) or ensure it was set previously.");
                return; // Stop execution if URL is not valid
            }
            dataSourcePromise = fetch(googleSpreadsheetTSVUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}. Check if the spreadsheet URL is correct and published publicly.`);
                    }
                    return response.text(); // Get as text to parse TSV
                })
                .then(tsvText => {
                    const lines = tsvText.trim().split('\n');
                    if (lines.length === 0) {
                        return [];
                    }

                    const headers = lines[0].split('\t').map(header => headerMapping[header.trim()]);
                    const contacts = [];

                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split('\t');
                        const contact = {};
                        headers.forEach((header, index) => {
                            contact[header] = values[index] ? values[index].trim() : '';
                        });
                        contacts.push(contact);
                    }
                    console.log("Fetched contacts:", contacts);

                    // Remove duplicates based on 'id' and keep the most recent entry
                   const uniqueContacts = {};
                   contacts.forEach(contact => {
                        const existingContact = uniqueContacts[contact.id];
                        if (!existingContact || new Date(contact.timestamp) > new Date(existingContact.timestamp)) {
                            uniqueContacts[contact.id] = contact;
                        }
                    });

                    const filteredData = Object.values(uniqueContacts);

                    return filteredData;
                });
        }

        dataSourcePromise
            .then(processedData => {
                console.log("Processed Data:", processedData);
                allContactsData = processedData; // Assign processed data
                // --- Debug Mode: Seed Favorites ---
                if (DEBUG_MODE && getFavoritedContactIds().length === 0) {
                    const availableIds = allContactsData.map(c => c.id);
                    const idsToFavorite = [];
                    // Ensure we don't try to favorite more contacts than available
                    const numContactsToFavorite = Math.min(4, availableIds.length);

                    // Randomly select contacts to favorite
                    // Create a copy of availableIds to avoid modifying the original during selection
                    let tempAvailableIds = [...availableIds];
                    while (idsToFavorite.length < numContactsToFavorite && tempAvailableIds.length > 0) {
                        const randomIndex = Math.floor(Math.random() * tempAvailableIds.length);
                        const randomId = tempAvailableIds[randomIndex];
                        idsToFavorite.push(randomId);
                        tempAvailableIds.splice(randomIndex, 1); // Remove selected ID to avoid duplicates
                    }
                    saveFavoritedContactIds(idsToFavorite);
                    console.log("DEBUG_MODE: Seeded favorites with IDs:", idsToFavorite);
                }
                // --- End Debug Mode: Seed Favorites ---

                // Get the 'id' from the URL query parameters
                let idFromUrl = new URLSearchParams(window.location.search).get('id');
                let editIdFromUrl = new URLSearchParams(window.location.search).get('edit_id');

                // If DEBUG_MODE is true and no ID is provided in the URL, default to '1'
                if (DEBUG_MODE && !idFromUrl && !editIdFromUrl) {
                    idFromUrl = '1';
                    console.log("DEBUG_MODE: No ID or Edit ID found in URL, defaulting to ID '1'.");
                }

                if (idFromUrl) {
                    console.log(`Loading contact card for ID: ${idFromUrl}`);
                    console.log("All Contacts Data:", allContactsData);
                    loadContactCard(idFromUrl);
                } else if (editIdFromUrl) {
                    console.log(`Redirecting to Google Form for ID: ${editIdFromUrl}`);
                    redirectToPrefilledForm(editIdFromUrl);
                } else {
                    // If no ID is provided and not in debug mode, or no default, show not found
                    console.log("No id or edit_id provided and not in debug mode");
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showErrorMessage(`Failed to load data: ${error.message}`);
            });
    }

    // --- Tab Switching Logic ---
    function switchTab(tabName) {
        // Close QR scanner when switching tabs
        stopQrScanner(); //

        // Deactivate all tabs
        tabContactCardBtn.classList.remove('border-blue-600', 'text-blue-600');
        tabContactCardBtn.classList.add('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        tabFavoritesBtn.classList.remove('border-blue-600', 'text-blue-600');
        tabFavoritesBtn.classList.add('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        // NEW: Deactivate All Contacts tab
        tabAllContactsBtn.classList.remove('border-blue-600', 'text-blue-600');
        tabAllContactsBtn.classList.add('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');

        // Hide all tab contents
        contactCardTabContent.style.display = 'none';
        favoritesTabContent.style.display = 'none';
        // NEW: Hide All Contacts tab content
        allContactsTabContent.style.display = 'none';

        // Activate the selected tab and show its content
        if (tabName === 'contact-card') {
            tabContactCardBtn.classList.add('border-blue-600', 'text-blue-600');
            tabContactCardBtn.classList.remove('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            contactCardTabContent.style.display = 'block';
        } else if (tabName === 'favorites') {
            tabFavoritesBtn.classList.add('border-blue-600', 'text-blue-600');
            tabFavoritesBtn.classList.remove('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            favoritesTabContent.style.display = 'block';
            renderFavoritedContacts(); // Re-render favorites when tab is opened
        } else if (tabName === 'all-contacts') { // NEW: Handle All Contacts tab
            tabAllContactsBtn.classList.add('border-blue-600', 'text-blue-600');
            tabAllContactsBtn.classList.remove('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            allContactsTabContent.style.display = 'block';
            filterAllContacts(); // Render all contacts (with any existing filter) when tab is opened
        }
    }

    // --- Event Listeners ---
    saveContactBtn.addEventListener('click', generateVCard);

    favoriteBtn.addEventListener('click', () => {
        if (currentContactData && currentContactData.id) {
            toggleContactFavorite(currentContactData.id);
        }
    });

    contactCard.addEventListener('click', (event) => {
        // Prevent flipping if the click originated from a button itself or its children
        if (event.target === saveContactBtn || event.target === favoriteBtn || saveContactBtn.contains(event.target) || favoriteBtn.contains(event.target)) {
            return;
        }
        // Only allow flipping if a contact is loaded and no error/not found is showing
        if (currentContactData) {
            contactCard.classList.toggle('flipped');
            // Show/hide buttons based on flip state
            if (contactCard.classList.contains('flipped')) {
                saveContactBtn.style.display = 'flex';
                favoriteBtn.style.display = 'flex';
            } else {
                saveContactBtn.style.display = 'none';
                favoriteBtn.style.display = 'none';
            }
        }
    });

    scanQrBtn.addEventListener('click', startQrScanner);

    tabContactCardBtn.addEventListener('click', () => switchTab('contact-card'));
    tabFavoritesBtn.addEventListener('click', () => switchTab('favorites'));
    // NEW: Event Listener for All Contacts tab
    tabAllContactsBtn.addEventListener('click', () => switchTab('all-contacts'));

    // NEW: Event Listener for All Contacts search input
    allContactsSearchInput.addEventListener('input', filterAllContacts);

    // Initial data fetch and display
    fetchAndProcessData();
    switchTab('contact-card'); // Default to contact card tab on load
};
