let slideIndex = 0;
let slideTimer;

function showSlides(n) {
    const slides = document.getElementsByClassName("mySlides");
    const thumbnails = document.getElementsByClassName("thumbnail");

    if (n > slides.length) { slideIndex = 1; }
    if (n < 1) { slideIndex = slides.length; }

    for (let i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
        slides[i].classList.remove("active");
    }

    for (let i = 0; i < thumbnails.length; i++) {
        thumbnails[i].classList.remove("active");
    }

    slides[slideIndex - 1].style.display = "block";
    slides[slideIndex - 1].classList.add("active");
    thumbnails[slideIndex - 1].classList.add("active");
}

function currentSlide(n) {
    slideIndex = n;
    showSlides(slideIndex);
    resetTimer();
}

function carousel() {
    showSlides(slideIndex);
    slideIndex++;
    slideTimer = setTimeout(carousel, 4000);
}

function resetTimer() {
    clearTimeout(slideTimer);
    slideTimer = setTimeout(carousel, 9000);
}

function handleSignOut(event) {
    event.preventDefault(); // Prevent the default link behavior

    fetch('/logout', {
        method: 'POST',
    })
    .then(response => {
        if (response.ok) {
            console.log('Logout Status: Logged out successfully from server.');
            window.location.href = '/'; // Redirect to the home page after successful logout
        } else {
            console.error('Logout Status: Logout failed. Server response not OK.');
            alert('Logout failed. Please try again.');
        }
    })
    .catch(error => {
        console.error('Logout Error: Error during logout request:', error);
        alert('Error during logout. Please check your connection.');
    });
}

// Function to check the user's login status and update the sign-in/out button
function checkLoginStatus() {
    const signInOutButton = document.getElementById('signInOutButton');

    fetch('/get-profile')
        .then(async response => {
            console.log('Response status for /get-profile (Index):', response.status);
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const err = await response.json();
                    console.error('Error response body for profile (Index):', err);
                    throw new Error(err.error || `HTTP error! status: ${response.status}`);
                } else {
                    const text = await response.text();
                    console.error('Non-JSON error response (Index):', text);
                    throw new Error(`HTTP error! status: ${response.status}. Server returned non-JSON: ${text.substring(0, 100)}...`);
                }
            }
            return response.json();
        })
        .then(data => {
            console.log('User info fetched successfully (Index):', data);
            // Authenticated user
            if (signInOutButton) {
                signInOutButton.textContent = 'SIGN OUT';
                signInOutButton.href = '#';
                signInOutButton.classList.remove('sign-in-btn');
                signInOutButton.classList.add('sign-out-btn');

                if (!signInOutButton.dataset.listenerAttached) {
                    signInOutButton.addEventListener('click', handleSignOut);
                    signInOutButton.dataset.listenerAttached = 'true';
                }
            }
        })
        .catch(error => {
            console.error('Error fetching user info (Index - likely not authenticated):', error);
            // Not authenticated or error occurred
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
        });
}

// When the window loads, initialize the slideshow and check login status
window.onload = function () {
    slideIndex = 1;
    carousel(); // Start the slideshow
    checkLoginStatus(); // Check login status on page load
};