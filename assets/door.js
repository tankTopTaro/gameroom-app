let socket = new WebSocket('ws://' + window.location.hostname + ':8082');
const players = {
    room: [],
    waiting: []
}

const startGameBtn = document.getElementById('startGameBtn');
const confirmBtn = document.getElementById('confirmBtn');

const levelOneBtns = document.querySelectorAll('.level-one');
const levelTwoBtns = document.querySelectorAll('.level-two');
const levelThreeBtns = document.querySelectorAll('.level-three');

const roomMessage = document.getElementById('roomMessage');
const basketballHoopsRoom = document.getElementById('basketballHoopsRoom')
const doubleGridRoom = document.getElementById('doubleGridRoom')
const countdownElement = document.getElementById('countdown')
const roomConfig = document.getElementById('roomConfig')

let selectedLevelBtn = null;
let selectedLevelValue = null;
let timerInterval = null;
let waitingTime = 300;

// TODO: figure out a way to persist the data
function startListenningToSocket(socket){

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
            if(json.type === 'playerAndRoomData'){
                const data = json
                renderDoorData(data)
            }
            if(json.type === 'newLevelStarts'){
                const data = json
                if(timerInterval){
                    clearInterval(timerInterval)
                    timerInterval=null
                }
                console.log('newGame', data)
                // Move waiting players to current players
                players.room.push(...players.waiting); // Move all waiting players to the room
                players.waiting = []; // Clear the waiting list
                renderPlayerData(players.room, 'player-room'); // Re-render current players
                renderPlayerData(players.waiting, 'player-waiting'); // Re-render waiting players (empty)
                roomMessage.textContent = json.message
                startWaitingTimer()
            }
            if(json.type === 'gameSessionInitialized'){
                roomMessage.textContent = json.message
            }
            if(json.type === 'gameEnded'){
                console.log(json.message)
                // reset the screen to defaults
                players.room = []
                renderPlayerData(players.room, 'player-room')
                roomMessage.textContent = json.message
                countdownElement.textContent = '00:00'

                if(timerInterval){
                    clearInterval(timerInterval)
                    timerInterval=null
                }

                roomConfig.classList.remove('roomConfigVisible');
                roomConfig.classList.add('roomConfigHidden');

                basketballHoopsRoom.classList.remove('showConfig');
                basketballHoopsRoom.classList.add('hideConfig');

                doubleGridRoom.classList.remove('showConfig');
                doubleGridRoom.classList.add('hideConfig');
            }
        }
    });

    // Listen for the 'close' event to know when the connection is closed
    socket.addEventListener('close', event => {
        console.log('WebSocket connection closed.');
    });

    // Listen for the 'error' event to handle any errors that may occur
    socket.addEventListener('error', event => {
        console.error('WebSocket error:', event);

        // TODO : Perform error handling logic here if needed
    });

    window.addEventListener('focus', event => {
        console.log('socket.readyState:',socket.readyState)
    });
}

function renderDoorData(data){
    const roomType = data.roomData
    const player = data.playerData

    if(players.waiting.length >= 6) {
        console.log('Player limit reached.')
        return;
    }
    
    players.waiting.push(player)
    renderPlayerData(players.waiting, 'player-waiting');
    renderRoomConfig(roomType)
}

function renderPlayerData(playerList, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Clear the container before rendering

    playerList.forEach(player => {
        const listItem = document.createElement('li');
        listItem.classList.add('list-item')

        // Create an image element for the avatar
        const avatarImg = document.createElement('img');
        avatarImg.src = player.playerAvatar || 'default-avatar.png';
        avatarImg.alt = `${player.nickname || 'Unknown'}'s avatar`;
        avatarImg.classList.add('avatar');

        // Create a span for the player's details
        const playerDetails = document.createElement('span');
        playerDetails.textContent = `${player.playerName || 'Unknown'}`;

        // Append avatar and details to the list item
        listItem.appendChild(avatarImg);
        listItem.appendChild(playerDetails);

        // Append the list item to the container
        container.appendChild(listItem);
    });
}

