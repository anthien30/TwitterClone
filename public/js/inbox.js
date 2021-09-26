$(document).ready(() => {
  $.get('/api/chats', (data, status, xhr) => {
    if (xhr.status == 400) {
      alert('Could not get that list');
    } else {
      outputChatList(data, $('.resultsContainer'));
    }
  });
});

const outputChatList = (chatList, container) => {
  chatList.forEach((chat) => {
    const html = createChatHtml(chat);
    container.append(html);
  });

  if (chatList.length === 0) {
    container.append('<span class="noResults">No chat to show.</span>');
  }
};
