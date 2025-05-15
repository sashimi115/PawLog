// Keep the globally accessible modal function outside DOMContentLoaded
// Re-defined here for clarity and robustness, assuming it might be called from HTML
window.closeFeedingLogModal = function() {
    const feedingLogModal = document.getElementById('feedingLogModal');
    if(feedingLogModal) feedingLogModal.style.display = 'none';
    const feedingLogForm = document.getElementById('feedingLogForm');
    if(feedingLogForm) feedingLogForm.reset();
    const logIdInput = document.getElementById('log-id');
    if(logIdInput) logIdInput.value = '';
    const modalPetIdInput = document.getElementById('modal-pet-id');
    if(modalPetIdInput) modalPetIdInput.value = '';
    const deleteFeedingLogButton = document.getElementById('delete-feedinglog-button');
    if(deleteFeedingLogButton) deleteFeedingLogButton.style.display = 'none';
}


document.addEventListener('DOMContentLoaded', () => {
    // --- Idempotent check: Ensure this DOMContentLoaded logic runs only once ---
    // This prevents multiple event listeners from being attached if the script is somehow executed multiple times.
    if (document.body.dataset.feedingLogsDomLoadedHandled) {
        console.warn("DOMContentLoaded already handled for feeding logs script. Skipping duplicate execution.");
        return; // Exit the listener immediately
    }
    document.body.dataset.feedingLogsDomLoadedHandled = 'true';
    console.log("Handling DOMContentLoaded for feeding logs script.");
    // --- End Idempotent check ---


    // Get references to DOM elements
    const notLoggedInMessage = document.getElementById("not-logged-in");
    const feedingLogsContent = document.getElementById("feeding-logs-content");
    const signInOutButton = document.getElementById('signInOutButton');
    const petSelect = document.getElementById('pet-select');
    const feedingLogsContainer = document.getElementById('feeding-logs-container'); // The container where the table is dynamically built
    const noFeedingLogsMessage = document.getElementById('no-feeding-logs-message'); // Message for pet with no logs
    const noPetsMessage = document.getElementById('no-pets-message'); // Message when user has no pets
    const addFeedingLogButton = document.getElementById('add-feedinglog-button');
    const welcomeHeader = document.getElementById("welcome-header"); // Assuming you have a welcome header on this page too
    const selectPetMessage = document.getElementById('select-pet-message'); // Message to select a pet (Need this element in HTML)
    // Assuming you have pet name display elements like on other pages
    const petNameHeading = document.getElementById('selected-pet-name-heading');
    const petNameSpan = document.getElementById('selected-pet-name');


    // Modal elements
    const feedingLogModal = document.getElementById('feedingLogModal');
    const modalTitle = document.getElementById('modal-title');
    const feedingLogForm = document.getElementById('feedingLogForm');
    const logIdInput = document.getElementById('log-id'); // Hidden input for log ID
    const modalPetIdInput = document.getElementById('modal-pet-id'); // Hidden input for pet ID in modal
    const feedingTimeInput = document.getElementById('feeding-time');
    const foodTypeInput = document.getElementById('food-type');
    const amountInput = document.getElementById('amount');
    const notesInput = document.getElementById('notes');
    const saveFeedingLogButton = document.getElementById('save-feedinglog-button');
    const deleteFeedingLogButton = document.getElementById('delete-feedinglog-button');


    let allUserPets = []; // To store the list of the user's pets
    let isLoggedIn = false; // Track login status
    let selectedPetId = null; // Store the ID of the currently selected pet
    let currentPetFeedingLogs = []; // Stores the FULL list of feeding logs for the selected pet


    // Function to handle user sign out (reused from other scripts)
    function handleSignOut(event) {
        event.preventDefault(); // Prevent the default link behavior

        fetch('/logout', {
            method: 'POST',
        })
        .then(response => {
            if (response.ok) {
                console.log('Logged out successfully from server.');
                window.location.href = 'loginpage.html';
            } else {
                console.error('Logout failed');
                alert('Logout failed. Please try again.'); // Changed console.error to alert for user feedback
            }
        })
        .catch(error => {
            console.error('Error during logout:', error);
             alert('Error during logout. Please check your connection.'); // Changed console.error to alert for user feedback
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
                    console.log('Response status for /get-profile (Feeding Logs):', response.status);
                    if (!response.ok) {
                         // --- NOT LOGGED IN HANDLING ---
                         console.error('User not authenticated or error fetching profile.');
                         isLoggedIn = false;
                         // Update sign-in/out button
                         if (signInOutButton) {
                             signInOutButton.textContent = 'SIGN IN';
                             signInOutButton.href = 'loginpage.html';
                             signInOutButton.classList.remove('sign-out-btn');
                             signInOutButton.classList.add('sign-in-btn');
                         }
                         // Show not logged in message and hide content
                         if (notLoggedInMessage) notLoggedInMessage.style.display = "block";
                         if (feedingLogsContent) feedingLogsContent.style.display = 'none';
                         if (welcomeHeader) welcomeHeader.style.display = "none"; // Hide welcome message
                         // Ensure other messages are hidden if not logged in
                          if (selectPetMessage) selectPetMessage.style.display = 'none';
                          if (noFeedingLogsMessage) noFeedingLogsMessage.style.display = 'none';
                          if (noPetsMessage) noPetsMessage.style.display = 'none';


                         // Propagate error to stop the promise chain
                         const contentType = response.headers.get('content-type');
                         if (contentType && contentType.includes('application/json')) {
                               const err = await response.json();
                               console.error('Error response body for user info (Feeding Logs):', err);
                               throw new Error(err.error || `HTTP error! status: ${response.status}`);
                         } else {
                               const text = await response.text();
                               console.error('Non-JSON error response for user info (Feeding Logs):', text);
                               throw new Error(`HTTP error! status: ${response.status}. Server returned non-JSON: ${text.substring(0, 100)}...`);
                         }
                    }
                    return response.json(); // User is logged in
               })
               .then(data => {
                   console.log('User info fetched successfully (Feeding Logs):', data);
                   isLoggedIn = true; // Confirm logged in state

                   // --- LOGGED IN HANDLING ---
                    if (welcomeHeader) {
                       welcomeHeader.textContent = `Hello, ${data.name}! Manage your pets' feeding logs.`;
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
                   if (feedingLogsContent) feedingLogsContent.style.display = 'block';
                   // --- End LOGGED IN HANDLING ---

                   // Now fetch pets since the user is authenticated
                   return fetch('/get-user-pets');
               })
               .then(response => {
                   console.log('Response status for /get-user-pets (Feeding Logs):', response.status);
                   if (!response.ok) {
                        throw new Error('Failed to fetch pets for feeding logs');
                   }
                   return response.json();
               })
               .then(pets => {
                    console.log('Pets fetched successfully (Feeding Logs):', pets);
                    allUserPets = pets; // Store the fetched pets
                    populatePetSelect(pets); // Populate the dropdown

                    if (allUserPets.length > 0) {
                         addFeedingLogButton.style.display = 'block';
                         // Hide no pets message if pets exist
                         if (noPetsMessage) noPetsMessage.style.display = 'none';

                         // *** MODIFIED: Automatically select the first pet and load logs ***
                         selectedPetId = allUserPets[0].id;
                         if(petSelect) petSelect.value = selectedPetId; // Set the dropdown value

                         // Update pet name display immediately for initial load
                         const selectedPet = allUserPets.find(pet => String(pet.id) === String(selectedPetId));
                          if (petNameHeading && petNameSpan && selectedPet) {
                               petNameSpan.textContent = selectedPet.name;
                               petNameHeading.style.display = 'block'; // Show the heading
                          } else if (petNameHeading) {
                              petNameHeading.style.display = 'none'; // Hide heading if pet not found (shouldn't happen here)
                          }

                         // Directly fetch and display logs for the first pet on load
                         fetchFeedingLogs(selectedPetId);

                    } else {
                         // No pets found for the user
                         addFeedingLogButton.style.display = 'none';
                         selectedPetId = null; // No pet selected
                         currentPetFeedingLogs = []; // Clear logs state
                         if(petNameHeading) petNameHeading.style.display = 'none'; // Hide heading

                         // Show no pets message
                         if (noPetsMessage) noPetsMessage.style.display = 'block';

                         // Call update display to hide table/messages
                         updateFeedingLogsDisplay();
                    }
               })
               .catch(error => {
                   console.error('Error during initial load (pets/feeding logs):', error);
                    // This catch handles errors *after* successful profile fetch (e.g., failure to fetch pets)
                    if (isLoggedIn) { // Only show specific messages if logged in but fetch failed
                       allUserPets = [];
                       populatePetSelect([]); // Clear dropdown
                       selectedPetId = null;
                       currentPetFeedingLogs = [];
                       // Call update display to handle messages (will likely show 'select pet' or similar)
                       updateFeedingLogsDisplay();
                       addFeedingLogButton.style.display = 'none';
                       // Ensure no pets message is shown if fetch pets failed but user is logged in
                       if (noPetsMessage) noPetsMessage.style.display = 'block';
                    } // If not logged in, the catch for /get-profile handles the state and messages.
               });
     }


    // Function to populate the pet dropdown
    function populatePetSelect(pets) {
        const petSelect = document.getElementById('pet-select'); // Re-reference for safety
         if (!petSelect) {
             console.error("Pet select element #pet-select not found.");
             return;
         }
        petSelect.innerHTML = '<option value="" disabled selected>--Select a Pet--</option>'; // Reset options with placeholder
        if (pets && pets.length > 0) {
             pets.forEach(pet => {
                const option = document.createElement('option');
                option.value = pet.id;
                option.textContent = pet.name;
                petSelect.appendChild(option);
             });
        }
         // Attempt to re-select the previously selected pet if it exists
         if (selectedPetId !== null && petSelect.querySelector(`option[value="${selectedPetId}"]`)) {
             petSelect.value = selectedPetId;
         } else {
             // If previous pet not found or no pets, ensure placeholder is selected
             selectedPetId = null;
             petSelect.value = "";
         }
    }

    // Function to fetch feeding logs for a selected pet
    function fetchFeedingLogs(petId) {
        if (!petId || !isLoggedIn) { // Added isLoggedIn check
             selectedPetId = null; // Ensure state is correct
             currentPetFeedingLogs = []; // Clear logs
             updateFeedingLogsDisplay(); // Update display (will show select pet message or no pets message)
             return;
        }

        console.log(`Workspaceing feeding logs for pet ID: ${petId}`);

        fetch(`/get-pet-feedinglogs/${petId}`)
             .then(async response => {
                 console.log(`Response status for /get-pet-feedinglogs/${petId}:`, response.status);
                 if (!response.ok) {
                      if (response.status === 401) {
                          alert('Session expired. Please log in again.');
                          window.location.href = 'loginpage.html';
                          return;
                      }
                      const contentType = response.headers.get('content-type');
                      if (contentType && contentType.includes('application/json')) {
                            const err = await response.json();
                            console.error('Error response body for get feeding logs:', err);
                            throw new Error(err.error || `HTTP error! status: ${response.status}`);
                      } else {
                            const text = await response.text();
                            console.error('Non-JSON error response for get feeding logs:', text);
                            throw new Error(`HTTP error! status: ${response.status}. Server returned non-JSON: ${text.substring(0, 100)}...`);
                      }
                 }
                 return response.json();
             })
             .then(logs => {
                  console.log(`Workspaceed ${logs.length} feeding logs for pet ID ${petId}:`, logs);
                  currentPetFeedingLogs = logs; // Store the fetched logs in state
                  updateFeedingLogsDisplay(); // Update the display based on the state
             })
             .catch(error => {
                  console.error('Error fetching feeding logs:', error);
                  alert('Could not fetch feeding logs: ' + error.message); // Changed console.error to alert for user feedback
                  currentPetFeedingLogs = []; // Clear logs on error
                  updateFeedingLogsDisplay(); // Update display (will show no logs message)
             });
    }

    // Function to display feeding logs in a table (called by updateFeedingLogsDisplay)
    function displayFeedingLogs(logs) {
        const feedingLogsContainer = document.getElementById('feeding-logs-container'); // Re-reference
         if (!feedingLogsContainer) {
             console.error("Feeding logs container element #feeding-logs-container not found.");
             return;
         }

        feedingLogsContainer.innerHTML = ''; // Clear existing content

        if (!logs || logs.length === 0) {
            // This case is handled by updateFeedingLogsDisplay determining which message to show.
            // Here, we just ensure the container is empty and hidden.
             feedingLogsContainer.style.display = 'none'; // Hide container if no logs to display
            return; // Stop here if no logs
        }

        // If there are logs, ensure the container is visible
         feedingLogsContainer.style.display = ''; // Show the container


        const table = document.createElement('table');
        table.classList.add('feeding-log-table'); // Add a class for styling

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th>Date & Time</th>
            <th>Food Type</th>
            <th>Amount</th>
            <th>Notes</th>
            <th>Actions</th>
        `;
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        logs.forEach(log => {
             const logRow = createFeedingLogRow(log); // Create a table row for each log
             tbody.appendChild(logRow);
        });

        table.appendChild(tbody);
        feedingLogsContainer.appendChild(table);
    }

    // Function to create a TABLE ROW element for a single feeding log
    function createFeedingLogRow(log) {
        const logRow = document.createElement('tr');
        logRow.dataset.logId = log.id; // Store log ID
        logRow.dataset.petId = log.pet_id; // Store pet ID

        // Format datetime for display
        const feedingDateTime = log.feeding_time ? new Date(log.feeding_time).toLocaleString() : 'N/A';

        logRow.innerHTML = `
            <td>${feedingDateTime}</td>
            <td>${log.food_type || 'N/A'}</td>
            <td>${log.amount || 'N/A'}</td>
            <td>${log.notes || 'N/A'}</td>
            <td class="log-actions">
                <button class="edit-log-btn btn-small">Edit</button> <button class="delete-log-btn btn-small">Delete</button> </td>
        `;

        // Add event listeners for edit and delete buttons within the row
        const editButton = logRow.querySelector('.edit-log-btn');
        if (editButton) {
             editButton.addEventListener('click', (event) => { // Added event parameter
                 event.stopPropagation(); // Prevent row click if row itself becomes clickable later
                 openFeedingLogModal(log); // Open modal for editing
             });
        } else {
             console.error("Edit button not found in feeding log row for log ID:", log.id);
        }

        const deleteButton = logRow.querySelector('.delete-log-btn');
        if (deleteButton) {
             deleteButton.addEventListener('click', (event) => { // Added event parameter
                 event.stopPropagation(); // Prevent the row click from firing if needed
                 handleDeleteFeedingLog(log.id, log.pet_id); // Handle deletion
             });
        } else {
             console.error("Delete button not found in feeding log row for log ID:", log.id);
        }

        return logRow;
    }


    // Function to open the feeding log modal
    function openFeedingLogModal(log = null) {
          // Check if logged in before opening modal
        if (!isLoggedIn) {
            alert('You must be logged in to add/edit feeding logs.'); // Changed console.warn to alert
            return;
        }

        // Ensure modal elements exist
         if (!feedingLogModal || !feedingLogForm || !modalTitle || !logIdInput || !modalPetIdInput || !feedingTimeInput || !foodTypeInput || !amountInput || !notesInput || !deleteFeedingLogButton) {
             console.error("Modal elements not found. Cannot open modal.");
             alert("Error displaying form. Please try again."); // User feedback
             return;
         }


        feedingLogForm.reset(); // Reset the form first
        deleteFeedingLogButton.style.display = 'none'; // Hide delete button by default

        if (log) {
            // Editing existing log
            modalTitle.textContent = 'Edit Feeding Log';
            logIdInput.value = log.id;
            modalPetIdInput.value = log.pet_id; // Set pet ID for the modal
            // Format datetime for input type="datetime-local" (YYYY-MM-DDTHH:MM)
            const feedingDateTime = log.feeding_time ? new Date(log.feeding_time) : null;
            if (feedingDateTime) {
                // Adjust for timezone offset to get local time string
                const offset = feedingDateTime.getTimezoneOffset() * 60000; // offset in milliseconds
                const localISOTime = (new Date(feedingDateTime.getTime() - offset)).toISOString().slice(0, 16);
                 feedingTimeInput.value = localISOTime;
            } else {
                 feedingTimeInput.value = '';
            }

            foodTypeInput.value = log.food_type || '';
            amountInput.value = log.amount || '';
            notesInput.value = log.notes || '';
            deleteFeedingLogButton.style.display = 'inline-block'; // Show delete button
        } else {
            // Adding new log
            modalTitle.textContent = 'Add Feeding Log';
            logIdInput.value = ''; // Clear log ID
            // Set the currently selected pet's ID in the modal's hidden input
            modalPetIdInput.value = selectedPetId; // Use the selectedPetId state variable

            // Optionally set current date/time for new logs
             const now = new Date();
             const offset = now.getTimezoneOffset() * 60000;
             const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
             feedingTimeInput.value = localISOTime;

             foodTypeInput.value = ''; // Clear fields for new log
             amountInput.value = '';
             notesInput.value = '';
        }
        feedingLogModal.style.display = 'block';
    }

    // Function to close the feeding log modal (Global function)
    // This is defined outside DOMContentLoaded but referenced inside.
    // The definition at the top of the file handles the global scope.
    // window.closeFeedingLogModal is already defined globally at the top


    // Handle Add Feeding Log Button click
    addFeedingLogButton.addEventListener('click', () => {
         if (!isLoggedIn) { // Basic check
             alert('You must be logged in to add records.');
             return;
         }
        if (selectedPetId) { // Only open if a pet is selected
             // selectedPetId is already set by the pet select listener or initial load
             modalPetIdInput.value = selectedPetId; // Set the modal's hidden pet ID
             openFeedingLogModal();
        } else {
             alert('Please select a pet first to add a feeding log record.');
        }
    });


    // Handle Save Feeding Log Form Submission
    // Using a named function to easily add/remove the event listener if needed
    function handleFeedingLogFormSubmit(event) {
        event.preventDefault();

        if (!isLoggedIn) {
            alert('You must be logged in to save feeding logs.');
            return;
        }

         // Ensure form elements exist
        if (!feedingLogForm || !logIdInput || !modalPetIdInput || !feedingTimeInput || !foodTypeInput || !amountInput || !notesInput) {
            console.error("Form elements not found. Cannot save log.");
            alert("Error saving form data. Please try again."); // User feedback
            return;
        }


        const logId = logIdInput.value;
        const petId = modalPetIdInput.value; // Get pet ID from the hidden input

        if (!petId) {
             console.error('Error: Pet ID missing from modal form.');
             alert('Error: Could not determine pet for this record.'); // User feedback
             return;
         }


        const feedingTime = feedingTimeInput.value;
        const foodType = foodTypeInput.value;
        const amount = amountInput.value;
        const notes = notesInput.value;

        // Basic validation
        if (!feedingTime || !foodType) {
            alert('Please fill in Feeding Date & Time and Food Type.'); // Changed console.error/warn to alert
            return; // Stop if required fields are empty
        }


        const logData = {
            pet_id: petId,
            feeding_time: feedingTime,
            food_type: foodType,
            amount: amount || null, // Send null if empty
            notes: notes || null // Send null if empty
        };

        const method = logId ? 'PUT' : 'POST'; // Use PUT for edit, POST for add
        const url = logId ? `/update-feedinglog/${logId}` : '/add-feedinglog';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(logData)
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
            alert(data.message || 'Record saved successfully!'); // Changed console.log to alert
            closeFeedingLogModal();
            fetchFeedingLogs(petId); // Refresh logs for the current pet
        })
        .catch(error => {
            console.error('Error saving feeding log:', error);
            alert('Could not save feeding log: ' + error.message); // Changed console.error to alert
        });
    }

     // Attach the Save Feeding Log Form Submission listener
    if (feedingLogForm) { // Check if form element exists
         feedingLogForm.removeEventListener('submit', handleFeedingLogFormSubmit); // Ensure no duplicates
         feedingLogForm.addEventListener('submit', handleFeedingLogFormSubmit);
    } else {
        console.error("Feeding log form element #feedingLogForm not found.");
    }


    // Handle Delete Feeding Log Button Click
    async function handleDeleteFeedingLog(logId, petId) {
          if (!isLoggedIn) { // Basic check
             alert('You must be logged in to delete records.');
             return;
          }

         // Ensure delete button exists
         const deleteFeedingLogButton = document.getElementById('delete-feedinglog-button');
         if (!deleteFeedingLogButton) {
             console.error("Delete button element #delete-feedinglog-button not found.");
             alert("Error performing delete action. Please try again."); // User feedback
             return;
         }


        const confirmDelete = confirm(`Are you sure you want to delete this feeding log?`);

        if (!confirmDelete) {
            console.log('Feeding log deletion cancelled by user.');
            return; // Stop if user cancelled
        }

        console.log('User confirmed deletion of feeding log ID:', logId);

        try {
            const response = await fetch(`/delete-feedinglog/${logId}`, {
                method: 'DELETE',
            });

            console.log(`Response status for DELETE /delete-feedinglog/${logId}:`, response.status);
            if (response.ok) {
                 const result = await response.json();
                 console.log(result.message);
                 alert(result.message || 'Record deleted successfully!'); // Changed console.log to alert


                closeFeedingLogModal(); // Close modal if open
                fetchFeedingLogs(petId); // Refresh logs for the current pet

            } else {
                 if (response.status === 401) {
                      alert('Session expired. Please log in again.');
                      window.location.href = 'loginpage.html';
                      return;
                 }
                 const contentType = response.headers.get('content-type');
                 if (contentType && contentType.includes('application/json')) {
                      const errorData = await response.json();
                      console.error('Failed to delete log: ' + (errorData.error || 'Unknown error'));
                      alert('Failed to delete record: ' + (errorData.error || 'Unknown error')); // User feedback
                 } else {
                      const text = await response.text();
                      console.error(`Non-JSON error response for DELETE /delete-feedinglog/${logId}:`, text);
                      alert(`Failed to delete record: HTTP error! status: ${response.status}.`); // User feedback
                 }
            }
        } catch (error) {
            console.error('Error deleting feeding log:', error);
            alert('An error occurred while trying to delete the record.'); // User feedback
        }
    }


    // --- Display Logic ---

    // Function to update the displayed feeding logs based on current state
    // Manages visibility of messages and the logs container/table
    function updateFeedingLogsDisplay() {
        console.log("updateFeedingLogsDisplay called.");
        console.log("State: selectedPetId =", selectedPetId, ", currentPetFeedingLogs.length =", currentPetFeedingLogs.length);
        console.log("State: allUserPets.length =", allUserPets.length);


         // Ensure required elements exist before proceeding
         if (!feedingLogsContainer || !noFeedingLogsMessage || !selectPetMessage || !noPetsMessage || !petNameHeading) {
             console.error("Update display aborted: Missing required HTML elements for feeding logs display logic.");
             console.warn("Ensure #feeding-logs-container, #no-feeding-logs-message, #select-pet-message, #no-pets-message, and #selected-pet-name-heading exist.");
             // notLoggedInMessage and feedingLogsContent handled in fetchData
             return;
         }

        // Hide all messages and the logs container initially
        if (selectPetMessage) selectPetMessage.style.display = 'none';
        if (noFeedingLogsMessage) noFeedingLogsMessage.style.display = 'none';
        // noPetsMessage is handled in fetchData based on allUserPets.length, but ensure it's hidden if we proceed past the no-pets case
        if (noPetsMessage) noPetsMessage.style.display = 'none';
        if (feedingLogsContainer) feedingLogsContainer.style.display = 'none'; // Hide the container that holds the table
        if (petNameHeading) petNameHeading.style.display = 'none'; // Hide pet name heading initially


        if (selectedPetId === null) {
             // Case 1: No pet is selected (either initially or after user selected placeholder)
             console.log("updateFeedingLogsDisplay: No pet selected.");
             // Show "select pet" message only if the user has pets (otherwise noPetsMessage is shown by fetchData)
             if (allUserPets.length > 0 && selectPetMessage) {
                 selectPetMessage.style.display = 'block';
                 console.log("updateFeedingLogsDisplay: Showing 'select pet' message.");
             }
             // If allUserPets.length is 0, fetchData would have already shown noPetsMessage
             return; // Stop here
        }

        // Case 2: A pet IS selected
        console.log("updateFeedingLogsDisplay: Pet selected.");

        // Update pet name display now that a pet is selected
        const selectedPet = allUserPets.find(pet => String(pet.id) === String(selectedPetId));
        if (petNameHeading && petNameSpan && selectedPet) {
             petNameSpan.textContent = selectedPet.name;
             petNameHeading.style.display = 'block'; // Show the heading
             console.log("updateFeedingLogsDisplay: Showing pet name heading for", selectedPet.name);
        } else if (petNameHeading) {
             petNameHeading.style.display = 'none';
             console.log("updateFeedingLogsDisplay: Hiding pet name heading (pet not found or elements missing).");
        }


        // Check if there are any logs at all for the selected pet
        if (!currentPetFeedingLogs || currentPetFeedingLogs.length === 0) {
            // Pet is selected, but they have no logs
             console.log("updateFeedingLogsDisplay: Selected pet has no logs.");
             if (noFeedingLogsMessage) noFeedingLogsMessage.style.display = 'block'; // Show "No feeding logs found for this pet"
             console.log("updateFeedingLogsDisplay: Showing 'no feeding logs' message.");
            // Logs container remains hidden
             return; // Stop here
        }

        // Case 3: Pet is selected AND they have logs
        console.log("updateFeedingLogsDisplay: Selected pet has logs. Proceeding to display.");

        // Call the function to build and display the table inside the container
        displayFeedingLogs(currentPetFeedingLogs); // Pass the logs to the display function

        // The displayFeedingLogs function makes feedingLogsContainer visible if logs exist.
        // No messages should be visible here.

        console.log("updateFeedingLogsDisplay finished.");
    }


    // --- Event Listeners ---

     // Event listener for pet selection change
    petSelect.addEventListener('change', (event) => {
         console.log("Pet select change event.");
         const newSelectedPetId = event.target.value;

         // Check if user selected the disabled placeholder
         if (!newSelectedPetId) {
             console.log("Pet select change: Placeholder selected.");
             selectedPetId = null;
             currentPetFeedingLogs = []; // Clear logs state
             updateFeedingLogsDisplay(); // Update display to show 'select pet' message
             // Reset pet name heading
             if(petNameHeading) petNameHeading.style.display = 'none';
             return; // Stop here
         }

         // If the same pet is manually re-selected, do nothing
         if (String(newSelectedPetId) === String(selectedPetId)) { // Compare string values
             console.log("Pet select change: Same pet re-selected manually. No fetch needed.");
             // Optional: could call updateFeedingLogsDisplay() here to re-render if needed for other reasons
             return;
         }

         console.log("Pet select change: New pet selected:", newSelectedPetId);
         selectedPetId = newSelectedPetId; // Update the state variable
         currentPetFeedingLogs = []; // Clear previous pet's logs state

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


         fetchFeedingLogs(selectedPetId); // Fetch logs for the newly selected pet
    });

    // Note: Save and Delete listeners are already attached directly to the form and buttons
    // within the DOMContentLoaded block or via createFeedingLogRow.


    // Initial setup: Fetch user info and pets when the page loads
    fetchData();

});