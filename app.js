/**
 * Date started: 2024-12-12
 * Author: Kevin Balmores
 * Last modified: 2025-01-02
 * 
 * 
 * Terminal: node app.js
 * Follow Instructions on the console
 * 
 */

const express = require('express');
const path = require('path');
const Console = require("console");
const { handleUncaughtException, hsvToRgb, areRectanglesIntersecting } = require('./utils.js');

require('dotenv').config();

//const roomType = process.env.GAME_ROOM_BASKETBALL;
const roomType = process.env.GAME_ROOM_DOUBLEGRID;
const dummyPlayers = [] // TODO: Replace with actual database

process.on('uncaughtException', handleUncaughtException)

const blueGreen1 = hsvToRgb([130,220,255])
const black = hsvToRgb([0,0,0])

/** Classes */
const Light = require('./Light.js');
const Shape = require('./Shape.js');
const Socket = require('./Socket.js');

class Room{
    constructor(roomType) {
        this.type = roomType
        this.isFree = true;
        this.server = undefined
        this.currentGameSession = undefined
        this.waitingGameSession = undefined // the one waiting at the door
        this.width
        this.height // understand this a 2d room plan
        this.created_at = Date.now()
        this.lights = []
        this.sendLightsInstructionsIsBusy = false
        this.sendLightsInstructionsRequestIsPending = false
        this.lightCounter = 0
        this.lightGroups = {}

        this.currentPlayer = undefined
        
        this.init()
    }

    async init(){
        await this.prepareLights()
        await this.measure()
        this.startServer()
        this.socketForMonitor = new Socket('monitor', 8080)
        this.socketForRoom = new Socket('room', 8081)
        this.socketForDoor = new Socket('door', 8082)
    }

    prepareLights(){
        if(this.type === 'doubleGrid'){

            this.addMatrix(130,130,'rectangle','ledSwitch',960,480,25,25,5,5,'mainFloor', true)

            this.addMatrix(255,70,'rectangle','ledSwitch',960,100,15,15,200,40, 'wallButtons',false)
            this.addMatrix(255,640,'rectangle','ledSwitch',960,100,15,15,200,40,'wallButtons',false)
            this.addMatrix(70,240,'rectangle','ledSwitch',100,500,15,15,40,200,'wallButtons',false)
            this.addMatrix(1120,240,'rectangle','ledSwitch',100,500,15,15,40,200,'wallButtons',false)

            this.addMatrix(250,30,'rectangle','screen',960,100,25,25,190,40, 'wallScreens',false)
            this.addMatrix(250,670,'rectangle','screen',960,100,25,25,190,40,'wallScreens',false)
            this.addMatrix(30,235,'rectangle','screen',100,500,25,25,40,190,'wallScreens',false)
            this.addMatrix(1150,235,'rectangle','screen',100,500,25,25,40,190,'wallScreens',false)

        }
        else if(this.type === 'basketball'){
            this.addMatrix(130,130,'rectangle','ledSwitch',960,100,80,80,90,5,'wallButtons', false)
        }
    }

    addMatrix(matrixPosX,matrixPosY,elementsShape,elementsType,matrixWidth,matrixHeight,tileWidth,tileHeight,marginX,marginY,lightGroup,isAffectedByAnimation){
        let numberOfTilesX = Math.floor(matrixWidth / (tileWidth+marginX))
        let numberOfTilesY = Math.floor(matrixHeight / (tileHeight+marginY))
        for (let i = 0; i < numberOfTilesX; i++) {
            for (let j = 0; j < numberOfTilesY; j++) {
                let light = new Light(this.lightCounter,matrixPosX+(i*(tileWidth+marginX)),matrixPosY+(j*(tileHeight+marginY)), elementsShape, elementsType, tileWidth, tileHeight,isAffectedByAnimation)
                if (!(lightGroup in this.lightGroups)){
                    this.lightGroups[lightGroup] = []
                }
                this.lightGroups[lightGroup].push(light)
                this.lights.push(light)
                this.lightCounter++
            }
        }
    }

    measure(){
        let minX,maxX,minY,maxY = undefined
        this.lights.forEach((light) => {
            if(minX === undefined || light.posX < minX){minX = light.posX}
            if(maxX === undefined || (light.posX+light.width) > maxX){maxX = (light.posX+light.width)}
            if(minY === undefined || light.posY < minY){minY = light.posY}
            if(maxY === undefined || (light.posY+light.height) > maxY){maxY = (light.posY+light.height)}
        })
        this.padding = {'left':minX,'top':minY}
        this.width = maxX + minX
        this.height = maxY + minY
    }

