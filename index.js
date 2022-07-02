const express = require('express');
const app = express();
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
app.use(cors());

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

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('create-room', () => {
    const roomId = room();
    socket.join(roomId)
    io.emit('joining-room', { userId: 0, roomId });
  });

  socket.on('join-room', (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room) {
      socket.emit('no-room-found');
    } else {
      const numClients = room.size;
      if (numClients < 3) {
        socket.join(roomId);
        socket.emit('joining-room', { userId: numClients, roomId });
        if (numClients === 2) {
          io.to(roomId).emit('start-game', startGame());
          io.to(roomId).emit('turn', {
            player: 0,
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
    if (player === lastPlayedBy) {
      turn.lastPlayed = null;
    }
    io.to(roomId).emit('turn', turn);
  });

  socket.on('win', ({ roomId, userId }) => {
    io.to(roomId).emit('win', userId);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  })
});

server.listen(4000, () => {
  console.log('listening on *:4000');
});