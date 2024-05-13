/*
by: Tomas Hmiro
at: May 2024
for: Hexor II - at TUL 

In this file there is visual scripts and control of popup windows
*/

let passToggle = false;
let isResizing = false;
let Wifis = [];

let divider;         
let divider1;        
let column1;         
let column1Top;      
let column1Bottom;   
let column2;         

let modal;
let netConn;
let closeModalBtn;
let confirmBtn;
let toggleBtn;
let inputField1;
let inputField2;
let outputField;

const stop = 0,
    forward = 1,
    left = 2,
    right = 3,
    back = 4,
    mode1 = 5, //teleoprator
    mode2 = 6, //semiauto
    mode3 = 7, //auto
    mode4 = 8; //presentation

let BtnTail;
let BtnRobot;
let dirBtns = [];
let modeNRTS = false;
const remoteModes = ["robot", "tail"];
let remoteMode = remoteModes[0];
let robotMode;
let direction = stop;

let setKeys = [];
setKeys[stop] = ' ';
setKeys[forward] = 'w'; //up for tail
setKeys[left] = 'a';
setKeys[right] = 'd';
setKeys[back] = 's'; //down for tail
setKeys[mode1] = '+';
setKeys[mode2] = 'ě';
setKeys[mode3] = 'š';
setKeys[mode4] = 'č';


let value_TEST;

//for slower loading of scripts
let loadCount = 0;
let arrayOfScriptToLoad = ["navScript.js","controlScript.js", "mapFcnScript.js", "mapFcn1Script.js", "mapFcn2Script.js", "mapScript.js"];


window.addEventListener("DOMContentLoaded", () => {
    //call for loading other scripts
    slowLoad();

    //vertical/horizontal dividers  --------------------------------------------------------------------------------------------------- 

    divider = document.getElementById('divider');
    divider1 = document.getElementById('divider1');
    column1 = document.getElementById('column1');
    column1Top = document.getElementById('column1-top');
    column1Bottom = document.getElementById('column1-bottom');
    column2 = document.getElementById('column2');
    value_TEST = document.getElementById("testRot");


    column2.style.width = 80 + '%';
    column1.style.width = 20 + '%';
    column1Top.style.height = 45 + '%';
    column1Bottom.style.height = 55 + '%';

    
    divider.addEventListener('mousedown', (e) => {
        isResizing = true;

        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
    });

    divider.addEventListener('touchstart', (e) => {
        isResizing = true;

        document.addEventListener('touchmove', handleResize);
        document.addEventListener('touchend', stopResize);
        document.addEventListener('touchcancel', stopResize);
    });

    divider1.addEventListener('mousedown', (e) => {
        isResizing = true;

        document.addEventListener('mousemove', handleResize1);
        document.addEventListener('mouseup', stopResize);
    });

    divider1.addEventListener('touchstart', (e) => {
        isResizing = true;

        document.addEventListener('touchmove', handleResize1);
        document.addEventListener('touchend', stopResize);
        document.addEventListener('touchcancel', stopResize);
    });



    //Network setting popup "window" ---------------------------------------------------------------------------------
    modal = document.getElementById('myModal');
    netConn = document.getElementById('Network_connection');
    closeModalBtn = document.getElementsByClassName('close')[0];
    confirmBtn = document.getElementById('confirmBtn');
    toggleBtn = document.getElementById('toggleBtn');
    inputField1 = document.getElementById('SSID');
    inputField2 = document.getElementById('PASS');
    outputField = document.getElementById('outputField');

    modal1 = document.getElementById('myModal1');
    btnSett = document.getElementById('Button_settings');
    closeModalBtn1 = document.getElementsByClassName('close')[1];
    confirmBtn1 = document.getElementById('confirmBtnKeys'); 
    let keySet = [];
    keySet[stop] = document.getElementById('stop');
    keySet[forward] = document.getElementById('fwd');
    keySet[left] = document.getElementById('left');
    keySet[right] = document.getElementById('right');
    keySet[back] = document.getElementById('bwd');
    keySet[mode1] = document.getElementById('m1');
    keySet[mode2] = document.getElementById('m2');
    keySet[mode3] = document.getElementById('m3');
    keySet[mode4] = document.getElementById('m4');

    //show popup
    netConn.addEventListener("click", () => {
        modal.style.display = 'block';
    });
    btnSett.addEventListener("click", () => {
        modal1.style.display = 'block';
        for (let i = 0; i < keySet.length; i++) {
            keySet[i].value = setKeys[i];
        }
    });

    //close popup
    closeModalBtn.addEventListener("click", () => {
        modal.style.display = 'none';
    });
    closeModalBtn1.addEventListener("click", () => {
        modal1.style.display = 'none';
    });

    //confirm connection
    confirmBtn.addEventListener("click", () => {
        const inputValue = inputField1.value;
        const inputValue1 = inputField2.value;
        outputField.textContent = "Connecting to: " + inputValue + inputValue1;
        let xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = () => {
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                let response = this.Response;
                outputField.textContent = response;
            }
        }
        xhttp.open("GET", "/par?WIFI=" + inputValue + "x;x" + inputValue1 + "&", true);
        xhttp.send();
    });
    //confirm keys setting
    confirmBtn1.addEventListener("click", () => {
        for (let i = 0; i < keySet.length; i++) {
            setKeys[i] = keySet[i].value;
        }
    });

    // show hide password
    toggleBtn.addEventListener("click", () => {
        passToggle = !passToggle;
        inputField2.type = passToggle ? "text" : "password";
    });

    value_TEST.addEventListener("change", () => {
    Robot.rot = value_TEST.value * 0.1 * 3.14;
    console.log(Robot.rot);
    });

});



