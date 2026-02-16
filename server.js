const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

class GameWebSocketClient {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
        this.isAuthenticated = false;
        this.sessionId = null;
        this.latestTxData = null;
        this.latestMd5Data = null;
        this.lastUpdateTime = { tx: null, md5: null };
    }

    connect() {
        console.log('🔗 Connecting to WebSocket server (xoc88)...');
        this.ws = new WebSocket(this.url, {
            headers: {
                'Host': 'api.apixoc88.net',
                'Origin': 'https://play.xoc88.la',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
                'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
                'Sec-WebSocket-Version': '13'
            }
        });
        this.setupEventHandlers();
    }

    setupEventHandlers() { /* giống */ }
    sendAuthentication() {
        console.log('🔐 Sending authentication...');
        const authMessage = [
            1,
            "MiniGame",
            "xoc88apia",
            "WangLin1@",
            {
                "signature": "0E5057BD295C4D21FCA0B8986281D6C8319EA7F1023E1FF559D524353249EBF5A12AF306AA0B7A5FE670DC93353BF0C5030DB4F2E07F6824722FD94F16B06D2E6604BFD1D5D9E8CF852F0FB9468C4D0A60E0A7316CDA84D4F3D9D2AAEE77954967E1D0C738EFB7ED2614B3A4D768853FB78672ACA30F2B2DF9E4FC96DD93FCB8",
                "info": {
                    "cs": "0b834f4885f05cf3a36d19e345fd44db",
                    "phone": "",
                    "ipAddress": "113.185.46.68",
                    "isMerchant": false,
                    "userId": "ab53d7e5-1940-4011-808c-caa20426d4fe",
                    "deviceId": "050105373613900053736078036024",
                    "isMktAccount": false,
                    "username": "xoc88apia",
                    "timestamp": 1766557858102
                },
                "pid": 4
            }
        ];
        this.sendRaw(authMessage);
    }
    sendPluginMessages() {
        console.log('🚀 Sending plugin initialization messages...');
        const pluginMessages = [
            [6,"MiniGame","taixiuPlugin",{"cmd":1005}],
            [6,"MiniGame","taixiuMd5Plugin",{"cmd":1105}],
            [6,"MiniGame","channelPlugin",{"cmd":310}],
            [6,"MiniGame","lobbyPlugin",{"cmd":10001}]
        ];
        pluginMessages.forEach((message, index) => {
            setTimeout(() => {
                console.log(`📤 Sending plugin ${index+1}/${pluginMessages.length}: ${message[2]}`);
                this.sendRaw(message);
            }, index * 1000);
        });
        setInterval(() => this.refreshGameData(), 30000);
    }
    refreshGameData() {
        if (this.isAuthenticated && this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('🔄 Refreshing game data...');
            this.sendRaw([6, "MiniGame", "taixiuPlugin", { "cmd": 1005 }]);
            setTimeout(() => this.sendRaw([6, "MiniGame", "taixiuMd5Plugin", { "cmd": 1105 }]), 1000);
        }
    }
    sendRaw(data) { /* giống */ }
    handleMessage(data) { /* giống */ }

    // Copy toàn bộ các phương thức lấy dữ liệu và dự đoán từ hot789
    // ...

    handleReconnect() { /* giống */ }
    startHeartbeat() { /* giống */ }
    close() { /* giống */ }
}

const app = express();
const PORT = 3003;
app.use(cors());
app.use(express.json());

const client = new GameWebSocketClient(
    'wss://api.apixoc88.net/websocket?d=YlcxaGIyZGlhMjQ9fDUzMjd8MTc2NjU1Nzg1NzU2NXw5NGRiMGI5NGM2NjNiODViNWUxMzY3NjkzMjg3NGY3OXwyM2ZlN2IwNGY2MWE0ODA4NTljNWUyY2I4NTI3NGY4Ng=='
);
client.connect();

// API endpoints (giống hệt hot789)
app.get('/api/tx', (req, res) => { const d = client.getLatestTxSession(); d.error ? res.status(404).json(d) : res.json(d); });
app.get('/api/md5', (req, res) => { const d = client.getLatestMd5Session(); d.error ? res.status(404).json(d) : res.json(d); });
app.get('/api/all', (req, res) => res.json({ tai_xiu: client.getLatestTxSession(), md5: client.getLatestMd5Session(), timestamp: new Date().toISOString() }));
app.get('/api/status', (req, res) => res.json({
    status: 'running',
    websocket_connected: client.ws?.readyState === WebSocket.OPEN,
    authenticated: client.isAuthenticated,
    has_tx_data: !!(client.latestTxData?.htr?.length),
    has_md5_data: !!(client.latestMd5Data?.htr?.length),
    tx_last_updated: client.lastUpdateTime.tx?.toISOString() || null,
    md5_last_updated: client.lastUpdateTime.md5?.toISOString() || null,
    timestamp: new Date().toISOString()
}));
app.get('/api/refresh', (req, res) => {
    if (client.isAuthenticated && client.ws?.readyState === WebSocket.OPEN) {
        client.refreshGameData();
        res.json({ message: 'Đã gửi yêu cầu refresh dữ liệu', timestamp: new Date().toISOString() });
    } else res.status(400).json({ error: 'Không thể refresh', message: 'WebSocket chưa sẵn sàng' });
});

// API dự đoán đầy đủ
app.get('/api/predict/tx', (req, res) => res.json({ board: 'tai_xiu', ...client.getTxPrediction(), timestamp: new Date().toISOString() }));
app.get('/api/predict/md5', (req, res) => res.json({ board: 'md5', ...client.getMd5Prediction(), timestamp: new Date().toISOString() }));
app.get('/api/predict/all', (req, res) => res.json({ tai_xiu: client.getTxPrediction(), md5: client.getMd5Prediction(), timestamp: new Date().toISOString() }));

// API dự đoán rút gọn (short) - copy từ hot789
app.get('/api/predict/tx/short', (req, res) => {
    try {
        const pred = client.getTxPrediction();
        const latest = client.getLatestTxSession();
        res.json({
            board: 'tai_xiu',
            prediction: pred.prediction || 'không xác định',
            confidence: pred.confidence || '0%',
            latest_session: latest.phien || null,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server', message: error.message });
    }
});
app.get('/api/predict/md5/short', (req, res) => {
    try {
        const pred = client.getMd5Prediction();
        const latest = client.getLatestMd5Session();
        res.json({
            board: 'md5',
            prediction: pred.prediction || 'không xác định',
            confidence: pred.confidence || '0%',
            latest_session: latest.phien || null,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server', message: error.message });
    }
});
app.get('/api/predict/all/short', (req, res) => {
    try {
        const txPred = client.getTxPrediction();
        const txLatest = client.getLatestTxSession();
        const md5Pred = client.getMd5Prediction();
        const md5Latest = client.getLatestMd5Session();
        res.json({
            tai_xiu: {
                prediction: txPred.prediction || 'không xác định',
                confidence: txPred.confidence || '0%',
                latest_session: txLatest.phien || null
            },
            md5: {
                prediction: md5Pred.prediction || 'không xác định',
                confidence: md5Pred.confidence || '0%',
                latest_session: md5Latest.phien || null
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server', message: error.message });
    }
});

app.get('/', (req, res) => {
    res.send(`<html>... (tiêu đề XOC88) ...</html>`);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 XOC88 server running at http://localhost:${PORT}`);
});

setTimeout(() => client.startHeartbeat(), 10000);
process.on('SIGINT', () => { client.close(); process.exit(); });

module.exports = { GameWebSocketClient, app };
