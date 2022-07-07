const express = require('express');
const app = express();
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
app.use(cors());

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: 'http://localhost:3000'
});

app.get('/', (req, res) => {
  res.send('<h1>Hello world</h1>');
});

const room = () => {
  let id = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < 5; i++)
    id += possible.charAt(Math.floor(Math.random() * possible.length));

  return id;
}

const startGame = () => {
  const deck = Array.from(Array(54).keys()).map(i => i + 1).sort(() => 0.5 - Math.random());
  return {
    0: deck.slice(0, 17),
    1: deck.slice(17, 34),
    2: deck.slice(34),
  };
}

const rooms = {};

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('create-room', (name) => {
    const roomId = room();
    rooms[roomId] = {};
    rooms[roomId].players = [name];
    socket.join(roomId)
    io.emit('joining-room', { userId: 0, name, roomId });
  });

  socket.on('join-room', ({ name, roomId }) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room) {
      socket.emit('no-room-found');
    } else {
      const numClients = room.size;
      if (numClients < 3) {
        socket.join(roomId);
        rooms[roomId].players.push(name);
        socket.emit('joining-room', { userId: numClients, name, roomId });
        io.to(roomId).emit('players', rooms[roomId].players);
        if (numClients === 2) {
          let hands = startGame();
          io.to(roomId).emit('turn', {
            player: 0,
            playerName: rooms[roomId].players[0],
            hands,
            lastPlayedBy: 2,
            lastPlayed: null
          });
        }
      } else {
        console.log('full room');
        socket.emit('full-room')
      }
    }
  });

  socket.on('play', ({ roomId, turn }) => {
    let { player, lastPlayedBy } = turn;
    turn.playerName = rooms[roomId].players[player];
    if (player === lastPlayedBy) {
      turn.lastPlayed = null;
    }
    io.to(roomId).emit('turn', turn);
  });

  socket.on('win', ({ roomId, userId }) => {
    io.to(roomId).emit('win', rooms[roomId].players[userId]);
    delete rooms[roomId];
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  })
});

server.listen(PORT, () => {
  console.log('listening on *:4000');
});