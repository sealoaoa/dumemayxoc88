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

    setupEventHandlers() {
        this.ws.on('open', () => {
            console.log('✅ Connected to WebSocket server');
            this.reconnectAttempts = 0;
            this.sendAuthentication();
        });
        this.ws.on('message', (data) => this.handleMessage(data));
        this.ws.on('error', (error) => console.error('❌ WebSocket error:', error.message));
        this.ws.on('close', (code, reason) => {
            console.log(`🔌 Connection closed. Code: ${code}, Reason: ${String(reason)}`);
            this.isAuthenticated = false;
            this.sessionId = null;
            this.handleReconnect();
        });
        this.ws.on('pong', () => console.log('❤️  Heartbeat received from server'));
    }

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

    sendRaw(data) {
        if (this.ws.readyState === WebSocket.OPEN) {
            const jsonString = JSON.stringify(data);
            this.ws.send(jsonString);
            console.log('📤 Sent raw:', jsonString);
            return true;
        }
        console.log('⚠️ Cannot send, WebSocket not open');
        return false;
    }

    handleMessage(data) {
        try {
            const parsed = JSON.parse(data);
            if (parsed[0] === 5 && parsed[1] && parsed[1].cmd === 1005) {
                console.log('🎯 Nhận được dữ liệu cmd 1005 (Bàn TX)');
                const gameData = parsed[1];
                if (gameData.htr && gameData.htr.length > 0) {
                    const latestSession = gameData.htr.reduce((p,c) => c.sid > p.sid ? c : p);
                    console.log(`🎲 Bàn TX - Phiên gần nhất: ${latestSession.sid} (${latestSession.d1},${latestSession.d2},${latestSession.d3})`);
                    this.latestTxData = gameData;
                    this.lastUpdateTime.tx = new Date();
                }
            }
            else if (parsed[0] === 5 && parsed[1] && parsed[1].cmd === 1105) {
                console.log('🎯 Nhận được dữ liệu cmd 1105 (Bàn MD5)');
                const gameData = parsed[1];
                if (gameData.htr && gameData.htr.length > 0) {
                    const latestSession = gameData.htr.reduce((p,c) => c.sid > p.sid ? c : p);
                    console.log(`🎲 Bàn MD5 - Phiên gần nhất: ${latestSession.sid} (${latestSession.d1},${latestSession.d2},${latestSession.d3})`);
                    this.latestMd5Data = gameData;
                    this.lastUpdateTime.md5 = new Date();
                }
            }
            else if (parsed[0] === 5 && parsed[1] && parsed[1].cmd === 100) {
                console.log('🔑 Authentication successful!');
                this.isAuthenticated = true;
                setTimeout(() => this.sendPluginMessages(), 2000);
            }
            else if (parsed[0] === 1 && parsed.length >=5 && parsed[4] === "MiniGame") {
                console.log('✅ Session initialized');
                this.sessionId = parsed[3];
                console.log(`📋 Session ID: ${this.sessionId}`);
            }
            else if (parsed[0] === 7) console.log(`🔄 Plugin ${parsed[2]} response received`);
            else if (parsed[0] === 0) console.log('❤️  Heartbeat received');
        } catch (e) {
            console.log('📥 Raw message:', data.toString());
            console.error('❌ Parse error:', e.message);
        }
    }

    // --- Các phương thức lấy dữ liệu hiện tại ---
    getLatestTxSession() {
        if (!this.latestTxData || !this.latestTxData.htr || this.latestTxData.htr.length === 0)
            return { error: "Không có dữ liệu bàn TX", message: "Chưa nhận được dữ liệu từ server" };
        try {
            const latest = this.latestTxData.htr.reduce((p,c) => c.sid > p.sid ? c : p);
            const tong = latest.d1 + latest.d2 + latest.d3;
            return {
                phien: latest.sid,
                xuc_xac_1: latest.d1, xuc_xac_2: latest.d2, xuc_xac_3: latest.d3,
                tong, ket_qua: tong >= 11 ? "tài" : "xỉu",
                timestamp: new Date().toISOString(), ban: "tai_xiu",
                last_updated: this.lastUpdateTime.tx?.toISOString() || null
            };
        } catch (e) { return { error: "Lỗi xử lý dữ liệu TX", message: e.message }; }
    }

    getLatestMd5Session() {
        if (!this.latestMd5Data || !this.latestMd5Data.htr || this.latestMd5Data.htr.length === 0)
            return { error: "Không có dữ liệu bàn MD5", message: "Chưa nhận được dữ liệu từ server" };
        try {
            const latest = this.latestMd5Data.htr.reduce((p,c) => c.sid > p.sid ? c : p);
            const tong = latest.d1 + latest.d2 + latest.d3;
            return {
                phien: latest.sid,
                xuc_xac_1: latest.d1, xuc_xac_2: latest.d2, xuc_xac_3: latest.d3,
                tong, ket_qua: tong >= 11 ? "tài" : "xỉu",
                timestamp: new Date().toISOString(), ban: "md5",
                last_updated: this.lastUpdateTime.md5?.toISOString() || null
            };
        } catch (e) { return { error: "Lỗi xử lý dữ liệu MD5", message: e.message }; }
    }

    // ==================== PHÂN TÍCH & DỰ ĐOÁN (giống hot789) ====================
    // (copy phần này từ hot789)
    _getRecentResults(historyArray, limit = 50) {
        if (!historyArray || historyArray.length === 0) return [];
        return [...historyArray].sort((a,b) => b.sid - a.sid).slice(0, limit).map(s => (s.d1+s.d2+s.d3 >= 11 ? 'tài' : 'xỉu'));
    }
    _overallProbability(results) {
        if (results.length === 0) return { tai: 0.5, xiu: 0.5 };
        const tai = results.filter(r => r === 'tài').length;
        return { tai: tai/results.length, xiu: (results.length-tai)/results.length };
    }
    _streakAnalysis(results) {
        if (results.length === 0) return { streak:0, outcome:null, probContinue:0.5 };
        let streak = 1, first = results[0];
        for (let i=1; i<results.length; i++) if (results[i] === first) streak++; else break;
        let continueCount = 0, totalStreakEvents = 0;
        for (let i=0; i<results.length-streak; i++) {
            let j=0;
            while (j<streak && i+j<results.length && results[i+j] === first) j++;
            if (j>=streak) {
                totalStreakEvents++;
                if (i+streak<results.length && results[i+streak] === first) continueCount++;
            }
        }
        let prob = totalStreakEvents>0 ? continueCount/totalStreakEvents : 0.5;
        if (isNaN(prob)) prob = 0.5;
        return { streak, outcome: first, probContinue: prob };
    }
    _markov1(results) {
        if (results.length < 2) return { tai:0.5, xiu:0.5 };
        const last = results[0];
        let countSame=0, countDiff=0;
        for (let i=0; i<results.length-1; i++) {
            if (results[i] === last) {
                if (results[i+1] === last) countSame++; else countDiff++;
            }
        }
        const total = countSame+countDiff;
        if (total === 0) return { tai:0.5, xiu:0.5 };
        let r = {
            [last]: countSame/total,
            [last==='tài'?'xỉu':'tài']: countDiff/total
        };
        if (typeof r.tai !== 'number') r.tai = 0.5;
        if (typeof r.xiu !== 'number') r.xiu = 0.5;
        return r;
    }
    _markov2(results) {
        if (results.length < 3) return null;
        const lastTwo = results.slice(0,2).join('-');
        const trans = {};
        for (let i=0; i<results.length-2; i++) {
            const key = results[i]+'-'+results[i+1];
            if (!trans[key]) trans[key] = { tai:0, xiu:0 };
            trans[key][results[i+2]]++;
        }
        if (!trans[lastTwo]) return null;
        const t = trans[lastTwo], total = t.tai + t.xiu;
        if (total === 0) return null;
        return { tai: t.tai/total, xiu: t.xiu/total };
    }
    _patternAnalysis(results) {
        if (results.length < 10) return { prediction:null, confidence:0 };
        const recent = results.slice(0,10);
        if (recent[0] === recent[1]) return { prediction: recent[0], confidence:0.6 };
        else return { prediction: recent[0]==='tài'?'xỉu':'tài', confidence:0.65 };
    }
    predictNext(historyArray) {
        const results = this._getRecentResults(historyArray, 50);
        if (results.length < 5) return { success: false, message: `Chỉ có ${results.length} phiên, cần ít nhất 5 phiên` };
        const overall = this._overallProbability(results);
        const streak = this._streakAnalysis(results);
        let streakProb = streak.probContinue;
        if (isNaN(streakProb)) streakProb = 0.5;
        const markov1 = this._markov1(results);
        let m1t = typeof markov1.tai==='number'?markov1.tai:0.5;
        let m1x = typeof markov1.xiu==='number'?markov1.xiu:0.5;
        const markov2 = this._markov2(results);
        let m2t = markov2?.tai ?? null, m2x = markov2?.xiu ?? null;
        const pattern = this._patternAnalysis(results);
        let patternPred = pattern.prediction, patternConf = pattern.confidence;
        const wOverall = 1.0, wStreak = streak.streak>=3?2.0:1.0, wMarkov1 = 1.5, wMarkov2 = markov2?2.0:0, wPattern = patternConf>0.6?1.2:(patternPred?0.5:0);
        let taiScore = 0, xiuScore = 0, totalWeight = 0;
        taiScore += overall.tai * wOverall; xiuScore += overall.xiu * wOverall; totalWeight += wOverall;
        if (streak.outcome === 'tài') { taiScore += streakProb * wStreak; xiuScore += (1-streakProb) * wStreak; }
        else { xiuScore += streakProb * wStreak; taiScore += (1-streakProb) * wStreak; }
        totalWeight += wStreak;
        taiScore += m1t * wMarkov1; xiuScore += m1x * wMarkov1; totalWeight += wMarkov1;
        if (markov2) { taiScore += m2t * wMarkov2; xiuScore += m2x * wMarkov2; totalWeight += wMarkov2; }
        if (patternPred) {
            if (patternPred === 'tài') { taiScore += patternConf * wPattern; xiuScore += (1-patternConf) * wPattern; }
            else { xiuScore += patternConf * wPattern; taiScore += (1-patternConf) * wPattern; }
            totalWeight += wPattern;
        }
        if (isNaN(taiScore) || isNaN(xiuScore) || isNaN(totalWeight) || totalWeight === 0)
            return { success: false, message: 'Lỗi tính toán dự đoán (NaN)' };
        const finalTai = taiScore / totalWeight, finalXiu = xiuScore / totalWeight;
        let prediction = finalTai > finalXiu ? 'tài' : (finalXiu > finalTai ? 'xỉu' : 'không xác định');
        let confidence = prediction === 'tài' ? finalTai*100 : (prediction==='xỉu' ? finalXiu*100 : 0);
        if (isNaN(confidence)) confidence = 0;
        return {
            success: true, prediction, confidence: Math.round(confidence*10)/10 + '%',
            analysis: {
                totalSessions: results.length,
                recentResults: results.slice(0,15),
                overall, streak: { length: streak.streak, outcome: streak.outcome, probContinue: Math.round(streak.probContinue*100)/100 },
                markov1: { tai: m1t, xiu: m1x },
                markov2: markov2 ? { tai: m2t, xiu: m2x } : null,
                pattern: patternPred ? { prediction: patternPred, confidence: patternConf } : null,
                weightedScores: { tai: Math.round(finalTai*1000)/1000, xiu: Math.round(finalXiu*1000)/1000 }
            }
        };
    }
    getTxPrediction() {
        if (!this.latestTxData || !this.latestTxData.htr || this.latestTxData.htr.length === 0)
            return { error: 'Không có dữ liệu bàn TX', message: 'Chưa nhận được dữ liệu' };
        return this.predictNext(this.latestTxData.htr);
    }
    getMd5Prediction() {
        if (!this.latestMd5Data || !this.latestMd5Data.htr || this.latestMd5Data.htr.length === 0)
            return { error: 'Không có dữ liệu bàn MD5', message: 'Chưa nhận được dữ liệu' };
        return this.predictNext(this.latestMd5Data.htr);
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * this.reconnectAttempts;
            console.log(`🔄 Attempting to reconnect in ${delay}ms (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect(), delay);
        } else console.log('❌ Max reconnection attempts reached');
    }
    startHeartbeat() {
        setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN)
                this.sendRaw([0, this.sessionId || ""]);
        }, 25000);
    }
    close() { if (this.ws) this.ws.close(); }
}

const app = express();
const PORT = 3003;
app.use(cors());
app.use(express.json());

const client = new GameWebSocketClient(
    'wss://api.apixoc88.net/websocket?d=YlcxaGIyZGlhMjQ9fDUzMjd8MTc2NjU1Nzg1NzU2NXw5NGRiMGI5NGM2NjNiODViNWUxMzY3NjkzMjg3NGY3OXwyM2ZlN2IwNGY2MWE0ODA4NTljNWUyY2I4NTI3NGY4Ng=='
);
client.connect();

// API endpoints
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
app.get('/api/predict/tx', (req, res) => res.json({ board: 'tai_xiu', ...client.getTxPrediction(), timestamp: new Date().toISOString() }));
app.get('/api/predict/md5', (req, res) => res.json({ board: 'md5', ...client.getMd5Prediction(), timestamp: new Date().toISOString() }));
app.get('/api/predict/all', (req, res) => res.json({ tai_xiu: client.getTxPrediction(), md5: client.getMd5Prediction(), timestamp: new Date().toISOString() }));

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head><title>XOC88 - Dự đoán Tài Xỉu</title>
            <style>/* giống */</style>
            </head>
            <body><h1>🎲 XOC88 - Dự đoán Tài Xỉu thông minh</h1> ... </body>
        </html>
    `);
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 XOC88 server running at http://localhost:${PORT}`));
setTimeout(() => client.startHeartbeat(), 10000);
process.on('SIGINT', () => { client.close(); process.exit(); });
module.exports = { GameWebSocketClient, app };