    startServer(){
        // Prepare server
        this.server = express();
        const serverPort = process.env.GAME_ROOM_SERVER_PORT || 3001;
        const serverHostname = 'localhost';

        // Middleware to set no-cache headers for all routes
        this.server.use((req, res, next) => {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');
            next();
        });

        this.server.use(express.static(path.join(__dirname, 'assets')));

        this.server.use(express.json());

        this.server.get('/', (req, res) => {
            res.send('<html><body><h1>Hello</h1></body></html>');
        });

        this.server.get('/door', (req, res) => {
            const filePath = path.join(__dirname, 'assets/door.html');
            res.sendFile(filePath);
        });

        this.server.post('/door/scannedRfid/:id', (req, res) => {
            const { id } = req.params;
            const { playerName, playerAvatar } = req.body

            const playerData = { id, playerName, playerAvatar, score: 0 }

            dummyPlayers.push(playerData)   // add players to waiting list

            console.log(`RFID scanned: ${id}, broadcasting to door clients`);
            let message = {
                'type': 'playerAndRoomData', 
                'playerData': dummyPlayers,
                'roomData': this.type
            }
            room.socketForDoor.broadcastMessage(JSON.stringify(message));
            room.socketForRoom.broadcastMessage(JSON.stringify(message));
            res.json({ message: 'Player data broadcasted', data: playerData });
            
        })

        this.server.get('/test-rfid', (req, res) => {
            const filePath = path.join(__dirname, 'assets/test-rfid.html');
            res.sendFile(filePath);
        })

        this.server.get('/room', (req, res) => {
            const filePath = path.join(__dirname, 'assets/room.html');
            res.sendFile(filePath);
        });

        this.server.get('/game/request', async (req, res) => {
            // console.log(req.query);
            /* // Move waiting players to the room
            if(dummyPlayers.waiting && dummyPlayers.waiting.length > 0){
                if(dummyPlayers.playing.length === 0){
                    dummyPlayers.playing = [...dummyPlayers.waiting]
                    dummyPlayers.waiting = []   // Clear the waiting list
                }
            }
            
            // Broadcast the updated player data
            let message = {
                'type': 'playingList',
                'playing': dummyPlayers.playing,
            }
            room.socketForDoor.broadcastMessage(JSON.stringify(message)); */

            if(this.isFree){

                this.currentGameSession = new GameSession(req.query.rule, req.query.level)
                let gameSessionInitialized = await this.currentGameSession.init()
                
               /*  if(dummyPlayers.playing.length === 0){
                    console.log('Moving players to room...')
                    dummyPlayers.playing = [...dummyPlayers.waiting]
                    dummyPlayers.waiting = []   // Clear the waiting list
                    console.log('Waiting: ', dummyPlayers.waiting, ' Playing: ', dummyPlayers.playing)
                }*/
                
                let message = { 
                    'type': 'gameSessionInitialized', 
                    'message': 'Please wait',
                    'playerData': dummyPlayers,
                }
                room.socketForDoor.broadcastMessage(JSON.stringify(message));
                
                if(gameSessionInitialized === true){
                    //res.send('<html><body><h1>Please enter the room</h1></body></html>');    
                    res.json({ "gameSessionInitialized": gameSessionInitialized });
                }
                else{
                    res.json({ "gameSessionInitialized": gameSessionInitialized });
                    //res.send('<html><body><h1>'+gameSessionInitialized+'</h1></body></html>');
                }
                
            }
            else{
                this.waitingGameSession = new GameSession(req.query.rule, req.query.level)
                
                //res.send('<html><body><h1>Please wait</h1></body></html>');
                res.json({ "waitingGameSession": this.waitingGameSession });
            }
        });

        this.server.get('/game/lightClickAction', (req, res) => {
            //console.log(req.query)
            room.currentGameSession.handleLightClickAction(parseInt(req.query.lightId, 10), req.query.whileColorWas)
            res.send('ok');
        });

        this.server.get('/monitor', (req, res) => {
            const filePath = path.join(__dirname, 'assets/monitor.html');
            res.sendFile(filePath);
        });

        this.server.get('/get/roomData', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.json({'room':{'width':this.width,'height':this.height},'lights':this.lights})
        });

        this.server.get('/game/audio', (req, res) => {
            const sounds = {
                'levelFailed': 'sounds/703542__yoshicakes77__dead.ogg',
                'levelCompleted': 'sounds/703543__yoshicakes77__win.ogg',
                'playerScored': 'sounds/703541__yoshicakes77__coin.ogg',
                'playerLoseLife': 'sounds/253174__suntemple__retro-you-lose-sfx.wav',
                'gameOver': 'sounds/76376__deleted_user_877451__game_over.wav',
                '321go': 'sounds/474474__bnewton103__robotic-countdown.wav',

                // Colors
                'red': 'sounds/196551__margo_heston__red-f.wav',
                'green': 'sounds/196520__margo_heston__green-f.wav',
                'blue': 'sounds/196535__margo_heston__blue-f.wav',
                'yellow': 'sounds/196531__margo_heston__yellow-f.wav',
                'purple': 'sounds/196547__margo_heston__purple-f.wav'
            }

            res.json(sounds)
        })

