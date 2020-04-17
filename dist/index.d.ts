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
    /**
     * Initializes the printer and all the variables. It must be called before using the printer commands.
     */
    init(): Promise<void>;
    private waitForOk;
    /**
     * Sends a GCode command to the printer. If the attribute 'waitForOk' is false, the program won't wait for an "ok" response from the printer.
     * @param command
     * @param waitForOk
     */
    sendCommand(command: any, waitForOk?: boolean): Promise<void>;
    /**
     * Auto homes the nozzle only on the X any Y axes.
     */
    autoHomeXY(): Promise<void>;
    /**
     * Auto homes the nozzle on the specified axes.
     * @param axes
     */
    autoHome(axes: Axis[]): Promise<void>;
    /**
     * Sets the position mode
     * @param newPositionMode
     */
    private setPositionMode;
    /**
     * Moves the nozzle with a specified relative position
     * @param deltaX
     * @param deltaY
     * @param deltaZ
     * @param waitForMotors
     */
    go(deltaX: number, deltaY?: number, deltaZ?: number, waitForMotors?: boolean): Promise<void>;
    /**
     * Moves the nozzle to a specified absolute position (in millimeters)
     * @param posOrX
     * @param y
     * @param z
     */
    goTo(posOrX: Vector3D | number, y?: number, z?: number): Promise<void>;
    /**
     * Wait for all the motors to complete their task
     * @param checkRate The interval for checking the positions of the motors (in milliseconds)
     * @param deltaX optional
     * @param deltaY optional
     * @param deltaZ optional
     */
    waitForMotors(checkRate: number, deltaX?: number, deltaY?: number, deltaZ?: number): Promise<void>;
    /**
     * Returns the current position mode (PositionMode)
     */
    getPositionMode(): PositionMode;
    /**
     * @param speed Sets speed of the nozzle in mm/s
     */
    setSpeed(speed: number): Promise<void>;
    /**
     * Returns the target position of the nozzle.
     */
    getTargetPosition(): Promise<Vector3D>;
    /**
     * Returns the target position and the current position in an object.
     */
    getPositionData(): Promise<{
        currentPosition: Vector3D;
        targetPosition: Vector3D;
    }>;
    /**
     * Returns the current position of the nozzle
     */
    getCurrentPosition(): Promise<Vector3D>;
    /**
     * Sends GCode, or a GCode array to the printer.
     * @param gCode
     * @param waitForOk
     */
    sendGCode(gCode: string | string[], waitForOk?: boolean): Promise<void>;
}
export declare type Axis = "X" | "Y" | "Z";
export declare enum PositionMode {
    ABSOLUTE = 0,
    RELATIVE = 1
}
/**
 * Sleep for a given time period
 * @param millis The time in milliseconds
 */
export declare function sleep(millis: any): Promise<unknown>;
