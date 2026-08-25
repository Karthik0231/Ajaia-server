"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTestDb = startTestDb;
exports.stopTestDb = stopTestDb;
exports.clearCollections = clearCollections;
const mongodb_memory_server_1 = require("mongodb-memory-server");
const mongoose_1 = __importDefault(require("mongoose"));
let mongod;
async function startTestDb() {
    mongod = await mongodb_memory_server_1.MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose_1.default.connect(uri);
}
async function stopTestDb() {
    await mongoose_1.default.connection.dropDatabase();
    await mongoose_1.default.connection.close();
    await mongod.stop();
}
async function clearCollections() {
    const collections = mongoose_1.default.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
}
