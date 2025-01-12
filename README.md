# GAME ROOM APP MISSION

## Table of Contents
- [Introductions](#introductions)

## Introductions
This app will know at all times where we are in the process, it will actively control the game sessions, and it will also act as a server, delivering HTML pages for several clients. These clients are :
-   **The Door screen**, where players can sign-in
-   **The Game screen**, where players can see their score, lives, and timers (+ audio)
-   **The Game Monitor**, a temporary monitor accessible by our technicians to monitor the game (this is mostly used for debugging or new game creations) This page will be mimicking the game room animations at all times. It will be actually a mini virtual version of the entire game room itself.

## Installation
1. Install dependencies:
   ```bash
   npm install

2. Start the application:
   ```bash
   node app.js

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

8. After 







