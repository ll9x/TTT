// متغيرات اللعبة
let currentPlayer = 'X';
let gameBoard = ['', '', '', '', '', '', '', '', ''];
let gameActive = true;
let scores = {
    X: 0,
    O: 0,
    tie: 0
};

// أنماط الفوز الممكنة
const winningPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // صفوف
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // أعمدة
    [0, 4, 8], [2, 4, 6] // أقطار
];

// عناصر DOM
const cells = document.querySelectorAll('.cell');
const gameStatus = document.getElementById('game-status');
const currentPlayerDisplay = document.getElementById('current-player-display');
const scoreX = document.getElementById('score-x');
const scoreO = document.getElementById('score-o');
const scoreTie = document.getElementById('score-tie');
const restartBtn = document.getElementById('restart-btn');
const resetScoreBtn = document.getElementById('reset-score-btn');

// تهيئة اللعبة
function initGame() {
    cells.forEach((cell, index) => {
        cell.addEventListener('click', () => handleCellClick(index));
    });
    
    restartBtn.addEventListener('click', restartGame);
    resetScoreBtn.addEventListener('click', resetScores);
    
    updateDisplay();
    loadScores();
}

// التعامل مع النقر على الخلية
function handleCellClick(index) {
    if (gameBoard[index] !== '' || !gameActive) {
        return;
    }
    
    // تحديث اللوحة
    gameBoard[index] = currentPlayer;
    cells[index].textContent = currentPlayer;
    cells[index].classList.add(currentPlayer.toLowerCase());
    
    // إضافة تأثير صوتي بصري
    cells[index].style.transform = 'scale(0.95)';
    setTimeout(() => {
        cells[index].style.transform = 'scale(1)';
    }, 150);
    
    // فحص النتيجة
    if (checkWin()) {
        handleWin();
    } else if (checkTie()) {
        handleTie();
    } else {
        switchPlayer();
    }
}

// فحص الفوز
function checkWin() {
    return winningPatterns.some(pattern => {
        const [a, b, c] = pattern;
        if (gameBoard[a] && gameBoard[a] === gameBoard[b] && gameBoard[a] === gameBoard[c]) {
            // تمييز الخلايا الفائزة
            cells[a].classList.add('winning');
            cells[b].classList.add('winning');
            cells[c].classList.add('winning');
            return true;
        }
        return false;
    });
}

// فحص التعادل
function checkTie() {
    return gameBoard.every(cell => cell !== '');
}

// التعامل مع الفوز
function handleWin() {
    gameActive = false;
    scores[currentPlayer]++;
    gameStatus.textContent = `🎉 اللاعب ${currentPlayer} فاز! 🎉`;
    gameStatus.style.background = currentPlayer === 'X' ? 
        'linear-gradient(145deg, #fed7d7, #feb2b2)' : 
        'linear-gradient(145deg, #bee3f8, #90cdf4)';
    
    updateScoreDisplay();
    saveScores();
    
    // تأثير الاحتفال
    setTimeout(() => {
        confetti();
    }, 500);
}

// التعامل مع التعادل
function handleTie() {
    gameActive = false;
    scores.tie++;
    gameStatus.textContent = '🤝 تعادل! 🤝';
    gameStatus.style.background = 'linear-gradient(145deg, #faf089, #f6e05e)';
    
    updateScoreDisplay();
    saveScores();
}

// تبديل اللاعب
function switchPlayer() {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateDisplay();
}

// تحديث العرض
function updateDisplay() {
    currentPlayerDisplay.textContent = currentPlayer;
    currentPlayerDisplay.style.color = currentPlayer === 'X' ? '#e53e3e' : '#3182ce';
    
    if (gameActive) {
        gameStatus.textContent = `دور اللاعب ${currentPlayer}`;
        gameStatus.style.background = 'rgba(255, 255, 255, 0.95)';
    }
}

// تحديث عرض النقاط
function updateScoreDisplay() {
    scoreX.textContent = scores.X;
    scoreO.textContent = scores.O;
    scoreTie.textContent = scores.tie;
}

// إعادة تشغيل اللعبة
function restartGame() {
    currentPlayer = 'X';
    gameBoard = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('x', 'o', 'winning');
        cell.style.transform = 'scale(1)';
    });
    
    updateDisplay();
    
    // تأثير إعادة التشغيل
    cells.forEach((cell, index) => {
        setTimeout(() => {
            cell.style.transform = 'scale(0.9)';
            setTimeout(() => {
                cell.style.transform = 'scale(1)';
            }, 100);
        }, index * 50);
    });
}

// إعادة تعيين النقاط
function resetScores() {
    scores = { X: 0, O: 0, tie: 0 };
    updateScoreDisplay();
    saveScores();
    
    // تأثير إعادة التعيين
    [scoreX, scoreO, scoreTie].forEach((element, index) => {
        setTimeout(() => {
            element.style.transform = 'scale(1.2)';
            element.style.color = '#e53e3e';
            setTimeout(() => {
                element.style.transform = 'scale(1)';
                element.style.color = '#3182ce';
            }, 200);
        }, index * 100);
    });
}

// حفظ النقاط في التخزين المحلي
function saveScores() {
    localStorage.setItem('ticTacToeScores', JSON.stringify(scores));
}

// تحميل النقاط من التخزين المحلي
function loadScores() {
    const savedScores = localStorage.getItem('ticTacToeScores');
    if (savedScores) {
        scores = JSON.parse(savedScores);
        updateScoreDisplay();
    }
}

// تأثير الاحتفال (مبسط)
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

// إضافة تأثيرات لوحة المفاتيح
document.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        handleCellClick(index);
    } else if (e.key === 'r' || e.key === 'R') {
        restartGame();
    }
});

// تهيئة اللعبة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initGame);

// إضافة تأثيرات الماوس
cells.forEach(cell => {
    cell.addEventListener('mouseenter', function() {
        if (this.textContent === '' && gameActive) {
            this.style.background = currentPlayer === 'X' ? 
                'linear-gradient(145deg, #fed7d7, #feb2b2)' : 
                'linear-gradient(145deg, #bee3f8, #90cdf4)';
            this.textContent = currentPlayer;
            this.style.opacity = '0.5';
        }
    });
    
    cell.addEventListener('mouseleave', function() {
        if (this.style.opacity === '0.5') {
            this.style.background = 'linear-gradient(145deg, #f7fafc, #edf2f7)';
            this.textContent = '';
            this.style.opacity = '1';
        }
    });
});
