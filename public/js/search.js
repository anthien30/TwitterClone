$('#searchBox').keydown(() => {
  clearTimeout(timer);

  const textbox = $(event.target);
  let value = textbox.val();
  let searchType = textbox.data().search;

  timer = setTimeout(() => {
    value = textbox.val().trim();
    if (value === '') {
      $('.resultsContainer').html('');
    } else {
      search(value, searchType);
    }
  }, 1000);
});

const search = (searchTerm, searchType) => {
  const url = searchType == 'users' ? '/api/users' : '/api/posts';
  $.get(url, { search: searchTerm }, (results) => {
    if (searchType === 'posts') {
      outputPosts(results, $('.resultsContainer'));
    } else {
      outputUsers(results, $('.resultsContainer'));
    }
  });
};
