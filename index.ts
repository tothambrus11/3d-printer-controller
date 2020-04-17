import SerialPort from "serialport";
import Readline from "@serialport/parser-readline";
import {Observable, Subscriber} from "rxjs/Rx";

export interface Vector3D {
    x: number;
    y: number;
    z: number;
}

export class Printer {
    private port: SerialPort;
    private readonly parser: Readline;
    private observer: Subscriber<string>;
    private currentPositionMode: PositionMode;
    private currentPosition: Vector3D;
    private hasCalibrated = {x: false, y: false, z: false};

    public observable: Observable<string>;
    private speed: number;
    private connected = false;

    constructor(port: string, baudRate: number, public readonly maxPrintSize: Vector3D) {
        this.port = new SerialPort(port, {baudRate}, error => {
            this.connected = !error;
            if (!this.connected) {
                console.error(error);
            }
        });
        this.parser = new Readline();
        this.port.pipe(this.parser);
        this.observable = new Observable((_observer) => {
            this.observer = _observer;
        });
        this.parser.on('data', line => this.observer.next(line));
        this.observable.subscribe();
    }

    /**
     * Initializes the printer and all the variables. It must be called before using the printer commands.
     */
    async init() {
        await sleep(1000);
        if (!this.connected) throw new Error("Unable to connect");
        console.log("Connected!");
        await this.setPositionMode(PositionMode.RELATIVE);
        this.currentPosition = {x: 0, y: 0, z: 0};
        await this.setSpeed(60);
    }

    private async waitForOk() {
        await new Promise((resolve) => {
            const subscription = this.observable.subscribe((message: string) => {
                if (message === "ok") {
                    subscription.unsubscribe();
                    resolve();
                }
            });
        });
    }