function renderRoomConfig(roomType){
    // Slide the roomConfig into view
    roomConfig.classList.remove('roomConfigHidden');
    roomConfig.classList.add('roomConfigVisible');

    // Hide both rooms initially
    basketballHoopsRoom.classList.remove('showConfig');
    basketballHoopsRoom.classList.add('hideConfig');
    doubleGridRoom.classList.remove('showConfig');
    doubleGridRoom.classList.add('hideConfig');

    if(selectedLevelBtn){
        selectedLevelBtn.classList.remove('btn-danger');
        selectedLevelBtn.classList.add('btn-primary');
        selectedLevelBtn = null;
        selectedLevelValue = null;
    }

    startGameBtn.textContent = 'Submit';
    startGameBtn.classList.remove('disabled')
    
    if (roomType === 'doubleGrid'){
        // only show the doubleGridRoom
        doubleGridRoom.classList.remove('hideConfig');
        doubleGridRoom.classList.add('showConfig');
    } else if (roomType === 'basketballHoops'){
        // only show the basketballHoopsRoom
        basketballHoopsRoom.classList.remove('hideConfig');
        basketballHoopsRoom.classList.add('showConfig');      
    }
}

async function submitRoomConfig(rule, level){
    const queryParams = new URLSearchParams({ rule, level }); 

    // check first if room is occupied, if not proceed, else save the players selection
    try {
        const response = await fetch(`/game/request?${queryParams.toString()}`, {
            method: 'GET',
        });

        const result = await response.json();

        if (response.ok) {
            console.log(result);
        } else {
            console.log('Failed to submit room config');
        }
    } catch (error) {
        console.error('Error submitting room config:', error);
    }
}

function handleLevelSelection(event) {
    const clickedButton = event.target;
    console.log('Clicked button:', clickedButton);
    console.log('Button level:', clickedButton.getAttribute('data-level'));

    if (selectedLevelBtn) {
        selectedLevelBtn.classList.remove('btn-danger');
        selectedLevelBtn.classList.add('btn-primary');
    }

    if (selectedLevelBtn === clickedButton) {
        selectedLevelBtn.classList.remove('btn-danger');
        selectedLevelBtn.classList.add('btn-primary');
        selectedLevelBtn = null;
        selectedLevelValue = null;
        return;
    }

    selectedLevelBtn = clickedButton;
    selectedLevelValue = selectedLevelBtn.getAttribute('data-level');
    selectedLevelBtn.classList.remove('btn-primary');
    selectedLevelBtn.classList.add('btn-danger');
}

levelOneBtns.forEach(button => {
    button.addEventListener('click', handleLevelSelection);
});
levelTwoBtns.forEach(button => {
    button.addEventListener('click', handleLevelSelection);
});
levelThreeBtns.forEach(button => {
    button.addEventListener('click', handleLevelSelection);
});


const XSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-x">
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M18 6l-12 12" />
                <path d="M6 6l12 12" />
              </svg>`

startGameBtn.addEventListener('click', () => {
    let selectedRuleValue = 1;

    if(selectedLevelValue) {
        // Open the modal if a level is selected
        // const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
        // confirmModal.show();

         // Move players from the lobby to the room
         if (players.room.length === 0) {
            players.room = [...players.room, ...players.waiting]; // Add all waiting players to the room
            players.waiting = []; // Clear the waiting list
         }

        // Hide room config and buttons
        roomConfig.classList.remove('roomConfigVisible');
        roomConfig.classList.add('roomConfigHidden');
        basketballHoopsRoom.classList.remove('showConfig');
        basketballHoopsRoom.classList.add('hideConfig');
        doubleGridRoom.classList.remove('showConfig');
        doubleGridRoom.classList.add('hideConfig');
        startGameBtn.textContent = '';
        startGameBtn.classList.add('disabled')
 
        // Re-render both lists 
        renderPlayerData(players.waiting, 'player-waiting');
        renderPlayerData(players.room, 'player-room');

        submitRoomConfig(selectedRuleValue, selectedLevelValue);
    } else {
        console.log('No level selected')
        startGameBtn.innerHTML = XSvg
        startGameBtn.classList.remove('btn-primary')
        startGameBtn.classList.add('btn-danger')
        setTimeout(() => {
            startGameBtn.textContent = 'Start Game'
            startGameBtn.classList.remove('btn-danger')
            startGameBtn.classList.add('btn-primary')
        }, 1000)
    }
})

function startWaitingTimer() {
    let remainingTime = waitingTime
                
    if(remainingTime !== null){
        const updateTimer = () => {

            let minutes = Math.floor(remainingTime / 60)
            let seconds = remainingTime % 60
    
            minutes = minutes < 10 ? '0' + minutes : minutes
            seconds = seconds < 10 ? '0' + seconds : seconds
    
            countdownElement.textContent = `${minutes}:${seconds}`
    
            remainingTime--
    
            if(remainingTime < 0) {
                clearInterval(timerInterval)
            }
        }
    
        updateTimer()
    
        timerInterval = setInterval(updateTimer, 1000)
    }
}

startListenningToSocket(socket)