const Chat = require('../models/Chat');
const User = require('../models/User');

/**
 * @desc    Create or fetch a one-on-one chat
 * @route   POST /api/chats
 * @access  Private
 */
const accessChat = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    console.log("UserId param not sent with request");
    return res.sendStatus(400);
  }

  var isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name profilePic number",
  });

  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    var chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        "users",
        "-password"
      );
      res.status(200).json(FullChat);
    } catch (error) {
      res.status(400).send(error.message);
    }
  }
};

const Message = require('../models/Message');

/**
 * @desc    Fetch all chats for a user
 * @route   GET /api/chats
 * @access  Private
 */
const fetchChats = async (req, res) => {
  try {
    const results = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    const populatedResults = await User.populate(results, {
      path: "latestMessage.sender",
      select: "name profilePic number",
    });

    // Add unread count for each chat
    const chatsWithUnreadCount = await Promise.all(populatedResults.map(async (chat) => {
      const unreadCount = await Message.countDocuments({
        chat: chat._id,
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id }
      });
      return { ...chat._doc, unreadCount };
    }));

    res.status(200).send(chatsWithUnreadCount);
  } catch (error) {
    console.error(`❌ Error in fetchChats: ${error.message}`);
    res.status(400).send(error.message);
  }
};

/**
 * @desc    Find a chat between two users
 * @route   GET /api/chats/find/:firstUserId/:secondUserId
 * @access  Private
 */
const findChat = async (req, res) => {
  try {
    const { firstUserId, secondUserId } = req.params;

    const chat = await Chat.findOne({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: firstUserId } } },
        { users: { $elemMatch: { $eq: secondUserId } } },
      ],
    })
      .populate("users", "-password")
      .populate("latestMessage");

    if (chat) {
      res.status(200).json(chat);
    } else {
      res.status(404).json({ message: "Chat not found" });
    }
  } catch (error) {
    res.status(400).send(error.message);
  }
};

/**
 * @desc    Create a group chat
 * @route   POST /api/chats/group
 * @access  Private
 */
const createGroupChat = async (req, res) => {
  if (!req.body.users || !req.body.name) {
    return res.status(400).send({ message: "Please fill all the fields" });
  }

  var users = JSON.parse(req.body.users);

  if (users.length < 2) {
    return res
      .status(400)
      .send("More than 2 users are required to form a group chat");
  }

  users.push(req.user);

  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      groupAdmin: req.user,
      description: req.body.description || "",
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(200).json(fullGroupChat);
  } catch (error) {
    res.status(400).send(error.message);
  }
};

/**
 * @desc    Rename a group chat
 * @route   PUT /api/chats/rename
 * @access  Private
 */
const renameGroup = async (req, res) => {
  const { chatId, chatName } = req.body;

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      chatName: chatName,
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!updatedChat) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(updatedChat);
  }
};

/**
 * @desc    Add a user to a group chat
 * @route   PUT /api/chats/groupadd
 * @access  Private
 */
const addToGroup = async (req, res) => {
  const { chatId, userId } = req.body;

  // check if the requester is admin

  const added = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!added) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(added);
  }
};

/**
 * @desc    Remove a user from a group chat
 * @route   PUT /api/chats/groupremove
 * @access  Private
 */
const removeFromGroup = async (req, res) => {
  const { chatId, userId } = req.body;

  // check if the requester is admin

  const removed = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!removed) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(removed);
  }
};

module.exports = { accessChat, fetchChats, findChat, createGroupChat, renameGroup, addToGroup, removeFromGroup };
