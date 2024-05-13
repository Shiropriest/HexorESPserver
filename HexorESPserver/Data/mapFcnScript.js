/*
 by: Tomáš Hmiro
 31. 01. 2024 
 for: HEXOR II - TUL diploma

 part 2 

This file contains part of functions for mapScript
functions for:
    refreshing data in map and page,
    functions that operates movement in map
*/
let batteryStateColour;
let batteryPercentage;
let privilages = 0;

let testValue;
function pushDown(e) {
    rect = canvas.getBoundingClientRect();
    W = (canvas.width / canvas.clientWidth);
    H = (canvas.height / canvas.clientHeight);
    let dx, dy;
    if (e.type.includes("touch")) {
        dx = e.touches[0].clientX;
        dy = e.touches[0].clientY;
    }
    else {
        dx = e.clientX;
        dy = e.clientY;
    }

    locX = Math.round((dx - rect.left) * W, 1);
    locY = Math.round((dy - rect.top) * H, 1);

    if (mapMode == mapModes[0]) {
        isDragging = true;
        canvas.style.cursor = "grabbing";
        startX = dx;
        startY = dy;
    }
    else if (e.button == mouseBtns.wheel) {
        lastMapMode = mapMode;
        mapMode = mapModes[0];
        modeChangeMap();
        isDragging = true;
        canvas.style.cursor = "grabbing";
        startX = dx;
        startY = dy;
    }
    else if (mapMode == mapModes[1] && e.button == mouseBtns.left) {
        locX1 = (locX - startScrollX) / Target.scaling.W, locY1 = (locY - startScrollY) / Target.scaling.H;
        if (Target.en == false) {
            Target.scaling.H = scaleH;
            Target.scaling.W = scaleW;
            Target.x = Math.round(locX1, 1);
            Target.y = Math.round(locY1, 1);
            Target.en = true;
            Target.change = true;
            Target.valid = true;

            draw();
        }
        else if (e.ctrlKey) {
            let locX2 = Math.floor(((locX - startScrollX) / scaleW), 1);
            let locY2 = Math.floor((locY - startScrollY) / scaleH, 1);
            context.fillRect(startScrollX + locX2 * scaleW, startScrollY + locY2 * scaleH, scaleW, scaleH);
            Robot.x = locX2;
            Robot.y = locY2;
            Robot.scaling.H = scaleH;
            Robot.scaling.W = scaleW;
            Robot.en = true;
            Robot.change = true;
            Robot.valid = true;
            change = true;
            draw();
        }
        else {
            if (Target.x == locX1 && Target.y == locY1) {
                Target.en = false;

                draw();
            }
            else
            Target.scaling.H = scaleH;
            Target.scaling.W = scaleW;
            Target.x = Math.round(locX1, 1);
            Target.y = Math.round(locY1, 1);
            Target.change = true;
            Target.valid = true;

            draw();
        }

    }
    else if (mapMode == mapModes[3]) {
        mapOpDraw(e);
    }
}

function pullUp(e) {
    if (isDragging) {
        switch (lastMapMode) {
            case mapModes[0]: canvas.style.cursor = "grab";
                break;
            case mapModes[1]: canvas.style.cursor = "crosshair";
                break;
            case mapModes[2]: canvas.style.cursor = "help";
                break;
            default: canvas.style.cursor = "grab";
                break;
        }
        mapMode = lastMapMode;
        modeChangeMap();
    }
    isDragging = false;
    isDrawing = false;
}
function cursoreMove(e) {
    //same for mouse and touch ((hopefully :) ))
    let dx, dy;
    if (e.type.includes("touch")) {
        dx = e.touches[e.touches.length - 1].clientX;
        dy = e.touches[e.touches.length - 1].clientY;
    }
    else {
        dx = e.clientX;
        dy = e.clientY;
    }

    if (mapMode == mapModes[0]) {
        if (isDragging) {
            let W = (canvas.width / canvas.clientWidth);
            let H = (canvas.height / canvas.clientHeight);
            startScrollX += (dx - startX) * W;
            startScrollY += (dy - startY) * H;
            startX = dx;
            startY = dy;

            draw();
        }
    }
    mPos = document.getElementById("mPos");
    mZ = document.getElementById("mapZero");
    rect = canvas.getBoundingClientRect();

    locms = "mou: [" + Math.round(dx - rect.left, 1) + ";" + Math.round(dy - rect.top, 1) + "]";
    //let locma = "inMap: [" + Math.round((locX - startScrollX) / scaleH, 1) + ";" + Math.round((locY - startScrollY) / scaleW , 1) + "]";
    //let locma = "map: [" + Math.round(startScrollX, 1) + ";" + Math.round(startScrollY, 1) + "]";
    mPos.innerHTML = locms;
    //mZ.innerHTML = locma; 

    if ((startScrollX + mapImageW * scaleW) < 0 || startScrollX > canvas.clientWidth) {
        startScrollX = 2;
    }
    if ((startScrollY + mapImageH * scaleH) < 0 || startScrollY > canvas.clientHeight) {
        startScrollY = 2;
    }

    if (mapMode == mapModes[3] && isDrawing) {
        mapOpDraw(e);
    }
}
function flipArray(p) {
    let arr = [];
    for (let i = 0; i < p.length; i++) {
        arr[i] = p[p.length - 1 - i];
    }
    return arr;
}
function pathJoin(a, b) {
    let arr = []
    for (let i = 0; i < a.length; i++) {
        arr[i] = a[i];
    }
    const k = a.length;
    for (let j = 0; j < b.length; j++) {
        arr[k + j] = b[j];
    }
    return arr;
    }
