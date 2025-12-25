const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// attach socket.io
const io = new Server(server, {
  cors: { origin: '*' }
});

// serve static files (chat.html, index.html) from this folder
app.use(express.static(__dirname));

// store one waiting user
let waitingUser = null;

io.on('connection', (socket) => {
  console.log('user connected', socket.id);

  socket.on('findStranger', () => {
    if (waitingUser) {
      const room = `room_${Date.now()}`;
      socket.join(room);
      waitingUser.join(room);

      io.to(socket.id).emit('matched', room, 'stranger');
      io.to(waitingUser.id).emit('matched', room, 'stranger');

      // remember room on socket
      socket.data.room = room;
      waitingUser.data.room = room;

      waitingUser = null;
    } else {
      waitingUser = socket;
      socket.emit('waiting');
    }
  });

  socket.on('message', (data) => {
    socket.to(data.room).emit('message', data);
  });

  // user clicked "Disconnect"
  socket.on('leaveChat', () => {
    const room = socket.data.room;
    if (room) {
      socket.to(room).emit('partnerLeft');
      socket.leave(room);
      socket.data.room = null;
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected', socket.id);
    if (waitingUser === socket) waitingUser = null;

    const room = socket.data.room;
    if (room) {
      socket.to(room).emit('partnerLeft');
    }
  });
});


// start server
server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
