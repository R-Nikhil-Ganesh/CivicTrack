import Issue from '../models/Issue.js';

export const getAllIssues = async (req, res, next) => {
  try {
    const { category, status, department, search, sortBy } = req.query;
    let query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (department && department !== 'All') {
      query.assignedDepartment = department;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sortBy === 'upvotes') {
      sortOption = { upvotes: -1, createdAt: -1 };
    }

    const issues = await Issue.find(query)
      .populate('reportedBy', 'name email')
      .populate('statusHistory.updatedBy', 'name role department')
      .sort(sortOption);

    res.json({
      success: true,
      count: issues.length,
      data: issues,
    });
  } catch (error) {
    next(error);
  }
};

export const getIssueById = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('reportedBy', 'name email phone')
      .populate('statusHistory.updatedBy', 'name role department');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Civic issue not found',
      });
    }

    res.json({
      success: true,
      data: issue,
    });
  } catch (error) {
    next(error);
  }
};

export const createIssue = async (req, res, next) => {
  try {
    const { title, description, category, address, latitude, longitude, imageUrl, priority } = req.body;

    if (!title || !description || !category || !address || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, category, address, latitude, and longitude',
      });
    }

    let finalImageUrl = imageUrl;
    if (req.file) {
      finalImageUrl = `/uploads/${req.file.filename}`;
    } else if (!finalImageUrl || finalImageUrl.trim() === '') {
      const sampleImages = {
        Roads: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60',
        'Water Supply': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=60',
        'Waste Management': 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&auto=format&fit=crop&q=60',
        Electricity: 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=600&auto=format&fit=crop&q=60',
        Other: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600&auto=format&fit=crop&q=60',
      };
      finalImageUrl = sampleImages[category] || sampleImages.Other;
    }

    const issue = await Issue.create({
      title,
      description,
      category,
      imageUrl: finalImageUrl,
      location: {
        address,
        latitude: Number(latitude),
        longitude: Number(longitude),
      },
      priority: priority || 'Medium',
      reportedBy: req.user._id,
      upvotes: [],
    });

    const populatedIssue = await Issue.findById(issue._id)
      .populate('reportedBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedIssue,
      message: 'Issue reported and lodged into system',
    });
  } catch (error) {
    next(error);
  }
};

export const getMyIssues = async (req, res, next) => {
  try {
    const issues = await Issue.find({ reportedBy: req.user._id })
      .populate('statusHistory.updatedBy', 'name role department')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: issues.length,
      data: issues,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUpvote = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    const userIdStr = req.user._id.toString();
    const alreadyUpvoted = issue.upvotes.some((id) => id.toString() === userIdStr);

    if (alreadyUpvoted) {
      issue.upvotes = issue.upvotes.filter((id) => id.toString() !== userIdStr);
    } else {
      issue.upvotes.push(req.user._id);
    }

    await issue.save();

    res.json({
      success: true,
      data: {
        upvotesCount: issue.upvotes.length,
        isUpvoted: !alreadyUpvoted,
      },
      message: alreadyUpvoted ? 'Upvote removed' : 'Issue upvoted',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    const isOwner = issue.reportedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this issue',
      });
    }

    if (isOwner && !isAdmin && issue.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an issue that is already being processed or resolved',
      });
    }

    await issue.deleteOne();

    res.json({
      success: true,
      message: 'Issue deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
