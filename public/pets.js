// Keep the globally accessible modal functions outside DOMContentLoaded if needed for HTML onclick
window.openPetForm = function() {
    document.getElementById("addPetModal").style.display = "block";
}

window.closePetForm = function() {
    document.getElementById("addPetModal").style.display = "none";
    // Reset the add pet form and preview on close
    const addPetForm = document.getElementById('addPetForm');
    if (addPetForm) {
        addPetForm.reset();
        const petImageInput = document.getElementById('petImage');
        if (petImageInput) petImageInput.value = ''; // Clear file input
        const petImagePreview = document.getElementById('petImagePreview');
        if (petImagePreview) petImagePreview.style.display = 'none'; // Hide preview
        const previewImg = document.getElementById('previewImg');
        if (previewImg) previewImg.src = "#"; // Reset preview image source
         // --- CLEAR BIRTHDATE INPUT ON CLOSE ---
         const petBirthdateInput = document.getElementById('petBirthdate');
         if (petBirthdateInput) petBirthdateInput.value = '';
         // --- END CLEAR BIRTHDATE INPUT ---
    }
}
window.closePetDetailsModal = function() {
    const petDetailsModal = document.getElementById('petDetailsModal');
    petDetailsModal.style.display = "none";
    // Reset the modal state and clear form/preview on close
    petDetailsModal.classList.remove('edit-mode'); // Ensure it closes in view mode state
    const editPetForm = document.getElementById('editPetForm');
    if (editPetForm) {
        editPetForm.reset();
        const editPetImageUpload = document.getElementById('edit-pet-image-upload');
        if (editPetImageUpload) editPetImageUpload.value = ''; // Clear file input
         // --- CLEAR BIRTHDATE INPUT ON CLOSE ---
         const editPetBirthdateInput = document.getElementById('edit-pet-birthdate');
         if (editPetBirthdateInput) editPetBirthdateInput.value = '';
         // --- END CLEAR BIRTHDATE INPUT ---
         // Reset the edit preview image source to the default or empty
         const petDetailImage = document.getElementById('pet-detail-image');
         if (petDetailImage) petDetailImage.src = 'images/default-profile.jpg'; // Reset the image element in the modal
         // The add pet modal preview container might need separate handling if it's interfering
         const petImagePreview = document.getElementById('petImagePreview');
         const previewImg = document.getElementById('previewImg');
         if (petImagePreview) petImagePreview.style.display = "none"; // Hide add modal preview if it's somehow showing
         if (previewImg) previewImg.src = "#"; // Reset add modal preview image
    }
}

window.openPetDetailsModal = function() {
    const petDetailsModal = document.getElementById('petDetailsModal');
    petDetailsModal.style.display = "block";
}


