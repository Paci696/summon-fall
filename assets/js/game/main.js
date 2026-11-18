import { Game } from './Game.js';

const canvas = document.getElementById('game');
const errorBox = document.getElementById('error');
const game = new Game(canvas, window.GAME_CONFIG);

game.start().catch((err) => {
    console.error(err);
    errorBox.textContent = 'Could not start the game: ' + err.message;
    errorBox.hidden = false;
});