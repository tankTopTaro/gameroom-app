# Game Room App

## The Game Monitor
  - [x] Get rid of yellow traces after a few seconds
  - [x] Add a div where you display the remaining lives, timer, and "you win", "you loose" messages
  - [x] Arrange to make sure that the room representation div will always fit entirely in the viewport, without affecting its proportions
  - [x] Add a sound upon
    - [x] losing a life
    - [x] marking a point
    - [x] winning the session
    - [x] losing the session

## The Game Logic
  - [x] For the existing game rule, make it so that when the wrong number is clicked (any number except the expected number) the player lose 1 life
  - [x] In game rule 1, improve the level 2 by adding a second red bar that travels in the same way across the floor, but vertically
  - [x] For the existing room setup and game rule (`doubleGrid`, `rule 1`). Create an additional game level that mimics exactly the game presented in this [video](https://www.youtube.com/watch?v=lM84hHIDato) at 3:34
  - [x] Create in the code, another room type to mimic exactly the room in this [video](https://www.tiktok.com/@activategames/video/7249806076437171461)
    - [x] Its a very simple one, its just a 5 big rectangle light (representing basketball hoops) with their color and sensor.
    - [x] Use the same logic of flat projection
    - [x] Keep in mind that a matrix has to be implemented as matrix in the code (not as independent lights) for the app to optimize its animations as much as possible. So in this case, it is a matrix of 5 x 1
  - [x] Create a game rule 1 and level 1 for that new room setup
  - [x] Implement the following logic between game sessions:
    - [x] When the game session is over
      - [x] If nobody is waiting at the door, then
        - [x] Winnning: continue to next level (if any)
        - [x] Losing: ask if they want to try again (by pressing a blinking button in the room)
      - [x] If next group is waiting at the door, then
        - [x] Ask current group to leave the room
  - [x] Keep the current code architecture.
  - [x] Propose, in a text document, an optimal way of refactoring the code, in order to allow many different room setups and game rules, not by putting them in `if statements`, but rather in a modular way

## The Game Screen
  - [x] Come up with a sober design that fits our needs for this page and make it functional
  - [x] Show all available info there in real time and play the sounds as well
  - [x] Make sure the content stretched nice regardless of the viewport size

## The Door Screen
  - The logic of the Door screen is:
    - [x] If there is currently no game session in that room, the group can enter right away after confirming the check-in
    - [x] If there is a game session currently ongoing in that room, the group checking-in will be required to wait until that level finishes.
  
  - Come up with a sober design that fits our need for this page and make it functional
    - [x] It should make the least possible calls to the server (because server is busy with game logic etc.)
    - [x] It should show the available game rules and levels for the current room
    - [x] Allow the player to select and validate his choices
    - [x] Show to the player how long he needs to wait until game starts
    - [x] Show to the player when he can enter the room

## The RFID Scanner
  - [x] Each player will have an RFID bracelet, and they will scan it during the check-in and game selection at the door
  - [x] The RFID scanner will be a simple device that sends an ID to the gameroom server everytime a new badge is scanned
  - [x] The gameroom server should then push that information to the Door screen, in order for the Door screen to be able to display the player on ther screen (with his nickname and a small picture)
  - [x] Those name and picture are stored in a central database which will be implemented later, so for now,  just use dummy pictures and names upon http calls to the server on the endpoint `/door/scannedRfid/<id>`