    /**
     * Sends a GCode command to the printer. If the attribute 'waitForOk' is false, the program won't wait for an "ok" response from the printer.
     * @param command
     * @param waitForOk
     */
    async sendCommand(command, waitForOk?: boolean) {
        await new Promise((resolve, reject) => {
            this.port.write(command + "\n", (error, bytesWritten) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(bytesWritten);
                }
            });
        });
        if (waitForOk !== false) {
            await this.waitForOk();
        }
    }

    /**
     * Auto homes the nozzle only on the X any Y axes.
     */
    async autoHomeXY() {
        await this.autoHome(["X", "Y"])
    }

    /**
     * Auto homes the nozzle on the specified axes.
     * @param axes
     */
    async autoHome(axes: Axis[]) {
        console.log("Auto home started...");
        axes.forEach(axis => {
            this.hasCalibrated[axis.toLowerCase()] = true;
        });
        await this.sendCommand("G28 " + axes.join(" "));
        console.log("Auto home finished.");
    }

    /**
     * Sets the position mode
     * @param newPositionMode
     */
    private async setPositionMode(newPositionMode): Promise<void> {
        this.currentPositionMode = newPositionMode;
        switch (this.currentPositionMode) {
            case PositionMode.ABSOLUTE:
                await this.sendCommand("G90");
                break;
            case PositionMode.RELATIVE:
                await this.sendCommand("G91");
                break;
            default:
                throw new Error("Invalid position mode: '" + newPositionMode + "'");
        }
    }

    /**
     * Moves the nozzle with a specified relative position
     * @param deltaX
     * @param deltaY
     * @param deltaZ
     * @param waitForMotors
     */
    async go(deltaX: number, deltaY?: number, deltaZ?: number, waitForMotors?: boolean) {
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
        await this.setPositionMode(PositionMode.RELATIVE);

        if (deltaZ === 0) {
            await this.sendCommand(`G0 X${deltaX} Y${deltaY} Z${deltaZ}`);
        } else {
            await this.sendCommand(`G1 X${deltaX} Y${deltaY} Z${deltaZ}`);
        }

        await this.waitForMotors(50, deltaX, deltaY, deltaZ);
        this.currentPosition = nextPos;
    }


    /**
     * Moves the nozzle to a specified absolute position (in millimeters)
     * @param posOrX
     * @param y
     * @param z
     */
    async goTo(posOrX: Vector3D | number, y?: number, z?: number) {
        let targetPos: Vector3D;
        if ((posOrX as Vector3D).x || (posOrX as Vector3D).y || (posOrX as Vector3D).z) {
            targetPos = posOrX as Vector3D;
            if (!targetPos.x) {
                targetPos.x = this.currentPosition.x;
            }
            if (!targetPos.y) {
                targetPos.y = this.currentPosition.y;
            }
            if (!targetPos.z) {
                targetPos.z = this.currentPosition.z;
            }
        } else {
            targetPos = this.currentPosition;
            if (posOrX !== undefined) {
                targetPos.x = posOrX as number;
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
        await this.setPositionMode(PositionMode.ABSOLUTE);
        if (targetPos.z - this.currentPosition.z !== 0) {
            await this.sendCommand(`G1 X${targetPos.x} Y${targetPos.y} Z${targetPos.z}`);
        } else {
            await this.sendCommand(`G0 X${targetPos.x} Y${targetPos.y} Z${targetPos.z}`);
        }
        await this.waitForMotors(10, targetPos.x - this.currentPosition.x, targetPos.y - this.currentPosition.y, targetPos.z - this.currentPosition.z);
        this.currentPosition = targetPos;
    }

    /**
     * Wait for all the motors to complete their task
     * @param checkRate The interval for checking the positions of the motors (in milliseconds)
     * @param deltaX optional
     * @param deltaY optional
     * @param deltaZ optional
     */
    async waitForMotors(checkRate: number, deltaX?: number, deltaY?: number, deltaZ?: number) {
        if (!deltaX || !deltaY || !deltaZ) {
            const pd = await this.getPositionData();
            deltaX = deltaX || pd.targetPosition.x - pd.currentPosition.x;
            deltaY = deltaY || pd.targetPosition.y - pd.currentPosition.y;
            deltaZ = deltaZ || pd.targetPosition.z - pd.currentPosition.z;
        }
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
        // Theoretically this will be the time:
        await sleep(distance / this.speed * 1000);

        while (true) {
            const pd = await this.getPositionData();
            if (pd.currentPosition.x === pd.targetPosition.x &&
                pd.currentPosition.y === pd.targetPosition.y &&
                pd.currentPosition.z === pd.targetPosition.z) {
                break;
            }
            await sleep(checkRate);
        }
    }

    /**
     * Returns the current position mode (PositionMode)
     */
    getPositionMode(): PositionMode {
        return this.currentPositionMode;
    }

    /**
     * @param speed Sets speed of the nozzle in mm/s
     */
    async setSpeed(speed: number) {
        this.speed = speed;
        await this.sendCommand(`G0 F${speed * 60}`)
    }

    /**
     * Returns the target position of the nozzle.
     */
    async getTargetPosition(): Promise<Vector3D> {
        const pd = await this.getPositionData();
        return pd.targetPosition;
    }

    /**
     * Returns the target position and the current position in an object.
     */
    async getPositionData(): Promise<{ currentPosition: Vector3D, targetPosition: Vector3D }> {
        return new Promise(resolve => {
            const subscription = this.observable.subscribe((line: string) => {
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
    }

    /**
     * Returns the current position of the nozzle
     */
    async getCurrentPosition(): Promise<Vector3D> {
        const pd = await this.getPositionData();
        return pd.currentPosition;
    }

    /**
     * Sends GCode, or a GCode array to the printer.
     * @param gCode
     * @param waitForOk
     */
    async sendGCode(gCode: string | string[], waitForOk?: boolean) {
        if (Array.isArray(gCode)) {
            gCode = gCode.join("\n");
        }
        await this.sendCommand(gCode, waitForOk);
    }

}

export type Axis = "X" | "Y" | "Z";

export enum PositionMode {
    ABSOLUTE,
    RELATIVE
}

/**
 * Sleep for a given time period
 * @param millis The time in milliseconds
 */
export async function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}
