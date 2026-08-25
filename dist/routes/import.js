"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const Document_1 = __importDefault(require("../models/Document"));
const requireUser_1 = require("../middleware/requireUser");
const importParser_1 = require("../lib/importParser");
const router = (0, express_1.Router)();
// Configure multer for memory storage (files up to 2MB)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024, // 2 MB max
    },
});
router.post('/', requireUser_1.requireUser, upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ success: false, message: 'No file uploaded.' });
            return;
        }
        if (file.size === 0) {
            res.status(400).json({ success: false, message: 'This file is empty. Please choose a file with content.' });
            return;
        }
        const originalName = file.originalname || 'document.txt';
        const isMd = originalName.toLowerCase().endsWith('.md');
        const isTxt = originalName.toLowerCase().endsWith('.txt');
        if (!isMd && !isTxt) {
            res.status(400).json({ success: false, message: 'Unsupported file type. Please upload a .txt or .md file.' });
            return;
        }
        const textContent = file.buffer.toString('utf-8');
        let tiptapJson;
        let title = '';
        if (isMd) {
            tiptapJson = (0, importParser_1.mdToTiptap)(textContent);
            title = (0, importParser_1.extractMdTitle)(textContent) || (0, importParser_1.fileNameToTitle)(originalName);
        }
        else {
            tiptapJson = (0, importParser_1.txtToTiptap)(textContent);
            title = (0, importParser_1.fileNameToTitle)(originalName);
        }
        const doc = await Document_1.default.create({
            title,
            content: tiptapJson,
            ownerId: req.userId,
        });
        res.status(201).json({ success: true, data: doc });
    }
    catch (error) {
        if (error instanceof multer_1.default.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            res.status(413).json({ success: false, message: 'This file is larger than 2 MB.' });
            return;
        }
        console.error('Error importing document:', error);
        res.status(500).json({ success: false, message: 'Failed to import document.' });
    }
});
exports.default = router;
