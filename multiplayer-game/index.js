export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.players = new Map();
    this.ball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
    this.team1Score = 0;
    this.team2Score = 0;
  }

  async handleSession(webSocket, playerId) {
    this.players.set(playerId, webSocket);
    webSocket.accept();
    webSocket.send(JSON.stringify({ type: "playerId", id: playerId }));
    webSocket.send(JSON.stringify({
      type: "ballPosition",
      playerId,
      x: this.ball.x,
      y: this.ball.y,
      z: this.ball.z,
      vx: this.ball.vx,
      vy: this.ball.vy,
      vz: this.ball.vz
    }));
    webSocket.send(JSON.stringify({
      type: "score",
      team1Score: this.team1Score,
      team2Score: this.team2Score
    }));

    webSocket.addEventListener("message", async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`Mensaje recibido de ${playerId}:`, data); // Log para depurar
        this.handleMessage(playerId, data);
      } catch (error) {
        console.error(`Error al parsear mensaje de ${playerId}:`, error.message);
      }
    });

    webSocket.addEventListener("close", () => {
      this.players.delete(playerId);
      console.log(`Jugador ${playerId} desconectado`);
    });
  }

  handleMessage(playerId, data) {
    if (data.type === "ballPosition") {
      this.ball = { x: data.x, y: data.y, z: data.z, vx: data.vx, vy: data.vy, vz: data.vz };
      this.broadcast({ ...data, playerId });
    } else if (data.type === "score") {
      this.team1Score = data.team1Score;
      this.team2Score = data.team2Score;
      this.broadcast(data);
    } else if (data.type === "resetBall") {
      this.ball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
      this.broadcast(data);
    } else if (data.type === "resetGame") {
      this.ball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
      this.team1Score = 0;
      this.team2Score = 0;
      this.broadcast(data);
    }
  }

  broadcast(message) {
    for (const [id, ws] of this.players) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/websocket") {
      const [_, roomId, playerId] = request.headers.get("Upgrade") === "websocket" ? url.searchParams.get("id").split(":") : ["default", Date.now().toString()];
      const id = env.GAME_ROOM.idFromName(roomId || "default");
      const room = env.GAME_ROOM.get(id);
      const pair = new WebSocketPair();
      await room.handleSession(pair[1], playerId || Date.now().toString());
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    return new Response("Not Found", { status: 404 });
  }
};