function handleResize(e) {
    if (isResizing) {
        let dx = e.type.includes("touch") ? e.touches[e.touches.length - 1].clientX : e.clientX;
        const offset = (dx / document.body.clientWidth) * 100;
        column2.style.width = (100 - offset) + '%';
        column1.style.width = offset + '%';
    }
}

function handleResize1(e) {
    if (isResizing) {
        let dy = e.type.includes("touch") ? e.touches[e.touches.length - 1].clientY : e.clientY;
        const offset = (dy / document.body.clientHeight) * 100;
        column1Top.style.height = offset + '%';
        column1Bottom.style.height = (100 - offset) + '%';
    }
}

function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mousemove', handleResize1);
    document.removeEventListener('mouseup', stopResize);
}

function moveRobot(e, i) {
    let BtnRobot = document.getElementById("MMrobot");
    console.log(BtnRobot.style.backgroundColor);
    if (!runningOnServer && BtnRobot.style.backgroundColor == "rgb(35, 255, 1)") {
        switch (i) { //change Robot location by incrementing
            case 0: //[-1,1] 
                break;
            case 1: //[0,1]
                Robot.y--;
                break;
            case 2: //[1,1]
                break;
            case 3: //[-1,0]
                Robot.x--;
                break;
            case 4: //[0,0] STOP!
                break;
            case 5: //[1,0]
                Robot.x++;
                break;
            case 6: //[-1,-1]
                break;
            case forward: //[0,-1]
                Robot.y++;
                break;
            case 8: //[1,-1]
                break;
            default:
                break;
        }
        Robot.change = true;
    }
}  
function slowLoad() {    
    if (loadCount < arrayOfScriptToLoad.length) {
        let _c = document.createElement("script");
        _c.src = arrayOfScriptToLoad[loadCount];
        document.getElementById("indexHead").appendChild(_c);
        loadCount++;
        setTimeout(slowLoad, 3000);
    }
    else if (loadCount < arrayOfScriptToLoad.length +2) {
        //call all initialized onload functions
        controlScript_Onload();
        mapScript_Onload();
        loadCount++;
        setTimeout(slowLoad, 3000);
    }
}