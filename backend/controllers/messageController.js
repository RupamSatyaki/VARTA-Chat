const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { getLinkPreview } = require('link-preview-js');
const axios = require('axios');

// Helper to extract URL from text (Only full URLs)
const extractUrl = (text) => {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const matches = text.match(urlRegex);
  return matches ? matches[0] : null;
};

// Helper to fetch link preview
const fetchLinkPreviewData = async (url) => {
  try {
    // 1. Specialized handling for YouTube (including Shorts) via oEmbed
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      try {
        const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const response = await axios.get(oEmbedUrl, { timeout: 4000 });
        if (response.data) {
          return {
            title: response.data.title,
            description: response.data.author_name ? `By ${response.data.author_name}` : 'YouTube Video',
            image: response.data.thumbnail_url,
            url: url,
            siteName: 'YouTube',
          };
        }
      } catch (ytError) {
        console.log(`ℹ YouTube oEmbed fallback for ${url}: ${ytError.message}`);
      }
    }

    // 2. Standard scraper for other sites
    const data = await getLinkPreview(url, {
      timeout: 5000,
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      },
    });
    
    if (data && (data.title || data.description)) {
      return {
        title: data.title,
        description: data.description,
        image: data.images && data.images.length > 0 ? data.images[0] : (data.favicons && data.favicons.length > 0 ? data.favicons[0] : null),
        url: data.url,
        siteName: data.siteName,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching link preview:', error.message);
    return null;
  }
};

/**
 * @desc    Send a message
 * @route   POST /api/messages
 * @access  Public (Should be private with auth middleware)
 */
const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, type, chatId } = req.body;

    if (!senderId || !receiverId || !content || !chatId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide senderId, receiverId, content and chatId'
      });
    }

    // Check for link preview
    let linkPreviewData = null;
    const url = extractUrl(content);
    if (url && (type === 'text' || !type)) {
      linkPreviewData = await fetchLinkPreviewData(url);
    }

    const message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      content,
      type: type || 'text',
      status: 'sent',
      chat: chatId,
      linkPreview: linkPreviewData
    });

    // Update the chat document with the latest message
    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: message._id,
    });

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error(`❌ Error in sendMessage: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Get messages between two users (Conversation history)
 * @route   GET /api/messages/:senderId/:receiverId
 * @access  Public
 */
const getMessages = async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;

    // Find messages where (sender is user1 AND receiver is user2) OR (sender is user2 AND receiver is user1)
    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    }).sort({ createdAt: 1 }); // Sort by time (ascending)

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    console.error(`❌ Error in getMessages: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Get messages for a specific chat with pagination
 * @route   GET /api/messages/:chatId
 * @access  Private
 */
const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 20, before } = req.query;

    const query = { chat: chatId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate("sender", "name profilePic number")
      .populate({
        path: "replyTo",
        select: "content sender",
        populate: { path: "sender", select: "name" }
      })
      .populate("readBy.user", "name profilePic")
      .populate("deliveredTo.user", "name profilePic")
      .populate("reactions.user", "name profilePic")
      .sort({ createdAt: -1 }) // Get latest messages first for pagination
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    console.error(`❌ Error in getChatMessages: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Get shared media, links, and docs for a specific chat
 * @route   GET /api/messages/media/:chatId
 * @access  Private
 */
const getChatMedia = async (req, res) => {
  try {
    const { chatId } = req.params;

    const messages = await Message.find({ 
      chat: chatId,
      $or: [
        { type: 'image' },
        { type: 'file' },
        { type: 'document' },
        { linkPreview: { $ne: null } }
      ]
    }).sort({ createdAt: -1 });

    const media = messages.filter(m => m.type === 'image');
    const links = messages.filter(m => m.linkPreview && m.linkPreview.url);
    const docs = messages.filter(m => m.type === 'file' || m.type === 'document');

    res.status(200).json({
      success: true,
      data: {
        media,
        links,
        docs
      }
    });
  } catch (error) {
    console.error(`❌ Error in getChatMedia: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Upload an image to Cloudinary
 * @route   POST /api/messages/upload
 * @access  Private
 */
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    res.status(200).json({
      success: true,
      url: req.file.path, // Cloudinary URL
      public_id: req.file.filename
    });
  } catch (error) {
    console.error(`❌ Error in uploadImage: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Get link preview data
 * @route   GET /api/messages/link-preview?url=...
 * @access  Private
 */
const getLinkPreviewData = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required' });
    }

    const preview = await fetchLinkPreviewData(url);
    if (!preview) {
      return res.status(404).json({ success: false, message: 'Could not fetch preview' });
    }

    res.status(200).json({
      success: true,
      data: preview
    });
  } catch (error) {
    console.error(`❌ Error in getLinkPreviewData: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getChatMessages,
  getChatMedia,
  uploadImage,
  getLinkPreviewData
};
