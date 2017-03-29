document.addEventListener('DOMContentLoaded', function () {

    // References to all the element we will need.
    var video = document.querySelector('#camera-stream'),
        start_camera = document.querySelector('#start-camera'),
        controls = document.querySelector('.controls'),
        take_photo_btn = document.querySelector('#take-photo'),
        error_message = document.querySelector('#error-message'),
        add_photo = document.querySelector('#add-photo')
        capture_photo = document.querySelector('#capture-photo'),
        photos_list = document.querySelector("#photos-list"),
        photos_list_fb = document.querySelector("#photos-list-fb");

    var reg = null;

    // The getUserMedia interface is used for handling camera input.
    // Some browsers need a prefix so here we're covering all the options
    navigator.getUserMedia = (
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia
    );

    if (!navigator.getUserMedia) {
        displayErrorMessage("Your browser doesn't have support for the navigator.getUserMedia interface.");
    }
    else {
        navigator.getUserMedia(
            {
                video: true
            },
            function (stream) {
                video.srcObject = stream;

                video.onplay = function () {
                    showVideo();
                };
            },
            function (err) {
                displayErrorMessage("There was an error with accessing the camera stream: " + err.name, err);
            }
        );
    }

    // Init Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('./sw.js')
            .then(registration => {
                reg = registration;
                reg.update();
                console.log("Service worker registered");
            });
    }

    // Get data from Firebase
    fetch('https://offline-demo-4b2ee.firebaseio.com/photos.json?orderBy="id"&limitToLast=3')
        .then(function (response) {
            return response.json();
        }).then(function (data) {
            console.log(data);
            if (data) {
                document.querySelector('.no-photo').style.display = 'none';
                for (let photo of Object.values(data)) {
                    photos_list_fb.insertBefore(generatePhotoTemplate(photo, true), photos_list_fb.firstChild);
                }
            }
        });
    
    // Save photo and display it in the UI
    function addPhoto(snap) {
        const photo = {
            id: Date.now(),
            date: new Date().toString(),
            source: snap
        };

        fetch('https://offline-demo-4b2ee.firebaseio.com/photos.json', {
            method: 'post',
            body: JSON.stringify(photo)
        })
        .then(response => {
            photos_list.insertBefore(generatePhotoTemplate(photo, true), photos_list.firstChild);
        });
    }

     // Return sync icon
    function getBackupStatusIcon(backup) {
        return backup ? "cloud_done" : "cloud_off";
    }

    // Generate html template for photo card
    function generatePhotoTemplate(photo, backup) {
        const tmpl = `
        <div class="card" id="photo-${photo.id}">
            <img src="${photo.source}">
            <div class="infos">
                <div class="date-time">
                    ${new Date(photo.date).toLocaleTimeString()}
                </div>
                <i class="material-icons">${getBackupStatusIcon(backup)}</i>
            </div>
        </div>
        `;
        const range = document.createRange();
        const fragment = range.createContextualFragment(tmpl);

        return fragment;
    }


    // Mobile browsers cannot play video without user input,
    // so here we're using a button to start it manually.
    start_camera.addEventListener("click", function (e) {

        e.preventDefault();
        video.play();
        showVideo();
    });

    // Event triggered when user clicks to display capture window
    capture_photo.addEventListener("click", function (e) {
        document.querySelector(".app").className += " visible";
        capture_photo.style.display = "none";
    });

    // Event triggered wen user take a picture
    take_photo_btn.addEventListener("click", function (e) {

        e.preventDefault();

        var snap = takeSnapshot();

        addPhoto(snap);
        // Pause video playback of stream.
        document.querySelector(".app").className = "app";
        capture_photo.style.display = "block";
    });

    // Generate hidden canvas with photo
    function takeSnapshot() {

        // Create hidden canvas element.  
        var hidden_canvas = document.querySelector('canvas'),
            context = hidden_canvas.getContext('2d');

        var width = video.videoWidth,
            height = video.videoHeight;

        if (width && height) {

            // Setup a canvas with the same dimensions as the video.
            hidden_canvas.width = width;
            hidden_canvas.height = height;

            // Make a copy of the current frame in the video on the canvas.
            context.drawImage(video, 0, 0, width, height);

            // Turn the canvas image into a dataURL that can be used as a src for our photo.
            return hidden_canvas.toDataURL('image/png');
        }
    }
    
    function showVideo() {
        hideUI();
        video.classList.add("visible");
        controls.classList.add("visible");
    }

    function displayErrorMessage(error_msg, error) {
        error = error || "";
        if (error) {
            console.error(error);
        }

        error_message.innerText = error_msg;

        hideUI();
        error_message.classList.add("visible");
    }

    function hideUI() {
        // Helper function for clearing the app UI.

        controls.classList.remove("visible");
        start_camera.classList.remove("visible");
        video.classList.remove("visible");
        error_message.classList.remove("visible");
    }

});
