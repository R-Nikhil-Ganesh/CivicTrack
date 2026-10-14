import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Issue from '../models/Issue.js';

dotenv.config();

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civictrack';
    console.log(`Connecting to database at ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('Clearing existing data...');
    await User.deleteMany();
    await Issue.deleteMany();

    console.log('Seeding initial users...');
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('password123', salt);

    const users = await User.insertMany([
      {
        name: 'Rahul Sharma (Citizen)',
        email: 'citizen@civictrack.org',
        password: defaultPasswordHash,
        role: 'citizen',
        department: 'None',
        phone: '+91 98765 43210',
      },
      {
        name: 'Anita Desai (Citizen)',
        email: 'anita@civictrack.org',
        password: defaultPasswordHash,
        role: 'citizen',
        department: 'None',
        phone: '+91 98765 43211',
      },
      {
        name: 'Eng. Vikram Rao (Roads Dept)',
        email: 'roads@civictrack.org',
        password: defaultPasswordHash,
        role: 'official',
        department: 'Roads',
        phone: '+91 98765 43212',
      },
      {
        name: 'Sunil Verma (Water Supply)',
        email: 'water@civictrack.org',
        password: defaultPasswordHash,
        role: 'official',
        department: 'Water Supply',
        phone: '+91 98765 43213',
      },
      {
        name: 'Pooja Iyer (Waste Mgmt)',
        email: 'waste@civictrack.org',
        password: defaultPasswordHash,
        role: 'official',
        department: 'Waste Management',
        phone: '+91 98765 43214',
      },
      {
        name: 'Karan Mehra (Electricity Dept)',
        email: 'electricity@civictrack.org',
        password: defaultPasswordHash,
        role: 'official',
        department: 'Electricity',
        phone: '+91 98765 43215',
      },
      {
        name: 'Chief Municipal Officer (Admin)',
        email: 'admin@civictrack.org',
        password: defaultPasswordHash,
        role: 'admin',
        department: 'General',
        phone: '+91 98765 43216',
      },
    ]);

    const citizen1 = users[0]._id;
    const citizen2 = users[1]._id;
    const roadsOfficer = users[2]._id;
    const waterOfficer = users[3]._id;
    const wasteOfficer = users[4]._id;

    console.log('Seeding realistic civic complaints...');
    const issues = [
      {
        title: 'Deep crater pothole causing motorcycle accidents',
        description: 'Large dangerous pothole right near the main junction. Multiple two-wheeler riders have skidded during rainy evenings. Urgent asphalt repair needed.',
        category: 'Roads',
        assignedDepartment: 'Roads',
        imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=60',
        location: {
          address: '4th Main Road, Near Central Bus Stop, Indiranagar',
          latitude: 12.9784,
          longitude: 77.6408,
        },
        status: 'In Progress',
        priority: 'High',
        reportedBy: citizen1,
        upvotes: [citizen2],
        statusHistory: [
          {
            status: 'Pending',
            updatedBy: citizen1,
            comment: 'Complaint logged with photo evidence.',
            updatedAt: new Date(Date.now() - 3 * 86400000),
          },
          {
            status: 'In Progress',
            updatedBy: roadsOfficer,
            comment: 'Roads inspection team dispatched. Asphalt patch work scheduled for tonight.',
            updatedAt: new Date(Date.now() - 1 * 86400000),
          },
        ],
      },
      {
        title: 'Major underground water pipeline leakage wasting gallons',
        description: 'Clean drinking water gushing onto the road since early morning from a cracked pipeline joint. Road is waterlogged and household pressure has dropped.',
        category: 'Water Supply',
        assignedDepartment: 'Water Supply',
        imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=60',
        location: {
          address: 'Cross 7, Market Road, Near City Hospital',
          latitude: 12.9698,
          longitude: 77.6012,
        },
        status: 'Pending',
        priority: 'Emergency',
        reportedBy: citizen2,
        upvotes: [citizen1],
        statusHistory: [
          {
            status: 'Pending',
            updatedBy: citizen2,
            comment: 'Lodged urgent complaint regarding drinking water wastage.',
            updatedAt: new Date(Date.now() - 12 * 3600000),
          },
        ],
      },
      {
        title: 'Overflowing public garbage container attracting stray animals',
        description: 'Municipal garbage bin has not been cleared for 4 days. Waste is spilling over pedestrian walkway with foul odor.',
        category: 'Waste Management',
        assignedDepartment: 'Waste Management',
        imageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&auto=format&fit=crop&q=60',
        location: {
          address: 'Sector 2, Colony Park Entrance, MG Road',
          latitude: 12.9734,
          longitude: 77.6195,
        },
        status: 'Resolved',
        priority: 'Medium',
        reportedBy: citizen1,
        upvotes: [citizen2],
        statusHistory: [
          {
            status: 'Pending',
            updatedBy: citizen1,
            comment: 'Reported overflowing garbage bins.',
            updatedAt: new Date(Date.now() - 4 * 86400000),
          },
          {
            status: 'In Progress',
            updatedBy: wasteOfficer,
            comment: 'Compactor vehicle route diverted to clear site.',
            updatedAt: new Date(Date.now() - 2 * 86400000),
          },
          {
            status: 'Resolved',
            updatedBy: wasteOfficer,
            comment: 'Waste cleared, bin disinfected and secondary bin added.',
            updatedAt: new Date(Date.now() - 1 * 86400000),
          },
        ],
      },
      {
        title: 'Consecutive streetlights dark for 300 meters',
        description: '5 street poles are completely dark along the park bypass road. Safety hazard for evening pedestrians.',
        category: 'Electricity',
        assignedDepartment: 'Electricity',
        imageUrl: 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=800&auto=format&fit=crop&q=60',
        location: {
          address: 'Bypass Avenue, Beside Green Valley Park',
          latitude: 12.9812,
          longitude: 77.6256,
        },
        status: 'Pending',
        priority: 'High',
        reportedBy: citizen2,
        upvotes: [],
        statusHistory: [
          {
            status: 'Pending',
            updatedBy: citizen2,
            comment: 'Reported streetlight failure for pedestrian safety.',
            updatedAt: new Date(Date.now() - 2 * 86400000),
          },
        ],
      },
    ];

    await Issue.insertMany(issues);

    console.log('✅ Seeding completed successfully!');
    console.log('Credentials: citizen@civictrack.org / password123 | admin@civictrack.org / password123');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Seeding error: ${error.message}`);
    process.exit(1);
  }
};

seedData();
