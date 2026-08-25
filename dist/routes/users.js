"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const User_1 = __importDefault(require("../models/User"));
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const users = await User_1.default.find().sort({ createdAt: 1 });
        res.json({
            success: true,
            data: users,
        });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to load users',
        });
    }
});
exports.default = router;
