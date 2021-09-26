let typing = false;
let lastTypingTime;

$(document).ready(() => {
  socket.emit('join room', chatId);
  socket.on('typing', () => {
    $('.typingDots').show();
  });
  socket.on('stop typing', () => {
    $('.typingDots').hide();
  });

  $.get(`/api/chats/${chatId}/messages`, (data) => {
    const messages = [];
    let lastSenderId = '';

    data.forEach((message, index) => {
      const html = createMessageHtml(message, data[index + 1], lastSenderId);
      messages.push(html);

      lastSenderId = message.sender._id;
    });

    const messagesHtml = messages.join('');
    addMessagesHtmlToPage(messagesHtml);
    scrollToBottom(false);

    readAllMessages();

    $('.loadingSpinnerContainer').remove();
    $('.chatContainer').css('visibility', 'visible');
  });
});

const addMessagesHtmlToPage = (Html) => {
  $('.chatMessages').append(Html);
};

$('#chatNameButton').click(() => {
  const name = $('#chatNameTextbox').val().trim();
  $.ajax({
    url: '/api/chats/' + chatId,
    type: 'PUT',
    data: {
      chatName: name,
    },
    success: (data, status, xhr) => {
      if (xhr.status != 204) return alert('Could not update');
      location.reload();
    },
  });
});

$('.sendMessageButton').click(() => {
  messageSubmitted();
});

$('.inputTextbox').keydown((event) => {
  updateTyping();

  if (event.which === 13 && !event.shiftKey) {
    messageSubmitted();
    return false;
  }
});

const updateTyping = () => {
  if (!connected) return;

  if (!typing) {
    typing = true;
    socket.emit('typing', chatId);
  }

  lastTypingTime = new Date().getTime();
  let timerLength = 3000;
  setTimeout(() => {
    let timeNow = new Date().getTime();
    let timeDiff = timeNow - lastTypingTime;
    if (timeDiff >= timerLength && typing) {
      socket.emit('stop typing', chatId);
      typing = false;
    }
  }, timerLength);
};

const messageSubmitted = () => {
  const content = $('.inputTextbox').val().trim();

  if (content !== '') {
    sendMessage(content);
    $('.inputTextbox').val('');
    socket.emit('stop typing', chatId);
    typing = false;
  }
};

const sendMessage = (content) => {
  $.post('/api/messages', { content, chatId }, (data, status, xhr) => {
    if (xhr.status != 201) {
      alert('Could not send message');
      $('.inputTextbox').val(content);
    }

    addChatMessageHtml(data);

    if (connected) {
      socket.emit('new message', data);
    }
  });
};

const addChatMessageHtml = (message) => {
  if (!message || !message._id) {
    alert('Message not valid');
    return;
  }

  const messageDiv = createMessageHtml(message, null, '');

  addMessagesHtmlToPage(messageDiv);
  scrollToBottom(true);
};

const createMessageHtml = (message, nextMessage, lastSenderId) => {
  const sender = message.sender;
  const senderName = sender.firstName + ' ' + sender.lastName;

  const currentSenderId = sender._id;
  const nextSenderId = nextMessage != null ? nextMessage.sender._id : '';

  const isFirst = lastSenderId != currentSenderId;
  const isLast = nextSenderId != currentSenderId;

  const isMine = message.sender._id == userLoggedIn._id;
  let liClassName = isMine ? 'mine' : 'theirs';

  let nameElement = '';
  if (isFirst) {
    liClassName += ' first';

    if (!isMine) {
      nameElement = `<span class='senderName'>${senderName}</span>`;
    }
  }

  let profileImage = '';
  if (isLast) {
    liClassName += ' last';
    profileImage = `<img src='${sender.profilePic}'>`;
  }

  let imageContainer = '';
  if (!isMine) {
    imageContainer = `<div class='imageContainer'>
                        ${profileImage}
                      </div>`;
  }

  return `<div class='message ${liClassName}'>
            ${imageContainer}
            <div class='messageContainer'>
            ${nameElement}
              <span class='messageBody'>
                ${message.content}
              </span>
            </div>
          </div>`;
};

const scrollToBottom = (animated) => {
  const container = $('.chatMessages');
  const scrollHeight = container[0].scrollHeight;

  if (animated) {
    container.animate({ scrollTop: scrollHeight }, 'slow');
  } else {
    container.scrollTop(scrollHeight);
  }
};

const readAllMessages = () => {
  $.ajax({
    url: `/api/chats/${chatId}/messages/readall`,
    type: 'PUT',
    success: () => refreshMessagesBadge(),
  });
};
