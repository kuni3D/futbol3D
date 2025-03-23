const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let players = [];

wss.on('connection', (ws) => {
    console.log('Nuevo jugador conectado');
    players.push(ws);

    // Enviar a cada jugador su ID (0 o 1)
    ws.send(JSON.stringify({ type: 'playerId', id: players.length - 1 }));

    // Cuando un jugador envía un mensaje
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        // Reenviar el mensaje a todos los jugadores conectados
        players.forEach((player) => {
            if (player.readyState === WebSocket.OPEN) {
                player.send(JSON.stringify(data));
            }
        });
    });

    // Cuando un jugador se desconecta
    ws.on('close', () => {
        console.log('Jugador desconectado');
        players = players.filter((player) => player !== ws);
    });
});

console.log('Servidor WebSocket corriendo en ws://localhost:8080');
