/*
by: Tomas Hmiro
at: May 2024
for: Hexor II - at TUL 

In this file there are functions to control buttons to move robot of its tail. 
Functions for:
    Control of visuals based od control mode
*/

function controlScript_Onload(){
    //# in setKeys array for setting a keybinding
    BtnTail = document.getElementById("MMtail");
    BtnRobot = document.getElementById("MMrobot");

    modeChange();
    robotModeChange(mode1);
    createEventsDirBtns();
    dirChange(stop);
    
    //control by keyboard btns
    document.addEventListener('keypress', (e) => {
        dirKey(e);
    });

    document.addEventListener('keyup', (e) => {
        dirKey(e);
    });

    //move motion of robot change
    BtnRobot.addEventListener("click", () => {
        remoteMode = remoteModes[0];
        modeChange();
    });
    //move motion of tail change
    BtnTail.addEventListener("click", () => {
        remoteMode = remoteModes[1];
        modeChange();
    });
    

}
function modeChange() {
    switch (remoteMode) {
        case remoteModes[0]:
            BtnRobot.style.backgroundColor = "#23ff01";
            BtnTail.style.backgroundColor = "lightgrey";
            break;
        case remoteModes[1]:
            BtnTail.style.backgroundColor = "#23ff01";
            BtnRobot.style.backgroundColor = "lightgrey";
            break;
        default:
            remoteMode = remoteModes[0];
            modeChange();
            break;
    }
}

function dirKey(e) {

    let BtnRobot = document.getElementById("MMrobot");
    let a = BtnRobot.style.backgroundColor;
    if (document.getElementById('myModal').style.display == 'block') {
        return;
    }
    console.log(e.key);
    modeNRTS = document.getElementById("NRTScheck").checked;
    let out;
    switch (e.key) {
        case setKeys[left]:
            console.log('left');
            out = e.type != 'keyup' || modeNRTS ? left : stop;
            break;
        case setKeys[back]:
            console.log('back');
            out = e.type != 'keyup' || modeNRTS ? back : stop ;
            break;
        case setKeys[right]:
            console.log('right');
            out = e.type != 'keyup' || modeNRTS ? right : stop;
            break;
        case setKeys[forward]:
            console.log('fwd');
            out = e.type != 'keyup' || modeNRTS ? forward : stop;
            break;
        case setKeys[stop]:
            console.log('stop');
            out = stop;
            break;
        case setKeys[mode1]:
            console.log('mode1');
            out = mode1;
            break;
        case setKeys[mode2]:
            console.log('mode2');
            out = mode2;
            break;
        case setKeys[mode3]:
            console.log('mode3');
            out = mode3;
            break;
        case setKeys[mode4]:
            console.log('mode4');
            out = mode4;
            break;
        default:
            out = stop;
            break;
    }
    if (out < mode1 && !runningOnServer && a == "rgb(35, 255, 1)") {
        moveRobot(e, out);
    }
    dirChange(out);
}

function createEventsDirBtns() {
    for (let i = 1; i < 10; i++) {
        let btnName = "dirButton" + i;
        let element = document.getElementById(btnName);
        //set the move
        element.addEventListener("mousedown", () => {
            dirBtnPushed(btnName);
        });
        element.addEventListener("touchstart", () => {
            dirBtnPushed(btnName);
        });

        //reset move command
        element.addEventListener("mouseup", () => {
            modeNRTS = document.getElementById("NRTScheck").checked;
            if (!modeNRTS) dirBtnPushed("dirButton5");
        });
        element.addEventListener("touchend", () => {
            modeNRTS = document.getElementById("NRTScheck").checked;
            if (!modeNRTS) dirBtnPushed("dirButton5");
        });
    }
}

function dirBtnPushed(btnName) {
    btnToDirection(btnName);
    sendDirCommand();
}

function btnToDirection(btnName) {
    let out = stop;
    switch (btnName) {
        case "dirButton1":
            out = mode1;
            break;
        case "dirButton2":
            out = forward;
            break;
        case "dirButton3":
            out = mode2;
            break;
        case "dirButton4":
            out = left;
            break;
        case "dirButton5":
            out = stop;
            break;
        case "dirButton6":
            out = right;
            break;
        case "dirButton7":
            out = mode3;
            break;
        case "dirButton8":
            out = back;
            break;
        case "dirButton9":
            out = mode4;
            break;
        default:
            out = stop;
            break;
    }
    dirChange(out);
}

function dirChange(_direction) {
    direction = _direction < mode1 ? _direction : direction;
    let dirBTNS = [2, 4, 5, 6, 8];
    for (let i = 0; i < dirBTNS.length; i++) {
        let k = document.getElementById("dirButton" + dirBTNS[i]);
        k.style.backgroundColor = "#1287c3";
    }
    let k;
    switch (direction) {
        case stop:
            k = document.getElementById("dirButton" + dirBTNS[2]);
            k.style.backgroundColor = "#1de3ef";
            break;
        case forward:
            k = document.getElementById("dirButton" + dirBTNS[0]);
            k.style.backgroundColor = "#1de3ef";
            break;
        case back:
            k = document.getElementById("dirButton" + dirBTNS[4]);
            k.style.backgroundColor = "#1de3ef";
            break;
        case left:
            k = document.getElementById("dirButton" + dirBTNS[1]);
            k.style.backgroundColor = "#1de3ef";
            break;
        case right:
            k = document.getElementById("dirButton" + dirBTNS[3]);
            k.style.backgroundColor = "#1de3ef";
            break;
    }
    let _mode = _direction >= mode1 ? _direction : robotMode;
    robotModeChange(_mode);        
}

function robotModeChange(mode) {
    robotMode = mode;
    let modeBTNS = [1, 3, 7, 9];
    for (let i = 0; i < modeBTNS.length; i++) {
        let k = document.getElementById("dirButton" + modeBTNS[i]);
        k.style.backgroundColor = "#1287c3";
    }
    let k;
    switch (robotMode) {
        case mode1:
            k = document.getElementById("dirButton" + modeBTNS[0]);
            k.style.backgroundColor = "#6004c8";
            break;
        case mode2:
            k = document.getElementById("dirButton" + modeBTNS[1]);
            k.style.backgroundColor = "#6004c8";
            break;
        case mode3:
            k = document.getElementById("dirButton" + modeBTNS[2]);
            k.style.backgroundColor = "#6004c8";
            break;
        case mode4:
            k = document.getElementById("dirButton" + modeBTNS[3]);
            k.style.backgroundColor = "#6004c8";
            break;
    }
    sendModeCommand();
}

function sendDirCommand() {
    let xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/?" + remoteMode + "=" + direction + "&", true);
    xhttp.send();
    //setTimeout( btnToDirection("dirButton5"), 2000); //like pushing stop btn 2 seconds after sending move command
}
function sendModeCommand() {
    let xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/? mode=" + robotMode + "&", true);
    xhttp.send();
    //setTimeout( btnToDirection("dirButton5"), 2000); //like pushing stop btn 2 seconds after sending move command
}