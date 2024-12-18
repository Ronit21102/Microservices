const express = require("express");
const bodyParser = require("body-parser");
const { randomBytes } = require("crypto");
const cors = require("cors");
const axios = require("axios");
const { type } = require("os");

const app = express();

app.use(cors());
app.use(bodyParser.json());

const commentsByPostId = {};
app.get("/posts/:id/comments", (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

app.post("/posts/:id/comments", async (req, res) => {
  const commentId = randomBytes(4).toString("hex");
  const { content } = req.body;
  const postId = req.params.id;

  // get the comments of the post
  const comments = commentsByPostId[postId] || [];
  // add the new comment to the post
  comments.push({ id: commentId, content, status: "pending" });

  commentsByPostId[postId] = comments;
  await axios.post("http://event-bus-srv:4005/events", {
    type: "CommentCreated",
    data: {
      id: commentId,
      content,
      postId,
      status: "pending",
    },
  });

  res.status(201).send(comments);
});

app.post("/events", async (req, res) => {
  console.log("Received Event", req.body.type);
  const { type, data } = req.body;
  if (type === "CommentModerated") {
    const { postId, id, status } = data;
    const comments = commentsByPostId[postId];

    const comment = comments.find((comment) => {
      return comment.id === id;
    });
    comment.status = status;
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: {
        id,
        status,
        postId,
        content: comment.content
      }
      })
  }
  res.send({});
});

app.listen(4001, () => {
  console.log("Listening on 4001");
});
