const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Discord Credentials & Settings
const TOKEN = process.env.DISCORD_TOKEN || 'MTU1ODQ3MDc1MjYyMDExODAxNw.GN3SJg.cDFqlTUavVKjP7rZ-5aIkNPQujSmXb20i_Me-0';
const CLIENT_ID = process.env.CLIENT_ID || '1558470752620118017';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'K5vqtlO7ZwfJ7HaaStHqQAIE7Q-YEMV8';
const GUILD_ID = '1555276250573185028';
const VERIFIED_ROLE_ID = '1555276250573185028';

// External URL setup for Render
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || `https://secbot-xvoe.onrender.com`;
const REDIRECT_URI = `${RENDER_EXTERNAL_URL}/callback`;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Express Web Routes
app.get('/', (req, res) => {
    res.send('<h1>SecBot Verification Server is Live!</h1>');
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send('No authorization code provided.');
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
            return res.status(400).send('Failed to exchange code for access token.');
        }

        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                authorization: `Bearer ${tokenData.access_token}`
            }
        });

        const userData = await userResponse.json();

        // Assign Verified Role
        const guild = await client.guilds.fetch(GUILD_ID);
        if (guild) {
            const member = await guild.members.fetch(userData.id).catch(() => null);
            if (member) {
                await member.roles.add(VERIFIED_ROLE_ID).catch(console.error);
            }
        }

        res.send('<h2>تمت عملية التحقق بنجاح! يمكنك الآن إغلاق العارض والعودة لتطبيق ديسكورد.</h2>');
    } catch (error) {
        console.error('OAuth Callback Error:', error);
        res.status(500).send('An error occurred during verification.');
    }
});

// Setup Command
client.on('messageCreate', async (message) => {
    if (message.content === '!setup-verify' && message.member.permissions.has('Administrator')) {
        const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds.join`;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('اضغط هنا للتحقق / Verify Here')
                .setStyle(ButtonStyle.Link)
                .setURL(oauthUrl)
        );

        const embed = new EmbedBuilder()
            .setTitle('نظام التحقق والتأكيد')
            .setDescription('يرجى الضغط على الزر أدناه لإتمام عملية التحقق والحصول على الرتبة تلقائياً.')
            .setColor(0x2b2d31);

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

client.once('ready', () => {
    console.log(`Bot is logged in as ${client.user.tag}`);
});

// Start Web Server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Active Redirect URI: ${REDIRECT_URI}`);
});

// Bot Login
client.login(TOKEN);
