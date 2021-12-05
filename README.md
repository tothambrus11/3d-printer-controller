# 3D printer controller
This module helps you control your 3d printer using JavaScript (& TypeScript). The module uses promises, so you can wait for the motor moves to be completed asynchronously.

## Features 
 - Send custom GCode to the printer
 - Move the nozzle to an absolute position
 - Move the nozzle with a relative position
 - Set the speed of movement in mm/s
 - Get current position, get target position
 - Auto home the nozzle on the specified axes.
## Get started
1. Add the module to your dependencies:
    ```shell script
    npm i 3d-printer-controller
    ```
2. Create a printer instance in your code and call its ```.init()``` function:
   ```javascript
   import {Printer} from "3d-printer-controller";
   
   (async () => {
       const myPrinter = new Printer("COM5", 115200, {x: 220, y: 220, z: 300});
       await myPrinter.init();
   })();
   ```
   Note, that you should provide the correct size of the printing area in case you don't want your printer be broken.
   You have to write your code inside an async function if you want to use await.

## API
### Constructor
```javascript
new Printer(port: string, baudRate: number, maxPrintSize: Vector3D);
    // Vector3D is an object like {x: number, y: number, z: number}
```
Example:
```javascript
const myPrinter = new Printer("COM5", 115200, {x: 220, y: 220, z: 300});
```
### Initialise the 3D printer
```javascript
await myPrinter.init();
```
You must invoke this method before using the printer.

### Auto home
```javascript
await myPrinter.autoHome(["X", "Y", "Z"]);
```
This auto homes the nozzle on the X, Y, and Z axes.

There is a particular function which auto homes the nozzle on the X and Y axes. 
```javascript
await myPrinter.autoHomeXY();
```

### Send GCode
You can send a GCode string, or an array of GCode strings with this function:
```javascript
// string:
await myPrinter.sendGCode("G28");

// array:
await myPrinter.sendGCode([
    "G91",
    "G0 F4800",
    "G0 X10 Y40"
]);
``` 

### Set the speed of the movement
```javascript
await myPrinter.setSpeed(80);
```
Sets the speed of the movement in millimeters / second.

### Go to a specified position
You can make the nozzle go to specified position in millimeters. You can specify a vector or the X, Y(optional), Z(optional) components of the vector directly:
```javascript
await myPrinter.goTo({x: 30, y: 60, z: 1}); // The nozzle goes to (30; 60; 1)
await myPrinter.goTo(50, 90, 2); // The nozzle goes to (50; 90; 2).
await myPrinter.goTo(30, 50); // The z value was not specified, so it goes remains the same as in the previous movement. The new position will be (30; 50; 2).
```

### Get current position
```javascript
const currentPos = await myPrinter.getCurrentPosition();
console.log(currentPos); // {x: number, y: number, z: number}
```
Returns the current position of the nozzle. This value is changing while the nozzle moves. This will become equal to the target position as soon as the nozzle finishes its movement.
### Get target position
```javascript
const targetPos = await myPrinter.getTargetPosition();
console.log(targetPos); // {x: number, y: number, z: number}
```
Returns the target position of the nozzle.
### Get current position and target position at once
```javascript
const posData = await myPrinter.getPositionData();
const currentPos = posData.currentPosition;
const targetPos = posData.targetPosition;
```
This method is only for saving time when we need both positions in one place (for example when waiting for the nozzle to finish its movement).
