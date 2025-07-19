// متغيرات اللعبة
let socket;
let playerName = '';
let playerSymbol = '';
let roomId = '';
let gameState = null;

// عناصر DOM
const joinScreen = document.getElementById('join-screen');
const waitingScreen = document.getElementById('waiting-screen');
const gameScreen = document.getElementById('game-screen');
const disconnectScreen = document.getElementById('disconnect-screen');

const playerNameInput = document.getElementById('player-name');
const joinBtn = document.getElementById('join-btn');
const roomIdDisplay = document.getElementById('room-id');
const copyLinkBtn = document.getElementById('copy-link-btn');

const cells = document.querySelectorAll('.cell');
const gameStatus = document.getElementById('game-status');
const currentPlayerDisplay = document.getElementById('current-player-display');
const playerXCard = document.getElementById('player-x-card');
const playerOCard = document.getElementById('player-o-card');
const playerXName = document.getElementById('player-x-name');
const playerOName = document.getElementById('player-o-name');
const scoreX = document.getElementById('score-x');
const scoreO = document.getElementById('score-o');
const scoreTie = document.getElementById('score-tie');
const restartBtn = document.getElementById('restart-btn');
const resetScoreBtn = document.getElementById('reset-score-btn');

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat');
const toggleChatBtn = document.getElementById('toggle-chat');
const chatContainer = document.getElementById('chat-container');

const disconnectMessage = document.getElementById('disconnect-message');
const returnHomeBtn = document.getElementById('return-home-btn');

// تهيئة التطبيق
function initApp() {
    // إعداد Socket.IO
    socket = io();
    
    // أحداث الانضمام
    joinBtn.addEventListener('click', joinGame);
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });
    
    // أحداث اللعبة
    cells.forEach((cell, index) => {
        cell.addEventListener('click', () => makeMove(index));
    });
    
    restartBtn.addEventListener('click', () => {
        socket.emit('restartGame');
    });
    
    resetScoreBtn.addEventListener('click', () => {
        socket.emit('resetScores');
    });
    
    // أحداث الدردشة
    sendChatBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
    
    toggleChatBtn.addEventListener('click', () => {
        chatContainer.style.display = chatContainer.style.display === 'none' ? 'block' : 'none';
    });
    
    // أحداث أخرى
    copyLinkBtn.addEventListener('click', copyGameLink);
    returnHomeBtn.addEventListener('click', returnToHome);
    
    // إعداد أحداث Socket
    setupSocketEvents();
}

// الانضمام للعبة
function joinGame() {
    const name = playerNameInput.value.trim();
    if (!name) {
        alert('يرجى إدخال اسمك');
        return;
    }
    
    if (name.length > 20) {
        alert('الاسم طويل جداً (الحد الأقصى 20 حرف)');
        return;
    }
    
    playerName = name;
    socket.emit('joinGame', playerName);
    showScreen('waiting');
}