function matrixMull(a, [m,n], b, [m1,n1]) {
    let c = [];
    c[0] = a[0] * b[0] + a[1] * b[1];
    c[1] = a[2] * b[0] + a[3] * b[1];
    return c;
}

function modeChangeMap() {
        drawLegend();
        switch (mapMode) {
            case mapModes[0]:
                canvas.style.cursor = "grab";
                pointSel.style.backgroundColor = "lightgrey";
                infoBut.style.backgroundColor = "lightgrey";
                move.style.backgroundColor = "#23ff01";
                drawObject.style.backgroundColor = "lightgrey";
                break;
            case mapModes[1]:
                canvas.style.cursor = "crosshair";
                pointSel.style.backgroundColor = "#23ff01";
                infoBut.style.backgroundColor = "lightgrey";
                move.style.backgroundColor = "lightgrey";
                drawObject.style.backgroundColor = "lightgrey";
                break;
            case mapModes[2]:
                canvas.style.cursor = "help";
                pointSel.style.backgroundColor = "lightgrey";
                infoBut.style.backgroundColor = "#23ff01";
                move.style.backgroundColor = "lightgrey";
                drawObject.style.backgroundColor = "lightgrey";
                break;
            case mapModes[3]:
                canvas.style.cursor = "crosshair";
                drawObject.style.backgroundColor = "#23ff01";
                infoBut.style.backgroundColor = "lightgrey";
                move.style.backgroundColor = "lightgrey";
                pointSel.style.backgroundColor = "lightgrey";
                break;
            default:
                mapMode = mapModes[0];
                modeChangeMap();
                break;
        }        
}

function drawLegend() {
    let pH = document.getElementById("pHcl1b");
    let d = document.getElementById("legend");
    if (mapMode != mapModes[2]) {
            
        if (d != undefined) {
            pH.removeChild(d);
        }
        return;
    }
    if (d == undefined) {
        let div = document.createElement("div");
        let legendH2 = document.createElement("h2");
        legendH2.innerHTML = "Legend for map";
        let list = document.createElement("ul");
        for (let colors in mapColors) {
            let item = document.createElement("li");
            item.innerHTML = colors;
            item.style.textShadow = "0px 0px 5px #000000";            
            item.style.color = mapColors[colors];

            list.appendChild(item);
        }
        list.style.marginTop = "1px";
        div.appendChild(legendH2);
        div.appendChild(list);
        div.style.overflow = "hidden";
        div.id = "legend";
        pH.appendChild(div);
    }        
} 

//controls
function refreshData() {

    

    if (runningOnServer) {    
        askForBatteryState();
        askForPrivilages();
        askForMode();
        askForPosition();
        askForObjectsAround();
    }
    else {

    }
    
    //column1Top.style.height = (45 +column1.style.width / column1Top.style.width) + '%';
    const battery = document.getElementById("battery");
    let stav = "linear-gradient(90deg," + batteryStateColour + " " + batteryPercentage + ", lightgrey 1%)";
    battery.style.background = stav;
}

function askForBatteryState() {
    let text = new XMLHttpRequest();
    text.onreadystatechange = function () {
        if (text.readyState == 4 && text.status == 200) {
            batteryPercentage = this.response + "%";
            batteryStateColour = "#23ff01";
            if (this.response < 50) {
                batteryStateColour = "#fb9405";
            }
            else if (this.response < 20) {
                batteryStateColour = "#ff0000";
            }
            else if (this.response == 0 || !runningOnServer) {
                batteryStateColour = "#ae00ff"; //is this purple? no info about battery or disconected
            }
        }
        else if (text.status == 404 || text.status == 204) {
            batteryStateColour = "#ae00ff";
            //runningOnServer = false;
            batteryPercentage = 80;
        }
    }
    text.open("GET", "/par?battery=&", true);
    text.send();
}

function askForPrivilages() {
    let text = new XMLHttpRequest();
    text.onreadystatechange = function () {
        if (text.readyState == 4 && text.status == 200) {
            privilages = this.response;
        }
    }
    text.open("GET", "/par?privilages=&", true);
    text.send();
}
function askForMode() {
    let text = new XMLHttpRequest();
    text.onreadystatechange = function () {
        if (text.readyState == 4 && text.status == 200) {
            mode = this.response + (mode1);
            robotModeChange(Number(mode));
        }
    }
    text.open("GET", "/par?mode=&", true);
    text.send();
}
function askForPosition() {
    let text = new XMLHttpRequest();
    text.onreadystatechange = function () {
        if (text.readyState == 4 && text.status == 200) {
            let response = 0;
            response = this.response.split(";");
            //offset for this map system
            Robot.x = response[0] == "" ? 50 : response[0] + 50;
            Robot.y = response[1] == "" ? 50 : response[1] + 50;
            if (Robot.rotI < 360) {
                Robot.rot = response[2] - rotI;
            }
            else {
                Robot.rotI = response[2];
                Robot.rot = 0;
            }
            Robot.en = true;
        }
        else if (text.status == 404 || text.status == 204) {
            Robot.x = 50;
            Robot.y = 50;
            Robot.rot = testValue;
        }
    }
    text.open("GET", "/par?position=&", true);
    text.send();
}