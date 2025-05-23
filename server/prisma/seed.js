"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const prisma = new client_1.PrismaClient();
function exportData() {
    return __awaiter(this, void 0, void 0, function* () {
        // Export all data from your database
        const companies = yield prisma.company.findMany();
        const metrics = yield prisma.metric.findMany();
        const evaluations = yield prisma.evaluation.findMany();
        const interactions = yield prisma.interaction.findMany();
        const processedEmails = yield prisma.processedEmail.findMany();
        const updateLogs = yield prisma.updateLog.findMany();
        // Create a data object with all your data
        const data = {
            companies,
            metrics,
            evaluations,
            interactions,
            processedEmails,
            updateLogs,
        };
        // Write the data to a JSON file
        fs.writeFileSync(path.join(__dirname, 'seed-data.json'), JSON.stringify(data, null, 2));
        console.log('Data exported successfully to seed-data.json');
    });
}
function importData() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Check if the seed data file exists
            const seedFilePath = path.join(__dirname, 'seed-data.json');
            if (!fs.existsSync(seedFilePath)) {
                console.error('Seed data file not found. Run export first.');
                return;
            }
            // Read the seed data
            const seedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));
            // Import companies first
            console.log(`Importing ${seedData.companies.length} companies...`);
            for (const company of seedData.companies) {
                yield prisma.company.upsert({
                    where: { id: company.id },
                    update: company,
                    create: company,
                });
            }
            // Import metrics
            console.log(`Importing ${seedData.metrics.length} metrics...`);
            for (const metric of seedData.metrics) {
                yield prisma.metric.upsert({
                    where: { id: metric.id },
                    update: metric,
                    create: metric,
                });
            }
            // Import evaluations
            console.log(`Importing ${seedData.evaluations.length} evaluations...`);
            for (const evaluation of seedData.evaluations) {
                yield prisma.evaluation.upsert({
                    where: { id: evaluation.id },
                    update: evaluation,
                    create: evaluation,
                });
            }
            // Import interactions
            console.log(`Importing ${seedData.interactions.length} interactions...`);
            for (const interaction of seedData.interactions) {
                yield prisma.interaction.upsert({
                    where: { id: interaction.id },
                    update: interaction,
                    create: interaction,
                });
            }
            // Import processed emails
            console.log(`Importing ${seedData.processedEmails.length} processed emails...`);
            for (const email of seedData.processedEmails) {
                yield prisma.processedEmail.upsert({
                    where: { id: email.id },
                    update: email,
                    create: email,
                });
            }
            // Import update logs
            console.log(`Importing ${seedData.updateLogs.length} update logs...`);
            for (const log of seedData.updateLogs) {
                yield prisma.updateLog.upsert({
                    where: { id: log.id },
                    update: log,
                    create: log,
                });
            }
            console.log('Data imported successfully');
        }
        catch (error) {
            console.error('Error importing data:', error);
        }
    });
}
// Check command line arguments to determine whether to export or import
const args = process.argv.slice(2);
if (args.includes('--export')) {
    exportData()
        .then(() => __awaiter(void 0, void 0, void 0, function* () {
        yield prisma.$disconnect();
    }))
        .catch((e) => __awaiter(void 0, void 0, void 0, function* () {
        console.error(e);
        yield prisma.$disconnect();
        process.exit(1);
    }));
}
else if (args.includes('--import')) {
    importData()
        .then(() => __awaiter(void 0, void 0, void 0, function* () {
        yield prisma.$disconnect();
    }))
        .catch((e) => __awaiter(void 0, void 0, void 0, function* () {
        console.error(e);
        yield prisma.$disconnect();
        process.exit(1);
    }));
}
else {
    console.log('Please specify --export or --import');
    process.exit(1);
}
//# sourceMappingURL=seed.js.map