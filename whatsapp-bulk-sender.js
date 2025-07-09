const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

class WhatsAppBulkSender {

    loadConfig(configPath = 'my-config.json') {
        try {
            const configData = fs.readFileSync(configPath, 'utf8');
            this.config = JSON.parse(configData);
            
            // Set defaults if not specified
            this.config.settings = this.config.settings || {};
            this.config.settings.delayBetweenMessages = this.config.settings.delayBetweenMessages || 15000;
            this.config.settings.maxRetries = this.config.settings.maxRetries || 1;
            
            return this.config;
        } catch (error) {
            console.error('Error loading config:', error.message);
            process.exit(1);
        }
    }

    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                headless: false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            }
        });
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.client.on('qr', (qr) => {
            console.log('QR RECEIVED', qr);
            console.log('Scannez le code QR avec WhatsApp Web');
        });

        this.client.on('ready', () => {
            console.log('Client WhatsApp est prêt!');
        });

        this.client.on('auth_failure', msg => {
            console.error('AUTHENTICATION FAILURE', msg);
        });

        this.client.on('disconnected', (reason) => {
            console.log('Client déconnecté', reason);
        });
    }

    async initialize() {
        try {
            await this.client.initialize();
            console.log('Client WhatsApp initialisé avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
        }
    }

    formatPhoneNumber(phoneNumber) {
        let cleaned = phoneNumber.replace(/\D/g, '');
        // Ajouter le code pays si nécessaire (exemple: +213 pour l'Algérie)
        if (!cleaned.startsWith('213') && cleaned.length === 9) {
            cleaned = '213' + cleaned;
        }
        
        return cleaned + '@c.us';
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async sendTextMessage(phoneNumber, message) {
        try {
            const formattedNumber = this.formatPhoneNumber(phoneNumber);
            await this.client.sendMessage(formattedNumber, message);
            console.log(`Message envoyé à ${phoneNumber}: ${message.substring(0, 50)}...`);
            return true;
        } catch (error) {
            console.error(`Erreur envoi message à ${phoneNumber}:`, error.message);
            return false;
        }
    }

    async sendMediaMessage(phoneNumber, mediaPath, caption = '') {
        try {
            const MAX_VIDEO_SIZE = 16 * 1024 * 1024; // 16MB
            const formattedNumber = this.formatPhoneNumber(phoneNumber);
            
            if (!fs.existsSync(mediaPath)) {
            throw new Error('File not found');
            }

            const stats = fs.statSync(mediaPath);
            if (stats.size > MAX_VIDEO_SIZE) {
            throw new Error(`Video too large (${(stats.size/1024/1024).toFixed(2)}MB)`);
            }

            if (!fs.existsSync(mediaPath)) {
                console.error(`Fichier non trouvé: ${mediaPath}`);
                return false;
            }

            const media = MessageMedia.fromFilePath(mediaPath);
            await this.client.sendMessage(formattedNumber, media, { caption });
            console.log(`Média envoyé à ${phoneNumber}: ${path.basename(mediaPath)}`);
            return true;
        } catch (error) {
            console.error(`Erreur envoi média à ${phoneNumber}:`, error.message);
            return false;
        }
    }

    async sendBulkMessages(contacts, messageText = '', mediaPath = '', caption = '') {
        const delayMs = this.config?.settings?.delayBetweenMessages || 15000;
        const report = {
            timestamp: new Date().toISOString(),
            total: contacts.length,
            success: 0,
            failed: 0,
            successNumbers: [],
            failedNumbers: [],
            details: []
        };

    console.log(`Starting bulk send to ${contacts.length} contacts...`);

    for (let i = 0; i < contacts.length; i++) {
        const { name, phone } = contacts[i];
        let status = 'failed';
        let error = null;

        try {
            const personalizedMessage = messageText.replace('${name}', name);
            
            let textSuccess = true;
            if (messageText.trim() !== '') {
                textSuccess = await this.sendTextMessage(phone, personalizedMessage);
            }

            if (i < contacts.length - 1) {
                console.log(`Waiting ${delayMs/1000} seconds...`);
                await this.delay(delayMs); // Use configured delay
            }

            // Send media if provided
            let mediaSuccess = true;
            if (mediaPath.trim() !== '') {
                mediaSuccess = await this.sendMediaMessage(phone, mediaPath, caption);
            }

            if (textSuccess && mediaSuccess) {
                report.success++;
                report.successNumbers.push(phone);
                status = 'success';
            } else {
                throw new Error('Partial failure');
            }
        } catch (err) {
            report.failed++;
            report.failedNumbers.push(phone);
            error = err.message;
            console.error(`Error sending to ${phone}:`, error);
        }

        report.details.push({
            contact: { name, phone },
            status,
            timestamp: new Date().toISOString(),
            error: error || null
        });

        // Progress update
        console.log(`Progress: ${i+1}/${contacts.length} - Success: ${report.success} - Failed: ${report.failed}`);

        // Delay between messages (except last one)
        if (i < contacts.length - 1) {
            await this.delay(15000);
        }
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .slice(0, 19);
    const reportFilename = `send_report_${timestamp}.json`;

    this.saveReport(report, reportFilename);

    console.log('\n=== FINAL REPORT ===');
    console.log(`Total: ${report.total}`);
    console.log(`Success: ${report.success}`);
    console.log(`Failed: ${report.failed}`);
    console.log(`Report saved to: ${reportFilename}`);

    return report;
}

    loadPhoneNumbersfromJSON(filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(data);
            
            // Return full contact objects (name + phone)
            return jsonData.map(item => ({
                name: item.name.trim(),
                phone: item.phone.trim()
            }));
        } catch (error) {
            console.error('Error reading JSON file:', error.message);
            return [];
        }
    }

    saveResults(results, filename = 'bulk_send_results.json') {
        try {
            const data = {
                timestamp: new Date().toISOString(),
                results: results
            };
            fs.writeFileSync(filename, JSON.stringify(data, null, 2));
            console.log(`Résultats sauvegardés dans: ${filename}`);
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error.message);
        }
    }

    saveReport(reportData, filename = 'send_report.json') {
    try {
        const reportDir = path.join(__dirname, 'reports');
        
        // Create reports directory if it doesn't exist
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir);
        }

        const filePath = path.join(reportDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
        console.log(`Report saved to: ${filePath}`);
    } catch (error) {
        console.error('Error saving report:', error.message);
    }
}

    async disconnect() {
        await this.client.destroy();
        console.log('Client WhatsApp déconnecté');
    }
}

async function main() {
    const bulkSender = new WhatsAppBulkSender();
    
    try {
        const config = bulkSender.loadConfig();
        
        await bulkSender.initialize();
        await new Promise(resolve => bulkSender.client.on('ready', resolve));

        const contacts = bulkSender.loadPhoneNumbersfromJSON(config.contactsFile);

        // Send messages using config
        const results = await bulkSender.sendBulkMessages(
            contacts,
            config.messageTemplate,
            config.media.path,
            config.media.caption
        );

        if (config.settings.saveReports) {
            bulkSender.saveResults(results);
        }

    } catch (error) {
        console.error('Error in main process:', error);
    } finally {
        await bulkSender.disconnect();
    }
}

// Exporter la classe pour utilisation dans d'autres fichiers
module.exports = WhatsAppBulkSender;

// Exécuter le script si appelé directement
if (require.main === module) {
    main().catch(console.error);
}

// Gestion des signaux pour arrêt propre
process.on('SIGINT', async () => {
    console.log('\nArrêt du programme...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nArrêt du programme...');
    process.exit(0);
});