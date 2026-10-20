import mongoose from 'mongoose';

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    comment: {
      type: String,
      default: '',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an issue title'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please describe the issue in detail'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Please select a civic category'],
      enum: ['Roads', 'Water Supply', 'Waste Management', 'Electricity', 'Other'],
    },
    imageUrl: {
      type: String,
      default: '/uploads/road_crater.webp',
    },
    location: {
      address: {
        type: String,
        required: [true, 'Please provide an address or landmark'],
      },
      latitude: {
        type: Number,
        required: [true, 'Latitude coordinate is required'],
      },
      longitude: {
        type: Number,
        required: [true, 'Longitude coordinate is required'],
      },
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
      default: 'Pending',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Emergency'],
      default: 'Medium',
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedDepartment: {
      type: String,
      enum: ['Roads', 'Water Supply', 'Waste Management', 'Electricity', 'General'],
      default: 'General',
    },
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    statusHistory: [statusHistorySchema],
  },
  {
    timestamps: true,
  }
);

issueSchema.pre('save', function (next) {
  if (this.isNew) {
    if (!this.assignedDepartment || this.assignedDepartment === 'General') {
      const categoryMap = {
        Roads: 'Roads',
        'Water Supply': 'Water Supply',
        'Waste Management': 'Waste Management',
        Electricity: 'Electricity',
        Other: 'General',
      };
      this.assignedDepartment = categoryMap[this.category] || 'General';
    }

    if (this.statusHistory.length === 0) {
      this.statusHistory.push({
        status: this.status || 'Pending',
        updatedBy: this.reportedBy,
        comment: 'Issue reported and lodged into civic tracking system',
        updatedAt: new Date(),
      });
    }
  }
  next();
});

const Issue = mongoose.model('Issue', issueSchema);
export default Issue;
