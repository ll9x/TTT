const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// إعداد الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// صفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// متغيرات اللعبة
let rooms = new Map();
let waitingPlayers = [];

class GameRoom {
    constructor(roomId) {
        this.id = roomId;
        this.players = [];
        this.gameBoard = ['', '', '', '', '', '', '', '', ''];
        this.currentPlayer = 'X';
        this.gameActive = true;
        this.scores = { X: 0, O: 0, tie: 0 };
    }

    addPlayer(socket, playerName) {
        if (this.players.length < 2) {
            const playerSymbol = this.players.length === 0 ? 'X' : 'O';
            const player = {
                socket: socket,
                name: playerName,
                symbol: playerSymbol,
                id: socket.id
            };
            this.players.push(player);
            socket.join(this.id);
            return player;
        }
        return null;
    }

    removePlayer(socketId) {
        this.players = this.players.filter(player => player.id !== socketId);
        if (this.players.length === 0) {
            rooms.delete(this.id);
        }
    }

    makeMove(socketId, cellIndex) {
        const player = this.players.find(p => p.id === socketId);
        if (!player || !this.gameActive || this.gameBoard[cellIndex] !== '' || 
            player.symbol !== this.currentPlayer) {
            return false;
        }

        this.gameBoard[cellIndex] = this.currentPlayer;
        
        if (this.checkWin()) {
            this.gameActive = false;
            this.scores[this.currentPlayer]++;
            return { type: 'win', winner: this.currentPlayer, board: this.gameBoard };
        } else if (this.checkTie()) {
            this.gameActive = false;
            this.scores.tie++;
            return { type: 'tie', board: this.gameBoard };
        } else {
            this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
            return { type: 'move', board: this.gameBoard, nextPlayer: this.currentPlayer };
        }
    }

    checkWin() {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];

        return winPatterns.some(pattern => {
            const [a, b, c] = pattern;
            return this.gameBoard[a] && 
                   this.gameBoard[a] === this.gameBoard[b] && 
                   this.gameBoard[a] === this.gameBoard[c];
        });
    }

    checkTie() {
        return this.gameBoard.every(cell => cell !== '');
    }

    resetGame() {
        this.gameBoard = ['', '', '', '', '', '', '', '', ''];
        this.currentPlayer = 'X';
        this.gameActive = true;
    }

    getGameState() {
        return {
            board: this.gameBoard,
            currentPlayer: this.currentPlayer,
            gameActive: this.gameActive,
            scores: this.scores,
            players: this.players.map(p => ({ name: p.name, symbol: p.symbol }))
        };
    }
}

// إدارة الاتصالات
io.on('connection', (socket) => {
    console.log(`لاعب جديد متصل: ${socket.id}`);

    // انضمام لاعب جديد
    socket.on('joinGame', (playerName) => {
        console.log(`${playerName} يريد الانضمام للعبة`);

        // البحث عن غرفة متاحة أو إنشاء واحدة جديدة
        let room = null;
        
        // البحث عن غرفة بها لاعب واحد فقط
        for (let [roomId, gameRoom] of rooms) {
            if (gameRoom.players.length === 1) {
                room = gameRoom;
                break;
            }
        }

        // إنشاء غرفة جديدة إذا لم توجد غرفة متاحة
        if (!room) {
            const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            room = new GameRoom(roomId);
            rooms.set(roomId, room);
        }

        // إضافة اللاعب للغرفة
        const player = room.addPlayer(socket, playerName);
        if (player) {
            socket.roomId = room.id;
            socket.playerSymbol = player.symbol;
            socket.playerName = playerName;

            // إرسال معلومات اللعبة للاعب الجديد
            socket.emit('gameJoined', {
                roomId: room.id,
                playerSymbol: player.symbol,
                gameState: room.getGameState()
            });

            // إذا أصبح لدينا لاعبان، ابدأ اللعبة
            if (room.players.length === 2) {
                io.to(room.id).emit('gameStart', room.getGameState());
                console.log(`اللعبة بدأت في الغرفة: ${room.id}`);
            } else {
                socket.emit('waitingForPlayer');
            }
        } else {
            socket.emit('roomFull');
        }
    });

    // تنفيذ حركة
    socket.on('makeMove', (cellIndex) => {
        const room = rooms.get(socket.roomId);
        if (!room) return;

        const result = room.makeMove(socket.id, cellIndex);
        if (result) {
            io.to(room.id).emit('gameUpdate', {
                ...result,
                scores: room.scores,
                cellIndex: cellIndex,
                player: socket.playerSymbol
            });
        }
    });

    // إعادة تشغيل اللعبة
    socket.on('restartGame', () => {
        const room = rooms.get(socket.roomId);
        if (room && room.players.length === 2) {
            room.resetGame();
            io.to(room.id).emit('gameRestart', room.getGameState());
        }
    });

    // إعادة تعيين النقاط
    socket.on('resetScores', () => {
        const room = rooms.get(socket.roomId);
        if (room) {
            room.scores = { X: 0, O: 0, tie: 0 };
            io.to(room.id).emit('scoresReset', room.scores);
        }
    });

    // رسائل الدردشة
    socket.on('chatMessage', (message) => {
        const room = rooms.get(socket.roomId);
        if (room) {
            io.to(room.id).emit('chatMessage', {
                player: socket.playerName,
                message: message,
                timestamp: new Date().toLocaleTimeString('ar-SA')
            });
        }
    });

    // قطع الاتصال
    socket.on('disconnect', () => {
        console.log(`لاعب قطع الاتصال: ${socket.id}`);
        
        const room = rooms.get(socket.roomId);
        if (room) {
            room.removePlayer(socket.id);
            
            // إخبار اللاعب الآخر بقطع الاتصال
            socket.to(room.id).emit('playerDisconnected', {
                message: `${socket.playerName} قطع الاتصال`
            });
            
            // إذا لم يبق أي لاعبين، احذف الغرفة
            if (room.players.length === 0) {
                rooms.delete(socket.roomId);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`الخادم يعمل على المنفذ ${PORT}`);
    console.log(`افتح المتصفح على: http://localhost:${PORT}`);
});
