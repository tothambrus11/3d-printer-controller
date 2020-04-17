"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const serialport_1 = __importDefault(require("serialport"));
const parser_readline_1 = __importDefault(require("@serialport/parser-readline"));
const Rx_1 = require("rxjs/Rx");
class Printer {
    constructor(port, baudRate, maxPrintSize) {
        this.maxPrintSize = maxPrintSize;
        this.hasCalibrated = { x: false, y: false, z: false };
        this.connected = false;
        this.port = new serialport_1.default(port, { baudRate }, error => {
            this.connected = !error;
            if (!this.connected) {
                console.error(error);
            }
        });
        this.parser = new parser_readline_1.default();
        this.port.pipe(this.parser);
        this.observable = new Rx_1.Observable((_observer) => {
            this.observer = _observer;
        });
        this.parser.on('data', line => this.observer.next(line));
        this.observable.subscribe();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield sleep(1000);
            if (!this.connected)
                throw new Error("Unable to connect");
            console.log("Connected!");
            yield this.setPositionMode(PositionMode.RELATIVE);
            this.currentPosition = { x: 0, y: 0, z: 0 };
            yield this.setSpeed(60);
        });
    }
    waitForOk() {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise((resolve) => {
                const subscription = this.observable.subscribe((message) => {
                    if (message === "ok") {
                        subscription.unsubscribe();
                        resolve();
                    }
                });
            });
        });
    }
    sendCommand(command, waitForOk) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise((resolve, reject) => {
                this.port.write(command + "\n", (error, bytesWritten) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(bytesWritten);
                    }
                });
            });
            if (waitForOk !== false) {
                yield this.waitForOk();
            }
        });
    }
    autoHomeXY() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.autoHome(["X", "Y"]);
        });
    }
    autoHome(axes) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Auto home started...");
            axes.forEach(axis => {
                this.hasCalibrated[axis.toLowerCase()] = true;
            });
            yield this.sendCommand("G28 " + axes.join(" "));
            console.log("Auto home finished.");
        });
    }
    setPositionMode(newPositionMode) {
        return __awaiter(this, void 0, void 0, function* () {
            this.currentPositionMode = newPositionMode;
            switch (this.currentPositionMode) {
                case PositionMode.ABSOLUTE:
                    yield this.sendCommand("G90");
                    break;
                case PositionMode.RELATIVE:
                    yield this.sendCommand("G91");
                    break;
                default:
                    throw new Error("Invalid position mode: '" + newPositionMode + "'");
            }
        });
    }
    go(deltaX, deltaY, deltaZ, waitForMotors) {
        return __awaiter(this, void 0, void 0, function* () {
            deltaX = deltaX || 0;
            deltaY = deltaY || 0;
            deltaZ = deltaZ || 0;
            const nextPos = {
                x: this.currentPosition.x + deltaX,
                y: this.currentPosition.y + deltaY,
                z: this.currentPosition.z + deltaZ
            };
            if (deltaX) {
                if (this.hasCalibrated.x && (nextPos.x < 0 || nextPos.x > this.maxPrintSize.x)) {
                    throw new Error(`Invalid move to position ${JSON.stringify(nextPos)}.`);
                }
            }
            if (deltaY) {
                if (this.hasCalibrated.y && (nextPos.y < 0 || nextPos.y > this.maxPrintSize.y)) {
                    throw new Error(`Invalid move to position ${JSON.stringify(nextPos)}.`);
                }
            }
            if (deltaZ) {
                if (this.hasCalibrated.x && (nextPos.x < 0 || nextPos.x > this.maxPrintSize.x)) {
                    throw new Error(`Invalid move to position ${JSON.stringify(nextPos)}.`);
                }
            }
            yield this.setPositionMode(PositionMode.RELATIVE);
            if (deltaZ === 0) {
                yield this.sendCommand(`G0 X${deltaX} Y${deltaY} Z${deltaZ}`);
            }
            else {
                yield this.sendCommand(`G1 X${deltaX} Y${deltaY} Z${deltaZ}`);
            }
            yield this.waitForMotors(50, deltaX, deltaY, deltaZ);
            this.currentPosition = nextPos;
        });
    }
    goTo(posOrX, y, z) {
        return __awaiter(this, void 0, void 0, function* () {
            let targetPos;
            if (posOrX.x || posOrX.y || posOrX.z) {
                targetPos = posOrX;
                if (!targetPos.x) {
                    targetPos.x = this.currentPosition.x;
                }
                if (!targetPos.y) {
                    targetPos.y = this.currentPosition.y;
                }
                if (!targetPos.z) {
                    targetPos.z = this.currentPosition.z;
                }
            }
            else {
                targetPos = this.currentPosition;
                if (posOrX !== undefined) {
                    targetPos.x = posOrX;
                }
                if (y !== undefined) {
                    targetPos.y = y;
                }
                if (z !== undefined) {
                    targetPos.z = z;
                }
            }
            if (targetPos.x < 0 || targetPos.y < 0 || targetPos.z < 0 || targetPos.x > this.maxPrintSize.x || targetPos.y > this.maxPrintSize.y || targetPos.z > this.maxPrintSize.z) {
                throw new Error(`Invalid move to position ${JSON.stringify(targetPos)}.`);
            }
            yield this.setPositionMode(PositionMode.ABSOLUTE);
            if (targetPos.z - this.currentPosition.z !== 0) {
                yield this.sendCommand(`G1 X${targetPos.x} Y${targetPos.y} Z${targetPos.z}`);
            }
            else {
                yield this.sendCommand(`G0 X${targetPos.x} Y${targetPos.y} Z${targetPos.z}`);
            }
            yield this.waitForMotors(10, targetPos.x - this.currentPosition.x, targetPos.y - this.currentPosition.y, targetPos.z - this.currentPosition.z);
            this.currentPosition = targetPos;
        });
    }
    /**
     * @param checkRate in milliseconds
     * @param deltaX
     * @param deltaY
     * @param deltaZ
     */
    waitForMotors(checkRate, deltaX, deltaY, deltaZ) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!deltaX || !deltaY || !deltaZ) {
                const pd = yield this.getPositionData();
                deltaX = deltaX || pd.targetPosition.x - pd.currentPosition.x;
                deltaY = deltaY || pd.targetPosition.y - pd.currentPosition.y;
                deltaZ = deltaZ || pd.targetPosition.z - pd.currentPosition.z;
            }
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
            // Theoretically this will be the time:
            yield sleep(distance / this.speed * 1000);
            while (true) {
                const pd = yield this.getPositionData();
                if (pd.currentPosition.x === pd.targetPosition.x &&
                    pd.currentPosition.y === pd.targetPosition.y &&
                    pd.currentPosition.z === pd.targetPosition.z) {
                    break;
                }
                yield sleep(checkRate);
            }
        });
    }
    getPositionMode() {
        return this.currentPositionMode;
    }
    /**
     * @param speed Speed rate in mm/s
     */
    setSpeed(speed) {
        return __awaiter(this, void 0, void 0, function* () {
            this.speed = speed;
            yield this.sendCommand(`G0 F${speed * 60}`);
        });
    }
    /**
     * Returns the target position of the nozzle.
     */
    getTargetPosition() {
        return __awaiter(this, void 0, void 0, function* () {
            const pd = yield this.getPositionData();
            return pd.targetPosition;
        });
    }
    getPositionData() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                const subscription = this.observable.subscribe((line) => {
                    if (line.startsWith("X:")) {
                        line = line.replace(/\s/g, "");
                        const xs = line.match(/X:([0-9.]+)/g);
                        const ys = line.match(/Y:([0-9.]+)/g);
                        const zs = line.match(/Z:([0-9.]+)/g);
                        subscription.unsubscribe();
                        resolve({
                            targetPosition: {
                                x: Number(xs[0].substr(2)),
                                y: Number(ys[0].substr(2)),
                                z: Number(zs[0].substr(2))
                            },
                            currentPosition: {
                                x: Number(xs[1].substr(2)),
                                y: Number(ys[1].substr(2)),
                                z: Number(zs[1].substr(2))
                            }
                        });
                    }
                });
                this.sendCommand("M114", false);
            });
        });
    }
    /**
     * Returns the current position of the nozzle
     */
    getCurrentPosition() {
        return __awaiter(this, void 0, void 0, function* () {
            const pd = yield this.getPositionData();
            return pd.currentPosition;
        });
    }
    sendGCode(gCode, waitForOk) {
        return __awaiter(this, void 0, void 0, function* () {
            if (Array.isArray(gCode)) {
                gCode = gCode.join("\n");
            }
            yield this.sendCommand(gCode, waitForOk);
        });
    }
}
exports.Printer = Printer;
var PositionMode;
(function (PositionMode) {
    PositionMode[PositionMode["ABSOLUTE"] = 0] = "ABSOLUTE";
    PositionMode[PositionMode["RELATIVE"] = 1] = "RELATIVE";
})(PositionMode = exports.PositionMode || (exports.PositionMode = {}));
function sleep(millis) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise(resolve => setTimeout(resolve, millis));
    });
}
exports.sleep = sleep;
//# sourceMappingURL=index.js.map