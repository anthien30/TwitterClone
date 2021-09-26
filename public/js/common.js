let cropper;
let timer;
let selectedUsers = [];

$(document).ready(() => {
  refreshMessagesBadge();
  refreshNotificationsBadge();
});

// enable/disable post submit button on each key type
$('#postTextarea, #replyTextarea').keyup((event) => {
  const textBox = $(event.target);
  const value = textBox.val().trim();

  const isModal = textBox.parents('.modal').length === 1;

  const submitBtn = isModal ? $('#submitReplyButton') : $('#submitPostButton');

  if (submitBtn.length === 0) return alert('no submit button found');

  if (value == '') {
    submitBtn.prop('disabled', true);
    return;
  }

  submitBtn.prop('disabled', false);
});

// handles new post/reply submission
$('#submitPostButton, #submitReplyButton').click(() => {
  const button = $(event.target);

  const isModal = button.parents('.modal').length === 1;

  const textBox = isModal ? $('#replyTextarea') : $('#postTextarea');

  const data = {
    content: textBox.val(),
  };

  if (isModal) {
    const postId = button.data().id;
    if (postId === null) return alert('button id is null');
    data.replyTo = postId;
  }

  $.post('/api/posts', data, (postData) => {
    if (postData.replyTo) {
      emitNotification(postData.replyTo.postedBy);
      location.reload();
    } else {
      const html = createPostHtml(postData);
      $('.noResults').remove();
      $('.postsContainer').prepend(html);
      textBox.val('');
      button.prop('disabled', true);
    }
  });
});

