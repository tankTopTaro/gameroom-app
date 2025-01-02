// sudo raspi-config > interface > UART > NO , YES
// sudo nano /boot/cmdline.txt > ?
// sudo nano /boot/config.txt > add lines > enable_uart=1 + dtoverlay=disable-bt
// sudo systemctl disable hciuart
// sudo reboot
// ls /dev/tty* > find tty's to use
// sudo chmod 666 /dev/ttyUSB0 (only needed for USB)
// sudo usermod -a -G dialout devv
// sudo reboot

import { SerialPort } from 'serialport';
import {ReadlineParser} from "@serialport/parser-readline";


let messages = ''

const port_sender = new SerialPort({path: '/dev/ttyACM0',baudRate: 115200} );
port_sender.on('error', function(err) {
    console.log('Error: ', err.message);
})

const port_receiver = new SerialPort({path: '/dev/ttyUSB0',baudRate: 115200} );
port_receiver.on('data', function(data) {
    messages += data.toString()
    // console.log('Data received: ', data.toString());
    if(data.toString().includes('eof')){
        console.log('we got eof !')
    }
});

function crc16(buffer) {
    let crc = 0xFFFF;
    for (let byte of buffer) {
        crc ^= byte << 8;
        for (let bit = 0; bit < 8; bit++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
            crc &= 0xFFFF;
        }
    }
    return crc;
}

function createDataPacket(address, control, numberOfDevices, payload) {
    if (address > 0x3FF || control > 0x3F) {
        throw new Error('Address or control field out of range');
    }

    const controlAddress = ((address & 0x3FF) << 6) | (control & 0x3F);

    // Determine payload size dynamically if needed
    const payloadSize = payload.length;

    // Adjust buffer size: SOF(2) + Control+Address(2) + NumberOfDevices(1) + Payload(variable) + CRC16(2) + EOF(1)
    const packet = Buffer.alloc(8 + payloadSize); // Adjusted for dynamic payload size

    packet.writeUInt16BE(0xABCD, 0); // SOF
    packet.writeUInt16BE(controlAddress, 2); // Control+Address
    packet.writeUInt8(numberOfDevices, 4); // Number of Devices
    payload.copy(packet, 5); // Payload

    // Calculate CRC16 for the content before the CRC field (excluding EOF)
    const crc = crc16(packet.slice(0, 5 + payloadSize));
    packet.writeUInt16BE(crc, 5 + payloadSize); // CRC16

    packet.writeUInt8(0x0D, 7 + payloadSize); // EOF explicitly set as the last byte

    return packet;
}

// Example usage
const address = 0x1F; // Example 10-bit address
const control = 0x3A; // Example 6-bit control
const numberOfDevices = 5; // Example Number of Devices
const payload = Buffer.from([0x01, 0x02, 0x03]); // Example Payload

const packet = createDataPacket(address, control, numberOfDevices, payload);
console.log(packet.toString('hex'));



function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function test1(){
    let i = 0
    while(i < 30){
        //let message = i+' '
        let message = 's'
        message = message.repeat(90*11) // for 1 tile alone , 2sof+2addr+1nbrDev+3color+2crc+1eof      = 11 byte = max 90 tiles /s @ 115kbps
        // for series of tiles (diff colors) : 2sof+2addr+1nbrDev+3color*N+2crc+1eof  = 8 + (3*N) = between 3 and 11 byte / tile = max 315 tiles /s @ 115kbps
        // for series of tiles (same color) : 2sof+2addr+1nbrDev+3color+2crc+1eof  = 11 = 0.22 byte / tile = max 4500 tiles /s @ 115kbps
        port_sender.write(message+'\n')
        await sleep(1)
        i++
    }
    port_sender.write('end at receiver eof'+'\n')
    console.log('end at sender')
}

