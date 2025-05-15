// Keep the globally accessible modal function outside DOMContentLoaded
window.closeVaccinationModal = function() {
    const vaccinationModal = document.getElementById('vaccinationModal');
    if(vaccinationModal) vaccinationModal.style.display = 'none';
    const vaccinationForm = document.getElementById('vaccinationForm');
    // It's generally good practice to reset on close as well,
    // to ensure the form is clean for the next open.
    if(vaccinationForm) vaccinationForm.reset();
    const recordIdInput = document.getElementById('record-id');
    if(recordIdInput) recordIdInput.value = '';
    const modalPetIdInput = document.getElementById('modal-pet-id');
    if(modalPetIdInput) modalPetIdInput.value = '';
    const deleteVaccinationButton = document.getElementById('delete-vaccination-button');
    if(deleteVaccinationButton) deleteVaccinationButton.style.display = 'none';
}


document.addEventListener('DOMContentLoaded', () => {
    // --- Idempotent check: Ensure this DOMContentLoaded logic runs only once ---
    // This prevents multiple event listeners from being attached if the script is somehow executed multiple times.
    if (document.body.dataset.vaccinationDomLoadedHandled) {
        console.warn("DOMContentLoaded already handled for vaccination script. Skipping duplicate execution.");
        return; // Exit the listener immediately
    }
    document.body.dataset.vaccinationDomLoadedHandled = 'true';
    console.log("Handling DOMContentLoaded for vaccination script.");
    // --- End Idempotent check ---


    // Get references to DOM elements
    const notLoggedInMessage = document.getElementById("not-logged-in"); // Reference to the not-logged-in message element
    const vaccinationContent = document.getElementById("vaccination-content"); // Reference to the main content wrapper
    const signInOutButton = document.getElementById('signInOutButton');
    const petSelect = document.getElementById('pet-select');
    // *** CORRECTED ID: Referencing the container by its actual ID in HTML ***
    const vaccinationRecordsContainer = document.getElementById('vaccination-records-display-area'); // Container where the table is built
    // --- Ensure these message elements exist in your HTML ---
    const noVaccinationMessage = document.getElementById('no-vaccination-message'); // Message shown when no records are found for the pet (before filter/sort results in 0)
    const selectPetMessage = document.getElementById('select-pet-message'); // Message shown when no pet is selected
    // --- Added message for when filter results in no records ---
    const noRecordsAfterFilterMessage = document.getElementById('no-records-after-filter'); // Assumes you add an element with this ID in your HTML
     // Assumes you have a no pets message element with ID 'no-pets-message' like on other pages
     const noPetsMessage = document.getElementById('no-pets-message');
    // --- End Message element references ---

    const addVaccinationButton = document.getElementById('add-vaccination-button');
    // *** CORRECTED ID: Referencing the page title element ***
    const welcomeHeader = document.getElementById("vaccination-page-title"); // Using the actual H1 title as the "welcome header"


    // --- Ensure these pet name display elements exist in your HTML ---
    const petNameHeading = document.getElementById('selected-pet-name-heading'); // Heading for pet name (e.g., "Records for [Pet Name]")
    const petNameSpan = document.getElementById('selected-pet-name'); // Span inside the heading for the pet's name
    // --- End Pet name display references ---


    // Modal elements
    const vaccinationModal = document.getElementById('vaccinationModal');
    const modalTitle = document.getElementById('modal-title');
    const vaccinationForm = document.getElementById('vaccinationForm');
    const recordIdInput = document.getElementById('record-id');
    const modalPetIdInput = document.getElementById('modal-pet-id');
    const vaccineNameInput = document.getElementById('vaccine-name');
    const dateAdministeredInput = document.getElementById('date-administered');
    const nextDueDateInput = document.getElementById('next-due-date');
    const vetClinicInput = document.getElementById('vet-clinic');
    const vetInChargeInput = document.getElementById('vet-in-charge');
    const saveVaccinationButton = document.getElementById('save-vaccination-button');
    const deleteVaccinationButton = document.getElementById('delete-vaccination-button');

    // --- SORT AND SEARCH REFERENCES (Using IDs from your provided HTML snippets) ---
    // *** CORRECTED REFERENCE: Referencing controls container by its ID ***
    const controlsContainer = document.getElementById('vaccine-controls'); // Find the controls container by ID
    const sortBySelect = document.getElementById('sort-by'); // Select for sort key
    const searchInput = document.getElementById('search-input'); // Input for search query
    const sortDirectionSelect = document.getElementById('sort-direction'); // Select for sort direction

    const vaccinationTable = document.getElementById('vaccination-table'); // Static table element
    const vaccinationTableBody = document.getElementById('vaccination-table-body'); // Static tbody element
    // --- END SORT AND SEARCH REFERENCES ---


    let allUserPets = []; // To store the list of the user's pets
    let isLoggedIn = false; // Track login status

    // --- STATE VARIABLES FOR VACCINATION RECORDS SORT/FILTER ---
    let selectedPetId = null; // Store the ID of the currently selected pet
    let currentPetVaccinations = []; // Stores the FULL list of vaccinations for the selected pet
    // Initialize sort/filter state based on HTML controls (assuming they exist, default if not)
    // The value from sortBySelect should match a field in your vaccination data (e.g., 'vaccine_name').
    let currentVaccineSortKey = sortBySelect ? sortBySelect.value : 'date_administered'; // Default sort key
    let currentVaccineSearchQuery = searchInput ? searchInput.value : ''; // Default empty search
    // The value from sortDirectionSelect should be 'asc' or 'desc'.
    let currentVaccineSortDirection = sortDirectionSelect ? sortDirectionSelect.value : 'asc'; // Default sort direction
    // --- END STATE VARIABLES ---


    // Function to handle user sign out (reused)
    function handleSignOut(event) {
        event.preventDefault(); // Prevent the default link behavior

        fetch('/logout', {
            method: 'POST',
        })
        .then(response => {
            if (response.ok) {
                console.log('Logged out successfully from server.');
                window.location.href = 'loginpage.html'; // Redirect to login page
            } else {
                console.error('Logout failed');
                alert('Logout failed. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error during logout:', error);
            alert('Error during logout. Please check your connection.');
        });
    }

    // Attach logout listener to the sign-out button if it exists
    if (signInOutButton) {
        // Ensure old listener is removed before adding the new one
        signInOutButton.removeEventListener('click', handleSignOut);
        signInOutButton.addEventListener('click', handleSignOut);
    }


    // Function to fetch user info and pets
    function fetchData() {
        // Fetch user info first to check authentication status
        fetch('/get-profile')
            .then(async response => {
                console.log('Response status for /get-profile (Vaccinations):', response.status);
                if (!response.ok) {
                     // --- NOT LOGGED IN HANDLING ---
                     console.error('User not authenticated or error fetching profile.');
                     isLoggedIn = false;
                     // Update sign-in/out button
                     if (signInOutButton) {
                         signInOutButton.textContent = 'SIGN IN';
                         signInOutButton.href = 'loginpage.html'; // Link to login page
                         signInOutButton.classList.remove('sign-out-btn');
                         signInOutButton.classList.add('sign-in-btn');
                     }
                     // Show not logged in message and hide content
                     if (notLoggedInMessage) notLoggedInMessage.style.display = "block"; // Check added
                     if (vaccinationContent) vaccinationContent.style.display = 'none';
                     if (welcomeHeader) welcomeHeader.style.display = "none"; // Hide welcome message (the H1 title)
                     // *** MESSAGE VISIBILITY: Ensure other messages are hidden if not logged in ***
                     if (selectPetMessage) selectPetMessage.style.display = 'none';
                     if (noVaccinationMessage) noVaccinationMessage.style.display = 'none';
                     if (noRecordsAfterFilterMessage) noRecordsAfterFilterMessage.style.display = 'none';
                     if (noPetsMessage) noPetsMessage.style.display = 'none';


                     // Propagate error to stop the promise chain
                     const contentType = response.headers.get('content-type');
                     if (contentType && contentType.includes('application/json')) {
                             const err = await response.json();
                             console.error('Error response body for user info (Vaccinations):', err);
                             throw new Error(err.error || `HTTP error! status: ${response.status}`);
                     } else {
                             const text = await response.text();
                             console.error('Non-JSON error response for user info (Vaccinations):', text);
                             throw new Error(`HTTP error! status: ${response.status}. Server returned non-JSON: ${text.substring(0, 100)}...`);
                     }
                }
                return response.json(); // User is logged in
            })
            .then(data => {
                console.log('User info fetched successfully (Vaccinations):', data);
                isLoggedIn = true; // Confirm logged in state

                // --- LOGGED IN HANDLING ---
                // Use the actual vaccination page title element
                if (welcomeHeader) { // welcomeHeader is now the H1 #vaccination-page-title
                    // Keep the original title text, you might want to set a personalized message elsewhere
                    // welcomeHeader.textContent = `Vaccination Records`;
                    welcomeHeader.style.display = "block"; // Ensure it's visible
                }

                 // Update sign-in/out button (already handled above DOMContentLoaded, but reinforcing state)
                 if (signInOutButton) {
                     signInOutButton.textContent = 'SIGN OUT';
                     signInOutButton.href = '#'; // Handled by JS listener
                     signInOutButton.classList.remove('sign-in-btn');
                     signInOutButton.classList.add('sign-out-btn');
                 }
                // Hide not logged in message and show content
                if (notLoggedInMessage) notLoggedInMessage.style.display = "none"; // Check added
                if (vaccinationContent) vaccinationContent.style.display = 'block';
                // --- End LOGGED IN HANDLING ---


                // Now fetch pets since the user is authenticated
                return fetch('/get-user-pets');
            })
            .then(response => {
                console.log('Response status for /get-user-pets (Vaccinations):', response.status);
                if (!response.ok) {
                     throw new Error('Failed to fetch pets for vaccinations');
                }
                return response.json();
            })
            .then(pets => {
                console.log('Pets fetched successfully (Vaccinations):', pets);
                allUserPets = pets;
                populatePetSelect(pets);

                if (allUserPets.length > 0) {
                    addVaccinationButton.style.display = 'block';
                    // *** MESSAGE VISIBILITY: Hide messages that shouldn't be shown if pets are found ***
                    // The updateVaccineDisplay will handle showing the correct state later.
                    if (selectPetMessage) selectPetMessage.style.display = 'none'; // Will be shown by updateDisplay if pet isn't selected yet
                    if (noVaccinationMessage) noVaccinationMessage.style.display = 'none'; // Will be shown by updateDisplay if selected pet has no records
                    if (noRecordsAfterFilterMessage) noRecordsAfterFilterMessage.style.display = 'none'; // Will be shown by updateDisplay if filter yields nothing
                    // Hide no pets message if pets are found (handled here as this is the first place we know pet count)
                    if (noPetsMessage) noPetsMessage.style.display = 'none';


                    // Automatically select the first pet
                    selectedPetId = allUserPets[0].id;
                    if(petSelect) petSelect.value = selectedPetId; // Check added

                    // Update pet name display immediately for initial load
                    const selectedPet = allUserPets.find(pet => String(pet.id) === String(selectedPetId));
                     if (petNameHeading && petNameSpan && selectedPet) {
                          petNameSpan.textContent = selectedPet.name;
                          petNameHeading.style.display = 'block'; // Show the heading
                     } else if (petNameHeading) {
                         petNameHeading.style.display = 'none'; // Hide heading if pet not found (shouldn't happen here)
                     } else {
                         console.warn("Pet name display elements not found or pet not found.");
                         if(petNameHeading) petNameHeading.style.display = 'none';
                     }


                    // *** MODIFIED: Directly fetch records for the first pet on load ***
                    // This bypasses the check in handlePetSelectionChange that was preventing the initial fetch.
                    fetchVaccinationRecords(selectedPetId);


                } else {
                    addVaccinationButton.style.display = 'none';
                    selectedPetId = null; // No pets selected
                    currentPetVaccinations = []; // Clear state
                     if(petNameHeading) petNameHeading.style.display = 'none'; // Hide heading if no pets

                     // *** MESSAGE VISIBILITY: Show no pets message if no pets are found ***
                    if (noPetsMessage) noPetsMessage.style.display = 'block';


                     // Calling updateVaccineDisplay here will handle hiding other messages/table/controls
                    updateVaccineDisplay();
                }
            })
            .catch(error => {
                console.error('Error during initial load (pets/vaccinations):', error);
                 // This catch handles errors *after* successful profile fetch (e.g., failure to fetch pets)
                 if (isLoggedIn) { // Only show specific messages if logged in but fetch failed
                    allUserPets = [];
                    populatePetSelect([]); // Clear dropdown
                    selectedPetId = null;
                    currentPetVaccinations = [];
                    // Call updateVaccineDisplay to handle messages (will likely show 'select pet' or similar)
                    updateVaccineDisplay();
                    addVaccinationButton.style.display = 'none';
                    // *** MESSAGE VISIBILITY: Ensure select pet message is shown if fetch pets failed but user is logged in ***
                    // updateVaccineDisplay() will handle this based on selectedPetId === null and allUserPets.length > 0.
                    // Ensure no pets message is hidden if pets fetch failed but user is logged in and we are trying to show select pet message
                     if (noPetsMessage) noPetsMessage.style.display = 'none';
                 } // If not logged in, the catch for /get-profile handles the state and messages.
            });
    }

    // Function to populate the pet dropdown
    function populatePetSelect(pets) {
        const petSelect = document.getElementById('pet-select'); // Re-reference inside function for safety
        if (!petSelect) {
             console.error("Pet select element #pet-select not found.");
             return;
        }

        petSelect.innerHTML = '<option value="" disabled selected>--Select a Pet--</option>';
        if (pets && pets.length > 0) {
             pets.forEach(pet => {
                const option = document.createElement('option');
                option.value = pet.id;
                option.textContent = pet.name;
                petSelect.appendChild(option);
             });
        }
         // Try to re-select the previously selected pet if it still exists
         if (selectedPetId !== null && petSelect.querySelector(`option[value="${selectedPetId}"]`)) {
             petSelect.value = selectedPetId;
         } else {
            // If previous pet not found or no pets, reset selection
            selectedPetId = null;
            petSelect.value = "";
         }
    }

    // Function to fetch vaccination records for a selected pet
    function fetchVaccinationRecords(petId) {
        if (!petId || !isLoggedIn) {
             selectedPetId = null;
             currentPetVaccinations = [];
             // Call updateVaccineDisplay to handle showing the 'select pet' message
             updateVaccineDisplay();
             return;
        }

        console.log(`Workspaceing vaccination records for pet ID: ${petId}`);

        fetch(`/get-pet-vaccinations/${petId}`)
            .then(async response => {
                console.log(`Response status for /get-pet-vaccinations/${petId}:`, response.status);
                if (!response.ok) {
                    if (response.status === 401) {
                        alert('Session expired. Please log in again.');
                        window.location.href = 'loginpage.html';
                        return;
                    }
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                           const err = await response.json();
                           console.error('Error response body for get vaccinations:', err);
                           throw new Error(err.error || `HTTP error! status: ${response.status}`);
                    } else {
                           const text = await response.text();
                           console.error('Non-JSON error response for get vaccinations:', text);
                           throw new Error(`HTTP error! status: ${response.status}. Server returned non-JSON: ${text.substring(0, 100)}...`);
                    }
                }
                return response.json();
            })
            .then(records => {
                 console.log(`Workspaceed ${records.length} vaccination records for pet ID ${petId}:`, records);
                 currentPetVaccinations = records; // Store the full list of records
                 // Call updateVaccineDisplay to handle showing records or 'no records for pet' message
                 updateVaccineDisplay();
            })
            .catch(error => {
                 console.error('Error fetching vaccination records:', error);
                 alert('Could not fetch vaccination records: ' + error.message);
                 currentPetVaccinations = []; // Clear records on error
                 // Call updateVaccineDisplay to handle showing 'no records for pet' message or error state
                 updateVaccineDisplay();
            });
    }

    // Function to display vaccination records by populating a static TBODY
    // Requires a <table id="vaccination-table"> with a <tbody id="vaccination-table-body"> in the HTML
    // This function is called BY updateVaccineDisplay with filtered/sorted records
    function displayVaccinationRecords(recordsToRender) { // Changed parameter name for clarity
        // Get references to the static table and tbody elements
        const vaccinationTable = document.getElementById('vaccination-table');
        const vaccinationTableBody = document.getElementById('vaccination-table-body');

        // Check if the required static elements exist - updateDisplay checks essential ones
        if (!vaccinationTable || !vaccinationTableBody) {
             console.error("Error: displayVaccinationRecords aborted due to missing table or tbody.");
             // The visibility is managed by updateVaccineDisplay, just clear tbody if possible
             if(vaccinationTableBody) vaccinationTableBody.innerHTML = '';
             return;
        }

        // Clear existing rows from the tbody
        vaccinationTableBody.innerHTML = '';


        if (!recordsToRender || recordsToRender.length === 0) {
             // This case is handled by updateVaccineDisplay determining which "no records" message to show.
             // Here, we just ensure the table is hidden and tbody is empty.
             if(vaccinationTable) vaccinationTable.style.display = 'none'; // Hide the static table
             return; // Stop here if no records to render
        }

        // If there are records to render, show the table
         if(vaccinationTable) vaccinationTable.style.display = ''; // Show the static table


        // Populate the tbody with record rows
        recordsToRender.forEach(record => {
             const recordRow = createVaccinationRecordRow(record);
             vaccinationTableBody.appendChild(recordRow);
        });

    }


    // Function to create a TABLE ROW element for a single vaccination record
    function createVaccinationRecordRow(record) {
        const recordRow = document.createElement('tr');
        recordRow.dataset.recordId = record.id; // Store record ID
        recordRow.dataset.petId = record.pet_id; // Store pet ID

        // Format dates for display
        const administeredDate = record.date_administered ? new Date(record.date_administered).toLocaleDateString() : 'N/A';
        const nextDueDate = record.next_due_date ? new Date(record.next_due_date).toLocaleDateString() : 'N/A';

        recordRow.innerHTML = `
            <td>${record.vaccine_name || 'Unnamed Vaccine'}</td>
            <td>${administeredDate}</td>
            <td>${nextDueDate}</td>
            <td>${record.vet_clinic || 'N/A'}</td>
            <td>${record.vet_in_charge || 'N/A'}</td>
            <td class="record-actions">
                <button class="edit-record-btn btn-small">Edit</button>
                <button class="delete-record-btn btn-small">Delete</button>
            </td>
        `;

        // Add event listeners for edit and delete buttons within the row
        const editButton = recordRow.querySelector('.edit-record-btn');
        if (editButton) {
             editButton.addEventListener('click', (event) => {
                 event.stopPropagation(); // Prevent row click if row itself becomes clickable later
                 openVaccinationModal(record); // Open modal for editing
             });
        } else {
             console.error("Edit button not found in vaccination record row for record ID:", record.id);
        }

        const deleteButton = recordRow.querySelector('.delete-record-btn');
        if (deleteButton) {
             deleteButton.addEventListener('click', (event) => {
                 event.stopPropagation(); // Prevent row click if row itself becomes clickable later
                 handleDeleteVaccination(record.id, record.pet_id); // Handle deletion
             });
        } else {
             console.error("Delete button not found in vaccination record row for record ID:", record.id);
        }

        return recordRow;
    }


    // Function to open the vaccination modal
    function openVaccinationModal(record = null) {
          // Check if logged in before opening modal
        if (!isLoggedIn) {
            alert('You must be logged in to add/edit vaccination records.');
            return;
        }

        // Ensure modal elements exist
         if (!vaccinationModal || !vaccinationForm || !modalTitle || !recordIdInput || !modalPetIdInput || !vaccineNameInput || !dateAdministeredInput || !nextDueDateInput || !vetClinicInput || !vetInChargeInput || !deleteVaccinationButton) {
             console.error("Vaccination modal elements not found. Cannot open modal.");
             alert("Error displaying form. Please try again."); // User feedback
             return;
         }


        // --- CORRECTED: Only reset form when adding a NEW record ---
        if (record) {
            // Editing existing record
            modalTitle.textContent = 'Edit Vaccination Record';
            recordIdInput.value = record.id;
            modalPetIdInput.value = record.pet_id; // Set pet ID for the modal
            vaccineNameInput.value = record.vaccine_name || ''; // Populate vaccine name
            // Ensure dates are in 'YYYY-MM-DD' format for input type="date"
            dateAdministeredInput.value = record.date_administered ? new Date(record.date_administered).toISOString().split('T')[0] : '';
            nextDueDateInput.value = record.next_due_date ? new Date(record.next_due_date).toISOString().split('T')[0] : '';
            vetClinicInput.value = record.vet_clinic || '';
            vetInChargeInput.value = record.vet_in_charge || '';
            deleteVaccinationButton.style.display = 'inline-block'; // Show delete button
        } else {
            // Adding new record
            vaccinationForm.reset(); // Reset form ONLY when adding new
            modalTitle.textContent = 'Add Vaccination Record';
            recordIdInput.value = ''; // Clear record ID
            // Set the currently selected pet's ID in the modal's hidden input
            modalPetIdInput.value = selectedPetId; // Use the selectedPetId state variable

            // Optionally set current date for new records
            const now = new Date();
            dateAdministeredInput.value = now.toISOString().split('T')[0];
            nextDueDateInput.value = ''; // Clear next due date for new records
             vetClinicInput.value = '';
             vetInChargeInput.value = '';
             vaccineNameInput.value = ''; // Clear vaccine name for new records
        }
        if(vaccinationModal) vaccinationModal.style.display = 'block';
    }

    // Function to close the vaccination modal (Global function)
    // This is defined outside DOMContentLoaded but referenced inside.
    // The definition at the top of the file handles the global scope.
    // window.closeVaccinationModal is already defined globally at the top


    // Handle Add Vaccination Button click (Modified to check for selected pet)
    addVaccinationButton.addEventListener('click', () => {
         if (!isLoggedIn) { // Basic check
             alert('You must be logged in to add records.');
             return;
         }
        if (selectedPetId) { // Only open if a pet is selected
             // selectedPetId is already set by the pet select listener or initial load
             modalPetIdInput.value = selectedPetId; // Set the modal's hidden pet ID
             openVaccinationModal(); // Called with no 'record' argument
        } else {
             alert('Please select a pet first to add a vaccination record.');
        }
    });


    // Define the Save Vaccination Form Submission handler as a named function
    function handleVaccinationFormSubmit(event) {
        event.preventDefault(); // Prevent default form submission (page reload)

        if (!isLoggedIn) {
            alert('You must be logged in to save vaccination records.');
            return;
        }

         // Ensure form elements exist
        if (!vaccinationForm || !recordIdInput || !modalPetIdInput || !vaccineNameInput || !dateAdministeredInput || !nextDueDateInput || !vetClinicInput || !vetInChargeInput) {
            console.error("Vaccination form elements not found. Cannot save record.");
            alert("Error saving form data. Please try again."); // User feedback
            return;
        }


        const recordId = recordIdInput.value;
         // Get petId from the hidden input in the modal form
        const petId = modalPetIdInput.value;

         if (!petId) {
             console.error('Error: Pet ID missing from modal form.');
             alert('Error: Could not determine pet for this record.'); // User feedback
             return;
         }


        const vaccineName = vaccineNameInput.value.trim();
        const dateAdministered = dateAdministeredInput.value;
        const nextDueDate = nextDueDateInput.value || null; // Allow null for optional
        const vetClinic = vetClinicInput.value.trim() || null; // Allow null for optional
        const vetInCharge = vetInChargeInput.value.trim() || null; // Allow null for optional

        if (!vaccineName || !dateAdministered) {
            alert('Please fill in Vaccine Name and Date Administered.');
            return;
        }

        const recordData = {
            pet_id: petId, // Use the petId from the modal's hidden input
            vaccine_name: vaccineName,
            date_administered: dateAdministered,
            next_due_date: nextDueDate,
            vet_clinic: vetClinic,
            vet_in_charge: vetInCharge
        };

        const method = recordId ? 'PUT' : 'POST';
        const url = recordId ? `/update-vaccination/${recordId}` : '/add-vaccination';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(recordData)
        })
        .then(async response => {
            console.log(`Response status for ${method} ${url}:`, response.status);
            if (!response.ok) {
                 if (response.status === 401) {
                     alert('Session expired. Please log in again.');
                     window.location.href = 'loginpage.html';
                     return;
                 }
                 const contentType = response.headers.get('content-type');
                 if (contentType && contentType.includes('application/json')) {
                     const errorData = await response.json();
                     console.error(`Error response body for ${method} ${url}:`, errorData);
                     throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
                 } else {
                     const text = await response.text();
                     console.error(`Non-JSON error response for ${method} ${url}:`, text);
                     throw new Error(`HTTP error! status: ${response.status}. Server returned non-JSON: ${text.substring(0, 100)}...`);
                 }
            }
            return response.json();
        })
        .then(data => {
            console.log(data.message);
            alert(data.message || 'Record saved successfully!');
            closeVaccinationModal();
             // After saving, refresh records for the current pet, which will trigger updateDisplay
            fetchVaccinationRecords(petId); // Use petId from the modal form
        })
        .catch(error => {
            console.error('Error saving vaccination record:', error);
            alert('Failed to save vaccination record: ' + error.message);
        });
    }

    // Attach the Save Vaccination Form Submission listener
     if (vaccinationForm) { // Check if form element exists
        vaccinationForm.removeEventListener('submit', handleVaccinationFormSubmit); // Ensure no duplicates
        vaccinationForm.addEventListener('submit', handleVaccinationFormSubmit);
     } else {
         console.error("Vaccination form element #vaccinationForm not found.");
     }


    // Handle Delete Vaccination Button Click
    async function handleDeleteVaccination(recordId, petId) {
        if (!isLoggedIn) {
            alert('You must be logged in to delete vaccination records.');
            return;
        }

        // Ensure delete button exists
         const deleteVaccinationButton = document.getElementById('delete-vaccination-button');
         if (!deleteVaccinationButton) {
             console.error("Delete button element #delete-vaccination-button not found.");
             alert("Error performing delete action. Please try again."); // User feedback
             return;
         }


        const confirmDelete = confirm(`Are you sure you want to delete this vaccination record?`);

        if (!confirmDelete) {
            console.log('Vaccination deletion cancelled by user.');
            return; // Stop if user cancelled
        }

        console.log('User confirmed deletion of vaccination record ID:', recordId);

        try {
            const response = await fetch(`/delete-vaccination/${recordId}`, {
                method: 'DELETE',
            });

            console.log(`Response status for DELETE /delete-vaccination/${recordId}:`, response.status);
            if (response.ok) {
                const result = await response.json();
                console.log(result.message);
                alert(result.message || 'Record deleted successfully!');

                closeVaccinationModal(); // Close modal if open
                 // After deleting, refresh records for the current pet, which triggers updateDisplay
                fetchVaccinationRecords(petId);

            } else {
                 if (response.status === 401) {
                     alert('Session expired. Please log in again.');
                     window.location.href = 'loginpage.html';
                     return;
                 }
                 const contentType = response.headers.get('content-type');
                 if (contentType && contentType.includes('application/json')) {
                     const errorData = await response.json();
                     console.error('Failed to delete record:', errorData);
                     alert('Failed to delete record: ' + (errorData.error || 'Unknown error'));
                 } else {
                     const text = await response.text();
                     console.error(`Non-JSON error response for DELETE /delete-vaccination/${recordId}:`, text);
                     alert(`Failed to delete record: HTTP error! status: ${response.status}. Server returned non-JSON: ${text.substring(0, 100)}...`);
                 }
            }
        } catch (error) {
            console.error('Error deleting vaccination record:', error);
            alert('An error occurred while trying to delete the record.');
        }
    }


    // --- Sorting and Filtering Logic ---

    // Function to filter vaccination records
    // Applies search query to vaccine_name, vet_clinic, vet_in_charge fields
    function filterVaccinations(records, query) {
        const lowerCaseQuery = query.toLowerCase().trim();
        if (!lowerCaseQuery) {
            return records; // Return all records if query is empty
        }
        return records.filter(record =>
            (record.vaccine_name && String(record.vaccine_name).toLowerCase().includes(lowerCaseQuery)) ||
            (record.vet_clinic && String(record.vet_clinic).toLowerCase().includes(lowerCaseQuery)) ||
            (record.vet_in_charge && String(record.vet_in_charge).toLowerCase().includes(lowerCaseQuery))
        );
    }

    // Function to sort vaccination records
    // Takes the sort key and direction ('asc' or 'desc')
    // NOTE: This function expects keys like 'vaccine_name', 'date_administered', etc.
    // It relies on the values from the sort select element matching these keys.
    function sortVaccinations(records, key, direction) {
        const sortedRecords = [...records]; // Work on a shallow copy

        sortedRecords.sort((a, b) => {
            const valA = a[key];
            const valB = b[key];

            let comparison = 0;

            // Handle dates for sorting (checks if the key corresponds to a date field)
             if (key === 'date_administered' || key === 'next_due_date') {
                 // Treat missing/invalid dates as very early (epoch 0) for asc, very late (Infinity) for desc
                 const dateA = valA ? new Date(valA).getTime() : (direction === 'asc' ? 0 : Infinity);
                 const dateB = valB ? new Date(valB).getTime() : (direction === 'asc' ? 0 : Infinity);

                 if (dateA < dateB) comparison = -1;
                 if (dateA > dateB) comparison = 1;
             } else {
                // Default string comparison (case-insensitive) for other keys
                const stringA = String(valA || '').toLowerCase();
                const stringB = String(valB || '').toLowerCase();

                if (stringA < stringB) comparison = -1;
                if (stringA > stringB) comparison = 1;
            }

            // Apply direction
            return direction === 'desc' ? (comparison * -1) : comparison;
        });
        return sortedRecords;
    }

    // Function to update the displayed vaccination records based on current sort and filter
    // This function manages the visibility of messages, controls, and the table.
    function updateVaccineDisplay() {
        console.log("updateVaccineDisplay called.");
        console.log("State: selectedPetId =", selectedPetId, ", currentPetVaccinations.length =", currentPetVaccinations.length);
        console.log("State: allUserPets.length =", allUserPets.length);

         // Ensure required static elements exist before proceeding with display logic
         // Added controlsContainer check here
         if (!vaccinationTable || !vaccinationTableBody || !selectPetMessage || !noVaccinationMessage || !petNameHeading || !noRecordsAfterFilterMessage || !controlsContainer || !noPetsMessage) { // Added noPetsMessage check
            console.error("Update display aborted: Missing required HTML elements for vaccinations display logic.");
            console.warn("Ensure #vaccination-table, #vaccination-table-body, #select-pet-message, #no-vaccination-message, #selected-pet-name-heading, #no-records-after-filter, #vaccine-controls, and #no-pets-message exist."); // Corrected controls ID in warning
            // Attempt to hide the main content area if essential display elements are missing
            if(vaccinationContent) vaccinationContent.style.display = 'none'; // Hide the main content area if essential parts are missing
            // Note: notLoggedInMessage and welcomeHeader are handled in fetchData
            return;
         }

        // --- MESSAGE AND CONTROL VISIBILITY MANAGEMENT ---

        // Hide elements that might be visible from a previous state
        if (selectPetMessage) selectPetMessage.style.display = 'none';
        if (noVaccinationMessage) noVaccinationMessage.style.display = 'none';
        if (noRecordsAfterFilterMessage) noRecordsAfterFilterMessage.style.display = 'none';
        if (vaccinationTable) vaccinationTable.style.display = 'none';
        if (controlsContainer) controlsContainer.style.display = 'none';
        if (petNameHeading) petNameHeading.style.display = 'none'; // Hide heading initially
        // noPetsMessage is handled in fetchData based on allUserPets.length

        if (selectedPetId === null) {
             // Case 1: No pet is selected (either initially or after user selected placeholder)
             console.log("updateVaccineDisplay: No pet selected.");
             // Show "select pet" message only if the user has pets (otherwise noPetsMessage is shown by fetchData)
             if (allUserPets.length > 0 && selectPetMessage) {
                 selectPetMessage.style.display = 'block';
                 console.log("updateVaccineDisplay: Showing 'select pet' message.");
             } else if (allUserPets.length === 0) {
                  // If no pets at all, the noPetsMessage is handled by fetchData.
                  // Ensure selectPetMessage is hidden in this case.
                  if (selectPetMessage) selectPetMessage.style.display = 'none';
             }
             return; // Stop here
        }

        // Case 2: A pet IS selected
        console.log("updateVaccineDisplay: Pet selected.");

        // Update pet name display now that a pet is selected
        const selectedPet = allUserPets.find(pet => String(pet.id) === String(selectedPetId));
        if (petNameHeading && petNameSpan && selectedPet) {
             petNameSpan.textContent = selectedPet.name;
             petNameHeading.style.display = 'block'; // Show the heading
             console.log("updateVaccineDisplay: Showing pet name heading for", selectedPet.name);
        } else if (petNameHeading) {
             petNameHeading.style.display = 'none';
             console.log("updateVaccineDisplay: Hiding pet name heading (pet not found or elements missing).");
        }


        // Check if there are any records at all for the selected pet
        if (!currentPetVaccinations || currentPetVaccinations.length === 0) {
            // Pet is selected, but they have no records (before any filter/sort)
             console.log("updateVaccineDisplay: Selected pet has no records.");
             if (noVaccinationMessage) noVaccinationMessage.style.display = 'block'; // Show "No records found for this pet"
             console.log("updateVaccineDisplay: Showing 'no vaccination' message.");
            // Controls and table remain hidden
             return; // Stop here
        }

        // Case 3: Pet is selected AND they have records
        console.log("updateVaccineDisplay: Selected pet has records. Proceeding to filter/sort/display.");

        // 1. Start with the full list of records for the selected pet
        let recordsToDisplay = [...currentPetVaccinations]; // Work on a copy

        // 2. Apply Filtering (if search input exists and query is not empty)
        // Update the current search query state from the input field
        if (searchInput) {
             currentVaccineSearchQuery = searchInput.value;
             if (currentVaccineSearchQuery.trim() !== '') {
                 console.log("updateVaccineDisplay: Applying filter with query:", currentVaccineSearchQuery);
                 recordsToDisplay = filterVaccinations(recordsToDisplay, currentVaccineSearchQuery);
                 console.log("updateVaccineDisplay: Records after filter:", recordsToDisplay.length);
             } else {
                 console.log("updateVaccineDisplay: Search query is empty, no filtering applied.");
             }
        } else {
             currentVaccineSearchQuery = ''; // Ensure state is empty if input missing
             console.warn("Search input element #search-input not found. Filtering is disabled.");
        }

        // 3. Apply Sorting (if sort selects exist)
        // Update the current sort state from the select fields
         if (sortBySelect) {
             currentVaccineSortKey = sortBySelect.value;
         } else {
             currentVaccineSortKey = 'date_administered'; // Default if select is missing
             console.warn("Sort select element #sort-by not found. Defaulting sort key.");
         }

         if (sortDirectionSelect) {
             currentVaccineSortDirection = sortDirectionSelect.value;
         } else {
             currentVaccineSortDirection = 'asc'; // Default if select is missing
             console.warn("Sort direction select element #sort-direction not found. Defaulting sort direction.");
         }

         // Apply sorting if we have a key and records to sort
         if (currentVaccineSortKey && recordsToDisplay.length > 0) {
            console.log(`updateVaccineDisplay: Applying sort by "${currentVaccineSortKey}" direction "${currentVaccineSortDirection}".`);
            recordsToDisplay = sortVaccinations(recordsToDisplay, currentVaccineSortKey, currentVaccineSortDirection);
         } else {
             console.log("updateVaccineDisplay: No sorting applied (no key or no records).");
         }


        // 4. Display the filtered and sorted results by populating the table tbody
        console.log("updateVaccineDisplay: Calling displayVaccinationRecords with", recordsToDisplay.length, "records.");
        displayVaccinationRecords(recordsToDisplay); // This function populates the tbody and manages table visibility

        // 5. Manage the "No records after filter" message AFTER displayVaccinationRecords runs
        // Show this message ONLY if there were records for the pet initially (currentPetVaccinations.length > 0),
        // filtering was applied (currentVaccineSearchQuery is not empty), AND the result is zero records (recordsToDisplay.length === 0).
        if (currentPetVaccinations.length > 0 && recordsToDisplay.length === 0 && currentVaccineSearchQuery.trim() !== '') {
             console.log("updateVaccineDisplay: Showing 'No records after filter' message.");
             if(noRecordsAfterFilterMessage) noRecordsAfterFilterMessage.style.display = 'block';
             // The displayVaccinationRecords function will have hidden the table in this case.
        } else {
             console.log("updateVaccineDisplay: Hiding 'No records after filter' message.");
             // Hide filter message if filter resulted in records, filter wasn't applied, or no records existed initially (handled above)
             if(noRecordsAfterFilterMessage) noRecordsAfterFilterMessage.style.display = 'none';
        }

        // --- CONTROLS VISIBILITY ---
        // Ensure controls are visible if there are records for the pet (even if filter results in 0, user needs controls to clear filter)
         if (currentPetVaccinations.length > 0 && controlsContainer) {
             console.log("updateVaccineDisplay: Showing controls container.");
             controlsContainer.style.display = 'flex'; // Or 'block', depending on your CSS
         } else if (controlsContainer) {
              console.log("updateVaccineDisplay: Hiding controls container.");
             controlsContainer.style.display = 'none';
         }
        // --- End Controls Visibility ---
         console.log("updateVaccineDisplay finished.");
    }
    // --- End Update Display Logic ---


    // --- Event Listeners ---

    // Event listener for pet selection change
    // Created a dedicated function to handle the logic
    function handlePetSelectionChange(event) {
        console.log("handlePetSelectionChange called.");
         const newSelectedPetId = event.target.value;

         // Check if no pet is selected (e.g. selected the placeholder)
         if (!newSelectedPetId) {
             console.log("handlePetSelectionChange: No new pet selected (placeholder).");
             selectedPetId = null;
             currentPetVaccinations = []; // Clear records
             // Reset search and sort state to defaults, then update controls if they exist
             currentVaccineSearchQuery = '';
             if (searchInput) { searchInput.value = ''; }

             currentVaccineSortKey = sortBySelect ? sortBySelect.value : 'date_administered'; // Reset to default sort key
             const sortDirectionSelect = document.getElementById('sort-direction'); // Re-reference inside function
             currentVaccineSortDirection = sortDirectionSelect ? sortDirectionSelect.value : 'asc'; // Reset to default direction

             if (sortBySelect) { sortBySelect.value = currentVaccineSortKey; }
             if (sortDirectionSelect) { sortDirectionSelect.value = currentVaccineSortDirection; }

             // Call updateVaccineDisplay to handle showing the 'select pet' message etc.
             updateVaccineDisplay();
             return; // Exit
         }

         // If the same pet is manually re-selected, do nothing
         if (String(newSelectedPetId) === String(selectedPetId)) {
             console.log("handlePetSelectionChange: Same pet re-selected manually. No fetch needed.");
             // If necessary, could call updateVaccineDisplay() here to re-render with current filter/sort state
             return;
         }

        console.log("handlePetSelectionChange: Different pet selected:", newSelectedPetId);
         selectedPetId = newSelectedPetId; // Update the state variable
         currentPetVaccinations = []; // Clear previous pet's logs state

         // Update pet name display immediately for manual selection
         const selectedPet = allUserPets.find(pet => String(pet.id) === String(selectedPetId));
         if (petNameHeading && petNameSpan && selectedPet) {
              petNameSpan.textContent = selectedPet.name;
              petNameHeading.style.display = 'block'; // Show the heading
         } else if (petNameHeading) {
              petNameHeading.style.display = 'none'; // Hide heading if pet not found (shouldn't happen)
         } else {
             console.warn("Pet name display elements (#selected-pet-name-heading, #selected-pet-name) not found.");
         }


         // Reset search and sort state to defaults, then update controls if they exist
         currentVaccineSearchQuery = '';
         if (searchInput) { searchInput.value = ''; } // Use searchInput reference

         currentVaccineSortKey = sortBySelect ? sortBySelect.value : 'date_administered'; // Reset to default sort key
         const sortDirectionSelect = document.getElementById('sort-direction'); // Re-reference inside function
         currentVaccineSortDirection = sortDirectionSelect ? sortDirectionSelect.value : 'asc'; // Reset to default direction

          if (sortBySelect) { if(sortBySelect) sortBySelect.value = currentVaccineSortKey; } // Added check
          if (sortDirectionSelect) { if(sortDirectionSelect) sortDirectionSelect.value = currentVaccineSortDirection; } // Added check


         // Fetch records for the newly selected pet, which will trigger updateDisplay
         fetchVaccinationRecords(selectedPetId);
    }

    petSelect.addEventListener('change', handlePetSelectionChange);


    // Event listener for vaccination sort select change
    if (sortBySelect) { // Check if the sort select element exists
        sortBySelect.addEventListener('change', () => {
             console.log("Sort By select changed.");
             // State updated within updateVaccineDisplay
            updateVaccineDisplay(); // Update display with new sort order
        });
    } else {
        console.warn("Sort select element #sort-by not found. Sorting will not work.");
    }

    // Event listener for vaccination sort direction select change
    // Ensure the sort direction select exists before adding listener
    if (sortDirectionSelect) { // Use the already referenced sortDirectionSelect
         sortDirectionSelect.addEventListener('change', () => {
              console.log("Sort Direction select changed.");
             // State updated within updateVaccineDisplay
            updateVaccineDisplay(); // Update display with new sort direction
         });
    } else {
         console.warn("Sort direction select element #sort-direction not found. Sort direction control disabled.");
    }


    // Event listener for vaccination search input
    if (searchInput) { // Check if the search input element exists
        searchInput.addEventListener('input', () => { // Use 'input' for immediate filtering as user types
             console.log("Search input changed.");
             // State updated within updateVaccineDisplay
             updateVaccineDisplay(); // Update display with filter results
        });
    } else {
        console.warn("Search input element #search-input not found. Filtering will not work.");
    }

    // --- End Event Listeners ---


    // Initial setup: Fetch user info and pets when the page loads
    fetchData();

}); 