let socket = undefined
let monitoringIsOn = true
let timerInterval = null
let isGameOver = false

const roomElement = document.getElementById('room-info')
const lifesContainer = document.getElementById('lifes-container')
const countdownElement = document.getElementById('countdown')
const playerMessage = document.getElementById('player-alert')

const heartSVG = `<svg id="heart" xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-heart">
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
                </svg>`

const heartbreakSVG = `<svg id="heart-broken" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-heart-broken">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
                    <path d="M12 6l-2 4l4 3l-2 4v3" />
                    </svg>` 

function startListenningToSocket(){
    // Create a new WebSocket connection
    socket = new WebSocket('ws://' + window.location.hostname + ':8081');

    // Listen for the 'open' event to know when the connection is established
    socket.addEventListener('open', event => {
        console.log('WebSocket connection opened.');

        // You can send messages to the WebSocket server using socket.send()
        socket.send('Hello from the browser!');
    });

    // Listen for incoming messages from the WebSocket server
    socket.addEventListener('message', event => {
        let json
        try {
            json = JSON.parse(event.data)
        } catch (error) {
            console.log('Received a non-json message:', event.data)
        }
        if(json){
            if(json.type === 'newLevelStarts'){
                let newGame = json  
                console.log('newLevelStarts', newGame)
                console.log('Current lifesContainer content:', lifesContainer.innerHTML)
                
                // Generate hearts based on 'newGame.lifes'
                if(isGameOver) {
                    setTimeout(() => {
                        lifesContainer.innerHTML = ''
                        for (let i = 0; i < newGame.lifes; i++) {
                            const heart = document.createElement('div');
                            heart.classList.add('heart');
                            heart.innerHTML = heartSVG;  // Insert the SVG directly
                            lifesContainer.appendChild(heart);
                        }
                    }, 2000)
                } else {
                    lifesContainer.innerHTML = ''
                    for (let i = 0; i < newGame.lifes; i++) {
                        const heart = document.createElement('div');
                        heart.classList.add('heart');
                        heart.innerHTML = heartSVG;  // Insert the SVG directly
                        lifesContainer.appendChild(heart);
                    }
                }

                roomElement.textContent = `Rule ${newGame.rule} Level ${newGame.level}`

                let prepTime = newGame.prepTime
                let remainingTime = prepTime
                if(timerInterval) {
                    clearInterval(timerInterval)
                    timerInterval = null
                }

                const updateTimer = () => {
                    let minutes = Math.floor(remainingTime / 60)
                    let seconds = remainingTime % 60

                    minutes = minutes < 10 ? '0' + minutes : minutes
                    seconds = seconds < 10 ? '0' + seconds : seconds

                    countdownElement.textContent = `${minutes}:${seconds}`

                    if(remainingTime === 3){
                        fetchAudio(newGame.audio)
                    }

                    remainingTime--

                    if(remainingTime < 0) {
                        clearInterval(timerInterval)
                    }
                }

                updateTimer()

                timerInterval = setInterval(updateTimer, 1000)
            }
            else if(json.type === 'updateLifes'){
                let lifes = json.lifes

                console.log('Updating lifes to:', lifes)

                const hearts = lifesContainer.querySelectorAll('.heart')

                // Remove extra hearts and replace with heartbreaks
                if (hearts.length > lifes) {
                    for (let i = lifes; i < hearts.length; i++) {
                        const heart = hearts[i];

                        // Create the heartbreak element
                        const heartbreak = document.createElement('div');
                        heartbreak.classList.add('heart-broken');
                        heartbreak.innerHTML = heartbreakSVG;

                        // Add animation to the heart disappearing
                        heart.classList.add('heart-lost');
                        setTimeout(() => {
                            // Replace heart with heartbreak at the same position
                            if (lifesContainer.contains(heart)) {
                                lifesContainer.replaceChild(heartbreak, heart);
                            }
                        }, 500); // Match the animation duration
                    }
                }
            }
            else if(json.type === 'noMoreLifes') {
                isGameOver = true
                setTimeout(() => {
                    lifesContainer.innerHTML = ''
                }, 2000)
                
            }
            else if(json.type === 'updateCountdown'){
                let countdown = json.countdown
                let minutes = Math.floor(countdown / 60)
                let seconds = countdown % 60

                minutes = minutes < 10 ? '0' + minutes : minutes
                seconds = seconds < 10 ? '0' + seconds : seconds

                if(countdown < 61){
                    countdownElement.textContent = `${minutes}:${seconds}`
                }
            }
            else if(json.type === 'offerSameLevel' || 
                json.type === 'offerNextLevel'){
                console.log(json.message)
                // hide the hud then show the message
                const hud = document.querySelector('.hud');
                const roomMessageContainer = document.querySelector('.room-message-container');
                const roomMessage = document.getElementById('room-message')
                roomMessage.textContent = json.message

                // Hide the HUD
                if (hud) {
                    hud.classList.remove('d-flex')
                    hud.classList.add('d-none')
                }

                if (roomMessageContainer) {
                    roomMessageContainer.classList.remove('d-none');
                    roomMessageContainer.classList.add('d-flex');
                }

                const continueBtn = document.getElementById('continue-button')
                if (continueBtn) {
                    continueBtn.addEventListener('click', () => {
                        const message = {
                            'type': 'continue'
                        };
            
                        // Send the message via the socket
                        socket.send(JSON.stringify(message));
            
                        // Hide the room message and show the HUD again
                        if (roomMessageContainer) {
                            roomMessageContainer.classList.remove('d-flex');
                            roomMessageContainer.classList.add('d-none');
                        }
            
                        if (hud) {
                            hud.classList.remove('d-none');
                            hud.classList.add('d-flex');
                        }
                    });
                }

                const noBtn = document.getElementById('no-button')
                if (noBtn) {
                    noBtn.addEventListener('click', () => {
                        const message = {
                            'type': 'exit'
                        };
            
                        // Send the message via the socket
                        socket.send(JSON.stringify(message));
            
                        // Hide the room message and show the HUD again
                        if (roomMessageContainer) {
                            roomMessageContainer.classList.remove('d-flex');
                            roomMessageContainer.classList.add('d-none');
                        }
            
                        if (hud) {
                            hud.classList.remove('d-none');
                            hud.classList.add('d-flex');
                        }
                    });
                }

                setTimeout(() => {
                    noBtn.click()
                }, 3000)
            }
            else if(json.type === 'gameEnded'){
                console.log(json.message)
                playerMessage.textContent = json.message
                setTimeout(() => {
                    playerMessage.textContent = ''
                    roomMessage.textContent = ''
                    lifesContainer.innerHTML = ''
                }, 2000)
            }
        }

    });

    // Listen for the 'close' event to know when the connection is closed
    socket.addEventListener('close', event => {
        console.log('WebSocket connection closed.');
        if(monitoringIsOn){
            console.log('Redrawing the room after WebSocket connection closed.');
            // PrepareRoom() // Restart socket upon closed unintentionnally
        }

    });

    // Listen for the 'error' event to handle any errors that may occur
    socket.addEventListener('error', event => {
        console.error('WebSocket error:', event);

        // TODO : Perform error handling logic here if needed
    });

    window.addEventListener('focus', event => {
        console.log('socket.readyState:',socket.readyState)
        if(monitoringIsOn && socket.readyState === 3){
            console.log('Redrawing the room after upon window focus event and socket closed')
            // PrepareRoom()
        }
    });
}

async function fetchAudio(soundName) {
    try{
        const response = await fetch(`/game/audio`)
        const data = await response.json()
        
        // console.log(data)
        const audio = new Audio(data[soundName])
        audio.muted = true;
        audio.play().then(() => {
            audio.muted = false;
        }).catch(err => {
            console.error('Autoplay failed:', err)
        });

    }catch(error){
        console.error('Failed to load audio:', error)
    }
}

startListenningToSocket()