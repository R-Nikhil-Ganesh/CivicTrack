import Issue from '../models/Issue.js';

export const updateIssueStatus = async (req, res, next) => {
  try {
    const { status, comment } = req.body;

    const allowedStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`,
      });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    if (
      req.user.role === 'official' &&
      req.user.department !== 'General' &&
      issue.assignedDepartment !== req.user.department
    ) {
      return res.status(403).json({
        success: false,
        message: `Your account is assigned to '${req.user.department}'. You cannot modify '${issue.assignedDepartment}' issues.`,
      });
    }

    issue.status = status;

    issue.statusHistory.push({
      status,
      updatedBy: req.user._id,
      comment: comment || `Status updated to ${status} by ${req.user.name} (${req.user.department || req.user.role})`,
      updatedAt: new Date(),
    });

    await issue.save();

    const updatedIssue = await Issue.findById(issue._id)
      .populate('reportedBy', 'name email')
      .populate('statusHistory.updatedBy', 'name role department');

    res.json({
      success: true,
      data: updatedIssue,
      message: `Issue status updated to '${status}' successfully`,
    });
  } catch (error) {
    next(error);
  }
};

export const assignDepartment = async (req, res, next) => {
  try {
    const { department } = req.body;
    const allowedDepartments = ['Roads', 'Water Supply', 'Waste Management', 'Electricity', 'General'];

    if (!allowedDepartments.includes(department)) {
      return res.status(400).json({
        success: false,
        message: `Invalid department. Must be one of: ${allowedDepartments.join(', ')}`,
      });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    issue.assignedDepartment = department;
    issue.statusHistory.push({
      status: issue.status,
      updatedBy: req.user._id,
      comment: `Reassigned to ${department} Department by Administrator`,
      updatedAt: new Date(),
    });

    await issue.save();

    res.json({
      success: true,
      data: issue,
      message: `Issue reassigned to ${department}`,
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const totalIssues = await Issue.countDocuments();
    const pendingIssues = await Issue.countDocuments({ status: 'Pending' });
    const inProgressIssues = await Issue.countDocuments({ status: 'In Progress' });
    const resolvedIssues = await Issue.countDocuments({ status: 'Resolved' });
    const rejectedIssues = await Issue.countDocuments({ status: 'Rejected' });

    const categoryStats = await Issue.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
    ]);

    const departmentStats = await Issue.aggregate([
      {
        $group: {
          _id: '$assignedDepartment',
          count: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0],
            },
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          total: totalIssues,
          pending: pendingIssues,
          inProgress: inProgressIssues,
          resolved: resolvedIssues,
          rejected: rejectedIssues,
          resolutionRate: totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0,
        },
        categoryStats,
        departmentStats,
      },
    });
  } catch (error) {
    next(error);
  }
};
