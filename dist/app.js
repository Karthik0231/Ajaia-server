"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const users_1 = __importDefault(require("./routes/users"));
const documents_1 = __importDefault(require("./routes/documents"));
const import_1 = __importDefault(require("./routes/import"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/users', users_1.default);
app.use('/api/documents', documents_1.default);
app.use('/api/import', import_1.default);
app.get('/api/health', (req, res) => {
    const isConnected = mongoose_1.default.connection.readyState === 1;
    res.json({
        success: true,
        message: 'API is running',
        database: isConnected ? 'connected' : 'disconnected',
    });
});
exports.default = app;