// إعداد أحداث Socket
function setupSocketEvents() {
    // انضمام ناجح للعبة
    socket.on('gameJoined', (data) => {
        roomId = data.roomId;
        playerSymbol = data.playerSymbol;
        gameState = data.gameState;
        
        roomIdDisplay.textContent = roomId;
        updateGameDisplay();
    });
    
    // في انتظار لاعب
    socket.on('waitingForPlayer', () => {
        showScreen('waiting');
    });
    
    // بداية اللعبة
    socket.on('gameStart', (data) => {
        gameState = data;
        updateGameDisplay();
        showScreen('game');
        addChatMessage('النظام', 'اللعبة بدأت! حظاً موفقاً! 🎮', true);
    });
    
    // تحديث اللعبة
    socket.on('gameUpdate', (data) => {
        updateBoard(data.board);
        updateScores(data.scores);
        
        if (data.type === 'win') {
            handleGameEnd(`🎉 اللاعب ${data.player} فاز! 🎉`, data.player);
            highlightWinningCells(data.board);
        } else if (data.type === 'tie') {
            handleGameEnd('🤝 تعادل! 🤝', null);
        } else {
            gameState.currentPlayer = data.nextPlayer;
            updateCurrentPlayer();
            gameStatus.textContent = `دور اللاعب ${data.nextPlayer}`;
            gameStatus.style.background = 'rgba(255, 255, 255, 0.95)';
        }
        
        // تأثير الحركة
        const cell = cells[data.cellIndex];
        cell.style.transform = 'scale(0.95)';
        setTimeout(() => {
            cell.style.transform = 'scale(1)';
        }, 150);
    });
    
    // إعادة تشغيل اللعبة
    socket.on('gameRestart', (data) => {
        gameState = data;
        resetBoard();
        updateGameDisplay();
        addChatMessage('النظام', 'بدأت لعبة جديدة! 🔄', true);
    });
    
    // إعادة تعيين النقاط
    socket.on('scoresReset', (scores) => {
        updateScores(scores);
        addChatMessage('النظام', 'تم إعادة تعيين النقاط! 🗑️', true);
    });
    
    // رسالة دردشة
    socket.on('chatMessage', (data) => {
        addChatMessage(data.player, data.message, false, data.timestamp);
    });
    
    // قطع اتصال لاعب
    socket.on('playerDisconnected', (data) => {
        disconnectMessage.textContent = data.message;
        showScreen('disconnect');
    });
    
    // الغرفة ممتلئة
    socket.on('roomFull', () => {
        alert('الغرفة ممتلئة! جرب مرة أخرى.');
        showScreen('join');
    });
    
    // خطأ في الاتصال
    socket.on('connect_error', () => {
        alert('خطأ في الاتصال بالخادم');
        showScreen('join');
    });
    
    socket.on('disconnect', () => {
        disconnectMessage.textContent = 'انقطع الاتصال بالخادم';
        showScreen('disconnect');
    });
}

// تنفيذ حركة
function makeMove(cellIndex) {
    if (!gameState || !gameState.gameActive || gameState.currentPlayer !== playerSymbol) {
        return;
    }
    
    const cell = cells[cellIndex];
    if (cell.textContent !== '') {
        return;
    }
    
    socket.emit('makeMove', cellIndex);
}

// تحديث عرض اللعبة
function updateGameDisplay() {
    if (!gameState) return;
    
    // تحديث أسماء اللاعبين
    const players = gameState.players;
    if (players.length >= 2) {
        const playerX = players.find(p => p.symbol === 'X');
        const playerO = players.find(p => p.symbol === 'O');
        
        if (playerX) playerXName.textContent = playerX.name;
        if (playerO) playerOName.textContent = playerO.name;
    }
    
    // تحديث اللوحة والنقاط
    updateBoard(gameState.board);
    updateScores(gameState.scores);
    updateCurrentPlayer();
}

// تحديث اللوحة
function updateBoard(board) {
    cells.forEach((cell, index) => {
        const value = board[index];
        cell.textContent = value;
        cell.className = 'cell';
        
        if (value === 'X') {
            cell.classList.add('x');
        } else if (value === 'O') {
            cell.classList.add('o');
        }
        
        // تعطيل الخلايا إذا لم يكن دور اللاعب
        if (!gameState || gameState.currentPlayer !== playerSymbol || !gameState.gameActive) {
            cell.classList.add('disabled');
        }
    });
}

// إعادة تعيين اللوحة
function resetBoard() {
    cells.forEach(cell => {
        cell.textContent = '';
        cell.className = 'cell';
    });
    
    gameStatus.textContent = 'ابدأ اللعب! اللاعب X يبدأ أولاً';
    gameStatus.style.background = 'rgba(255, 255, 255, 0.95)';
}

// تحديث النقاط
function updateScores(scores) {
    scoreX.textContent = scores.X;
    scoreO.textContent = scores.O;
    scoreTie.textContent = scores.tie;
}

// تحديث اللاعب الحالي
function updateCurrentPlayer() {
    if (!gameState) return;
    
    currentPlayerDisplay.textContent = gameState.currentPlayer;
    currentPlayerDisplay.style.color = gameState.currentPlayer === 'X' ? '#e53e3e' : '#3182ce';
    
    // تمييز بطاقة اللاعب النشط
    playerXCard.classList.toggle('active', gameState.currentPlayer === 'X');
    playerOCard.classList.toggle('active', gameState.currentPlayer === 'O');
}

