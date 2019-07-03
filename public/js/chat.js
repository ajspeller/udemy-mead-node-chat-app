const socket = io();

const $form = document.querySelector('form');
const $input = $form.querySelector('#message');
const $button = $form.querySelector('button');
const $getLocButton = document.querySelector('#send-location');

const $messages = document.querySelector('#messages');

// templates
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationMessageTemplade = document.querySelector(
  '#location-message-template'
).innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// options
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true
});

const autoscroll = () => {
  // new message element
  const $newMessage = $messages.lastElementChild;

  // height of the new message
  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  // visible height
  const visibleHeight = $messages.offsetHeight;

  // height of message container
  const containerHeight = $messages.scrollHeight;

  // how far have i scrolled
  const scrollOffset = $messages.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

socket.on('roomData', ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room,
    users
  });
  document.querySelector('#sidebar').innerHTML = html;
});

socket.on('locationMessage', (message) => {
  console.log(message);
  if (message === '') return;
  const { url: location, createdAt } = message;
  const html = Mustache.render(locationMessageTemplade, {
    username: message.username,
    location,
    createdAt: moment(createdAt).format('hh:mm:ss A')
  });
  $messages.insertAdjacentHTML('beforeend', html);
  autoscroll();
});

socket.on('message', (message) => {
  console.log(message);
  if (message === '') return;
  const html = Mustache.render(messageTemplate, {
    username: message.username,
    message: message.text,
    createdAt: moment(message.createdAt).format('hh:mm:ss A')
  });
  $messages.insertAdjacentHTML('beforeend', html);
  autoscroll();
});

$form.addEventListener('submit', (e) => {
  e.preventDefault();
  const msgToSend = $input.value;
  $button.setAttribute('disabled', 'disabled');

  socket.emit('sendMessage', msgToSend, (error) => {
    $button.removeAttribute('disabled');
    $input.value = '';
    $input.focus();

    if (error) {
      return console.log(error);
    }
    console.log('Message Delivered');
  });
});

socket.on('gotit', (data) => {
  console.log(data);
});

$getLocButton.addEventListener('click', (e) => {
  $getLocButton.setAttribute('disabled', 'disabled');
  if (!navigator.geolocation) {
    return alert('Geolocation is not supported by this browser');
  }
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    socket.emit(
      'sendLocation',
      {
        latitude: coords.latitude,
        longitude: coords.longitude
      },
      (status) => {
        $getLocButton.removeAttribute('disabled');
        if (status) {
          return console.log(status);
        }
        console.log(`Message Delivered`);
      }
    );
  });
});

socket.emit('join', { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = '/';
  }
});
