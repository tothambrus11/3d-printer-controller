# 3D printer controller
This module helps you control your 3d printer from JavaScript (& TypeScript). The module uses promises, so you can wait for the motor moves to be completed.
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
    npm i 3d-printer-controller --save
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
Initialise the 3D printer. You must invoke this method before using the printer.
```javascript
myPrinter.init();
```
