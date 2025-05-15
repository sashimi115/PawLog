// Keep the globally accessible modal function outside DOMContentLoaded
window.closeVetVisitModal = function() {
    const vetVisitModal = document.getElementById('vetVisitModal');
    if(vetVisitModal) vetVisitModal.style.display = 'none';
    const vetVisitForm = document.getElementById('vetVisitForm');
    if(vetVisitForm) vetVisitForm.reset();
    const visitIdInput = document.getElementById('visit-id');
    if(visitIdInput) visitIdInput.value = '';
    const modalPetIdInput = document.getElementById('modal-pet-id');
    if(modalPetIdInput) modalPetIdInput.value = '';
    const deleteVetVisitButton = document.getElementById('delete-vet-visit-button');
    if(deleteVetVisitButton) deleteVetVisitButton.style.display = 'none';
}


document.addEventListener('DOMContentLoaded', () => {
    // --- Idempotent check: Ensure this DOMContentLoaded logic runs only once ---
    // Using a unique dataset key for this script
    if (document.body.dataset.vetVisitsDomLoadedHandled) {
        console.warn("DOMContentLoaded already handled for vet visits script. Skipping duplicate execution.");
        return; // Exit the listener immediately
    }
    document.body.dataset.vetVisitsDomLoadedHandled = 'true';
    console.log("Handling DOMContentLoaded for vet visits script.");
    // --- End Idempotent check ---

    // Get references to DOM elements
    const notLoggedInMessage = document.getElementById("not-logged-in"); // Reference to the not-logged-in message element
    const vetVisitsContent = document.getElementById("vet-visits-content"); // Reference to the main content wrapper
    const signInOutButton = document.getElementById('signInOutButton');
    const petSelect = document.getElementById('pet-select');
    // Note: vetVisitsContainer is the div wrapping the table and messages
    const vetVisitsContainer = document.getElementById('vet-visits-container');
    // --- Ensure these message elements exist in your HTML ---
    const noVetVisitsMessage = document.getElementById('no-vet-visits-message'); // Message shown when no records are found for the pet (before filter/sort)
    const selectPetMessageVetVisits = document.getElementById('select-pet-message-vet-visits'); // Message shown when no pet is selected
    const noPetsMessage = document.getElementById('no-pets-message'); // Message shown when user has no pets
     const noRecordsAfterFilterMessageVetVisits = document.getElementById('no-records-after-filter-vet-visits'); // Message when filter results in nothing
    // --- End Message element references ---
    const addVetVisitButton = document.getElementById('add-vet-visit-button');
    const welcomeHeader = document.getElementById("welcome-header");
     // --- Ensure these pet name display elements exist in your HTML ---
    const petNameHeading = document.getElementById('selected-pet-name-heading'); // Heading for pet name (e.g., "Records for [Pet Name]")
    const petNameSpan = document.getElementById('selected-pet-name'); // Span inside the heading for the pet's name
    // --- End Pet name display references ---


    // Modal elements
    const vetVisitModal = document.getElementById('vetVisitModal');
    const modalTitle = document.getElementById('modal-title');
    const vetVisitForm = document.getElementById('vetVisitForm');
    const visitIdInput = document.getElementById('visit-id');
    const modalPetIdInput = document.getElementById('modal-pet-id');
    const visitDateInput = document.getElementById('visit-date');
    const clinicNameInput = document.getElementById('clinic-name');
    const vetNameInput = document.getElementById('vet-name');
    const reasonInput = document.getElementById('reason');
    const notesInput = document.getElementById('notes');
    const saveVetVisitButton = document.getElementById('save-vet-visit-button');
    const deleteVetVisitButton = document.getElementById('delete-vet-visit-button');

    // --- SORT AND SEARCH REFERENCES ---
    const sortBySelectVetVisits = document.getElementById('sort-by');
    const sortDirectionSelectVetVisits = document.getElementById('sort-direction');
    const searchInputVetVisits = document.getElementById('search-input-vet-visits');
    const controlsContainerVetVisits = document.getElementById('vet-visits-controls');
    const vetVisitsTable = document.getElementById('vet-visits-table');
    const vetVisitsTableBody = document.getElementById('vet-visits-table-body');
    // --- END SORT AND SEARCH REFERENCES ---


    let allUserPets = []; // To store the list of the user's pets
    let isLoggedIn = false; // Track login status

    // --- STATE VARIABLES FOR VET VISIT RECORDS SORT/FILTER ---
    let selectedPetId = null; // Store the ID of the currently selected pet
    let currentPetVetVisits = []; // Stores the FULL list of vet visits for the selected pet
    // Initialize sort/filter state based on HTML controls (assuming they exist, default if not)
    let currentVetVisitSortKey = sortBySelectVetVisits ? sortBySelectVetVisits.value : 'visit_date';
    let currentVetVisitSearchQuery = searchInputVetVisits ? searchInputVetVisits.value : '';
    let currentVetVisitSortDirection = sortDirectionSelectVetVisits ? sortDirectionSelectVetVisits.value : 'asc';
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


    // Function to fetch user info and pets (similar to other pages)
    function fetchData() {
        // Fetch user info first to check authentication status
        fetch('/get-profile')
            .then(async response => {
                console.log('Response status for /get-profile (Vet Visits):', response.status);
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
                    if (notLoggedInMessage) notLoggedInMessage.style.display = "block";
                    if (vetVisitsContent) vetVisitsContent.style.display = 'none';
                    if (welcomeHeader) welcomeHeader.style.display = "none"; // Hide welcome message
                    // --- End NOT LOGGED IN HANDLING ---

                    // Propagate error to stop the promise chain
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                            const err = await response.json();
                            console.error('Error response body for user info (Vet Visits):', err);
                            throw new Error(err.error || `HTTP error! status: ${response.status}`);
                    } else {
                            const text = await response.text();
                            console.error('Non-JSON error response for user info (Vet Visits):', text);
                            throw new Error(`HTTP error! status: ${response.status}. Server returned non-JSON: ${text.substring(0, 100)}...`);
                    }
                }
                return response.json(); // User is logged in
            })
            .then(data => {
                console.log('User info fetched successfully (Vet Visits):', data);
                isLoggedIn = true; // Confirm logged in state

                // --- LOGGED IN HANDLING ---
                if (welcomeHeader) {
                    welcomeHeader.textContent = `Hello, ${data.name}! Manage your pets' vet visit records.`;
                    welcomeHeader.style.display = "block";
                }
                 // Update sign-in/out button
                 if (signInOutButton) {
                     signInOutButton.textContent = 'SIGN OUT';
                     signInOutButton.href = '#'; // Handled by JS listener
                     signInOutButton.classList.remove('sign-in-btn');
                     signInOutButton.classList.add('sign-out-btn');
                 }
                // Hide not logged in message and show content
                if (notLoggedInMessage) notLoggedInMessage.style.display = "none";
                if (vetVisitsContent) vetVisitsContent.style.display = 'block';
                // --- End LOGGED IN HANDLING ---


                // Now fetch pets since the user is authenticated
                return fetch('/get-user-pets');
            })
            .then(response => {
                console.log('Response status for /get-user-pets (Vet Visits):', response.status);
                if (!response.ok) {
                     throw new Error('Failed to fetch pets for vet visits');
                }
                return response.json();
            })
            .then(pets => {
                console.log('Pets fetched successfully (Vet Visits):', pets);
                allUserPets = pets;
                populatePetSelect(pets);

                if (allUserPets.length > 0) {
                    addVetVisitButton.style.display = 'block';
                    // *** MESSAGE VISIBILITY: Hide no pets message if pets are found ***
                    if (noPetsMessage) noPetsMessage.style.display = 'none';

                    // Automatically select the first pet
                    selectedPetId = allUserPets[0].id;
                    petSelect.value = selectedPetId;

                    // Update pet name display immediately for initial load
                    const selectedPet = allUserPets.find(pet => String(pet.id) === String(selectedPetId));
                     if (petNameHeading && petNameSpan && selectedPet) {
                          petNameSpan.textContent = selectedPet.name;
                          petNameHeading.style.display = 'block'; // Show the heading
                     } else if (petNameHeading) {
                         petNameHeading.style.display = 'none'; // Hide heading if pet not found (shouldn't happen here)
                     }

                    // Directly fetch and display records for the first pet on load
                    fetchVetVisitRecords(selectedPetId);


                } else {
                    addVetVisitButton.style.display = 'none';
                     // *** MESSAGE VISIBILITY: Show no pets message if no pets are found ***
                    if (noPetsMessage) noPetsMessage.style.display = 'block';

                    selectedPetId = null; // No pets selected
                    currentPetVetVisits = []; // Clear state
                     if(petNameHeading) petNameHeading.style.display = 'none'; // Hide heading if no pets
                    // Calling updateVetVisitDisplay here will handle showing the 'select pet' message
                    updateVetVisitDisplay();
                }
            })
            .catch(error => {
                console.error('Error during initial load (pets/vet visits):', error);
                 // This catch handles errors *after* successful profile fetch (e.g., failure to fetch pets)
                 if (isLoggedIn) { // Only show specific messages if logged in but fetch failed
                    allUserPets = [];
                    populatePetSelect([]);
                    selectedPetId = null;
                    currentPetVetVisits = [];
                    // Call updateVetVisitDisplay to handle messages (will likely show 'select pet' or similar)
                    updateVetVisitDisplay();
                    addVetVisitButton.style.display = 'none';
                    // *** MESSAGE VISIBILITY: Show no pets message on error if logged in but couldn't fetch pets ***
                    if (noPetsMessage) noPetsMessage.style.display = 'block';
                 } // If not logged in, the catch for /get-profile handles the state and messages.
            });
    }

    // Function to populate the pet dropdown (reused)
    function populatePetSelect(pets) {
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

    // Function to handle pet selection change (Modified)
    // This function will be triggered by the 'change' listener on petSelect
    function handlePetSelectionChange(event) {
         const newSelectedPetId = event.target.value;

         // Check if no pet is selected OR if a DIFFERENT pet is selected
         if (!newSelectedPetId) { // If user selected the disabled placeholder or no pet exists
             selectedPetId = null;
             currentPetVetVisits = []; // Clear records
             // Reset sort/filter controls and state
             if(sortBySelectVetVisits) { sortBySelectVetVisits.value = 'visit_date'; currentVetVisitSortKey = 'visit_date'; }
             if(sortDirectionSelectVetVisits) { sortDirectionSelectVetVisits.value = 'asc'; currentVetVisitSortDirection = 'asc'; }
             if(searchInputVetVisits) { searchInputVetVisits.value = ''; currentVetVisitSearchQuery = ''; }

              if(petNameHeading) petNameHeading.style.display = 'none'; // Hide pet name heading
             // Call updateVetVisitDisplay to handle showing the 'select pet' message
             updateVetVisitDisplay();
             return; // Exit
         }

         // If the same pet is manually re-selected, do nothing
         if (String(newSelectedPetId) === String(selectedPetId)) {
             console.log("Same pet re-selected manually. No fetch needed.");
             // We don't need to re-fetch, but we might need to re-apply current filter/sort if state changed outside this handler (unlikely with current code)
             // Calling updateVetVisitDisplay() here would re-render with current data and filter/sort settings.
             // For now, assume state changes only trigger updateDisplay, so just return.
             return;
         }


         selectedPetId = newSelectedPetId; // Update the state variable

         // Update pet name display (if elements exist) for manual selection
         const selectedPet = allUserPets.find(pet => String(pet.id) === String(selectedPetId));
         if (petNameHeading && petNameSpan) {
              if (selectedPet) {
                  petNameSpan.textContent = selectedPet.name;
                  petNameHeading.style.display = 'block'; // Show the heading
              } else {
                   // This case should ideally not happen if the pet was in allUserPets
                  petNameHeading.style.display = 'none'; // Hide the heading
              }
         } else {
              console.warn("Pet name display elements (#selected-pet-name-heading, #selected-pet-name) not found.");
         }


         // Reset filter/sort controls and state to defaults when selecting a new pet
         if(sortBySelectVetVisits) { sortBySelectVetVisits.value = 'visit_date'; currentVetVisitSortKey = 'visit_date'; }
         if(sortDirectionSelectVetVisits) { sortDirectionSelectVetVisits.value = 'asc'; currentVetVisitSortDirection = 'asc'; }
         if(searchInputVetVisits) { searchInputVetVisits.value = ''; currentVetVisitSearchQuery = ''; }


         fetchVetVisitRecords(selectedPetId); // Fetch records for the newly selected pet
    }


    // Function to fetch vet visit records for a selected pet (Modified)
    function fetchVetVisitRecords(petId) {
        if (!petId || !isLoggedIn) {
             selectedPetId = null; // Ensure state is correct
             currentPetVetVisits = []; // Clear records
             // Call updateVetVisitDisplay to handle showing the 'select pet' message
             updateVetVisitDisplay();
             return;
        }

        console.log(`Workspaceing vet visit records for pet ID: ${petId}`);

        fetch(`/get-pet-vetvisits/${petId}`)
             .then(async response => {
                console.log(`Response status for /get-pet-vetvisits/${petId}:`, response.status);
                if (!response.ok) {
                     if (response.status === 401) {
                         alert('Session expired. Please log in again.');
                         window.location.href = 'loginpage.html';
                         return;
                     }
                     const contentType = response.headers.get('content-type');
                     if (contentType && contentType.includes('application/json')) {
                             const err = await response.json();
                             console.error('Error response body for get vet visits:', err);
                             throw new Error(err.error || `HTTP error! status: ${response.status}`);
                     } else {
                             const text = await response.text();
                             console.error('Non-JSON error response for get vet visits:', text);
                             throw new Error(`HTTP error! status: ${response.status}. Server returned non-JSON: ${text.substring(0, 100)}...`);
                     }
                }
                return response.json();
             })
             .then(records => {
                 console.log(`Workspaceed ${records.length} vet visit records for pet ID ${petId}:`, records);
                 currentPetVetVisits = records; // Store the full list of records
                 // Call updateVetVisitDisplay to handle showing records or 'no records for pet' message
                 updateVetVisitDisplay();
             })
             .catch(error => {
                 console.error('Error fetching vet visit records:', error);
                 alert('Could not fetch vet visit records: ' + error.message);
                 currentPetVetVisits = []; // Clear records on error
                 // Call updateVetVisitDisplay to handle showing 'no records for pet' message or error state
                 updateVetVisitDisplay();
             });
    }

    // Function to display vet visit records by populating a static TBODY (Modified)
    // Requires a <table id="vet-visits-table"> with a <tbody id="vet-visits-table-body"> in the HTML
    // This function is called BY updateVetVisitDisplay with filtered/sorted records
    function displayVetVisitRecords(recordsToRender) { // Changed parameter name for clarity
        // Get references to the static table and tbody elements
        const vetVisitsTable = document.getElementById('vet-visits-table');
        const vetVisitsTableBody = document.getElementById('vet-visits-table-body');

        // Check if the required static elements exist
        if (!vetVisitsTable || !vetVisitsTableBody) {
             console.error("Error: Required HTML elements for vet visits table display not found (#vet-visits-table or #vet-visits-table-body).");
             console.warn("Ensure your HTML includes these elements.");
             // Message visibility is handled by updateVetVisitDisplay
             if(vetVisitsTable) vetVisitsTable.style.display = 'none';
             if(vetVisitsTableBody) vetVisitsTableBody.innerHTML = ''; // Attempt to clear tbody
             return;
        }

        // Clear existing rows from the tbody
        vetVisitsTableBody.innerHTML = '';


        if (!recordsToRender || recordsToRender.length === 0) {
             // This case is handled by updateVetVisitDisplay determining which "no records" message to show.
             // Here, we just ensure the table is hidden and tbody is empty.
             if(vetVisitsTable) vetVisitsTable.style.display = 'none'; // Hide the static table
             return; // Stop here if no records to render
        }

        // If there are records to render, show the table
         if(vetVisitsTable) vetVisitsTable.style.display = ''; // Show the static table


        // Populate the tbody with record rows
        recordsToRender.forEach(record => {
             const recordRow = createVetVisitRecordRow(record);
             vetVisitsTableBody.appendChild(recordRow);
        });

    }


    // Function to create a TABLE ROW element for a single vet visit record (reused with minor changes)
    function createVetVisitRecordRow(record) {
        const recordRow = document.createElement('tr');
        recordRow.dataset.visitId = record.id;
        recordRow.dataset.petId = record.pet_id;

        // Format date for display
        const visitDate = record.visit_date ? new Date(record.visit_date).toLocaleDateString() : 'N/A';

        recordRow.innerHTML = `
             <td>${visitDate}</td>
             <td>${record.clinic_name || 'N/A'}</td>
             <td>${record.vet_name || 'N/A'}</td>
             <td>${record.reason || 'N/A'}</td>
             <td>${record.notes || 'N/A'}</td>
             <td class="visit-actions"> <button class="edit-visit-btn btn-small">Edit</button> <button class="delete-visit-btn btn-small">Delete</button> </td>
        `; // Added btn-small class for consistency if you have it


        // Add event listeners for edit and delete buttons within the row
        const editButton = recordRow.querySelector('.edit-visit-btn');
        if (editButton) {
             editButton.addEventListener('click', (event) => {
                 event.stopPropagation(); // Prevent row click if row itself becomes clickable later
                 openVetVisitModal(record); // Open modal for editing
             });
        }

        const deleteButton = recordRow.querySelector('.delete-visit-btn');
        if (deleteButton) {
             deleteButton.addEventListener('click', (event) => {
                 event.stopPropagation(); // Prevent row click if row itself becomes clickable later
                 handleDeleteVetVisit(record.id, record.pet_id); // Handle deletion
             });
        }

        return recordRow;
    }


    // Function to open the vet visit modal (reused)
    function openVetVisitModal(record = null) {
        // Check if logged in before opening modal
        if (!isLoggedIn) {
            alert('You must be logged in to add/edit vet visit records.');
            return;
        }

        vetVisitForm.reset(); // Reset the form first
        deleteVetVisitButton.style.display = 'none'; // Hide delete button by default

        if (record) {
            // Editing existing record
            modalTitle.textContent = 'Edit Vet Visit Record';
            visitIdInput.value = record.id;
            modalPetIdInput.value = record.pet_id; // Set pet ID for the modal
            // Ensure dates are in 'YYYY-MM-DD' format for input type="date"
            visitDateInput.value = record.visit_date ? new Date(record.visit_date).toISOString().split('T')[0] : '';
            clinicNameInput.value = record.clinic_name || '';
            vetNameInput.value = record.vet_name || '';
            reasonInput.value = record.reason || '';
            notesInput.value = record.notes || '';
            deleteVetVisitButton.style.display = 'inline-block'; // Show delete button
        } else {
            // Adding new record
            modalTitle.textContent = 'Add Vet Visit Record';
            visitIdInput.value = ''; // Clear record ID
            // Set the currently selected pet's ID in the modal's hidden input
            modalPetIdInput.value = selectedPetId; // Use the selectedPetId state variable

            // Optionally set current date for new records
            const now = new Date();
            visitDateInput.value = now.toISOString().split('T')[0];
             clinicNameInput.value = '';
             vetNameInput.value = '';
             reasonInput.value = '';
             notesInput.value = '';
        }
        vetVisitModal.style.display = 'block';
    }

    // Function to close the vet visit modal (Global function)
    // Defined globally outside DOMContentLoaded


    // Handle Add Vet Visit Button click (Modified to check for selected pet)
    addVetVisitButton.addEventListener('click', () => {
        if (selectedPetId) { // Only open if a pet is selected
            // selectedPetId is already set by the pet select listener or initial load
            modalPetIdInput.value = selectedPetId; // Set the modal's hidden pet ID
            openVetVisitModal();
        } else {
            alert('Please select a pet first to add a vet visit record.');
        }
    });


     // Define the Save Vet Visit Form Submission handler as a named function
    function handleVetVisitFormSubmit(event) {
        event.preventDefault(); // Prevent default form submission (page reload)

        if (!isLoggedIn) {
            alert('You must be logged in to save vet visit records.');
            return;
        }

        const visitId = visitIdInput.value;
        // Get petId from the hidden input in the modal form
        const petId = modalPetIdInput.value;

        if (!petId) {
            console.error('Error: Pet ID missing from modal form.');
            alert('Error: Could not determine pet for this record.'); // User feedback
            return;
        }

        const visitDate = visitDateInput.value;
        const clinicName = clinicNameInput.value.trim();
        const vetName = vetNameInput.value.trim();
        const reason = reasonInput.value.trim();
        const notes = notesInput.value.trim();


        if (!visitDate) {
             alert('Please fill in Visit Date.');
             return;
        }

        const recordData = {
            pet_id: petId, // Use the petId from the modal's hidden input
            visit_date: visitDate,
            clinic_name: clinicName || null,
            vet_name: vetName || null,
            reason: reason || null,
            notes: notes || null
        };

        const method = visitId ? 'PUT' : 'POST';
        const url = visitId ? `/update-vetvisit/${visitId}` : '/add-vetvisit';

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
                    console.error('Error response body:', errorData);
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
            closeVetVisitModal();
            // After saving, refresh records for the current pet, which will trigger updateDisplay
            fetchVetVisitRecords(petId); // Use petId from the modal form
        })
        .catch(error => {
            console.error('Error saving vet visit record:', error);
            alert('Failed to save vet visit record: ' + error.message);
        });
    }

    // Attach the Save Vet Visit Form Submission listener
    if (vetVisitForm) { // Check if form element exists
        vetVisitForm.removeEventListener('submit', handleVetVisitFormSubmit); // Ensure no duplicates
        vetVisitForm.addEventListener('submit', handleVetVisitFormSubmit);
    } else {
        console.error("Vet visit form element #vetVisitForm not found.");
    }


    // Handle Delete Vet Visit Button Click
    async function handleDeleteVetVisit(visitId, petId) {
        if (!isLoggedIn) {
            alert('You must be logged in to delete vet visit records.');
            return;
        }

        const confirmDelete = confirm(`Are you sure you want to delete this vet visit record?`);

        if (!confirmDelete) {
            console.log('Vet visit deletion cancelled by user.');
            return;
        }

        console.log('User confirmed deletion of vet visit record ID:', visitId);

        try {
            const response = await fetch(`/delete-vetvisit/${visitId}`, {
                method: 'DELETE',
            });

            console.log(`Response status for DELETE /delete-vetvisit/${visitId}:`, response.status);
            if (response.ok) {
                const result = await response.json();
                console.log(result.message);
                alert(result.message || 'Record deleted successfully!');

                closeVetVisitModal(); // Close modal if open
                // After deleting, refresh records for the current pet, which triggers updateDisplay
                fetchVetVisitRecords(petId);

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
                     console.error(`Non-JSON error response for DELETE /delete-vetvisit/${visitId}:`, text);
                     alert(`Failed to delete record: HTTP error! status: ${response.status}. Server returned non-JSON: ${text.substring(0, 100)}...`);
                 }
            }
        } catch (error) {
            console.error('Error deleting vet visit record:', error);
            alert('An error occurred while trying to delete the record.');
        }
    }

    // --- Sorting and Filtering Logic ---

    // Function to filter vet visit records
    // Applies search query to clinic_name, vet_name, reason, notes fields
    function filterVetVisits(records, query) {
        const lowerCaseQuery = query.toLowerCase().trim();
        if (!lowerCaseQuery) {
            return records; // Return all records if query is empty
        }
        return records.filter(record =>
            (record.clinic_name && String(record.clinic_name).toLowerCase().includes(lowerCaseQuery)) ||
            (record.vet_name && String(record.vet_name).toLowerCase().includes(lowerCaseQuery)) ||
            (record.reason && String(record.reason).toLowerCase().includes(lowerCaseQuery)) ||
            (record.notes && String(record.notes).toLowerCase().includes(lowerCaseQuery))
        );
    }

    // Function to sort vet visit records
    // Takes the sort key and direction ('asc' or 'desc')
    function sortVetVisits(records, key, direction) {
        const sortedRecords = [...records]; // Work on a shallow copy

        sortedRecords.sort((a, b) => {
            const valA = a[key];
            const valB = b[key];

            let comparison = 0;

            // Handle dates for sorting (checks if the key is 'visit_date')
            if (key === 'visit_date') {
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

    // Function to update the displayed vet visit records based on current sort and filter
    // This function manages the visibility of messages and controls.
    function updateVetVisitDisplay() {
        // Ensure required static elements exist before proceeding with display logic
         if (!vetVisitsTable || !vetVisitsTableBody || !controlsContainerVetVisits || !selectPetMessageVetVisits || !noVetVisitsMessage || !noRecordsAfterFilterMessageVetVisits || !petNameHeading) {
            console.error("Update display aborted: Missing required HTML elements for vet visits.");
            // Attempt to hide content if elements are missing, though errors logged above
            if(vetVisitsContent) vetVisitsContent.style.display = 'none';
            return;
         }

        // --- MESSAGE VISIBILITY: Handle cases based on selected pet and data availability ---

        if (selectedPetId === null) {
            // No pet selected (either initially or after user selected placeholder)
             if(selectPetMessageVetVisits) selectPetMessageVetVisits.style.display = 'block';
             if(noVetVisitsMessage) noVetVisitsMessage.style.display = 'none';
             if(noRecordsAfterFilterMessageVetVisits) noRecordsAfterFilterMessageVetVisits.style.display = 'none';
             if(vetVisitsTable) vetVisitsTable.style.display = 'none'; // Hide the table
             if(controlsContainerVetVisits) controlsContainerVetVisits.style.display = 'none'; // Hide controls
             if(petNameHeading) petNameHeading.style.display = 'none'; // Hide pet name heading
             // noPetsMessage is handled in fetchData
            return; // Stop here, nothing to display
        }

         // A pet is selected, hide the "Select a pet" message
         if(selectPetMessageVetVisits) selectPetMessageVetVisits.style.display = 'none';


        // Check if there are any records at all for the selected pet
        if (!currentPetVetVisits || currentPetVetVisits.length === 0) {
            // Pet is selected, but they have no records (before any filter/sort)
            if(noVetVisitsMessage) noVetVisitsMessage.style.display = 'block'; // Show "No records found for this pet"
            if(noRecordsAfterFilterMessageVetVisits) noRecordsAfterFilterMessageVetVisits.style.display = 'none'; // Hide filter message
            if(vetVisitsTable) vetVisitsTable.style.display = 'none'; // Hide the table
            if(controlsContainerVetVisits) controlsContainerVetVisits.style.display = 'none'; // Hide controls
            // petNameHeading visibility handled by handlePetSelectionChange or fetchData
            // noPetsMessage is handled in fetchData
            return; // Stop here
        }

        // If we have records for the pet, hide the "No records found for this pet" message
        if(noVetVisitsMessage) noVetVisitsMessage.style.display = 'none';

        // --- End Message Visibility Management (before filtering/sorting) ---


        // 1. Start with the full list of records for the selected pet
        let recordsToDisplay = [...currentPetVetVisits]; // Work on a copy

        // 2. Apply Filtering (if search input exists and query is not empty)
        // Update the current search query state from the input field
        if (searchInputVetVisits) {
             currentVetVisitSearchQuery = searchInputVetVisits.value;
             if (currentVetVisitSearchQuery.trim() !== '') {
                 recordsToDisplay = filterVetVisits(recordsToDisplay, currentVetVisitSearchQuery);
             }
        } else {
             currentVetVisitSearchQuery = ''; // Ensure state is empty if input missing
             console.warn("Search input element #search-input-vet-visits not found. Filtering is disabled.");
        }


        // 3. Apply Sorting (if sort selects exist)
        // Update the current sort state from the select fields
         if (sortBySelectVetVisits) {
             currentVetVisitSortKey = sortBySelectVetVisits.value;
         } else {
             currentVetVisitSortKey = 'visit_date'; // Default if select is missing
             console.warn("Sort select element #sort-by-vet-visits not found. Defaulting sort key.");
         }

         if (sortDirectionSelectVetVisits) {
             currentVetVisitSortDirection = sortDirectionSelectVetVisits.value;
         } else {
             currentVetVisitSortDirection = 'asc'; // Default if select is missing
             console.warn("Sort direction select element #sort-direction-vet-visits not found. Defaulting sort direction.");
         }

         // Apply sorting if we have a key
         if (currentVetVisitSortKey) {
            recordsToDisplay = sortVetVisits(recordsToDisplay, currentVetVisitSortKey, currentVetVisitSortDirection);
         }


        // 4. Display the filtered and sorted results by populating the table tbody
        displayVetVisitRecords(recordsToDisplay); // This function populates the tbody and manages table visibility

        // 5. --- MESSAGE VISIBILITY: Manage the "No records after filter" message AFTER displayVetVisitRecords runs ---
        // Show this message ONLY if there were records for the pet initially (currentPetVetVisits.length > 0),
        // filtering was applied (currentVetVisitSearchQuery is not empty), AND the result is zero records (recordsToDisplay.length === 0).
        if (currentPetVetVisits.length > 0 && recordsToDisplay.length === 0 && currentVetVisitSearchQuery.trim() !== '') {
             if(noRecordsAfterFilterMessageVetVisits) noRecordsAfterFilterMessageVetVisits.style.display = 'block';
             // The displayVetVisitRecords function will have hidden the table in this case.
        } else {
             // Hide filter message if filter resulted in records, filter wasn't applied, or no records existed initially (handled above)
             if(noRecordsAfterFilterMessageVetVisits) noRecordsAfterFilterMessageVetVisits.style.display = 'none';
        }

        // --- CONTROLS VISIBILITY ---
        // Ensure controls are visible if there are records for the pet (even if filter results in 0, user needs controls to clear filter)
         if (currentPetVetVisits.length > 0 && controlsContainerVetVisits) {
             controlsContainerVetVisits.style.display = 'flex'; // Or 'block', depending on your CSS
         } else if (controlsContainerVetVisits) {
             controlsContainerVetVisits.style.display = 'none';
         }
        // --- End Controls Visibility ---

    }

    // --- Event Listeners for Sorting and Filtering ---

    // Listen for changes on the sort by select
    if (sortBySelectVetVisits) {
         sortBySelectVetVisits.addEventListener('change', () => {
             // State updated inside updateVetVisitDisplay
             updateVetVisitDisplay(); // Re-filter and re-sort
         });
    }

    // Listen for changes on the sort direction select
    if (sortDirectionSelectVetVisits) {
         sortDirectionSelectVetVisits.addEventListener('change', () => {
             // State updated inside updateVetVisitDisplay
             updateVetVisitDisplay(); // Re-filter and re-sort
         });
    }

    // Listen for input on the search input
    if (searchInputVetVisits) {
         searchInputVetVisits.addEventListener('input', () => { // Use 'input' for immediate filtering
             // State updated inside updateVetVisitDisplay
             updateVetVisitDisplay(); // Re-filter and re-sort
         });
    }

    // --- End Sorting and Filtering Logic ---


     // Event listener for pet selection change
    petSelect.addEventListener('change', handlePetSelectionChange);


    // Initial setup: Fetch user info and pets when the page loads
    fetchData();

}); // End DOMContentLoaded