// helper function to create post on submission
const createPostHtml = (postData, largeFont = false) => {
  if (!postData) {
    return alert('post object is null');
  }

  const isRetweet = postData.retweetData !== undefined;
  const retweetedBy = isRetweet ? postData.postedBy.username : null;
  postData = isRetweet ? postData.retweetData : postData;

  const user = postData.postedBy;
  if (user._id === undefined) {
    return console.log('User object not populated');
  }

  const displayName = user.firstName + ' ' + user.lastName;
  const timestamp = timeDifference(new Date(), new Date(postData.createdAt));
  const likeButtonActiveClass = postData.likes.includes(userLoggedIn._id)
    ? 'active'
    : '';
  const retweetButtonActiveClass = postData.retweetUsers.includes(
    userLoggedIn._id
  )
    ? 'active'
    : '';
  const largeFontClass = largeFont ? 'largeFont' : '';

  let retweetText = '';
  if (isRetweet) {
    retweetText = `
      <span>
        <i class='fas fa-retweet'></i>
        Retweeted by <a href='/profile/${retweetedBy}'>@${retweetedBy}</a>
      </span>
    `;
  }

  let replyFlag = '';
  if (postData.replyTo && postData.replyTo._id) {
    if (!postData.replyTo._id) return alert('Reply to is not populated');
    else if (!postData.replyTo.postedBy)
      return alert('postedBy of Reply to is not populated');

    const replyToUsername = postData.replyTo.postedBy.username;
    replyFlag = `<div class='replyFlag'>
      Replying to <a href='/profile/${replyToUsername}'>@${replyToUsername}</a>
    </div>`;
  }

  let buttons = '';
  let pinnedPostText = '';
  if (postData.postedBy._id === userLoggedIn._id) {
    let pinnedClass = '';
    let dataTarget = '#confirmPinModal';
    if (postData.pinned === true) {
      dataTarget = '#unpinModal';
      pinnedClass = 'active';
      pinnedPostText =
        "<i class='fas fa-thumbtack'></i> <span>Pinned post</span>";
    }

    buttons = `<button class='pinButton ${pinnedClass}' data-id='${postData._id}' data-toggle='modal' data-target='${dataTarget}'>
      <i class='fas fa-thumbtack'></i>
    </button>
    <button data-id='${postData._id}' data-toggle='modal' data-target='#deletePostModal'>
      <i class='fas fa-times'></i>
    </button>
    `;
  }

  return `
    <div class='post ${largeFontClass}' data-id='${postData._id}'>
      <div class='postActionContainer'>
        ${retweetText}
      </div>
      <div class='mainContentContainer'>
        <div class='userImageContainer'>
          <img src=${user.profilePic} />
        </div>
        <div class='postContentContainer'>
          <div class='pinnedPostText'>${pinnedPostText}</div>
          <div class='header'>
            <a href='/profile/${
              user.username
            }' class='displayName'>${displayName}</a>
            <span class='username'>@${user.username}</span>
            <span class='date'>${timestamp}</span>
            ${buttons}
          </div>
          ${replyFlag}
          <div class='postBody'>
            <span>${postData.content}</span>
          </div>
          <div class='postFooter'>
            <div class='postButtonContainer'>
              <button data-toggle='modal' data-target='#replyModal'>
                <i class='far fa-comment'></i>
              </button>
            </div>
            <div class='postButtonContainer green'>
              <button class='retweetButton ${retweetButtonActiveClass}'>
                <i class='fas fa-retweet'></i>
                <span>${postData.retweetUsers.length || ''}</span>
              </button>
            </div>
            <div class='postButtonContainer red'>
              <button class='likeButton ${likeButtonActiveClass}'>
                <i class='far fa-heart'></i>
                <span>${postData.likes.length || ''}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

// helper function to determine how long ago a post was posted
function timeDifference(current, previous) {
  var msPerMinute = 60 * 1000;
  var msPerHour = msPerMinute * 60;
  var msPerDay = msPerHour * 24;
  var msPerMonth = msPerDay * 30;
  var msPerYear = msPerDay * 365;

  var elapsed = current - previous;

  if (elapsed < msPerMinute) {
    if (elapsed / 1000 < 30) return 'Just now';
    return Math.round(elapsed / 1000) + ' seconds ago';
  } else if (elapsed < msPerHour) {
    return Math.round(elapsed / msPerMinute) + ' minutes ago';
  } else if (elapsed < msPerDay) {
    return Math.round(elapsed / msPerHour) + ' hours ago';
  } else if (elapsed < msPerMonth) {
    return Math.round(elapsed / msPerDay) + ' days ago';
  } else if (elapsed < msPerYear) {
    return Math.round(elapsed / msPerMonth) + ' months ago';
  } else {
    return Math.round(elapsed / msPerYear) + ' years ago';
  }
}

// enables img cropping on profile upload
$('#filePhoto').change((event) => {
  const input = $(event.target)[0];

  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      $('#imagePreview').attr('src', e.target.result);

      const image = document.getElementById('imagePreview');
      image.src = e.target.result;

      if (cropper !== undefined) cropper.destroy();

      cropper = new Cropper(image, {
        aspectRatio: 1 / 1,
        background: false,
      });
    };
    reader.readAsDataURL(input.files[0]);
  }
});

// enables img cropping on cover upload
$('#coverPhoto').change((event) => {
  const input = $(event.target)[0];

  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      $('#coverPreview').attr('src', e.target.result);

      const cover = document.getElementById('coverPreview');
      cover.src = e.target.result;

      if (cropper !== undefined) cropper.destroy();

      cropper = new Cropper(cover, {
        aspectRatio: 16 / 9,
        background: false,
      });
    };
    reader.readAsDataURL(input.files[0]);
  }
});

// handles profile image upload
$('#imageUploadButton').click(() => {
  const canvas = cropper.getCroppedCanvas();
  if (canvas == null) {
    alert('Could not upload image. Make sure it is an image file.');
    return;
  }

  canvas.toBlob((blob) => {
    const formData = new FormData();
    formData.append('croppedImage', blob);

    $.ajax({
      url: '/api/users/profilePicture',
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: () => {
        location.reload();
      },
    });
  });
});

// handles cover image upload
$('#coverUploadButton').click(() => {
  const canvas = cropper.getCroppedCanvas();
  if (canvas == null) {
    alert('Could not upload image. Make sure it is an image file.');
    return;
  }

  canvas.toBlob((blob) => {
    const formData = new FormData();
    formData.append('croppedImage', blob);

    $.ajax({
      url: '/api/users/coverPhoto',
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: () => {
        location.reload();
      },
    });
  });
});

// handles searching searchbox for users
$('#userSearchTextbox').keydown((event) => {
  clearTimeout(timer);

  const textbox = $(event.target);
  let value = textbox.val();

  if (value === '' && (event.which == 8 || event.keyCode == 8)) {
    selectedUsers.pop();
    updateSelectedUsersHtml();
    $('.resultsContainer').html('');

    if (selectedUsers.length === 0) {
      $('#createChatButton').prop('disabled', true);
    }

    return;
  }

  timer = setTimeout(() => {
    value = textbox.val().trim();
    if (value === '') {
      $('.resultsContainer').html('');
    } else {
      searchUsers(value);
    }
  }, 1000);
});

// handles creating chat on button click
$('#createChatButton').click(() => {
  const data = JSON.stringify(selectedUsers);
  $.post('/api/chats', { users: data }, (chat) => {
    if (!chat || !chat._id) return alert('Invalid response from server');
    window.location.href = `/messages/${chat._id}`;
  });
});

// handles clicking like on a post
$(document).on('click', '.likeButton', (event) => {
  const button = $(event.target);

  const postId = getPostIdFromElement(button);

  if (!postId) return;

  $.ajax({
    url: `/api/posts/${postId}/like`,
    type: 'PUT',
    success: (postData) => {
      button.find('span').text(postData.likes.length || '');

      if (postData.likes.includes(userLoggedIn._id)) {
        button.addClass('active');
        emitNotification(postData.postedBy);
      } else {
        button.removeClass('active');
      }
    },
  });
});

// handles clicking retweet on a post
$(document).on('click', '.retweetButton', (event) => {
  const button = $(event.target);

  const postId = getPostIdFromElement(button);

  if (!postId) return;

  $.ajax({
    url: `/api/posts/${postId}/retweet`,
    type: 'POST',
    success: (postData) => {
      button.find('span').text(postData.retweetUsers.length || '');
      if (postData.retweetUsers.includes(userLoggedIn._id)) {
        button.addClass('active');
        emitNotification(postData.postedBy);
      } else {
        button.removeClass('active');
      }
    },
  });
});

// handles clicking on a post
$(document).on('click', '.post', (event) => {
  const element = $(event.target);
  const postId = getPostIdFromElement(element);

  if (postId && !element.is('button')) {
    window.location.href = '/posts/' + postId;
  }
});

// handles clicking on follow button
$(document).on('click', '.followButton', (event) => {
  const button = $(event.target);
  const userId = button.data().user;

  $.ajax({
    url: `/api/users/${userId}/follow`,
    type: 'PUT',
    success: (data, status, xhr) => {
      if (xhr.status === 404) return alert('User not found');

      let difference = 1;
      if (data.following && data.following.includes(userId)) {
        button.addClass('following');
        button.text('following');
        emitNotification(userId);
      } else {
        button.removeClass('following');
        button.text('follow');
        difference = -1;
      }

      const followersLabel = $('#followersValue');

      if (followersLabel.length != 0) {
        const followersCount = parseInt(followersLabel.text());
        followersLabel.text(followersCount + difference);
      }
    },
  });
});

// handles clicking a notification tab
$(document).on('click', '.notification.active', (event) => {
  const container = $(event.target);
  const notificationId = container.data().id;

  const href = container.attr('href');
  event.preventDefault();

  const callback = () => (window.location = href);
  openNotification(notificationId, callback);
});

// handles when reply modal is shown
$('#replyModal').on('show.bs.modal', (event) => {
  const button = $(event.relatedTarget);
  const postId = getPostIdFromElement(button);

  $('#submitReplyButton').data('id', postId);

  $.get(`/api/posts/${postId}`, (result) => {
    outputPosts(result.post, $('#originalPostContainer'));
  });
});

// handles when reply modal is closed
$('#replyModal').on('hidden.bs.modal', () => {
  $('#originalPostContainer').html('');
});

// handles when delete post modal is shown
$('#deletePostModal').on('show.bs.modal', (event) => {
  const button = $(event.relatedTarget);
  const postId = getPostIdFromElement(button);

  $('#deletePostButton').data('id', postId);
});

// handles when pin post modal is shown
$('#confirmPinModal').on('show.bs.modal', (event) => {
  const button = $(event.relatedTarget);
  const postId = getPostIdFromElement(button);

  $('#pinPostButton').data('id', postId);
});

// handles when unpin post modal is shown
$('#unpinModal').on('show.bs.modal', (event) => {
  const button = $(event.relatedTarget);
  const postId = getPostIdFromElement(button);

  $('#unpinPostButton').data('id', postId);
});

// when delete button is clicked from delete post modal
$('#deletePostButton').click((event) => {
  const id = $(event.target).data('id');

  $.ajax({
    url: `/api/posts/${id}`,
    type: 'DELETE',
    success: () => {
      location.reload();
    },
  });
});

// when pin button is clicked from pin post modal
$('#pinPostButton').click((event) => {
  const id = $(event.target).data('id');

  $.ajax({
    url: `/api/posts/${id}`,
    type: 'PUT',
    data: { pinned: true },
    success: (data, status, xhr) => {
      if (xhr.status != 204) {
        alert('Could not pin post');
        return;
      }
      location.reload();
    },
  });
});

// when unpin button is clicked from unpin post modal
$('#unpinPostButton').click((event) => {
  const id = $(event.target).data('id');

  $.ajax({
    url: `/api/posts/${id}`,
    type: 'PUT',
    data: { pinned: false },
    success: (data, status, xhr) => {
      if (xhr.status != 204) {
        alert('Could not unpin post');
        return;
      }
      location.reload();
    },
  });
});

// helper function to get postId
const getPostIdFromElement = (element) => {
  const isRoot = element.hasClass('post');
  const rootElement = isRoot ? element : element.closest('.post');
  const postId = rootElement.data().id;

  if (postId === undefined) return alert('Post Id undefined');

  return postId;
};

// helper function to display all existing posts
const outputPosts = (results, container) => {
  container.html('');

  if (!Array.isArray(results)) results = [results];

  results.forEach((result) => {
    const html = createPostHtml(result);
    container.append(html);
  });

  if (results.length === 0) {
    container.append('<span class="noResults">Nothing to show</span>');
  }
};

// helper function to display the pinned post
const outputPinnedPost = (results, container) => {
  if (results.length == 0) {
    container.hide();
    return;
  }

  container.html('');

  results.forEach((result) => {
    const html = createPostHtml(result);
    container.append(html);
  });
};

// helper to display posts and its replies
const outputPostsWithReplies = (results, container) => {
  container.html('');

  if (results.replyTo && results.replyTo._id) {
    const html = createPostHtml(results.replyTo);
    container.append(html);
  }

  const mainPostHtml = createPostHtml(results.post, true);
  container.append(mainPostHtml);

  results.replies.forEach((result) => {
    const html = createPostHtml(result);
    container.append(html);
  });
};

// helper to display user component
const outputUsers = (results, container) => {
  container.html('');

  if (results.length === 0) {
    container.append(`<span class='noResults'>No results found</span>`);
  }

  results.forEach((result) => {
    const userHtml = createUserHtml(result, true);
    container.append(userHtml);
  });
};

// helper to create users component
const createUserHtml = (userData, showFollowButton) => {
  const name = userData.firstName + ' ' + userData.lastName;
  const isFollowing =
    userLoggedIn.following && userLoggedIn.following.includes(userData._id);
  const text = isFollowing ? 'Following' : 'Follow';
  const buttonClass = isFollowing ? 'followButton following' : 'followButton';

  let followButton = '';
  if (showFollowButton && userLoggedIn._id != userData._id) {
    followButton = `<div class='followButtonContainer'>
      <button class='${buttonClass}' data-user='${userData._id}'>
        ${text}
      </button>
    </div>`;
  }

  return `
    <div class='user'>
      <div class='userImageContainer'>
        <img src='${userData.profilePic}'>
      </div>
      <div class='userDetailsContainer'>
        <div class='header'>
          <a href='/profile/${userData.username}' >${name}</a>
          <span class='username'>@${userData.username}</span>
        </div>
      </div>
      ${followButton}
    </div>
  `;
};

// helper to fetch searched users
searchUsers = (searchTerm) => {
  $.get('/api/users', { search: searchTerm }, (results) => {
    outputSelectableUsers(results, $('.resultsContainer'));
  });
};

// helper to display search users for chat
const outputSelectableUsers = (results, container) => {
  container.html('');

  if (results.length === 0) {
    container.append(`<span class='noResults'>No results found</span>`);
  }

  results.forEach((result) => {
    if (
      result._id == userLoggedIn._id ||
      selectedUsers.some((u) => u._id == result._id)
    ) {
      return;
    }
    const userHtml = createUserHtml(result, false);
    const element = $(userHtml);
    element.click(() => userSelected(result));
    container.append(element);
  });
};

// helper to let selectable user be clickable
const userSelected = (user) => {
  selectedUsers.push(user);
  updateSelectedUsersHtml();
  $('#userSearchTextbox').val('').focus();
  $('.resultsContainer').html('');
  $('#createChatButton').prop('disabled', false);
};

const updateSelectedUsersHtml = () => {
  const elements = [];

  selectedUsers.forEach((user) => {
    const name = user.firstName + ' ' + user.lastName;
    const userElement = $(`<span class='selectedUser'>
      ${name}
    </span>`);
    elements.push(userElement);
  });

  $('.selectedUser').remove();

  $('#selectedUsers').prepend(elements);
};

const messageReceived = (newMessage) => {
  if ($(`[data-room="${newMessage.chat._id}"]`).length == 0) {
    showMessagePopup(newMessage);
  } else {
    addChatMessageHtml(newMessage);
  }

  refreshMessagesBadge();
};

const openNotification = (notificationId = null, callback = null) => {
  if (callback === null) {
    callback = () => location.reload();
  }

  let url =
    notificationId != null
      ? `/api/notifications/${notificationId}/open`
      : `/api/notifications/open`;

  $.ajax({
    url,
    type: 'PUT',
    success: callback,
  });
};

const refreshMessagesBadge = () => {
  $.get('/api/chats', { unreadOnly: true }, (data) => {
    const numResults = data.length;

    if (numResults > 0) {
      $('#messagesBadge').text(numResults).addClass('active');
    } else {
      $('#messagesBadge').text('').removeClass('active');
    }
  });
};

const refreshNotificationsBadge = () => {
  $.get('/api/notifications', { unreadOnly: true }, (data) => {
    const numResults = data.length;

    if (numResults > 0) {
      $('#notificationBadge').text(numResults).addClass('active');
    } else {
      $('#notificationBadge').text('').removeClass('active');
    }
  });
};

const showNotificationPopup = (data) => {
  const html = createNotificationHtml(data);
  const element = $(html);

  element.hide().prependTo('#notificationList').slideDown('fast');

  setTimeout(() => {
    element.fadeOut(400);
  }, 5000);
};

const showMessagePopup = (data) => {
  if (!data.chat.latestMessage._id) {
    data.chat.latestMessage = data;
  }

  const html = createChatHtml(data.chat);
  const element = $(html);

  element.hide().prependTo('#notificationList').slideDown('fast');

  setTimeout(() => {
    element.fadeOut(400);
  }, 5000);
};

const outputNotificationList = (notifications, container) => {
  notifications.forEach((noti) => {
    const html = createNotificationHtml(noti);
    container.append(html);
  });

  if (!notifications.length) {
    container.append('<span class="noResults">Nothing to show</span>');
  }
};

const createNotificationHtml = (notification) => {
  const userFrom = notification.userFrom;
  const text = getNotificationText(notification);
  const href = getNotificationUrl(notification);
  const className = notification.opened ? '' : 'active';

  return `<a href=${href} class="resultListItem notification ${className}" data-id='${notification._id}'>
            <div class='resultsImageContainer'>
              <img src=${userFrom.profilePic}>
            </div>
            <div class="resultsDetailsContainer ellipsis">
                <span class='ellipsis'>${text}</span>
              </div>
          </a>`;
};

const getNotificationText = (notification) => {
  const userFrom = notification.userFrom;

  if (!userFrom.firstName || !userFrom.lastName) {
    return alert('userFrom data not populated');
  }

  const userFromName = `${userFrom.firstName} ${userFrom.lastName}`;

  let text;

  if (notification.notificationType == 'retweet') {
    text = `${userFromName} retweeted one of your posts`;
  } else if (notification.notificationType == 'postLike') {
    text = `${userFromName} liked one of your posts`;
  } else if (notification.notificationType == 'reply') {
    text = `${userFromName} replied to one of your posts`;
  } else if (notification.notificationType == 'follow') {
    text = `${userFromName} started following you`;
  }

  return `<span class='ellipsis'>${text}</span>`;
};

const getNotificationUrl = (notification) => {
  const userFrom = notification.userFrom;

  let link = '#';

  if (
    notification.notificationType == 'retweet' ||
    notification.notificationType == 'postLike' ||
    notification.notificationType == 'reply'
  ) {
    link = `/posts/${notification.entityId}`;
  } else if (notification.notificationType == 'follow') {
    link = `/profile/${notification.entityId}`;
  }

  return link;
};

const createChatHtml = (chatData) => {
  const chatName = getChatName(chatData);
  const image = getChatImageElement(chatData);
  const latestMessage = getLatestMessage(chatData.latestMessage);

  const activeClass =
    !chatData.latestMessage ||
    chatData.latestMessage.readBy.includes(userLoggedIn._id) ||
    chatData.latestMessage.sender._id == userLoggedIn._id
      ? ''
      : 'active';

  return `<a class='resultListItem ${activeClass}' href='/messages/${chatData._id}'>
            ${image}
            <div class='resultsDetailsContainer ellipsis'>
              <span class='heading ellipsis'>${chatName}</span>
              <span class='subText ellipsis'>${latestMessage}</span>
            </div>
          </a>`;
};

const getLatestMessage = (latestMessage) => {
  if (latestMessage != null) {
    const sender = latestMessage.sender;
    return `${sender.firstName} ${sender.lastName}: ${latestMessage.content}`;
  }

  return 'New chat';
};

const getChatName = (chatData) => {
  let name = chatData.chatName;

  if (!name) {
    const users = getOtherChatUsers(chatData.users);
    const nameArray = users.map((user) => user.firstName + ' ' + user.lastName);
    name = nameArray.join(', ');
  }

  chatData.chatName = name;

  return name;
};

const getOtherChatUsers = (users) => {
  if (users.length === 1) return users;

  return users.filter((user) => {
    return user._id != userLoggedIn._id;
  });
};

const getChatImageElement = (chatData) => {
  const otherUsers = getOtherChatUsers(chatData.users);
  let groupChatClass = '';
  let chatImage = getUserChatImageElement(otherUsers[0]);

  if (otherUsers.length > 1) {
    groupChatClass = 'groupChatImage';
    chatImage += getUserChatImageElement(otherUsers[1]);
  }

  return `<div class='${groupChatClass} resultsImageContainer'>
            ${chatImage}
          </div>`;
};

const getUserChatImageElement = (user) => {
  if (!user || !user.profilePic) {
    return alert('User passed into function is invalid');
  }

  return `<img src='${user.profilePic}' alt='User profile'>`;
};
