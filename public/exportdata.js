document.addEventListener('DOMContentLoaded', () => {
    // Get references to DOM elements
    const notLoggedInMessage = document.getElementById("not-logged-in");
    const exportOptionsContent = document.getElementById("export-options-content"); // Changed ID
    const welcomeHeader = document.getElementById("welcome-header"); // Reused ID
    const signInOutButton = document.getElementById('signInOutButton');
    const exportButton = document.getElementById('export-btn'); // Export button
    const dataTypeCheckboxes = document.querySelectorAll('input[name="dataType"]'); // Checkboxes
    const exportFormatRadios = document.querySelectorAll('input[name="exportFormat"]'); // Radio buttons


    let isLoggedIn = false; // Track login status

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
        signInOutButton.addEventListener('click', handleSignOut);
    }

    // Function to fetch user info and check login status
    function fetchData() {
         // Fetch user info first to check authentication status
         fetch('/get-profile')
              .then(async response => {
                 console.log('Response status for /get-profile (Export Data):', response.status); // Changed log
                 if (!response.ok) {
                      const contentType = response.headers.get('content-type');
                      if (contentType && contentType.includes('application/json')) {
                           const err = await response.json();
                           console.error('Error response body for user info (Export Data):', err); // Changed log
                           throw new Error(err.error || `HTTP error! status: ${response.status}`);
                      } else {
                           const text = await response.text();
                           console.error('Non-JSON error response for user info (Export Data):', text); // Changed log
                           throw new Error(`HTTP error! status: ${response.status}. Server returned non-JSON: ${text.substring(0, 100)}...`);
                      }
                 }
                 return response.json();
              })
              .then(data => {
                  console.log('User info fetched successfully (Export Data):', data); // Changed log
                  isLoggedIn = true;
                  if (welcomeHeader) {
                      welcomeHeader.textContent = `Hello, ${data.name}! Export Your PawLog Data.`; // Changed text
                      welcomeHeader.style.display = "block";
                  }

                  // Update sign-in/out button to "SIGN OUT"
                  const signInOutButton = document.getElementById('signInOutButton');
                  if (signInOutButton) {
                      signInOutButton.textContent = 'SIGN OUT';
                      signInOutButton.href = '#'; // Prevent navigation, handle with JS
                      signInOutButton.classList.remove('sign-in-btn');
                      signInOutButton.classList.add('sign-out-btn');
                      if (!signInOutButton.dataset.listenerAttached) {
                          signInOutButton.addEventListener('click', handleSignOut);
                          signInOutButton.dataset.listenerAttached = 'true';
                      }
                  }

                  // Show logged-in content and hide not logged in message
                  notLoggedInMessage.style.display = "none";
                  exportOptionsContent.style.display = 'block'; // Show the main content // Changed ID

              })
              .catch(error => {
                  console.error('Error fetching user info (Export Data - likely not authenticated):', error); // Changed log
                  isLoggedIn = false;
                  // Update UI for not logged in state
                  if (signInOutButton) {
                      signInOutButton.textContent = 'SIGN IN';
                      signInOutButton.href = 'loginpage.html';
                      signInOutButton.classList.remove('sign-out-btn');
                      signInOutButton.classList.add('sign-in-btn');
                      if (signInOutButton.dataset.listenerAttached) {
                          signInOutButton.removeEventListener('click', handleSignOut);
                          signInOutButton.dataset.listenerAttached = '';
                      }
                  }
                  // Hide logged-in content and show not logged in message
                  notLoggedInMessage.style.display = "block";
                  exportOptionsContent.style.display = 'none'; // Changed ID
                  if (welcomeHeader) {
                       welcomeHeader.style.display = "none";
                  }
              });
    }

    // Initial check on page load
    fetchData();


    // Event listener for the Export button
    exportButton.addEventListener('click', async () => {
        if (!isLoggedIn) {
            alert('You must be logged in to export data.');
            return;
        }

        // Get selected data types
        const selectedDataTypes = [];
        dataTypeCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedDataTypes.push(checkbox.value);
            }
        });

        // Get selected format
        let selectedFormat = 'csv'; // Default to CSV
        exportFormatRadios.forEach(radio => {
            if (radio.checked) {
                selectedFormat = radio.value;
            }
        });

        // Validate that at least one data type is selected
        if (selectedDataTypes.length === 0) {
            alert('Please select at least one data type to export.');
            return;
        }

        // Disable button and show loading indicator if you have one
        exportButton.disabled = true;
        exportButton.textContent = 'Exporting...'; // Optional feedback

        try {
            const response = await fetch('/export-data', { // New endpoint
                method: 'POST', // Use POST to send options
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dataTypes: selectedDataTypes,
                    format: selectedFormat
                })
            });

            // Check if the response was successful
            if (!response.ok) {
                 // Handle specific errors like authentication or bad request
                 if (response.status === 401) {
                      alert('Your session has expired. Please log in again.');
                      window.location.href = 'loginpage.html';
                      return; // Stop further processing
                 }
                 const contentType = response.headers.get('content-type');
                 if (contentType && contentType.includes('application/json')) {
                      const errorData = await response.json();
                      console.error('Server error during export:', errorData);
                      alert('Export failed: ' + (errorData.error || 'Unknown error'));
                 } else {
                      // Attempt to read non-JSON error response
                      const text = await response.text();
                      console.error('Non-JSON error response during export:', text);
                      alert(`Export failed: HTTP error! status: ${response.status}. Server returned non-JSON: ${text.substring(0, 100)}...`);
                 }
                 return; // Stop further processing on error
            }

            // --- MODIFIED: Handle successful file download ---

            // Get the filename from the Content-Disposition header if available, otherwise use a default
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `pawlog_export_${new Date().toISOString().split('T')[0]}.csv`; // Default filename
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }

            // Get the response body as a Blob
            const blob = await response.blob();

            // Create a URL for the Blob
            const url = window.URL.createObjectURL(blob);

            // Create a temporary anchor element
            const a = document.createElement('a');
            a.style.display = 'none'; // Hide the element
            a.href = url;
            a.download = filename; // Set the download filename

            // Append the anchor to the body and trigger the click
            document.body.appendChild(a);
            a.click();

            // Clean up the URL object and the anchor element
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            console.log('File download initiated successfully.');
            // Optional: Provide user feedback that download is starting
            // alert('Your data export is starting. Please check your downloads folder.'); // Already have this in try block

            // --- END MODIFIED ---


        } catch (error) {
            console.error('Error during export fetch:', error);
            alert('An unexpected error occurred during export. Please check your connection.');
        } finally {
            // Re-enable the button
            exportButton.disabled = false;
            exportButton.textContent = 'Export Data';
        }
    });

    // Optional: Add event listeners to checkboxes to ensure at least one is checked
    dataTypeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const checkedCount = document.querySelectorAll('input[name="dataType"]:checked').length;
            // You could disable the export button here if checkedCount is 0,
            // but the validation in the click handler is also sufficient.
            // exportButton.disabled = checkedCount === 0;
        });
    });

});