        this.server.listen(serverPort, serverHostname, () => {
            console.log(`Server running at http://${serverHostname}:${serverPort}/`);
            console.log(`Monitor the room in 2D : http://${serverHostname}:${serverPort}/monitor`);
            console.log(`Start a game : http://${serverHostname}:${serverPort}/game/request?rule=1&level=1`);
            console.log(`Start a game : http://${serverHostname}:${serverPort}/game/request?rule=1&level=2`);
            console.log(`Start a game : http://${serverHostname}:${serverPort}/game/request?rule=1&level=3`);
            console.log(`Start a game with error : http://${serverHostname}:${serverPort}/game/request`);
            console.log(`See the door screen : http://${serverHostname}:${serverPort}/door`);
            console.log(`See the room screen : http://${serverHostname}:${serverPort}/room`);
            console.log(`Simulate an RFID scan: http://${serverHostname}:${serverPort}/test-rfid`);
        });
    }

    sendLightsInstructionsIfIdle(){

        if(this.sendLightsInstructionsIsBusy){
            if(this.sendLightsInstructionsRequestIsPending){
                console.log('WARNING : Animation frame LOST ! (received sendLightsInstructionsIfIdle while sendLightsInstructionsRequestIsPending Already)')
                return false
            }
            this.sendLightsInstructionsRequestIsPending = true
            console.log('WARNING : Animation frame delayed (received sendLightsInstructionsIfIdle while sendLightsInstructionsIsBusy)')
            return false
        }
        this.sendLightsInstructionsIsBusy = true

        this.sendLightsInstructions()

        this.sendLightsInstructionsIsBusy = false
        if(this.sendLightsInstructionsRequestIsPending){
            this.sendLightsInstructionsRequestIsPending = false
            this.sendLightsInstructionsIfIdle()
            console.log('WARNING : doing another sendLightsInstructionsIfIdle in a row')
            return true
        }
        return true
    }

    sendLightsInstructions(){
        this.lights.forEach((light) => {
            light.newInstructionString = JSON.stringify(light.color)
            if(light.lastHardwareInstructionString !== light.newInstructionString){
                this.sendHardwareInstruction(light)
            }
            if(light.lastSocketInstructionString !== light.newInstructionString){
                this.sendSocketInstructionForMonitor(light)
            }

        })
    }

    async sendHardwareInstruction(light){
        let newInstructionString = light.newInstructionString
        let response = await this.sendToHardware(light.hardwareAddress,light.color)
        if(response === true){
            light.lastHardwareInstructionString = newInstructionString
        }else{
            console.log('WARNING : sendToHardware FAILS ! for following light:')
            console.log(light)
        }
    }

    async sendSocketInstructionForMonitor(light){

        let newInstructionString = light.newInstructionString
        //Console.log('TEST Changing light id:',light.id,' to: ', newInstructionString)
        let response = await this.sendToSocketForMonitor(light)
        if(response === true){
            light.lastSocketInstructionString = newInstructionString
        }else{
            console.log('WARNING : sendToSocketForMonitor FAILS ! for following light:')
            console.log(light)
        }
    }

    async sendToHardware(){
        // TODO
        return true
    }

    async sendToSocketForMonitor(light){
        let message = {'type':'updateLight','lightId':light.id,'color':light.color,'onClick':light.onClick}
        this.socketForMonitor.broadcastMessage(JSON.stringify(message))
        return true
    }
}

class GameSession{
    constructor(rule,level) {
        this.status = undefined
        this.rule = Number(rule)
        this.level = Number(level)
        this.gameStartedAt = undefined
        this.animationMetronome = undefined
        this.shapes = []
        this.lastLevelCreatedAt = Date.now()
        this.lastLevelStartedAt
        this.createdAt = Date.now()
        this.levelsStartedWhileSessionIsWaiting = 0
        this.timeForWaiting = 300
        this.doorCountdown = this.timeForWaiting
        this.doorTimeStartedAt = Date.now()
        this.doorTimer = undefined
        this.score = 0
    }

    async init(){
        let result

        await this.prepareAndGreet()
            .then(() => {
                room.isFree = false
                this.start()
                result = true
            })
            .catch((e) => {
                console.log('CATCH: prepareAndGreet() failed')
                console.log(e)
                this.currentGameSession = undefined
                console.log('Game session cancelled.')
                console.log('Room remains free.')
                result = e
                // TODO: reportErrorToCentral(e);
            });

        return result
    }

    reset(){
        this.status = undefined
        this.shapes = []
        if(this.doorTimer){
            clearInterval(this.doorTimer)
            this.doorTimer = undefined
        }
        this.lastLevelCreatedAt = Date.now()
        room.lights.forEach(light => {
            light.color = black
            light.onClick = 'ignore'
        })
        room.sendLightsInstructionsIfIdle()
    }

    prepareAndGreet(){
        let prepared = this.prepare()
        let greeted = this.greet()
        return Promise.all([prepared, greeted])
            .then((results) => {
                console.log('Both promises are resolved!');
                console.log('Result of prepare() :', results[0]);
                console.log('Result of greet() :', results[1]);
            })
    }

    greet(){  // greet() will say hi to the player and will happen while prepare() prepares the game
        return new Promise((resolve) => {
            console.log('Greeting sound starts...');
            setTimeout(() => {
                console.log('Greeting sound ends...');
                resolve(true);
            }, 2000);
        });
    }

    async prepare(){  // prepares anything that is better to prepare and wait for the players input on a certain button (or a countdown to end)
        return new Promise((resolve,reject) => {
            console.log('preparation starts...');
            this.doorTimer = setInterval(() => {
                this.updateDoorCountdown()
            }, 0)

            this.prepTime = 5
            this.timeForLevel = 60
            this.countdown = this.timeForLevel
            this.lifes = 5      // At every level, the player starts with 5 lifes 
            this.lastLifeLostAt = 0

            this.scoreMultiplier = 1
            this.baseScore = 10

            let message = {
                'type':'newLevelStarts',
                'rule':this.rule,
                'level':this.level,
                'lifes':this.lifes,
                'countdown':this.countdown,
                'prepTime':this.prepTime,
                'roomType':roomType,
                'players': dummyPlayers,
                'audio': '321go',
                'message': 'Please enter the room',
            }

            room.socketForRoom.broadcastMessage(JSON.stringify(message))
            room.socketForMonitor.broadcastMessage(JSON.stringify(message))
            room.socketForDoor.broadcastMessage(JSON.stringify(message))

            setTimeout(async () => {
                try{
                    await this.prepareShapes()
                    console.log('preparation ends...');
                    this.status = 'prepared'
                    resolve(true);
                }
                catch(e){ //need to catch and reject explicitely because the we are in a SetTimeout
                    Console.log('CATCH: prepareShapes() failed')
                    reject(e);
                }

            }, this.prepTime * 1000);
        });
    }

