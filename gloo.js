// web port of gloo interface

(() => {

function run(gconf) {

	const DEF_WIDTH = 640;
	const DEF_HEIGHT = 480;

	let canvas = gconf.canvas;

	if (!canvas) {
		canvas = document.createElement("canvas");
		const root = gconf.root || document.body;
		root.appendChild(canvas);
	}

	if (gconf.fullscreen) {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	} else {
		canvas.width = gconf.width || DEF_WIDTH;
		canvas.height = gconf.height || DEF_HEIGHT;
	}

	const styles = [
		"outline: none",
	];

	if (gconf.crisp) {
		styles.push("image-rendering: pixelated");
		styles.push("image-rendering: crisp-edges");
	}

	canvas.style = styles.join(";");
	canvas.setAttribute("tabindex", "0");

	const gl = canvas.getContext("webgl", gconf.glConf || {
		antialias: true,
		depth: true,
		stencil: true,
		alpha: true,
		preserveDrawingBuffer: true,
	});

	const isTouch = ("ontouchstart" in window)
		|| (navigator.maxTouchPoints > 0)
		|| (navigator.msMaxTouchPoints > 0);

	const ctx = {
		audioCtx: null,
		startTime: 0,
		time: 0,
		dt: 0,
		mouseX: 0,
		mouseY: 0,
		mouseState: "idle",
		keyStates: {},
		charInputted: [],
		skipTime: false,
		loopID: null,
	};

	const keyMap = {
		"ArrowLeft": "left",
		"ArrowRight": "right",
		"ArrowUp": "up",
		"ArrowDown": "down",
		"Escape": "esc",
		" ": "space",
	};

	const preventDefaultKeys = [
		"space",
		"left",
		"right",
		"up",
		"down",
		"tab",
	];

	canvas.addEventListener("mousemove", (e) => {
		ctx.mouseX = e.offsetX;
		ctx.mouseY = e.offsetY;
	});

	canvas.addEventListener("mousedown", (e) => {
		ctx.mouseState = "pressed";
	});

	canvas.addEventListener("mouseup", (e) => {
		ctx.mouseState = "released";
	});

	canvas.addEventListener("touchstart", (e) => {
		const t = e.touches[0];
		ctx.mouseX = t.clientX;
		ctx.mouseY = t.clientY;
		ctx.mouseState = "pressed";
	});

	canvas.addEventListener("touchmove", (e) => {
		const t = e.touches[0];
		ctx.mouseX = t.clientX;
		ctx.mouseY = t.clientY;
	});

	canvas.addEventListener("keydown", (e) => {

		const k = keyMap[e.key] || e.key.toLowerCase();

		if (preventDefaultKeys.includes(k)) {
			e.preventDefault();
		}

		if (k.length === 1) {
			ctx.charInputted.push(k);
		}

		if (k === "space") {
			ctx.charInputted.push(" ");
		}

		if (e.repeat) {
			ctx.keyStates[k] = "rpressed";
		} else {
			ctx.keyStates[k] = "pressed";
		}

	});

	canvas.addEventListener("keyup", (e) => {
		const k = keyMap[e.key] || e.key.toLowerCase();
		ctx.keyStates[k] = "released";
	});

	canvas.focus();

	document.addEventListener("visibilitychange", (e) => {
		switch (document.visibilityState) {
			case "visible":
				ctx.skipTime = true;
	// 			audioCtx.resume();
				break;
			case "hidden":
	// 			audioCtx.suspend();
				break;
		}
	});

	ctx.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

	function processBtnState(s) {
		if (s === "pressed" || s === "rpressed") {
			return "down";
		}
		if (s === "released") {
			return "up";
		}
		return s;
	}

	function keyDown(k) {
		return ctx.keyStates[k] === "pressed"
			|| ctx.keyStates[k] === "rpressed"
			|| ctx.keyStates[k] === "down";
	}

	function mousePressed() {
		return ctx.mouseState === "pressed";
	}

	function mouseDown() {
		return ctx.mouseState === "pressed" || ctx.mouseState === "down";
	}

	function mouseReleased() {
		return ctx.mouseState === "released";
	}

	function keyPressed(k) {
		return ctx.keyStates[k] === "pressed";
	}

	function keyPressedRep(k) {
		return ctx.keyStates[k] === "pressed" || ctx.keyStates[k] === "rpressed";
	}

	function keyDown(k) {
		return ctx.keyStates[k] === "pressed"
			|| ctx.keyStates[k] === "rpressed"
			|| ctx.keyStates[k] === "down";
	}

	function keyReleased(k) {
		return ctx.keyStates[k] === "released";
	}

	function time() {
		return ctx.time;
	}

	function dt() {
		return ctx.dt;
	}

	function mouseX() {
		return ctx.mouseX;
	}

	function mouseY() {
		return ctx.mouseY;
	}

	function charInputted() {
		return [...ctx.charInputted];
	}

	function quit() {
		window.cancelAnimationFrame(ctx.loopID);
	}

	function update(t) {

		if (!ctx.startTime) {
			ctx.startTime = t;
		}

		if (ctx.skipTime) {
			ctx.startTime = t - ctx.time * 1000;
			ctx.skipTime = false;
		}

		ctx.dt = (t - ctx.startTime) / 1000 - ctx.time;
		ctx.time += ctx.dt;

		if (gconf.frame) {
			gconf.frame(g);
		}

		for (const k in ctx.keyStates) {
			ctx.keyStates[k] = processBtnState(ctx.keyStates[k]);
		}

		ctx.mouseState = processBtnState(ctx.mouseState);
		ctx.charInputted = [];

		ctx.loopID = window.requestAnimationFrame(update);

	}

	ctx.loopID = window.requestAnimationFrame(update);

	const g = {
		gl,
		keyPressed,
		keyPressedRep,
		keyDown,
		keyReleased,
		mousePressed,
		mouseDown,
		mouseReleased,
		time,
		dt,
		mouseX,
		mouseY,
		charInputted,
		quit,
	};

	if (gconf.init) {
		gconf.init(g);
	}

	return g;

}

function readText(src) {
	return window.fetch(src).then((res) => res.text());
}

function readBytes(src) {
	return window.fetch(src).then((res) => res.arrayBuffer());
}

function loadImg(src) {
	const img = new window.Image();
	img.src = src;
	return new Promise((resolve, reject) => {
		img.onload = () => {
			resolve(img);
		};
		img.onerror = () => {
			reject(`failed to load img from ${src}`);
		};
	});
}

const getAudioCtx = (() => {
	let audioCtx = null;
	return () => {
		if (!audioCtx) {
			audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		}
		return audioCtx;
	};
})();

function loadAudio(src) {
	return readBytes(src).then(getAudioCtx().decodeAudioData);
}

window.gloo = {
	web: true,
	run,
	readText,
	readBytes,
	loadImg,
	loadAudio,
};

})();
