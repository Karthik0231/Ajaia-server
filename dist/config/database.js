"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
let isConnected = false;
const connectDB = async () => {
    if (isConnected) {
        console.log('Using existing database connection');
        return;
    }
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('Error: MONGODB_URI is not defined in environment variables');
        process.exit(1);
    }
    try {
        const db = await mongoose_1.default.connect(uri);
        isConnected = db.connections[0].readyState === 1;
        console.log(`MongoDB connected: ${db.connection.host}`);
    }
    catch (error) {
        console.error(`MongoDB connection error: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