    // Generates a shape that moves along a predefined path
    prepareShapes(){
        // TODO: See if I can smooth out the animation of the path
        if(roomType === 'doubleGrid'){
            if(this.rule === 1){
                if(this.level === 1){
                    let pathDots = [
                        { x: 25, y: 0 },
                        { x: 100, y: -180 },
                        { x: 200, y: -340 },
                        { x: 300, y: -420 },
                        { x: 400, y: -474 },
                        { x: 500, y: -500 },
                        { x: 595, y: -474 },
                        { x: 690, y: -420 },
                        { x: 785, y: -340 },
                        { x: 880, y: -180 },
                        { x: 955, y: 0 },
                        { x: 880, y: -180 },
                        { x: 785, y: -340 },
                        { x: 690, y: -420 },
                        { x: 595, y: -474 },
                        { x: 500, y: -500 },
                        { x: 400, y: -474 },
                        { x: 300, y: -420 },
                        { x: 200, y: -340 },
                        { x: 100, y: -180 },
                        { x: 25, y: 0 }
                    ];
                    
                    this.shapes.push(new Shape(100,100, 'rectangle',35,3000, [255,0,0], 'report',  pathDots, 0.01, 'mainFloor'))
                }
                else if(this.level === 2){
                    let pathDotsAlongVertical = [
                        { x: 0, y: 25 },
                        { x: -50, y: 100 },
                        { x: -150, y: 250 },
                        { x: -300, y: 400 },
                        { x: -450, y: 450 },
                        { x: -500, y: 450 },
                        { x: -450, y: 400 },
                        { x: -300, y: 250 },
                        { x: -150, y: 100 },
                        { x: -50, y: 50 },
                        { x: 0, y: 25 }
                    ];

                    let pathDotsAlongHorizontal = [
                        { x: 25, y: 0 },
                        { x: 100, y: -180 },
                        { x: 200, y: -340 },
                        { x: 300, y: -420 },
                        { x: 400, y: -474 },
                        { x: 500, y: -500 },
                        { x: 595, y: -474 },
                        { x: 690, y: -420 },
                        { x: 785, y: -340 },
                        { x: 880, y: -180 },
                        { x: 955, y: 0 },
                        { x: 880, y: -180 },
                        { x: 785, y: -340 },
                        { x: 690, y: -420 },
                        { x: 595, y: -474 },
                        { x: 500, y: -500 },
                        { x: 400, y: -474 },
                        { x: 300, y: -420 },
                        { x: 200, y: -340 },
                        { x: 100, y: -180 },
                        { x: 25, y: 0 }
                    ]
                    //pathDots = pathDots.reverse().concat(pathDots)
                    this.shapes.push(new Shape(100,100, 'rectangle',35,3000, [255,0,0], 'report',  pathDotsAlongHorizontal, 0.015, 'mainFloor'))
                    this.shapes.push(new Shape(100,100, 'rectangle',3000,35, [255,0,0], 'report',  pathDotsAlongVertical, 0.015, 'mainFloor'))
                }
                else if(this.level === 3){
                    // TODO: Figure out how to add tails to the pathDots like the one in the video
                    // Left to Right
                    let pathDots = [
                        { x: 0, y: 0 },
                        { x: 25, y: 0 },
                        { x: 100, y: 0 },
                        { x: 200, y: 0 },
                        { x: 300, y: 0 },
                        { x: 400, y: 0 },
                        { x: 500, y: 0 },
                        { x: 595, y: 0 },
                        { x: 690, y: 0 },
                        { x: 785, y: 0 },
                        { x: 785, y: 100 },
                        { x: 785, y: 250 },
                        { x: 785, y: 300 },
                        { x: 690, y: 300 },
                        { x: 595, y: 300 },
                        { x: 500, y: 300 },
                        { x: 400, y: 300 },
                        { x: 300, y: 300 },
                        { x: 200, y: 300 }, 
                        { x: 100, y: 300 },
                        { x: 25, y: 300 },
                        { x: 0, y: 300 },
                        { x: 0, y: 250 },
                        { x: 0, y: 100 },
                        { x: 0, y: 25 },
                        { x: 0, y: 0 },
                    ];

                    let safeDots = [
                        { x: 0, y: 0 }
                    ]

                    // Danger Zone
                    this.shapes.push(new Shape(150,150, 'rectangle',150,150, [255,0,0], 'report',  pathDots, 0.018, 'mainFloor'))
                    
                    // Safe Zone
                    this.shapes.push(new Shape(320,320, 'rectangle',560,90, [0,255,0], 'report',  safeDots, 0, 'mainFloor'))
                }
            }
            else{
                throw new Error('level doesnt match')
            }
        } 
    }