document.addEventListener("DOMContentLoaded", () => {
    // Get references to DOM elements
    const form = document.getElementById("addPetForm");
    const petsGridContainer = document.getElementById("pets-grid-container");
    const noPetsMessage = document.getElementById("no-pets-message");
    const notLoggedInMessage = document.getElementById("not-logged-in");
    const welcomeHeader = document.getElementById("welcome-header");
    const signInOutButton = document.getElementById('signInOutButton');
    const petImageInput = document.getElementById('petImage'); // Add modal file input
    const petImagePreview = document.getElementById('petImagePreview'); // Add modal preview container
    const previewImg = document.getElementById('previewImg'); // Add modal preview image
    const addPetButton = document.getElementById('add-pet-btn');

    // Pet Details/Edit Modal elements
    const petDetailsModal = document.getElementById('petDetailsModal');
    const petDetailImage = document.getElementById('pet-detail-image'); // Image element used in both view and edit mode for preview
    const editPetImageUpload = document.getElementById('edit-pet-image-upload'); // Edit modal file input
    const petDetailName = document.getElementById('pet-detail-name'); // Name span in view mode
    const editPetNameInput = document.getElementById('edit-pet-name'); // Name input in edit mode
    const petDetailType = document.getElementById('pet-detail-type'); // Type span in view mode
    const editPetTypeInput = document.getElementById('edit-pet-type'); // Type input in edit mode
    const petDetailBreed = document.getElementById('pet-detail-breed'); // Breed span in view mode
    const editPetBreedInput = document.getElementById('edit-pet-breed'); // Breed input in edit mode
    // --- ADD BIRTHDATE REFERENCES ---
    const petDetailBirthdateSpan = document.getElementById('pet-detail-birthdate'); // Birthdate span in view mode
    const editPetBirthdateInput = document.getElementById('edit-pet-birthdate'); // Birthdate input in edit mode
    // --- END BIRTHDATE REFERENCES ---
    const petDetailSex = document.getElementById('pet-detail-sex'); // Sex span in view mode
    const editPetSexInputs = document.querySelectorAll('#editPetForm input[name="sex"]'); // Sex radios in edit mode
    const petDetailAbout = document.getElementById('pet-detail-about'); // About span in view mode
    const editPetAboutInput = document.getElementById('edit-pet-about'); // About textarea in edit mode
    const editPetIdInput = document.getElementById('edit-pet-id'); // Hidden pet ID input

    const editPetButton = document.getElementById('edit-pet-button'); // Edit button
    const savePetButton = document.getElementById('save-pet-button'); // Save button
    const editPetForm = document.getElementById('editPetForm'); // The form within the details modal
    const deletePetButton = document.getElementById('delete-pet-button'); // Get the delete button

    // --- ADD VIEW/EDIT MODE CONTAINERS ---
    // Get references to elements that control view/edit mode visibility
    // These might be parent containers or individual elements
    const viewModeElements = document.querySelectorAll('.view-mode-only');
    const editModeElements = document.querySelectorAll('.edit-mode-only');
    // --- END ADD VIEW/EDIT MODE CONTAINERS ---

    // --- ADD SORT AND SEARCH REFERENCES ---
    const sortBySelect = document.getElementById('sort-by');
    const searchInput = document.getElementById('search-input');
    // --- END SORT AND SEARCH REFERENCES ---


    let isLoggedIn = false; // Track login status
    let allPets = []; // Array to hold the full list of pets

    // --- ADD CURRENT SORT AND SEARCH STATE ---
    let currentSortKey = 'name'; // Default sort key
    let currentSearchQuery = ''; // Default search query
    // --- END ADD CURRENT SORT AND SEARCH STATE ---


    function handleSignOut(event) {
        event.preventDefault(); // Prevent the default link behavior

        fetch('/logout', {
            method: 'POST',
        })
        .then(response => {
            if (response.ok) {
                console.log('Logged out successfully from server.');
                // Redirect to the login page or home page after successful logout
                window.location.href = 'loginpage.html';
            } else {
                console.error('Logout failed');
                alert('Logout failed. Please try again.'); // Provide user feedback
            }
        })
        .catch(error => {
            console.error('Error during logout:', error);
            alert('Error during logout. Please check your connection.');
        });
    }

    // Attach logout listener to the sign-out button if it exists
    if (signInOutButton) {
        // Remove any existing listener to prevent duplicates on fetchData re-run
         signInOutButton.removeEventListener('click', handleSignOut);
         signInOutButton.addEventListener('click', handleSignOut);
    }

    function displayPets(petsToDisplay, sortKey) {
        petsGridContainer.innerHTML = ''; // Clear existing pets

        if (petsToDisplay && petsToDisplay.length > 0) {
            petsToDisplay.forEach(pet => {
                // MODIFIED: Pass sortKey to createPetCard
                const petCard = createPetCard(pet, sortKey); // Create the card element

                // Add click event listener to open details modal
                petCard.addEventListener('click', () => {
                    fetchPetDetails(pet.id); // Fetch details when clicked
                });

                petsGridContainer.appendChild(petCard); // Add card to grid
            });

            noPetsMessage.style.display = "none";
            petsGridContainer.style.display = "grid";
        } else {
            // Show no pets message only if logged in and no pets after filtering/sorting
            if (isLoggedIn) {
                 noPetsMessage.style.display = "block";
            } else {
                 // If not logged in, this message is handled by the fetchData catch block
                 noPetsMessage.style.display = "none";
            }
            petsGridContainer.style.display = "none";
        }
    }

    // --- ADD FILTERING FUNCTION (No change needed) ---
    function filterPets(pets, query) {
        const lowerCaseQuery = query.toLowerCase().trim();
        if (!lowerCaseQuery) {
            return pets; // Return all pets if query is empty
        }
        return pets.filter(pet =>
            (pet.name && pet.name.toLowerCase().includes(lowerCaseQuery)) ||
            (pet.type && pet.type.toLowerCase().includes(lowerCaseQuery)) ||
            (pet.breed && pet.breed.toLowerCase().includes(lowerCaseQuery))
        );
    }
    // --- END FILTERING FUNCTION ---

    // --- ADD SORTING FUNCTION (No change needed) ---
    function sortPets(pets, key) {
        const sortedPets = [...pets]; // Work on a shallow copy

        sortedPets.sort((a, b) => {
            const valA = a[key];
            const valB = b[key];

            if (key === 'birthdate') {
                const dateA = valA ? new Date(valA).getTime() : (new Date('1900-01-01')).getTime(); // Treat missing/invalid dates as very early
                const dateB = valB ? new Date(valB).getTime() : (new Date('1900-01-01')).getTime(); // Treat missing/invalid dates as very early

                if (dateA < dateB) return -1;
                if (dateA > dateB) return 1;
                return 0;
            } else {
                const stringA = String(valA || '').toLowerCase();
                const stringB = String(valB || '').toLowerCase();

                if (stringA < stringB) return -1;
                if (stringA > stringB) return 1;
                return 0;
            }
        });
        return sortedPets;
    }
    // --- END SORTING FUNCTION ---

    // --- ADD UPDATE DISPLAY FUNCTION ---
    // MODIFIED: Passes currentSortKey to displayPets
    function updateDisplay() {
        // 1. Start with the full list
        let petsToDisplay = [...allPets]; // Work on a copy

        // 2. Apply Filtering
        petsToDisplay = filterPets(petsToDisplay, currentSearchQuery);

        // 3. Apply Sorting
        petsToDisplay = sortPets(petsToDisplay, currentSortKey);

        // 4. Display the result, passing the sort key
        displayPets(petsToDisplay, currentSortKey); // Pass the sort key here

         // Show "no pets" message correctly after filtering/sorting
        if (isLoggedIn && petsToDisplay.length === 0) {
            noPetsMessage.style.display = "block";
        } else {
            noPetsMessage.style.display = "none";
        }
    }
    // --- END UPDATE DISPLAY FUNCTION ---


    // Modified function to create a pet card
    // MODIFIED: Accepts sortKey and conditionally adds detail
    function createPetCard(pet, sortKey) {
        const petCard = document.createElement("div");
        petCard.className = "pet-card";
        petCard.dataset.petId = pet.id; // Store the pet ID in a data attribute

        const petImage = document.createElement("img");
        petImage.src = pet.image_path || 'images/default-profile.jpg';
        petImage.alt = pet.name || "Pet";

        const petName = document.createElement("h3"); // Changed to h3 for better semantics
        petName.innerText = pet.name || "Unnamed Pet";

        petCard.appendChild(petImage);
        petCard.appendChild(petName);

        // --- Conditionally add detail based on sortKey ---
        if (sortKey && sortKey !== 'name') {
            const detailParagraph = document.createElement("p");
            detailParagraph.className = "pet-card-sorted-detail"; // Add a class for styling

            let detailText = 'N/A'; // Default text if data is missing

            switch (sortKey) {
                case 'type':
                    detailText = `Type: ${pet.type || 'N/A'}`;
                    break;
                case 'birthdate':
                    // Format birthdate for display
                    const formattedBirthdate = pet.birthdate ? new Date(pet.birthdate).toLocaleDateString() : 'N/A';
                    detailText = `Birthdate: ${formattedBirthdate}`;
                    break;
                case 'sex':
                    detailText = `Sex: ${pet.sex || 'N/A'}`;
                    break;
                // Note: 'breed' is not a sort option in your HTML,
                // but you could add a case here if needed.
            }

            detailParagraph.innerText = detailText;
            petCard.appendChild(detailParagraph); // Add the detail paragraph to the card
        }
        // --- End Conditional Detail ---

        return petCard;
    }
     // --- END UPDATE DISPLAY FUNCTION ---


    // Function to fetch detailed pet information
    function fetchPetDetails(petId) {
        fetch(`/get-pet-details/${petId}`)
            .then(async response => { // Added async here
                if (!response.ok) {
                    // If not authenticated or other error, redirect to login
                    if (response.status === 401) {
                        alert('Please log in to view pet details.');
                        window.location.href = 'loginpage.html';
                        return; // Stop execution
                    }
                     // Attempt to read error body if response is not OK (for other errors like 404)
                     const contentType = response.headers.get('content-type');
                     if (contentType && contentType.includes('application/json')) {
                          const err = await response.json(); // Use await
                          console.error('Error response body for pet details:', err);
                          throw new Error(err.error || `HTTP error! status: ${response.status}`);
                     } else {
                          const text = await response.text(); // Use await
                          console.error('Non-JSON error response for pet details:', text);
                          throw new Error(`HTTP error! status: ${response.status}. Server returned non-JSON: ${text.substring(0, 100)}...`); // Log first 100 chars
                     }
                }
                return response.json();
            })
            .then(pet => {
                populatePetDetailsModal(pet);
                openPetDetailsModal(); // Open modal after populating
                switchToViewMode(); // Start in view mode
            })
            .catch(error => {
                console.error('Error fetching pet details:', error);
                 alert('Could not fetch pet details: ' + error.message); // User feedback
            });
    }

    // Function to populate the pet details modal (both view and edit fields)
    function populatePetDetailsModal(pet) {
        // Populate View Mode Spans
        petDetailImage.src = (pet.image_path || 'images/default-profile.jpg'); // Set initial image for view/edit preview
        petDetailName.innerText = pet.name || "Unnamed Pet";
        petDetailType.innerText = pet.type || "N/A";
        petDetailBreed.innerText = pet.breed || "N/A";
        petDetailSex.innerText = pet.sex || "N/A";
        petDetailAbout.innerText = pet.about || "No information provided.";
        // --- POPULATE BIRTHDATE DISPLAY ---
        petDetailBirthdateSpan.innerText = pet.birthdate ? new Date(pet.birthdate).toLocaleDateString() : 'N/A'; // Format date for display
        // --- END POPULATE BIRTHDATE DISPLAY ---


        // Populate Edit Mode Inputs
        editPetIdInput.value = pet.id; // Store the pet's ID
        editPetNameInput.value = pet.name || '';
        editPetTypeInput.value = pet.type || '';
        editPetBreedInput.value = pet.breed || '';
        editPetAboutInput.value = pet.about || '';
        // --- POPULATE BIRTHDATE INPUT ---
        // Ensure date is in 'YYYY-MM-DD' format for input type="date"
        editPetBirthdateInput.value = pet.birthdate ? new Date(pet.birthdate).toISOString().split('T')[0] : '';
        // --- END POPULATE BIRTHDATE INPUT ---


        // Set the correct sex radio button
        editPetSexInputs.forEach(radio => {
            if (radio.value === pet.sex) {
                radio.checked = true;
            } else {
                radio.checked = false;
            }
        });
    }

    // Function to switch to View Mode
    function switchToViewMode() {
        petDetailsModal.classList.remove('edit-mode');
        // Show view elements, hide edit elements within the modal
        viewModeElements.forEach(el => el.style.display = el.tagName === 'SPAN' || el.tagName === 'STRONG' ? '' : 'inline-block'); // Use default display for spans, inline-block for buttons
        editModeElements.forEach(el => el.style.display = 'none');

        editPetButton.style.display = 'inline-block'; // Show Edit button
        savePetButton.style.display = 'none'; // Hide Save button
        deletePetButton.style.display = 'inline-block'; // Show Delete button in view mode

         // Ensure the image element is visible in view mode
         petDetailImage.style.display = 'block';
         // Hide the file input in view mode
         editPetImageUpload.style.display = 'none';
    }

    // Function to switch to Edit Mode
    function switchToEditMode() {
        petDetailsModal.classList.add('edit-mode');
        // Hide view elements, show edit elements within the modal
        viewModeElements.forEach(el => el.style.display = 'none');
        editModeElements.forEach(el => {
            // Restore display type based on element type (e.g., flex for radio group, block for input/textarea)
             if (el.classList.contains('radio-group')) {
                 el.style.display = 'flex'; // Or 'block' depending on its intended layout
             } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                  el.style.display = 'block';
             }
              else {
                 el.style.display = ''; // Default display for others
             }
        });

        editPetButton.style.display = 'none'; // Hide Edit button
        savePetButton.style.display = 'inline-block'; // Show Save button
         deletePetButton.style.display = 'none'; // Hide Delete button in edit mode (can't delete while editing)

         // Ensure the image element is visible in edit mode for preview
         petDetailImage.style.display = 'block';
         // Show the file input in edit mode
         editPetImageUpload.style.display = 'block';

         // The petDetailImage element now serves as the preview in edit mode.
         // Its source is already set when populatePetDetailsModal is called.
         // We don't need a separate 'edit-preview-img' element or the 'petImagePreview' container from the add modal.
    }


    // Event listener for the "Edit" button in the modal
    editPetButton.addEventListener('click', () => {
        switchToEditMode();
    });

    // Event listener for the file input change in edit mode
    editPetImageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                 // Update the *edit mode preview* image source (petDetailImage)
                 petDetailImage.src = e.target.result; // Use petDetailImage
            };
            reader.readAsDataURL(file);
        } else {
             // If file input is cleared, reset the preview image to the original pet image or default
             // This requires storing the original image path when the modal opens.
             // For simplicity here, we'll just reset to the default image or the currently loaded image
             // For robustness, you might store the original pet.image_path when populating the modal
             // and reset to that value here if no new file is selected.
             // For now, let's reset to default if the input is cleared.
             petDetailImage.src = 'images/default-profile.jpg'; // Reset to default
        }
    });


    // Event listener for the "Save Changes" form submission in the modal
    editPetForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const petId = editPetIdInput.value; // Get the pet ID from the hidden input
        if (!petId) {
            alert('Error: Pet ID not found.');
            return;
        }

        // Create FormData to handle both text fields and the file upload
        const formData = new FormData();

        // Append text fields from the edit form
        formData.append('name', editPetNameInput.value || ''); // Send empty string if null/undefined
        formData.append('type', editPetTypeInput.value || '');
        formData.append('breed', editPetBreedInput.value || '');
        formData.append('birthdate', editPetBirthdateInput.value || ''); // Include birthdate
        formData.append('sex', editPetSexInputs ? Array.from(editPetSexInputs).find(radio => radio.checked)?.value || '' : '');
        formData.append('about', editPetAboutInput.value || '');

        // Append the new image file if one was selected
        if (editPetImageUpload.files && editPetImageUpload.files.length > 0) {
             formData.append('petImage', editPetImageUpload.files[0]);
        }


        // Determine fetch options - using PUT with FormData
        // Ensure your server is configured to handle PUT requests with multipart/form-data
        const fetchOptions = {
             method: 'PUT', // Use PUT for updates
             body: formData // Send FormData
             // Content-Type header is automatically set by FormData for multipart
        };


        fetch(`/update-pet/${petId}`, fetchOptions) // Send to the update endpoint
        .then(async response => {
            console.log(`Response status for PUT /update-pet/${petId}:`, response.status);
            // Check if the response was successful
            if (!response.ok) {
                 const contentType = response.headers.get('content-type');
                 if (contentType && contentType.includes('application/json')) {
                      const errorData = await response.json();
                      console.error('Error response body for update pet:', errorData);
                      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
                 } else {
                      const text = await response.text();
                      console.error(`Non-JSON error response for update pet:`, text);
                      throw new Error(`HTTP error! status: ${response.status}. Server returned non-JSON: ${text.substring(0, 100)}...`);
                 }
            }
            // Parse the JSON response
            return response.json();
        })
        .then(data => {
            if (data.message) {
                console.log('Pet updated:', data.message);
                alert('Pet details updated successfully!');

                // Refresh the pet list to show the updated list
                fetchData(); // Re-fetch user info and pets

                closePetDetailsModal(); // Close the modal

            } else if (data.error) {
                console.error('Error updating pet:', data.error);
                alert('Failed to update pet: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error submitting pet update form:', error);
            alert('Failed to update pet: ' + error.message);
        });
    });


    // Function to handle pet deletion
    async function handleDeletePet() {
        const petId = editPetIdInput.value; // Get the pet ID from the hidden input in the modal
        if (!petId) {
            alert('Error: Pet ID not found for deletion.');
            return;
        }

        // Ask for user confirmation before deleting
        const confirmDelete = confirm(`Are you sure you want to delete this pet? This action cannot be undone.`);

        if (confirmDelete) {
            try {
                // Send a DELETE request to the server
                const response = await fetch(`/delete-pet/${petId}`, {
                    method: 'DELETE',
                });

                console.log(`Response status for DELETE /delete-pet/${petId}:`, response.status);
                if (response.ok) {
                    // If deletion is successful on the server, parse the JSON response
                    const result = await response.json(); // Assuming server sends back a success message
                    alert(result.message); // Show success message from server

                    closePetDetailsModal();

                    // Refresh the pet list to show the updated list
                    fetchData(); // Re-fetch user info and pets

                } else {
                    // If deletion failed, read the error message from the server
                     const contentType = response.headers.get('content-type');
                     if (contentType && contentType.includes('application/json')) {
                          const errorData = await response.json();
                          alert('Failed to delete pet: ' + (errorData.error || 'Unknown error'));
                     } else {
                          const text = await response.text();
                          console.error(`Non-JSON error response for delete pet:`, text);
                          alert(`Failed to delete pet: HTTP error! status: ${response.status}. Server returned non-JSON: ${text.substring(0, 100)}...`);
                     }
                }
            } catch (error) {
                // Handle network errors or other issues during the fetch
                console.error('Error deleting pet:', error);
                alert('An error occurred while trying to delete the pet.');
            }
        }
    }

    // Add event listener to the delete pet button in the modal
    if (deletePetButton) {
        deletePetButton.addEventListener('click', handleDeletePet);
    }


    // Fetch user info and pets
    function fetchData() {
        // Fetch user info first to check authentication status
        fetch('/get-profile')
            .then(async response => { // Added async here
                console.log('Response status for /get-user-info:', response.status); // Log the status
                if (!response.ok) {
                    // If not authenticated (e.g., 401 status), throw an error
                    // Attempt to read error body if response is not OK
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                         const err = await response.json(); // Use await
                         console.error('Error response body for user info:', err);
                         throw new Error(err.error || `HTTP error! status: ${response.status}`);
                    } else {
                         // If not JSON, read as text and log the content
                         const text = await response.text(); // Use await
                         console.error('Non-JSON error response for user info:', text);
                         throw new Error(`HTTP error! status: ${response.status}. Server returned non-JSON: ${text.substring(0, 100)}...`); // Log first 100 chars
                    }
                }
                return response.json();
            })
            .then(data => {
                console.log('User info fetched successfully:', data); // Log successful data
                // If we reached here, the user is authenticated
                isLoggedIn = true;
                welcomeHeader.textContent = `Hello, ${data.name}! These are your pets :)`;

                // Update sign-in/out button to "SIGN OUT"
                const signInOutButton = document.getElementById('signInOutButton');
                if (signInOutButton) {
                    signInOutButton.textContent = 'SIGN OUT';
                    signInOutButton.href = '#'; // Prevent navigation, handle with JS
                    signInOutButton.classList.remove('sign-in-btn');
                    signInOutButton.classList.add('sign-out-btn');
                    // Add event listener for logout if not already added
                    if (!signInOutButton.dataset.listenerAttached) {
                        signInOutButton.addEventListener('click', handleSignOut);
                        signInOutButton.dataset.listenerAttached = 'true'; // Mark as attached
                    }
                }

                // Show logged-in content and hide not logged in message
                notLoggedInMessage.style.display = "none";
                welcomeHeader.style.display = "block";
                addPetButton.style.display = "inline-block"; // Show add pet button

                // Now fetch pets since the user is authenticated
                fetch('/get-user-pets')
                    .then(response => {
                         console.log('Response status for /get-user-pets:', response.status); // Log the status
                         if (!response.ok) {
                              // If fetching pets fails (e.g., database error, though authentication passed)
                              throw new Error('Failed to fetch pets');
                         }
                         return response.json();
                    })
                    .then(pets => {
                         console.log('Pets fetched successfully:', pets); // Log successful data
                         allPets = pets; // Store the full list of pets
                         updateDisplay(); // Display fetched pets (applying default sort/filter)
                    })
                    .catch(error => {
                        console.error('Error fetching pets:', error);
                        // Display no pets message or an error message
                         allPets = []; // Ensure the list is empty
                         updateDisplay(); // Update display, which will show the "no pets" message if logged in
                    });
            })
            .catch(error => {
                console.error('Error fetching user info (likely not authenticated):', error);
                // This block is executed if the initial /get-user-info fetch fails (e.g., 401)
                isLoggedIn = false;
                 allPets = []; // Clear any potentially old pet data
                 // Update UI for not logged in state
                if (signInOutButton) {
                    signInOutButton.textContent = 'SIGN IN';
                    signInOutButton.href = 'loginpage.html';
                    signInOutButton.classList.remove('sign-out-btn');
                    signInOutButton.classList.add('sign-in-btn');
                    // Remove logout listener if attached
                    if (signInOutButton.dataset.listenerAttached) {
                        signInOutButton.removeEventListener('click', handleSignOut);
                        signInOutButton.dataset.listenerAttached = '';
                    }
                }
                // Hide logged-in content and show not logged in message
                petsGridContainer.innerHTML = ''; // Clear displayed pets
                notLoggedInMessage.style.display = "block";
                petsGridContainer.style.display = "none";
                welcomeHeader.style.display = "none";
                addPetButton.style.display = "none";
                 noPetsMessage.style.display = "none"; // Hide no pets message if not logged in
            });
    }

    // --- ADD EVENT LISTENERS FOR SORT AND SEARCH ---
    sortBySelect.addEventListener('change', (event) => {
        currentSortKey = event.target.value;
        updateDisplay(); // Update display with new sort order
    });

    searchInput.addEventListener('input', (event) => {
        currentSearchQuery = event.target.value;
        updateDisplay(); // Update display with filtered results
    });
    // --- END ADD EVENT LISTENERS FOR SORT AND SEARCH ---


    fetchData(); // Initial fetch to load user info and pets


    // Add pet modal form submission
    petImageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                petImagePreview.style.display = "block";
            };
            reader.readAsDataURL(file);
        } else {
            petImagePreview.style.display = "none";
            previewImg.src = "#";
        }
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        if (isLoggedIn) {
            const formData = new FormData(form);
            // FormData automatically includes inputs with 'name' attributes,
            // so the birthdate input with name="birthdate" will be included.

            fetch('/add-pet', {
                method: 'POST',
                body: formData
            })
            .then(async response => { // Added async here
                 console.log('Response status for /add-pet:', response.status); // Log the status
                 if (!response.ok) {
                      const contentType = response.headers.get('content-type');
                      if (contentType && contentType.includes('application/json')) {
                           const err = await response.json(); // Use await
                           console.error('Error response body for add pet:', err);
                           throw new Error(err.error || `HTTP error! status: ${response.status}`);
                      } else {
                           const text = await response.text(); // Use await
                           console.error(`Non-JSON error response for add pet:`, text);
                           throw new Error(`HTTP error! status: ${response.status}. Server returned non-JSON: ${text.substring(0, 100)}...`);
                      }
                 }
                 return response.json();
            })
            .then(data => {
                if (data.message) {
                    console.log('Pet added:', data.message);
                    alert('Pet added successfully!'); // Provide user feedback
                    fetchData(); //re-fetch to update the grid
                    form.reset();
                    petImagePreview.style.display = "none"; // Hide preview after reset
                    previewImg.src = "#"; // Reset preview image source
                    closePetForm(); // Assuming you have a closePetForm function
                } else if (data.error) {
                    console.error('Error adding pet:', data.error);
                    alert('Failed to add pet: ' + data.error); // Show error message from server
                }
            })
            .catch(error => {
                console.error('Error submitting form:', error);
                alert('Failed to add pet: ' + error.message); // Show the error message
            });
        } else {
            alert('You must be logged in to add a pet.');
        }
    });
});