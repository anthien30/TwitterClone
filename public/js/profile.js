$(document).ready(() => {
  if (selectedTab === 'replies') {
    loadReplies();
  } else {
    loadPosts();
  }
});

const loadPosts = () => {
  $.get('/api/posts', { postedBy: profileUserId, pinned: true }, (results) => {
    outputPinnedPost(results, $('.pinnedPostContainer'));
  });

  $.get(
    '/api/posts',
    { postedBy: profileUserId, isReply: false },
    (results) => {
      outputPosts(results, $('.postsContainer'));
    }
  );
};

const loadReplies = () => {
  $.get('/api/posts', { postedBy: profileUserId, isReply: true }, (results) => {
    outputPosts(results, $('.postsContainer'));
  });
};
