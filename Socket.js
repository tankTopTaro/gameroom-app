class Socket{
    constructor(page, port) {
        this.page = page
        this.port = port
        this.socket
        this.clients
        this.init()
    }

    // Creates the WebSocket server
    init(){
        this.socket = new WebSocket.Server({ port: this.port, host: '0.0.0.0' });
        this.clients = new Set()

        this.socket.on('connection', (client, request) => {
            this.clients.add(client);
            client.clientIp = request.connection.remoteAddress;
            client.userAgent = request.headers['user-agent'];
            console.log('New client connected on the webSocket for '+this.page+'. clientIp: '+client.clientIp+' browser: '+client.userAgent);
            this.broadcastMessage('A new client has connected on the webSocket for '+this.page+' (), total clients: ' + this.clients.size)

            // Remove the client from the set when they close the connection
            client.on('close', () => {
                console.log('Client disconnected');
                this.clients.delete(client);
                this.broadcastMessage('A client has disconnected from the webSocket for '+this.page+', total clients: ' + this.clients.size)
            });

            // Handle incoming messages from the client
            client.on('message', message => {
                console.log('Socket for '+this.page+' received message from client:', message);
            });
        });

        console.log('WebSocket for '+this.page+' is running on port '+this.port);
    }

    // Sends the given message to all connected clients
    broadcastMessage(message){
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    receiveMessage() {
        return new Promise((resolve, reject) => {
            this.clients.forEach(client => {
                client.on('message', raw => {
                    try {
                        const message = JSON.parse(raw);
                        resolve(message);
                    } catch (error) {
                        console.error('Error parsing message:', error);
                        reject(error);
                    }
                })
            })
        })
    }
}

module.exports = Socket