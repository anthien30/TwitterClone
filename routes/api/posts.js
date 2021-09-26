const express = require('express');

const Post = require('../../models/post');
const User = require('../../models/user');
const Notification = require('../../models/notification');

const router = express.Router();

router.get('/', async (req, res) => {
  const searchObj = req.query;

  if (searchObj.isReply !== undefined) {
    const isReply = searchObj.isReply === 'true';
    searchObj.replyTo = { $exists: isReply };
    delete searchObj.isReply;
  }

  if (searchObj.followingOnly !== undefined) {
    const followingOnly = searchObj.followingOnly == 'true';

    if (followingOnly) {
      const posters = [...req.session.user.following, req.session.user._id];
      searchObj.postedBy = { $in: posters };
    }

    delete searchObj.followingOnly;
  }

  if (searchObj.search !== undefined) {
    searchObj.content = { $regex: searchObj.search, $options: 'i' };
    delete searchObj.search;
  }

  const posts = await getPosts(searchObj);
  res.status(200).send(posts);
});

router.get('/:id', async (req, res) => {
  const posts = await getPosts({ _id: req.params.id });
  const post = posts[0];

  const result = {
    post,
  };

  if (post.replyTo) {
    result.replyTo = post.replyTo;
  }

  result.replies = await getPosts({ replyTo: req.params.id });

  res.status(200).send(result);
});

router.delete('/:id', async (req, res) => {
  await Post.findByIdAndDelete(req.params.id).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });

  res.sendStatus(202);
});

router.put('/:id', async (req, res) => {
  if (req.body.pinned !== undefined) {
    await Post.updateMany(
      { postedBy: req.session.user },
      { pinned: false }
    ).catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
  }

  await Post.findByIdAndUpdate(req.params.id, req.body).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });

  res.sendStatus(204);
});

router.post('/', async (req, res) => {
  if (!req.body.content) {
    console.log('Content param not sent with request');
    return res.sendStatus(400);
  }

  const postData = {
    content: req.body.content,
    postedBy: req.session.user,
  };

  if (req.body.replyTo) {
    postData.replyTo = req.body.replyTo;
  }

  let post = await Post.create(postData).catch((error) => {
    console.log(error);
    return res.sendStatus(400);
  });

  post = await User.populate(post, { path: 'postedBy' });
  post = await Post.populate(post, { path: 'replyTo' });

  if (post.replyTo) {
    await Notification.insertNotification(
      post.replyTo.postedBy,
      req.session.user._id,
      'reply',
      post._id
    );
  }

  res.status(201).send(post);
});

router.put('/:id/like', async (req, res) => {
  const postId = req.params.id;
  const userId = req.session.user._id;

  const isLiked =
    req.session.user.likes && req.session.user.likes.includes(postId);

  const option = isLiked ? '$pull' : '$addToSet';

  // Insert/Remove user like
  req.session.user = await User.findByIdAndUpdate(
    userId,
    {
      [option]: { likes: postId },
    },
    { new: true }
  ).catch((error) => {
    console.log(error);
    return res.sendStatus(400);
  });

  // Insert/Remove post like
  const post = await Post.findByIdAndUpdate(
    postId,
    {
      [option]: { likes: userId },
    },
    { new: true }
  ).catch((error) => {
    console.log(error);
    return res.sendStatus(400);
  });

  if (!isLiked) {
    await Notification.insertNotification(
      post.postedBy,
      userId,
      'postLike',
      post._id
    );
  }

  res.status(200).send(post);
});

router.post('/:id/retweet', async (req, res) => {
  const postId = req.params.id;
  const userId = req.session.user._id;

  // Try and delete retweet
  const deletedPost = await Post.findOneAndDelete({
    postedBy: userId,
    retweetData: postId,
  }).catch((error) => {
    console.log(error);
    return res.sendStatus(400);
  });

  const option = deletedPost ? '$pull' : '$addToSet';

  let repost = deletedPost;

  if (repost === null) {
    repost = await Post.create({ postedBy: userId, retweetData: postId }).catch(
      (error) => {
        console.log(error);
        return res.sendStatus(400);
      }
    );
  }

  // Insert/Remove user retweeted posts
  req.session.user = await User.findByIdAndUpdate(
    userId,
    {
      [option]: { retweets: repost._id },
    },
    { new: true }
  ).catch((error) => {
    console.log(error);
    return res.sendStatus(400);
  });

  // Insert/Remove post retweet users
  const post = await Post.findByIdAndUpdate(
    postId,
    {
      [option]: { retweetUsers: userId },
    },
    { new: true }
  ).catch((error) => {
    console.log(error);
    return res.sendStatus(400);
  });

  if (!deletedPost) {
    await Notification.insertNotification(
      post.postedBy,
      userId,
      'retweet',
      post._id
    );
  }

  res.status(200).send(post);
});

const getPosts = async (filter = {}) => {
  let posts = await Post.find(filter)
    .populate('postedBy')
    .populate('retweetData')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .catch((error) => console.log(error));

  posts = await User.populate(posts, { path: 'retweetData.postedBy' });
  return await User.populate(posts, { path: 'replyTo.postedBy' });
};

module.exports = router;
