const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Variables from Render Environment
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = '1555276250573185028';
const VERIFIED_ROLE_ID = '1555276250573185028'; // ضع آيدي رتبة التحقق هنا لو كان مختلفاً

// Auto-detect public URL on Render or fallback to localhost
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
const REDIRECT_URI = `${RENDER_EXTERNAL_URL}/callback`;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Express Web Server Routes
app.get('/', (req, res) => {
    res.send('<h1>Server is running successfully on Render!</h1>');
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send('No code provided.');
    }

    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
                scope: 'identify guilds.join'
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const tokenData = await tokenResponse.json();
        if (!tokenData.access_token) {
            return res.status(400).send('Failed to fetch access token.');
        }

        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                authorization: `Bearer ${tokenData.access_token}`
            }
        });

        const userData = await userResponse.json();

        // Assign role to the user in the target guild
        const guild = await client.guilds.fetch(GUILD_ID);
        if (guild) {
            const member = await guild.members.fetch(userData.id).catch(() => null);
            if (member) {
                await member.roles.add(VERIFIED_ROLE_ID).catch(console.error);
            }
        }

        res.send('<h2>تم التحقق بنجاح! يمكنك إغلاق هذه الصفحة والعودة إلى ديسكورد.</h2>');
    } catch (error) {
        console.error('Error during OAuth callback:', error);
        res.status(500).send('An error occurred during verification.');
    }
});

// Bot commands and interaction
client.on('messageCreate', async (message) => {
    if (message.content === '!setup-verify' && message.member.permissions.has('Administrator')) {
        const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds.join`;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('تحقق الآن / Verify')
                .setStyle(ButtonStyle.Link)
                .setURL(oauthUrl)
        );

        const embed = new EmbedBuilder()
            .setTitle('نظام التحقق آلياً')
            .setDescription('اضغط على الزر أدناه لتأكيد حسابك والحصول على الرتبة تلقائياً.')
            .setColor(0x2b2d31);

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Start Express Server
app.listen(PORT, () => {
    console.log(`Web server listening on port ${PORT}`);
    console.log(`Redirect URI set to: ${REDIRECT_URI}`);
});

// Login to Discord
client.login(TOKEN);
