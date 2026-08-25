"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const SEED_USERS = [
    {
        name: 'Alex Johnson',
        email: 'alex@ajaia.dev',
    },
    {
        name: 'Priya Sharma',
        email: 'priya@ajaia.dev',
    },
    {
        name: 'Rahul Mehta',
        email: 'rahul@ajaia.dev',
    },
];
async function seed() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('Error: MONGODB_URI is not defined in environment variables');
        process.exit(1);
    }
    try {
        await mongoose_1.default.connect(uri);
        console.log(`Connected to MongoDB: ${mongoose_1.default.connection.host}`);
        console.log('Seeding users...');
        for (const userData of SEED_USERS) {
            const existingUser = await User_1.default.findOne({ email: userData.email });
            if (!existingUser) {
                await User_1.default.create(userData);
                console.log(`Created user: ${userData.email}`);
            }
            else {
                console.log(`User already exists: ${userData.email}`);
            }
        }
        console.log('Seed completed successfully.');
    }
    catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}
seed();
