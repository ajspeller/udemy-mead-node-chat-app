require('dotenv').config();

const http = require('http');
const express = require('express');
const morgan = require('morgan');
const debug = require('debug')('app:index');
const chalk = require('chalk');
const path = require('path');
const socketio = require('socket.io');
const Filter = require('bad-words');

const {
  generateMessage,
  generateLocationMessage
} = require('./utils/messages');

const {
  getUser,
  getUsersInRoom,
  addUser,
  removeUser
} = require('./utils/users');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const filter = new Filter();

app.use(express.static(path.join(__dirname, '../public')));
app.use(morgan('dev'));

io.on('connection', (socket) => {
  debug('New websocket connection');

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        'message',
        generateMessage('Admin', `${user.username} has left!`)
      );
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room)
      });
    }
  });

  socket.on('join', ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room });
    if (error) {
      return callback(error);
    }
    socket.join(user.room);
    socket.emit('message', generateMessage('Admin', 'Welcome'));
    socket.broadcast
      .to(user.room)
      .emit('message', generateMessage(`${user.username} has joined!`));
    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room)
    });
    callback();
  });

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);

    if (filter.isProfane(message)) {
      return callback('Profanity is not allowed');
    }
    io.to(user.room).emit('message', generateMessage(user.username, message));
    callback();
  });

  socket.on('sendLocation', ({ latitude, longitude }, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      'locationMessage',
      generateLocationMessage(
        user.username,
        `https://maps.google.com/?q=${latitude},${longitude}`
      )
    );
    callback(`Location Shared!`);
  });
});

server.listen(PORT, () => {
  debug(`Webserver started on ${chalk.bold.inverse.green(PORT)}`);
});
