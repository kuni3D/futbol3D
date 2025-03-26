let players = [];

export default {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);

            // Manejar WebSocket
            if (url.pathname === '/websocket') {
                const id = url.searchParams.get('id');
                if (!id) return new Response('ID no proporcionado', { status: 400 });

                const [roomId, playerId] = id.split(':');
                if (!roomId || !playerId) return new Response('Formato de ID inválido', { status: 400 });

                if (request.headers.get('Upgrade') !== 'websocket') {
                    return new Response('Se esperaba WebSocket', { status: 400 });
                }

                const wsPair = new WebSocketPair();
                const [client, server] = Object.values(wsPair);

                server.accept();
                const playerNumber = players.length + 1;
                players.push({ id: playerId, ws: server, number: playerNumber });

                server.send(JSON.stringify({ type: 'playerId', id: playerId, playerNumber }));
                console.log(`Jugador ${playerId} conectado como jugador ${playerNumber}`);

                server.addEventListener('message', (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log(`Mensaje recibido de ${playerId}:`, data);
                        players.forEach(p => {
                            if (p.id !== playerId && p.ws.readyState === WebSocket.OPEN) {
                                p.ws.send(JSON.stringify(data));
                            }
                        });
                    } catch (error) {
                        console.error('Error al parsear mensaje:', error);
                    }
                });

                server.addEventListener('close', () => {
                    players = players.filter(p => p.id !== playerId);
                    console.log(`Jugador ${playerId} desconectado`);
                });

                server.addEventListener('error', (error) => {
                    console.error('Error en WebSocket:', error);
                    players = players.filter(p => p.id !== playerId);
                });

                return new Response(null, { status: 101, webSocket: client });
            }

            // Servir archivos estáticos desde ASSETS
            if (url.pathname === '/' || url.pathname === '/multiplayer.html') {
                return await env.ASSETS.fetch(new Request(new URL('/multiplayer.html', url)));
            } else if (url.pathname === '/pelotita2.glb') {
                return await env.ASSETS.fetch(new Request(new URL('/pelotita2.glb', url)));
            }

            return new Response('Not found', { status: 404 });
        } catch (error) {
            console.error('Error global en el Worker:', error);
            return new Response('Error interno del servidor', { status: 500 });
        }
    }
};