    // Starts the game session
    start(){
        if (this.status === 'running') {
            console.warn('Game is already running. Ignoring start call.');
            return; // Prevent multiple starts
        }

        console.log('Starting the Game...');
        this.lastLevelStartedAt = Date.now()
        
        if(roomType === 'doubleGrid'){          
            if(this.rule === 1){                
                if(this.level === 1){            

                    function getRandomInt(min, max) {
                        return Math.floor(Math.random() * (max - min + 1)) + min;
                    }
                    function shuffleArray(array) {
                        for (let i = array.length - 1; i > 0; i--) {
                            const j = getRandomInt(0, i);
                            [array[i], array[j]] = [array[j], array[i]];
                        }
                    }
                    
                    // Generates an array of numbers, shuffles it, and returns the shuffled sequence.
                    function makeNumberSequence(size){
                        const numbersSequence = [];
                        for (let i = 1; i <= size; i++) {
                            numbersSequence.push(i);
                        }
                        shuffleArray(numbersSequence);
                        return numbersSequence
                    }

                    const numbersSequence = makeNumberSequence(12)
                    console.log('TEST: numbersSequence: ',numbersSequence)

                    this.ligthIdsSequence = []

                    room.lightGroups.wallScreens.forEach((light, i) => {
                        light.color = [0,0,numbersSequence[i]]
                    })

                    room.lightGroups.wallButtons.forEach((light, i) => {
                        light.color = blueGreen1
                        light.onClick = 'report'
                        this.ligthIdsSequence[numbersSequence[i]] = light.id
                    })

                    this.ligthIdsSequence.splice(0, 1)

                }
                else if(this.level === 2){
                    // TODO: refactor this as it duplicates the code from level 1
                    function getRandomInt(min, max) {
                        return Math.floor(Math.random() * (max - min + 1)) + min;
                    }
                    function shuffleArray(array) {
                        for (let i = array.length - 1; i > 0; i--) {
                            const j = getRandomInt(0, i);
                            [array[i], array[j]] = [array[j], array[i]];
                        }
                    }
                    function makeNumberSequence(size){
                        const numbersSequence = [];
                        for (let i = 1; i <= size; i++) {
                            numbersSequence.push(i);
                        }
                        shuffleArray(numbersSequence);
                        return numbersSequence
                    }

                    const numbersSequence = makeNumberSequence(12)
                    console.log('TEST: numbersSequence: ',numbersSequence)

                    this.ligthIdsSequence = []

                    room.lightGroups.wallScreens.forEach((light, i) => {
                        light.color = [0,0,numbersSequence[i]]
                    })
                    room.lightGroups.wallButtons.forEach((light, i) => {
                        light.color = blueGreen1
                        light.onClick = 'report'
                        this.ligthIdsSequence[numbersSequence[i]] = light.id
                    })
                    this.ligthIdsSequence.splice(0, 1)

                }
                else if(this.level === 3){
                    // TODO: refactor this as it duplicates the code from level 1
                    function getRandomInt(min, max) {
                        return Math.floor(Math.random() * (max - min + 1)) + min;
                    }
                    function shuffleArray(array) {
                        for (let i = array.length - 1; i > 0; i--) {
                            const j = getRandomInt(0, i);
                            [array[i], array[j]] = [array[j], array[i]];
                        }
                    }
                    function makeNumberSequence(size){
                        const numbersSequence = [];
                        for (let i = 1; i <= size; i++) {
                            numbersSequence.push(i);
                        }
                        shuffleArray(numbersSequence);
                        return numbersSequence
                    }

                    const numbersSequence = makeNumberSequence(12)
                    console.log('TEST: numbersSequence: ',numbersSequence)

                    this.ligthIdsSequence = []

                    room.lightGroups.wallScreens.forEach((light, i) => {
                        light.color = [0,0,numbersSequence[i]]
                    })
                    room.lightGroups.wallButtons.forEach((light, i) => {
                        light.color = blueGreen1
                        light.onClick = 'report'
                        this.ligthIdsSequence[numbersSequence[i]] = light.id
                    })
                    this.ligthIdsSequence.splice(0, 1)
                }
            }
        } 
        else if(roomType === 'basketball'){
            if(this.rule === 1){
                if(this.level === 1){
                    const colors = [
                        [255,0,0],    // red
                        [0,255,0],    // green
                        [0,0,255],    // blue
                        [255,255,0],  // yellow
                        [255,0,255]   // purple
                    ];

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
                    
                    // Generate a random color sequence
                    function makeColorSequence(size) {
                        return Array.from({ length: size }, () => Math.floor(Math.random() * colors.length));
                    }
                    
                    // Shuffle an array
                    function shuffleArray(array) {
                        for (let i = array.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [array[i], array[j]] = [array[j], array[i]];
                        }
                        return array;
                    }
                    
                    const colorsSequence = makeColorSequence(3).map(i => colors[i]);

                    console.log('Color sequence:', colorsSequence);

                    // Play sounds according to what is in the sequence
                    
                    this.lightColorSequence = new Array(colorsSequence.length).fill(null);

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
            }
        }

        if (this.animationMetronome) {
            clearInterval(this.animationMetronome);
        }    
        
        if (roomType === 'doubleGrid'){
            console.log('Double Grid')
            this.animationMetronome = setInterval(() =>{
                this.updateCountdown()
                this.updateShapes()
                this.applyShapesOnLights()
                room.sendLightsInstructionsIfIdle()
            } , 1000/25)
        } else if (roomType === 'basketball'){
            console.log('Basketball Hoops')
            this.animationMetronome = setInterval(() =>{
                this.updateShapes()
                this.applyShapesOnLights()
                room.sendLightsInstructionsIfIdle()
            } , 1000/25)
            const receivedMessage = room.socketForRoom.waitForMessage();

            receivedMessage.then((message) => {
                if (message.type === 'colorNamesEnd') {
                    this.animationMetronome = setInterval(() =>{
                        this.updateCountdown()
                    } , 1000/25)
                }
            })
        }

        this.gameStartedAt = Date.now()
        this.status = 'running'
        console.log('GameSession Started.');
    }

    handleLightClickAction(lightId, whileColorWas){
        // We should assume that if the click event was reported, it means that the click was made during a period where that click actually meant something
        // That implies that we should always set the onClick as ignore is all the other cases (mostly black tiles)
        // That being said, we still want to know the whileColorWas because light could go from red (lava) to blue (catchable item) and both mean something, but very different
        let clickedLight = this.GetLightById(lightId)
        console.log('TEST: clickedLight '+lightId+' whileColorWas: '+ whileColorWas)

        if(roomType === 'doubleGrid'){ 
            if(this.rule === 1){
                if(this.level === 1){
                    // Here we expect :
                    // - walking on red => lose a life
                    // - pushing the correct next button => turn it off and play success-sound
                    // - pushing the wrong button => playing fail-sound
                    if(room.lightGroups['mainFloor'].find(obj => obj === clickedLight)){
                        if(whileColorWas === '255,0,0'){
                            this.scoreMultiplier = 1
                            
                            this.removeLife()

                            this.shapes.push(new Shape(clickedLight.posX+clickedLight.width/2, clickedLight.posY+clickedLight.height/2,
                                'rectangle', clickedLight.width/2, clickedLight.height/2, [255,100,0],
                                'ignore', [{ x: 0, y: 0 }], 0, 'mainFloor', 2000 ))

                            let message = {
                                type: 'playerFailed',
                                audio: 'playerFailed',
                                scoreMultiplier: this.scoreMultiplier
                            }
                            room.socketForRoom.broadcastMessage(JSON.stringify(message))
                        }
                    }
                    else if(room.lightGroups['wallButtons'].find(obj => obj === clickedLight)){
                        
                        if(clickedLight.id === this.ligthIdsSequence[0]){
                            clickedLight.color = black
                            clickedLight.onClick = 'ignore'

                            this.correctButton()

                            console.log(dummyPlayers[0].playerName, ' scored!', dummyPlayers[0].score)

                            //TODO : room.playSound('success1')
                            let message = {
                                type: 'playerScored',
                                audio: 'playerScored',
                                scoreMultiplier: this.scoreMultiplier,
                                playerScore: dummyPlayers[0].score
                            }

                            room.socketForRoom.broadcastMessage(JSON.stringify(message))
                            room.socketForMonitor.broadcastMessage(JSON.stringify(message))

                            this.ligthIdsSequence.splice(0, 1)
                            if(this.ligthIdsSequence.length === 0){
                                this.levelCompleted()
                            }
                        } else {
                            this.scoreMultiplier = 1 
                            this.removeLife()   

                            let message = {
                                type: 'playerFailed',
                                audio: 'playerFailed',
                                scoreMultiplier: this.scoreMultiplier
                            }
                            room.socketForRoom.broadcastMessage(JSON.stringify(message))
                        }
                    }
                }
                else if(this.level === 2){
                    if(room.lightGroups['mainFloor'].find(obj => obj === clickedLight)){
                        if(whileColorWas === '255,0,0'){
                            this.scoreMultiplier = 1
                            
                            this.removeLife()

                            this.shapes.push(new Shape(clickedLight.posX+clickedLight.width/2, clickedLight.posY+clickedLight.height/2,
                                'rectangle', clickedLight.width/2, clickedLight.height/2, [255,100,0],
                                'ignore', [{ x: 0, y: 0 }], 0, 'mainFloor', 2000 ))

                            let message = {
                                type: 'playerFailed',
                                audio: 'playerFailed',
                                scoreMultiplier: this.scoreMultiplier
                            }
                            room.socketForRoom.broadcastMessage(JSON.stringify(message))
                        }
                    }
                    else if(room.lightGroups['wallButtons'].find(obj => obj === clickedLight)){
                        if(clickedLight.id === this.ligthIdsSequence[0]){
                            clickedLight.color = black
                            clickedLight.onClick = 'ignore'

                            this.correctButton()

                            //TODO : room.playSound('success1')
                            let message = {
                                type: 'playerScored',
                                audio: 'playerScored',
                                scoreMultiplier: this.scoreMultiplier,
                                playerScore: dummyPlayers[0].score
                            }

                            room.socketForRoom.broadcastMessage(JSON.stringify(message))
                            room.socketForMonitor.broadcastMessage(JSON.stringify(message))

                            this.ligthIdsSequence.splice(0, 1)
                            if(this.ligthIdsSequence.length === 0){
                                this.levelCompleted()
                            }
                        } else {
                            this.scoreMultiplier = 1   
                            this.removeLife()   

                            let message = {
                                type: 'playerFailed',
                                audio: 'playerFailed',
                                scoreMultiplier: this.scoreMultiplier
                            }
                            room.socketForRoom.broadcastMessage(JSON.stringify(message))
                        }
                    }
                }
                else if(this.level === 3) {
                    if(room.lightGroups['mainFloor'].find(obj => obj === clickedLight)){
                        if(whileColorWas === '255,0,0'){
                            this.scoreMultiplier = 1

                            this.removeLife()

                            this.shapes.push(new Shape(clickedLight.posX+clickedLight.width/2, clickedLight.posY+clickedLight.height/2,
                                'rectangle', clickedLight.width/2, clickedLight.height/2, [255,100,0],
                                'ignore', [{ x: 0, y: 0 }], 0, 'mainFloor', 2000 ))

                            let message = {
                                type: 'playerFailed',
                                audio: 'playerFailed',
                                scoreMultiplier: this.scoreMultiplier
                            }
                            room.socketForRoom.broadcastMessage(JSON.stringify(message))
                        }
                    }
                    else if(room.lightGroups['wallButtons'].find(obj => obj === clickedLight)){
                        if(clickedLight.id === this.ligthIdsSequence[0]){
                            clickedLight.color = black
                            clickedLight.onClick = 'ignore'

                            this.correctButton()

                            //TODO : room.playSound('success1')
                            let message = {
                                type: 'playerScored',
                                audio: 'playerScored',
                                scoreMultiplier: this.scoreMultiplier,
                                playerScore: dummyPlayers[0].score
                            }

                            room.socketForRoom.broadcastMessage(JSON.stringify(message))
                            room.socketForMonitor.broadcastMessage(JSON.stringify(message))
                            
                            this.ligthIdsSequence.splice(0, 1)
                            if(this.ligthIdsSequence.length === 0){
                                // this.levelCompleted()
                                let message = {
                                    type: 'levelCompleted',
                                    audio: 'levelCompleted',
                                    message: 'Player Wins'
                                }
    
                                room.socketForRoom.broadcastMessage(JSON.stringify(message))
                                room.socketForMonitor.broadcastMessage(JSON.stringify(message))
                                this.endAndExit()   // End the game if its the last level
                            }
                        } else {
                            this.scoreMultiplier = 1    
                            this.removeLife()   

                            let message = {
                                type: 'playerFailed',
                                audio: 'playerFailed',
                                scoreMultiplier: this.scoreMultiplier
                            }
                            room.socketForRoom.broadcastMessage(JSON.stringify(message))
                        }
                    }
                }
            }
        }
        else if(roomType === 'basketball'){
            if(this.rule === 1) {
                if(this.level === 1) {
                    if(room.lightGroups['wallButtons'].find(obj => obj === clickedLight)){
                        // console.log('CLicked:', this.lightColorSequence[0] === clickedLight.color)
                        if(clickedLight.color === this.lightColorSequence[0]){
                            // clickedLight.color = black
                            // clickedLight.onClick = 'ignore'

                            this.correctButton()

                            //TODO : room.playSound('success1')
                            let message = {
                                type: 'playerScored',
                                audio: 'playerScored',
                                color: clickedLight.color,
                                scoreMultiplier: this.scoreMultiplier,
                                playerScore: dummyPlayers[0].score
                            } 
        
                            room.socketForRoom.broadcastMessage(JSON.stringify(message))
                            room.socketForMonitor.broadcastMessage(JSON.stringify(message))
        
                            this.lightColorSequence.splice(0, 1)
                            if(this.lightColorSequence.length === 0){
                                clearInterval(this.animationMetronome)
                                
                                let message = { 
                                    'type': 'levelCompleted',
                                    'message': 'Player Wins',
                                    'audio': 'levelCompleted',
                                }
                        
                                room.socketForMonitor.broadcastMessage(JSON.stringify(message))
                                room.socketForRoom.broadcastMessage(JSON.stringify(message))

                                this.offerSameLevel() // Loop the game for now  
                            }
                        } else {
                            this.scoreMultiplier = 1    
                            this.removeLife()   

                            let message = {
                                type: 'playerFailed',
                                audio: 'playerFailed',
                                color: clickedLight.color
                            }
                            room.socketForRoom.broadcastMessage(JSON.stringify(message))
                        }
                    }
                }
            }
        }

    }

    levelCompleted(){
        clearInterval(this.animationMetronome)          
        
        let message = { 
            'type': 'levelCompleted',
            'message': 'Player Wins',
            'audio': 'levelCompleted'
        }

        room.socketForMonitor.broadcastMessage(JSON.stringify(message))
        room.socketForRoom.broadcastMessage(JSON.stringify(message))

        if(room.waitingGameSession === undefined){       
            this.offerNextLevel()
        }
        else if(this.levelsStartedWhileSessionIsWaiting < 3){
            this.offerNextLevel()
        }
        else{
            this.endAndExit()
        }
    }

    levelFailed(){
        clearInterval(this.animationMetronome)
        // TODO: room.playSound('level-failed')

        let message = { 
            'type': 'levelFailed',
            'message': 'Player Loose',
            'audio': 'levelFailed'
        }

        room.socketForMonitor.broadcastMessage(JSON.stringify(message))
        room.socketForRoom.broadcastMessage(JSON.stringify(message))
        
        if(room.waitingGameSession === undefined){         
            this.offerSameLevel()
        }
        else{
            this.endAndExit()
        }

    }

    offerSameLevel(){
        // TODO : propose same level with countdown and push a button to accept
        let message = {
            'type': 'offerSameLevel',
            'message': 'Try again? Press the blinking light',
            'countdown': this.prepTime 
        }
        room.socketForRoom.broadcastMessage(JSON.stringify(message))
        
        this.startSameLevel()
    }

    offerNextLevel(){
        // TODO : propose next level with countdown and push a button to accept
        let message = {
            'type': 'offerNextLevel',
            'message': 'Continue? Press the blinking light',
            'countdown': this.prepTime 
        }
        room.socketForRoom.broadcastMessage(JSON.stringify(message))
        
        this.startNextLevel()
    }

    async startSameLevel(){
        const receivedMessage = await room.socketForRoom.waitForMessage();
        console.log('Received:', receivedMessage)
        
        if(room.waitingGameSession !== undefined){
            this.levelsStartedWhileSessionIsWaiting ++
        }
        if(receivedMessage.type === 'continue'){
            this.reset()
            await this.prepare()
            this.start()
        }
        else if(receivedMessage.type === 'exit'){
            if(this.doorTimer){
                clearInterval(this.doorTimer)
                this.doorTimer = undefined
            }
            this.endAndExit()
        }
    }

    async startNextLevel(){
        const receivedMessage = await room.socketForRoom.waitForMessage('');
        console.log('Received:', receivedMessage)

        if(room.waitingGameSession !== undefined){
            this.levelsStartedWhileSessionIsWaiting ++
        }
        if(receivedMessage.type === 'continue'){
            this.level ++
            this.reset()
            await this.prepare()
            this.start()
        }
        else if(receivedMessage.type === 'exit'){
            if(this.doorTimer){
                clearInterval(this.doorTimer)
                this.doorTimer = undefined
            }
            this.endAndExit()
        }
        
    }

    async endAndExit(){
        // TODO : await playing sound to say Byebye
        console.log('Ending game...')
        if (this.scoreTimer) {
            clearInterval(this.scoreTimer);
            this.scoreTimer = undefined;
        }

        let messageForRoom = {
            'type': 'gameEnded',
            'message': 'Please leave the room',
            // 'audio': 'ByeBye'
        }
        let messageForDoor = {
            'type': 'gameEnded',
            'message': 'Please enter the room',
            // 'audio': 'PleaseEnter'
        }
        room.socketForRoom.broadcastMessage(JSON.stringify(messageForRoom))
        room.socketForMonitor.broadcastMessage(JSON.stringify(messageForRoom))
        room.socketForDoor.broadcastMessage(JSON.stringify(messageForDoor))
        this.reset()
        room.isFree = true  // Ensures that the room is available for a new game session
        if(room.waitingGameSession !== undefined){
            //room.currentGameSession = { ...room.waitingGameSession }
            //room.currentGameSession = new GameSession(room.waitingGameSession.rule, room.waitingGameSession.level)
            room.currentGameSession = room.waitingGameSession
            room.waitingGameSession = undefined
            await room.currentGameSession.init()
        }
    }

    GetLightById(lightId){
        let res
        room.lights.some((light) => {
            if(light.id === lightId){
                res = light
                return true
            }
        })
        return res
    }

    updateCountdown(){
        if (this.status === undefined) {
            return;
        }

        let timeLeft = Math.round((this.lastLevelStartedAt + (this.timeForLevel * 1000) - Date.now()) / 1000)

        if( timeLeft !== this.countdown ){
            if(timeLeft >= 0){
                this.countdown = timeLeft
                let message = {
                    'type':'updateCountdown',
                    'countdown':this.countdown
                }
                room.socketForRoom.broadcastMessage(JSON.stringify(message))
                room.socketForMonitor.broadcastMessage(JSON.stringify(message))
            }
            else{
                let message = {'type':'timeIsUp'}
                room.socketForRoom.broadcastMessage(JSON.stringify(message))
                room.socketForMonitor.broadcastMessage(JSON.stringify(message))
                this.levelFailed()
            }
        }
    }    

    updateDoorCountdown(){
        let timeLeft = Math.round((this.doorTimeStartedAt + (this.timeForWaiting * 1000) - Date.now()) / 1000)

        if( timeLeft !== this.doorCountdown ){
            if(timeLeft >= 0){
                this.doorCountdown = timeLeft
                let message = {
                    'type':'updateDoorCountdown',
                    'countdown':this.doorCountdown
                }
                room.socketForDoor.broadcastMessage(JSON.stringify(message))
            }
            else {
                let message = {'type':'timeIsUp'}
                this.endAndExit()
                room.socketForDoor.broadcastMessage(JSON.stringify(message))
            }
        }
    }

    removeLife(){
        if(this.lastLifeLostAt < (Date.now() - 2000)){
            this.lastLifeLostAt = Date.now()

            if(this.lifes > 0) {
                this.lifes--
                this.updateLifes()
            }
        } 
    }

    updateLifes(){
        let message = {
            'type':'updateLifes',
            'lifes':this.lifes,
            'audio': 'playerLoseLife',
        };

        if (this.lifes === 0) {
            let gameOverMessage = {
                'type': 'noMoreLifes',
            }
            room.socketForRoom.broadcastMessage(JSON.stringify(gameOverMessage))
            this.levelFailed()
        }

        room.socketForRoom.broadcastMessage(JSON.stringify(message))
        room.socketForMonitor.broadcastMessage(JSON.stringify(message))
    }

    correctButton(){
        this.score += this.baseScore * this.scoreMultiplier
        this.scoreMultiplier++
        dummyPlayers.forEach((player) => {
            player.score = this.score
        })
    }

    updateShapes(){

        let now = Date.now()

        this.shapes.forEach((shape) => {
            if(shape.active){
                if(shape.activeUntil !== undefined && shape.activeUntil < now){
                    shape.active = false
                }
                else{
                    shape.update()
                }
            }
        })

    }

    // Iterates over all the lights in the room and checks if each light is affected by animation.
    // If it is, it checks if any of the shapes in the array intersects with the light
    // If a shape intersects with the light, it sets the light's color and onClick property to the corresponding values from the shape
    // If no shape intersects with the light, it sets the light's color and onClick property to default values
    applyShapesOnLights(){
        // scanning the shapes array reversly to focus on the last layer
        room.lights.forEach((light) => {
            if(!light.isAffectedByAnimation){return false}
            let lightHasColor = false

            for (let i = this.shapes.length - 1; i >= 0; i--) {
                const shape = this.shapes[i];
                if(!shape.active){continue}
                if(!(room.lightGroups[shape.affectsLightGroup].includes(light))){continue}
                // does that shape cross into that light ?
                let areIntersecting = false
                if(shape.shape === 'rectangle' && light.shape === 'rectangle'){
                    areIntersecting = areRectanglesIntersecting(shape, light)
                }else{
                    throw new Error('intersection not computable for these shapes (TODO).')
                }
                if(areIntersecting){
                    light.color = shape.color
                    light.onClick = shape.onClick
                    lightHasColor = true
                    break; 
                }
            }

            if(lightHasColor === false && light.isAffectedByAnimation === true){
                light.color = [0,0,0]
                light.onClick = 'ignore'
            }
        })
    }

}

let room = new Room(roomType)