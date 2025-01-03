let socket = new WebSocket('ws://' + window.location.hostname + ':8083');

// Button click event handler for simulating the RFID scan
const playerBtn = document.getElementById('player');

// Function to create a random player and send data
const createPlayer = () => {
    // Create random rfid number
    const rfid = Math.floor(Math.random() * 1000);

    // Pick random name
    const names = ['PlayerOne', 'PlayerTwo', 'PlayerThree', 'PlayerFour', 'PlayerFive', 'PlayerSix', 'PlayerSeven', 'PlayerEight', 'PlayerNine', 'PlayerTen'];
    const playerName = names[Math.floor(Math.random() * names.length)];

    // Pick random avatar
    const avatars = ['avatars/cool.png', 'avatars/shiba-inu.png', 'avatars/chick.png', 'avatars/fashion.png', 'avatars/frog.png', 'avatars/laugh.png'];
    const playerAvatar = avatars[Math.floor(Math.random() * avatars.length)];

    // Send HTTP POST request to add player to the server
    fetch(`/door/scannedRfid/${rfid}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            playerName: playerName,
            playerAvatar: playerAvatar
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Player added:', data);
    })
    .catch(error => {
        console.error('Error:', error);
    });
};

// Add event listener to button
if (playerBtn) {
    playerBtn.addEventListener('click', () => {
        createPlayer();
    });
}