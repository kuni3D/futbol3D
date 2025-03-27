let players = [];

export default {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);

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
                server.addEventListener('message', (event) => {
                    try {
                        const data = JSON.parse(event.data);
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
                });

                return new Response(null, { status: 101, webSocket: client });
            }

            if (url.pathname === '/' || url.pathname === '/multiplayer.html') {
                const githubUrl = 'https://raw.githubusercontent.com/kuni3D/futbol3D/main/multiplayer-game/multiplayer.html';
                const response = await fetch(githubUrl);
                if (!response.ok) return new Response('HTML no encontrado en GitHub', { status: 404 });
                return new Response(response.body, { headers: { 'Content-Type': 'text/html' } });
            } else if (url.pathname === '/pelotita2.glb') {
                const githubUrl = 'https://raw.githubusercontent.com/kuni3D/futbol3D/main/multiplayer-game/pelotita2.glb';
                const response = await fetch(githubUrl);
                if (!response.ok) return new Response('GLB no encontrado en GitHub', { status: 404 });
                return new Response(response.body, { headers: { 'Content-Type': 'application/octet-stream' } });
            }

            return new Response('Not found', { status: 404 });
        } catch (error) {
            console.error('Error en el Worker:', error);
            return new Response('Error interno del servidor', { status: 500 });
        }
    }
};
