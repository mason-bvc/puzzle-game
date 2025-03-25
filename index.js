'use strict';

/**
 * @param {number} v0
 * @param {number} v1
 * @param {number} t
 * @returns {number}
 */
function lerp(v0, v1, t) {
	return (1 - t) * v0 + t * v1;
}

/**
 * @returns {Array.<number>}
 */
function newVector2() {
	return new Float32Array(2).fill(0);
}

/**
 * @param {Array.<number>} v
 * @returns {void}
 */
function normalize2(v) {
	let x = v[0];
	let y = v[1];
	let l = x * x + y * y;

	if (l != 0) {
		l = Math.sqrt(l);
		x /= l;
		y /= l;
	}

	v[0] = x;
	v[1] = y;
}

/**
 * @param {Float32Array} v
 * @param {number} factor
 * @returns {void}
 */
function scale2(v, factor) {
	v[0] *= factor;
	v[1] *= factor;
}

/**
 * @param {Float32Array} v1
 * @param {Float32Array} v2
 * @returns {void}
 */
function multiply2(v1, v2) {
	v1[0] *= v2[0];
	v1[1] *= v2[1];
}

const keys = {};

/** @param {string} key  */
function isKeyDown(key) {
	return key in keys && keys[key];
}

//
// why i don't use es3/5 prototypes or es6 classes: i want full control over/the ability to not have polymorphism.
// i find that when developing a game, i often don't even need language-level descriptions of polymorphic types--
// and if i did, i would want full control over the dynamic dispatch mechanisms anyhow since object structure and
// relationships should be tailored to the application, not the other way around. in the end, i accord harmoniously
// with the "Principle of Least Astonishment".
//

/**
 * @typedef {Object} Entity
 * @property {Float32Array} lastPos
 * @property {Float32Array} pos
 */

/** @returns {Entity} */
function newEntity() {
	return {
		lastPos: newVector2(),
		pos: newVector2(),
	}
}

/**
 * @typedef {Object} Player
 * @property {Float32Array} lastPos
 * @property {Float32Array} pos
 * @property {Float32Array} move
 */

/** @returns {Player} */
function newPlayer() {
	let p = newEntity();
	p.move = newVector2();
	p.isOnWinningTile = false;
	return p;
}

const TICK_RATE_DENOMINATOR = 30;
const TICK_RATE_SEC = 1 / TICK_RATE_DENOMINATOR;
const MAX_FRAME_SKIP = TICK_RATE_DENOMINATOR;

const MAPS = [
	Uint8Array.from([
		0,0,0,0,0,0,0,0,0,0,
		0,0,0,0,0,0,0,0,0,0,
		0,1,0,0,0,0,2,0,0,0,
		0,1,0,0,0,0,1,0,0,0,
		0,1,1,1,1,1,1,1,0,0,
		0,1,1,1,1,1,1,1,0,0,
		0,1,1,1,1,1,1,1,2,0,
		0,1,1,1,0,0,1,0,0,0,
		0,1,1,0,0,0,0,0,0,0,
		0,0,0,0,0,0,0,0,0,0,
	]),
	Uint8Array.from([
		0,0,0,0,0,0,0,0,0,0,
		0,0,0,0,0,0,0,0,0,0,
		0,1,0,0,0,0,0,0,0,0,
		0,1,0,1,0,1,0,2,0,0,
		0,1,1,1,1,1,1,1,0,0,
		0,1,0,1,0,1,0,1,0,0,
		0,1,1,0,1,1,1,1,2,0,
		0,1,1,1,1,0,1,0,0,0,
		0,1,1,0,0,0,0,0,0,0,
		0,0,0,0,0,0,0,0,0,0,
	]),
	Uint8Array.from([
		0,0,0,0,0,0,0,0,0,0,
		0,1,1,1,1,1,1,1,1,0,
		0,1,0,0,0,0,0,0,0,0,
		0,1,1,0,0,0,0,0,0,0,
		0,1,1,1,1,1,1,2,0,0,
		0,1,1,1,1,1,1,1,0,0,
		0,1,1,1,1,1,0,0,0,0,
		0,1,1,0,1,1,1,0,0,0,
		0,1,1,1,1,0,1,2,0,0,
		0,0,0,0,0,0,0,0,0,0,
	]),
];

const MAP_PITCH = 10;

let currentMapIndex = 0;
let player1 = newPlayer();
let player2 = newPlayer();
let gameWon = false;

player1.pos[0] += 1;
player1.pos[1] += 3;
player2.pos[0] += 1;
player2.pos[1] += 6;

/**
 *  @param {number} deltaSec
 *  @param {Player} player
 */
