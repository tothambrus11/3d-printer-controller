import { Observable } from "rxjs/Rx";
export interface Vector3D {
    x: number;
    y: number;
    z: number;
}
export declare class Printer {
    readonly maxPrintSize: Vector3D;
    private port;
    private readonly parser;
    private observer;
    private currentPositionMode;
    private currentPosition;
    private hasCalibrated;
    observable: Observable<string>;
    private speed;
    private connected;
    constructor(port: string, baudRate: number, maxPrintSize: Vector3D);
    init(): Promise<void>;
    private waitForOk;
    sendCommand(command: any, waitForOk?: boolean): Promise<void>;
    autoHomeXY(): Promise<void>;
    autoHome(axes: Axis[]): Promise<void>;
    setPositionMode(newPositionMode: any): Promise<void>;
    go(deltaX: number, deltaY?: number, deltaZ?: number, waitForMotors?: boolean): Promise<void>;
    goTo(posOrX: Vector3D | number, y?: number, z?: number): Promise<void>;
    /**
     * @param checkRate in milliseconds
     * @param deltaX
     * @param deltaY
     * @param deltaZ
     */
    waitForMotors(checkRate: number, deltaX?: number, deltaY?: number, deltaZ?: number): Promise<void>;
    getPositionMode(): PositionMode;
    /**
     * @param speed Speed rate in mm/s
     */
    setSpeed(speed: number): Promise<void>;
    /**
     * Returns the target position of the nozzle.
     */
    getTargetPosition(): Promise<Vector3D>;
    getPositionData(): Promise<{
        currentPosition: Vector3D;
        targetPosition: Vector3D;
    }>;
    /**
     * Returns the current position of the nozzle
     */
    getCurrentPosition(): Promise<Vector3D>;
    sendGCode(gCode: string | string[], waitForOk?: boolean): Promise<void>;
}
export declare type Axis = "X" | "Y" | "Z";
export declare enum PositionMode {
    ABSOLUTE = 0,
    RELATIVE = 1
}
export declare function sleep(millis: any): Promise<unknown>;
