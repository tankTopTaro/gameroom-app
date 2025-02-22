# GAME ROOM APP MISSION

## Table of Contents
- [GAME ROOM APP MISSION](#game-room-app-mission)
  - [Table of Contents](#table-of-contents)
  - [Introductions](#introductions)
  - [Technologies used](#technologies-used)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Suggested Improvements](#suggested-improvements)
      - [1.  Refactor `app.js` into Modules](#1--refactor-appjs-into-modules)
      - [2. Optimize `start()` Method in `GameSession`](#2-optimize-start-method-in-gamesession)
        - [Example room configuration object](#example-room-configuration-object)
        - [start()](#start)
        - [Utility functions](#utility-functions)
      - [3. Optimize `handleLightClickAction(lightId, whileColorWas)` Method in `GameSession`](#3-optimize-handlelightclickactionlightid-whilecolorwas-method-in-gamesession)
        - [Common functions](#common-functions)
        - [handleLightClickAction(lightId, whileColorWas)](#handlelightclickactionlightid-whilecolorwas)
      - [4. Refactor `"message"` event listeners for `door.js`, `room.js` and `monitor.js`](#4-refactor-message-event-listeners-for-doorjs-roomjs-and-monitorjs)
        - [Example message handler object](#example-message-handler-object)
  - [Important Feature](#important-feature)
  - [Bugs and Issues](#bugs-and-issues)

---

## Introductions
This app will know at all times where we are in the process, it will actively control the game sessions, and it will also act as a server, delivering HTML pages for several clients. These clients are :
-   **The Door screen**, where players can sign-in and select the level for the room
-   **The Room screen**, where players can see their score, lives, and timers (+ audio)
-   **The Monitor**, a temporary monitor accessible by our technicians to monitor the game (this is mostly used for debugging or new game creations) This page will be mimicking the game room animations at all times. It will be actually a mini virtual version of the entire game room itself.

---
## Technologies used
![HTML](https://img.shields.io/badge/HTML-5-orange?style=flat-square&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-3-blue?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow?style=flat-square&logo=javascript&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5-purple?style=flat-square&logo=bootstrap&logoColor=white)

---
## Installation
1. Install dependencies:
   ```javascript
   npm install
   ```
2. Start the application:
   ```javascript
   node app.js
   ```

---
## Usage

1. Add a player
![Test RFID](./screenshots/testRfid.png)

2. The added player should appear in the **Door screen**
![Door Screen](./screenshots/door1.png)

3. Select a level
![Level Select](./screenshots/levelSelect.png)

4. Submitting the selection should start the waiting timer for the **Door screen**
![Submit](./screenshots/levelSubmit.png)

5. The **Room screen** will also update its display
![Room](./screenshots/room.png)

6. The game can be played in the **Monitor screen**
![Monitor](./screenshots/monitor.png)

7. If a player is currently playing, players will be added to the waiting list
![Waiting](./screenshots/door2.png)

8. After the previous game session ended **Room Players** will be replaced by the **Next Players**
![New Players](./screenshots/newPlayers.png)

---
## Suggested Improvements
   #### 1.  Refactor `app.js` into Modules
   The current `app.js` file handles various responsibilities, including server setup, light control, and game logic, resulting in a single large file. This makes the code hard to maintain and extend

   > ##### Solution:
   > - Segment the code into modules, e.g., `Socket.js`, `Light.js`, etc.
   > - Import these modules into `app.js` to keep the main file concise and focused.

   #### 2. Optimize `start()` Method in `GameSession`
   The `start()` method contains repetitive code and lacks modularity.

   > ##### Solution:
   > - Create a configuration object for each room type, with properties for rules and levels
   > - Use this configuration object to dynamically execute room-specific.

   ##### Example room configuration object
   ```javascript
      const roomConfigurations = {
         doubleGrid: {
            rules: {
               1: {
                  levels: {
                     1: (session) => {
                        const numbersSequence = makeNumberSequence(12)
                        session.lightIdsSequence = assignLightIds(numbersSequence, room.lightGroups.wallScreens, room.lightGroups.wallButtons)
                     },
                     2: (session) => {
                        const numbersSequence = makeNumberSequence(12)
                        session.lightIdsSequence = assignLightIds(numbersSequence, room.lightGroups.wallScreens, room.lightGroups.wallButtons)
                     },
                     3: (session) => {
                        const numbersSequence = makeNumberSequence(12)
                        session.lightIdsSequence = assignLightIds(numbersSequence, room.lightGroups.wallScreens, room.lightGroups.wallButtons)
                     },
                  }
               }
            }
         },
         basketball: {
            rules: {
               1: {
                  levels: {
                     1: (session) => {
                        const colorsSequence = makeColorSequence(3)
                        playColorSequence(colorsSequence, room)
                     }
                  }
               }
            }
         }
      }

   ``` 
   ##### start()
   ```javascript
      start(){
         if (this.status === 'running') {
               console.warn('Game is already running. Ignoring start call.');
               return;
         }

         this.lastLevelStartedAt = Date.now();

         const roomSetup = roomConfigurations[roomType];

         if (roomSetup) {
            const ruleSetup = roomSetup.rules[this.rule]

            if (ruleSetup) {
               const levelSetup = ruleSetup.levels[this.level]

               if (levelSetup) {
                  levelSetup(this)  // Executes the level logic
               } else {
                  console.warn(`No setup defined for level ${this.level} in rule ${this.rule}.`)
               }
            } else {
               console.warn(`No setup defined for rule ${this.rule}.`)
            }
         } else {
            console.warn(`No setup defined for room type ${roomType}.`)
         }

         this.startMetronome();
         this.status = 'running';
         console.log('GameSession Started.');
      }

      startMetronome() {
         if (this.animationMetronome) {
            clearInterval(this.animationMetronome);
         }

         this.animationMetronome = setInterval(() => {
            this.updateCountdown();
            this.updateShapes();
            this.applyShapesOnLights();
            room.senLightsInstructionsIfIdle();
         } 1000 / 25)
      }
   ```
   ##### Utility functions
   ```javascript
      function makeNumberSequence(size) {
         const numbersSequence = [];
         for (let i = 1; i <= size; i++) {
            numbersSequence.push(i);
         }
         shuffleArray(numbersSequence);
         return numbersSequence
      }

      function shuffleArray(array) {
         for (let i = array.length - 1; i > 0; i--) {
            const j = getRandomInt(0, i);
            [array[i], array[j]] = [array[j], array[i]];
         }
      }

      function assignLightIds(numbersSequence, wallScreens, wallButtons) {
         const lightIdsSequence = [];

         wallScreens.forEach((light, i) => {
            light.color = [0, 0, numbersSequence[i]];
         });

         wallButtons.forEach((light, i) => {
            light.color = blueGreen1
            light.onClick = 'report'
            lightIdsSequence[numbersSequence[i]] = light.id;
         });

         lightIdsSequence.splice(0, 1);
         return lightIdsSequence;
      }

      function makeColorSequence(size) {
         const colors = [
            [255, 0, 0],    // red
            [0, 255, 0],    // green
            [0, 0, 255],    // blue
            [255, 255, 0],  // yellow
            [255, 0, 255]   // purple
         ]

         const colorsSequence = []

         for (let i = 0; i < size; i++) {
            colorsSequence.push(colors[Math.floor(Math.random() * colors.length)]);
         }

         return colorsSequence;
      }

      function getColorName(rgb) {
         const colorNames = {
               '255,0,0': 'red',
               '0,255,0': 'green',
               '0,0,255': 'blue',
               '255,255,0': 'yellow',
               '255,0,255': 'purple'
         }

         return colorNames[rgb.join(',')]
      }

      function playColorSequence(colorsSequence, room) {
         let currentColorIndex = 0;

         const showColorSequence = setInterval(() => {
            const currentColor = colorsSequence[currentColorIndex]
            console.log(currentColor)

            const colorName = getColorName(currentColor)

            console.log('Showing color: ', colorName)

            let message = {
                  'type': 'colorNames',
                  'name': colorName
            }

            room.socketForRoom.broadcastMessage(JSON.stringify(message))
            room.socketForMonitor.broadcastMessage(JSON.stringify(message))

            room.lightGroups.wallButtons.forEach((light) => {
                  light.color = colorsSequence[currentColorIndex];
            });
            
            currentColorIndex++;

            if (currentColorIndex >= colorsSequence.length) {
               setTimeout(() => {
                  clearInterval(showColorSequence);
                  
                  // TODO: Add another interval to change the shuffled colors after 3 seconds
                  const shuffledColors = shuffleArray([...colors]);
                  room.lightGroups.wallButtons.forEach((light, i) => {
                     light.color = shuffledColors[i]
                  })
                  let message = {
                     'type': 'colorNamesEnd',
                  }
                  room.socketForRoom.broadcastMessage(JSON.stringify(message))
                  room.socketForMonitor.broadcastMessage(JSON.stringify(message))
               }, 1000)
            }
         }, 1000)

         room.lightGroups.wallButtons.forEach((light, i) => {
            light.onClick = 'report';
            this.lightColorSequence[i] = colorsSequence[i % colorsSequence.length];
         }); 

         this.lightColorSequence.length = colorsSequence.length;
      }
      .... 
   ```
   
   #### 3. Optimize `handleLightClickAction(lightId, whileColorWas)` Method in `GameSession`
   The `handleLightClickAction(lightId, whileColorWas)` method contains repetitive code

   > ##### Solution:
   > - Create helper function for common actions

   ##### Common functions
   ```javascript
      
      function handleMainFloorLight (clickedLight, whileColorWas, removeLife, scoreMultiplier, broadcastMessage) {
         if (whileColorWas === '255, 0, 0') {
            scoreMultiplier = 1;
            
            removeLife();
            
            this.shapes.push(new Shape(clickedLight.posX+clickedLight.width/2,   clickedLight.posY+clickedLight.height/2,
            'rectangle', clickedLight.width/2, clickedLight.height/2, [255,100,0],
            'ignore', [{ x: 0, y: 0 }], 0, 'mainFloor', 2000 ));

            broadcastMessage('playerFailed');
         }
      }

      function handleWallButtonLight(clickedLight, ligthIdsSequence, correctButton, removeLife, scoreMultiplier, broadcastMessage) {
         if (clickedLight.id === lightIdsSequence[0]) {
            clickedLight.color = black;
            clickedLight.onClick = 'ignore'

            correctButton();

            broadcastMessage('playerScored');

            lightIdsSequence.splice(0, 1);
            if(this.ligthIdsSequence.length === 0){
               this.levelCompleted();
            }
         } else {
            scoreMultiplier = 1;
            removeLife();
            broadcastMessage('playerFailed')
         }
      }

      function broadcastMessage(type, scoreMultiplier, playerScore) {
         let message = {
            'type': type,
            'audio': type,
            'scoreMultiplier': scoreMultiplier,
         }

         room.socketForRoom.broadcastMessage(JSON.stringify(message));
         room.socketForMonitor.broadcastMessage(JSON.stringify(message));
      }
   ```
   ##### handleLightClickAction(lightId, whileColorWas)
   ```javascript
      function handleLightClickAction(lightId, whileColorWas) {
         const clickedLight = this.GetLightById(lightId);

         const handleDoubleGridLevel = () => {
            if (room.lightGroups['mainFloor'].find(obj => obj === clickedLight)) {
               handleMainFloorLight(clickedLight, whileColorWas, this.removeLife, this.scoreMultiplier, broadcastMessage);
            } else if (room.lightGroups['wallButtons'].find(obj => obj === clickedLight)) {
               handleWallButtonLight(clickedLight, this.ligthIdsSequence, this.correctButton, this.removeLife, this.scoreMultiplier, broadcastMessage);
            }
         };

         const handleBasketballLevel = () => {
            if (room.lightGroups['wallButtons'].find(obj => obj === clickedLight)) {
               if (clickedLight.color === this.lightColorSequence[0]) {
                  this.correctButton();
                  this.broadcastMessage('playerScored');
                  this.lightColorSequence.splice(0, 1);
                  if (this.lightColorSequence.length === 0) {
                     clearInterval(this.animationMetronome);
                     this.broadcastMessage('levelCompleted');
                     this.offerSameLevel();
                  }
               } else {
                  this.scoreMultiplier = 1;
                  this.removeLife();
                  this.broadcastMessage('playerFailed');
               }
            }
         };

         if (roomType ==='doubleGrid') {
            if (this.rule === 1) {
               switch(this.level) {
                  case 1:
                     handleDoubleGridLevel();
                     break;
                  case 2:
                     handleDoubleGridLevel();
                     break;
                  case 3:
                     handleDoubleGridLevel();
                     break;
                  default:
                     break; 
               }
            }
         } else if (roomType === 'basketball') {
            if (this.rule === 1) {
               switch(this.level) {
                  case 1:
                     handleBasketballLevel();
                     break;
                  default:
                     break; 
               }
            }
         }
      }
   ``` 
      
      

   #### 4. Refactor `"message"` event listeners for `door.js`, `room.js` and `monitor.js`
Currently the **'message'** event listeners rely heavily on using ``if`` statements to handle each message types.

> ##### Solution:
> - Create a meassage handler object
         
##### Example message handler object   
```javascript
const messageHandlers = {
   newLevelStarts: (data) => {
      let {roomType, rule, level, prepTime, audio, lifes} = data;
      let remainingTime = prepTime

      const updateTimer = () => {
         let minutes = Math.floor(remainingTime / 60);
         let seconds = remainingTime % 60;

         minutes = minutes < 10 ? '0' + minutes : minutes;
         seconds = seconds < 10 ? '0' + seconds : seconds;

         countdownElement.textContent = `${minutes}:${seconds}`;

         if (remainingTime === 3) {
            fetchAudio(audio);
         }

         remainingTime--;

         if (remainingTime < 0) {
            clearInterval(timerInterval);
         }
      };

      updateTimer();
      timerInterval = setInterval(updateTimer, 1000);

      setTimeout(() => {
         lifesElement.textContent = lifes;
         statusElement.textContent = '';
         roomElement.textContent = `Room: ${roomType} Rule: ${rule} Level: ${level}`;
      }, 1000);
   }

   # Put other message type handler logic here

   updateLifes: (data) => {
      lifesElement.textContent = data.lifes.toString();
      fetchAudio(data.audio);

      if (data.lifes === 0) {
            resetMonitor();
      }
   },

   updateCountdown: (data) => {
      let { countdown } = data;
      let minutes = Math.floor(countdown / 60);
      let seconds = countdown % 60;

      minutes = minutes < 10 ? '0' + minutes : minutes;
      seconds = seconds < 10 ? '0' + seconds : seconds;

      if (countdown < 61) {
            countdownElement.textContent = `${minutes}:${seconds}`;
      }
   },

   gameEnded: () => {
      resetMonitor();
      PrepareRoom();
   }
}

function startListenningToSocket(){
   ... 
   socket.addEventListener('message', event => {
      let json

      try {
         json = JSON.parse(event.data)
      } catch (error) {
         console.log('Received a non-json message:', event.data)
      }

      if(json){
         if(json?.type && messageHandlers[json.type]){
            messageHandlers[json.type](json)
         } else {
            console.warn('No handle for message type:', json?.type)
         }
      }
   })

}
``` 

> ### ⚠️ **Important Note:**
> The code snippets provided are meant to serve as a reference and still need to be adapted to the existing source code. They may be subject to further changes depending on the context and the rest of the code structure.

---
## Important Feature
I placed the audio of the game in the `/game/audio` endpoint. Any additional audio can be added here. Developer should keep in mind that they will have to broadcast the audio to the clients that needs it.
```javascript
   let message = {
      type: 'playerScored',
      audio: 'playerScored',
      scoreMultiplier: this.scoreMultiplier,
      playerScore: dummyPlayers[0].score
   }

   room.socketForRoom.broadcastMessage(JSON.stringify(message))
   room.socketForMonitor.broadcastMessage(JSON.stringify(message))
```

Once the audio has been broadcasted to the client, the developer can then use the `fetchAudio` to play the audio.
```javascript
   async function fetchAudio(soundName) {
      try{
         const response = await fetch(`/game/audio`)
         const data = await response.json()
         
         return new Promise((resolve, reject) => {
               const audio = new Audio(data[soundName])
               audio.muted = true;
               audio.play()
                  .then(() => {
                     audio.muted = false;
                  })
                  .catch(err => {
                     console.error('Autoplay failed:', err)
                     reject(err);
                  });
               
                  audio.onended = () => {
                     resolve();
                  };
         })

      }catch(error){
         console.error('Failed to load audio:', error)
      }
   }
```

---
## Bugs and Issues
1. If the first game session is not yet initialized and a new player submitted a new game session, it might overwrite the first game session.
2. If you try to keep the **Monitor** screen side by side with either the **Room** or **Door** screen, the **Monitor** will lag. 
3. The score is only added to the first entry of the dummyPlayers array, this need to be addressed when the database is implemented.
4. The `offerSameLevel` is currently in loop for the `basketball` room, so the game will continue as long as the player press the `continue` button at the end of each session.
5. The developer didn't find any decent audio for the greeting and goodbye for the `Room` and `Door` screen. 
6. The developer didn't find a way to make the animation for the `Level 3` of `doubleGrid` Room to look continuously moving as requested by the client.
7. The app is not designed to be used with mobile screen, the developer assumes that this app will be used with desktop monitors.