function movePlayer(deltaSec, player, speed, scaleFactorX = 1, scaleFactorY = 1) {
	player.lastPos.set(player.pos);

	let playerNewX = player.pos[0];
	let playerNewY = player.pos[1];

	player.move[0] = isKeyDown('ArrowRight') - isKeyDown('ArrowLeft');
	player.move[1] = isKeyDown('ArrowDown') - isKeyDown('ArrowUp');
	normalize2(player.move);
	scale2(player.move, speed);
	player.move[0] *= scaleFactorX;
	player.move[1] *= scaleFactorY;
	player.move[0] *= deltaSec;
	player.move[1] *= deltaSec;
	playerNewX += player.move[0];
	playerNewY += player.move[1];

	if (scaleFactorY > 0) {
		if (playerNewY > 4.5) {
			playerNewY = 4.5;
		}
	} else if (scaleFactorY < 0) {
		if (playerNewY < 5.5) {
			playerNewY = 5.5;
		}
	}

	let tile = 0;

	if (player.move[0] > 0) {
		tile = MAPS[currentMapIndex][Math.floor(player.pos[1]) * MAP_PITCH + Math.ceil(playerNewX)];

		if (tile == 0) {
			playerNewX = Math.floor(playerNewX);
		}
	} else if (player.move[0] < 0) {
		tile = MAPS[currentMapIndex][Math.floor(player.pos[1]) * MAP_PITCH + Math.floor(playerNewX)];

		if (tile == 0) {
			playerNewX = Math.ceil(playerNewX);
		}
	}

	if (player.move[1] > 0) {
		tile = MAPS[currentMapIndex][Math.ceil(playerNewY) * MAP_PITCH + Math.floor(playerNewX)];

		if (tile == 0) {
			playerNewY = Math.floor(playerNewY);
		}
	} else if (player.move[1] < 0) {
		tile = MAPS[currentMapIndex][Math.floor(player.pos[1]-0.25) * MAP_PITCH + Math.floor(playerNewX)];

		if (tile == 0) {
			playerNewY = Math.ceil(playerNewY);
		}
	}

	player.pos[0] = playerNewX;
	player.pos[1] = playerNewY;
	player.isOnWinningTile = MAPS[currentMapIndex][Math.round(player.pos[1] * MAP_PITCH + Math.round(player.pos[0]))] == 2;
}

/** @param {number} deltaSec  */
function tick(deltaSec) {
	movePlayer(deltaSec, player1, 10);
	movePlayer(deltaSec, player2, 10, 1, -1);

	if (player1.isOnWinningTile && player2.isOnWinningTile) {
		currentMapIndex += 1;
		gameWon = currentMapIndex >= MAPS.length;
		currentMapIndex = Math.min(currentMapIndex, MAPS.length - 1);

		player1.pos[0] = 1;
		player1.pos[1] = 3;
		player2.pos[0] = 1;
		player2.pos[1] = 6;
	}
}

function main() {
	document.addEventListener('keydown', e => {
		keys[e.key] = true;
	});

	document.addEventListener('keyup', e => {
		keys[e.key] = false;
	});

	/** @type {HTMLCanvasElement} */
	const canvas = document.getElementById('the-canvas');

	if (!canvas) {
		console.error('could not get canvas');
		return;
	}

	/** @type {CanvasRenderingContext2D} */
	const ctx = canvas.getContext('2d');

	if (!ctx) {
		console.error('could not get canvas context');
		return;
	}

	ctx.imageSmoothingEnabled = false;

	let previous = Date.now() / 1000;
	let lag = 0;

	let animationFrameCallback = () => {
		let current = Date.now() / 1000;
		let elapsed = current - previous;

		previous = current;
		lag += elapsed;
		lag = Math.min(lag, TICK_RATE_SEC, MAX_FRAME_SKIP)

		while (lag >= TICK_RATE_SEC) {
			tick(TICK_RATE_SEC);
			lag -= TICK_RATE_SEC;
		}

		const alpha = lag / TICK_RATE_SEC;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		if (gameWon) {
			ctx.strokeText("yay you won yayyyy", 0, 12, 320);
			return;
		}

		for (let i = 0; i < MAPS[currentMapIndex].length; i++) {
			if (MAPS[currentMapIndex][i] == 0) {
				continue;
			}

			let x = (i % MAP_PITCH) | 0;
			let y = (i / MAP_PITCH) | 0;

			x *= 16;
			y *= 16;
			y += 48;

			let fillStyle = 'rgb(64, 64, 64)';

			if (MAPS[currentMapIndex][i] == 2) {
				fillStyle = 'rgb(0, 128, 0)';
			}

			ctx.fillStyle = fillStyle;
			ctx.fillRect(x - 8, y - 8, 16, 16);
		}

		let player1LerpedX = lerp(player1.lastPos[0], player1.pos[0], alpha);
		let player1LerpedY = lerp(player1.lastPos[1], player1.pos[1], alpha);

		let player2LerpedX = lerp(player2.lastPos[0], player2.pos[0], alpha);
		let player2LerpedY = lerp(player2.lastPos[1], player2.pos[1], alpha);

		let player1ProjectedX = player1LerpedX;
		let player1ProjectedY = player1LerpedY;

		let player2ProjectedX = player2LerpedX;
		let player2ProjectedY = player2LerpedY;

		//
		// integer coords otherwise we'll end up with AA
		//

		player1ProjectedX *= 16;
		player1ProjectedY *= 16;

		// camera coords
		// player1ProjectedX += 0;
		// player1ProjectedY += 120 - 8;
		player1ProjectedY += 48;

		player2ProjectedX *= 16;
		player2ProjectedY *= 16;
		player2ProjectedY += 48;

		// camera coords
		// player2ProjectedX += 0;
		// player2ProjectedY += 120 + 8;

		player1ProjectedX |= 0;
		player1ProjectedY |= 0;

		player2ProjectedX |= 0;
		player2ProjectedY |= 0;


		ctx.strokeStyle = 'rgb(128, 128, 128)';
		ctx.beginPath();
		ctx.moveTo(0, 120 + 8);
		ctx.lineTo(320, 120 + 8);
		ctx.stroke();

		ctx.fillStyle = 'red';
		ctx.fillRect(player1ProjectedX - 8, player1ProjectedY - 8, 16, 16);

		ctx.fillStyle = 'blue';
		ctx.fillRect(player2ProjectedX - 8, player2ProjectedY - 8, 16, 16);

		ctx.strokeText('arrow keys: move', 0, 12, 320);
		ctx.strokeText('get both to green', 0, 24, 320);
		ctx.strokeText(`level: ${currentMapIndex+1}`, 0, 36, 320);

		requestAnimationFrame(animationFrameCallback);
	};

	animationFrameCallback();
}

if (document.readyState != 'loading') {
	main();
} else {
	document.addEventListener('DOMContentLoaded', main);
}
