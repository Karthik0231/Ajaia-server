"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUser = requireUser;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
async function requireUser(req, res, next) {
    const userId = req.headers['x-user-id'];
    if (!userId || typeof userId !== 'string') {
        res.status(401).json({ success: false, message: 'Missing user identity' });
        return;
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        res.status(401).json({ success: false, message: 'Invalid user identity' });
        return;
    }
    try {
        const user = await User_1.default.findById(userId);
        if (!user) {
            res.status(401).json({ success: false, message: 'User not found' });
            return;
        }
        req.userId = userId;
        next();
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
}