// التعامل مع نهاية اللعبة
function handleGameEnd(message, winner) {
    gameStatus.textContent = message;
    
    if (winner) {
        gameStatus.style.background = winner === 'X' ? 
            'linear-gradient(145deg, #fed7d7, #feb2b2)' : 
            'linear-gradient(145deg, #bee3f8, #90cdf4)';
        
        // تأثير الاحتفال
        if (winner === playerSymbol) {
            setTimeout(() => confetti(), 500);
        }
    } else {
        gameStatus.style.background = 'linear-gradient(145deg, #faf089, #f6e05e)';
    }
}

// تمييز الخلايا الفائزة
function highlightWinningCells(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    winPatterns.forEach(pattern => {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            cells[a].classList.add('winning');
            cells[b].classList.add('winning');
            cells[c].classList.add('winning');
        }
    });
}

// إرسال رسالة دردشة
function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    if (message.length > 100) {
        alert('الرسالة طويلة جداً (الحد الأقصى 100 حرف)');
        return;
    }
    
    socket.emit('chatMessage', message);
    chatInput.value = '';
}

// إضافة رسالة للدردشة
function addChatMessage(sender, message, isSystem = false, timestamp = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    if (isSystem) {
        messageDiv.innerHTML = `
            <div class="sender">🤖 ${sender}</div>
            <div class="content">${message}</div>
        `;
        messageDiv.style.background = 'linear-gradient(145deg, #e6fffa, #b2f5ea)';
    } else {
        messageDiv.innerHTML = `
            <div class="sender">${sender}</div>
            <div class="content">${message}</div>
            ${timestamp ? `<div class="timestamp">${timestamp}</div>` : ''}
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// نسخ رابط اللعبة
function copyGameLink() {
    const gameLink = `${window.location.origin}?room=${roomId}`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(gameLink).then(() => {
            copyLinkBtn.textContent = '✅ تم النسخ!';
            setTimeout(() => {
                copyLinkBtn.textContent = '📋 نسخ الرابط';
            }, 2000);
        });
    } else {
        // fallback للمتصفحات القديمة
        const textArea = document.createElement('textarea');
        textArea.value = gameLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        copyLinkBtn.textContent = '✅ تم النسخ!';
        setTimeout(() => {
            copyLinkBtn.textContent = '📋 نسخ الرابط';
        }, 2000);
    }
}

// العودة للرئيسية
function returnToHome() {
    if (socket) {
        socket.disconnect();
    }
    
    // إعادة تعيين المتغيرات
    playerName = '';
    playerSymbol = '';
    roomId = '';
    gameState = null;
    
    // مسح النموذج
    playerNameInput.value = '';
    chatMessages.innerHTML = '';
    
    showScreen('join');
    
    // إعادة الاتصال
    socket = io();
    setupSocketEvents();
}

// عرض شاشة معينة
function showScreen(screenName) {
    const screens = ['join', 'waiting', 'game', 'disconnect'];
    
    screens.forEach(screen => {
        const element = document.getElementById(`${screen}-screen`);
        if (screen === screenName) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });
}

// تأثير الاحتفال
function confetti() {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confettiPiece = document.createElement('div');
            confettiPiece.style.position = 'fixed';
            confettiPiece.style.width = '10px';
            confettiPiece.style.height = '10px';
            confettiPiece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confettiPiece.style.left = Math.random() * window.innerWidth + 'px';
            confettiPiece.style.top = '-10px';
            confettiPiece.style.borderRadius = '50%';
            confettiPiece.style.pointerEvents = 'none';
            confettiPiece.style.zIndex = '1000';
            
            document.body.appendChild(confettiPiece);
            
            const animation = confettiPiece.animate([
                { transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
                { transform: `translateY(${window.innerHeight + 100}px) rotate(720deg)`, opacity: 0 }
            ], {
                duration: 3000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
            
            animation.onfinish = () => {
                document.body.removeChild(confettiPiece);
            };
        }, i * 50);
    }
}

// إضافة دعم لوحة المفاتيح
document.addEventListener('keydown', (e) => {
    if (gameScreen.classList.contains('hidden')) return;
    
    if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        makeMove(index);
    } else if (e.key === 'r' || e.key === 'R') {
        socket.emit('restartGame');
    }
});

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initApp);

// التعامل مع إغلاق النافذة
window.addEventListener('beforeunload', () => {
    if (socket) {
        socket.disconnect();
    }
});
