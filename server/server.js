const WebSocket = require('ws');

const port = process.env.PORT || 8080; // Usar el puerto asignado por Render o 8080 por defecto
const wss = new WebSocket.Server({ port: port });
const rooms = new Map();

wss.on('connection', (ws, req) => {
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const id = urlParams.get('id');
    const [roomId, playerId] = id.split(':');

    console.log(`Nuevo jugador conectado: ${playerId} en la sala ${roomId}`);

    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }
    const room = rooms.get(roomId);
    room.add(ws);

    const playerNumber = room.size === 1 ? 1 : 2;
    ws.send(JSON.stringify({ type: 'playerId', id: playerId, playerNumber: playerNumber }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        console.log(`Mensaje recibido en la sala ${roomId}:`, data);

        room.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    });

    ws.on('close', () => {
        console.log(`Jugador ${playerId} desconectado de la sala ${roomId}`);
        room.delete(ws);
        if (room.size === 0) {
            rooms.delete(roomId);
        }
    });
});

console.log(`Servidor WebSocket corriendo en el puerto ${port}`);
